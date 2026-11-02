/**
 * DOM Helper Utilities
 */

export const $ = (selector, parent = document) => parent.querySelector(selector);
export const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

export function createElement(tag, attributes = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attributes)) {
    if (key === 'className') {
      el.className = val;
    } else if (key === 'dataset') {
      for (const [dKey, dVal] of Object.entries(val)) {
        el.dataset[dKey] = dVal;
      }
    } else if (key.startsWith('on') && typeof val === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (val !== undefined && val !== null) {
      el.setAttribute(key, val);
    }
  }
  for (const child of children.flat()) {
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }
  return el;
}

export function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function delegate(parent, eventType, selector, handler) {
  parent.addEventListener(eventType, (e) => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) {
      handler.call(target, e, target);
    }
  });
}

