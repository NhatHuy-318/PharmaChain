/**
 * Hash Service
 * Tính toán hash SHA-256 bảo đảm tính toàn vẹn byte của tài liệu hồ sơ
 * Sử dụng Web Crypto API trong trình duyệt (hoặc node:crypto trong môi trường kiểm thử)
 */

import { isValidBytes32 } from '../utils/format.js';
import { i18n } from '../i18n/vi.js';

export class HashService {
  /**
   * Tính hash SHA-256 từ File, Blob, ArrayBuffer hoặc String
   * Trả về định dạng bytes32: "0x" + 64 ký tự hex chữ thường
   */
  static async computeSHA256(input) {
    if (!input) {
      throw new Error('Đầu vào băm rỗng hoặc không hợp lệ.');
    }

    let buffer;

    // Trình duyệt File hoặc Blob
    if (typeof Blob !== 'undefined' && input instanceof Blob) {
      buffer = await input.arrayBuffer();
    }
    // ArrayBuffer hoặc TypedArray
    else if (input instanceof ArrayBuffer) {
      buffer = input;
    } else if (ArrayBuffer.isView(input)) {
      buffer = input.buffer;
    }
    // Chuỗi văn bản
    else if (typeof input === 'string') {
      const encoder = new TextEncoder();
      buffer = encoder.encode(input).buffer;
    } else {
      throw new Error('Kiểu dữ liệu đầu vào không được hỗ trợ để tính SHA-256.');
    }

    // Kiểm tra Web Crypto API (Browser)
    if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      return HashService._bufferToHex(hashBuffer);
    }

    // Fallback cho môi trường Node.js (nếu chạy test runner)
    try {
      const nodeCrypto = await import('crypto');
      const hash = nodeCrypto.createHash('sha256');
      hash.update(Buffer.from(buffer));
      return '0x' + hash.digest('hex');
    } catch (e) {
      throw new Error('Môi trường hiện tại không hỗ trợ Web Crypto API.');
    }
  }

  /**
   * So khớp file tải lên với mã docHash đã lưu trên blockchain
   * @param {File|Blob|string} file Tài liệu người dùng chọn
   * @param {string} expectedHash Mã docHash lấy từ event blockchain
   * @returns {Promise<{ match: boolean, calculatedHash: string, expectedHash: string, message: string }>}
   */
  static async verifyFileHash(file, expectedHash) {
    if (!expectedHash || !isValidBytes32(expectedHash)) {
      throw new Error('Hash kỳ vọng (on-chain hash) không đúng định dạng bytes32.');
    }

    const calculatedHash = await HashService.computeSHA256(file);
    const match = calculatedHash.toLowerCase() === expectedHash.toLowerCase();

    return {
      match,
      calculatedHash,
      expectedHash,
      message: match ? i18n.hash.match : i18n.hash.mismatch,
      disclaimer: i18n.hash.disclaimer,
    };
  }

  static _bufferToHex(buffer) {
    const byteArray = new Uint8Array(buffer);
    const hexParts = [];
    for (let i = 0; i < byteArray.length; i++) {
      const hex = byteArray[i].toString(16).padStart(2, '0');
      hexParts.push(hex);
    }
    return '0x' + hexParts.join('');
  }
}

