import {
  state, commit, currentDinner, find, dinnerTasks, dinnerDishes, newTask, deleteTask, toggleTask, dependents,
  isDone, PHASES, KINDS,
} from '../store.js';
import { schedule, toClock, depsDone } from '../schedule.js';
import {
  esc, icon, pageHead, segmented, empty, go, on, toast, refresh, formData, fmtMinutes, fmtDate,
} from '../ui.js';

const EQUIPMENT = ['Oven', 'Hob', 'Grill', 'Fridge', 'Freezer', 'Stand mixer', 'Food processor', 'Blender', 'BBQ', 'Microwave'];

const noDinner = (tab) => ({
  tab,
  html: `${pageHead({ title: 'Preparation' })}${empty('No dinner yet', 'Plan a dinner first, then break it into tasks.', '<a class="btn primary" href="#/dinner/new">Plan a dinner</a>')}`,
});

function taskRow(t, opts = {}) {
  const dish = find('dishes', t.dishId);
  const waiting = !isDone(t) && !depsDone(t);
  const meta = [
    opts.time,
    dish?.name,
    fmtMinutes(t.minutes),
    t.deadline && t.phase !== 'dayof' ? `by ${fmtDate(t.deadline)}` : '',
    (t.equipment || []).join(', '),
  ].filter(Boolean);
  return `
    <div class="task ${isDone(t) ? 'done' : ''} ${waiting ? 'waiting' : ''}">
      <button class="check" data-act="toggle" data-id="${t.id}" aria-label="${isDone(t) ? 'Mark not done' : 'Mark done'}">${icon('check')}</button>
      <a class="task-body" href="#/task/${t.id}">
        <strong>${esc(t.title)}</strong>
        <small>${meta.map(esc).join(' · ')}</small>
        ${waiting ? `<small class="warn">${icon('lock')} After ${esc(t.deps.map((id) => find('tasks', id)).filter((x) => x && !isDone(x)).map((x) => x.title).join(', '))}</small>` : ''}
      </a>
    </div>`;
}

const toggleHandler = (root) => on(root, 'click', '[data-act="toggle"]', (el) => {
  toggleTask(el.dataset.id);
  commit();
  refresh();
});

export function tasksView(query) {
  const d = currentDinner();
  if (!d) return noDinner('tasks');
  const tasks = dinnerTasks(d.id);
  const hideDone = state.settings.hideDone;
  const sched = schedule(d);
  const startById = new Map(sched.items.map((x) => [x.task.id, x.start]));
  const sortPhase = (list, phase) => list.sort((a, b) => phase === 'dayof'
    ? (startById.get(a.id) ?? 0) - (startById.get(b.id) ?? 0)
    : (a.deadline || '9999').localeCompare(b.deadline || '9999') || a.createdAt - b.createdAt);

  return {
    tab: 'tasks',
    title: 'Tasks',
    html: `
      ${pageHead({
        eyebrow: esc(d.name),
        title: 'Preparation',
        actions: `<a class="icon-btn" href="#/task/new" aria-label="New task">${icon('plus')}</a>`,
      })}
      ${segmented([['plan', 'Plan', '/tasks'], ['timeline', 'Timeline', '/timeline']], 'plan')}
      <label class="switch"><input type="checkbox" data-act="hide-done" ${hideDone ? 'checked' : ''}><span>Hide done</span></label>
      ${PHASES.map((p) => {
        const all = tasks.filter((t) => t.phase === p.id);
        const shown = sortPhase(all.filter((t) => !hideDone || !isDone(t)), p.id);
        return `
          <section class="phase" id="phase-${p.id}">
            <div class="row between"><h2 class="section-title">${esc(p.label)}</h2><span class="num">${all.filter(isDone).length}/${all.length}</span></div>
            <p class="small muted">${esc(p.hint)}</p>
            <div class="tasks">${shown.map((t) => taskRow(t, { time: p.id === 'dayof' ? toClock(startById.get(t.id)) : '' })).join('')}</div>
            <a class="add-row" href="#/task/new?phase=${p.id}">${icon('plus')} Add task</a>
          </section>`;
      }).join('')}`,
    mount(root) {
      toggleHandler(root);
      on(root, 'change', '[data-act="hide-done"]', (el) => {
        state.settings.hideDone = el.checked;
        commit();
        refresh();
      });
      if (query.at) root.querySelector(`#phase-${CSS.escape(query.at)}`)?.scrollIntoView();
    },
  };
}

export function taskFormView(id, query) {
  const d = currentDinner();
  const t = id ? find('tasks', id) : null;
  if (id && !t) return null;
  const dinner = t ? find('dinners', t.dinnerId) : d;
  if (!dinner) return noDinner('tasks');
  const v = t || {
    title: '', phase: query.phase || 'dayof', kind: 'prep', minutes: 15, active: true, deadline: '', fixedStart: '',
    doneBy: '', deps: [], equipment: [], notes: '', dishId: query.dish || '', status: 'todo', actualMinutes: null,
  };
  const dishes = dinnerDishes(dinner.id).map((x) => find('dishes', x.dishId)).filter(Boolean);
  const blocked = t ? dependents(t.id, dinnerTasks(dinner.id)) : new Set();
  const others = dinnerTasks(dinner.id).filter((x) => x.id !== t?.id && !blocked.has(x.id));
  const suggested = t && t.phase === 'dayof' ? schedule(dinner).items.find((x) => x.task.id === t.id) : null;

  return {
    tab: 'tasks',
    title: t ? 'Edit task' : 'New task',
    html: `
      ${pageHead({ eyebrow: esc(dinner.name), title: t ? 'Edit task' : 'New task', back: '/tasks' })}
      <form class="form" data-form="task">
        <label class="field"><span>Task</span><input name="title" required value="${esc(v.title)}" placeholder="Make the stock" autocomplete="off"></label>
        <fieldset class="field"><legend>When</legend>
          <div class="seg-input">${PHASES.map((p) => `<label><input type="radio" name="phase" value="${p.id}" ${v.phase === p.id ? 'checked' : ''}><span>${esc(p.label)}</span></label>`).join('')}</div>
        </fieldset>
        <div class="grid2">
          <label class="field"><span>Dish</span><select name="dishId"><option value="">— None —</option>${dishes.map((x) => `<option value="${x.id}" ${x.id === v.dishId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
          <label class="field"><span>Type</span><select name="kind">${Object.entries(KINDS).map(([k, x]) => `<option value="${k}" ${k === v.kind ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></label>
        </div>
        <div class="grid2">
          <label class="field"><span>Takes (minutes)</span><input type="number" name="minutes" min="0" inputmode="numeric" value="${esc(v.minutes)}"></label>
          <label class="check-field"><input type="checkbox" name="active" ${v.active ? 'checked' : ''}><span>Needs my hands<small>Untick for resting, chilling, slow oven time</small></span></label>
        </div>

        <div data-when="ahead" ${v.phase === 'dayof' ? 'hidden' : ''}>
          <label class="field"><span>Do by</span><input type="date" name="deadline" value="${esc(v.deadline)}"></label>
        </div>
        <div data-when="dayof" ${v.phase === 'dayof' ? '' : 'hidden'}>
          <div class="grid2">
            <label class="field"><span>Start at</span><input type="time" name="fixedStart" value="${esc(v.fixedStart)}"><small>Leave empty to work it out</small></label>
            <label class="field"><span>Done by</span><input type="time" name="doneBy" value="${esc(v.doneBy)}"><small>Default: serving (${esc(dinner.serveTime)})</small></label>
          </div>
          ${suggested && !v.fixedStart ? `<p class="small muted">${icon('clock')} Suggested: ${toClock(suggested.start)}–${toClock(suggested.end)}</p>` : ''}
        </div>

        <fieldset class="field"><legend>Equipment</legend>
          <input name="equipment" value="${esc((v.equipment || []).join(', '))}" placeholder="Oven, Stand mixer">
          <div class="chips">${EQUIPMENT.map((e) => `<button type="button" class="chip" data-act="eq" data-v="${e}">${e}</button>`).join('')}</div>
        </fieldset>

        ${others.length ? `
          <fieldset class="field"><legend>Do after</legend>
            <div class="dep-list">${others.map((o) => `
              <label class="check-field"><input type="checkbox" name="deps" value="${o.id}" ${(v.deps || []).includes(o.id) ? 'checked' : ''}><span>${esc(o.title)}<small>${esc(PHASES.find((p) => p.id === o.phase)?.label)}</small></span></label>`).join('')}
            </div>
          </fieldset>` : ''}

        <label class="field"><span>Notes</span><textarea name="notes" rows="3" placeholder="Temperatures, cues, what to watch for">${esc(v.notes)}</textarea></label>

        <details class="field"${v.actualMinutes ? ' open' : ''}><summary>After the dinner</summary>
          <label class="field"><span>Actually took (minutes)</span><input type="number" name="actualMinutes" min="0" inputmode="numeric" value="${esc(v.actualMinutes ?? '')}"></label>
        </details>

        <label class="check-field"><input type="checkbox" name="done" ${v.status === 'done' ? 'checked' : ''}><span>Done</span></label>
        ${t ? '' : '<label class="check-field"><input type="checkbox" name="addStorage"><span>Add a storage note after saving<small>For things made ahead and kept</small></span></label>'}
        <button class="btn primary block" type="submit">Save task</button>
      </form>
      ${t ? `<div class="danger-zone">
        <a class="btn ghost block" href="#/storage/new?task=${t.id}">${icon('box')} Add a storage note</a>
        <button class="btn danger block" data-act="delete">Delete task</button></div>` : ''}`,
    mount(root) {
      const form = root.querySelector('[data-form="task"]');
      on(root, 'change', 'input[name="phase"]', (el) => {
        root.querySelector('[data-when="dayof"]').hidden = el.value !== 'dayof';
        root.querySelector('[data-when="ahead"]').hidden = el.value === 'dayof';
      });
      on(root, 'change', 'select[name="kind"]', (el) => {
        form.active.checked = KINDS[el.value]?.active ?? true;
      });
      on(root, 'click', '[data-act="eq"]', (el) => {
        const list = form.equipment.value.split(',').map((x) => x.trim()).filter(Boolean);
        const i = list.findIndex((x) => x.toLowerCase() === el.dataset.v.toLowerCase());
        if (i >= 0) list.splice(i, 1); else list.push(el.dataset.v);
        form.equipment.value = list.join(', ');
      });
      on(root, 'submit', '[data-form="task"]', (f, ev) => {
        ev.preventDefault();
        const data = formData(f);
        const done = !!data.done;
        const patch = {
          title: data.title.trim(),
          phase: data.phase,
          dishId: data.dishId || null,
          kind: data.kind,
          minutes: Math.max(0, parseInt(data.minutes, 10) || 0),
          active: !!data.active,
          deadline: data.deadline || '',
          fixedStart: data.fixedStart || '',
          doneBy: data.doneBy || '',
          equipment: data.equipment.split(',').map((x) => x.trim()).filter(Boolean),
          deps: new FormData(f).getAll('deps'),
          notes: data.notes,
          actualMinutes: parseInt(data.actualMinutes, 10) || null,
        };
        const task = t ? Object.assign(t, patch) : newTask({ ...patch, dinnerId: dinner.id });
        if (done !== isDone(task)) toggleTask(task.id);
        commit();
        toast('Task saved');
        go(data.addStorage ? `/storage/new?task=${task.id}` : '/tasks');
      });
      on(root, 'click', '[data-act="delete"]', () => {
        if (!confirm(`Delete “${t.title}”?`)) return;
        deleteTask(t.id);
        commit();
        go('/tasks');
      });
    },
  };
}

export function timelineView() {
  const d = currentDinner();
  if (!d) return noDinner('tasks');
  const { serve, items, conflicts } = schedule(d);
  const earlier = dinnerTasks(d.id).filter((t) => t.phase !== 'dayof' && !isDone(t)).length;
  const kindIcon = { rest: 'clock', chill: 'clock', cook: 'flame', reheat: 'flame' };

  let servePlaced = false;
  const rows = [];
  const serveRow = `<div class="tl-serve"><span class="tl-time">${toClock(serve)}</span><span>Service</span></div>`;
  for (const it of items) {
    if (!servePlaced && it.start >= serve) { rows.push(serveRow); servePlaced = true; }
    const t = it.task;
    const dish = find('dishes', t.dishId);
    rows.push(`
      <a class="tl-item ${isDone(t) ? 'done' : ''} ${it.warnings.length ? 'warned' : ''} ${t.active === false ? 'passive' : ''}" href="#/task/${t.id}">
        <span class="tl-time">${toClock(it.start)}<small>${toClock(it.end)}</small></span>
        <span class="tl-body">
          <strong>${it.warnings.length ? icon('alert', 'warn') : ''}${esc(t.title)}</strong>
          <small>${[KINDS[t.kind]?.label, dish?.name, fmtMinutes(t.minutes), ...(t.equipment || []), it.fixed ? 'fixed time' : ''].filter(Boolean).map(esc).join(' · ')}</small>
        </span>
        ${icon(kindIcon[t.kind] || 'chev')}
      </a>`);
  }
  if (!servePlaced) rows.push(serveRow);

  return {
    tab: 'tasks',
    title: 'Timeline',
    html: `
      ${pageHead({
        eyebrow: esc(d.name),
        title: 'Service timeline',
        sub: `Worked back from serving at <strong>${esc(d.serveTime)}</strong>. Set a start or “done by” time on any task to adjust.`,
        actions: `<a class="icon-btn" href="#/task/new?phase=dayof" aria-label="New task">${icon('plus')}</a>`,
      })}
      ${segmented([['plan', 'Plan', '/tasks'], ['timeline', 'Timeline', '/timeline']], 'timeline')}
      ${conflicts.length ? `<section class="card warn-card"><p class="label">${icon('alert')} ${conflicts.length} thing${conflicts.length > 1 ? 's' : ''} to check</p><ul>${conflicts.map((c) => `<li>${esc(c.text)}</li>`).join('')}</ul></section>` : ''}
      ${items.length ? `<div class="timeline">${rows.join('')}</div>` : empty('Nothing on the day yet', 'Add “On the day” tasks and they will line up here.', '<a class="btn primary" href="#/task/new?phase=dayof">Add a task</a>')}
      ${earlier ? `<p class="small muted">${earlier} task${earlier > 1 ? 's' : ''} still to do before the day — see <a href="#/tasks">Plan</a>.</p>` : ''}
      <a class="btn copper block" href="#/service">${icon('play')} Start service mode</a>`,
  };
}

// Full-screen, large-target checklist for the day itself.
export function serviceView() {
  const d = currentDinner();
  if (!d) return noDinner('tasks');
  const { serve, items } = schedule(d);
  const nowMins = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
  const now = nowMins();
  const todo = items.filter((x) => !isDone(x.task));
  const done = items.filter((x) => isDone(x.task));
  const firstTodo = todo[0];

  const storageFor = (t) => state.storage.filter((s) => s.dinnerId === d.id && s.status !== 'used'
    && ((s.taskId && s.taskId === t.id) || (!s.taskId && s.dishId && s.dishId === t.dishId)));

  const item = (x) => {
    const t = x.task;
    const dish = find('dishes', t.dishId);
    const late = !isDone(t) && x.start < now;
    const stores = storageFor(t);
    return `
      <li class="svc-item ${isDone(t) ? 'done' : ''} ${late ? 'late' : ''} ${x === firstTodo ? 'now' : ''}">
        <button class="svc-check" data-act="toggle" data-id="${t.id}" aria-label="${isDone(t) ? 'Undo' : 'Done'}">${icon('check')}</button>
        <div class="svc-body">
          <p class="svc-time">${toClock(x.start)} · ${esc(fmtMinutes(t.minutes))}${t.active === false ? ' · hands free' : ''}</p>
          <p class="svc-title">${esc(t.title)}</p>
          ${dish || t.equipment?.length ? `<p class="svc-meta">${esc([dish?.name, ...(t.equipment || [])].filter(Boolean).join(' · '))}</p>` : ''}
          ${t.notes ? `<p class="svc-notes">${esc(t.notes)}</p>` : ''}
          ${stores.map((s) => `<p class="svc-store">${icon('box')} ${esc([s.item, s.location, s.container].filter(Boolean).join(' — '))}${s.finishing ? `<br><span>${esc(s.finishing)}</span>` : ''}</p>`).join('')}
        </div>
      </li>`;
  };

  const countdown = () => {
    const diff = serve - nowMins();
    if (diff > 0) return `Serve in <strong>${esc(fmtMinutes(diff))}</strong> · ${toClock(serve)}`;
    if (diff === 0) return '<strong>Service!</strong>';
    return `Serving since ${toClock(serve)}`;
  };

  return {
    tab: 'tasks',
    bare: true,
    title: 'Service',
    html: `
      <div class="service">
        <header class="svc-head">
          <a class="svc-exit" href="#/timeline">${icon('x')}<span>Exit</span></a>
          <span class="svc-clock" data-clock>${toClock(now)}</span>
        </header>
        <p class="svc-name">${esc(d.name)}</p>
        <p class="svc-count" data-countdown>${countdown()}</p>
        <p class="svc-progress">${done.length} of ${items.length} done</p>
        ${items.length ? '' : '<p class="svc-empty">No “On the day” tasks yet. Add them in Tasks and they will appear here in order.</p>'}
        <ol class="svc-list">${todo.map(item).join('')}</ol>
        ${done.length ? `<details class="svc-done"><summary>Done (${done.length})</summary><ol class="svc-list">${done.map(item).join('')}</ol></details>` : ''}
        ${items.length && !todo.length ? '<p class="svc-empty">Everything is done. Go and enjoy it.</p>' : ''}
      </div>`,
    mount(root) {
      on(root, 'click', '[data-act="toggle"]', (el) => {
        const t = toggleTask(el.dataset.id);
        commit();
        if (navigator.vibrate) navigator.vibrate(15);
        if (t && isDone(t)) toast(`Done: ${t.title}`);
        refresh();
      });
      const tick = () => {
        const c = root.querySelector('[data-clock]');
        if (c) c.textContent = toClock(nowMins());
        const cd = root.querySelector('[data-countdown]');
        if (cd) cd.innerHTML = countdown();
      };
      const timer = setInterval(tick, 15000);
      // Keep the screen awake while cooking, where supported.
      let lock = null;
      const acquire = async () => {
        try { lock = await navigator.wakeLock?.request('screen'); } catch { lock = null; }
      };
      const onVisible = () => { if (document.visibilityState === 'visible') { acquire(); tick(); } };
      acquire();
      document.addEventListener('visibilitychange', onVisible);
      return () => {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisible);
        lock?.release?.().catch(() => {});
      };
    },
  };
}

