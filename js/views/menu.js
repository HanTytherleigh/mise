import {
  state, commit, currentDinner, find, dinnerDishes, dinnerTasks, addDishToDinner, newDish, isDone, portionsFor,
  moveDinnerDish, removeDishFromDinner, setCourses,
} from '../store.js';
import { esc, icon, pageHead, empty, go, on, toast, refresh, formData } from '../ui.js';

export function menuView() {
  const d = currentDinner();
  if (!d) return libraryView({ tab: 'menu' });
  const dds = dinnerDishes(d.id);
  const tasks = dinnerTasks(d.id);
  const known = new Set(d.courses);
  const groups = [...d.courses.map((c) => [c, dds.filter((x) => x.course === c)])];
  const stray = dds.filter((x) => !known.has(x.course));
  if (stray.length) groups.push(['Other', stray]);

  const card = (dd, i, list) => {
    const dish = find('dishes', dd.dishId);
    if (!dish) return '';
    const dt = tasks.filter((t) => t.dishId === dish.id);
    const bits = [
      `${portionsFor(dd, d) || '?'} portions`,
      dd.version === 'original' || !dish.working ? 'Original recipe' : 'My version',
      dt.length ? `${dt.filter(isDone).length}/${dt.length} tasks` : 'No tasks',
    ];
    return `
      <div class="menu-item" data-dd="${dd.id}">
        <a class="dish-card" href="#/dish/${dish.id}?dd=${dd.id}">
          ${dish.photos?.[0] ? `<img src="${dish.photos[0].data}" alt="">` : ''}
          <span class="dish-card-body">
            <strong>${esc(dish.name)}</strong>
            <small>${bits.map(esc).join(' · ')}</small>
            ${dd.changes ? `<em>${esc(dd.changes.split('\n')[0])}</em>` : ''}
          </span>
        </a>
        <div class="item-actions">
          <a class="icon-btn small" href="#/dd/${dd.id}?from=menu" aria-label="Edit ${esc(dish.name)}">${icon('edit')}</a>
          <button class="icon-btn small" data-act="up" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${icon('up')}</button>
          <button class="icon-btn small" data-act="down" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Move down">${icon('up', 'flip')}</button>
          <button class="icon-btn small danger-text" data-act="remove" aria-label="Remove ${esc(dish.name)} from menu">${icon('trash')}</button>
        </div>
      </div>`;
  };

  return {
    tab: 'menu',
    title: 'Menu',
    html: `
      ${pageHead({
        eyebrow: esc(d.name),
        title: 'Menu',
        actions: `<a class="icon-btn" href="#/dishes" aria-label="Dish notebook">${icon('book')}</a>`,
      })}
      <div class="row between"><span class="small muted">${dds.length} dish${dds.length === 1 ? '' : 'es'} · ${d.courses.length} course${d.courses.length === 1 ? '' : 's'}</span>
        <a class="text-link" href="#/menu/courses">${icon('edit')} Edit courses</a></div>
      ${groups.map(([course, list]) => `
        <section class="course">
          <h2 class="course-title">${esc(course)}</h2>
          ${list.map(card).join('')}
          ${course !== 'Other' || !stray.length ? `<a class="add-row" href="#/menu/add?course=${encodeURIComponent(course)}">${icon('plus')} Add ${esc(course.toLowerCase())}</a>` : ''}
        </section>`).join('')}
      <a class="card link-card" href="#/dishes"><strong>Dish notebook</strong><span>${state.dishes.length} dish${state.dishes.length === 1 ? '' : 'es'} — every recipe you've saved</span>${icon('chev')}</a>`,
    mount(root) {
      const ddOf = (el) => el.closest('[data-dd]').dataset.dd;
      on(root, 'click', '[data-act="up"], [data-act="down"]', (el) => {
        moveDinnerDish(ddOf(el), el.dataset.act === 'up' ? -1 : 1);
        commit();
        refresh();
      });
      on(root, 'click', '[data-act="remove"]', (el) => {
        const dd = find('dinnerDishes', ddOf(el));
        const name = find('dishes', dd?.dishId)?.name || 'this dish';
        if (!confirm(`Remove ${name} from this menu? It stays in your notebook.`)) return;
        removeDishFromDinner(dd.id);
        commit();
        toast('Removed from the menu');
        refresh();
      });
    },
  };
}

export function coursesView() {
  const d = currentDinner();
  if (!d) return null;
  const count = (c) => dinnerDishes(d.id).filter((x) => x.course === c).length;
  const row = (c) => `
    <div class="course-row" data-from="${esc(c)}">
      <input value="${esc(c)}" aria-label="Course name" required>
      <span class="small muted">${count(c) || ''}</span>
      <button type="button" class="icon-btn small" data-act="up" aria-label="Move up">${icon('up')}</button>
      <button type="button" class="icon-btn small" data-act="down" aria-label="Move down">${icon('up', 'flip')}</button>
      <button type="button" class="icon-btn small danger-text" data-act="del" aria-label="Delete course">${icon('trash')}</button>
    </div>`;
  return {
    tab: 'menu',
    title: 'Courses',
    html: `
      ${pageHead({ eyebrow: esc(d.name), title: 'Courses', back: '/menu', sub: 'Rename, reorder, add or delete. Renaming keeps its dishes.' })}
      <form class="form" data-form="courses">
        <div class="course-rows" data-rows>${d.courses.map(row).join('')}</div>
        <button type="button" class="btn ghost block" data-act="add">${icon('plus')} Add a course</button>
        <button class="btn primary block" type="submit">Save courses</button>
      </form>`,
    mount(root) {
      const rows = root.querySelector('[data-rows]');
      on(root, 'click', '[data-act="add"]', () => {
        rows.insertAdjacentHTML('beforeend', row(''));
        rows.lastElementChild.querySelector('input').focus();
      });
      on(root, 'click', '.course-row [data-act]', (el) => {
        const r = el.closest('.course-row');
        if (el.dataset.act === 'up' && r.previousElementSibling) r.previousElementSibling.before(r);
        if (el.dataset.act === 'down' && r.nextElementSibling) r.nextElementSibling.after(r);
        if (el.dataset.act === 'del') {
          const n = r.dataset.from ? count(r.dataset.from) : 0;
          if (n && !confirm(`${r.dataset.from} has ${n} dish${n > 1 ? 'es' : ''}. Deleting the course takes them off this menu (they stay in your notebook).`)) return;
          r.remove();
        }
      });
      on(root, 'submit', '[data-form="courses"]', (form, ev) => {
        ev.preventDefault();
        const kept = [...rows.querySelectorAll('.course-row')].map((r) => ({ from: r.dataset.from, to: r.querySelector('input').value.trim() }));
        const removed = d.courses.filter((c) => !kept.some((k) => k.from === c)).map((c) => ({ from: c, to: '' }));
        setCourses(d.id, [...kept, ...removed]);
        commit();
        toast('Courses saved');
        go('/menu');
      });
    },
  };
}

export function addDishView(query) {
  const d = currentDinner();
  if (!d) return null;
  const course = query.course || d.courses[0] || '';
  const onMenu = new Set(dinnerDishes(d.id).map((x) => x.dishId));
  const dishes = state.dishes.filter((x) => !onMenu.has(x.id)).sort((a, b) => a.name.localeCompare(b.name));
  return {
    tab: 'menu',
    title: 'Add a dish',
    html: `
      ${pageHead({ eyebrow: esc(d.name), title: `Add to ${course || 'menu'}`, back: '/menu' })}
      <form class="inline-form" data-form="new">
        <input name="name" required placeholder="A new dish…" autocomplete="off">
        <button class="btn primary" type="submit">Create</button>
      </form>
      ${dishes.length ? `
        <h2 class="section-title">From your notebook</h2>
        <input class="search" type="search" placeholder="Search dishes" data-search>
        <div class="list" data-list>
          ${dishes.map((x) => `
            <button class="list-row" data-act="pick" data-id="${x.id}" data-name="${esc(x.name.toLowerCase())}">
              <span><strong>${esc(x.name)}</strong><small>${esc([x.course, x.source?.title].filter(Boolean).join(' · '))}</small></span>
              ${icon('plus')}
            </button>`).join('')}
        </div>` : ''}`,
    mount(root) {
      on(root, 'submit', '[data-form="new"]', (form, ev) => {
        ev.preventDefault();
        const dish = newDish({ name: formData(form).name.trim(), course });
        const dd = addDishToDinner(d.id, dish.id, course);
        commit();
        go(`/dish/${dish.id}/edit?v=original&dd=${dd.id}&fresh=1`);
      });
      on(root, 'click', '[data-act="pick"]', (el) => {
        addDishToDinner(d.id, el.dataset.id, course);
        commit();
        toast('Added to the menu');
        go('/menu');
      });
      on(root, 'input', '[data-search]', (el) => {
        const q = el.value.trim().toLowerCase();
        root.querySelectorAll('[data-list] .list-row').forEach((row) => {
          row.hidden = q && !row.dataset.name.includes(q);
        });
      });
    },
  };
}

export function libraryView({ tab = 'menu' } = {}) {
  const dishes = [...state.dishes].sort((a, b) => a.name.localeCompare(b.name));
  const cooked = (id) => state.dinnerDishes.filter((x) => x.dishId === id).length;
  return {
    tab,
    title: 'Dish notebook',
    html: `
      ${pageHead({
        eyebrow: 'Every recipe you keep',
        title: 'Dish notebook',
        back: currentDinner() ? '/menu' : null,
        actions: `<a class="icon-btn" href="#/dish/new" aria-label="New dish">${icon('plus')}</a>`,
      })}
      ${dishes.length ? `
        <input class="search" type="search" placeholder="Search dishes" data-search>
        <div class="list" data-list>
          ${dishes.map((x) => `
            <a class="list-row" href="#/dish/${x.id}" data-name="${esc(x.name.toLowerCase())}">
              <span><strong>${esc(x.name)}</strong><small>${esc([x.course, x.working ? 'My version' : 'Original only', cooked(x.id) ? `on ${cooked(x.id)} menu${cooked(x.id) > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · '))}</small></span>
              ${icon('chev')}
            </a>`).join('')}
        </div>` : empty('Your notebook is empty', 'Add a recipe you love, or one you want to try.', '<a class="btn primary" href="#/dish/new">Add a dish</a>')}
      ${dishes.length ? `<a class="btn ghost block" href="#/dish/new">${icon('plus')} New dish</a>` : ''}`,
    mount(root) {
      on(root, 'input', '[data-search]', (el) => {
        const q = el.value.trim().toLowerCase();
        root.querySelectorAll('[data-list] .list-row').forEach((row) => {
          row.hidden = q && !row.dataset.name.includes(q);
        });
      });
    },
  };
}
