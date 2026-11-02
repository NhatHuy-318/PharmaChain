/**
 * Batch Service
 * Tầng nghiệp vụ cốt lõi điều phối:
 * Form -> Validate -> Tính SHA-256 -> Gọi Chain Adapter -> Lưu Metadata Off-chain -> Đọc On-chain
 */

import { getChainAdapter } from './chain/index.js';
import { getDataAdapter } from './data/index.js';
import { HashService } from './hash.service.js';
import { BatchStatus, BatchStatusName, isTerminalStatus } from '../constants/batchStatus.js';
import { normalizeBatchNo, isValidBatchNo } from '../utils/format.js';

export class BatchService {
  constructor() {
    this.chain = getChainAdapter();
    this.data = getDataAdapter();
  }

  /**
   * Bước 1: Manufacturer đăng ký lô
   */
  async registerBatch({
    batchNo,
    materialName,
    mfgDate,
    expiryDate,
    storageConditions,
    importer,
    file,
    docHash,
    metadata = {},
  }) {
    // 1. Validate
    const cleanNo = normalizeBatchNo(batchNo);
    if (!isValidBatchNo(cleanNo)) {
      throw new Error('Số lô chỉ gồm chữ in hoa, số và các ký tự: - _ / . (tối đa 32 ký tự).');
    }

    // 2. Tính SHA-256 từ file nếu có
    let finalDocHash = docHash;
    if (file) {
      finalDocHash = await HashService.computeSHA256(file);
    }
    if (!finalDocHash) {
      throw new Error('Vui lòng chọn file hồ sơ COA để tính mã băm SHA-256.');
    }

    // 3. Ghi on-chain
    const batchId = await this.chain.registerBatch(
      cleanNo,
      materialName,
      mfgDate,
      expiryDate,
      storageConditions,
      importer,
      finalDocHash
    );

    // 4. Lưu metadata off-chain (sau khi on-chain thành công)
    try {
      await this.data.saveBatchMetadata(batchId, {
        batchNo: cleanNo,
        materialName,
        storageConditions,
        docHash: finalDocHash,
        ...metadata,
      });
    } catch (metaErr) {
      console.warn('Giao dịch on-chain thành công nhưng lưu metadata off-chain bị lỗi:', metaErr);
    }

    return { batchId, docHash: finalDocHash };
  }

  /**
   * Bước 2: Inspector ghi kết quả kiểm nghiệm
   */
  async recordTestResult({ batchId, passed, reportNo, testDate, file, docHash, metadata = {} }) {
    let finalDocHash = docHash;
    if (file) {
      finalDocHash = await HashService.computeSHA256(file);
    }
    if (!finalDocHash) {
      throw new Error('Vui lòng chọn phiếu kiểm nghiệm để tính mã băm SHA-256.');
    }

    await this.chain.recordTestResult(batchId, passed, reportNo, testDate, finalDocHash);

    try {
      await this.data.saveBatchMetadata(batchId, {
        testReportNo: reportNo,
        testPassed: passed,
        testDate,
        testDocHash: finalDocHash,
        ...metadata,
      });
    } catch (e) {
      console.warn('Lỗi lưu metadata kiểm nghiệm:', e);
    }

    return { success: true, docHash: finalDocHash };
  }

  /**
   * Bước 3: Importer ghi thông tin nhập khẩu
   */
  async recordImport({ batchId, originCountry, customsDeclNo, importDate, file, docHash, metadata = {} }) {
    let finalDocHash = docHash;
    if (file) {
      finalDocHash = await HashService.computeSHA256(file);
    }
    if (!finalDocHash) {
      throw new Error('Vui lòng chọn tờ khai hải quan để tính mã băm SHA-256.');
    }

    await this.chain.recordImport(batchId, originCountry, customsDeclNo, importDate, finalDocHash);

    try {
      await this.data.saveBatchMetadata(batchId, {
        originCountry,
        customsDeclNo,
        importDate,
        importDocHash: finalDocHash,
        ...metadata,
      });
    } catch (e) {
      console.warn('Lỗi lưu metadata nhập khẩu:', e);
    }

    return { success: true, docHash: finalDocHash };
  }

  /**
   * Bước 4: Importer khởi tạo chuyển giao
   */
  async initiateTransfer({ batchId, receiver, file, docHash, metadata = {} }) {
    let finalDocHash = docHash;
    if (file) {
      finalDocHash = await HashService.computeSHA256(file);
    }
    if (!finalDocHash) {
      throw new Error('Vui lòng chọn phiếu giao hàng để tính mã băm SHA-256.');
    }

    await this.chain.initiateTransfer(batchId, receiver, finalDocHash);

    try {
      await this.data.saveBatchMetadata(batchId, {
        designatedReceiver: receiver,
        transferDocHash: finalDocHash,
        ...metadata,
      });
    } catch (e) {
      console.warn('Lỗi lưu metadata chuyển giao:', e);
    }

    return { success: true, docHash: finalDocHash };
  }

  /**
   * Bước 5: Receiver xác nhận tiếp nhận hàng
   */
  async confirmTransfer({ batchId, file, docHash, metadata = {} }) {
    let finalDocHash = docHash;
    if (file) {
      finalDocHash = await HashService.computeSHA256(file);
    }
    if (!finalDocHash) {
      throw new Error('Vui lòng chọn biên bản nhận hàng để tính mã băm SHA-256.');
    }

    await this.chain.confirmTransfer(batchId, finalDocHash);

    try {
      await this.data.saveBatchMetadata(batchId, {
        receivedDocHash: finalDocHash,
        ...metadata,
      });
    } catch (e) {
      console.warn('Lỗi lưu metadata tiếp nhận:', e);
    }

    return { success: true, docHash: finalDocHash };
  }

  /**
   * Ngoại lệ: Importer hủy chuyển giao
   */
  async cancelTransfer({ batchId, file, docHash, reason = '' }) {
    let finalDocHash = docHash;
    if (file) {
      finalDocHash = await HashService.computeSHA256(file);
    } else if (!finalDocHash) {
      finalDocHash = await HashService.computeSHA256(reason || 'Biên bản hủy chuyển giao');
    }

    await this.chain.cancelTransfer(batchId, finalDocHash);

    try {
      await this.data.saveBatchMetadata(batchId, {
        cancelReason: reason,
        cancelDocHash: finalDocHash,
      });
    } catch (e) {
      console.warn('Lỗi lưu metadata hủy chuyển giao:', e);
    }

    return { success: true, docHash: finalDocHash };
  }

  /**
   * Bước 6: Receiver kiểm tra chất lượng tại nơi nhận (QC)
   */
  async recordReceivingInspection({ batchId, passed, reportNo, inspectDate, file, docHash, metadata = {} }) {
    let finalDocHash = docHash;
    if (file) {
      finalDocHash = await HashService.computeSHA256(file);
    }
    if (!finalDocHash) {
      throw new Error('Vui lòng chọn phiếu kiểm tra QC để tính mã băm SHA-256.');
    }

    await this.chain.recordReceivingInspection(batchId, passed, reportNo, inspectDate, finalDocHash);

    try {
      await this.data.saveBatchMetadata(batchId, {
        qcReportNo: reportNo,
        qcPassed: passed,
        inspectDate,
        qcDocHash: finalDocHash,
        ...metadata,
      });
    } catch (e) {
      console.warn('Lỗi lưu metadata kiểm tra QC:', e);
    }

    return { success: true, docHash: finalDocHash };
  }

  /**
   * Đọc chi tiết lô hoàn chỉnh (ghép on-chain + off-chain + events)
   */
  async getBatchDetail(batchId) {
    const bId = Number(batchId);

    // 1. Đọc dữ liệu on-chain chuẩn
    const onChainBatch = await this.chain.getBatch(bId);
    const isExpired = await this.chain.isExpired(bId);
    const events = await this.chain.getBatchEvents(bId);

    // 2. Đọc metadata off-chain
    const metadata = (await this.data.getBatchMetadata(bId)) || {};

    // 3. Tra cứu tên các tổ chức liên quan
    const [mfgOrg, impOrg, recOrg] = await Promise.all([
      onChainBatch.manufacturer ? this.data.getOrganization(onChainBatch.manufacturer) : null,
      onChainBatch.importer ? this.data.getOrganization(onChainBatch.importer) : null,
      onChainBatch.receiver && onChainBatch.receiver !== '0x0000000000000000000000000000000000000000'
        ? this.data.getOrganization(onChainBatch.receiver)
        : null,
    ]);

    return {
      ...onChainBatch,
      statusName: BatchStatusName[onChainBatch.status] || 'Unknown',
      isTerminal: isTerminalStatus(onChainBatch.status),
      isExpired,
      metadata,
      events,
      organizations: {
        manufacturer: mfgOrg,
        importer: impOrg,
        receiver: recOrg,
      },
    };
  }

  /**
   * Tra cứu lô theo ID hoặc Số lô
   */
  async findBatch(query) {
    if (!query) return null;
    const clean = String(query).trim();

    // 1. Thử nếu là số batchId
    if (/^\d+$/.test(clean)) {
      try {
        return await this.getBatchDetail(Number(clean));
      } catch (e) {
        // Tiếp tục thử tìm theo batchNo
      }
    }

    // 2. Thử tìm theo batchNo qua contract
    const cleanNo = normalizeBatchNo(clean);
    const bId = await this.chain.getBatchIdByNo(cleanNo);
    if (bId > 0) {
      return await this.getBatchDetail(bId);
    }

    // 3. Thử tìm qua metadata off-chain
    const metaMatches = await this.data.searchBatches(clean);
    if (metaMatches.length > 0) {
      return await this.getBatchDetail(metaMatches[0].batchId);
    }

    return null;
  }
}

export const batchService = new BatchService();

