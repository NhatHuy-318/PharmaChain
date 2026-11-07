/**
 * Admin Page Logic (M3 Spec)
 * Quản lý cấp và thu hồi vai trò ví on-chain
 */

import { initApp } from '../main.js';
import { enforceRoleGuard } from '../guards/role.guard.js';
import { Role, RoleName } from '../constants/roles.js';
import { getChainAdapter } from '../services/chain/index.js';
import { getDataAdapter } from '../services/data/index.js';
import { HashService } from '../services/hash.service.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { translateError } from '../i18n/vi.js';
import { formatDate, shortenAddress, shortenHash, isValidAddress } from '../utils/format.js';
import { $, $$ } from '../utils/dom.js';

export async function initAdminPage() {
  initApp('admin');

  // Kiểm tra quyền Admin
  const isAuthorized = enforceRoleGuard(Role.Admin, 'Quản trị viên (Admin)');
  if (!isAuthorized) return;

  const chain = getChainAdapter();
  const data = getDataAdapter();

  const grantForm = $('#admin-grant-form');
  const orgTableBody = $('#admin-orgs-table-body');
  const fileInput = $('#grant-doc-file');
  const hashPreview = $('#grant-hash-preview');
  let computedLicenseHash = null;

  // File upload hash listener
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          showToast('Đang tính hash SHA-256 từ giấy phép...', 'info');
          computedLicenseHash = await HashService.computeSHA256(file);
          if (hashPreview) {
            hashPreview.textContent = `Hash SHA-256: ${computedLicenseHash}`;
            hashPreview.classList.add('active');
          }
          showToast('Đã tạo hash giấy phép thành công!', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  }

  // Xử lý nạp danh sách các tổ chức
  async function loadOrganizationsList() {
    if (!orgTableBody) return;
    try {
      const orgs = await data.getOrganizations();
      if (!orgs || orgs.length === 0) {
        orgTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--color-text-muted);">Chưa có đơn vị nào được cấp quyền.</td></tr>';
        return;
      }

      orgTableBody.innerHTML = (
        await Promise.all(
          orgs.map(async (org) => {
            const currentRole = await chain.getRole(org.address);
            const roleName = RoleName[currentRole] || 'None';
            // Contract không cho thu hồi Admin; nhận Admin theo vai trò on-chain, đúng cả mock lẫn live
            const isSelfAdmin = currentRole === Role.Admin;

            return `
              <tr>
                <td style="font-family: var(--font-family-mono); font-weight: var(--font-weight-semibold);">
                  ${shortenAddress(org.address)}
                </td>
                <td>
                  <span class="badge badge-role-${roleName.toLowerCase()}">
                    ${roleName}
                  </span>
                </td>
                <td style="font-weight: var(--font-weight-bold); color: var(--color-primary-dark);">
                  ${org.name || '—'}
                </td>
                <td>${org.licenseNo || '—'}</td>
                <td style="font-family: var(--font-family-mono); font-size: 11px;" title="${org.licenseHash || ''}">
                  ${shortenHash(org.licenseHash, 6)}
                </td>
                <td>${org.grantedAt ? formatDate(org.grantedAt) : '—'}</td>
                <td style="text-align: right;">
                  ${
                    !isSelfAdmin && currentRole !== Role.None
                      ? `<button class="btn btn-outline btn-sm btn-revoke" data-address="${org.address}" data-name="${org.name}">Thu hồi</button>`
                      : '<span class="text-muted" style="font-size: 11px;">Không khả dụng</span>'
                  }
                </td>
              </tr>
            `;
          })
        )
      ).join('');

      // Gắn sự kiện cho các nút Revoke
      $$('.btn-revoke').forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetAddr = btn.dataset.address;
          const targetName = btn.dataset.name;

          showModal({
            title: 'Xác nhận thu hồi vai trò',
            content: `<p>Bạn có chắc chắn muốn thu hồi vai trò on-chain của đơn vị <strong>${targetName}</strong> (${shortenAddress(targetAddr)})?</p><p class="text-muted" style="font-size: 12px; margin-top: 8px;">Lưu ý: Các lô hàng mà ví này đang phụ trách sẽ dừng ở trạng thái hiện tại cho tới khi được cấp lại vai trò.</p>`,
            confirmText: 'Thu hồi quyền ngay',
            isDestructive: true,
            onConfirm: async () => {
              try {
                await chain.revokeRole(targetAddr);
                showToast(`Đã thu hồi vai trò của ${targetName} thành công!`, 'success');
                await loadOrganizationsList();
              } catch (err) {
                showToast(translateError(err), 'error');
              }
            },
          });
        });
      });
    } catch (err) {
      console.error('Lỗi khi nạp danh sách vai trò:', err);
    }
  }

  // Xử lý gửi form cấp vai trò
  if (grantForm) {
    grantForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const account = $('#grant-wallet-addr')?.value.trim();
      const role = Number($('#grant-role-select')?.value);
      const orgName = $('#grant-org-name')?.value.trim();
      const licenseNo = $('#grant-license-no')?.value.trim();

      if (!isValidAddress(account)) {
        showToast('Địa chỉ ví không hợp lệ (cần 42 ký tự hex bắt đầu bằng 0x).', 'error');
        return;
      }
      if (!computedLicenseHash) {
        showToast('Vui lòng tải lên file giấy phép pháp lý để tính hash SHA-256.', 'warning');
        return;
      }

      const submitBtn = $('#btn-submit-grant');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang xử lý giao dịch...';
      }

      try {
        await chain.grantRole(account, role, orgName, computedLicenseHash);

        // Lưu metadata tổ chức off-chain
        await data.saveOrganization({
          address: account.toLowerCase(),
          role,
          name: orgName,
          licenseNo,
          licenseHash: computedLicenseHash,
          grantedAt: Math.floor(Date.now() / 1000),
        });

        showToast(`Đã cấp vai trò [${RoleName[role]}] cho ${orgName} thành công!`, 'success');
        grantForm.reset();
        computedLicenseHash = null;
        if (hashPreview) hashPreview.classList.remove('active');

        await loadOrganizationsList();
      } catch (err) {
        showToast(translateError(err), 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Cấp vai trò cho ví';
        }
      }
    });
  }

  await loadOrganizationsList();
}

