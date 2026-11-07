/**
 * Importer Page Logic (M2-2 Spec)
 * Đơn vị nhập khẩu: nhập khẩu lô đã kiểm nghiệm (Bước 3),
 * khởi tạo chuyển giao tới Receiver (Bước 4), hủy chuyển giao nếu cần.
 */

import { initApp } from '../main.js';
import { enforceRoleGuard } from '../guards/role.guard.js';
import { Role } from '../constants/roles.js';
import { BatchStatus, BatchStatusName } from '../constants/batchStatus.js';
import { batchService } from '../services/batch.service.js';
import { getChainAdapter } from '../services/chain/index.js';
import { getDataAdapter } from '../services/data/index.js';
import { walletService } from '../services/wallet.service.js';
import { HashService } from '../services/hash.service.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { translateError } from '../i18n/vi.js';
import { formatDate, shortenAddress } from '../utils/format.js';
import { $, $$ } from '../utils/dom.js';

// State module-level
let importDocHash = null;
let importSelectedFile = null;
let transferDocHash = null;
let transferSelectedFile = null;

export async function initImporterPage() {
  initApp('importer');

  const isAuthorized = enforceRoleGuard(Role.Importer, 'Đơn vị nhập khẩu (Importer)');
  if (!isAuthorized) return;

  const chain = getChainAdapter();
  const data = getDataAdapter();

  // ── Tab switching ───────────────────────────────────────────────
  const tabBtns = $$('.portal-tab-btn');
  const tabPanels = $$('.portal-tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
      btn.classList.add('active');
      const panelId = btn.dataset.tab;
      const panel = $(`[data-panel="${panelId}"]`);
      if (panel) { panel.classList.add('active'); panel.style.display = ''; }
    });
  });

  // ── File upload handlers ────────────────────────────────────────
  const importFileInput = $('#import-customs-file');
  const importHashPreview = $('#import-hash-preview');
  if (importFileInput) {
    importFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        importSelectedFile = file;
        try {
          showToast('Đang băm SHA-256 tờ khai hải quan...', 'info');
          importDocHash = await HashService.computeSHA256(file);
          if (importHashPreview) {
            importHashPreview.textContent = `Hash SHA-256: ${importDocHash}`;
            importHashPreview.classList.add('active');
          }
          showToast('Đã tính hash SHA-256 thành công!', 'success');
        } catch (err) {
          showToast('Lỗi tính hash: ' + err.message, 'error');
        }
      }
    });
  }

  const transferFileInput = $('#transfer-delivery-file');
  const transferHashPreview = $('#transfer-hash-preview');
  if (transferFileInput) {
    transferFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        transferSelectedFile = file;
        try {
          showToast('Đang băm SHA-256 phiếu giao hàng...', 'info');
          transferDocHash = await HashService.computeSHA256(file);
          if (transferHashPreview) {
            transferHashPreview.textContent = `Hash SHA-256: ${transferDocHash}`;
            transferHashPreview.classList.add('active');
          }
          showToast('Đã tính hash SHA-256 thành công!', 'success');
        } catch (err) {
          showToast('Lỗi tính hash: ' + err.message, 'error');
        }
      }
    });
  }

  // ── Load data & render ──────────────────────────────────────────
  await loadAllData(chain, data);

  // ── Form: Bước 3 - Nhập khẩu lô ────────────────────────────────
  const importForm = $('#importer-import-form');
  if (importForm) {
    importForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#btn-submit-import');
      if (!importDocHash || !importSelectedFile) {
        showToast('Vui lòng tải file Tờ khai hải quan và chờ hệ thống tính hash.', 'warning');
        return;
      }

      const batchId = parseInt($('#import-batch-select').value, 10);
      if (!batchId) {
        showToast('Vui lòng chọn lô hàng cần nhập khẩu.', 'warning');
        return;
      }

      const originCountry = $('#import-origin-country').value.trim();
      const customsDeclNo = $('#import-customs-decl-no').value.trim();
      const importDateVal = $('#import-date').value;
      const importPort = $('#import-port')?.value.trim() || null;
      const clearanceDateVal = $('#import-clearance-date')?.value;
      const customsClearanceDate = clearanceDateVal ? Math.floor(new Date(clearanceDateVal).getTime() / 1000) : null;

      if (!originCountry || !customsDeclNo || !importDateVal) {
        showToast('Vui lòng điền đầy đủ thông tin nhập khẩu.', 'warning');
        return;
      }

      const importTimestamp = Math.floor(new Date(importDateVal).getTime() / 1000);
      if (importTimestamp <= 0 || importTimestamp > Math.floor(Date.now() / 1000)) {
        showToast('Ngày nhập khẩu không hợp lệ (phải là ngày trong quá khứ hoặc hôm nay).', 'warning');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Đang ghi nhận lên Blockchain...';

      try {
        await batchService.recordImport({
          batchId,
          originCountry,
          customsDeclNo,
          importDate: importTimestamp,
          file: importSelectedFile,
          docHash: importDocHash,
          metadata: {
            importPort,
            customsClearanceDate,
          },
        });

        showToast(`✅ Đã ghi nhận nhập khẩu lô #${batchId} lên Blockchain!`, 'success');
        importForm.reset();
        importDocHash = null;
        importSelectedFile = null;
        if (importHashPreview) { importHashPreview.textContent = ''; importHashPreview.classList.remove('active'); }
        await loadAllData(chain, data);
      } catch (err) {
        showToast('Lỗi: ' + translateError(err.message || String(err)), 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Ghi nhận nhập khẩu lên Blockchain';
      }
    });
  }

  // ── Form: Bước 4 - Khởi tạo chuyển giao ────────────────────────
  const transferForm = $('#importer-transfer-form');
  if (transferForm) {
    transferForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#btn-submit-transfer');
      if (!transferDocHash || !transferSelectedFile) {
        showToast('Vui lòng tải file Phiếu giao hàng và chờ hệ thống tính hash.', 'warning');
        return;
      }

      const batchId = parseInt($('#transfer-batch-select').value, 10);
      const receiverAddr = $('#transfer-receiver-select').value;
      const carrierName = $('#transfer-carrier-name')?.value.trim() || null;
      const trackingNumber = $('#transfer-tracking-no')?.value.trim() || null;
      const transportTempRange = $('#transfer-temp-range')?.value.trim() || null;
      const vehiclePlate = $('#transfer-vehicle-plate')?.value.trim() || null;

      if (!batchId) {
        showToast('Vui lòng chọn lô hàng cần chuyển giao.', 'warning');
        return;
      }
      if (!receiverAddr) {
        showToast('Vui lòng chọn đơn vị nhận hàng (Receiver).', 'warning');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Đang khởi tạo chuyển giao...';

      try {
        await batchService.initiateTransfer({
          batchId,
          receiver: receiverAddr,
          file: transferSelectedFile,
          docHash: transferDocHash,
          metadata: {
            carrierName,
            trackingNumber,
            transportTempRange,
            vehiclePlate,
            dispatchDate: Math.floor(Date.now() / 1000),
          },
        });

        showToast(`✅ Đã khởi tạo chuyển giao lô #${batchId} tới ${shortenAddress(receiverAddr)}!`, 'success');
        transferForm.reset();
        transferDocHash = null;
        transferSelectedFile = null;
        if (transferHashPreview) { transferHashPreview.textContent = ''; transferHashPreview.classList.remove('active'); }
        await loadAllData(chain, data);
      } catch (err) {
        showToast('Lỗi: ' + translateError(err.message || String(err)), 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Khởi tạo chuyển giao hàng';
      }
    });
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function loadAllData(chain, data) {
  const currentAddr = walletService.getAddress()?.toLowerCase();
  if (!currentAddr) return;

  try {
    const allBatches = await batchService.listBatches();

    // Lô cần nhập khẩu: importer là mình, status = Tested
    const importQueue = allBatches.filter(
      b => b.importer?.toLowerCase() === currentAddr && b.status === BatchStatus.Tested
    );
    // Lô cần chuyển giao: importer là mình, status = Imported
    const transferQueue = allBatches.filter(
      b => b.importer?.toLowerCase() === currentAddr && b.status === BatchStatus.Imported
    );
    // Lô đang chuyển giao (để hiện nút Hủy): status = InTransfer, importer là mình
    const inTransferBatches = allBatches.filter(
      b => b.importer?.toLowerCase() === currentAddr && b.status === BatchStatus.InTransfer
    );
    // Tất cả lô của mình (tab theo dõi)
    const myBatches = allBatches.filter(
      b => b.importer?.toLowerCase() === currentAddr
    );

    // Nạp danh sách Receiver từ off-chain data
    let receiverOrgs = [];
    try {
      const orgs = await data.getOrganizations();
      receiverOrgs = orgs.filter(o => Number(o.role) === Role.Receiver);
    } catch (_) { /* ignore */ }

    renderImportQueue(importQueue);
    renderTransferQueue(transferQueue, inTransferBatches, chain, data);
    renderMyBatches(myBatches);
    populateImportBatchSelect(importQueue);
    populateTransferBatchSelect(transferQueue);
    populateReceiverSelect(receiverOrgs);
    updateBadgeCounts(importQueue, transferQueue);
  } catch (err) {
    showToast('Lỗi nạp dữ liệu: ' + err.message, 'error');
  }
}

function renderImportQueue(batches) {
  const tbody = $('#import-queue-table-body');
  if (!tbody) return;

  if (!batches.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);">
      Không có lô nào chờ nhập khẩu (chưa có lô ở trạng thái Tested chỉ định cho bạn).</td></tr>`;
    return;
  }

  tbody.innerHTML = batches.map(b => `
    <tr>
      <td><span class="text-mono">#${b.batchId}</span></td>
      <td><span class="text-mono text-primary">${b.batchNo}</span></td>
      <td>${b.materialName}</td>
      <td><span class="badge badge-status-tested">Tested</span></td>
      <td>${formatDate(b.mfgDate)}</td>
      <td class="${isExpiringSoon(b.expiryDate) ? 'text-warning' : ''}">${formatDate(b.expiryDate)}</td>
      <td style="text-align:right;">
        <button class="btn btn-primary btn-sm" onclick="scrollToImportForm(${b.batchId})">
          Nhập khẩu
        </button>
      </td>
    </tr>
  `).join('');
}

function renderTransferQueue(imported, inTransfer, chain, data) {
  const tbody = $('#transfer-queue-table-body');
  if (!tbody) return;

  const combined = [
    ...imported.map(b => ({ ...b, _group: 'imported' })),
    ...inTransfer.map(b => ({ ...b, _group: 'intransfer' })),
  ];

  if (!combined.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);">
      Không có lô nào sẵn sàng để chuyển giao hoặc đang trong quá trình chuyển giao.</td></tr>`;
    return;
  }

  tbody.innerHTML = combined.map(b => {
    const isInTransfer = b._group === 'intransfer';
    const statusBadge = isInTransfer
      ? '<span class="badge badge-status-intransfer">InTransfer</span>'
      : '<span class="badge badge-status-imported">Imported</span>';
    const actionBtn = isInTransfer
      ? `<button class="btn btn-ghost btn-sm" style="color: var(--color-danger);" 
           onclick="handleCancelTransfer(${b.batchId}, '${b.batchNo}')">
           Hủy chuyển giao
         </button>`
      : `<button class="btn btn-primary btn-sm" onclick="scrollToTransferForm(${b.batchId})">
           Chuyển giao
         </button>`;

    return `
      <tr>
        <td><span class="text-mono">#${b.batchId}</span></td>
        <td><span class="text-mono text-primary">${b.batchNo}</span></td>
        <td>${b.materialName}</td>
        <td>${statusBadge}</td>
        <td>${b.receiver && b.receiver !== '0x0000000000000000000000000000000000000000' ? shortenAddress(b.receiver) : '—'}</td>
        <td>${formatDate(b.expiryDate)}</td>
        <td style="text-align:right;">${actionBtn}</td>
      </tr>
    `;
  }).join('');
}

function renderMyBatches(batches) {
  const tbody = $('#my-batches-table-body');
  if (!tbody) return;

  if (!batches.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--color-text-muted);">
      Chưa có lô hàng nào liên quan đến tài khoản của bạn.</td></tr>`;
    return;
  }

  tbody.innerHTML = batches.map(b => {
    const statusKey = BatchStatusName[b.status] || String(b.status);
    return `
      <tr>
        <td><span class="text-mono">#${b.batchId}</span></td>
        <td><span class="text-mono text-primary">${b.batchNo}</span></td>
        <td>${b.materialName}</td>
        <td><span class="badge badge-status-${statusKey.toLowerCase()}">${statusKey}</span></td>
        <td>${b.receiver && b.receiver !== '0x0000000000000000000000000000000000000000' ? shortenAddress(b.receiver) : '—'}</td>
        <td style="text-align:right;">
          <a href="trace.html?batchId=${b.batchId}" class="btn btn-ghost btn-sm" target="_blank">Truy xuất</a>
        </td>
      </tr>
    `;
  }).join('');
}

function populateImportBatchSelect(batches) {
  const sel = $('#import-batch-select');
  if (!sel) return;
  sel.innerHTML = `<option value="">— Chọn lô hàng cần nhập khẩu —</option>` +
    batches.map(b => `<option value="${b.batchId}">#${b.batchId} — ${b.batchNo} (${b.materialName})</option>`).join('');
}

function populateTransferBatchSelect(batches) {
  const sel = $('#transfer-batch-select');
  if (!sel) return;
  sel.innerHTML = `<option value="">— Chọn lô hàng cần chuyển giao —</option>` +
    batches.map(b => `<option value="${b.batchId}">#${b.batchId} — ${b.batchNo} (${b.materialName})</option>`).join('');
}

function populateReceiverSelect(orgs) {
  const sel = $('#transfer-receiver-select');
  if (!sel) return;
  if (!orgs.length) {
    sel.innerHTML = `<option value="">Không tìm thấy đơn vị Receiver</option>`;
    return;
  }
  sel.innerHTML = `<option value="">— Chọn đơn vị nhận hàng —</option>` +
    orgs.map(o => `<option value="${o.address}">${o.name} (${shortenAddress(o.address)})</option>`).join('');
}

function updateBadgeCounts(importQueue, transferQueue) {
  const importBadge = $('#import-badge');
  const transferBadge = $('#transfer-badge');
  if (importBadge) importBadge.textContent = importQueue.length || '';
  if (transferBadge) transferBadge.textContent = transferQueue.length || '';
}

function isExpiringSoon(expiryTimestamp) {
  if (!expiryTimestamp) return false;
  const now = Math.floor(Date.now() / 1000);
  const thirtyDays = 30 * 24 * 3600;
  return expiryTimestamp - now < thirtyDays && expiryTimestamp > now;
}

// Global helpers gọi từ onclick trong innerHTML (cần expose lên window)
window.scrollToImportForm = function (batchId) {
  const sel = $('#import-batch-select');
  if (sel) sel.value = String(batchId);
  const formCard = $('#importer-import-card');
  if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Chuyển sang tab nhập khẩu
  const btn = $('[data-tab="import"]');
  if (btn) btn.click();
};

window.scrollToTransferForm = function (batchId) {
  const sel = $('#transfer-batch-select');
  if (sel) sel.value = String(batchId);
  const formCard = $('#importer-transfer-card');
  if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const btn = $('[data-tab="transfer"]');
  if (btn) btn.click();
};

window.handleCancelTransfer = async function (batchId, batchNo) {
  showModal({
    title: '⚠ Xác nhận Hủy chuyển giao',
    content: `Bạn có chắc muốn hủy chuyển giao lô <strong>${batchNo} (#${batchId})</strong>?<br><br>
      Thao tác này sẽ đưa lô trở về trạng thái <strong>Imported</strong> 
      và xóa thông tin đơn vị nhận hàng. Không thể hoàn tác trên Blockchain.`,
    confirmText: 'Xác nhận Hủy',
    cancelText: 'Giữ nguyên',
    isDestructive: true,
    onConfirm: async () => {
      try {
        await batchService.cancelTransfer({ batchId });
        showToast(`✅ Đã hủy chuyển giao lô #${batchId}. Trạng thái trở về Imported.`, 'success');
        const chain = getChainAdapter();
        const data = getDataAdapter();
        await loadAllData(chain, data);
      } catch (err) {
        showToast('Lỗi hủy chuyển giao: ' + translateError(err.message || String(err)), 'error');
      }
    },
  });
};

