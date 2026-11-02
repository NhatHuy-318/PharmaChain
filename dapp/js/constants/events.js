/**
 * PharmaChain Event Constants
 * Tương ứng chính xác với các event được định nghĩa trong BatchRegistry.sol
 */

export const ContractEvents = Object.freeze({
  RoleGranted: 'RoleGranted',
  RoleRevoked: 'RoleRevoked',
  BatchRegistered: 'BatchRegistered',
  BatchTested: 'BatchTested',
  BatchImported: 'BatchImported',
  TransferInitiated: 'TransferInitiated',
  TransferConfirmed: 'TransferConfirmed',
  TransferCancelled: 'TransferCancelled',
  ReceivingInspected: 'ReceivingInspected',
});

export const StepOrder = Object.freeze([
  { step: 0, event: ContractEvents.RoleGranted, label: 'Cấp quyền đơn vị' },
  { step: 1, event: ContractEvents.BatchRegistered, label: 'Đăng ký lô sản xuất' },
  { step: 2, event: ContractEvents.BatchTested, label: 'Kiểm nghiệm xuất xưởng' },
  { step: 3, event: ContractEvents.BatchImported, label: 'Nhập khẩu hải quan' },
  { step: 4, event: ContractEvents.TransferInitiated, label: 'Khởi tạo chuyển giao' },
  { step: 5, event: ContractEvents.TransferConfirmed, label: 'Xác nhận tiếp nhận' },
  { step: 6, event: ContractEvents.ReceivingInspected, label: 'Kiểm tra tại nơi nhận' },
]);

