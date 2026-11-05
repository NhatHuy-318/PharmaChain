/**
 * Application Environment Configuration
 * Biến APP_MODE duy nhất điều khiển chế độ chạy:
 * - 'mock': Chạy hoàn toàn với MockChainAdapter và MockDataAdapter (không cần MetaMask / testnet)
 * - 'live': Kết nối ví MetaMask thật và Smart Contract trên RSK Testnet
 */

export const ENV = Object.freeze({
  // 'mock' hoặc 'live'
  APP_MODE: 'live',

  // JSON Server metadata endpoint (khi dùng live/json-server)
  JSON_SERVER_URL: 'http://localhost:3001',

  // Địa chỉ smart contract BatchRegistry sau khi deploy lên RSK Testnet
  CONTRACT_ADDRESS: '0x0D007f0bfe4FB2AA306922C3EED9085B0128429e',

  // Khối chứa giao dịch deploy (deployBlock trong deployments/rsk-testnet.json), để đọc event không phải quét từ khối 0
  DEPLOY_BLOCK: 8261327,

  // RPC để người xem chưa cài MetaMask vẫn tra cứu được (chế độ live)
  RPC_URL: 'https://public-node.testnet.rsk.co',

  // Đọc event: public-node của RSK tắt eth_getLogs, nên đọc qua REST API v2 của Blockscout
  // (để trống thì đọc bằng eth_getLogs qua RPC_URL)
  LOGS_API_URL: 'https://rootstock-testnet.blockscout.com/api/v2',

  // Đường dẫn nạp file ABI và dữ liệu mock
  ABI_PATH: './abi/BatchRegistry.json',
  MOCK_DATA_PATH: './data',

  // Trạng thái debug
  DEBUG: true,
});

