/**
 * Data Service Registry
 * Trả về MockDataAdapter hoặc JsonServerDataAdapter
 */

import { ENV } from '../../config/env.js';
import { mockDataAdapter } from './mockData.adapter.js';
import { jsonServerDataAdapter } from './jsonServerData.adapter.js';

export function getDataAdapter() {
  if (ENV.APP_MODE === 'live') {
    return jsonServerDataAdapter;
  }
  return mockDataAdapter;
}

export const dataAdapter = getDataAdapter();

