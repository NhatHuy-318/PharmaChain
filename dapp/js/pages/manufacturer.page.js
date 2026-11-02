/**
 * Manufacturer Page Logic (M2-1 Spec)
 * Nhà sản xuất đăng ký lô nguyên liệu mới và quản lý danh sách lô của mình
 */

import { initApp } from '../main.js';
import { enforceRoleGuard } from '../guards/role.guard.js';
import { Role } from '../constants/roles.js';
import { BatchStatusName } from '../constants/batchStatus.js';
import { walletService } from '../services/wallet.service.js';
import { batchService } from '../services/batch.service.js';
import { getChainAdapter } from '../services/chain/index.js';
import { getDataAdapter } from '../services/data/index.js';
import { HashService } from '../services/hash.service.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { translateError } from '../i18n/vi.js';
import { formatDate, shortenAddress, normalizeBatchNo, isValidBatchNo } from '../utils/format.js';
import { renderQRCodeToCanvas, downloadQRCode } from '../utils/qr.js';
import { $, $$ } from '../utils/dom.js';

export async function initManufacturerPage() {
  initApp('manufacturer');

  const isAuthorized = enforceRoleGuard(Role.Manufacturer, 'Nhà sản xuất (Manufacturer)');
  if (!isAuthorized) return;

  const chain = getChainAdapter();
  const data = getDataAdapter();

  const registerForm = $('#mfg-register-form');
  const myBatchesTable = $('#mfg-batches-table-body');
  const importerSelect = $('#mfg-importer-select');
  const fileInput = $('#mfg-coa-file');
  const hashPreview = $('#mfg-coa-hash-preview');
  let computedCoaHash = null;
  let selectedCoaFile = null;

  // Điền danh sách Importer hợp lệ vào dropdown
  try {
    const orgs = await data.getOrganizations();
    const importers = orgs.filter((o) => o.role === Role.Importer);
    if (importerSelect) {
      if (importers.length > 0) {
        importerSelect.innerHTML = importers
          .map((imp) => `<option value="${imp.address}">${imp.name} (${shortenAddress(imp.address)})</option>`)
          .join('');
      } else {
        importerSelect.innerHTML = '<option value="0x4444444444444444444444444444444444444444">Vinapharm (0x4444...4444)</option>';
      }
    }
  } catch (err) {
    console.error('Lỗi nạp Importers:', err);
  }

  // Tải file COA và tự động tính SHA-256
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        selectedCoaFile = file;
        try {
          showToast('Đang tính mã băm SHA-256 của tài liệu COA...', 'info');
          computedCoaHash = await HashService.computeSHA256(file);
          if (hashPreview) {
            hashPreview.textContent = `Mã băm COA: ${computedCoaHash}`;
            hashPreview.classList.add('active');
          }
          showToast('Tính toán mã băm SHA-256 thành công!', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  }

  // Nạp danh sách lô của Manufacturer
  async function loadMyBatches() {
    if (!myBatchesTable) return;
    try {
      const currentAddr = walletService.getAddress()?.toLowerCase();
      const count = await chain.getBatchCount();
      const batches = await chain.getBatches(1, count);

      const myBatches = batches.filter(
        (b) => b.manufacturer.toLowerCase() === currentAddr
      );

      if (myBatches.length === 0) {
        myBatchesTable.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--color-text-muted);">Bạn chưa đăng ký lô nguyên liệu nào.</td></tr>';
        return;
      }

      myBatchesTable.innerHTML = (
        await Promise.all(
          myBatches.reverse().map(async (b) => {
            const meta = (await data.getBatchMetadata(b.id)) || {};
            const impOrg = await data.getOrganization(b.importer);
            const statusKey = BatchStatusName[b.status]?.toLowerCase();
            const isExp = await chain.isExpired(b.id);

            return `
              <tr>
                <td style="font-family: var(--font-family-mono); font-weight: var(--font-weight-bold); color: var(--color-primary);">
                  #${b.id}
                </td>
                <td style="font-family: var(--font-family-mono); font-weight: var(--font-weight-semibold);">
                  ${b.batchNo}
                </td>
                <td style="font-weight: var(--font-weight-bold); color: var(--color-primary-dark);">
                  ${meta.materialName || b.materialName || 'Nguyên liệu'}
                </td>
                <td>
                  <span class="badge badge-status-${statusKey}">
                    ${BatchStatusName[b.status]}
                  </span>
                </td>
                <td>${impOrg?.name ? impOrg.name.split('(')[0] : shortenAddress(b.importer)}</td>
                <td class="${isExp ? 'text-danger fw-bold' : ''}">
                  ${formatDate(b.expiryDate)} ${isExp ? '⚠️' : ''}
                </td>
                <td style="text-align: right;">
                  <a href="trace.html?batchId=${b.id}" class="btn btn-primary btn-sm">
                    Xem Trace &rarr;
                  </a>
                </td>
              </tr>
            `;
          })
        )
      ).join('');
    } catch (err) {
      console.error('Lỗi khi nạp danh sách My Batches:', err);
    }
  }

  // Xử lý gửi Form Đăng ký
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const rawBatchNo = $('#mfg-batch-no')?.value;
      const cleanBatchNo = normalizeBatchNo(rawBatchNo);
      const materialName = $('#mfg-material-name')?.value.trim();
      const mfgDateVal = $('#mfg-date')?.value;
      const expiryDateVal = $('#mfg-expiry-date')?.value;
      const storageConditions = $('#mfg-storage')?.value.trim();
      const importer = importerSelect?.value;

      // Metadata off-chain
      const quantity = Number($('#mfg-quantity')?.value) || 0;
      const unit = $('#mfg-unit')?.value || 'kg';
      const packageCount = Number($('#mfg-package-count')?.value) || 0;
      const countryOfOrigin = $('#mfg-country')?.value.trim() || '';
      const notes = $('#mfg-notes')?.value.trim() || '';

      // P1 Optional fields (để null nếu không nhập)
      const materialCode = $('#mfg-material-code')?.value.trim() || null;
      const grade = $('#mfg-grade')?.value.trim() || null;
      const pharmacopoeiaStandard = $('#mfg-standard')?.value.trim() || null;
      const productSpecRef = $('#mfg-spec-ref')?.value.trim() || null;
      const packageType = $('#mfg-package-type')?.value.trim() || null;
      const sealNumber = $('#mfg-seal-number')?.value.trim() || null;
      const netWeight = $('#mfg-net-weight')?.value ? Number($('#mfg-net-weight').value) : null;
      const grossWeight = $('#mfg-gross-weight')?.value ? Number($('#mfg-gross-weight').value) : null;
      const packagingSpec = packageType ? `${packageCount} ${packageType} x ${quantity ? Math.round(quantity/packageCount) : 0} ${unit}` : null;

      if (!isValidBatchNo(cleanBatchNo)) {
        showToast('Số lô chỉ gồm chữ in hoa (A-Z), số (0-9) và các ký tự: - _ / . (tối đa 32 ký tự).', 'error');
        return;
      }
      if (!mfgDateVal || !expiryDateVal) {
        showToast('Vui lòng chọn ngày sản xuất và hạn sử dụng hợp lệ.', 'warning');
        return;
      }

      const mfgTimestamp = Math.floor(new Date(mfgDateVal).getTime() / 1000);
      const expiryTimestamp = Math.floor(new Date(expiryDateVal).getTime() / 1000);

      if (mfgTimestamp >= expiryTimestamp) {
        showToast('Ngày sản xuất phải xảy ra trước hạn sử dụng.', 'error');
        return;
      }
      if (!computedCoaHash) {
        showToast('Vui lòng tải lên tài liệu COA để tính mã băm SHA-256.', 'warning');
        return;
      }

      const submitBtn = $('#btn-submit-batch');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang ghi nhận lên Blockchain...';
      }

      try {
        const { batchId } = await batchService.registerBatch({
          batchNo: cleanBatchNo,
          materialName,
          mfgDate: mfgTimestamp,
          expiryDate: expiryTimestamp,
          storageConditions,
          importer,
          file: selectedCoaFile,
          docHash: computedCoaHash,
          metadata: {
            quantity,
            unit,
            packageCount,
            packagingSpec,
            countryOfOrigin,
            notes,
            manufacturerName: walletService.getOrgName() || 'Manufacturer',
            materialCode,
            grade,
            pharmacopoeiaStandard,
            productSpecRef,
            packageType,
            sealNumber,
            netWeight,
            grossWeight,
            isMock: false,
          },
        });

        showToast(`Đăng ký lô ${cleanBatchNo} thành công (Batch ID: #${batchId})!`, 'success');

        // Hiển thị modal thành công kèm QR định danh
        const modalContainer = document.createElement('div');
        modalContainer.className = 'qr-success-card';
        modalContainer.innerHTML = `
          <p>Lô nguyên liệu <strong>${cleanBatchNo}</strong> đã được ghi vào sổ cái thông minh ở trạng thái <strong>Đã đăng ký (Registered)</strong>.</p>
          <canvas id="modal-qr-canvas"></canvas>
          <p class="text-muted" style="font-size: 11px;">Mã QR cố định dùng để quét kiểm tra trên bao bì sản phẩm.</p>
        `;

        showModal({
          title: `Đăng ký lô #${batchId} thành công`,
          content: modalContainer,
          confirmText: 'Xem trang truy xuất',
          cancelText: 'Đóng',
          onConfirm: () => {
            window.location.href = `trace.html?batchId=${batchId}`;
          },
        });

        // Vẽ QR vào modal
        setTimeout(() => {
          const mCanvas = $('#modal-qr-canvas');
          if (mCanvas) {
            renderQRCodeToCanvas(mCanvas, `${window.location.origin}/trace.html?batchId=${batchId}`, 150);
          }
        }, 100);

        registerForm.reset();
        computedCoaHash = null;
        selectedCoaFile = null;
        if (hashPreview) hashPreview.classList.remove('active');

        await loadMyBatches();
      } catch (err) {
        showToast(translateError(err), 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Đăng ký lô nguyên liệu';
        }
      }
    });
  }

  await loadMyBatches();
}

