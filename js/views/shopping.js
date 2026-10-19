import { state, commit, currentDinner } from '../store.js';
import { CATEGORIES, parseLine, fmtQty, unitLabel } from '../ingredients.js';
import { shoppingList, groupItems, updateItem, removeItem, restoreHidden, addManual, listAsText } from '../shopping.js';
import { esc, icon, pageHead, segmented, empty, on, toast, refresh } from '../ui.js';

export function shoppingView() {
  const d = currentDinner();
  if (!d) return { tab: 'home', html: `${pageHead({ title: 'Shopping', back: '/' })}${empty('No dinner yet')}` };
  const { items, unscaled, hiddenCount } = shoppingList(d);
  const by = state.settings.shopGroup || 'category';
  const have = items.filter((i) => i.have);
  const active = items.filter((i) => !i.have);
  const toBuy = active.filter((i) => !i.bought).length;
  const shops = [...new Set(items.map((i) => i.shop).filter(Boolean))];

  const row = (it) => `
    <div class="shop-item ${it.bought ? 'bought' : ''}" data-key="${esc(it.key)}">
      <button class="check" data-act="bought" aria-label="${it.bought ? 'Not bought' : 'Bought'}">${icon('check')}</button>
      <button class="shop-main" data-act="expand">
        <span class="shop-name">${esc(it.name)}${it.corrected ? ' <small class="muted">(edited)</small>' : ''}</span>
        <span class="shop-qty">${esc(it.qtyText)}</span>
        ${it.sources.length ? `<small class="shop-src">${esc(it.sources.join(', '))}</small>` : ''}
      </button>
      <div class="shop-edit" hidden>
        <div class="grid2">
          <label class="field"><span>Quantity</span><input data-f="qty" value="${esc(it.qtyText)}"></label>
          <label class="field"><span>Shop</span><input data-f="shop" list="shop-list" value="${esc(it.shop)}" placeholder="Butcher, market…"></label>
        </div>
        <label class="field"><span>Category</span><select data-f="category">${CATEGORIES.map((c) => `<option ${c === it.category ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <div class="row gap">
          <button class="btn ghost small" data-act="have">${it.have ? 'Need to buy' : 'Already have it'}</button>
          <button class="btn ghost small danger-text" data-act="remove">Remove</button>
        </div>
      </div>
    </div>`;

  return {
    tab: 'home',
    title: 'Shopping',
    html: `
      ${pageHead({
        eyebrow: esc(d.name),
        title: 'Shopping',
        back: '/',
        sub: `${esc(d.guests)} guests · ${toBuy ? `${toBuy} to buy` : 'nothing left to buy'}`,
        actions: `<button class="icon-btn" data-act="copy" aria-label="Copy list">${icon('copy')}</button>`,
      })}
      <form class="inline-form" data-form="add">
        <input name="item" placeholder="Add — e.g. 2 lemons" autocomplete="off" required>
        <button class="btn primary" type="submit">Add</button>
      </form>
      ${segmented([['category', 'By category', '/shopping?group=category'], ['shop', 'By shop', '/shopping?group=shop']], by)}
      ${unscaled.length ? `<p class="small muted">Not scaled (no “recipe serves” set): ${esc(unscaled.join(', '))}.</p>` : ''}
      ${items.length ? '' : empty('Nothing to buy yet', 'Ingredients from the dishes on your menu gather here, scaled to your guests.')}
      ${groupItems(active, by).map((g) => `
        <section class="shop-group">
          <h2 class="section-title">${esc(g.name)}</h2>
          ${g.items.map(row).join('')}
        </section>`).join('')}
      ${have.length ? `
        <details class="shop-have">
          <summary>Already have (${have.length})</summary>
          ${have.map(row).join('')}
        </details>` : ''}
      ${hiddenCount ? `<button class="btn ghost small" data-act="restore">Show ${hiddenCount} removed item${hiddenCount > 1 ? 's' : ''}</button>` : ''}
      <datalist id="shop-list">${shops.map((s) => `<option value="${esc(s)}">`).join('')}</datalist>`,
    mount(root) {
      const keyOf = (el) => el.closest('[data-key]').dataset.key;
      const save = (key, patch, msg) => {
        updateItem(d, key, patch);
        commit();
        if (msg) toast(msg);
        refresh();
      };
      on(root, 'click', '[data-act="bought"]', (el) => {
        const key = keyOf(el);
        const it = items.find((x) => x.key === key);
        save(key, { bought: !it.bought });
      });
      on(root, 'click', '[data-act="expand"]', (el) => {
        const edit = el.parentElement.querySelector('.shop-edit');
        edit.hidden = !edit.hidden;
      });
      on(root, 'click', '[data-act="have"]', (el) => {
        const key = keyOf(el);
        const it = items.find((x) => x.key === key);
        save(key, { have: !it.have }, it.have ? 'Back on the list' : 'Moved to “already have”');
      });
      on(root, 'click', '[data-act="remove"]', (el) => {
        removeItem(d, keyOf(el));
        commit();
        refresh();
      });
      on(root, 'change', '[data-f]', (el) => {
        const key = keyOf(el);
        const f = el.dataset.f;
        if (f === 'qty' && !key.startsWith('manual:')) {
          const original = shoppingList({ ...d, shop: {} }).items.find((x) => x.key === key)?.qtyText;
          save(key, { qty: el.value.trim() === original ? undefined : el.value.trim() });
        } else {
          save(key, { [f]: el.value.trim() });
        }
      });
      on(root, 'submit', '[data-form="add"]', (form, ev) => {
        ev.preventDefault();
        const ing = parseLine(form.item.value);
        if (!ing || ing.header) return;
        const qty = [fmtQty(ing.qty, ing.unit), unitLabel(ing.unit, ing.qty)].filter(Boolean).join(' ');
        addManual(d, { name: ing.name + (ing.note ? `, ${ing.note}` : ''), qty });
        commit();
        refresh();
        root.querySelector('[data-form="add"] input')?.focus();
      });
      on(root, 'click', '[data-act="restore"]', () => {
        restoreHidden(d);
        commit();
        refresh();
      });
      on(root, 'click', '[data-act="copy"]', async () => {
        const text = listAsText(d, items);
        try {
          if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ text });
          else { await navigator.clipboard.writeText(text); toast('List copied'); }
        } catch (err) {
          if (err.name !== 'AbortError') toast('Could not share the list');
        }
      });
    },
  };
}

// The group toggle is a route so it is remembered.
export function setShopGroup(group) {
  if (group === 'shop' || group === 'category') {
    state.settings.shopGroup = group;
    commit();
  }
}
