/**
 * Mock Chain Adapter
 * Mô phỏng chính xác 100% logic máy trạng thái, kiểm soát vai trò và kiểm tra lỗi của BatchRegistry.sol
 */

import { IChainAdapter } from './chain.interface.js';
import { Role } from '../../constants/roles.js';
import { BatchStatus, BatchStatusName } from '../../constants/batchStatus.js';
import { ContractEvents } from '../../constants/events.js';
import { walletService } from '../wallet.service.js';
import { normalizeBatchNo, isValidBatchNo } from '../../utils/format.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ADMIN_ADDRESS = '0x1111111111111111111111111111111111111111';

export class MockChainAdapter extends IChainAdapter {
  constructor() {
    super();
    this.admin = ADMIN_ADDRESS;
    this.roles = new Map();
    this.batches = new Map();
    this.batchIdByNo = new Map();
    this.events = [];
    this.isInitialized = false;
  }

  async init(mockData = null) {
    if (this.isInitialized) return;

    // Thiết lập Admin mặc định
    this.roles.set(this.admin.toLowerCase(), Role.Admin);

    if (mockData) {
      this._loadInitialData(mockData);
    } else {
      await this._loadFromStorageOrFiles();
    }

    this.isInitialized = true;
  }

  _loadInitialData({ organizations = [], batches = [], events = [] }) {
    for (const org of organizations) {
      if (org.address && org.role !== undefined) {
        this.roles.set(org.address.toLowerCase(), Number(org.role));
      }
    }
    for (const b of batches) {
      const cleanNo = normalizeBatchNo(b.batchNo);
      this.batches.set(Number(b.id), {
        id: Number(b.id),
        batchNo: cleanNo,
        manufacturer: (b.manufacturer || '').toLowerCase(),
        importer: (b.importer || '').toLowerCase(),
        receiver: (b.receiver || ZERO_ADDRESS).toLowerCase(),
        holder: (b.holder || b.manufacturer || '').toLowerCase(),
        status: Number(b.status),
        expiryDate: Number(b.expiryDate),
        createdAt: Number(b.createdAt || Date.now() / 1000),
      });
      this.batchIdByNo.set(cleanNo, Number(b.id));
    }
    this.events = [...events];
  }

  async _loadFromStorageOrFiles() {
    // 1. Kiểm tra localStorage (nếu người dùng đã thao tác trong phiên trước)
    const savedBatches = typeof localStorage !== 'undefined' ? localStorage.getItem('pharmachain_mock_batches') : null;
    const savedEvents = typeof localStorage !== 'undefined' ? localStorage.getItem('pharmachain_mock_events') : null;
    const savedRoles = typeof localStorage !== 'undefined' ? localStorage.getItem('pharmachain_mock_roles') : null;

    if (savedBatches && savedEvents && savedRoles) {
      try {
        const parsedBatches = JSON.parse(savedBatches);
        const parsedEvents = JSON.parse(savedEvents);
        const parsedRoles = JSON.parse(savedRoles);

        for (const [addr, r] of Object.entries(parsedRoles)) {
          this.roles.set(addr.toLowerCase(), Number(r));
        }
        for (const b of parsedBatches) {
          this.batches.set(Number(b.id), b);
          this.batchIdByNo.set(b.batchNo, Number(b.id));
        }
        this.events = parsedEvents;
        return;
      } catch (e) {
        console.warn('Không thể nạp dữ liệu từ localStorage, sẽ nạp lại từ tệp json');
      }
    }

    // 2. Nạp từ các tệp mock data tĩnh
    try {
      const [orgsRes, batchesRes, eventsRes] = await Promise.all([
        fetch('./data/organizations.json').catch(() => null),
        fetch('./data/batches.json').catch(() => null),
        fetch('./data/events.json').catch(() => null),
      ]);

      const organizations = orgsRes && orgsRes.ok ? await orgsRes.json() : [];
      const batches = batchesRes && batchesRes.ok ? await batchesRes.json() : [];
      const events = eventsRes && eventsRes.ok ? await eventsRes.json() : [];

      this._loadInitialData({ organizations, batches, events });
      this._saveToStorage();
    } catch (err) {
      console.error('Lỗi khi nạp dữ liệu mock ban đầu:', err);
    }
  }

  _saveToStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const batchesArr = Array.from(this.batches.values());
      const rolesObj = Object.fromEntries(this.roles.entries());
      localStorage.setItem('pharmachain_mock_batches', JSON.stringify(batchesArr));
      localStorage.setItem('pharmachain_mock_events', JSON.stringify(this.events));
      localStorage.setItem('pharmachain_mock_roles', JSON.stringify(rolesObj));
    } catch (e) {
      console.warn('Không thể lưu mock vào localStorage:', e);
    }
  }

  _getSender() {
    const addr = walletService.getAddress();
    return (addr || this.admin).toLowerCase();
  }

  _getCurrentTimestamp() {
    return Math.floor(Date.now() / 1000);
  }

  _requireValidDate(date) {
    const now = this._getCurrentTimestamp();
    // Chấp nhận date nếu date > 0 và date <= now + 86400 (độ trễ múi giờ nhẹ)
    if (!date || date === 0 || date > now + 86400) {
      throw new Error('execution reverted: BR: invalid date');
    }
  }

  _isExpired(batchId) {
    const b = this.batches.get(Number(batchId));
    if (!b) return false;
    return this._getCurrentTimestamp() > b.expiryDate;
  }

  // --- Quản lý vai trò (Bước 0) ---

  async grantRole(account, role, orgName, licenseHash) {
    await this.init();
    const sender = this._getSender();
    if (sender !== this.admin.toLowerCase()) {
      throw new Error('execution reverted: BR: not admin');
    }
    if (!licenseHash || licenseHash === ZERO_HASH) {
      throw new Error('execution reverted: BR: zero hash');
    }
    if (!account || account.toLowerCase() === ZERO_ADDRESS) {
      throw new Error('execution reverted: BR: zero address');
    }
    const r = Number(role);
    if (r === Role.None || r === Role.Admin) {
      throw new Error('execution reverted: BR: invalid role');
    }
    const targetAddr = account.toLowerCase();
    const currentRole = this.roles.get(targetAddr) || Role.None;
    if (currentRole !== Role.None) {
      throw new Error('execution reverted: BR: account has role');
    }
    if (!orgName || orgName.trim().length === 0) {
      throw new Error('execution reverted: BR: empty org name');
    }

    this.roles.set(targetAddr, r);
    const now = this._getCurrentTimestamp();
    this.events.push({
      batchId: 0,
      eventName: ContractEvents.RoleGranted,
      step: 0,
      actor: targetAddr,
      orgName: orgName.trim(),
      timestamp: now,
      blockNumber: 5000000 + this.events.length,
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      docHash: licenseHash,
      fields: { account: targetAddr, role: r, orgName: orgName.trim(), licenseHash, at: now },
    });

    this._saveToStorage();
    return true;
  }

  async revokeRole(account) {
    await this.init();
    const sender = this._getSender();
    if (sender !== this.admin.toLowerCase()) {
      throw new Error('execution reverted: BR: not admin');
    }
    const targetAddr = account.toLowerCase();
    const previousRole = this.roles.get(targetAddr) || Role.None;
    if (previousRole === Role.None) {
      throw new Error('execution reverted: BR: no role');
    }
    if (previousRole === Role.Admin) {
      throw new Error('execution reverted: BR: cannot revoke admin');
    }

    this.roles.set(targetAddr, Role.None);
    const now = this._getCurrentTimestamp();
    this.events.push({
      batchId: 0,
      eventName: ContractEvents.RoleRevoked,
      step: 0,
      actor: targetAddr,
      timestamp: now,
      blockNumber: 5000000 + this.events.length,
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      docHash: ZERO_HASH,
      fields: { account: targetAddr, previousRole, at: now },
    });

    this._saveToStorage();
    return true;
  }

  // --- Bước 1: Đăng ký lô ---

  async registerBatch(batchNo, materialName, mfgDate, expiryDate, storageConditions, importer, docHash) {
    await this.init();
    const sender = this._getSender();
    if (this.roles.get(sender) !== Role.Manufacturer) {
      throw new Error('execution reverted: BR: wrong role');
    }
    if (!docHash || docHash === ZERO_HASH) {
      throw new Error('execution reverted: BR: zero hash');
    }
    if (!batchNo || batchNo.trim().length === 0) {
      throw new Error('execution reverted: BR: empty batchNo');
    }
    if (!isValidBatchNo(batchNo)) {
      throw new Error('execution reverted: BR: invalid batchNo');
    }

    const cleanBatchNo = batchNo.trim();
    if (!materialName || materialName.trim().length === 0) {
      throw new Error('execution reverted: BR: empty material');
    }
    if (this.batchIdByNo.has(cleanBatchNo)) {
      throw new Error('execution reverted: BR: batchNo used');
    }
    if (Number(mfgDate) >= Number(expiryDate)) {
      throw new Error('execution reverted: BR: invalid dates');
    }

    this._requireValidDate(Number(mfgDate));

    const now = this._getCurrentTimestamp();
    if (now > Number(expiryDate)) {
      throw new Error('execution reverted: BR: expired');
    }

    const importerAddr = (importer || '').toLowerCase();
    if (this.roles.get(importerAddr) !== Role.Importer) {
      throw new Error('execution reverted: BR: not importer');
    }

    const batchId = this.batches.size + 1;
    const newBatch = {
      id: batchId,
      batchNo: cleanBatchNo,
      materialName: materialName.trim(),
      manufacturer: sender,
      importer: importerAddr,
      receiver: ZERO_ADDRESS,
      holder: sender,
      status: BatchStatus.Registered,
      expiryDate: Number(expiryDate),
      createdAt: now,
      storageConditions: storageConditions || '',
      docHash,
    };

    this.batches.set(batchId, newBatch);
    this.batchIdByNo.set(cleanBatchNo, batchId);

    this.events.push({
      batchId,
      eventName: ContractEvents.BatchRegistered,
      step: 1,
      actor: sender,
      orgName: walletService.getOrgName() || 'Manufacturer',
      timestamp: now,
      blockNumber: 5000000 + this.events.length,
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      docHash,
      fields: {
        batchId,
        manufacturer: sender,
        docHash,
        batchNo: cleanBatchNo,
        materialName: materialName.trim(),
        mfgDate: Number(mfgDate),
        expiryDate: Number(expiryDate),
        storageConditions: storageConditions || '',
        importer: importerAddr,
        at: now,
      },
    });

    this._saveToStorage();
    return batchId;
  }

  // --- Bước 2: Kiểm nghiệm ---

  async recordTestResult(batchId, passed, reportNo, testDate, docHash) {
    await this.init();
    const sender = this._getSender();
    if (this.roles.get(sender) !== Role.Inspector) {
      throw new Error('execution reverted: BR: wrong role');
    }
    const bId = Number(batchId);
    if (!this.batches.has(bId)) {
      throw new Error('execution reverted: BR: batch not found');
    }
    const b = this.batches.get(bId);
    if (b.status !== BatchStatus.Registered) {
      throw new Error('execution reverted: BR: wrong status');
    }
    if (!docHash || docHash === ZERO_HASH) {
      throw new Error('execution reverted: BR: zero hash');
    }
    if (!reportNo || reportNo.trim().length === 0) {
      throw new Error('execution reverted: BR: empty reportNo');
    }

    this._requireValidDate(Number(testDate));

    if (passed && this._isExpired(bId)) {
      throw new Error('execution reverted: BR: expired');
    }

    b.status = passed ? BatchStatus.Tested : BatchStatus.Rejected;
    const now = this._getCurrentTimestamp();

    this.events.push({
      batchId: bId,
      eventName: ContractEvents.BatchTested,
      step: 2,
      actor: sender,
      orgName: walletService.getOrgName() || 'Inspector',
      timestamp: now,
      blockNumber: 5000000 + this.events.length,
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      docHash,
      fields: {
        batchId: bId,
        inspector: sender,
        docHash,
        passed: Boolean(passed),
        reportNo: reportNo.trim(),
        testDate: Number(testDate),
        at: now,
      },
    });

    this._saveToStorage();
    return true;
  }

  // --- Bước 3: Nhập khẩu ---

  async recordImport(batchId, originCountry, customsDeclNo, importDate, docHash) {
    await this.init();
    const sender = this._getSender();
    if (this.roles.get(sender) !== Role.Importer) {
      throw new Error('execution reverted: BR: wrong role');
    }
    const bId = Number(batchId);
    if (!this.batches.has(bId)) {
      throw new Error('execution reverted: BR: batch not found');
    }
    const b = this.batches.get(bId);
    if (b.status !== BatchStatus.Tested) {
      throw new Error('execution reverted: BR: wrong status');
    }
    if (!docHash || docHash === ZERO_HASH) {
      throw new Error('execution reverted: BR: zero hash');
    }
    if (sender !== b.importer.toLowerCase()) {
      throw new Error('execution reverted: BR: not designated');
    }
    if (!originCountry || originCountry.trim().length === 0) {
      throw new Error('execution reverted: BR: empty origin');
    }
    if (!customsDeclNo || customsDeclNo.trim().length === 0) {
      throw new Error('execution reverted: BR: empty customsDeclNo');
    }

    this._requireValidDate(Number(importDate));

    if (this._isExpired(bId)) {
      throw new Error('execution reverted: BR: expired');
    }

    b.status = BatchStatus.Imported;
    b.holder = sender;
    const now = this._getCurrentTimestamp();

    this.events.push({
      batchId: bId,
      eventName: ContractEvents.BatchImported,
      step: 3,
      actor: sender,
      orgName: walletService.getOrgName() || 'Importer',
      timestamp: now,
      blockNumber: 5000000 + this.events.length,
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      docHash,
      fields: {
        batchId: bId,
        importer: sender,
        docHash,
        originCountry: originCountry.trim(),
        customsDeclNo: customsDeclNo.trim(),
        importDate: Number(importDate),
        at: now,
      },
    });

    this._saveToStorage();
    return true;
  }

  // --- Bước 4: Khởi tạo chuyển giao ---

  async initiateTransfer(batchId, receiver, docHash) {
    await this.init();
    const sender = this._getSender();
    if (this.roles.get(sender) !== Role.Importer) {
      throw new Error('execution reverted: BR: wrong role');
    }
    const bId = Number(batchId);
    if (!this.batches.has(bId)) {
      throw new Error('execution reverted: BR: batch not found');
    }
    const b = this.batches.get(bId);
    if (b.status !== BatchStatus.Imported) {
      throw new Error('execution reverted: BR: wrong status');
    }
    if (!docHash || docHash === ZERO_HASH) {
      throw new Error('execution reverted: BR: zero hash');
    }
    if (sender !== b.importer.toLowerCase()) {
      throw new Error('execution reverted: BR: not designated');
    }
    const receiverAddr = (receiver || '').toLowerCase();
    if (this.roles.get(receiverAddr) !== Role.Receiver) {
      throw new Error('execution reverted: BR: not receiver');
    }
    if (this._isExpired(bId)) {
      throw new Error('execution reverted: BR: expired');
    }

    b.status = BatchStatus.InTransfer;
    b.receiver = receiverAddr;
    // Importer vẫn là holder trong lúc InTransfer!
    const now = this._getCurrentTimestamp();

    this.events.push({
      batchId: bId,
      eventName: ContractEvents.TransferInitiated,
      step: 4,
      actor: sender,
      orgName: walletService.getOrgName() || 'Importer',
      timestamp: now,
      blockNumber: 5000000 + this.events.length,
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      docHash,
      fields: {
        batchId: bId,
        from: sender,
        docHash,
        to: receiverAddr,
        at: now,
      },
    });

    this._saveToStorage();
    return true;
  }

  // --- Bước 5: Xác nhận nhận hàng ---

  async confirmTransfer(batchId, docHash) {
    await this.init();
    const sender = this._getSender();
    if (this.roles.get(sender) !== Role.Receiver) {
      throw new Error('execution reverted: BR: wrong role');
    }
    const bId = Number(batchId);
    if (!this.batches.has(bId)) {
      throw new Error('execution reverted: BR: batch not found');
    }
    const b = this.batches.get(bId);
    if (b.status !== BatchStatus.InTransfer) {
      throw new Error('execution reverted: BR: wrong status');
    }
    if (!docHash || docHash === ZERO_HASH) {
      throw new Error('execution reverted: BR: zero hash');
    }
    if (sender !== b.receiver.toLowerCase()) {
      throw new Error('execution reverted: BR: not designated');
    }

    // Không chặn lô hết hạn: hàng đã đến nơi thật
    b.status = BatchStatus.Received;
    b.holder = sender;
    const now = this._getCurrentTimestamp();

    this.events.push({
      batchId: bId,
      eventName: ContractEvents.TransferConfirmed,
      step: 5,
      actor: sender,
      orgName: walletService.getOrgName() || 'Receiver',
      timestamp: now,
      blockNumber: 5000000 + this.events.length,
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      docHash,
      fields: {
        batchId: bId,
        receiver: sender,
        docHash,
        at: now,
      },
    });

    this._saveToStorage();
    return true;
  }

  // --- Ngoại lệ: Hủy chuyển giao ---

  async cancelTransfer(batchId, docHash) {
    await this.init();
    const sender = this._getSender();
    if (this.roles.get(sender) !== Role.Importer) {
      throw new Error('execution reverted: BR: wrong role');
    }
    const bId = Number(batchId);
    if (!this.batches.has(bId)) {
      throw new Error('execution reverted: BR: batch not found');
    }
    const b = this.batches.get(bId);
    if (b.status !== BatchStatus.InTransfer) {
      throw new Error('execution reverted: BR: wrong status');
    }
    if (!docHash || docHash === ZERO_HASH) {
      throw new Error('execution reverted: BR: zero hash');
    }
    if (sender !== b.importer.toLowerCase()) {
      throw new Error('execution reverted: BR: not designated');
    }

    const previousReceiver = b.receiver;
    b.status = BatchStatus.Imported;
    b.receiver = ZERO_ADDRESS;
    const now = this._getCurrentTimestamp();

    this.events.push({
      batchId: bId,
      eventName: ContractEvents.TransferCancelled,
      step: 4,
      actor: sender,
      orgName: walletService.getOrgName() || 'Importer',
      timestamp: now,
      blockNumber: 5000000 + this.events.length,
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      docHash,
      fields: {
        batchId: bId,
        importer: sender,
        docHash,
        previousReceiver,
        at: now,
      },
    });

    this._saveToStorage();
    return true;
  }

  // --- Bước 6: Kiểm tra tại nơi nhận ---

  async recordReceivingInspection(batchId, passed, reportNo, inspectDate, docHash) {
    await this.init();
    const sender = this._getSender();
    if (this.roles.get(sender) !== Role.Receiver) {
      throw new Error('execution reverted: BR: wrong role');
    }
    const bId = Number(batchId);
    if (!this.batches.has(bId)) {
      throw new Error('execution reverted: BR: batch not found');
    }
    const b = this.batches.get(bId);
    if (b.status !== BatchStatus.Received) {
      throw new Error('execution reverted: BR: wrong status');
    }
    if (!docHash || docHash === ZERO_HASH) {
      throw new Error('execution reverted: BR: zero hash');
    }
    if (sender !== b.receiver.toLowerCase()) {
      throw new Error('execution reverted: BR: not designated');
    }
    if (!reportNo || reportNo.trim().length === 0) {
      throw new Error('execution reverted: BR: empty reportNo');
    }

    this._requireValidDate(Number(inspectDate));

    if (passed && this._isExpired(bId)) {
      throw new Error('execution reverted: BR: expired');
    }

    b.status = passed ? BatchStatus.Released : BatchStatus.Quarantined;
    const now = this._getCurrentTimestamp();

    this.events.push({
      batchId: bId,
      eventName: ContractEvents.ReceivingInspected,
      step: 6,
      actor: sender,
      orgName: walletService.getOrgName() || 'Receiver',
      timestamp: now,
      blockNumber: 5000000 + this.events.length,
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      docHash,
      fields: {
        batchId: bId,
        receiver: sender,
        docHash,
        passed: Boolean(passed),
        reportNo: reportNo.trim(),
        inspectDate: Number(inspectDate),
        at: now,
      },
    });

    this._saveToStorage();
    return true;
  }

  // --- Hàm đọc dữ liệu on-chain ---

  async getRole(account) {
    await this.init();
    if (!account) return Role.None;
    return this.roles.get(account.toLowerCase()) || Role.None;
  }

  async getBatch(batchId) {
    await this.init();
    const bId = Number(batchId);
    if (!this.batches.has(bId)) {
      throw new Error('execution reverted: BR: batch not found');
    }
    return { ...this.batches.get(bId) };
  }

  async getBatchCount() {
    await this.init();
    return this.batches.size;
  }

  async getBatches(fromId, count) {
    await this.init();
    const fId = Number(fromId);
    const cnt = Number(count);
    const total = this.batches.size;
    if (fId === 0 || fId > total || cnt === 0) {
      return [];
    }
    const page = [];
    for (let i = 0; i < cnt && fId + i <= total; i++) {
      page.push({ ...this.batches.get(fId + i) });
    }
    return page;
  }

  async getBatchIdByNo(batchNo) {
    await this.init();
    const cleanNo = normalizeBatchNo(batchNo);
    return this.batchIdByNo.get(cleanNo) || 0;
  }

  async isExpired(batchId) {
    await this.init();
    const bId = Number(batchId);
    if (!this.batches.has(bId)) {
      throw new Error('execution reverted: BR: batch not found');
    }
    return this._isExpired(bId);
  }

  // --- Truy vấn sự kiện ---

  async getBatchEvents(batchId) {
    await this.init();
    const bId = Number(batchId);
    return this.events.filter((e) => e.batchId === bId);
  }

  async searchEventsByDocHash(docHash) {
    await this.init();
    if (!docHash) return [];
    const target = docHash.toLowerCase();
    return this.events.filter((e) => (e.docHash || '').toLowerCase() === target);
  }
}

export const mockChainAdapter = new MockChainAdapter();
