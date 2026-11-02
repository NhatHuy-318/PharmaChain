/**
 * Accessible Modal Confirmation Dialog
 */

import { createElement, $ } from '../utils/dom.js';

let activeBackdrop = null;

export function showModal({
  title = 'Xác nhận thao tác',
  content = '',
  confirmText = 'Đồng ý',
  cancelText = 'Hủy bỏ',
  isDestructive = false,
  onConfirm = () => {},
  onCancel = () => {},
}) {
  if (activeBackdrop) {
    closeModal();
  }

  const backdrop = createElement('div', {
    className: 'modal-backdrop',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'modal-title-heading',
  });

  const dialog = createElement('div', { className: 'modal-dialog' });

  // Header
  const header = createElement('div', { className: 'modal-header' });
  const titleEl = createElement('h3', { className: 'modal-title', id: 'modal-title-heading' }, title);
  const closeBtn = createElement('button', {
    className: 'modal-close-btn',
    'aria-label': 'Đóng hộp thoại',
    onclick: () => {
      onCancel();
      closeModal();
    },
  });
  closeBtn.innerHTML = `&times;`;
  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  // Body
  const body = createElement('div', { className: 'modal-body' });
  if (typeof content === 'string') {
    body.innerHTML = content;
  } else if (content instanceof Node) {
    body.appendChild(content);
  }

  // Footer
  const footer = createElement('div', { className: 'modal-footer' });
  const cancelBtn = createElement(
    'button',
    {
      className: 'btn btn-outline',
      type: 'button',
      onclick: () => {
        onCancel();
        closeModal();
      },
    },
    cancelText
  );

  const confirmBtn = createElement(
    'button',
    {
      className: `btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`,
      style: isDestructive ? 'background-color: #DC2626; color: #FFFFFF;' : '',
      type: 'button',
      onclick: async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Đang xử lý...';
        try {
          await onConfirm();
          closeModal();
        } catch (err) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = confirmText;
        }
      },
    },
    confirmText
  );

  footer.appendChild(cancelBtn);
  footer.appendChild(confirmBtn);

  dialog.appendChild(header);
  dialog.appendChild(body);
  dialog.appendChild(footer);
  backdrop.appendChild(dialog);

  document.body.appendChild(backdrop);
  activeBackdrop = backdrop;

  // Trigger animation
  requestAnimationFrame(() => {
    backdrop.classList.add('active');
    confirmBtn.focus();
  });

  // Handle backdrop click & Escape key
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      onCancel();
      closeModal();
    }
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      window.removeEventListener('keydown', handleKeyDown);
      onCancel();
      closeModal();
    }
  };
  window.addEventListener('keydown', handleKeyDown);

  function closeModal() {
    if (!activeBackdrop) return;
    activeBackdrop.classList.remove('active');
    setTimeout(() => {
      if (activeBackdrop && activeBackdrop.parentNode) {
        activeBackdrop.parentNode.removeChild(activeBackdrop);
      }
      activeBackdrop = null;
    }, 200);
    window.removeEventListener('keydown', handleKeyDown);
  }

  return { close: closeModal };
}

