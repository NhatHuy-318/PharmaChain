/**
 * Rootstock (RSK) Testnet Configuration
 * Chain ID: 31 (0x1f)
 */

export const RSK_TESTNET_CONFIG = Object.freeze({
  chainId: 31,
  chainIdHex: '0x1f',
  chainName: 'Rootstock Testnet',
  nativeCurrency: {
    name: 'Test Rootstock Bitcoin',
    symbol: 'tRBTC',
    decimals: 18,
  },
  rpcUrls: ['https://public-node.testnet.rsk.co'],
  blockExplorerUrls: ['https://explorer.testnet.rootstock.io'],
});

export const isRskTestnet = (chainId) => {
  if (!chainId) return false;
  const num = typeof chainId === 'string' && chainId.startsWith('0x')
    ? parseInt(chainId, 16)
    : Number(chainId);
  return num === RSK_TESTNET_CONFIG.chainId;
};

