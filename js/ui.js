// Small rendering helpers shared by the views.

import { fmtQty, fmtLine, scaled, unitLabel } from './ingredients.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const ICONS = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  chev: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  flame: '<path d="M12 21c-4 0-7-2.7-7-6.5 0-3.5 3-5.5 4-9 2 1.5 3 3.2 3 5 1-1 1.5-2 1.5-3.5C16 9 19 11.5 19 14.5 19 18.3 16 21 12 21z"/>',
  basket: '<path d="M3 9h18l-2 11H5z"/><path d="M8 9l4-6 4 6M9 13v3M15 13v3"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v7h14v-7"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  link: '<path d="M7 17 17 7M9 7h8v8"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
};

export const icon = (name, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

export function pageHead({ title = '', eyebrow = '', sub = '', back = null, actions = '' }) {
  return `
    <header class="page-head">
      <div class="page-bar">
        ${back ? `<a class="icon-btn" href="#${back}" aria-label="Back">${icon('back')}</a>` : '<span></span>'}
        <div class="page-actions">${actions}</div>
      </div>
      ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
      <h1>${esc(title)}</h1>
      ${sub ? `<p class="sub">${sub}</p>` : ''}
    </header>`;
}

export function segmented(items, active) {
  return `<nav class="seg" aria-label="Sections">${items
    .map(([id, label, href]) => `<a href="#${href}" class="${id === active ? 'on' : ''}">${esc(label)}</a>`)
    .join('')}</nav>`;
}

export const empty = (title, body = '', action = '') =>
  `<div class="empty"><p class="empty-title">${esc(title)}</p>${body ? `<p>${body}</p>` : ''}${action}</div>`;

export const go = (path) => { location.hash = `#${path}`; };

let refresher = () => {};
export const setRefresher = (fn) => { refresher = fn; };
export const refresh = () => refresher();

export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 1900);
}

export const formData = (form) => Object.fromEntries(new FormData(form));

// Delegated listener: on(root, 'click', '[data-act="x"]', (el, ev) => …)
export function on(root, type, selector, fn) {
  root.addEventListener(type, (ev) => {
    const el = ev.target.closest(selector);
    if (el && root.contains(el)) fn(el, ev);
  });
}

// ---------- dates & times ----------

export const parseDate = (s) => {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};

export function fmtDate(s, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const d = parseDate(s);
  return d ? d.toLocaleDateString('en-GB', opts) : '';
}

export function daysUntil(s) {
  const d = parseDate(s);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

export function relDays(s) {
  const n = daysUntil(s);
  if (n == null) return 'No date yet';
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}

export function fmtMinutes(m) {
  m = Math.round(Number(m) || 0);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export const fmtStamp = (ms) =>
  new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// ---------- recipes ----------

export function renderIngredients(list, factor = 1) {
  if (!list?.length) return '<p class="muted">No ingredients yet.</p>';
  return `<ul class="ings">${list
    .map((ing) => {
      if (ing.header) return `<li class="ing-head">${esc(ing.header)}</li>`;
      const s = scaled(ing, factor);
      const q = [fmtQty(s.qty, s.unit), unitLabel(s.unit, s.qty)].filter(Boolean).join(' ');
      return `<li><span class="q">${esc(q)}</span><span>${esc(s.name)}${s.note ? `<span class="muted">, ${esc(s.note)}</span>` : ''}</span></li>`;
    })
    .join('')}</ul>`;
}

export const ingredientsText = (list) => (list || []).map(fmtLine).join('\n');

export function renderMethod(text) {
  const steps = String(text || '')
    .split(/\n+/)
    .map((s) => s.trim().replace(/^\d+[.)]\s*/, ''))
    .filter(Boolean);
  if (!steps.length) return '<p class="muted">No method yet.</p>';
  return `<ol class="method">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
}

export const prose = (text) =>
  text ? `<div class="prose">${esc(text).replace(/\n/g, '<br>')}</div>` : '';

// Downscale a photo so the notebook (and its backups) stay a sensible size.
export function compressImage(file, maxSide = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')); };
    img.src = url;
  });
}
