/**
 * Smart Contract Configuration
 */

import { ENV } from './env.js';

export const CONTRACT_CONFIG = Object.freeze({
  address: ENV.CONTRACT_ADDRESS,
  abiPath: ENV.ABI_PATH,
  defaultGas: 3000000,
});

let cachedAbi = null;

export async function loadContractAbi() {
  if (cachedAbi) return cachedAbi;
  try {
    const res = await fetch(CONTRACT_CONFIG.abiPath);
    if (!res.ok) {
      throw new Error(`Không thể nạp file ABI từ ${CONTRACT_CONFIG.abiPath} (HTTP ${res.status})`);
    }
    cachedAbi = await res.json();
    return cachedAbi;
  } catch (err) {
    console.error('Lỗi nạp ABI:', err);
    throw err;
  }
}

