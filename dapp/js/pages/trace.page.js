/**
 * Trace Page Logic (M10 Spec)
 * Hiển thị toàn bộ tiến trình lịch sử lô nguyên liệu, mã QR định danh cố định và đối chiếu mã băm SHA-256
 */

import { initApp } from '../main.js';
import { batchService } from '../services/batch.service.js';
import { HashService } from '../services/hash.service.js';
import { BatchStatusName } from '../constants/batchStatus.js';
import { formatDate, formatDateTime, shortenAddress, shortenHash } from '../utils/format.js';
import { renderQRCodeToCanvas, downloadQRCode } from '../utils/qr.js';
import { showToast } from '../components/toast.js';
import { $, $$ } from '../utils/dom.js';

let currentBatch = null;
let selectedDocHashForVerify = null;

export async function initTracePage() {
  initApp('trace');

  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get('batchId') || urlParams.get('batchNo') || '1';

  const loadingEl = $('#trace-loading');
  const contentEl = $('#trace-content');
  const notFoundEl = $('#trace-not-found');

  try {
    currentBatch = await batchService.findBatch(queryParam);
    if (!currentBatch) {
      if (loadingEl) loadingEl.style.display = 'none';
      if (notFoundEl) notFoundEl.style.display = 'block';
      return;
    }

    renderBatchHeader(currentBatch);
    renderTimeline(currentBatch);
    setupVerificationSection(currentBatch);

    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
  } catch (err) {
    console.error('Lỗi khi nạp dữ liệu hành trình truy xuất:', err);
    if (loadingEl) loadingEl.style.display = 'none';
    if (notFoundEl) notFoundEl.style.display = 'block';
  }
}

function renderBatchHeader(b) {
  const statusKey = BatchStatusName[b.status]?.toLowerCase();
  const matName = b.metadata?.materialName || b.materialName || 'Nguyên liệu dược phẩm';

  // 1. Gán thông tin chính
  const batchNoEl = $('#trace-batch-no');
  if (batchNoEl) batchNoEl.textContent = b.batchNo;

  const matEl = $('#trace-material-title');
  if (matEl) matEl.textContent = matName;

  const statusBadge = $('#trace-status-badge');
  if (statusBadge) {
    statusBadge.className = `badge badge-status-${statusKey}`;
    statusBadge.textContent = b.statusName;
  }

  const expiryBadge = $('#trace-expiry-badge');
  if (expiryBadge) {
    if (b.isExpired) {
      expiryBadge.className = 'badge';
      expiryBadge.style.cssText = 'background: #FEE2E2; color: #991B1B; border: 1px solid #F87171;';
      expiryBadge.textContent = `Đã hết hạn (${formatDate(b.expiryDate)})`;
    } else {
      expiryBadge.className = 'badge';
      expiryBadge.style.cssText = 'background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0;';
      expiryBadge.textContent = `Hạn dùng: ${formatDate(b.expiryDate)}`;
    }
  }

  // 2. Tổ chức tham gia
  const mfgNameEl = $('#party-mfg-name');
  if (mfgNameEl) mfgNameEl.textContent = b.organizations?.manufacturer?.name || 'Nhà sản xuất';
  const mfgAddrEl = $('#party-mfg-addr');
  if (mfgAddrEl) mfgAddrEl.textContent = shortenAddress(b.manufacturer);

  const impNameEl = $('#party-imp-name');
  if (impNameEl) impNameEl.textContent = b.organizations?.importer?.name || 'Đơn vị nhập khẩu';
  const impAddrEl = $('#party-imp-addr');
  if (impAddrEl) impAddrEl.textContent = shortenAddress(b.importer);

  const recNameEl = $('#party-rec-name');
  if (recNameEl) recNameEl.textContent = b.organizations?.receiver?.name || (b.receiver !== '0x0000000000000000000000000000000000000000' ? 'Nhà máy tiếp nhận' : 'Chưa chỉ định');
  const recAddrEl = $('#party-rec-addr');
  if (recAddrEl) recAddrEl.textContent = b.receiver !== '0x0000000000000000000000000000000000000000' ? shortenAddress(b.receiver) : '—';

  // 3. Render mã QR cố định theo batchId
  const qrCanvas = $('#trace-qr-canvas');
  if (qrCanvas) {
    const traceUrl = `${window.location.origin}${window.location.pathname}?batchId=${b.id}`;
    renderQRCodeToCanvas(qrCanvas, traceUrl, 160);

    // Gắn sự kiện nút tải ảnh QR
    const downloadBtn = $('#btn-download-qr');
    if (downloadBtn) {
      downloadBtn.onclick = () => {
        downloadQRCode(qrCanvas, `PharmaChain-QR-${b.batchNo}.png`);
        showToast('Đã tải hình ảnh mã QR định danh!', 'success');
      };
    }

    // Gắn sự kiện sao chép liên kết truy xuất
    const copyBtn = $('#btn-copy-trace-link');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(traceUrl);
        showToast('Đã sao chép liên kết truy xuất vào bộ nhớ tạm!', 'success');
      };
    }
  }
}

function renderTimeline(b) {
  const container = $('#timeline-items-list');
  if (!container) return;

  if (!b.events || b.events.length === 0) {
    container.innerHTML = '<p class="text-muted">Chưa có sự kiện nào được ghi nhận cho lô này.</p>';
    return;
  }

  container.innerHTML = b.events
    .map((e, idx) => {
      const stepNum = e.step || (idx + 1);
      const isCompleted = true;
      const txUrl = `https://explorer.testnet.rootstock.io/tx/${e.txHash}`;
      const shortTx = shortenAddress(e.txHash, 6);

      // Định dạng chi tiết các trường nghiệp vụ
      let detailsHtml = '';
      if (e.fields) {
        const entries = Object.entries(e.fields).filter(
          ([k]) => !['batchId', 'docHash', 'at', 'role'].includes(k)
        );
        detailsHtml = entries
          .map(([k, val]) => {
            let label = k;
            let displayVal = val;
            if (k === 'passed') {
              label = 'Kết quả kiểm tra';
              displayVal = val ? '<span class="badge badge-status-released">ĐẠT (PASSED)</span>' : '<span class="badge badge-status-rejected">KHÔNG ĐẠT (FAILED)</span>';
            } else if (k === 'reportNo') label = 'Số hiệu phiếu';
            else if (k === 'customsDeclNo') label = 'Số tờ khai hải quan';
            else if (k === 'originCountry') label = 'Quốc gia xuất xứ';
            else if (k === 'storageConditions') label = 'Điều kiện bảo quản';
            else if (k === 'mfgDate' || k === 'testDate' || k === 'importDate' || k === 'inspectDate') {
              displayVal = formatDate(val);
            } else if (typeof val === 'string' && val.startsWith('0x') && val.length === 42) {
              displayVal = `<span class="text-mono">${shortenAddress(val)}</span>`;
            }

            return `
              <div>
                <div class="field-label">${label}</div>
                <div class="field-val">${displayVal}</div>
              </div>
            `;
          })
          .join('');
      }

      return `
        <div class="timeline-event-item" id="event-step-${stepNum}">
          <!-- Marker Circle Node -->
          <div class="timeline-marker-node ${isCompleted ? 'completed' : ''}">
            ${stepNum}
          </div>

          <!-- Card Content -->
          <div class="timeline-card">
            <div class="timeline-card-header">
              <div>
                <div class="timeline-step-label">${e.stepLabel || e.eventName}</div>
                <div class="timeline-step-time">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  ${formatDateTime(e.timestamp)} • Thực hiện bởi: <strong>${e.orgName || e.actorRole || 'Đơn vị'}</strong> (${shortenAddress(e.actor)})
                </div>
              </div>

              <div>
                <a href="${txUrl}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" title="Xem trên Rootstock Testnet Explorer">
                  Tx: ${shortTx} ↗
                </a>
              </div>
            </div>

            <!-- Fields Grid -->
            <div class="timeline-fields-grid">
              ${detailsHtml}
            </div>

            <!-- Document Hash Section -->
            <div class="timeline-hash-row">
              <div class="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span style="font-size: 11px; font-weight: var(--font-weight-bold); color: var(--color-primary-dark);">
                  ${e.docName || e.docType || 'Mã băm hồ sơ on-chain'}:
                </span>
                <span class="timeline-hash-text" title="${e.docHash}">
                  ${shortenHash(e.docHash, 8)}
                </span>
              </div>

              <button
                class="btn btn-secondary btn-sm btn-verify-step"
                data-hash="${e.docHash}"
                data-label="${e.stepLabel || e.eventName}"
                data-name="${e.docName || ''}"
              >
                Đối chiếu file này &darr;
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  // Gắn sự kiện cho các nút "Đối chiếu file này"
  $$('.btn-verify-step').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetHash = btn.dataset.hash;
      const docSelect = $('#verify-event-select');
      if (docSelect) {
        docSelect.value = targetHash;
        selectedDocHashForVerify = targetHash;
      }
      // Cuộn xuống khu vực xác minh
      const verifySec = $('#document-verification-section');
      if (verifySec) {
        verifySec.scrollIntoView({ behavior: 'smooth' });
        showToast(`Đã chọn mã băm của [${btn.dataset.label}] để đối chiếu!`, 'info');
      }
    });
  });
}

function setupVerificationSection(b) {
  const selectEl = $('#verify-event-select');
  const dropzone = $('#verify-dropzone');
  const fileInput = $('#verify-file-input');
  const resultBox = $('#verify-result-box');

  if (!selectEl || !dropzone || !fileInput) return;

  // Điền danh sách các bước có tài liệu vào dropdown
  if (b.events && b.events.length > 0) {
    selectEl.innerHTML = b.events
      .filter((e) => e.docHash && e.docHash !== '0x0000000000000000000000000000000000000000000000000000000000000000')
      .map(
        (e) => `
        <option value="${e.docHash}">
          ${e.stepLabel || e.eventName} (${e.docName || e.docType || 'Hồ sơ'})
        </option>
      `
      )
      .join('');

    selectedDocHashForVerify = selectEl.value;
  }

  selectEl.addEventListener('change', (e) => {
    selectedDocHashForVerify = e.target.value;
  });

  // Xử lý Click mở hộp thoại chọn file
  dropzone.addEventListener('click', () => fileInput.click());

  // Kéo thả file Drag & Drop
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileVerification(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileVerification(files[0]);
    }
  });

  async function handleFileVerification(file) {
    if (!selectedDocHashForVerify) {
      selectedDocHashForVerify = selectEl.value;
    }

    if (!selectedDocHashForVerify) {
      showToast('Vui lòng chọn bước sự kiện muốn đối chiếu.', 'warning');
      return;
    }

    try {
      showToast('Đang tính mã băm SHA-256 từ file...', 'info');
      const verifyResult = await HashService.verifyFileHash(file, selectedDocHashForVerify);

      // Hiển thị kết quả trực quan
      if (resultBox) {
        resultBox.className = `verify-result-box active ${verifyResult.match ? 'match' : 'mismatch'}`;
        resultBox.innerHTML = `
          <div class="verify-status-banner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${
                verifyResult.match
                  ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
                  : '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'
              }
            </svg>
            <span>${verifyResult.message}</span>
          </div>

          <p style="font-size: var(--font-size-xs); margin-bottom: var(--space-3);">
            File được kiểm tra: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)
          </p>

          <table class="hash-comparison-table">
            <tr>
              <td style="width: 170px; color: var(--color-text-muted);">Mã băm tính từ file:</td>
              <td class="code-val">${verifyResult.calculatedHash}</td>
            </tr>
            <tr>
              <td style="color: var(--color-text-muted);">Mã băm on-chain sự kiện:</td>
              <td class="code-val">${verifyResult.expectedHash}</td>
            </tr>
          </table>

          <div style="font-size: 11px; margin-top: var(--space-3); opacity: 0.85; border-top: 1px dashed rgba(0,0,0,0.15); padding-top: var(--space-2);">
            ${verifyResult.disclaimer}
          </div>
        `;
      }

      if (verifyResult.match) {
        showToast('Xác minh thành công: File trùng khớp byte tuyệt đối!', 'success');
      } else {
        showToast('Cảnh báo: File đã bị sửa đổi hoặc đây là tài liệu khác!', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi băm file:', err);
      showToast(err.message, 'error');
    }
  }
}

