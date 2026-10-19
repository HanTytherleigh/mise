import {
  state, commit, find, dinnerTasks, newDish, deleteDish, removeDishFromDinner, dishVersion, scaleFactor,
  portionsFor, isDone, toggleTask, uid, KINDS, LOG_KINDS, STORAGE_STATUS,
} from '../store.js';
import { parseLines, fmtQty } from '../ingredients.js';
import {
  esc, icon, pageHead, segmented, go, on, toast, refresh, formData, renderIngredients, renderMethod, prose,
  ingredientsText, fmtMinutes, fmtStamp, fmtDate, compressImage,
} from '../ui.js';

const COURSE_SUGGESTIONS = ['Snacks', 'Starter', 'Main', 'Side', 'Sauce', 'Dessert', 'Petits fours', 'Drink'];

function versionBlock(v, factor = 1) {
  return `
    <section class="block">
      <h2 class="section-title">Ingredients</h2>
      ${renderIngredients(v.ingredients, factor)}
    </section>
    <section class="block">
      <h2 class="section-title">Method</h2>
      ${renderMethod(v.method)}
    </section>
    ${v.notes ? `<section class="block"><h2 class="section-title">Notes</h2>${prose(v.notes)}</section>` : ''}`;
}

export function dishView(id, query) {
  const dish = find('dishes', id);
  if (!dish) return null;
  const dd = query.dd ? find('dinnerDishes', query.dd) : null;
  const dinner = dd ? find('dinners', dd.dinnerId) : null;
  const tab = query.tab || (dd ? 'dinner' : 'working');
  const base = `/dish/${dish.id}?${dd ? `dd=${dd.id}&` : ''}tab=`;
  const tabs = [
    ...(dd ? [['dinner', 'This dinner', `${base}dinner`]] : []),
    ['working', 'My version', `${base}working`],
    ['original', 'Original', `${base}original`],
    ['notes', 'Notes', `${base}notes`],
  ];
  const editHref = (v) => `#/dish/${dish.id}/edit?v=${v}${dd ? `&dd=${dd.id}` : ''}`;

  let body = '';
  if (tab === 'dinner' && dd) {
    const factor = scaleFactor(dish, dd, dinner);
    const v = dishVersion(dish, dd.version);
    const tasks = dinnerTasks(dinner.id).filter((t) => t.dishId === dish.id);
    const stores = state.storage.filter((s) => s.dinnerId === dinner.id && s.dishId === dish.id);
    body = `
      <section class="card">
        <div class="facts">
          <div><span>Portions</span><strong>${portionsFor(dd, dinner) || '?'}</strong></div>
          <div><span>Recipe serves</span><strong>${dish.servings || '—'}</strong></div>
          <div><span>Scale</span><strong>${factor === 1 ? '×1' : `×${fmtQty(factor)}`}</strong></div>
          <div><span>Cooking from</span><strong>${dd.version === 'original' || !dish.working ? 'Original' : 'My version'}</strong></div>
        </div>
        ${dd.changes ? `<h3 class="mini-title">Changes for this dinner</h3>${prose(dd.changes)}` : ''}
        ${dd.extraIngredients?.length ? `<h3 class="mini-title">Extra for this dinner</h3>${renderIngredients(dd.extraIngredients)}` : ''}
        <a class="btn ghost small" href="#/dd/${dd.id}">${icon('edit')} Changes for this dinner</a>
      </section>
      <section class="block">
        <div class="row between"><h2 class="section-title">Tasks</h2><a class="text-link" href="#/task/new?dish=${dish.id}">${icon('plus')} Add</a></div>
        ${tasks.length ? `<div class="tasks">${tasks.map((t) => `
          <div class="task ${isDone(t) ? 'done' : ''}">
            <button class="check" data-act="toggle" data-id="${t.id}" aria-label="Toggle done">${icon('check')}</button>
            <a class="task-body" href="#/task/${t.id}"><strong>${esc(t.title)}</strong><small>${esc([KINDS[t.kind]?.label, fmtMinutes(t.minutes)].join(' · '))}</small></a>
          </div>`).join('')}</div>` : '<p class="muted">No tasks for this dish yet.</p>'}
      </section>
      <section class="block">
        <div class="row between"><h2 class="section-title">Storage</h2><a class="text-link" href="#/storage/new?dish=${dish.id}">${icon('plus')} Add</a></div>
        ${stores.length ? stores.map((s) => `<a class="list-row" href="#/storage/${s.id}"><span><strong>${esc(s.item)}</strong><small>${esc([STORAGE_STATUS[s.status], s.location, s.container].filter(Boolean).join(' · '))}</small></span>${icon('chev')}</a>`).join('') : '<p class="muted">Nothing stored for this dish.</p>'}
      </section>
      <h2 class="section-title">Recipe${factor !== 1 ? ` <small class="muted">scaled ×${esc(fmtQty(factor))}</small>` : ''}</h2>
      ${versionBlock(v, factor)}`;
  } else if (tab === 'working') {
    body = dish.working
      ? `<p class="small muted">Your personal version${dish.working.updatedAt ? ` · updated ${esc(fmtStamp(dish.working.updatedAt))}` : ''}</p>
         ${versionBlock(dish.working)}
         <a class="btn primary block" href="${editHref('working')}">${icon('edit')} Edit my version</a>`
      : `<div class="empty"><p class="empty-title">No personal version yet</p>
           <p>You're cooking from the original. Start your own version when you begin to adapt it — the original stays untouched.</p>
           <a class="btn primary" href="${editHref('working')}">Start my version</a></div>`;
  } else if (tab === 'original') {
    const src = dish.source || {};
    body = `
      ${src.title || src.url ? `<p class="source">${icon('book')} ${src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.title || src.url)}</a>` : esc(src.title)}</p>` : ''}
      <p class="small muted">The recipe as you found it. Keep your changes in “My version”.</p>
      ${versionBlock(dish.original)}
      <a class="btn ghost block" href="${editHref('original')}" data-act="edit-original">${icon('edit')} Edit original</a>`;
  } else {
    const logs = state.logs.filter((l) => l.dishId === dish.id);
    body = `
      <form class="form" data-form="dish-notes">
        <label class="field"><span>Preferences</span><textarea name="preferences" rows="2" placeholder="How you like it — doneness, seasoning, plating">${esc(dish.preferences)}</textarea></label>
        <label class="field"><span>Substitutions</span><textarea name="substitutions" rows="2" placeholder="Swaps that work">${esc(dish.substitutions)}</textarea></label>
        <label class="field"><span>Lessons learned</span><textarea name="lessons" rows="3" placeholder="What you'd tell yourself next time">${esc(dish.lessons)}</textarea></label>
      </form>
      <section class="block">
        <div class="row between"><h2 class="section-title">Photos</h2>
          <label class="text-link file-btn">${icon('camera')} Add<input type="file" accept="image/*" data-act="photo" hidden></label></div>
        ${dish.photos?.length ? `<div class="photos">${dish.photos.map((p) => `
          <figure><img src="${p.data}" alt="" loading="lazy"><button class="icon-btn small" data-act="del-photo" data-id="${p.id}" aria-label="Remove photo">${icon('x')}</button></figure>`).join('')}</div>` : '<p class="muted">No photos yet.</p>'}
      </section>
      <section class="block">
        <h2 class="section-title">Cooking log</h2>
        ${logs.length ? logs.map((l) => {
          const dn = find('dinners', l.dinnerId);
          return `<article class="note"><p class="note-meta"><span class="pill">${esc(LOG_KINDS[l.kind] || 'Note')}</span> ${esc(dn ? `${dn.name}${dn.date ? `, ${fmtDate(dn.date)}` : ''}` : fmtStamp(l.createdAt))}${l.promoted ? ' · <span class="ok">in my version</span>' : ''}</p>${prose(l.text)}</article>`;
        }).join('') : '<p class="muted">Notes you link to this dish appear here.</p>'}
      </section>
      <div class="danger-zone">
        ${dd ? '<button class="btn ghost block" data-act="remove-dd">Remove from this menu</button>' : ''}
        <button class="btn danger block" data-act="delete-dish">Delete dish from notebook</button>
      </div>`;
  }

  return {
    tab: 'menu',
    title: dish.name,
    html: `
      ${pageHead({
        eyebrow: esc([dish.course, dinner?.name].filter(Boolean).join(' · ')),
        title: dish.name || 'Untitled dish',
        back: dd ? '/menu' : '/dishes',
        actions: `<a class="icon-btn" href="${editHref(dish.working ? 'working' : 'original')}" aria-label="Edit">${icon('edit')}</a>`,
      })}
      ${segmented(tabs, tab)}
      ${body}`,
    mount(root) {
      on(root, 'click', '[data-act="toggle"]', (el) => {
        toggleTask(el.dataset.id);
        commit();
        refresh();
      });
      on(root, 'click', '[data-act="edit-original"]', (el, ev) => {
        if (!confirm('The original is meant to stay as you found it. Edit it anyway? (Your own changes belong in “My version”.)')) ev.preventDefault();
      });
      on(root, 'change', '[data-form="dish-notes"] textarea', (el) => {
        dish[el.name] = el.value;
        dish.updatedAt = Date.now();
        commit();
        toast('Saved');
      });
      on(root, 'change', '[data-act="photo"]', async (el) => {
        const file = el.files?.[0];
        if (!file) return;
        try {
          const data = await compressImage(file);
          dish.photos ||= [];
          dish.photos.push({ id: uid(), data, createdAt: Date.now() });
          commit();
          refresh();
        } catch (err) {
          toast(err.message);
        }
      });
      on(root, 'click', '[data-act="del-photo"]', (el) => {
        if (!confirm('Remove this photo?')) return;
        dish.photos = dish.photos.filter((p) => p.id !== el.dataset.id);
        commit();
        refresh();
      });
      on(root, 'click', '[data-act="remove-dd"]', () => {
        if (!confirm(`Remove ${dish.name} from this menu? It stays in your notebook.`)) return;
        removeDishFromDinner(dd.id);
        commit();
        go('/menu');
      });
      on(root, 'click', '[data-act="delete-dish"]', () => {
        if (!confirm(`Delete ${dish.name} from your notebook and every menu it is on? This can't be undone.`)) return;
        deleteDish(dish.id);
        commit();
        toast('Dish deleted');
        go(dd ? '/menu' : '/dishes');
      });
    },
  };
}

export function dishEditView(id, query) {
  const isNew = !id;
  const dish = isNew ? null : find('dishes', id);
  if (!isNew && !dish) return null;
  const which = query.v === 'working' ? 'working' : 'original';
  const d = dish || { name: '', course: '', servings: '', source: { title: '', url: '' } };
  const v = (dish && (which === 'working' ? dish.working || dish.original : dish.original)) || { ingredients: [], method: '', notes: '' };
  const back = dish ? `/dish/${dish.id}?${query.dd ? `dd=${query.dd}&` : ''}tab=${query.fresh ? 'original' : which}` : '/dishes';
  const startingWorking = which === 'working' && dish && !dish.working;

  return {
    tab: 'menu',
    title: 'Edit dish',
    html: `
      ${pageHead({
        eyebrow: which === 'working' ? 'My version' : 'Original recipe',
        title: isNew ? 'New dish' : d.name,
        back,
        sub: startingWorking ? 'Starting from a copy of the original — change whatever you like.' : '',
      })}
      <form class="form" data-form="dish">
        <label class="field"><span>Name</span><input name="name" required value="${esc(d.name)}" autocomplete="off"></label>
        <div class="grid2">
          <label class="field"><span>Course</span><input name="course" list="course-list" value="${esc(d.course)}"></label>
          <label class="field"><span>Recipe serves</span><input type="number" name="servings" min="1" inputmode="numeric" value="${esc(d.servings ?? '')}" placeholder="e.g. 4"></label>
        </div>
        <datalist id="course-list">${COURSE_SUGGESTIONS.map((c) => `<option value="${c}">`).join('')}</datalist>
        ${which === 'original' ? `
          <div class="grid2">
            <label class="field"><span>Source</span><input name="sourceTitle" value="${esc(d.source?.title)}" placeholder="Book, chef, friend…"></label>
            <label class="field"><span>Link</span><input type="url" name="sourceUrl" value="${esc(d.source?.url)}" placeholder="https://"></label>
          </div>` : ''}
        <label class="field"><span>Ingredients</span>
          <textarea name="ingredients" rows="10" class="mono" placeholder="One per line, e.g.\n200 g plain flour\n2 tbsp olive oil, plus extra\nFor the sauce:\n1 bunch parsley">${esc(ingredientsText(v.ingredients))}</textarea>
          <small>Quantity, unit, then the ingredient. A line ending in “:” starts a section.</small></label>
        <label class="field"><span>Method</span><textarea name="method" rows="10" placeholder="One step per line">${esc(v.method)}</textarea></label>
        <label class="field"><span>Notes</span><textarea name="notes" rows="3">${esc(v.notes)}</textarea></label>
        <button class="btn primary block" type="submit">Save ${which === 'working' ? 'my version' : isNew ? 'dish' : 'original'}</button>
      </form>`,
    mount(root) {
      on(root, 'submit', '[data-form="dish"]', (form, ev) => {
        ev.preventDefault();
        const f = formData(form);
        const target = dish || newDish();
        target.name = f.name.trim();
        target.course = f.course.trim();
        target.servings = parseInt(f.servings, 10) || null;
        if (which === 'original') target.source = { title: f.sourceTitle.trim(), url: f.sourceUrl.trim() };
        const version = { ingredients: parseLines(f.ingredients), method: f.method, notes: f.notes };
        if (which === 'working') target.working = { ...version, updatedAt: Date.now() };
        else target.original = version;
        target.updatedAt = Date.now();
        commit();
        toast('Saved');
        go(`/dish/${target.id}?${query.dd ? `dd=${query.dd}&` : ''}tab=${query.dd && query.fresh ? 'dinner' : which}`);
      });
    },
  };
}

export function dinnerDishView(id) {
  const dd = find('dinnerDishes', id);
  const dish = find('dishes', dd?.dishId);
  const dinner = find('dinners', dd?.dinnerId);
  if (!dd || !dish || !dinner) return null;
  const courses = dinner.courses.includes(dd.course) ? dinner.courses : [...dinner.courses, dd.course].filter(Boolean);
  return {
    tab: 'menu',
    title: 'Changes for this dinner',
    html: `
      ${pageHead({ eyebrow: esc(`${dish.name} · ${dinner.name}`), title: 'For this dinner', back: `/dish/${dish.id}?dd=${dd.id}&tab=dinner` })}
      <form class="form" data-form="dd">
        <div class="grid2">
          <label class="field"><span>Course</span><select name="course">${courses.map((c) => `<option ${c === dd.course ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
          <label class="field"><span>Portions</span><input type="number" name="portions" min="1" inputmode="numeric" value="${esc(dd.portions ?? '')}" placeholder="${esc(dinner.guests)} (guests)"></label>
        </div>
        <fieldset class="field"><legend>Cook from</legend>
          <div class="seg-input">
            <label><input type="radio" name="version" value="working" ${dd.version !== 'original' ? 'checked' : ''}><span>My version${dish.working ? '' : ' (none yet)'}</span></label>
            <label><input type="radio" name="version" value="original" ${dd.version === 'original' ? 'checked' : ''}><span>Original</span></label>
          </div>
        </fieldset>
        <label class="field"><span>Changes for this dinner</span><textarea name="changes" rows="4" placeholder="Halve the chilli for Sam; plate in the shallow bowls">${esc(dd.changes)}</textarea></label>
        <label class="field"><span>Extra ingredients</span><textarea name="extra" rows="3" class="mono" placeholder="Added to the shopping list for this dinner only">${esc(ingredientsText(dd.extraIngredients))}</textarea><small>Not scaled — write the amount you need.</small></label>
        <button class="btn primary block" type="submit">Save</button>
      </form>`,
    mount(root) {
      on(root, 'submit', '[data-form="dd"]', (form, ev) => {
        ev.preventDefault();
        const f = formData(form);
        Object.assign(dd, {
          course: f.course,
          portions: parseInt(f.portions, 10) || null,
          version: f.version,
          changes: f.changes,
          extraIngredients: parseLines(f.extra),
        });
        commit();
        toast('Saved');
        go(`/dish/${dish.id}?dd=${dd.id}&tab=dinner`);
      });
    },
  };
}

