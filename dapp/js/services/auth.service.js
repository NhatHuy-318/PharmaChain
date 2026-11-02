/**
 * Auth Service
 * Quản lý trạng thái xác thực người dùng và kiểm tra quyền truy cập theo vai trò
 */

import { walletService } from './wallet.service.js';
import { Role, RoleName } from '../constants/roles.js';
import { BatchStatus } from '../constants/batchStatus.js';

export class AuthService {
  /**
   * Lấy thông tin người dùng hiện tại
   */
  static getCurrentUser() {
    return {
      address: walletService.getAddress(),
      role: walletService.getRole(),
      roleName: RoleName[walletService.getRole()] || 'Viewer',
      orgName: walletService.getOrgName(),
      isConnected: walletService.isWalletConnected(),
      isCorrectNetwork: walletService.isCorrectNetwork(),
    };
  }

  /**
   * Kiểm tra ví có vai trò yêu cầu không
   */
  static hasRole(requiredRole) {
    const current = walletService.getRole();
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(current);
    }
    return current === requiredRole;
  }

  /**
   * Kiểm tra người dùng có quyền thực hiện bước nghiệp vụ trên lô không
   * @param {number} step 1 (Register), 2 (Test), 3 (Import), 4 (Initiate Transfer), 5 (Confirm), 6 (QC)
   * @param {object} batch Thông tin lô hiện tại
   */
  static canPerformStep(step, batch = null) {
    const user = AuthService.getCurrentUser();
    if (!user.isConnected) return false;

    switch (step) {
      case 0: // Admin
        return user.role === Role.Admin;

      case 1: // Manufacturer: Register batch
        return user.role === Role.Manufacturer;

      case 2: // Inspector: Test
        return user.role === Role.Inspector && batch && batch.status === BatchStatus.Registered;

      case 3: // Importer: Import
        return (
          user.role === Role.Importer &&
          batch &&
          batch.status === BatchStatus.Tested &&
          batch.importer?.toLowerCase() === user.address?.toLowerCase()
        );

      case 4: // Importer: Transfer
        return (
          user.role === Role.Importer &&
          batch &&
          batch.status === BatchStatus.Imported &&
          batch.importer?.toLowerCase() === user.address?.toLowerCase()
        );

      case 5: // Receiver: Confirm
        return (
          user.role === Role.Receiver &&
          batch &&
          batch.status === BatchStatus.InTransfer &&
          batch.receiver?.toLowerCase() === user.address?.toLowerCase()
        );

      case 6: // Receiver: QC Inspect
        return (
          user.role === Role.Receiver &&
          batch &&
          batch.status === BatchStatus.Received &&
          batch.receiver?.toLowerCase() === user.address?.toLowerCase()
        );

      default:
        return false;
    }
  }
}

