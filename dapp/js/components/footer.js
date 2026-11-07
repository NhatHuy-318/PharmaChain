/**
 * Footer Component
 * Render chân trang chuẩn hóa kèm tuyên bố trách nhiệm GMP bắt buộc
 */

import { i18n } from '../i18n/vi.js';
import { $ } from '../utils/dom.js';

export function renderFooter() {
  const mountEl = $('#app-footer-mount');
  if (!mountEl) return;

  mountEl.innerHTML = `
    <footer class="app-footer">
      <div class="container">
        <!-- Mandatory GMP Disclaimer -->
        <div class="footer-disclaimer-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" style="flex-shrink: 0;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p class="footer-disclaimer-text">
            <strong>Lưu ý quan trọng:</strong> ${i18n.app.disclaimer}
          </p>
        </div>

        <div class="footer-grid">
          <div>
            <div class="brand-title" style="font-size: 1.25rem;">Pharma<span style="color: var(--color-secondary-dark);">Chain</span></div>
            <p class="footer-brand-desc">
              Giải pháp học thuật ứng dụng công nghệ hợp đồng thông minh trên Rootstock (RSK) Testnet nhằm minh bạch hóa chuỗi cung ứng nguyên liệu dược phẩm và bảo đảm tính toàn vẹn hồ sơ kiểm nghiệm bằng hash SHA-256.
            </p>
          </div>

          <div>
            <h4 class="footer-heading">Cổng thông tin</h4>
            <ul class="footer-links">
              <li><a href="index.html">Trang chủ</a></li>
              <li><a href="search.html">Tra cứu & Truy xuất lô</a></li>
            </ul>
          </div>

          <div>
            <h4 class="footer-heading">Học phần</h4>
            <ul class="footer-links">
              <li><a href="https://github.com" target="_blank" rel="noopener">Báo cáo Đồ án Nhóm 5</a></li>
              <li><a href="https://explorer.testnet.rootstock.io" target="_blank" rel="noopener">RSK Testnet Explorer</a></li>
              <li><span>Môn học: Blockchain & Smart Contract</span></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <div>${i18n.app.copyright}</div>
          <div>Mạng: <strong>Rootstock (RSK) Testnet</strong> (Chain ID: 31)</div>
        </div>
      </div>
    </footer>
  `;
}

