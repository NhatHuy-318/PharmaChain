/**
 * Contract Schema Definitions
 * Tập trung mô tả danh mục tham số và ràng buộc của smart contract BatchRegistry
 */

export const ContractMethods = Object.freeze({
  grantRole: {
    name: 'grantRole',
    inputs: ['account', 'role', 'orgName', 'licenseHash'],
    description: 'Admin cấp vai trò cho ví mới kèm tên đơn vị và hash giấy phép',
  },
  revokeRole: {
    name: 'revokeRole',
    inputs: ['account'],
    description: 'Admin thu hồi vai trò của một ví',
  },
  registerBatch: {
    name: 'registerBatch',
    inputs: ['batchNo', 'materialName', 'mfgDate', 'expiryDate', 'storageConditions', 'importer', 'docHash'],
    description: 'Manufacturer đăng ký lô nguyên liệu mới',
  },
  recordTestResult: {
    name: 'recordTestResult',
    inputs: ['batchId', 'passed', 'reportNo', 'testDate', 'docHash'],
    description: 'Inspector ghi kết quả kiểm nghiệm xuất xưởng',
  },
  recordImport: {
    name: 'recordImport',
    inputs: ['batchId', 'originCountry', 'customsDeclNo', 'importDate', 'docHash'],
    description: 'Importer ghi thông tin tờ khai hải quan',
  },
  initiateTransfer: {
    name: 'initiateTransfer',
    inputs: ['batchId', 'receiver', 'docHash'],
    description: 'Importer chỉ định Receiver và bắt đầu chuyển giao hàng',
  },
  confirmTransfer: {
    name: 'confirmTransfer',
    inputs: ['batchId', 'docHash'],
    description: 'Receiver xác nhận đã tiếp nhận lô hàng vật lý',
  },
  cancelTransfer: {
    name: 'cancelTransfer',
    inputs: ['batchId', 'docHash'],
    description: 'Importer hủy chuyển giao, đưa lô quay lại Imported và xóa Receiver',
  },
  recordReceivingInspection: {
    name: 'recordReceivingInspection',
    inputs: ['batchId', 'passed', 'reportNo', 'inspectDate', 'docHash'],
    description: 'Receiver kiểm tra chất lượng tại nơi nhận (Released hoặc Quarantined)',
  },
});

