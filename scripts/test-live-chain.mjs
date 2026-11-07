/**
 * Kiểm thử Web3ChainAdapter (chế độ live) trên Ganache trong bộ nhớ.
 * Giả lập MetaMask bằng một provider EIP-1193 bọc Ganache (chainId 31 như RSK Testnet),
 * nạp đúng file web3.min.js mà trình duyệt dùng, rồi chạy trọn quy trình qua adapter.
 */

import { createRequire } from 'module';
import fs from 'fs';
import vm from 'vm';

const require = createRequire(import.meta.url);
const ganache = require('ganache');
const { compile } = require('../test/lib.js');

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName) {
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedCount++;
    console.error(`  [FAIL] ${testName}`);
  }
}

async function assertRevert(asyncFn, expectedMessage, testName) {
  try {
    await asyncFn();
    failedCount++;
    console.error(`  [FAIL] ${testName} (Kỳ vọng lỗi "${expectedMessage}" nhưng hàm chạy thành công)`);
  } catch (err) {
    if (err.message.includes(expectedMessage)) {
      passedCount++;
      console.log(`  [PASS] ${testName} -> Chặn đúng: ${err.message}`);
    } else {
      failedCount++;
      console.error(`  [FAIL] ${testName} (Lỗi nhận được "${err.message}" không chứa "${expectedMessage}")`);
    }
  }
}

// --- Môi trường trình duyệt giả lập ---
const ganacheProvider = ganache.provider({
  logging: { quiet: true },
  chain: { chainId: 31, hardfork: 'merge' },
  wallet: { totalAccounts: 7 },
});
const accounts = (await ganacheProvider.request({ method: 'eth_accounts', params: [] })).map((a) => a.toLowerCase());
const [ADMIN, MFG, INSP, IMP, REC, REC2, STRANGER] = accounts;
let currentAccount = ADMIN;

// MetaMask chỉ trả về ví đang chọn; đổi currentAccount = đổi ví trong MetaMask
// walletChainId: giả lập MetaMask đang chọn mạng khác (null = cùng mạng với chuỗi)
let walletChainId = null;
const ethereum = {
  request: ({ method, params }) => {
    if (method === 'eth_accounts' || method === 'eth_requestAccounts') return Promise.resolve([currentAccount]);
    if (method === 'eth_chainId' && walletChainId) return Promise.resolve(walletChainId);
    return ganacheProvider.request({ method, params });
  },
  on() {},
};

// Nạp đúng bản web3 cho trình duyệt (CDN cùng phiên bản) để kiểm cách adapter dùng window.Web3
const sandbox = { console, TextEncoder, TextDecoder, crypto: globalThis.crypto, setTimeout, clearTimeout, setInterval, clearInterval, URL, AbortController, fetch };
sandbox.window = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('node_modules/web3/dist/web3.min.js', 'utf8'), sandbox);
globalThis.window = { ethereum, Web3: sandbox.Web3, location: { reload() {} } };

// ABI của DApp được nạp qua fetch('./abi/BatchRegistry.json')
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) =>
  String(url).endsWith('abi/BatchRegistry.json')
    ? new Response(fs.readFileSync('dapp/abi/BatchRegistry.json'))
    : realFetch(url, opts);

const { web3ChainAdapter: chain } = await import('../dapp/js/services/chain/web3Chain.adapter.js');
const { walletService } = await import('../dapp/js/services/wallet.service.js');
const { BatchService } = await import('../dapp/js/services/batch.service.js');
const { Role } = await import('../dapp/js/constants/roles.js');
const { BatchStatus } = await import('../dapp/js/constants/batchStatus.js');
const { translateError } = await import('../dapp/js/i18n/vi.js');

async function runTests() {
  console.log('\n======================================================');
  console.log('KIỂM THỬ WEB3 CHAIN ADAPTER (CHẾ ĐỘ LIVE) TRÊN GANACHE');
  console.log('======================================================\n');

  console.log('--- Nhóm 0: ABI và deploy ---');
  const { abi, bytecode } = compile();
  const dappAbi = JSON.parse(fs.readFileSync('dapp/abi/BatchRegistry.json', 'utf8'));
  // So theo chữ ký (tên, kiểu tham số, indexed, kết quả) vì thứ tự phần tử trong file có thể khác
  const sig = (x) => `${x.type} ${x.name || ''}(${(x.inputs || []).map((i) => `${i.type}${i.indexed ? ' indexed' : ''}`)})${(x.outputs || []).map((o) => o.type)} ${x.stateMutability || ''}`;
  const sigs = (list) => list.map(sig).sort().join('|');
  assert(sigs(dappAbi) === sigs(abi), 'dapp/abi/BatchRegistry.json khớp ABI biên dịch từ contract');

  const W = window.Web3;
  const deployer = new W(ganacheProvider);
  const deployed = await new deployer.eth.Contract(abi).deploy({ data: bytecode }).send({ from: ADMIN, gas: 6000000 });
  const address = deployed.options.address;
  const deployBlock = Number(await deployer.eth.getBlockNumber());

  // Dùng chính instance mà wallet.service và các trang dùng; trỏ sang contract vừa deploy
  await chain._ensureContract();
  chain.writeContract.options.address = address;
  // Trên Ganache: đường đọc (thay cho RPC_URL/LOGS_API_URL của RSK) đi thẳng vào Ganache, từ khối 0
  chain.web3 = new W(ganacheProvider);
  chain.contract = new chain.web3.eth.Contract(abi, address);
  chain.logsContract = chain.contract;
  chain.logsApiUrl = ''; // Ganache có eth_getLogs, không qua Blockscout
  chain.deployBlock = 0;
  assert(chain.walletWeb3.config.defaultTransactionType === '0x0', 'Gửi giao dịch kiểu legacy (Rootstock chưa có EIP-1559)');
  console.log(`  Contract: ${address} (khối ${deployBlock})\n`);

  const now = Math.floor(Date.now() / 1000);
  const DAY = 86400;
  const H = (n) => '0x' + n.toString(16).padStart(64, '0');

  console.log('--- Nhóm 1: Phân quyền ---');
  assert((await chain.getRole(ADMIN)) === Role.Admin, 'getRole trả số thường (Admin = 1)');
  await chain.grantRole(MFG, Role.Manufacturer, 'Công ty Hóa dược ABC', H(1));
  await chain.grantRole(INSP, Role.Inspector, 'Trung tâm Kiểm nghiệm Beta', H(2));
  await chain.grantRole(IMP, Role.Importer, 'Công ty Nhập khẩu Gamma', H(3));
  await chain.grantRole(REC, Role.Receiver, 'Nhà máy Dược Delta', H(4));
  await chain.grantRole(REC2, Role.Receiver, 'Nhà máy Dược Epsilon', H(5));
  assert((await chain.getRole(REC)) === Role.Receiver, 'Admin cấp quyền qua adapter thành công');
  assert((await chain.getOrgName(IMP)) === 'Công ty Nhập khẩu Gamma', 'getOrgName đọc tên đơn vị từ event RoleGranted');

  currentAccount = STRANGER;
  await assertRevert(() => chain.grantRole(STRANGER, Role.Importer, 'X', H(9)), 'BR: not admin', 'Ví lạ không cấp quyền được');
  try {
    await chain.grantRole(STRANGER, Role.Importer, 'X', H(9));
  } catch (err) {
    assert(translateError(err).startsWith('Chỉ Quản trị viên'), 'translateError dịch được lỗi revert từ chuỗi thật');
  }

  console.log('\n--- Nhóm 2: Ví (wallet.service) đọc vai trò on-chain ---');
  walletService.address = MFG;
  await walletService._loadOnChainProfile();
  assert(walletService.role === Role.Manufacturer && walletService.orgName === 'Công ty Hóa dược ABC',
    'Ví Manufacturer nhận đúng vai trò và tên đơn vị từ contract');
  walletService.address = STRANGER;
  await walletService._loadOnChainProfile();
  assert(walletService.role === Role.None && walletService.orgName === '', 'Ví chưa cấp quyền nhận vai trò None');

  // MetaMask đang ở mạng khác (vd Ethereum Mainnet): vẫn đọc đúng vai trò, nhưng không gửi giao dịch nhầm mạng
  walletChainId = '0x1';
  walletService.address = ADMIN;
  await walletService._loadOnChainProfile();
  assert(walletService.role === Role.Admin, 'Ví ở sai mạng vẫn nhận đúng vai trò Admin (đọc qua RPC của chuỗi)');
  currentAccount = ADMIN;
  await assertRevert(() => chain.grantRole(STRANGER, Role.Importer, 'X', H(9)), 'MetaMask đang ở mạng khác',
    'Chặn gửi giao dịch khi MetaMask ở sai mạng');
  walletChainId = null;

  console.log('\n--- Nhóm 3: Quy trình 6 bước ---');
  currentAccount = MFG;
  const batchId = await chain.registerBatch('PEN-ABC-20260901-001', 'Penicillin G', now - 10 * DAY, now + 700 * DAY, 'Dưới 25°C', IMP, H(11));
  assert(batchId === 1, 'registerBatch trả batchId kiểu số (1)');
  await assertRevert(
    () => chain.registerBatch('PEN-ABC-20260901-001', 'Penicillin G', now - 10 * DAY, now + 700 * DAY, '', IMP, H(12)),
    'BR: batchNo used', 'Chặn trùng số lô');

  currentAccount = INSP;
  await chain.recordTestResult(batchId, true, 'KN-2026-0001', now - 5 * DAY, H(21));
  currentAccount = IMP;
  await chain.recordImport(batchId, 'Ấn Độ', 'HQ-2026-0001', now - 3 * DAY, H(31));
  await chain.initiateTransfer(batchId, REC2, H(41));
  await chain.cancelTransfer(batchId, H(42));
  await chain.initiateTransfer(batchId, REC, H(43));
  currentAccount = STRANGER;
  await assertRevert(() => chain.confirmTransfer(batchId, H(51)), 'BR: wrong role', 'Ví không phải Receiver không xác nhận được');
  currentAccount = REC;
  await chain.confirmTransfer(batchId, H(51));
  await chain.recordReceivingInspection(batchId, true, 'QC-2026-0001', now - DAY, H(61));

  const b = await chain.getBatch(batchId);
  assert(b.status === BatchStatus.Released, 'Lô về trạng thái Released (số thường)');
  assert(typeof b.id === 'number' && typeof b.expiryDate === 'number', 'getBatch trả số thường, không phải BigInt');
  assert(b.receiver === REC && b.holder === REC && b.importer === IMP, 'Địa chỉ trong getBatch là chữ thường, khớp ví');
  assert((await chain.getBatchCount()) === 1, 'getBatchCount trả 1');
  assert((await chain.getBatches(1, 0)).length === 0, 'getBatches(1, 0) trả mảng rỗng (trang chưa có lô)');
  assert((await chain.getBatches(1, 50))[0].batchNo === 'PEN-ABC-20260901-001', 'getBatches trả đúng lô');
  assert((await chain.getBatchIdByNo('PEN-ABC-20260901-001')) === 1, 'getBatchIdByNo trả 1');
  assert((await chain.isExpired(batchId)) === false, 'isExpired trả boolean');
  await assertRevert(() => chain.getBatch(99), 'BR: batch not found', 'Đọc lô không tồn tại báo lỗi dịch được');

  console.log('\n--- Nhóm 4: Event cho trang tra cứu ---');
  const events = await chain.getBatchEvents(batchId);
  assert(events.length === 8, 'Có 8 event của lô (6 bước + giao lần đầu + hủy)');
  assert(events.map((e) => e.step).join(',') === '1,2,3,4,4,4,5,6', 'Thứ tự bước đúng theo khối');
  assert(events[0].stepLabel === 'Bước 1: Đăng ký lô sản xuất', 'stepLabel giống dữ liệu mock');
  assert(events[4].eventName === 'TransferCancelled' && events[4].stepLabel === 'Bước 4: Hủy chuyển giao', 'Event hủy chuyển giao có nhãn riêng');
  assert(events[0].orgName === 'Công ty Hóa dược ABC' && events[0].actorRole === 'Manufacturer', 'Event có tên đơn vị và vai trò người thực hiện');
  assert(events[1].actor === INSP, 'actor là ví thực hiện (chữ thường)');
  assert(events.map((e) => e.docHash).join() === [11, 21, 31, 41, 42, 43, 51, 61].map(H).join(), 'docHash từng event khớp hash đã gửi');
  assert(typeof events[0].timestamp === 'number' && events[0].timestamp > 0, 'timestamp lấy từ trường at (số thường)');
  assert(events[0].fields.materialName === 'Penicillin G' && events[0].fields.importer === IMP, 'fields chứa dữ liệu event đã chuẩn hóa');
  assert(!('0' in events[0].fields) && !('__length__' in events[0].fields), 'fields không còn khóa số thừa của web3');
  assert(/^0x[0-9a-f]{64}$/.test(events[0].txHash), 'Event có txHash để mở explorer');

  const found = await chain.searchEventsByDocHash(H(21).toUpperCase().replace('0X', '0x'));
  assert(found.length === 1 && found[0].eventName === 'BatchTested', 'searchEventsByDocHash tìm đúng event, không phân biệt hoa thường');
  const roleEvents = await chain.searchEventsByDocHash(H(3));
  assert(roleEvents.length === 1 && roleEvents[0].eventName === 'RoleGranted' && roleEvents[0].step === 0, 'Tra hash giấy phép ra event cấp quyền');

  console.log('\n--- Nhóm 5: Ghép tên file hồ sơ (off-chain) vào event ---');
  const service = new BatchService();
  service.chain = chain;
  service.data = {
    getBatchMetadata: async () => ({ documents: [{ step: 1, docNo: 'COA-2026-0001', fileName: 'B1_COA-2026-0001.txt', docHash: H(11) }] }),
    getOrganization: async () => null,
  };
  const detail = await service.getBatchDetail(batchId);
  assert(detail.events[0].docName === 'B1_COA-2026-0001.txt', 'Event Bước 1 có docName lấy từ db.json');
  assert(detail.materialName === 'Penicillin G' && detail.storageConditions === 'Dưới 25°C', 'materialName và storageConditions đọc từ event');
  assert(detail.statusName === 'Released', 'statusName đúng');

  console.log('\n======================================================');
  console.log(`Tổng: ${passedCount}/${passedCount + failedCount} kiểm tra đạt.`);
  console.log('======================================================');
  if (failedCount > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
