import {
  state, commit, currentDinner, find, dinnerDishes, dinnerTasks, newLog, newStorage, promoteLog, todayStr,
  LOG_KINDS, STORAGE_STATUS,
} from '../store.js';
import {
  esc, icon, pageHead, segmented, empty, go, on, toast, refresh, formData, fmtStamp, fmtDate, prose,
} from '../ui.js';

const LOCATIONS = ['Fridge', 'Freezer', 'Larder', 'Worktop', 'Cool box', 'Garage fridge'];

const tabsFor = (active) => segmented([
  ['notes', 'Notes', '/notes'], ['storage', 'Storage', '/storage'], ['review', 'Review', '/review'],
], active);

const dishOptions = (d, selected) => {
  const dishes = d ? dinnerDishes(d.id).map((x) => find('dishes', x.dishId)).filter(Boolean) : state.dishes;
  return `<option value="">No dish</option>${dishes.map((x) => `<option value="${x.id}" ${x.id === selected ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}`;
};

function noteCard(l, d) {
  const dish = find('dishes', l.dishId);
  const dinner = find('dinners', l.dinnerId);
  return `
    <article class="note" data-id="${l.id}">
      <p class="note-meta"><span class="pill">${esc(LOG_KINDS[l.kind] || 'Note')}</span>${dish ? ` ${esc(dish.name)} ·` : ''} ${esc(fmtStamp(l.createdAt))}${dinner && dinner.id !== d?.id ? ` · ${esc(dinner.name)}` : ''}</p>
      ${prose(l.text)}
      <details class="note-more">
        <summary>Options</summary>
        <div class="grid2">
          <label class="field"><span>Kind</span><select data-f="kind">${Object.entries(LOG_KINDS).map(([k, label]) => `<option value="${k}" ${k === l.kind ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
          <label class="field"><span>Dish</span><select data-f="dishId">${dishOptions(d, l.dishId)}</select></label>
        </div>
        <div class="row gap">
          ${dish ? (l.promoted ? '<span class="ok small">Added to my version</span>' : `<button class="btn ghost small" data-act="promote">${icon('up')} Add to my version of ${esc(dish.name)}</button>`) : '<span class="small muted">Link a dish to keep this in its recipe.</span>'}
          <button class="btn ghost small danger-text" data-act="delete-log">Delete</button>
        </div>
      </details>
    </article>`;
}

function bindNotes(root) {
  const logOf = (el) => find('logs', el.closest('[data-id]').dataset.id);
  on(root, 'change', '.note [data-f]', (el) => {
    const l = logOf(el);
    l[el.dataset.f] = el.value || (el.dataset.f === 'dishId' ? null : 'note');
    commit();
    refresh();
  });
  on(root, 'click', '[data-act="promote"]', (el) => {
    const dish = promoteLog(logOf(el).id);
    commit();
    toast(`Added to ${dish.name}`);
    refresh();
  });
  on(root, 'click', '[data-act="delete-log"]', (el) => {
    if (!confirm('Delete this note?')) return;
    const id = logOf(el).id;
    state.logs = state.logs.filter((x) => x.id !== id);
    commit();
    refresh();
  });
}

export function notesView(query) {
  const d = currentDinner();
  const showAll = query.all === '1' || !d;
  const logs = state.logs.filter((l) => showAll || l.dinnerId === d.id || !l.dinnerId);
  return {
    tab: 'notes',
    title: 'Notes',
    html: `
      ${pageHead({ eyebrow: esc(d?.name || 'Notebook'), title: 'Notes' })}
      ${d ? tabsFor('notes') : ''}
      <form class="capture" data-form="capture">
        <textarea name="text" rows="3" required placeholder="Jot it down — a thought, a tweak, a timing…"></textarea>
        <div class="row gap">
          <select name="dishId" aria-label="Link to a dish">${dishOptions(d, '')}</select>
          <button class="btn primary" type="submit">Save</button>
        </div>
      </form>
      ${d ? `<p class="small"><a href="#/notes${showAll ? '' : '?all=1'}">${showAll ? 'Only this dinner' : 'Show notes from every dinner'}</a></p>` : ''}
      ${logs.length ? logs.map((l) => noteCard(l, d)).join('') : empty('No notes yet', 'Quick thoughts land here. Sort them out later, or never.')}`,
    mount(root) {
      bindNotes(root);
      on(root, 'submit', '[data-form="capture"]', (form, ev) => {
        ev.preventDefault();
        const f = formData(form);
        if (!f.text.trim()) return;
        newLog({ text: f.text.trim(), dishId: f.dishId || null, dinnerId: d?.id || null });
        commit();
        toast('Noted');
        refresh();
      });
    },
  };
}

export function storageView() {
  const d = currentDinner();
  if (!d) return { tab: 'notes', html: `${pageHead({ title: 'Storage' })}${empty('No dinner yet')}` };
  const list = state.storage.filter((s) => s.dinnerId === d.id);
  const card = (s) => {
    const dish = find('dishes', s.dishId);
    const lines = [
      ['Storage', s.instructions], ['Cooling', s.cooling], ['Defrosting', s.defrost], ['To finish', s.finishing],
    ].filter(([, v]) => v);
    return `
      <article class="card store-card" data-id="${s.id}">
        <div class="row between">
          <a href="#/storage/${s.id}" class="store-title"><strong>${esc(s.item || dish?.name || 'Untitled')}</strong>
            <small>${esc([dish?.name !== s.item ? dish?.name : '', s.location, s.container].filter(Boolean).join(' · '))}</small></a>
          <button class="pill status-${s.status}" data-act="cycle">${esc(STORAGE_STATUS[s.status])}</button>
        </div>
        ${s.preparedOn ? `<p class="small muted">Prepared ${esc(fmtDate(s.preparedOn))}</p>` : ''}
        ${lines.length ? `<dl class="store-lines">${lines.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
      </article>`;
  };
  return {
    tab: 'notes',
    title: 'Storage',
    html: `
      ${pageHead({ eyebrow: esc(d.name), title: 'Storage', actions: `<a class="icon-btn" href="#/storage/new" aria-label="New storage note">${icon('plus')}</a>` })}
      ${tabsFor('storage')}
      <p class="small muted">What's made, where it lives, and what it needs before it's served. Tap the status to move it along.</p>
      ${list.length ? Object.keys(STORAGE_STATUS).map((st) => {
        const group = list.filter((s) => s.status === st);
        return group.length ? `<h2 class="section-title">${STORAGE_STATUS[st]}</h2>${group.map(card).join('')}` : '';
      }).join('') : empty('Nothing stored yet', 'Note things you make ahead — the container, where it is, and how to finish it.', '<a class="btn primary" href="#/storage/new">Add a storage note</a>')}
      <p class="small muted disclaimer">Mise keeps your own notes; it doesn't work out food-safety times. Follow your recipe source and current food-safety guidance.</p>`,
    mount(root) {
      on(root, 'click', '[data-act="cycle"]', (el) => {
        const s = find('storage', el.closest('[data-id]').dataset.id);
        const order = Object.keys(STORAGE_STATUS);
        s.status = order[(order.indexOf(s.status) + 1) % order.length];
        if (s.status === 'stored' && !s.preparedOn) s.preparedOn = todayStr();
        commit();
        refresh();
      });
    },
  };
}

export function storageFormView(id, query) {
  const s = id ? find('storage', id) : null;
  if (id && !s) return null;
  const d = s ? find('dinners', s.dinnerId) : currentDinner();
  if (!d) return null;
  const task = find('tasks', s?.taskId || query.task);
  const dishId = s?.dishId || query.dish || task?.dishId || '';
  const v = s || {
    item: task?.title.replace(/^(make|prepare|prep|cook)\s+/i, '') || find('dishes', dishId)?.name || '',
    container: '', location: '', preparedOn: '', instructions: '', defrost: '', cooling: '', finishing: '', status: 'planned',
  };
  const tasks = dinnerTasks(d.id);
  return {
    tab: 'notes',
    title: s ? 'Storage note' : 'New storage note',
    html: `
      ${pageHead({ eyebrow: esc(d.name), title: s ? 'Storage note' : 'New storage note', back: '/storage' })}
      <form class="form" data-form="storage">
        <label class="field"><span>What</span><input name="item" required value="${esc(v.item)}" placeholder="Chicken stock"></label>
        <div class="grid2">
          <label class="field"><span>Dish</span><select name="dishId">${dishOptions(d, dishId)}</select></label>
          <label class="field"><span>Task</span><select name="taskId"><option value="">None</option>${tasks.map((t) => `<option value="${t.id}" ${t.id === task?.id ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select></label>
        </div>
        <div class="grid2">
          <label class="field"><span>Container</span><input name="container" value="${esc(v.container)}" placeholder="Blue 1 l tub"></label>
          <label class="field"><span>Where</span><input name="location" list="loc-list" value="${esc(v.location)}" placeholder="Fridge, top shelf"></label>
        </div>
        <datalist id="loc-list">${LOCATIONS.map((x) => `<option value="${x}">`).join('')}</datalist>
        <div class="grid2">
          <label class="field"><span>Prepared on</span><input type="date" name="preparedOn" value="${esc(v.preparedOn)}"></label>
          <label class="field"><span>Status</span><select name="status">${Object.entries(STORAGE_STATUS).map(([k, label]) => `<option value="${k}" ${k === v.status ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
        </div>
        <label class="field"><span>Storage instructions</span><textarea name="instructions" rows="2" placeholder="Covered, away from raw meat">${esc(v.instructions)}</textarea></label>
        <label class="field"><span>Cooling</span><textarea name="cooling" rows="2" placeholder="How you cool it before storing">${esc(v.cooling)}</textarea></label>
        <label class="field"><span>Defrosting</span><textarea name="defrost" rows="2" placeholder="When and how to defrost">${esc(v.defrost)}</textarea></label>
        <label class="field"><span>To finish</span><textarea name="finishing" rows="2" placeholder="Reheat, re-crisp, dress, garnish…">${esc(v.finishing)}</textarea></label>
        <p class="small muted">Use your recipe source's guidance for storage times and temperatures — Mise doesn't assume any.</p>
        <button class="btn primary block" type="submit">Save</button>
      </form>
      ${s ? '<div class="danger-zone"><button class="btn danger block" data-act="delete">Delete storage note</button></div>' : ''}`,
    mount(root) {
      on(root, 'submit', '[data-form="storage"]', (form, ev) => {
        ev.preventDefault();
        const f = formData(form);
        const patch = { ...f, item: f.item.trim(), dishId: f.dishId || null, taskId: f.taskId || null };
        if (patch.status === 'stored' && !patch.preparedOn) patch.preparedOn = todayStr();
        if (s) Object.assign(s, patch);
        else newStorage({ ...patch, dinnerId: d.id });
        commit();
        toast('Saved');
        go('/storage');
      });
      on(root, 'click', '[data-act="delete"]', () => {
        if (!confirm('Delete this storage note?')) return;
        state.storage = state.storage.filter((x) => x.id !== s.id);
        commit();
        go('/storage');
      });
    },
  };
}

export function reviewView() {
  const d = currentDinner();
  if (!d) return { tab: 'notes', html: `${pageHead({ title: 'Review' })}${empty('No dinner yet')}` };
  const logs = state.logs.filter((l) => l.dinnerId === d.id);
  const tasks = dinnerTasks(d.id).filter((t) => t.minutes || t.actualMinutes);
  const sections = [
    ['worked', 'What worked', 'The lamb rested perfectly under foil'],
    ['substitution', 'Substitutions', 'Used crème fraîche instead of double cream'],
    ['timing', 'Timings', 'Potatoes needed 10 minutes longer'],
    ['next', 'Next time', 'Start the gougères earlier'],
  ];
  return {
    tab: 'notes',
    title: 'Review',
    html: `
      ${pageHead({ eyebrow: esc(d.name), title: 'After the dinner' })}
      ${tabsFor('review')}
      <p class="small muted">Capture it while it's fresh. Link a note to a dish and you can add it to your version of the recipe.</p>
      ${sections.map(([kind, label, ph]) => `
        <section class="block">
          <h2 class="section-title">${label}</h2>
          ${logs.filter((l) => l.kind === kind).map((l) => noteCard(l, d)).join('')}
          <form class="inline-form review-add" data-form="review" data-kind="${kind}">
            <input name="text" placeholder="${esc(ph)}" autocomplete="off" required>
            <select name="dishId" aria-label="Dish">${dishOptions(d, '')}</select>
            <button class="btn primary" type="submit">${icon('plus')}<span class="sr">Add</span></button>
          </form>
        </section>`).join('')}
      ${tasks.length ? `
        <section class="block">
          <h2 class="section-title">Actual timings</h2>
          <div class="timings">
            <div class="timings-head"><span>Task</span><span>Planned</span><span>Actual</span></div>
            ${tasks.map((t) => `
              <label class="timings-row"><span>${esc(t.title)}</span><span>${t.minutes || 0} min</span>
                <input type="number" min="0" inputmode="numeric" data-task="${t.id}" value="${esc(t.actualMinutes ?? '')}" placeholder="—"></label>`).join('')}
          </div>
        </section>` : ''}`,
    mount(root) {
      bindNotes(root);
      on(root, 'submit', '[data-form="review"]', (form, ev) => {
        ev.preventDefault();
        const f = formData(form);
        if (!f.text.trim()) return;
        newLog({ text: f.text.trim(), kind: form.dataset.kind, dishId: f.dishId || null, dinnerId: d.id });
        commit();
        refresh();
      });
      on(root, 'change', '[data-task]', (el) => {
        const t = find('tasks', el.dataset.task);
        t.actualMinutes = parseInt(el.value, 10) || null;
        commit();
        toast('Saved');
      });
    },
  };
}
