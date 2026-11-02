/**
 * Chain Service Registry
 * Trả về MockChainAdapter hoặc Web3ChainAdapter dựa trên biến ENV.APP_MODE duy nhất
 */

import { ENV } from '../../config/env.js';
import { mockChainAdapter } from './mockChain.adapter.js';
import { web3ChainAdapter } from './web3Chain.adapter.js';

export function getChainAdapter() {
  if (ENV.APP_MODE === 'live') {
    return web3ChainAdapter;
  }
  return mockChainAdapter;
}

export const chainAdapter = getChainAdapter();

