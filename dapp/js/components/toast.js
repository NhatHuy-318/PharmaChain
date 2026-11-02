/**
 * Toast Notification Manager
 */

import { createElement, $ } from '../utils/dom.js';

let container = null;

function ensureContainer() {
  if (!container || !document.body.contains(container)) {
    container = $('.toast-container');
    if (!container) {
      container = createElement('div', { className: 'toast-container', role: 'region', 'aria-live': 'polite' });
      document.body.appendChild(container);
    }
  }
  return container;
}

const icons = {
  success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
  warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
};

export function showToast(message, type = 'info', title = null, duration = 4000) {
  const cont = ensureContainer();
  const toast = createElement('div', { className: `toast toast-${type}` });

  const iconDiv = createElement('div', { className: 'toast-icon' });
  iconDiv.innerHTML = icons[type] || icons.info;

  const contentDiv = createElement('div', { className: 'toast-content' });
  if (title) {
    const titleEl = createElement('div', { className: 'toast-title' }, title);
    contentDiv.appendChild(titleEl);
  }
  const msgEl = createElement('p', { className: 'toast-message' }, message);
  contentDiv.appendChild(msgEl);

  const closeBtn = createElement('button', {
    className: 'toast-close',
    'aria-label': 'Đóng',
    onclick: () => dismiss(),
  });
  closeBtn.innerHTML = `&times;`;

  toast.appendChild(iconDiv);
  toast.appendChild(contentDiv);
  toast.appendChild(closeBtn);
  cont.appendChild(toast);

  let timer = setTimeout(dismiss, duration);

  function dismiss() {
    clearTimeout(timer);
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  }

  return { dismiss };
}

