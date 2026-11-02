/**
 * Navbar Component
 * Hiển thị thanh điều hướng thống nhất, trạng thái ví, vai trò và chuyển mạng
 */

import { walletService } from '../services/wallet.service.js';
import { Role, RolePortal } from '../constants/roles.js';
import { i18n } from '../i18n/vi.js';
import { shortenAddress } from '../utils/format.js';
import { eventBus } from '../utils/eventEmitter.js';
import { $, createElement } from '../utils/dom.js';
import { showToast } from './toast.js';

export function renderNavbar(activePage = 'home') {
  const mountEl = $('#app-navbar-mount');
  if (!mountEl) return;

  const currentRole = walletService.getRole();
  const address = walletService.getAddress();
  const isConnected = walletService.isWalletConnected();
  const isCorrectNet = walletService.isCorrectNetwork();

  // Tạo navigation links
  const navItems = [
    { id: 'home', href: 'index.html', label: i18n.nav.home },
    { id: 'search', href: 'search.html', label: i18n.nav.search },
    { id: 'trace', href: 'trace.html', label: i18n.nav.trace },
  ];

  // Nếu đã kết nối và có role nghiệp vụ, bổ sung link portal tương ứng
  if (isConnected && currentRole && RolePortal[currentRole]) {
    const roleKey = Object.keys(Role).find((k) => Role[k] === currentRole)?.toLowerCase();
    const roleLabel = i18n.nav[roleKey] || 'Cổng nghiệp vụ';
    navItems.push({
      id: roleKey,
      href: RolePortal[currentRole],
      label: roleLabel,
      isRolePortal: true,
    });
  }

  const roleNameVi = i18n.roles[currentRole] || i18n.roles.Viewer;

  mountEl.innerHTML = `
    <header class="app-navbar">
      <div class="container navbar-container">
        <!-- Brand -->
        <a href="index.html" class="navbar-brand">
          <div class="brand-icon-wrapper" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <div>
            <div class="brand-title">Pharma<span>Chain</span></div>
          </div>
          <span class="brand-badge">RSK Testnet</span>
        </a>

        <!-- Desktop Navigation -->
        <nav>
          <ul class="navbar-menu" id="nav-menu">
            ${navItems
              .map(
                (item) => `
                <li>
                  <a href="${item.href}" class="nav-link ${activePage === item.id ? 'active' : ''} ${item.isRolePortal ? 'fw-semibold text-primary' : ''}">
                    ${item.label}
                  </a>
                </li>
              `
              )
              .join('')}
          </ul>
        </nav>

        <!-- Actions -->
        <div class="navbar-actions">
          <!-- Network Tag -->
          <div class="network-tag ${!isCorrectNet ? 'network-warning' : ''}" title="${isCorrectNet ? 'RSK Testnet (Chain ID 31)' : 'Sai mạng!'}">
            <span class="indicator-dot"></span>
            <span>${isCorrectNet ? 'RSK Testnet' : i18n.nav.wrongNetwork}</span>
          </div>

          <!-- Wallet / Role Info -->
          ${
            isConnected && address
              ? `
                <div class="wallet-connected-pill">
                  <span class="badge badge-role" title="${roleNameVi}">
                    ${roleNameVi.split('(')[0].trim()}
                  </span>
                  <span class="wallet-address" title="${address}">
                    ${shortenAddress(address)}
                  </span>
                  <button id="btn-disconnect-wallet" class="btn btn-ghost btn-sm" title="${i18n.nav.disconnect}" style="padding: 2px 6px; font-size: 11px;">
                    ✕
                  </button>
                </div>
              `
              : `
                <button id="btn-connect-wallet" class="btn btn-primary btn-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                    <line x1="2" y1="10" x2="22" y2="10"></line>
                  </svg>
                  ${i18n.nav.connectWallet}
                </button>
              `
          }

          <!-- Mobile Toggle -->
          <button class="mobile-toggle" id="mobile-menu-toggle" aria-label="Menu" aria-expanded="false">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </header>
  `;

  // Gắn sự kiện kết nối ví
  const connectBtn = $('#btn-connect-wallet');
  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      try {
        await walletService.connect();
        showToast(i18n.wallet.connected, 'success');
        renderNavbar(activePage);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Gắn sự kiện ngắt kết nối
  const disconnectBtn = $('#btn-disconnect-wallet');
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      walletService.disconnect();
      showToast(i18n.wallet.disconnected, 'info');
      renderNavbar(activePage);
    });
  }

  // Mobile menu toggle
  const toggleBtn = $('#mobile-menu-toggle');
  const menu = $('#nav-menu');
  if (toggleBtn && menu) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('open');
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
    });
  }
}

// Lắng nghe thay đổi trạng thái ví để render lại navbar tự động
eventBus.on('wallet:connected', () => renderNavbar());
eventBus.on('wallet:disconnected', () => renderNavbar());
eventBus.on('wallet:changed', () => renderNavbar());
eventBus.on('network:changed', () => renderNavbar());

