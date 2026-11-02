/**
 * Search Page Logic (M9 Spec)
 */

import { initApp } from '../main.js';
import { batchService } from '../services/batch.service.js';
import { getChainAdapter } from '../services/chain/index.js';
import { getDataAdapter } from '../services/data/index.js';
import { BatchStatus, BatchStatusName } from '../constants/batchStatus.js';
import { formatDate, shortenAddress } from '../utils/format.js';
import { $, $$ } from '../utils/dom.js';

let allBatches = [];
let currentFilterStatus = 'all';

export async function initSearchPage() {
  initApp('search');

  const searchInput = $('#search-input');
  const searchBtn = $('#btn-search');
  const resultsContainer = $('#search-results-grid');
  const resultsCount = $('#results-count');
  const emptyState = $('#search-empty');
  const loadingIndicator = $('#search-loading');

  // Nạp toàn bộ dữ liệu ban đầu
  try {
    const chain = getChainAdapter();
    const data = getDataAdapter();
    const count = await chain.getBatchCount();
    const chainBatches = await chain.getBatches(1, count);

    // Ghép metadata cho từng lô
    allBatches = await Promise.all(
      chainBatches.map(async (b) => {
        const meta = (await data.getBatchMetadata(b.id)) || {};
        const isExp = await chain.isExpired(b.id);
        const mfgOrg = await data.getOrganization(b.manufacturer);
        return {
          ...b,
          isExpired: isExp,
          metadata: meta,
          statusName: BatchStatusName[b.status] || 'Unknown',
          manufacturerOrg: mfgOrg?.name || 'Nhà sản xuất',
        };
      })
    );

    renderResults(allBatches);
  } catch (err) {
    console.error('Lỗi khi nạp dữ liệu tra cứu:', err);
  } finally {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
  }

  // Xử lý sự kiện tìm kiếm
  function performSearch() {
    const query = (searchInput?.value || '').trim().toLowerCase();

    let filtered = allBatches.filter((b) => {
      // Lọc theo status
      if (currentFilterStatus !== 'all') {
        const targetStatusNum = Number(currentFilterStatus);
        if (b.status !== targetStatusNum) return false;
      }

      // Lọc theo query nếu có
      if (!query) return true;

      const idMatch = String(b.id) === query;
      const noMatch = (b.batchNo || '').toLowerCase().includes(query);
      const matMatch = (b.materialName || '').toLowerCase().includes(query);
      const metaMatMatch = (b.metadata?.materialName || '').toLowerCase().includes(query);
      const hashMatch = (b.docHash || '').toLowerCase().includes(query);
      const mfgMatch = (b.manufacturerOrg || '').toLowerCase().includes(query);

      return idMatch || noMatch || matMatch || metaMatMatch || hashMatch || mfgMatch;
    });

    renderResults(filtered);
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', performSearch);
  }

  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') performSearch();
    });
    searchInput.addEventListener('input', () => {
      if (searchInput.value.trim() === '') performSearch();
    });
  }

  // Gắn sự kiện cho các thẻ gợi ý (Suggestion chips)
  $$('.search-chip').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const val = chip.dataset.query || chip.textContent.trim();
      if (searchInput) {
        searchInput.value = val;
        performSearch();
      }
    });
  });

  // Gắn sự kiện lọc theo tab trạng thái
  $$('.filter-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.filter-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilterStatus = tab.dataset.status || 'all';
      performSearch();
    });
  });

  function renderResults(batches) {
    if (resultsCount) {
      resultsCount.textContent = `Tìm thấy ${batches.length} lô nguyên liệu`;
    }

    if (!resultsContainer) return;

    if (batches.length === 0) {
      resultsContainer.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    resultsContainer.innerHTML = batches
      .map((b) => {
        const statusKey = BatchStatusName[b.status]?.toLowerCase();
        const matName = b.metadata?.materialName || b.materialName || 'Nguyên liệu dược phẩm';
        const qty = b.metadata?.quantity ? `${b.metadata.quantity} ${b.metadata.unit || 'kg'}` : 'Chưa cập nhật';

        return `
          <div class="batch-result-card">
            <div>
              <div class="batch-card-top">
                <span class="batch-no-title">#${b.id} • ${b.batchNo}</span>
                <span class="badge badge-status-${statusKey}">
                  ${b.statusName}
                </span>
              </div>

              <h4 class="material-name-heading">${matName}</h4>

              <div class="batch-meta-list">
                <div class="batch-meta-item">
                  <span class="batch-meta-label">Nhà sản xuất:</span>
                  <span class="batch-meta-val" title="${b.manufacturer}">
                    ${b.manufacturerOrg} (${shortenAddress(b.manufacturer)})
                  </span>
                </div>
                <div class="batch-meta-item">
                  <span class="batch-meta-label">Khối lượng:</span>
                  <span class="batch-meta-val">${qty}</span>
                </div>
                <div class="batch-meta-item">
                  <span class="batch-meta-label">Hạn sử dụng:</span>
                  <span class="batch-meta-val ${b.isExpired ? 'text-danger fw-bold' : ''}">
                    ${formatDate(b.expiryDate)} ${b.isExpired ? '(ĐÃ HẾT HẠN)' : ''}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between" style="margin-top: var(--space-2);">
              <span class="text-muted" style="font-size: 11px;">
                Tạo ngày: ${formatDate(b.createdAt)}
              </span>
              <a href="trace.html?batchId=${b.id}" class="btn btn-outline btn-sm">
                Xem hành trình &rarr;
              </a>
            </div>
          </div>
        `;
      })
      .join('');
  }
}

