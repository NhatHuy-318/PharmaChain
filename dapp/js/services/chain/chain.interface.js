/**
 * Chain Interface (Contract Layer Abstraction)
 * Giao diện trừu tượng chuẩn hóa cho cả MockChainAdapter và Web3ChainAdapter
 */

export class IChainAdapter {
  // --- Quản lý vai trò (Bước 0) ---
  async grantRole(account, role, orgName, licenseHash) { throw new Error('Not implemented'); }
  async revokeRole(account) { throw new Error('Not implemented'); }

  // --- Quy trình 6 bước lô nguyên liệu ---
  async registerBatch(batchNo, materialName, mfgDate, expiryDate, storageConditions, importer, docHash) { throw new Error('Not implemented'); }
  async recordTestResult(batchId, passed, reportNo, testDate, docHash) { throw new Error('Not implemented'); }
  async recordImport(batchId, originCountry, customsDeclNo, importDate, docHash) { throw new Error('Not implemented'); }
  async initiateTransfer(batchId, receiver, docHash) { throw new Error('Not implemented'); }
  async confirmTransfer(batchId, docHash) { throw new Error('Not implemented'); }
  async cancelTransfer(batchId, docHash) { throw new Error('Not implemented'); }
  async recordReceivingInspection(batchId, passed, reportNo, inspectDate, docHash) { throw new Error('Not implemented'); }

  // --- Hàm đọc dữ liệu on-chain ---
  async getRole(account) { throw new Error('Not implemented'); }
  async getBatch(batchId) { throw new Error('Not implemented'); }
  async getBatchCount() { throw new Error('Not implemented'); }
  async getBatches(fromId, count) { throw new Error('Not implemented'); }
  async getBatchIdByNo(batchNo) { throw new Error('Not implemented'); }
  async isExpired(batchId) { throw new Error('Not implemented'); }

  // --- Truy vấn sự kiện on-chain ---
  async getBatchEvents(batchId) { throw new Error('Not implemented'); }
  async searchEventsByDocHash(docHash) { throw new Error('Not implemented'); }
}

