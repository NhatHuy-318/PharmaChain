/**
 * Application Environment Configuration
 * Biến APP_MODE duy nhất điều khiển chế độ chạy:
 * - 'mock': Chạy hoàn toàn với MockChainAdapter và MockDataAdapter (không cần MetaMask / testnet)
 * - 'live': Kết nối ví MetaMask thật và Smart Contract trên RSK Testnet
 */

export const ENV = Object.freeze({
  // 'mock' hoặc 'live'
  APP_MODE: 'mock',

  // JSON Server metadata endpoint (khi dùng live/json-server)
  JSON_SERVER_URL: 'http://localhost:3001',

  // Địa chỉ smart contract BatchRegistry sau khi deploy lên RSK Testnet
  CONTRACT_ADDRESS: '0x0000000000000000000000000000000000000000',

  // Đường dẫn nạp file ABI và dữ liệu mock
  ABI_PATH: './abi/BatchRegistry.json',
  MOCK_DATA_PATH: './data',

  // Trạng thái debug
  DEBUG: true,
});

