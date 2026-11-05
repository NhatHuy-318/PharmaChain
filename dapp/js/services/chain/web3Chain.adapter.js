/**
 * Web3 Chain Adapter
 * Kết nối tương tác trực tiếp với smart contract BatchRegistry qua Web3.js và MetaMask.
 * Mọi giá trị trả về được chuẩn hóa về cùng dạng với MockChainAdapter (số thường thay cho BigInt,
 * địa chỉ chữ thường, event có eventName/step/stepLabel/actor/orgName/fields) để các trang dùng chung.
 */

import { IChainAdapter } from './chain.interface.js';
import { CONTRACT_CONFIG, loadContractAbi } from '../../config/contract.js';
import { ENV } from '../../config/env.js';
import { RoleName } from '../../constants/roles.js';
import { ContractEvents, StepOrder } from '../../constants/events.js';

const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
const WEB3_CDN = 'https://cdn.jsdelivr.net/npm/web3@4.16.0/dist/web3.min.js';
const EVENTS_TTL_MS = 30000;

// Tham số indexed chỉ ra ví thực hiện của từng event
const ACTOR_FIELD = Object.freeze({
  RoleGranted: 'account',
  RoleRevoked: 'account',
  BatchRegistered: 'manufacturer',
  BatchTested: 'inspector',
  BatchImported: 'importer',
  TransferInitiated: 'from',
  TransferConfirmed: 'receiver',
  TransferCancelled: 'importer',
  ReceivingInspected: 'receiver',
});

const isAddress = (v) => typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v);

// BigInt -> Number, địa chỉ -> chữ thường; bỏ khóa số và __length__ mà web3 thêm vào
function plain(values) {
  const out = {};
  for (const [k, v] of Object.entries(values || {})) {
    if (/^\d+$/.test(k) || k === '__length__') continue;
    if (typeof v === 'bigint') out[k] = Number(v);
    else if (isAddress(v)) out[k] = v.toLowerCase();
    else out[k] = v;
  }
  return out;
}

function toBatch(b) {
  return {
    id: Number(b.id),
    batchNo: b.batchNo,
    manufacturer: b.manufacturer.toLowerCase(),
    importer: b.importer.toLowerCase(),
    receiver: b.receiver.toLowerCase(),
    holder: b.holder.toLowerCase(),
    status: Number(b.status),
    expiryDate: Number(b.expiryDate),
    createdAt: Number(b.createdAt),
  };
}

function stepOf(eventName) {
  if (eventName === ContractEvents.RoleRevoked) return { step: 0, label: 'Thu hồi quyền đơn vị' };
  if (eventName === ContractEvents.TransferCancelled) return { step: 4, label: 'Hủy chuyển giao' };
  const s = StepOrder.find((o) => o.event === eventName);
  return s ? { step: s.step, label: s.label } : { step: -1, label: eventName };
}

// Giải mã Error(string) dạng ABI (0x08c379a0 + offset + độ dài + nội dung), khi node chỉ trả revert data
function decodeRevertData(text) {
  const m = text.match(/0x08c379a0([0-9a-fA-F]{128,})/);
  if (!m) return '';
  const len = parseInt(m[1].slice(64, 128), 16);
  const hex = m[1].slice(128, 128 + len * 2);
  return new TextDecoder().decode(new Uint8Array(hex.match(/../g)?.map((h) => parseInt(h, 16)) || []));
}

// Lấy lý do revert (BR: ...) từ lỗi web3/MetaMask để translateError() dịch được như ở chế độ mock
function toChainError(err) {
  if (err?.code === 4001 || err?.innerError?.code === 4001) return new Error('User denied transaction signature');
  let text = '';
  try {
    text = JSON.stringify(err, (k, v) => (typeof v === 'bigint' ? v.toString() : v));
  } catch (_) { /* bỏ qua */ }
  text = `${err?.message || ''} ${text} ${decodeRevertData(text)}`;
  const match = text.match(/BR: [A-Za-z]+(?: [A-Za-z]+)*/);
  if (match) return new Error(`execution reverted: ${match[0]}`);
  // web3 đôi khi ném nguyên phản hồi JSON-RPC (không phải Error), bọc lại để các trang đọc được .message
  return err instanceof Error ? err : new Error(err?.error?.message || err?.message || text.trim());
}

function loadWeb3Script() {
  if (window.Web3) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = WEB3_CDN;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Không tải được thư viện web3 (kiểm tra kết nối mạng).'));
    document.head.appendChild(s);
  });
}

export class Web3ChainAdapter extends IChainAdapter {
  constructor() {
    super();
    this.contract = null;
    this.web3 = null;
    this._ready = null;
    this.deployBlock = ENV.DEPLOY_BLOCK || 0;
    this.logsApiUrl = ENV.LOGS_API_URL || '';
  }

  // Ví và trang cùng gọi ngay khi tải; dùng chung một lần khởi tạo để không tạo hai bản contract
  _ensureContract() {
    if (!this._ready) {
      this._ready = this._init().catch((err) => {
        this._ready = null;
        throw err;
      });
    }
    return this._ready.then(() => this.contract);
  }

  async _init() {
    if (typeof window === 'undefined') throw new Error('Web3ChainAdapter chỉ chạy trong trình duyệt.');
    await loadWeb3Script();
    const Web3Lib = window.Web3.Web3 || window.Web3;
    const abi = await loadContractAbi();
    // Đọc luôn qua RPC của RSK: vai trò và dữ liệu lô không bị sai khi MetaMask đang ở mạng khác
    this.web3 = new Web3Lib(ENV.RPC_URL);
    this.contract = new this.web3.eth.Contract(abi, CONTRACT_CONFIG.address);
    this.logsContract = this.contract;
    // Bảng topic0 -> định nghĩa event, để giải mã log thô lấy từ Blockscout
    this.eventAbi = new Map(
      abi.filter((x) => x.type === 'event').map((x) => [this.web3.eth.abi.encodeEventSignature(x).toLowerCase(), x])
    );
    // Ký giao dịch qua MetaMask (nếu có)
    if (window.ethereum) {
      this.walletWeb3 = new Web3Lib(window.ethereum);
      // Rootstock chưa hỗ trợ EIP-1559, gửi giao dịch kiểu legacy
      this.walletWeb3.config.defaultTransactionType = '0x0';
      this.writeContract = new this.walletWeb3.eth.Contract(abi, CONTRACT_CONFIG.address);
    }
    return this.contract;
  }

  async _send(name, ...args) {
    await this._ensureContract();
    if (!this.writeContract) throw new Error('Cần MetaMask để ký giao dịch.');
    const [walletChain, chain] = await Promise.all([this.walletWeb3.eth.getChainId(), this.web3.eth.getChainId()]);
    if (walletChain !== chain) {
      throw new Error('MetaMask đang ở mạng khác. Chuyển sang Rootstock Testnet (Chain ID 31) rồi thử lại.');
    }
    const from = (await this.walletWeb3.eth.getAccounts())[0];
    const method = this.writeContract.methods[name](...args);
    try {
      // web3 v4 không tự ước lượng gas; ước lượng trước còn giúp bắt lý do revert trước khi ký
      const gas = await method.estimateGas({ from });
      const receipt = await method.send({ from, gas: (BigInt(gas) * 13n) / 10n });
      this._events = null; // có event mới, lần đọc sau phải lấy lại
      return receipt;
    } catch (err) {
      throw toChainError(err);
    }
  }

  async _call(method) {
    try {
      return await method.call();
    } catch (err) {
      throw toChainError(err);
    }
  }

  // --- Quản lý vai trò (Bước 0) ---

  async grantRole(account, role, orgName, licenseHash) {
    await this._send('grantRole', account, role, orgName, licenseHash);
    return true;
  }

  async revokeRole(account) {
    await this._send('revokeRole', account);
    return true;
  }

  // --- Quy trình 6 bước ---

  async registerBatch(batchNo, materialName, mfgDate, expiryDate, storageConditions, importer, docHash) {
    const receipt = await this._send('registerBatch', batchNo, materialName, mfgDate, expiryDate, storageConditions, importer, docHash);
    const id = receipt.events?.BatchRegistered?.returnValues?.batchId;
    return id !== undefined ? Number(id) : this.getBatchIdByNo(batchNo);
  }

  async recordTestResult(batchId, passed, reportNo, testDate, docHash) {
    await this._send('recordTestResult', batchId, passed, reportNo, testDate, docHash);
    return true;
  }

  async recordImport(batchId, originCountry, customsDeclNo, importDate, docHash) {
    await this._send('recordImport', batchId, originCountry, customsDeclNo, importDate, docHash);
    return true;
  }

  async initiateTransfer(batchId, receiver, docHash) {
    await this._send('initiateTransfer', batchId, receiver, docHash);
    return true;
  }

  async confirmTransfer(batchId, docHash) {
    await this._send('confirmTransfer', batchId, docHash);
    return true;
  }

  async cancelTransfer(batchId, docHash) {
    await this._send('cancelTransfer', batchId, docHash);
    return true;
  }

  async recordReceivingInspection(batchId, passed, reportNo, inspectDate, docHash) {
    await this._send('recordReceivingInspection', batchId, passed, reportNo, inspectDate, docHash);
    return true;
  }

  // --- Hàm đọc dữ liệu on-chain ---

  async getRole(account) {
    if (!account) return 0;
    const c = await this._ensureContract();
    return Number(await this._call(c.methods.getRole(account)));
  }

  async getBatch(batchId) {
    const c = await this._ensureContract();
    return toBatch(await this._call(c.methods.getBatch(batchId)));
  }

  async getBatchCount() {
    const c = await this._ensureContract();
    return Number(await this._call(c.methods.getBatchCount()));
  }

  async getBatches(fromId, count) {
    const c = await this._ensureContract();
    const page = await this._call(c.methods.getBatches(fromId, count));
    return page.map(toBatch);
  }

  async getBatchIdByNo(batchNo) {
    const c = await this._ensureContract();
    return Number(await this._call(c.methods.getBatchIdByNo(batchNo)));
  }

  async isExpired(batchId) {
    const c = await this._ensureContract();
    return Boolean(await this._call(c.methods.isExpired(batchId)));
  }

  /** Tên đơn vị của ví, lấy từ event RoleGranted gần nhất (nguồn on-chain) */
  async getOrgName(account) {
    if (!account) return '';
    const { orgs } = await this._loadEvents();
    return orgs.get(account.toLowerCase())?.orgName || '';
  }

  // --- Truy vấn sự kiện ---

  /**
   * Đọc toàn bộ event từ khối deploy rồi lọc ở phía DApp. Contract chỉ có vài trăm event
   * nên một lần getPastEvents là đủ, và tránh việc filter allEvents trên tham số indexed
   * (batchId không phải tham số indexed đầu tiên của RoleGranted/RoleRevoked).
   */
  _loadEvents() {
    // Một trang gọi nhiều lần (tên đơn vị, event từng lô, tra hash); Blockscout bản miễn phí giới hạn
    // số yêu cầu, nên các lời gọi trong EVENTS_TTL_MS dùng chung một lần đọc
    const fresh = this._events && Date.now() - this._events.at < EVENTS_TTL_MS;
    if (!fresh) {
      const promise = this._fetchEvents().catch((err) => {
        if (this._events?.promise === promise) this._events = null;
        throw err;
      });
      this._events = { at: Date.now(), promise };
    }
    return this._events.promise;
  }

  /**
   * public-node của RSK tắt eth_getLogs, nên trên RSK đọc log qua REST API v2 của Blockscout
   * (cổng JSON-RPC của Blockscout chỉ cho khoảng 10 yêu cầu mỗi 40 phút, REST cho 180 mỗi phút).
   * Không đặt LOGS_API_URL (vd chạy với Ganache) thì đọc bằng eth_getLogs như thường.
   */
  async _fetchRawEvents() {
    if (!this.logsApiUrl) {
      return this.logsContract.getPastEvents('allEvents', { fromBlock: this.deployBlock, toBlock: 'latest' });
    }
    const out = [];
    let params = '';
    // API trả mới nhất trước, mỗi trang tối đa 50 log; dừng khi qua khỏi khối deploy hoặc hết trang
    for (let page = 0; page < 40; page++) {
      const res = await fetch(`${this.logsApiUrl}/addresses/${CONTRACT_CONFIG.address}/logs${params}`);
      if (!res.ok) throw new Error(`Không đọc được event từ Blockscout (HTTP ${res.status}).`);
      const body = await res.json();
      for (const log of body.items || []) {
        if (log.block_number < this.deployBlock) return out;
        const def = this.eventAbi.get(String(log.topics[0]).toLowerCase());
        if (!def) continue;
        out.push({
          event: def.name,
          returnValues: this.web3.eth.abi.decodeLog(def.inputs, log.data, log.topics.slice(1).filter(Boolean)),
          blockNumber: log.block_number,
          logIndex: log.index,
          transactionHash: log.transaction_hash,
        });
      }
      if (!body.next_page_params) return out;
      params = '?' + new URLSearchParams(body.next_page_params).toString();
    }
    return out;
  }

  async _fetchEvents() {
    await this._ensureContract();
    const raw = await this._fetchRawEvents();
    raw.sort((a, b) => Number(a.blockNumber) - Number(b.blockNumber) || Number(a.logIndex) - Number(b.logIndex));

    const orgs = new Map();
    for (const e of raw) {
      if (e.event === ContractEvents.RoleGranted) {
        const v = plain(e.returnValues);
        orgs.set(v.account, { orgName: v.orgName, role: v.role });
      }
    }

    const events = raw.map((e) => {
      const fields = plain(e.returnValues);
      const actor = fields[ACTOR_FIELD[e.event]] || '';
      const { step, label } = stepOf(e.event);
      const org = orgs.get(actor);
      return {
        batchId: fields.batchId || 0,
        eventName: e.event,
        step,
        stepLabel: `Bước ${step}: ${label}`,
        actor,
        actorRole: org ? RoleName[org.role] : '',
        orgName: org?.orgName || '',
        timestamp: fields.at,
        blockNumber: Number(e.blockNumber),
        txHash: e.transactionHash,
        docHash: fields.docHash || fields.licenseHash || ZERO_HASH,
        fields,
      };
    });
    return { events, orgs };
  }

  async getBatchEvents(batchId) {
    const bId = Number(batchId);
    const { events } = await this._loadEvents();
    return events.filter((e) => e.batchId === bId);
  }

  async searchEventsByDocHash(docHash) {
    if (!docHash) return [];
    const target = docHash.toLowerCase();
    const { events } = await this._loadEvents();
    return events.filter((e) => e.docHash.toLowerCase() === target);
  }
}

export const web3ChainAdapter = new Web3ChainAdapter();
