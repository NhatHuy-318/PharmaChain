/**
 * Wallet Service
 * Cung cấp tầng trừu tượng quản lý kết nối ví cho cả Mock Mode và Live Mode (MetaMask).
 */

import { ENV } from '../config/env.js';
import { RSK_TESTNET_CONFIG, isRskTestnet } from '../config/network.js';
import { Role, RoleName } from '../constants/roles.js';
import { eventBus } from '../utils/eventEmitter.js';
import { i18n } from '../i18n/vi.js';
import { web3ChainAdapter } from './chain/web3Chain.adapter.js';

// Danh sách ví mẫu mặc định cho Mock Mode
export const MOCK_ACCOUNTS = Object.freeze([
  {
    address: '0x1111111111111111111111111111111111111111',
    role: Role.Admin,
    orgName: 'Cơ quan Quản lý Dược phẩm (Admin)',
  },
  {
    address: '0x2222222222222222222222222222222222222222',
    role: Role.Manufacturer,
    orgName: 'Dược Hậu Giang Pharma (Manufacturer)',
  },
  {
    address: '0x3333333333333333333333333333333333333333',
    role: Role.Inspector,
    orgName: 'Viện Kiểm nghiệm Thuốc TP.HCM (Inspector)',
  },
  {
    address: '0x4444444444444444444444444444444444444444',
    role: Role.Importer,
    orgName: 'Tổng Công ty Dược Việt Nam - Vinapharm (Importer)',
  },
  {
    address: '0x5555555555555555555555555555555555555555',
    role: Role.Receiver,
    orgName: 'Nhà máy Dược phẩm Delta (Receiver)',
  },
  {
    address: '0x9999999999999999999999999999999999999999',
    role: Role.None,
    orgName: 'Người dùng Khách xem (Viewer / Không có vai trò on-chain)',
  },
]);

class WalletService {
  constructor() {
    this.address = null;
    this.role = Role.None;
    this.chainId = null;
    this.isConnected = false;
    this.orgName = '';

    // Khởi tạo trạng thái ban đầu từ localStorage nếu có
    this._restoreSession();
    if (ENV.APP_MODE === 'live' && typeof window !== 'undefined' && window.ethereum) {
      this._syncLiveSession();
    }
  }

  /**
   * Live mode: vai trò và tên đơn vị luôn đọc từ contract (event RoleGranted),
   * không tin giá trị cũ trong localStorage vì Admin có thể đã cấp/thu hồi quyền.
   */
  async _loadOnChainProfile() {
    try {
      this.role = await web3ChainAdapter.getRole(this.address);
    } catch (err) {
      console.warn('Không đọc được vai trò on-chain (kiểm tra mạng và CONTRACT_ADDRESS):', err);
      this.role = Role.None;
    }
    // Tên đơn vị đọc từ event (qua Blockscout); lỗi ở đây không được làm mất vai trò đã đọc đúng
    try {
      this.orgName = this.role ? await web3ChainAdapter.getOrgName(this.address) : '';
    } catch (err) {
      console.warn('Không đọc được tên đơn vị từ event RoleGranted:', err);
      this.orgName = '';
    }
  }

  /** Khi mở trang: đối chiếu phiên đã lưu với ví MetaMask hiện tại, lệch thì cập nhật và tải lại trang */
  async _syncLiveSession() {
    this._setupMetaMaskListeners();
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (!accounts.length) {
      if (this.address) this.disconnect();
      return;
    }
    // Có cả chainId: đổi mạng lúc trang đang đóng thì thanh điều hướng vẫn phải vẽ lại theo mạng mới
    const snapshot = () => JSON.stringify([this.address, this.role, this.orgName, this.chainId]);
    const before = snapshot();
    this.address = accounts[0].toLowerCase();
    this.chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16);
    this.isConnected = true;
    await this._loadOnChainProfile();
    this._saveSession();
    if (snapshot() !== before) {
      window.location.reload();
    }
  }

  _restoreSession() {
    if (typeof localStorage === 'undefined') {
      if (ENV.APP_MODE === 'mock') {
        const defaultAcc = MOCK_ACCOUNTS[1];
        this.address = defaultAcc.address;
        this.role = defaultAcc.role;
        this.orgName = defaultAcc.orgName;
        this.chainId = RSK_TESTNET_CONFIG.chainId;
        this.isConnected = true;
      }
      return;
    }
    const saved = localStorage.getItem('pharmachain_wallet');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.address = parsed.address;
        this.role = parsed.role ?? Role.None;
        this.orgName = parsed.orgName || '';
        this.chainId = parsed.chainId || (ENV.APP_MODE === 'mock' ? RSK_TESTNET_CONFIG.chainId : null);
        this.isConnected = Boolean(this.address);
      } catch (e) {
        localStorage.removeItem('pharmachain_wallet');
      }
    } else if (ENV.APP_MODE === 'mock') {
      // Mặc định nạp Manufacturer để trải nghiệm luồng tạo lô dễ dàng
      const defaultAcc = MOCK_ACCOUNTS[1];
      this.address = defaultAcc.address;
      this.role = defaultAcc.role;
      this.orgName = defaultAcc.orgName;
      this.chainId = RSK_TESTNET_CONFIG.chainId;
      this.isConnected = true;
      this._saveSession();
    }
  }

  _saveSession() {
    if (typeof localStorage === 'undefined') return;
    if (this.isConnected && this.address) {
      localStorage.setItem(
        'pharmachain_wallet',
        JSON.stringify({
          address: this.address,
          role: this.role,
          orgName: this.orgName,
          chainId: this.chainId,
        })
      );
    } else {
      localStorage.removeItem('pharmachain_wallet');
    }
  }

  async connect() {
    if (ENV.APP_MODE === 'mock') {
      // Trong mock mode, nếu chưa kết nối thì chọn tài khoản đầu tiên
      if (!this.address) {
        const acc = MOCK_ACCOUNTS[1]; // Manufacturer
        this.address = acc.address;
        this.role = acc.role;
        this.orgName = acc.orgName;
        this.chainId = RSK_TESTNET_CONFIG.chainId;
        this.isConnected = true;
        this._saveSession();
      }
      eventBus.emit('wallet:connected', {
        address: this.address,
        role: this.role,
        chainId: this.chainId,
        orgName: this.orgName,
      });
      return { address: this.address, role: this.role, chainId: this.chainId };
    }

    // Live mode với MetaMask
    if (typeof window.ethereum === 'undefined') {
      throw new Error(i18n.wallet.notInstalled);
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const rawChainId = await window.ethereum.request({ method: 'eth_chainId' });
      this.chainId = parseInt(rawChainId, 16);
      this.address = accounts[0].toLowerCase();
      this.isConnected = true;
      await this._loadOnChainProfile();

      this._setupMetaMaskListeners();
      this._saveSession();

      eventBus.emit('wallet:connected', {
        address: this.address,
        role: this.role,
        chainId: this.chainId,
        orgName: this.orgName,
      });

      return { address: this.address, role: this.role, chainId: this.chainId };
    } catch (err) {
      if (err.code === 4001) {
        throw new Error(i18n.wallet.userRejected);
      }
      throw err;
    }
  }

  disconnect() {
    this.address = null;
    this.role = Role.None;
    this.orgName = '';
    this.isConnected = false;
    this._saveSession();

    eventBus.emit('wallet:disconnected', null);
  }

  /**
   * Đổi tài khoản demo trong Mock Mode
   */
  setMockAccount(addressOrRole) {
    if (ENV.APP_MODE !== 'mock') return;
    const target = MOCK_ACCOUNTS.find(
      (a) =>
        a.address.toLowerCase() === String(addressOrRole).toLowerCase() ||
        a.role === Number(addressOrRole)
    );
    if (target) {
      this.address = target.address;
      this.role = target.role;
      this.orgName = target.orgName;
      this.chainId = RSK_TESTNET_CONFIG.chainId;
      this.isConnected = true;
      this._saveSession();

      eventBus.emit('wallet:changed', {
        address: this.address,
        role: this.role,
        chainId: this.chainId,
        orgName: this.orgName,
      });
    }
  }

  async switchNetwork() {
    if (ENV.APP_MODE === 'mock') {
      this.chainId = RSK_TESTNET_CONFIG.chainId;
      eventBus.emit('network:changed', { chainId: this.chainId });
      return;
    }

    if (typeof window.ethereum === 'undefined') return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: RSK_TESTNET_CONFIG.chainIdHex }],
      });
    } catch (switchError) {
      // Error code 4902: Chain chưa được add vào ví
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: RSK_TESTNET_CONFIG.chainIdHex,
                chainName: RSK_TESTNET_CONFIG.chainName,
                rpcUrls: RSK_TESTNET_CONFIG.rpcUrls,
                nativeCurrency: RSK_TESTNET_CONFIG.nativeCurrency,
                blockExplorerUrls: RSK_TESTNET_CONFIG.blockExplorerUrls,
              },
            ],
          });
        } catch (addError) {
          throw new Error(i18n.wallet.switchFailed);
        }
      } else {
        throw new Error(i18n.wallet.switchFailed);
      }
    }
  }

  _setupMetaMaskListeners() {
    if (typeof window.ethereum === 'undefined' || this._listenersAttached) return;
    this._listenersAttached = true;

    // Đổi ví hoặc đổi mạng thì tải lại trang để role guard và dữ liệu của trang chạy lại theo ví mới
    window.ethereum.on('accountsChanged', async (accounts) => {
      if (accounts.length === 0) {
        this.disconnect();
      } else {
        this.address = accounts[0].toLowerCase();
        await this._loadOnChainProfile();
        this._saveSession();
      }
      window.location.reload();
    });

    window.ethereum.on('chainChanged', (rawChainId) => {
      this.chainId = parseInt(rawChainId, 16);
      this._saveSession();
      window.location.reload();
    });
  }

  getAddress() { return this.address; }
  getRole() { return this.role; }
  getOrgName() { return this.orgName; }
  getChainId() { return this.chainId; }
  isWalletConnected() { return this.isConnected; }
  isCorrectNetwork() { return isRskTestnet(this.chainId); }
}

export const walletService = new WalletService();

