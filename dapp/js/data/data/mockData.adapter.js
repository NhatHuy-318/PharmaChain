/**
 * Mock Data Adapter
 * Đọc siêu dữ liệu off-chain từ mock JSON và lưu trữ bổ sung vào localStorage
 */

import { IDataAdapter } from './data.interface.js';

export class MockDataAdapter extends IDataAdapter {
  constructor() {
    super();
    this.metadataMap = new Map();
    this.organizationsMap = new Map();
    this.isInitialized = false;
  }

  async init(initialData = null) {
    if (this.isInitialized) return;

    if (initialData) {
      this._loadData(initialData);
    } else {
      await this._loadFromStorageOrFiles();
    }

    this.isInitialized = true;
  }

  _loadData({ organizations = [], batches = [] }) {
    for (const org of organizations) {
      if (org.address) {
        this.organizationsMap.set(org.address.toLowerCase(), org);
      }
    }
    for (const b of batches) {
      if (b.id && b.metadata) {
        this.metadataMap.set(Number(b.id), {
          batchId: Number(b.id),
          batchNo: b.batchNo,
          materialName: b.materialName,
          ...b.metadata,
        });
      }
    }
  }

  async _loadFromStorageOrFiles() {
    const savedMeta = typeof localStorage !== 'undefined' ? localStorage.getItem('pharmachain_mock_metadata') : null;
    const savedOrgs = typeof localStorage !== 'undefined' ? localStorage.getItem('pharmachain_mock_orgs') : null;

    if (savedMeta && savedOrgs) {
      try {
        const metaArr = JSON.parse(savedMeta);
        const orgsArr = JSON.parse(savedOrgs);
        for (const m of metaArr) this.metadataMap.set(Number(m.batchId), m);
        for (const o of orgsArr) this.organizationsMap.set(o.address.toLowerCase(), o);
        return;
      } catch (e) {
        console.warn('Không thể nạp metadata từ localStorage');
      }
    }

    try {
      const [batchesRes, orgsRes] = await Promise.all([
        fetch('./data/batches.json').catch(() => null),
        fetch('./data/organizations.json').catch(() => null),
      ]);
      const batches = batchesRes && batchesRes.ok ? await batchesRes.json() : [];
      const organizations = orgsRes && orgsRes.ok ? await orgsRes.json() : [];
      this._loadData({ batches, organizations });
      this._saveToStorage();
    } catch (err) {
      console.error('Lỗi khi nạp mock metadata:', err);
    }
  }

  _saveToStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const metaArr = Array.from(this.metadataMap.values());
      const orgsArr = Array.from(this.organizationsMap.values());
      localStorage.setItem('pharmachain_mock_metadata', JSON.stringify(metaArr));
      localStorage.setItem('pharmachain_mock_orgs', JSON.stringify(orgsArr));
    } catch (e) {
      console.warn('Không thể lưu mock metadata vào localStorage:', e);
    }
  }

  async getBatchMetadata(batchId) {
    await this.init();
    return this.metadataMap.get(Number(batchId)) || null;
  }

  async saveBatchMetadata(batchId, metadata) {
    await this.init();
    const bId = Number(batchId);
    const existing = this.metadataMap.get(bId) || {};
    const updated = { ...existing, ...metadata, batchId: bId };
    this.metadataMap.set(bId, updated);
    this._saveToStorage();
    return updated;
  }

  async getOrganizations() {
    await this.init();
    return Array.from(this.organizationsMap.values());
  }

  async getOrganization(address) {
    await this.init();
    if (!address) return null;
    return this.organizationsMap.get(address.toLowerCase()) || null;
  }

  async saveOrganization(org) {
    await this.init();
    if (!org || !org.address) throw new Error('Dữ liệu tổ chức không hợp lệ.');
    const addr = org.address.toLowerCase();
    this.organizationsMap.set(addr, { ...org, address: addr });
    this._saveToStorage();
    return true;
  }

  async searchBatches(query) {
    await this.init();
    if (!query || typeof query !== 'string') return [];
    const q = query.trim().toLowerCase();
    const results = [];
    for (const item of this.metadataMap.values()) {
      const bNo = (item.batchNo || '').toLowerCase();
      const mName = (item.materialName || '').toLowerCase();
      const orgName = (item.manufacturerName || '').toLowerCase();
      if (bNo.includes(q) || mName.includes(q) || orgName.includes(q)) {
        results.push(item);
      }
    }
    return results;
  }
}

export const mockDataAdapter = new MockDataAdapter();

