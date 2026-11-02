/**
 * Role Route Guard
 * Bảo vệ các trang phân quyền theo vai trò (Admin, Manufacturer, Inspector, Importer, Receiver)
 */

import { AuthService } from '../services/auth.service.js';
import { walletService } from '../services/wallet.service.js';
import { i18n } from '../i18n/vi.js';
import { $ } from '../utils/dom.js';

export function enforceRoleGuard(requiredRole, roleNameVi = '') {
  const mountEl = $('#role-guard-mount') || document.querySelector('main');
  if (!mountEl) return true;

  const user = AuthService.getCurrentUser();

  // 1. Chưa kết nối ví
  if (!user.isConnected || !user.address) {
    _renderGuardBlock(
      mountEl,
      'Yêu cầu kết nối ví',
      'Bạn cần kết nối ví Web3 để truy cập cổng nghiệp vụ này.',
      'btn-connect-guard',
      'Kết nối ví ngay'
    );
    $('#btn-connect-guard')?.addEventListener('click', async () => {
      try {
        await walletService.connect();
        window.location.reload();
      } catch (e) {
        console.error(e);
      }
    });
    return false;
  }

  // 2. Không đúng vai trò
  if (!AuthService.hasRole(requiredRole)) {
    _renderGuardBlock(
      mountEl,
      'Truy cập bị từ chối (Không đúng vai trò)',
      `Trang này chỉ dành cho vai trò <strong>${roleNameVi}</strong>. Ví hiện tại của bạn đang có vai trò: <strong>${user.roleName}</strong>.`,
      'btn-home-guard',
      'Về trang chủ'
    );
    $('#btn-home-guard')?.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
    return false;
  }

  return true;
}

function _renderGuardBlock(container, title, message, btnId, btnText) {
  container.innerHTML = `
    <div class="container" style="padding: var(--space-12) 0; text-align: center;">
      <div class="card" style="max-width: 520px; margin: 0 auto; padding: var(--space-8);">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: #FEECEE; color: #B4232C; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h3 style="margin-bottom: var(--space-2); color: var(--color-primary-dark);">${title}</h3>
        <p style="color: var(--color-text-secondary); margin-bottom: var(--space-6);">${message}</p>
        <button id="${btnId}" class="btn btn-primary" style="margin: 0 auto;">
          ${btnText}
        </button>
      </div>
    </div>
  `;
}

