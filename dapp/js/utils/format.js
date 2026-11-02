/**
 * Formatting & Validation Utilities
 */

/**
 * Rút gọn địa chỉ ví: 0x1234567890abcdef... -> 0x1234...cdef
 */
export function shortenAddress(address, chars = 4) {
  if (!address || typeof address !== 'string') return '';
  if (address.length <= chars * 2 + 2) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

/**
 * Rút gọn chuỗi SHA-256 hash
 */
export function shortenHash(hash, chars = 6) {
  if (!hash || typeof hash !== 'string') return '';
  if (hash.length <= chars * 2 + 2) return hash;
  return `${hash.substring(0, chars + 2)}...${hash.substring(hash.length - chars)}`;
}

/**
 * Định dạng Unix timestamp (giây) sang ngày giờ VN: dd/mm/yyyy hh:mm
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return '—';
  const ms = Number(timestamp) < 1e11 ? Number(timestamp) * 1000 : Number(timestamp);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '—';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Định dạng Unix timestamp sang ngày VN: dd/mm/yyyy
 */
export function formatDate(timestamp) {
  if (!timestamp) return '—';
  const ms = Number(timestamp) < 1e11 ? Number(timestamp) * 1000 : Number(timestamp);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '—';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Chuẩn hóa số lô sang chữ hoa và kiểm tra quy chuẩn
 * Yêu cầu: A-Z, 0-9, - _ / . và tối đa 32 ký tự
 */
export function normalizeBatchNo(batchNo) {
  return String(batchNo || '').trim().toUpperCase();
}

export function isValidBatchNo(batchNo) {
  if (!batchNo || batchNo.length === 0 || batchNo.length > 32) return false;
  return /^[A-Z0-9\-_/.]{1,32}$/.test(batchNo);
}

/**
 * Kiểm tra địa chỉ ví Ethereum hợp lệ
 */
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Kiểm tra bytes32 hash (0x + 64 hex chars)
 */
export function isValidBytes32(hash) {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

