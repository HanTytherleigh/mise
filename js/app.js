import { init, flush } from './store.js';
import { setRefresher, pageHead, empty } from './ui.js';
import { homeView, dinnersView, dinnerFormView } from './views/home.js';
import { menuView, addDishView, libraryView } from './views/menu.js';
import { dishView, dishEditView, dinnerDishView } from './views/dish.js';
import { tasksView, taskFormView, timelineView, serviceView } from './views/tasks.js';
import { shoppingView, setShopGroup } from './views/shopping.js';
import { notesView, storageView, storageFormView, reviewView } from './views/notes.js';
import { settingsView } from './views/settings.js';

// Hash routes: [pattern, (match groups..., query) => view]
const routes = [
  [/^\/$/, () => homeView()],
  [/^\/dinners$/, () => dinnersView()],
  [/^\/dinner\/new$/, () => dinnerFormView(null)],
  [/^\/dinner\/([\w-]+)\/edit$/, (id) => dinnerFormView(id)],
  [/^\/menu$/, () => menuView()],
  [/^\/menu\/add$/, (q) => addDishView(q)],
  [/^\/dishes$/, () => libraryView()],
  [/^\/dish\/new$/, (q) => dishEditView(null, q)],
  [/^\/dish\/([\w-]+)\/edit$/, (id, q) => dishEditView(id, q)],
  [/^\/dish\/([\w-]+)$/, (id, q) => dishView(id, q)],
  [/^\/dd\/([\w-]+)$/, (id) => dinnerDishView(id)],
  [/^\/tasks$/, (q) => tasksView(q)],
  [/^\/task\/new$/, (q) => taskFormView(null, q)],
  [/^\/task\/([\w-]+)$/, (id, q) => taskFormView(id, q)],
  [/^\/timeline$/, () => timelineView()],
  [/^\/service$/, () => serviceView()],
  [/^\/shopping$/, (q) => { if (q.group) setShopGroup(q.group); return shoppingView(); }],
  [/^\/notes$/, (q) => notesView(q)],
  [/^\/storage$/, () => storageView()],
  [/^\/storage\/new$/, (q) => storageFormView(null, q)],
  [/^\/storage\/([\w-]+)$/, (id, q) => storageFormView(id, q)],
  [/^\/review$/, () => reviewView()],
  [/^\/settings$/, () => settingsView()],
];

const viewEl = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
let cleanup = null;

const notFound = () => ({
  tab: 'home',
  html: `${pageHead({ title: 'Not found', back: '/' })}${empty('That page has moved or been deleted.', '', '<a class="btn primary" href="#/">Home</a>')}`,
});

function render({ keepScroll = false } = {}) {
  const hash = location.hash.slice(1) || '/';
  const [path, qs] = hash.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  let view = null;
  for (const [re, fn] of routes) {
    const m = path.match(re);
    if (m) {
      view = fn(...m.slice(1), query);
      break;
    }
  }
  view ||= notFound();

  if (cleanup) { cleanup(); cleanup = null; }
  const y = window.scrollY;
  document.body.classList.toggle('bare', !!view.bare);
  viewEl.innerHTML = view.html;
  document.title = view.title ? `${view.title} · Mise` : 'Mise';
  for (const a of tabbar.querySelectorAll('a')) {
    const on = a.dataset.tab === view.tab;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  cleanup = view.mount?.(viewEl) || null;
  window.scrollTo(0, keepScroll ? y : 0);
}

setRefresher(() => render({ keepScroll: true }));
window.addEventListener('hashchange', () => render());
// Save straight away when the app is backgrounded or closed.
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
window.addEventListener('pagehide', () => flush());

await init();
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker not registered', err));
}
