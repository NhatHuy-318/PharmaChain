/**
 * Inspector Page Logic (M2-2 Spec)
 * Đơn vị kiểm nghiệm độc lập tiếp nhận lô Registered và ghi kết quả Passed/Failed (chỉ ghi 1 lần)
 */

import { initApp } from '../main.js';
import { enforceRoleGuard } from '../guards/role.guard.js';
import { Role } from '../constants/roles.js';
import { BatchStatus, BatchStatusName } from '../constants/batchStatus.js';
import { batchService } from '../services/batch.service.js';
import { getChainAdapter } from '../services/chain/index.js';
import { getDataAdapter } from '../services/data/index.js';
import { HashService } from '../services/hash.service.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { translateError } from '../i18n/vi.js';
import { formatDate, shortenAddress } from '../utils/format.js';
import { $, $$ } from '../utils/dom.js';

let activeBatchForTesting = null;
let computedDocHash = null;
let selectedFile = null;

export async function initInspectorPage() {
  initApp('inspector');

  const isAuthorized = enforceRoleGuard(Role.Inspector, 'Đơn vị kiểm nghiệm (Inspector)');
  if (!isAuthorized) return;

  const chain = getChainAdapter();
  const data = getDataAdapter();

  const queueTableBody = $('#inspector-queue-table-body');
  const historyTableBody = $('#inspector-history-table-body');
  const testFormContainer = $('#inspector-form-container');
  const testForm = $('#inspector-test-form');
  const fileInput = $('#inspector-report-file');
  const hashPreview = $('#inspector-hash-preview');

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

  // Cancel test form button
  const cancelTestBtn = $('#btn-cancel-test-form');
  if (cancelTestBtn && testFormContainer) {
    cancelTestBtn.addEventListener('click', () => {
      testFormContainer.style.display = 'none';
      activeBatchForTesting = null;
      if (testForm) testForm.reset();
      computedDocHash = null;
      selectedFile = null;
      if (hashPreview) hashPreview.textContent = '';
    });
  }

  // File upload & SHA-256 calculation
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        selectedFile = file;
        try {
          showToast('Đang băm SHA-256 phiếu kiểm nghiệm...', 'info');
          computedDocHash = await HashService.computeSHA256(file);
          if (hashPreview) {
            hashPreview.textContent = `Mã băm SHA-256: ${computedDocHash}`;
            hashPreview.classList.add('active');
          }
          showToast('Đã tạo mã băm phiếu kiểm nghiệm thành công!', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  }

  // Nạp hàng đợi lô Registered cần kiểm nghiệm
  async function loadInspectorQueues() {
    try {
      const totalCount = await chain.getBatchCount();
      const allBatches = await chain.getBatches(1, totalCount);

      // 1. Hàng đợi: chỉ các lô Registered
      const pendingBatches = allBatches.filter((b) => b.status === BatchStatus.Registered);
      const queueBadge = $('#queue-badge');
      if (queueBadge) queueBadge.textContent = pendingBatches.length || '';

      if (queueTableBody) {
        if (pendingBatches.length === 0) {
          queueTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--color-text-muted);">Hiện không có lô nào đang chờ kiểm nghiệm.</td></tr>';
        } else {
          queueTableBody.innerHTML = (
            await Promise.all(
              pendingBatches.map(async (b) => {
                const meta = (await data.getBatchMetadata(b.id)) || {};
                const mfgOrg = await data.getOrganization(b.manufacturer);

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
                    <td>${mfgOrg?.name ? mfgOrg.name.split('(')[0] : shortenAddress(b.manufacturer)}</td>
                    <td>${formatDate(b.createdAt)}</td>
                    <td>${formatDate(b.expiryDate)}</td>
                    <td style="text-align: right;">
                      <button
                        class="btn btn-primary btn-sm btn-select-batch"
                        data-id="${b.id}"
                        data-no="${b.batchNo}"
                        data-material="${meta.materialName || b.materialName}"
                      >
                        Ghi kết quả &darr;
                      </button>
                    </td>
                  </tr>
                `;
              })
            )
          ).join('');

          // Gắn sự kiện chọn lô kiểm nghiệm
          $$('.btn-select-batch').forEach((btn) => {
            btn.addEventListener('click', () => {
              activeBatchForTesting = {
                id: Number(btn.dataset.id),
                batchNo: btn.dataset.no,
                materialName: btn.dataset.material,
              };
              openTestForm(activeBatchForTesting);
            });
          });
        }
      }

      // 2. Lịch sử kiểm nghiệm: các lô Tested hoặc Rejected
      const testedBatches = allBatches.filter(
        (b) => b.status === BatchStatus.Tested || b.status === BatchStatus.Rejected
      );

      if (historyTableBody) {
        if (testedBatches.length === 0) {
          historyTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted);">Chưa có lịch sử kiểm nghiệm.</td></tr>';
        } else {
          historyTableBody.innerHTML = (
            await Promise.all(
              testedBatches.reverse().map(async (b) => {
                const meta = (await data.getBatchMetadata(b.id)) || {};
                const statusKey = BatchStatusName[b.status]?.toLowerCase();

                return `
                  <tr>
                    <td style="font-family: var(--font-family-mono); font-weight: var(--font-weight-bold); color: var(--color-primary);">
                      #${b.id}
                    </td>
                    <td style="font-family: var(--font-family-mono);">${b.batchNo}</td>
                    <td style="font-weight: var(--font-weight-semibold);">${meta.materialName || b.materialName}</td>
                    <td>
                      <span class="badge badge-status-${statusKey}">
                        ${BatchStatusName[b.status]}
                      </span>
                    </td>
                    <td>${meta.testReportNo || '—'}</td>
                    <td style="text-align: right;">
                      <a href="trace.html?batchId=${b.id}" class="btn btn-outline btn-sm">Xem Trace</a>
                    </td>
                  </tr>
                `;
              })
            )
          ).join('');
        }
      }
    } catch (err) {
      console.error('Lỗi khi nạp danh sách Inspector:', err);
    }
  }

  function openTestForm(batch) {
    if (!testFormContainer) return;
    testFormContainer.style.display = 'block';
    $('#test-target-batch-no').textContent = `${batch.batchNo} (#${batch.id})`;
    $('#test-target-material').textContent = batch.materialName;
    testFormContainer.scrollIntoView({ behavior: 'smooth' });
    showToast(`Đã chọn lô [${batch.batchNo}] để ghi kết quả kiểm nghiệm.`, 'info');
  }

  // Xử lý gửi Form Ghi kết quả kiểm nghiệm
  if (testForm) {
    testForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeBatchForTesting) {
        showToast('Chưa chọn lô nguyên liệu để kiểm nghiệm.', 'warning');
        return;
      }

      const passed = $('#test-result-decision')?.value === 'true';
      const reportNo = $('#test-report-no')?.value.trim();
      const testDateVal = $('#test-date')?.value;
      const testMethod = $('#test-method')?.value.trim() || null;
      const testNotes = $('#test-notes')?.value.trim() || null;

      // P1 Structured QC optional fields
      const sampleId = $('#test-sample-id')?.value.trim() || null;
      const specificationRef = $('#test-specification-ref')?.value.trim() || null;
      const analystName = $('#test-analyst-name')?.value.trim() || null;
      const reviewerName = $('#test-reviewer-name')?.value.trim() || null;

      if (!reportNo) {
        showToast('Vui lòng nhập số hiệu phiếu kiểm nghiệm.', 'error');
        return;
      }
      if (!testDateVal) {
        showToast('Vui lòng chọn ngày kiểm nghiệm.', 'error');
        return;
      }
      if (!computedDocHash) {
        showToast('Vui lòng tải lên file phiếu kiểm nghiệm để tính SHA-256.', 'warning');
        return;
      }

      const testTimestamp = Math.floor(new Date(testDateVal).getTime() / 1000);

      // Cảnh báo ghi 1 lần bằng modal
      showModal({
        title: 'Xác nhận ghi nhận kết quả kiểm nghiệm',
        content: `
          <p>Bạn sắp ghi kết quả: <strong style="color: ${passed ? '#10B981' : '#EF4444'};">${passed ? 'ĐẠT (Tested)' : 'KHÔNG ĐẠT (Rejected)'}</strong> cho lô <strong>${activeBatchForTesting.batchNo}</strong>.</p>
          <div class="alert alert-warning" style="margin-top: 12px;">
            ⚠️ <strong>Cảnh báo quan trọng:</strong> Thao tác này chỉ được ghi <strong>MỘT LẦN DUY NHẤT</strong> trên Blockchain. Lô hàng sẽ lập tức chuyển trạng thái và không thể chỉnh sửa lại.
          </div>
        `,
        confirmText: 'Xác nhận ghi on-chain',
        onConfirm: async () => {
          const submitBtn = $('#btn-submit-test');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đang ghi nhận...';
          }

          try {
            await batchService.recordTestResult({
              batchId: activeBatchForTesting.id,
              passed,
              reportNo,
              testDate: testTimestamp,
              file: selectedFile,
              docHash: computedDocHash,
              metadata: {
                testMethod,
                testNotes,
                sampleId,
                specificationRef,
                analystName,
                reviewerName,
              },
            });

            showToast(`Ghi nhận kết quả lô ${activeBatchForTesting.batchNo} thành công!`, 'success');
            testForm.reset();
            computedDocHash = null;
            selectedFile = null;
            if (hashPreview) hashPreview.classList.remove('active');
            testFormContainer.style.display = 'none';
            activeBatchForTesting = null;

            await loadInspectorQueues();
          } catch (err) {
            showToast(translateError(err), 'error');
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Ghi nhận kết quả kiểm nghiệm';
            }
          }
        },
      });
    });
  }

  await loadInspectorQueues();
}

