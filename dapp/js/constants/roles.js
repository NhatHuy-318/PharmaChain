/**
 * PharmaChain On-Chain Roles & UI Role Definitions
 * Smart contract BatchRegistry: enum Role { None, Admin, Manufacturer, Inspector, Importer, Receiver }
 * Lưu ý: Viewer là vai trò tầng DApp cho khách truy cập công khai, không phải enum on-chain.
 */

export const Role = Object.freeze({
  None: 0,
  Admin: 1,
  Manufacturer: 2,
  Inspector: 3,
  Importer: 4,
  Receiver: 5,
});

export const RoleName = Object.freeze({
  [Role.None]: 'None',
  [Role.Admin]: 'Admin',
  [Role.Manufacturer]: 'Manufacturer',
  [Role.Inspector]: 'Inspector',
  [Role.Importer]: 'Importer',
  [Role.Receiver]: 'Receiver',
});

// Portal page routing mapping for each role
export const RolePortal = Object.freeze({
  [Role.Admin]: 'admin.html',
  [Role.Manufacturer]: 'manufacturer.html',
  [Role.Inspector]: 'inspector.html',
  [Role.Importer]: 'importer.html',
  [Role.Receiver]: 'receiver.html',
});

// App level Viewer constant (được dùng ở UI, không gửi lên contract)
export const UI_VIEWER_ROLE = 'Viewer';

