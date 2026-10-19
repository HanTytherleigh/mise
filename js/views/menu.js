import {
  state, commit, currentDinner, find, dinnerDishes, dinnerTasks, addDishToDinner, newDish, isDone, portionsFor,
} from '../store.js';
import { esc, icon, pageHead, empty, go, on, toast, formData } from '../ui.js';

export function menuView() {
  const d = currentDinner();
  if (!d) return libraryView({ tab: 'menu' });
  const dds = dinnerDishes(d.id);
  const tasks = dinnerTasks(d.id);
  const known = new Set(d.courses);
  const groups = [...d.courses.map((c) => [c, dds.filter((x) => x.course === c)])];
  const stray = dds.filter((x) => !known.has(x.course));
  if (stray.length) groups.push(['Other', stray]);

  const card = (dd) => {
    const dish = find('dishes', dd.dishId);
    if (!dish) return '';
    const dt = tasks.filter((t) => t.dishId === dish.id);
    const bits = [
      `${portionsFor(dd, d) || '?'} portions`,
      dd.version === 'original' || !dish.working ? 'Original recipe' : 'My version',
      dt.length ? `${dt.filter(isDone).length}/${dt.length} tasks` : 'No tasks',
    ];
    return `
      <a class="dish-card" href="#/dish/${dish.id}?dd=${dd.id}">
        ${dish.photos?.[0] ? `<img src="${dish.photos[0].data}" alt="">` : ''}
        <span class="dish-card-body">
          <strong>${esc(dish.name)}</strong>
          <small>${bits.map(esc).join(' · ')}</small>
          ${dd.changes ? `<em>${esc(dd.changes.split('\n')[0])}</em>` : ''}
        </span>
        ${icon('chev')}
      </a>`;
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
      ${groups.map(([course, list]) => `
        <section class="course">
          <h2 class="course-title">${esc(course)}</h2>
          ${list.map(card).join('')}
          ${course !== 'Other' || !stray.length ? `<a class="add-row" href="#/menu/add?course=${encodeURIComponent(course)}">${icon('plus')} Add ${esc(course.toLowerCase())}</a>` : ''}
        </section>`).join('')}
      <a class="card link-card" href="#/dishes"><strong>Dish notebook</strong><span>${state.dishes.length} dish${state.dishes.length === 1 ? '' : 'es'} — every recipe you've saved</span>${icon('chev')}</a>`,
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
