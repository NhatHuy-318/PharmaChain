/**
 * Example Environment Configuration
 * Sao chép file này sang env.js nếu muốn cấu hình môi trường tùy biến
 */

export const ENV = Object.freeze({
  APP_MODE: 'mock', // 'mock' | 'live'
  JSON_SERVER_URL: 'http://localhost:3001',
  CONTRACT_ADDRESS: '0x0000000000000000000000000000000000000000',
  DEPLOY_BLOCK: 0, // deployBlock trong deployments/rsk-testnet.json
  RPC_URL: 'https://public-node.testnet.rsk.co',
  LOGS_API_URL: 'https://rootstock-testnet.blockscout.com/api/v2', // public-node tắt eth_getLogs
  ABI_PATH: './abi/BatchRegistry.json',
  MOCK_DATA_PATH: './data',
  DEBUG: true,
});

