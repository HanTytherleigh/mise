import {
  state, commit, currentDinner, sortedDinners, setCurrentDinner, find, dinnerDishes, newDinner,
  deleteDinner, duplicateDinner, toggleTask, todayStr, KINDS, DEFAULT_COURSES, PHASES,
} from '../store.js';
import { nextTask, progress, depsDone } from '../schedule.js';
import { shoppingList } from '../shopping.js';
import { loadSample } from '../sample.js';
import {
  esc, icon, pageHead, empty, go, on, toast, refresh, formData, fmtDate, relDays, fmtMinutes, daysUntil,
} from '../ui.js';

export function dinnerEyebrow(d) {
  const bits = [d.date ? fmtDate(d.date) : 'Date to be set', `${d.guests || '?'} guests`, `Serve ${d.serveTime || '—'}`];
  return bits.map(esc).join(' · ');
}

function welcome() {
  return {
    tab: 'home',
    html: `
      <section class="welcome">
        <p class="eyebrow">A chef's notebook</p>
        <h1 class="wordmark">Mise</h1>
        <p class="lede">Let the cook focus on cooking; let the notebook remember the logistics.</p>
        <a class="btn primary block" href="#/dinner/new">Plan a dinner</a>
        <button class="btn ghost block" data-act="sample">Explore with a sample dinner</button>
        <p class="small muted">Everything stays on this device. Back up from <a href="#/settings">Settings</a>.</p>
      </section>`,
    mount(root) {
      on(root, 'click', '[data-act="sample"]', () => {
        loadSample();
        commit();
        toast('Sample dinner added');
        refresh();
      });
    },
  };
}

function nextCard(t) {
  const dish = find('dishes', t.dishId);
  const phase = PHASES.find((p) => p.id === t.phase);
  const blocked = !depsDone(t);
  return `
    <section class="card next-card">
      <p class="eyebrow copper">Next up</p>
      <a class="next-title" href="#/task/${t.id}">${esc(t.title)}</a>
      <p class="meta">${[phase?.label, dish?.name, fmtMinutes(t.minutes), KINDS[t.kind]?.label].filter(Boolean).map(esc).join(' · ')}</p>
      ${blocked ? `<p class="meta warn">${icon('lock')} Waiting on another task</p>` : ''}
      <button class="btn primary" data-act="done" data-id="${t.id}">${icon('check')} Mark done</button>
    </section>`;
}

export function homeView() {
  const d = currentDinner();
  if (!d) return welcome();
  const prog = progress(d);
  const next = nextTask(d);
  const { items } = shoppingList(d);
  const toBuy = items.filter((i) => !i.have && !i.bought).length;
  const dds = dinnerDishes(d.id);
  const stored = state.storage.filter((s) => s.dinnerId === d.id && s.status === 'stored').length;
  const days = daysUntil(d.date);
  const lastBackup = state.settings.lastBackup;
  const backupStale = !lastBackup || Date.now() - lastBackup > 14 * 86400000;

  const courses = d.courses
    .map((c) => {
      const names = dds.filter((x) => x.course === c).map((x) => find('dishes', x.dishId)?.name).filter(Boolean);
      return names.length ? `<li><span class="course-label">${esc(c)}</span>${names.map(esc).join(', ')}</li>` : '';
    })
    .join('');

  let nextHtml;
  if (next) nextHtml = nextCard(next);
  else if (prog.total) nextHtml = `<section class="card next-card done-card"><p class="eyebrow copper">All prepared</p><p class="next-title">Every task is done. Enjoy the evening.</p></section>`;
  else nextHtml = `<section class="card next-card"><p class="eyebrow copper">Next up</p><p class="next-title">No tasks yet</p><p class="meta">Break each dish into steps you can do ahead.</p><a class="btn primary" href="#/task/new">${icon('plus')} Add a task</a></section>`;

  return {
    tab: 'home',
    title: d.name,
    html: `
      ${pageHead({
        eyebrow: dinnerEyebrow(d),
        title: d.name || 'Untitled dinner',
        sub: `${esc(relDays(d.date))} · <a href="#/dinner/${d.id}/edit">Edit details</a>`,
        actions: `<a class="icon-btn" href="#/dinners" aria-label="All dinners">${icon('book')}</a><a class="icon-btn" href="#/settings" aria-label="Settings and backup">${icon('gear')}</a>`,
      })}

      <section class="card">
        <div class="row between"><span class="label">Preparation</span><span class="num">${prog.done} of ${prog.total}</span></div>
        <div class="bar" role="progressbar" aria-valuenow="${prog.pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${prog.pct}%"></span></div>
        <div class="phase-mini">
          ${prog.phases.map((p) => `<a href="#/tasks?at=${p.id}"><strong>${p.done}/${p.total}</strong><span>${esc(p.label)}</span></a>`).join('')}
        </div>
      </section>

      ${nextHtml}

      <div class="tiles">
        <a class="tile" href="#/shopping">${icon('basket')}<strong>Shopping</strong><span>${toBuy ? `${toBuy} to buy` : items.length ? 'All sorted' : 'Empty'}</span></a>
        <a class="tile" href="#/timeline">${icon('clock')}<strong>Timeline</strong><span>Serve ${esc(d.serveTime || '—')}</span></a>
        <a class="tile" href="#/storage">${icon('box')}<strong>Storage</strong><span>${stored} stored</span></a>
        <a class="tile tile-accent" href="#/service">${icon('flame')}<strong>Service</strong><span>Cooking mode</span></a>
      </div>

      <section class="block">
        <div class="row between"><h2 class="section-title">Menu</h2><a class="text-link" href="#/menu">${dds.length ? 'Open' : 'Add dishes'}</a></div>
        ${courses ? `<ul class="menu-summary">${courses}</ul>` : '<p class="muted">No dishes yet.</p>'}
      </section>

      ${days != null && days <= 0 ? `<a class="card link-card" href="#/review"><strong>How did it go?</strong><span>Capture what worked, real timings and ideas for next time.</span>${icon('chev')}</a>` : ''}
      ${backupStale ? `<a class="card link-card subtle" href="#/settings"><strong>${lastBackup ? 'Time for a fresh backup' : 'Not backed up yet'}</strong><span>Your notebook lives only on this device.</span>${icon('chev')}</a>` : ''}
    `,
    mount(root) {
      on(root, 'click', '[data-act="done"]', (el) => {
        const t = toggleTask(el.dataset.id);
        commit();
        toast(`Done: ${t.title}`);
        refresh();
      });
    },
  };
}

export function dinnersView() {
  const all = sortedDinners();
  const cur = currentDinner();
  const row = (d) => `
    <button class="list-row ${cur?.id === d.id ? 'current' : ''}" data-act="pick" data-id="${d.id}">
      <span><strong>${esc(d.name || 'Untitled dinner')}</strong><small>${dinnerEyebrow(d)}</small></span>
      ${cur?.id === d.id ? '<span class="pill">Current</span>' : icon('chev')}
    </button>`;
  const today = todayStr();
  const upcoming = all.filter((d) => !d.date || d.date >= today);
  const past = all.filter((d) => d.date && d.date < today).reverse();
  return {
    tab: 'home',
    title: 'Dinners',
    html: `
      ${pageHead({ title: 'Dinners', back: '/', actions: `<a class="icon-btn" href="#/dinner/new" aria-label="New dinner">${icon('plus')}</a>` })}
      ${all.length ? '' : empty('No dinners yet', '', '<a class="btn primary" href="#/dinner/new">Plan a dinner</a>')}
      ${upcoming.length ? `<h2 class="section-title">Coming up</h2><div class="list">${upcoming.map(row).join('')}</div>` : ''}
      ${past.length ? `<h2 class="section-title">Past dinners</h2><div class="list">${past.map(row).join('')}</div>` : ''}
      <a class="btn ghost block" href="#/dinner/new">${icon('plus')} New dinner</a>`,
    mount(root) {
      on(root, 'click', '[data-act="pick"]', (el) => {
        setCurrentDinner(el.dataset.id);
        commit();
        go('/');
      });
    },
  };
}

export function dinnerFormView(id) {
  const d = id ? find('dinners', id) : null;
  if (id && !d) return null;
  const v = d || { name: '', date: '', serveTime: '19:30', guests: 6, courses: DEFAULT_COURSES, notes: '' };
  return {
    tab: 'home',
    title: d ? 'Edit dinner' : 'New dinner',
    html: `
      ${pageHead({ title: d ? 'Edit dinner' : 'New dinner', back: d ? '/' : '/dinners' })}
      <form class="form" data-form="dinner">
        <label class="field"><span>Name</span><input name="name" required value="${esc(v.name)}" placeholder="Autumn supper" autocomplete="off"></label>
        <div class="grid2">
          <label class="field"><span>Date</span><input type="date" name="date" value="${esc(v.date)}"></label>
          <label class="field"><span>Serving time</span><input type="time" name="serveTime" value="${esc(v.serveTime)}"></label>
        </div>
        <label class="field"><span>Guests</span><input type="number" name="guests" min="1" inputmode="numeric" value="${esc(v.guests)}"><small>Recipes scale to this unless a dish says otherwise.</small></label>
        <label class="field"><span>Courses</span><textarea name="courses" rows="4">${esc(v.courses.join('\n'))}</textarea><small>One per line, in serving order.</small></label>
        <label class="field"><span>Notes</span><textarea name="notes" rows="3" placeholder="Guests, allergies, the wine, the theme…">${esc(v.notes)}</textarea></label>
        <button class="btn primary block" type="submit">Save dinner</button>
      </form>
      ${d ? `
        <div class="danger-zone">
          <button class="btn ghost block" data-act="dup">Duplicate menu &amp; plan for another dinner</button>
          <button class="btn danger block" data-act="del">Delete this dinner</button>
        </div>` : ''}`,
    mount(root) {
      on(root, 'submit', '[data-form="dinner"]', (form, ev) => {
        ev.preventDefault();
        const f = formData(form);
        const patch = {
          name: f.name.trim(),
          date: f.date,
          serveTime: f.serveTime || '19:30',
          guests: Math.max(1, parseInt(f.guests, 10) || 1),
          courses: f.courses.split('\n').map((c) => c.trim()).filter(Boolean),
          notes: f.notes,
        };
        if (!patch.courses.length) patch.courses = [...DEFAULT_COURSES];
        const dinner = d ? Object.assign(d, patch) : newDinner(patch);
        setCurrentDinner(dinner.id);
        commit();
        toast('Dinner saved');
        go(d ? '/' : '/menu');
      });
      on(root, 'click', '[data-act="dup"]', () => {
        const copy = duplicateDinner(d.id);
        setCurrentDinner(copy.id);
        commit();
        toast('Duplicated — set a date');
        go(`/dinner/${copy.id}/edit`);
      });
      on(root, 'click', '[data-act="del"]', () => {
        if (!confirm(`Delete “${d.name}” with its tasks, storage notes and shopping list? Dishes stay in your notebook.`)) return;
        deleteDinner(d.id);
        commit();
        toast('Dinner deleted');
        go('/');
      });
    },
  };
}
