/**
 * Dev Bar Component
 * Thanh công cụ trợ giúp demo nhanh trong Mock Mode:
 * - Đổi nhanh giữa 6 vai trò demo (Admin, Manufacturer, Inspector, Importer, Receiver, Viewer)
 * - Khởi tạo lại dữ liệu mẫu mock data
 * Tuyệt đối không hiển thị khi APP_MODE === 'live'
 */

import { ENV } from '../config/env.js';
import { walletService, MOCK_ACCOUNTS } from '../services/wallet.service.js';
import { $ } from '../utils/dom.js';
import { showToast } from './toast.js';
import { showModal } from './modal.js';
import { Role } from '../constants/roles.js';

export function renderDevBar() {
  const mountEl = $('#dev-bar-mount');
  if (!mountEl) return;

  // Nếu là live mode, dọn sạch mount và không hiển thị
  if (ENV.APP_MODE !== 'mock') {
    mountEl.innerHTML = '';
    return;
  }

  const currentAddress = walletService.getAddress();

  mountEl.innerHTML = `
    <div class="dev-bar" role="toolbar" aria-label="Mock Demo Controls">
      <div class="dev-bar-left">
        <span class="dev-badge">Mock Mode</span>
        <span class="dev-label">Công cụ Demo (Chuyển đổi vai trò & dữ liệu mô phỏng):</span>
      </div>
      <div class="dev-bar-actions">
        <label for="dev-role-select" class="dev-label">Chọn vai trò demo:</label>
        <select id="dev-role-select" class="dev-role-select">
          ${MOCK_ACCOUNTS.map(
            (acc) => `
            <option value="${acc.address}" ${acc.address.toLowerCase() === (currentAddress || '').toLowerCase() ? 'selected' : ''}>
              ${acc.orgName} (${acc.address.substring(0, 6)}...${acc.address.substring(38)})
            </option>
          `
          ).join('')}
        </select>

        <button id="dev-reset-btn" class="dev-reset-btn" title="Đặt lại dữ liệu mô phỏng về trạng thái ban đầu">
          ↺ Reset Mock Data
        </button>
      </div>
    </div>
  `;

  // Xử lý đổi role
  const select = $('#dev-role-select');
  if (select) {
    select.addEventListener('change', (e) => {
      const selectedAddress = e.target.value;
      walletService.setMockAccount(selectedAddress);
      showToast(`Đã chuyển sang vai trò: ${walletService.getOrgName()}`, 'info');
      setTimeout(() => window.location.reload(), 300);
    });
  }

  // Xử lý reset dữ liệu
  const resetBtn = $('#dev-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      showModal({
        title: 'Đặt lại dữ liệu mô phỏng?',
        content: 'Tất cả các lô hàng, giao dịch thử nghiệm và dữ liệu cục bộ trong localStorage sẽ được xóa và đặt lại về trạng thái mẫu ban đầu.',
        confirmText: 'Đặt lại ngay',
        isDestructive: true,
        onConfirm: () => {
          localStorage.removeItem('pharmachain_mock_batches');
          localStorage.removeItem('pharmachain_mock_events');
          localStorage.removeItem('pharmachain_mock_orgs');
          localStorage.removeItem('pharmachain_wallet');
          showToast('Đã đặt lại dữ liệu mô phỏng ban đầu!', 'success');
          setTimeout(() => window.location.reload(), 500);
        },
      });
    });
  }
}

