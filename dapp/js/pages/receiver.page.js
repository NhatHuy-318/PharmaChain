/**
 * Receiver Page Logic (M2-2 Spec)
 * Đơn vị tiếp nhận nguyên liệu (Receiver):
 * - Bước 5: Tiếp nhận hàng (confirmTransfer -> Received)
 * - Bước 6: Kiểm tra QC tại nơi nhận (recordReceivingInspection -> Released hoặc Quarantined)
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
let confirmDocHash = null;
let confirmSelectedFile = null;
let qcDocHash = null;
let qcSelectedFile = null;

export async function initReceiverPage() {
  initApp('receiver');

  const isAuthorized = enforceRoleGuard(Role.Receiver, 'Đơn vị nhận hàng (Receiver)');
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

  // ── File upload: Biên bản nhận hàng (Bước 5) ─────────────────────
  const confirmFileInput = $('#confirm-receipt-file');
  const confirmHashPreview = $('#confirm-hash-preview');
  if (confirmFileInput) {
    confirmFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        confirmSelectedFile = file;
        try {
          showToast('Đang băm SHA-256 biên bản nhận hàng...', 'info');
          confirmDocHash = await HashService.computeSHA256(file);
          if (confirmHashPreview) {
            confirmHashPreview.textContent = `Mã băm SHA-256: ${confirmDocHash}`;
            confirmHashPreview.className = 'file-hash-preview hash-ready';
          }
        } catch (err) {
          showToast('Lỗi tính mã băm: ' + err.message, 'error');
        }
      }
    });
  }

  // ── File upload: Phiếu kiểm tra QC (Bước 6) ──────────────────────
  const qcFileInput = $('#qc-report-file');
  const qcHashPreview = $('#qc-hash-preview');
  if (qcFileInput) {
    qcFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        qcSelectedFile = file;
        try {
          showToast('Đang băm SHA-256 phiếu kiểm tra QC...', 'info');
          qcDocHash = await HashService.computeSHA256(file);
          if (qcHashPreview) {
            qcHashPreview.textContent = `Mã băm SHA-256: ${qcDocHash}`;
            qcHashPreview.className = 'file-hash-preview hash-ready';
          }
        } catch (err) {
          showToast('Lỗi tính mã băm: ' + err.message, 'error');
        }
      }
    });
  }

  // ── Load data & render ──────────────────────────────────────────
  await loadAllData(chain, data);

  // ── Form: Bước 5 - Tiếp nhận hàng (confirmTransfer) ─────────────
  const confirmForm = $('#receiver-confirm-form');
  if (confirmForm) {
    confirmForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#btn-submit-confirm');
      if (!confirmDocHash || !confirmSelectedFile) {
        showToast('Vui lòng tải file Biên bản nhận hàng và chờ tính mã băm.', 'warning');
        return;
      }

      const batchId = parseInt($('#confirm-batch-select').value, 10);
      if (!batchId) {
        showToast('Vui lòng chọn lô hàng cần tiếp nhận.', 'warning');
        return;
      }

      const recipientName = $('#confirm-recipient-name')?.value.trim() || '';
      const confirmNotes = $('#confirm-notes')?.value.trim() || '';

      btn.disabled = true;
      btn.textContent = 'Đang xác nhận tiếp nhận trên Blockchain...';

      try {
        await batchService.confirmTransfer({
          batchId,
          file: confirmSelectedFile,
          docHash: confirmDocHash,
          metadata: {
            recipientName,
            confirmNotes,
            receivedAt: Math.floor(Date.now() / 1000),
          },
        });

        showToast(`✅ Đã xác nhận tiếp nhận lô #${batchId} thành công (Trạng thái: Received)!`, 'success');
        confirmForm.reset();
        confirmDocHash = null;
        confirmSelectedFile = null;
        if (confirmHashPreview) confirmHashPreview.textContent = '';
        await loadAllData(chain, data);
      } catch (err) {
        showToast('Lỗi: ' + translateError(err.message || String(err)), 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Xác nhận tiếp nhận lô hàng';
      }
    });
  }

  // ── Form: Bước 6 - Kiểm tra QC tại nơi nhận ─────────────────────
  const qcForm = $('#receiver-qc-form');
  if (qcForm) {
    qcForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!qcDocHash || !qcSelectedFile) {
        showToast('Vui lòng tải file Phiếu kiểm tra QC và chờ tính mã băm.', 'warning');
        return;
      }

      const batchId = parseInt($('#qc-batch-select').value, 10);
      if (!batchId) {
        showToast('Vui lòng chọn lô hàng cần kiểm tra QC.', 'warning');
        return;
      }

      const decisionVal = $('#qc-decision').value;
      if (decisionVal !== 'true' && decisionVal !== 'false') {
        showToast('Vui lòng chọn kết quả kiểm tra QC (Đạt hoặc Không đạt).', 'warning');
        return;
      }
      const passed = decisionVal === 'true';

      const reportNo = $('#qc-report-no').value.trim();
      if (!reportNo) {
        showToast('Vui lòng nhập số hiệu phiếu kiểm tra QC.', 'warning');
        return;
      }

      const inspectDateVal = $('#qc-inspect-date').value;
      if (!inspectDateVal) {
        showToast('Vui lòng chọn ngày kiểm tra QC.', 'warning');
        return;
      }
      const inspectTimestamp = Math.floor(new Date(inspectDateVal).getTime() / 1000);
      if (inspectTimestamp <= 0 || inspectTimestamp > Math.floor(Date.now() / 1000)) {
        showToast('Ngày kiểm tra không hợp lệ (phải là ngày trong quá khứ hoặc hôm nay).', 'warning');
        return;
      }

      const notes = $('#qc-notes')?.value.trim() || '';

      const targetStatusName = passed ? 'Released (Thông quan / Xuất kho sản xuất)' : 'Quarantined (Cách ly / Trả hàng)';
      const statusColor = passed ? '#10B981' : '#EF4444';

      // Cảnh báo ghi 1 lần duy nhất bằng modal
      showModal({
        title: 'Xác nhận kết quả kiểm tra chất lượng (QC)',
        content: `
          <p>Lô hàng: <strong>#${batchId}</strong></p>
          <p>Kết quả thẩm định: <strong style="color: ${statusColor}; font-size: 15px;">${passed ? 'ĐẠT YÊU CẦU' : 'KHÔNG ĐẠT'}</strong></p>
          <p>Trạng thái cuối cùng trên Sổ cái: <strong style="color: ${statusColor};">${targetStatusName}</strong></p>
          <div class="alert alert-warning" style="margin-top: 14px;">
            ⚠️ <strong>Cảnh báo quan trọng:</strong> Đây là bước kiểm tra chung cuộc (Terminal State) 
            và <strong>chỉ được ghi 1 lần duy nhất</strong> trên Blockchain. Dữ liệu sau khi xác nhận sẽ không thể hoàn tác hoặc chỉnh sửa.
          </div>
        `,
        confirmText: passed ? 'Xác nhận ĐẠT & Phát hành (Released)' : 'Xác nhận KHÔNG ĐẠT & Cách ly (Quarantined)',
        isDestructive: !passed,
        onConfirm: async () => {
          const btn = $('#btn-submit-qc');
          if (btn) {
            btn.disabled = true;
            btn.textContent = 'Đang ghi nhận kết quả QC lên Blockchain...';
          }

          try {
            await batchService.recordReceivingInspection({
              batchId,
              passed,
              reportNo,
              inspectDate: inspectTimestamp,
              file: qcSelectedFile,
              docHash: qcDocHash,
              metadata: {
                qcNotes: notes,
              },
            });

            showToast(`✅ Đã hoàn tất kiểm tra QC lô #${batchId}! Trạng thái: ${passed ? 'Released' : 'Quarantined'}`, 'success');
            qcForm.reset();
            qcDocHash = null;
            qcSelectedFile = null;
            if (qcHashPreview) qcHashPreview.textContent = '';
            await loadAllData(chain, data);
          } catch (err) {
            showToast('Lỗi: ' + translateError(err.message || String(err)), 'error');
          } finally {
            if (btn) {
              btn.disabled = false;
              btn.textContent = 'Ghi nhận kết quả QC lên Blockchain';
            }
          }
        },
      });
    });
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function loadAllData(chain, data) {
  const currentAddr = walletService.getAccount()?.toLowerCase();
  if (!currentAddr) return;

  try {
    const allBatches = await chain.getAllBatches();

    // Lô cần tiếp nhận: receiver là mình, status = InTransfer
    const receiveQueue = allBatches.filter(
      b => b.receiver?.toLowerCase() === currentAddr && b.status === BatchStatus.InTransfer
    );

    // Lô cần QC: receiver là mình, status = Received
    const qcQueue = allBatches.filter(
      b => b.receiver?.toLowerCase() === currentAddr && b.status === BatchStatus.Received
    );

    // Lịch sử tất cả lô của mình
    const myHistory = allBatches.filter(
      b => b.receiver?.toLowerCase() === currentAddr
    );

    renderReceiveQueue(receiveQueue);
    renderQCQueue(qcQueue);
    renderHistory(myHistory);
    populateConfirmBatchSelect(receiveQueue);
    populateQCBatchSelect(qcQueue);
    updateBadgeCounts(receiveQueue, qcQueue);
  } catch (err) {
    showToast('Lỗi nạp dữ liệu: ' + err.message, 'error');
  }
}

function renderReceiveQueue(batches) {
  const tbody = $('#receive-queue-table-body');
  if (!tbody) return;

  if (!batches.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);">
      Hiện không có lô hàng nào đang vận chuyển tới bạn (trạng thái InTransfer).</td></tr>`;
    return;
  }

  tbody.innerHTML = batches.map(b => `
    <tr>
      <td><span class="text-mono">#${b.batchId}</span></td>
      <td><span class="text-mono text-primary">${b.batchNo}</span></td>
      <td>${b.materialName}</td>
      <td><span class="badge badge-status-intransfer">InTransfer</span></td>
      <td>${shortenAddress(b.importer)}</td>
      <td>${formatDate(b.expiryDate)}</td>
      <td style="text-align:right;">
        <button class="btn btn-primary btn-sm" onclick="scrollToConfirmForm(${b.batchId})">
          Tiếp nhận &darr;
        </button>
      </td>
    </tr>
  `).join('');
}

function renderQCQueue(batches) {
  const tbody = $('#qc-queue-table-body');
  if (!tbody) return;

  if (!batches.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);">
      Hiện không có lô hàng nào đang chờ kiểm tra QC tại nơi nhận.</td></tr>`;
    return;
  }

  tbody.innerHTML = batches.map(b => `
    <tr>
      <td><span class="text-mono">#${b.batchId}</span></td>
      <td><span class="text-mono text-primary">${b.batchNo}</span></td>
      <td>${b.materialName}</td>
      <td><span class="badge badge-status-received">Received</span></td>
      <td>${shortenAddress(b.importer)}</td>
      <td>${formatDate(b.expiryDate)}</td>
      <td style="text-align:right;">
        <button class="btn btn-primary btn-sm" onclick="scrollToQCForm(${b.batchId})">
          Kiểm tra QC &darr;
        </button>
      </td>
    </tr>
  `).join('');
}

function renderHistory(batches) {
  const tbody = $('#receiver-history-table-body');
  if (!tbody) return;

  if (!batches.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--color-text-muted);">
      Chưa có lịch sử tiếp nhận lô hàng nào.</td></tr>`;
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
        <td>${shortenAddress(b.importer)}</td>
        <td style="text-align:right;">
          <a href="trace.html?batchId=${b.batchId}" class="btn btn-ghost btn-sm" target="_blank">
            Truy xuất
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

function populateConfirmBatchSelect(batches) {
  const sel = $('#confirm-batch-select');
  if (!sel) return;
  sel.innerHTML = `<option value="">— Chọn lô hàng cần xác nhận tiếp nhận —</option>` +
    batches.map(b => `<option value="${b.batchId}">#${b.batchId} — ${b.batchNo} (${b.materialName})</option>`).join('');
}

function populateQCBatchSelect(batches) {
  const sel = $('#qc-batch-select');
  if (!sel) return;
  sel.innerHTML = `<option value="">— Chọn lô hàng cần kiểm tra QC —</option>` +
    batches.map(b => `<option value="${b.batchId}">#${b.batchId} — ${b.batchNo} (${b.materialName})</option>`).join('');
}

function updateBadgeCounts(receiveQueue, qcQueue) {
  const receiveBadge = $('#receive-badge');
  const qcBadge = $('#qc-badge');
  if (receiveBadge) receiveBadge.textContent = receiveQueue.length || '';
  if (qcBadge) qcBadge.textContent = qcQueue.length || '';
}

// Global helpers gọi từ onclick trong innerHTML
window.scrollToConfirmForm = function (batchId) {
  const sel = $('#confirm-batch-select');
  if (sel) sel.value = String(batchId);
  const formCard = $('#receiver-confirm-card');
  if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const btn = $('[data-tab="receive"]');
  if (btn) btn.click();
};

window.scrollToQCForm = function (batchId) {
  const sel = $('#qc-batch-select');
  if (sel) sel.value = String(batchId);
  const formCard = $('#receiver-qc-card');
  if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const btn = $('[data-tab="qc"]');
  if (btn) btn.click();
};

