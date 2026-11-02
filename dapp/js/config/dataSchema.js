/**
 * PharmaChain Data Schemas & Field Specifications
 * Quy định rõ ranh giới giữa on-chain (contract) và off-chain (JSON metadata)
 */

export const DataSchemas = Object.freeze({
  /**
   * On-chain struct Batch (tương thích BatchRegistry.sol)
   */
  OnChainBatch: {
    id: 'uint256',
    batchNo: 'string',
    manufacturer: 'address',
    importer: 'address',
    receiver: 'address', // 0x0 trước Bước 4
    holder: 'address',
    status: 'uint8',
    expiryDate: 'uint64',
    createdAt: 'uint64',
  },

  /**
   * Off-chain Metadata lưu tại JSON Server / mock JSON
   * Bổ sung thông tin mở rộng không đưa vào blockchain để tiết kiệm gas
   */
  OffChainBatchMetadata: {
    batchId: 'number',
    batchNo: 'string',
    materialName: 'string',
    quantity: 'number',
    unit: 'string', // 'kg', 'thùng', 'lọ'
    packageCount: 'number',
    packagingSpec: 'string',
    countryOfOrigin: 'string',
    manufacturerName: 'string',
    importerName: 'string',
    receiverName: 'string',
    storageConditions: 'string',
    notes: 'string',
  },

  /**
   * Event Record
   */
  TimelineEvent: {
    batchId: 'number',
    eventName: 'string',
    step: 'number',
    actor: 'string',
    orgName: 'string',
    timestamp: 'number',
    txHash: 'string',
    blockNumber: 'number',
    docHash: 'string',
    details: 'object',
  },

  /**
   * Organization / Participant
   */
  Organization: {
    address: 'string',
    role: 'number',
    name: 'string',
    licenseNo: 'string',
    licenseHash: 'string',
    contactEmail: 'string',
  }
});

