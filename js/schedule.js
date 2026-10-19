// Working backwards from the serving time: suggested start times for on-the-day tasks,
// the next recommended task, and overlap / equipment warnings.

import { dinnerTasks, find, isDone, KINDS, PHASES } from './store.js';

export const toMins = (hhmm) => {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})/);
  return m ? +m[1] * 60 + +m[2] : null;
};

export const toClock = (mins) => {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

const needsHands = (t) => t.active ?? KINDS[t.kind]?.active ?? true;

// Each on-the-day task gets a start and end (minutes after midnight).
// - A fixed start time always wins.
// - Otherwise a task finishes by its "done by" time (default: serving time), or earlier if
//   another task depends on it — it must then finish before that task starts.
export function schedule(dinner) {
  const serve = toMins(dinner.serveTime) ?? 19 * 60 + 30;
  const tasks = dinnerTasks(dinner.id).filter((t) => t.phase === 'dayof');
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const dependentsOf = new Map();
  for (const t of tasks) {
    for (const d of t.deps || []) {
      if (!byId.has(d)) continue;
      if (!dependentsOf.has(d)) dependentsOf.set(d, []);
      dependentsOf.get(d).push(t);
    }
  }

  const starts = new Map();
  const visiting = new Set();
  const startOf = (t) => {
    if (starts.has(t.id)) return starts.get(t.id);
    const dur = Number(t.minutes) || 0;
    let start;
    if (toMins(t.fixedStart) != null) {
      start = toMins(t.fixedStart);
    } else if (visiting.has(t.id)) {
      start = serve - dur; // dependency loop: fall back rather than recurse forever
    } else {
      visiting.add(t.id);
      let finish = toMins(t.doneBy) ?? serve;
      for (const dep of dependentsOf.get(t.id) || []) finish = Math.min(finish, startOf(dep));
      visiting.delete(t.id);
      start = finish - dur;
    }
    starts.set(t.id, start);
    return start;
  };

  const items = tasks.map((t) => {
    const start = startOf(t);
    return { task: t, start, end: start + (Number(t.minutes) || 0), fixed: toMins(t.fixedStart) != null, warnings: [] };
  });
  items.sort((a, b) => a.start - b.start || a.end - b.end);

  const conflicts = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (b.start >= a.end) continue;
      if (a.end <= a.start || b.end <= b.start) continue;
      if (needsHands(a.task) && needsHands(b.task)) {
        conflicts.push({ type: 'hands', a, b, text: `“${a.task.title}” and “${b.task.title}” overlap and both need your hands` });
      }
      const eqA = (a.task.equipment || []).map((e) => e.toLowerCase());
      for (const e of b.task.equipment || []) {
        if (eqA.includes(e.toLowerCase())) {
          conflicts.push({ type: 'equipment', a, b, text: `${e} is needed by “${a.task.title}” and “${b.task.title}” at ${toClock(b.start)}` });
        }
      }
    }
  }
  // Manually-timed tasks that start before a prerequisite has finished.
  const itemById = new Map(items.map((x) => [x.task.id, x]));
  for (const it of items) {
    for (const d of it.task.deps || []) {
      const dep = itemById.get(d);
      if (dep && dep.end > it.start) {
        conflicts.push({ type: 'order', a: dep, b: it, text: `“${it.task.title}” starts before “${dep.task.title}” is finished` });
      }
    }
  }
  for (const c of conflicts) {
    c.a.warnings.push(c);
    c.b.warnings.push(c);
  }

  return { serve, items, conflicts };
}

const phaseRank = (p) => PHASES.findIndex((x) => x.id === p);

export const depsDone = (t) => (t.deps || []).every((id) => {
  const d = find('tasks', id);
  return !d || isDone(d);
});

// The earliest undone task whose prerequisites are complete.
export function nextTask(dinner) {
  const open = dinnerTasks(dinner.id).filter((t) => !isDone(t));
  if (!open.length) return null;
  const sched = schedule(dinner);
  const startById = new Map(sched.items.map((x) => [x.task.id, x.start]));
  const ready = open.filter(depsDone);
  const pool = ready.length ? ready : open;
  pool.sort((a, b) =>
    phaseRank(a.phase) - phaseRank(b.phase)
    || (a.deadline || '9999').localeCompare(b.deadline || '9999')
    || (startById.get(a.id) ?? 0) - (startById.get(b.id) ?? 0)
    || a.createdAt - b.createdAt);
  return pool[0];
}

export function progress(dinner) {
  const tasks = dinnerTasks(dinner.id);
  const done = tasks.filter(isDone).length;
  const phases = PHASES.map((p) => {
    const list = tasks.filter((t) => t.phase === p.id);
    return { ...p, total: list.length, done: list.filter(isDone).length };
  });
  return { total: tasks.length, done, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0, phases };
}
