// The data model and every mutation of it.
//
// Records (all plain objects, kept in arrays on `state`):
//   dinners       – a dinner party: date, serving time, guests, courses, shopping state
//   dishes        – a recipe in the notebook: original version, personal working version, notes, photos
//   dinnerDishes  – a dish on a particular dinner's menu, with dinner-specific changes
//   tasks         – preparation tasks; `deps` holds the ids of tasks that must be done first
//   storage       – what's been prepared, where it is kept and how to finish it
//   logs          – quick notes and post-dinner review entries
// Ingredients live inside dish versions as { qty, unit, name, note } or { header }.

import { loadState, saveState } from './db.js';

export const SCHEMA = 1;

export const DEFAULT_COURSES = ['Snacks', 'Starter', 'Main', 'Dessert'];

export const PHASES = [
  { id: 'advance', label: 'Advance', hint: 'Days ahead — stocks, doughs, things that freeze' },
  { id: 'daybefore', label: 'Day before', hint: 'Marinades, desserts, anything that improves overnight' },
  { id: 'dayof', label: 'On the day', hint: 'Cooking, resting, finishing and plating' },
];

export const KINDS = {
  prep: { label: 'Prep', active: true },
  cook: { label: 'Cook', active: true },
  rest: { label: 'Rest', active: false },
  chill: { label: 'Chill', active: false },
  reheat: { label: 'Reheat', active: true },
  finish: { label: 'Finish & plate', active: true },
  other: { label: 'Other', active: true },
};

export const LOG_KINDS = {
  note: 'Note',
  worked: 'What worked',
  timing: 'Timing',
  substitution: 'Substitution',
  next: 'Next time',
};

export const STORAGE_STATUS = {
  planned: 'To prepare',
  stored: 'Stored',
  used: 'Used',
};

export const uid = () =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5);

export const clone = (x) => JSON.parse(JSON.stringify(x));

export function emptyState() {
  return {
    schema: SCHEMA,
    dinners: [],
    dishes: [],
    dinnerDishes: [],
    tasks: [],
    storage: [],
    logs: [],
    settings: {
      currentDinnerId: null,
      lastBackup: null,
      hideDone: false,
      shopGroup: 'category',
    },
  };
}

export let state = emptyState();

export function migrate(s) {
  const base = emptyState();
  for (const k of Object.keys(base)) if (!(k in s)) s[k] = base[k];
  s.settings = { ...base.settings, ...s.settings };
  s.schema = SCHEMA;
  return s;
}

export async function init() {
  const saved = await loadState();
  if (saved) state = migrate(saved);
}

let saveTimer;
export function commit() {
  state.updatedAt = Date.now();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 200);
}

export function flush() {
  clearTimeout(saveTimer);
  return saveState(state);
}

export function replaceState(next) {
  state = migrate(next);
  return flush();
}

// ---------- selectors ----------

export const find = (coll, id) => (id ? state[coll].find((x) => x.id === id) : undefined);

export function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function sortedDinners() {
  return [...state.dinners].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
}

export function currentDinner() {
  const chosen = find('dinners', state.settings.currentDinnerId);
  if (chosen) return chosen;
  const today = todayStr();
  const all = sortedDinners();
  return all.find((d) => !d.date || d.date >= today) || all[all.length - 1] || null;
}

export function setCurrentDinner(id) {
  state.settings.currentDinnerId = id;
}

export const dinnerDishes = (dinnerId) =>
  state.dinnerDishes.filter((x) => x.dinnerId === dinnerId).sort((a, b) => a.order - b.order);

export const dinnerTasks = (dinnerId) => state.tasks.filter((t) => t.dinnerId === dinnerId);

export const dishVersion = (dish, which) =>
  which === 'original' ? dish.original : dish.working || dish.original;

export function portionsFor(dd, dinner) {
  return Number(dd.portions) || Number(dinner?.guests) || null;
}

export function scaleFactor(dish, dd, dinner) {
  const portions = portionsFor(dd, dinner);
  const base = Number(dish.servings);
  return base && portions ? portions / base : 1;
}

export const isDone = (t) => t.status === 'done';

// ---------- creation ----------

export function newDinner(p = {}) {
  const d = {
    id: uid(),
    name: '',
    date: '',
    serveTime: '19:30',
    guests: 6,
    courses: [...DEFAULT_COURSES],
    notes: '',
    shop: {},
    manualItems: [],
    createdAt: Date.now(),
    ...p,
  };
  state.dinners.push(d);
  return d;
}

export function newDish(p = {}) {
  const d = {
    id: uid(),
    name: '',
    course: '',
    servings: null,
    source: { title: '', url: '' },
    original: { ingredients: [], method: '', notes: '' },
    working: null,
    preferences: '',
    substitutions: '',
    lessons: '',
    photos: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...p,
  };
  state.dishes.push(d);
  return d;
}

export function addDishToDinner(dinnerId, dishId, course) {
  const dd = {
    id: uid(),
    dinnerId,
    dishId,
    course: course || '',
    order: Math.max(0, ...state.dinnerDishes.filter((x) => x.dinnerId === dinnerId).map((x) => x.order || 0)) + 1,
    version: 'working',
    portions: null,
    changes: '',
    extraIngredients: [],
  };
  state.dinnerDishes.push(dd);
  return dd;
}

export function newTask(p = {}) {
  const kind = p.kind || 'prep';
  const t = {
    id: uid(),
    dinnerId: null,
    dishId: null,
    title: '',
    phase: 'dayof',
    kind,
    minutes: 15,
    active: KINDS[kind]?.active ?? true,
    deadline: '',
    fixedStart: '',
    doneBy: '',
    deps: [],
    equipment: [],
    notes: '',
    status: 'todo',
    doneAt: null,
    actualMinutes: null,
    createdAt: Date.now(),
    ...p,
  };
  state.tasks.push(t);
  return t;
}

export function newStorage(p = {}) {
  const s = {
    id: uid(),
    dinnerId: null,
    dishId: null,
    taskId: null,
    item: '',
    container: '',
    location: '',
    preparedOn: '',
    instructions: '',
    defrost: '',
    cooling: '',
    finishing: '',
    status: 'planned',
    createdAt: Date.now(),
    ...p,
  };
  state.storage.push(s);
  return s;
}

export function newLog(p = {}) {
  const l = {
    id: uid(),
    dinnerId: null,
    dishId: null,
    kind: 'note',
    text: '',
    promoted: false,
    createdAt: Date.now(),
    ...p,
  };
  state.logs.unshift(l);
  return l;
}

// ---------- mutation ----------

export function toggleTask(id) {
  const t = find('tasks', id);
  if (!t) return null;
  if (isDone(t)) {
    t.status = 'todo';
    t.doneAt = null;
  } else {
    t.status = 'done';
    t.doneAt = Date.now();
  }
  return t;
}

const removeWhere = (coll, pred) => {
  state[coll] = state[coll].filter((x) => !pred(x));
};

export function deleteTask(id) {
  removeWhere('tasks', (t) => t.id === id);
  for (const t of state.tasks) t.deps = (t.deps || []).filter((d) => d !== id);
  for (const s of state.storage) if (s.taskId === id) s.taskId = null;
}

export function deleteDinner(id) {
  removeWhere('dinners', (d) => d.id === id);
  removeWhere('dinnerDishes', (x) => x.dinnerId === id);
  removeWhere('tasks', (x) => x.dinnerId === id);
  removeWhere('storage', (x) => x.dinnerId === id);
  for (const l of state.logs) if (l.dinnerId === id) l.dinnerId = null;
  if (state.settings.currentDinnerId === id) state.settings.currentDinnerId = null;
}

export function removeDishFromDinner(ddId) {
  const dd = find('dinnerDishes', ddId);
  if (!dd) return;
  removeWhere('dinnerDishes', (x) => x.id === ddId);
  for (const t of state.tasks) if (t.dinnerId === dd.dinnerId && t.dishId === dd.dishId) t.dishId = null;
}

// Swap a menu item with its neighbour in the same course (dir: -1 up, +1 down).
export function moveDinnerDish(ddId, dir) {
  const dd = find('dinnerDishes', ddId);
  if (!dd) return;
  const list = dinnerDishes(dd.dinnerId).filter((x) => x.course === dd.course);
  const i = list.indexOf(dd);
  const other = list[i + dir];
  if (!other) return;
  [dd.order, other.order] = [other.order, dd.order];
  if (dd.order === other.order) dd.order += dir;
}

// Apply an edited course list: renames carry their dishes along; dishes in deleted
// courses come off the menu.
export function setCourses(dinnerId, edits) {
  const dinner = find('dinners', dinnerId);
  if (!dinner) return;
  for (const { from, to } of edits) {
    if (!from || from === to) continue;
    for (const dd of dinnerDishes(dinnerId)) {
      if (dd.course === from) {
        if (to) dd.course = to;
        else removeDishFromDinner(dd.id);
      }
    }
  }
  dinner.courses = edits.map((e) => e.to).filter(Boolean);
}

export function deleteDish(id) {
  removeWhere('dishes', (d) => d.id === id);
  removeWhere('dinnerDishes', (x) => x.dishId === id);
  for (const coll of ['tasks', 'storage', 'logs']) {
    for (const x of state[coll]) if (x.dishId === id) x.dishId = null;
  }
}

// Copy a dinner's menu and task plan (statuses reset) so a good dinner can be hosted again.
export function duplicateDinner(id) {
  const src = find('dinners', id);
  if (!src) return null;
  const copy = newDinner({
    ...clone(src),
    id: uid(),
    name: `${src.name} (again)`,
    date: '',
    shop: {},
    manualItems: [],
    createdAt: Date.now(),
  });
  for (const dd of dinnerDishes(id)) {
    state.dinnerDishes.push({ ...clone(dd), id: uid(), dinnerId: copy.id });
  }
  const idMap = new Map();
  const tasks = dinnerTasks(id);
  for (const t of tasks) idMap.set(t.id, uid());
  for (const t of tasks) {
    state.tasks.push({
      ...clone(t),
      id: idMap.get(t.id),
      dinnerId: copy.id,
      deps: (t.deps || []).map((d) => idMap.get(d)).filter(Boolean),
      status: 'todo',
      doneAt: null,
      actualMinutes: null,
      deadline: '',
      createdAt: Date.now(),
    });
  }
  return copy;
}

// Append a note to the dish's personal working version (creating it from the original if needed).
export function promoteLog(logId) {
  const log = find('logs', logId);
  const dish = find('dishes', log?.dishId);
  if (!log || !dish) return null;
  if (!dish.working) dish.working = { ...clone(dish.original), updatedAt: Date.now() };
  const dinner = find('dinners', log.dinnerId);
  const from = dinner ? ` (from ${dinner.name || 'a dinner'}${dinner.date ? `, ${dinner.date}` : ''})` : '';
  const prev = (dish.working.notes || '').trimEnd();
  dish.working.notes = `${prev ? `${prev}\n\n` : ''}${log.text.trim()}${from}`;
  dish.working.updatedAt = Date.now();
  dish.updatedAt = Date.now();
  log.promoted = true;
  return dish;
}

// Ids of tasks that (transitively) depend on `id` — these can't become its prerequisites.
export function dependents(id, tasks) {
  const out = new Set();
  const walk = (x) => {
    for (const t of tasks) {
      if ((t.deps || []).includes(x) && !out.has(t.id)) {
        out.add(t.id);
        walk(t.id);
      }
    }
  };
  walk(id);
  return out;
}
