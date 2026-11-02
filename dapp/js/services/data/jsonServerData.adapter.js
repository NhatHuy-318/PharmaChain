/**
 * JSON Server Data Adapter
 * Giao tiếp với JSON Server REST API theo đúng kiến trúc mô tả trong báo cáo đồ án
 */

import { IDataAdapter } from './data.interface.js';
import { ENV } from '../../config/env.js';

export class JsonServerDataAdapter extends IDataAdapter {
  constructor() {
    super();
    this.baseUrl = ENV.JSON_SERVER_URL;
  }

  async getBatchMetadata(batchId) {
    try {
      const res = await fetch(`${this.baseUrl}/batches/${batchId}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error(`Lỗi JSON Server getBatchMetadata(${batchId}):`, err);
      return null;
    }
  }

  async saveBatchMetadata(batchId, metadata) {
    try {
      const res = await fetch(`${this.baseUrl}/batches/${batchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...metadata, id: batchId, batchId }),
      });
      if (!res.ok) {
        // Nếu chưa tồn tại, thử POST
        return await (await fetch(`${this.baseUrl}/batches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...metadata, id: batchId, batchId }),
        })).json();
      }
      return await res.json();
    } catch (err) {
      console.error(`Lỗi JSON Server saveBatchMetadata:`, err);
      throw err;
    }
  }

  async getOrganizations() {
    try {
      const res = await fetch(`${this.baseUrl}/organizations`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      return [];
    }
  }

  async getOrganization(address) {
    try {
      const res = await fetch(`${this.baseUrl}/organizations?address=${address.toLowerCase()}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data[0] || null;
    } catch (err) {
      return null;
    }
  }

  async saveOrganization(org) {
    try {
      const res = await fetch(`${this.baseUrl}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(org),
      });
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  async searchBatches(query) {
    try {
      const res = await fetch(`${this.baseUrl}/batches?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      return [];
    }
  }
}

export const jsonServerDataAdapter = new JsonServerDataAdapter();

