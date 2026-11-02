/**
 * PharmaChain Batch Status Enum & Properties
 * Smart contract BatchRegistry:
 * enum Status { None, Registered, Tested, Rejected, Imported, InTransfer, Received, Released, Quarantined }
 */

export const BatchStatus = Object.freeze({
  None: 0,
  Registered: 1,
  Tested: 2,
  Rejected: 3,
  Imported: 4,
  InTransfer: 5,
  Received: 6,
  Released: 7,
  Quarantined: 8,
});

export const BatchStatusName = Object.freeze({
  [BatchStatus.None]: 'None',
  [BatchStatus.Registered]: 'Registered',
  [BatchStatus.Tested]: 'Tested',
  [BatchStatus.Rejected]: 'Rejected',
  [BatchStatus.Imported]: 'Imported',
  [BatchStatus.InTransfer]: 'InTransfer',
  [BatchStatus.Received]: 'Received',
  [BatchStatus.Released]: 'Released',
  [BatchStatus.Quarantined]: 'Quarantined',
});

// Trạng thái kết thúc: lô không thể chuyển tiếp sang trạng thái khác
export const isTerminalStatus = (status) => {
  const s = Number(status);
  return (
    s === BatchStatus.Rejected ||
    s === BatchStatus.Released ||
    s === BatchStatus.Quarantined
  );
};

