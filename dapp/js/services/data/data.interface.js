/**
 * Data Interface (Off-chain Metadata Abstraction)
 * Giao diện trừu tượng cho MockDataAdapter và JsonServerDataAdapter
 */

export class IDataAdapter {
  async getBatchMetadata(batchId) { throw new Error('Not implemented'); }
  async saveBatchMetadata(batchId, metadata) { throw new Error('Not implemented'); }
  async getOrganizations() { throw new Error('Not implemented'); }
  async getOrganization(address) { throw new Error('Not implemented'); }
  async saveOrganization(org) { throw new Error('Not implemented'); }
  async searchBatches(query) { throw new Error('Not implemented'); }
}

