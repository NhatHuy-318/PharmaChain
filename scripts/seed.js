// Nạp bộ dữ liệu minh họa (scripts/dataset/dataset.js) lên contract và JSON Server.
//
//   node scripts/seed.js                 chạy thử trên Ganache trong bộ nhớ, kiểm tra kết quả, không ghi db.json
//   node scripts/seed.js --new-wallets   tạo file .env với 6 ví mới cho RSK Testnet
//   node scripts/seed.js --network rsk   deploy contract mới lên RSK Testnet, chạy toàn bộ dataset,
//                                        ghi deployments/rsk-testnet.json và server/db.json
//
// Cả hai chế độ đều sinh lại hồ sơ trong sample-docs/dataset/. Nội dung hồ sơ cố định nên hash không đổi giữa các lần chạy.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Web3 } = require('web3');
const { compile } = require('../test/lib');
const { ORGS, BATCHES } = require('./dataset/dataset');

const ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'sample-docs', 'dataset');
const ENV_FILE = path.join(ROOT, '.env');
const DB_FILE = path.join(ROOT, 'server', 'db.json');
const DEPLOY_FILE = path.join(ROOT, 'deployments', 'rsk-testnet.json');
const RSK_RPC = 'https://public-node.testnet.rsk.co';
const RSK_CHAIN_ID = 31n;

const Role = { Admin: 1, Manufacturer: 2, Inspector: 3, Importer: 4, Receiver: 5 };
const StatusName = ['None', 'Registered', 'Tested', 'Rejected', 'Imported', 'InTransfer', 'Received', 'Released', 'Quarantined'];
const ACCOUNTS = ['admin', 'manufacturer', 'inspector', 'importer', 'receiver', 'receiver2'];
const envKey = name => `${name.toUpperCase()}_PRIVATE_KEY`;

// Gas dự phòng cho mỗi giao dịch khi ước tính số tRBTC cần nạp cho từng ví.
const GAS_PER_TX = 350000n;
const GAS_DEPLOY = 2500000n;

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const option = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

// ---------------------------------------------------------------------------
// Ngày tháng và hash
// ---------------------------------------------------------------------------

const toTs = d => Date.parse(`${d}T00:00:00+07:00`) / 1000;
const vnDate = d => d.split('-').reverse().join('/');
const sha256 = text => '0x' + crypto.createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

// ---------------------------------------------------------------------------
// Sinh hồ sơ
// ---------------------------------------------------------------------------

const DISCLAIMER = 'TÀI LIỆU MINH HỌA - DỮ LIỆU GIẢ ĐỊNH, KHÔNG CÓ GIÁ TRỊ PHÁP LÝ';
const RULE = '='.repeat(64);
const doc = (title, lines) => [DISCLAIMER, RULE, title, RULE, ...lines, ''].join('\n');

const STEP_DOC = {
  coa: { prefix: 'B1', title: 'PHIẾU PHÂN TÍCH (CERTIFICATE OF ANALYSIS)' },
  test: { prefix: 'B2', title: 'PHIẾU KIỂM NGHIỆM' },
  import: { prefix: 'B3', title: 'TỜ KHAI HẢI QUAN HÀNG NHẬP KHẨU' },
  deliver: { prefix: 'B4', title: 'PHIẾU GIAO HÀNG' },
  cancel: { prefix: 'B4-huy', title: 'BIÊN BẢN HỦY GIAO HÀNG' },
  receive: { prefix: 'B5', title: 'BIÊN BẢN NHẬN HÀNG' },
  qc: { prefix: 'B6', title: 'PHIẾU KIỂM TRA CHẤT LƯỢNG TẠI NƠI NHẬN' },
};

function batchLines(b) {
  return [
    `Số lô: ${b.batchNo}`,
    `Tên nguyên liệu: ${b.materialName}`,
    `Nhà sản xuất: ${ORGS.manufacturer.name}`,
    `Số lượng: ${b.quantity} ${b.unit} (${b.packagingSpec})`,
  ];
}

function stepText(b, s) {
  const head = [`Số hồ sơ: ${s.docNo}`, `Ngày: ${vnDate(s.date)}`];
  switch (s.type) {
    case 'coa':
      return doc(STEP_DOC.coa.title, [
        ...head, `Đơn vị phát hành: ${ORGS.manufacturer.name}`, '',
        ...batchLines(b),
        `Ngày sản xuất: ${vnDate(b.mfgDate)}`,
        `Hạn dùng: ${vnDate(b.expiryDate)}`,
        `Điều kiện bảo quản: ${b.storageConditions}`, '',
        `Định lượng: ${s.assay}`,
        `Kết luận: ĐẠT. ${s.note}`,
      ]);
    case 'test':
      return doc(STEP_DOC.test.title, [
        ...head, `Đơn vị kiểm nghiệm: ${ORGS.inspector.name}`, '',
        ...batchLines(b), '',
        `Kết quả: ${s.note}`,
        `Kết luận: ${s.passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}`,
      ]);
    case 'import':
      return doc(STEP_DOC.import.title, [
        ...head, `Đơn vị nhập khẩu: ${ORGS.importer.name}`, `Cửa khẩu: ${s.port}`, '',
        ...batchLines(b),
        `Nước xuất xứ: ${ORGS.manufacturer.country}`,
        'Kết quả: Đã thông quan',
      ]);
    case 'deliver':
      return doc(STEP_DOC.deliver.title, [
        ...head, `Bên giao: ${ORGS.importer.name}`, `Bên nhận: ${ORGS[s.to].name}`, '',
        ...batchLines(b),
        `Điều kiện vận chuyển: ${b.storageConditions}`,
      ]);
    case 'cancel':
      return doc(STEP_DOC.cancel.title, [
        ...head, `Bên lập: ${ORGS.importer.name}`, '',
        ...batchLines(b),
        `Lý do hủy: ${s.reason}`,
      ]);
    case 'receive':
      return doc(STEP_DOC.receive.title, [
        ...head, `Bên nhận: ${ORGS[s.receiver].name}`, `Bên giao: ${ORGS.importer.name}`, '',
        ...batchLines(b),
        `Tình trạng: ${s.note}`,
      ]);
    case 'qc':
      return doc(STEP_DOC.qc.title, [
        ...head, `Đơn vị kiểm tra: ${ORGS[s.receiver].name}`, '',
        ...batchLines(b), '',
        `Kết quả: ${s.note}`,
        `Kết luận: ${s.passed ? 'ĐẠT, cho phép đưa vào sử dụng' : 'KHÔNG ĐẠT, biệt trữ'}`,
      ]);
  }
}

function licenseText(o) {
  return doc(o.licenseTitle.toUpperCase(), [
    `Số giấy phép: ${o.licenseNo}`,
    `Đơn vị được cấp: ${o.name}`,
    `Địa chỉ: ${o.address}`,
    `Phạm vi: vai trò ${o.role} trong hệ thống PharmaChain`,
  ]);
}

// Trả về kế hoạch đầy đủ: từng bước của từng lô kèm file hồ sơ và hash.
function buildPlan() {
  const files = [];
  const addFile = (rel, content) => {
    files.push({ rel, content });
    return { fileName: path.basename(rel), path: `sample-docs/dataset/${rel}`, docHash: sha256(content) };
  };

  const orgs = Object.entries(ORGS).map(([key, o]) => ({ key, ...o, license: addFile(`to-chuc/${o.licenseNo}.txt`, licenseText(o)) }));

  const batches = BATCHES.map(b => {
    let current = null; // Receiver đang được chỉ định, để biết ai ký Bước 5 và 6
    const steps = [{ type: 'coa', date: b.mfgDate, ...b.coa }, ...b.steps].map(s => {
      if (s.type === 'deliver') current = s.to;
      if (s.type === 'cancel') current = null;
      const step = { ...s };
      if (s.type === 'receive' || s.type === 'qc') step.receiver = current;
      step.file = addFile(`${b.batchNo}/${STEP_DOC[s.type].prefix}_${s.docNo}.txt`, stepText(b, step));
      return step;
    });
    return { ...b, steps };
  });

  // Bản COA bị sửa một con số của lô đầu tiên, để demo "Không khớp"
  const first = batches[0];
  const coa = first.steps[0];
  const tampered = files.find(f => f.rel.endsWith(coa.file.fileName)).content.replace(`Định lượng: ${coa.assay}`, 'Định lượng: 99,9%');
  const tamperedFile = addFile(`${first.batchNo}/${STEP_DOC.coa.prefix}_${coa.docNo}_DA-SUA.txt`, tampered);

  return { files, orgs, batches, tamperedFile };
}

function writeDocs(plan) {
  fs.rmSync(DOCS_DIR, { recursive: true, force: true });
  for (const f of plan.files) {
    const full = path.join(DOCS_DIR, f.rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, f.content);
  }
  fs.writeFileSync(path.join(DOCS_DIR, 'README.md'), docsReadme(plan));
}

function docsReadme(plan) {
  const lots = plan.batches.map((b, i) => `| ${i + 1} | \`${b.batchNo}\` | ${b.materialName} | ${b.expect} |`);
  const docs = plan.batches.flatMap(b => b.steps.map(s => `| \`${b.batchNo}\` | ${STEP_DOC[s.type].prefix} | [${s.file.fileName}](${b.batchNo}/${s.file.fileName}) | \`${s.file.docHash}\` |`));
  const orgs = plan.orgs.map(o => `| ${o.name} | ${o.role} | [${o.license.fileName}](to-chuc/${o.license.fileName}) | \`${o.license.docHash}\` |`);
  return `# Bộ dữ liệu minh họa

File này và các hồ sơ trong thư mục do \`node scripts/seed.js\` sinh từ [scripts/dataset/dataset.js](../../scripts/dataset/dataset.js); không sửa tay.
Mọi tổ chức và hồ sơ đều là giả định.

Hash là SHA-256 của nội dung file, giống giá trị DApp tính trong trình duyệt và giá trị ghi trong event trên chuỗi.
Không mở rồi lưu lại các file này bằng trình soạn thảo: chỉ cần đổi ký tự xuống dòng là hash đã khác.

## Lô

\`batchId\` do contract cấp theo thứ tự đăng ký, nên đúng như cột # khi nạp lên một contract mới.

| # | Số lô | Nguyên liệu | Trạng thái cuối |
|---|---|---|---|
${lots.join('\n')}

## Hồ sơ từng bước

| Số lô | Bước | File | SHA-256 |
|---|---|---|---|
${docs.join('\n')}

Bản bị sửa để demo đối chiếu: [${plan.tamperedFile.fileName}](${plan.batches[0].batchNo}/${plan.tamperedFile.fileName}) chỉ khác bản gốc ở dòng định lượng,
hash \`${plan.tamperedFile.docHash}\`.

## Giấy phép của tổ chức (Bước 0)

| Tổ chức | Vai trò | File | SHA-256 |
|---|---|---|---|
${orgs.join('\n')}
`;
}

// ---------------------------------------------------------------------------
// Kết nối chuỗi
// ---------------------------------------------------------------------------

function readEnv() {
  if (!fs.existsSync(ENV_FILE)) return {};
  return Object.fromEntries(fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)
    .map(l => l.trim()).filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
}

async function connect(network) {
  if (network === 'local') {
    const web3 = new Web3();
    const keys = ACCOUNTS.map(() => web3.eth.accounts.create().privateKey);
    // Ganache in cảnh báo về thư viện WebSocket khi nạp; tắt đi như trong test/lib.js
    const write = process.stderr.write;
    process.stderr.write = () => true;
    let ganache;
    try { ganache = require('ganache'); } finally { process.stderr.write = write; }
    const provider = ganache.provider({
      logging: { quiet: true },
      chain: { hardfork: 'merge' },
      wallet: { accounts: keys.map(secretKey => ({ secretKey, balance: '0x' + (10n ** 20n).toString(16) })) },
    });
    return setup(new Web3(provider), keys);
  }

  const env = readEnv();
  const missing = ACCOUNTS.filter(n => !env[envKey(n)]);
  if (missing.length) {
    throw new Error(`Thiếu private key trong .env: ${missing.map(envKey).join(', ')}.\nChạy "node scripts/seed.js --new-wallets" để tạo ví mới.`);
  }
  const web3 = new Web3(env.RSK_RPC_URL || RSK_RPC);
  const chainId = await web3.eth.getChainId();
  if (chainId !== RSK_CHAIN_ID) throw new Error(`RPC trả chainId ${chainId}, không phải RSK Testnet (31).`);
  return setup(web3, ACCOUNTS.map(n => env[envKey(n)]));
}

function setup(web3, keys) {
  // Rootstock chưa hỗ trợ giao dịch EIP-1559, nên luôn gửi giao dịch kiểu cũ (type 0) có gasPrice
  web3.config.defaultTransactionType = '0x0';
  const accounts = {};
  ACCOUNTS.forEach((name, i) => {
    accounts[name] = web3.eth.accounts.wallet.add(keys[i]).get(i).address;
  });
  return { web3, accounts };
}

function createWallets() {
  if (fs.existsSync(ENV_FILE) && ACCOUNTS.some(n => readEnv()[envKey(n)])) {
    throw new Error('.env đã có private key. Xóa các dòng *_PRIVATE_KEY nếu thật sự muốn tạo ví mới.');
  }
  const web3 = new Web3();
  const created = ACCOUNTS.map(name => ({ name, ...web3.eth.accounts.create() }));
  const lines = [
    '# Ví dùng cho scripts/seed.js trên RSK Testnet. Không commit file này.',
    `RSK_RPC_URL=${RSK_RPC}`,
    ...created.map(a => `${envKey(a.name)}=${a.privateKey}`),
  ];
  fs.appendFileSync(ENV_FILE, (fs.existsSync(ENV_FILE) ? '\n' : '') + lines.join('\n') + '\n');
  console.log('Đã ghi 6 ví mới vào .env:\n');
  for (const a of created) console.log(`  ${a.name.padEnd(13)} ${a.address}`);
  console.log(`\nXin tRBTC cho ví admin (${created[0].address}) tại https://faucet.rootstock.io,`);
  console.log('rồi chạy "node scripts/seed.js --network rsk". Script tự chuyển phí gas từ admin sang các ví còn lại.');
}

// ---------------------------------------------------------------------------
// Gửi giao dịch
// ---------------------------------------------------------------------------

async function sender(web3) {
  // Rootstock có giá gas tối thiểu; cộng thêm 10% để giao dịch không bị kẹt khi giá nhích lên
  const gasPrice = (await web3.eth.getGasPrice()) * 11n / 10n;
  return {
    gasPrice,
    async send(tx, from) {
      const gas = await tx.estimateGas({ from });
      return tx.send({ from, gas: String(gas * 13n / 10n), gasPrice: String(gasPrice) });
    },
  };
}

// Số giao dịch mỗi ví sẽ gửi, để ước tính phí cần nạp
function txCount(plan) {
  const count = Object.fromEntries(ACCOUNTS.map(n => [n, 0n]));
  count.admin = BigInt(plan.orgs.length);
  for (const b of plan.batches) {
    for (const s of b.steps) {
      const who = { coa: 'manufacturer', test: 'inspector', import: 'importer', deliver: 'importer', cancel: 'importer' }[s.type] ?? s.receiver;
      count[who] += 1n;
    }
  }
  return count;
}

async function fund(web3, accounts, plan, tx) {
  const fmt = wei => `${web3.utils.fromWei(wei, 'ether')} tRBTC`;
  const count = txCount(plan);
  const need = name => count[name] * GAS_PER_TX * tx.gasPrice;
  const topUps = [];
  for (const name of ACCOUNTS.slice(1)) {
    const short = need(name) - (await web3.eth.getBalance(accounts[name]));
    if (short > 0n) topUps.push({ name, value: short });
  }
  const adminNeed = (GAS_DEPLOY + (count.admin + BigInt(topUps.length)) * GAS_PER_TX) * tx.gasPrice
    + topUps.reduce((s, t) => s + t.value, 0n);
  const adminBalance = await web3.eth.getBalance(accounts.admin);
  console.log(`Giá gas ${web3.utils.fromWei(tx.gasPrice, 'gwei')} gwei; ví admin có ${fmt(adminBalance)}, cần khoảng ${fmt(adminNeed)}.`);
  if (adminBalance < adminNeed) {
    throw new Error(`Ví admin ${accounts.admin} không đủ tRBTC. Xin thêm tại https://faucet.rootstock.io rồi chạy lại.`);
  }
  for (const t of topUps) {
    await web3.eth.sendTransaction({ from: accounts.admin, to: accounts[t.name], value: String(t.value), gas: '21000', gasPrice: String(tx.gasPrice) });
    console.log(`  nạp ${fmt(t.value)} cho ${t.name}`);
  }
}

// ---------------------------------------------------------------------------
// Nạp dữ liệu
// ---------------------------------------------------------------------------

async function seed({ web3, accounts }, plan, network) {
  const { abi, bytecode } = compile();
  const tx = await sender(web3);
  if (network === 'rsk') await fund(web3, accounts, plan, tx);

  const log = [];
  const record = (batchNo, step, receipt) => {
    log.push({ batchNo, step, txHash: receipt.transactionHash, blockNumber: Number(receipt.blockNumber) });
    process.stdout.write('.');
  };

  const deploy = new web3.eth.Contract(abi).deploy({ data: bytecode });
  const deployGas = await deploy.estimateGas({ from: accounts.admin });
  let deployReceipt;
  const c = await deploy.send({ from: accounts.admin, gas: String(deployGas * 13n / 10n), gasPrice: String(tx.gasPrice) })
    .on('receipt', r => { deployReceipt = r; });
  console.log(`Contract: ${c.options.address} (khối ${deployReceipt.blockNumber})`);
  process.stdout.write('Đang gửi giao dịch ');

  const organizations = [{
    id: accounts.admin.toLowerCase(), address: accounts.admin.toLowerCase(), role: Role.Admin, roleName: 'Admin',
    name: 'Quản trị hệ thống PharmaChain', licenseNo: null, licenseHash: null,
    grantedAt: Number((await web3.eth.getBlock(deployReceipt.blockNumber)).timestamp), txHash: deployReceipt.transactionHash,
  }];
  for (const o of plan.orgs) {
    const r = await tx.send(c.methods.grantRole(accounts[o.key], Role[o.role], o.name, o.license.docHash), accounts.admin);
    record(null, 'grantRole', r);
    const addr = accounts[o.key].toLowerCase();
    organizations.push({
      id: addr, address: addr, role: Role[o.role], roleName: o.role, name: o.name,
      licenseNo: o.licenseNo, licenseHash: o.license.docHash, operatingSite: o.address,
      grantedAt: Number((await web3.eth.getBlock(r.blockNumber)).timestamp), txHash: r.transactionHash,
    });
  }

  const batches = [];
  for (const b of plan.batches) {
    let id;
    const meta = {
      batchNo: b.batchNo, materialName: b.materialName, storageConditions: b.storageConditions,
      mfgDate: toTs(b.mfgDate), expiryDate: toTs(b.expiryDate),
      quantity: b.quantity, unit: b.unit, packageCount: b.packageCount, packagingSpec: b.packagingSpec,
      countryOfOrigin: ORGS.manufacturer.country,
      manufacturerName: ORGS.manufacturer.name, importerName: ORGS.importer.name,
      isMock: false, dataSource: 'Bộ dữ liệu minh họa (scripts/dataset/dataset.js)',
      documents: [],
    };
    for (const s of b.steps) {
      const h = s.file.docHash;
      const date = toTs(s.date);
      let r;
      switch (s.type) {
        case 'coa':
          r = await tx.send(c.methods.registerBatch(b.batchNo, b.materialName, toTs(b.mfgDate), toTs(b.expiryDate), b.storageConditions, accounts.importer, h), accounts.manufacturer);
          id = Number(r.events.BatchRegistered.returnValues.batchId);
          Object.assign(meta, { docHash: h, coaNo: s.docNo });
          break;
        case 'test':
          r = await tx.send(c.methods.recordTestResult(id, s.passed, s.docNo, date, h), accounts.inspector);
          Object.assign(meta, { testReportNo: s.docNo, testPassed: s.passed, testDate: date, testDocHash: h, testNotes: s.note });
          break;
        case 'import':
          r = await tx.send(c.methods.recordImport(id, ORGS.manufacturer.country, s.docNo, date, h), accounts.importer);
          Object.assign(meta, { originCountry: ORGS.manufacturer.country, customsDeclNo: s.docNo, importDate: date, importDocHash: h, importPort: s.port });
          break;
        case 'deliver':
          r = await tx.send(c.methods.initiateTransfer(id, accounts[s.to], h), accounts.importer);
          Object.assign(meta, { designatedReceiver: accounts[s.to].toLowerCase(), receiverName: ORGS[s.to].name, deliveryNoteNo: s.docNo, transferDocHash: h });
          break;
        case 'cancel':
          r = await tx.send(c.methods.cancelTransfer(id, h), accounts.importer);
          Object.assign(meta, { cancelReason: s.reason, cancelDocHash: h });
          break;
        case 'receive':
          r = await tx.send(c.methods.confirmTransfer(id, h), accounts[s.receiver]);
          Object.assign(meta, { receivingNoteNo: s.docNo, receivedDocHash: h, receivingNotes: s.note });
          break;
        case 'qc':
          r = await tx.send(c.methods.recordReceivingInspection(id, s.passed, s.docNo, date, h), accounts[s.receiver]);
          Object.assign(meta, { qcReportNo: s.docNo, qcPassed: s.passed, inspectDate: date, qcDocHash: h, qcNotes: s.note });
          break;
      }
      record(b.batchNo, s.type, r);
      meta.documents.push({ step: STEP_DOC[s.type].prefix, docNo: s.docNo, fileName: s.file.fileName, docHash: h, txHash: r.transactionHash });
    }
    batches.push({ id, batchId: id, ...meta });
  }
  console.log(` ${log.length} giao dịch.`);

  return { contract: c, deployReceipt, log, db: { batches, organizations } };
}

// Đọc lại từ chuỗi: trạng thái từng lô và hash trong mọi event phải khớp với file hồ sơ.
async function verify(contract, plan, fromBlock) {
  let fail = 0;
  const check = (ok, msg) => { if (!ok) { fail++; console.log(`  FAIL ${msg}`); } };
  const events = await contract.getPastEvents('allEvents', { fromBlock, toBlock: 'latest' });
  for (const [i, b] of plan.batches.entries()) {
    const id = i + 1;
    check(Number(await contract.methods.getBatchIdByNo(b.batchNo).call()) === id, `${b.batchNo} có batchId ${id}`);
    const status = StatusName[Number((await contract.methods.getBatch(id).call()).status)];
    check(status === b.expect, `${b.batchNo}: trạng thái ${status}, mong đợi ${b.expect}`);
    const onChain = events.filter(e => e.returnValues.batchId !== undefined && Number(e.returnValues.batchId) === id).map(e => e.returnValues.docHash);
    const files = b.steps.map(s => s.file.docHash);
    check(JSON.stringify(onChain) === JSON.stringify(files), `${b.batchNo}: hash trong event khớp đúng thứ tự với ${files.length} file hồ sơ`);
  }
  const grants = events.filter(e => e.event === 'RoleGranted').map(e => e.returnValues.licenseHash);
  check(plan.orgs.every(o => grants.includes(o.license.docHash)), 'hash giấy phép của mọi tổ chức có trong RoleGranted');
  console.log(fail ? `Kiểm tra: ${fail} lỗi.` : `Kiểm tra: ${plan.batches.length} lô đúng trạng thái, mọi hash trên chuỗi khớp file hồ sơ.`);
  return fail === 0;
}

// ---------------------------------------------------------------------------

(async () => {
  if (flag('--new-wallets')) return createWallets();

  const network = option('--network') ?? 'local';
  if (!['local', 'rsk'].includes(network)) throw new Error('--network chỉ nhận local hoặc rsk');

  const plan = buildPlan();
  writeDocs(plan);
  console.log(`Đã sinh ${plan.files.length} file hồ sơ trong ${path.relative(ROOT, DOCS_DIR)}/`);

  const conn = await connect(network);
  console.log(network === 'rsk' ? 'Mạng: RSK Testnet' : 'Mạng: Ganache trong bộ nhớ (chạy thử)');
  const result = await seed(conn, plan, network);
  const ok = await verify(result.contract, plan, result.deployReceipt.blockNumber);

  const dbOut = network === 'rsk' ? DB_FILE : option('--db');
  if (dbOut) {
    fs.writeFileSync(dbOut, JSON.stringify(result.db, null, 2) + '\n');
    console.log(`Đã ghi ${path.relative(ROOT, dbOut) || dbOut}`);
  }
  if (network === 'rsk') {
    const { address } = result.contract.options;
    fs.mkdirSync(path.dirname(DEPLOY_FILE), { recursive: true });
    fs.writeFileSync(DEPLOY_FILE, JSON.stringify({
      network: 'RSK Testnet', chainId: 31, address,
      deployBlock: Number(result.deployReceipt.blockNumber), deployTx: result.deployReceipt.transactionHash,
      deployer: conn.accounts.admin, compiler: compile().solcVersion, evmVersion: 'paris',
      deployedAt: new Date().toISOString(), accounts: conn.accounts, transactions: result.log,
    }, null, 2) + '\n');
    console.log(`Đã ghi ${path.relative(ROOT, DEPLOY_FILE)}`);
    console.log(`\nCập nhật dapp/js/config/env.js: CONTRACT_ADDRESS: '${address}', APP_MODE: 'live'`);
  }
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('\n' + (e.message || e)); process.exit(1); });
