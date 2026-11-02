/**
 * PharmaChain Main Entrypoint
 * Khởi tạo ứng dụng DApp, nạp Navbar, Footer, DevBar và thiết lập môi trường
 */

import { renderNavbar } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderDevBar } from './components/devBar.js';
import { walletService } from './services/wallet.service.js';
import { ENV } from './config/env.js';

export function initApp(pageId = 'home') {
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Render Dev Bar (chỉ trong mock mode)
    renderDevBar();

    // 2. Render Header Navbar
    renderNavbar(pageId);

    // 3. Render Footer
    renderFooter();

    if (ENV.DEBUG) {
      console.log(`[PharmaChain] Đã khởi tạo trang [${pageId}] ở chế độ [${ENV.APP_MODE.toUpperCase()}]`);
      console.log(`[PharmaChain] Ví hiện tại:`, walletService.getAddress(), `| Role:`, walletService.getRole());
    }
  });
}

