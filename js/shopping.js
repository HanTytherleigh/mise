// The consolidated shopping list for a dinner. Items derived from recipes are computed fresh
// each time (so they follow menu changes); what the cook has said about them — already have it,
// bought, a corrected quantity, a shop — lives in dinner.shop keyed by the item's key.

import { consolidate, guessCategory, CATEGORIES } from './ingredients.js';
import { dinnerDishes, dishVersion, find, scaleFactor, uid } from './store.js';

export function shoppingList(dinner) {
  const entries = [];
  const unscaled = [];
  for (const dd of dinnerDishes(dinner.id)) {
    const dish = find('dishes', dd.dishId);
    if (!dish) continue;
    if (!dish.servings) unscaled.push(dish.name);
    const factor = scaleFactor(dish, dd, dinner);
    for (const ing of dishVersion(dish, dd.version).ingredients || []) {
      entries.push({ ing, factor, source: dish.name });
    }
    for (const ing of dd.extraIngredients || []) entries.push({ ing, factor: 1, source: dish.name });
  }

  const shop = dinner.shop || {};
  const items = consolidate(entries)
    .map((it) => {
      const st = shop[it.key] || {};
      return {
        ...it,
        qtyText: st.qty ?? it.qtyText,
        corrected: st.qty != null,
        category: st.category || it.category,
        shop: st.shop || '',
        have: !!st.have,
        bought: !!st.bought,
        hidden: !!st.hidden,
        manual: false,
      };
    })
    .filter((it) => !it.hidden);

  for (const m of dinner.manualItems || []) {
    items.push({
      key: `manual:${m.id}`,
      name: m.name,
      qtyText: m.qty || '',
      sources: [],
      category: m.category || guessCategory(m.name),
      shop: m.shop || '',
      have: !!m.have,
      bought: !!m.bought,
      manual: true,
    });
  }
  const hiddenCount = Object.values(shop).filter((s) => s.hidden).length;
  return { items, unscaled, hiddenCount };
}

export function updateItem(dinner, key, patch) {
  if (key.startsWith('manual:')) {
    const m = dinner.manualItems.find((x) => `manual:${x.id}` === key);
    if (m) Object.assign(m, patch);
    return;
  }
  dinner.shop ||= {};
  dinner.shop[key] = { ...dinner.shop[key], ...patch };
}

export function removeItem(dinner, key) {
  if (key.startsWith('manual:')) {
    dinner.manualItems = dinner.manualItems.filter((x) => `manual:${x.id}` !== key);
  } else {
    updateItem(dinner, key, { hidden: true });
  }
}

export function restoreHidden(dinner) {
  for (const st of Object.values(dinner.shop || {})) delete st.hidden;
}

export function addManual(dinner, { name, qty }) {
  dinner.manualItems ||= [];
  dinner.manualItems.push({ id: uid(), name, qty, category: guessCategory(name), shop: '', have: false, bought: false });
}

export function groupItems(items, by) {
  const groups = new Map();
  const order = by === 'shop' ? null : CATEGORIES;
  for (const it of items) {
    const g = by === 'shop' ? it.shop || 'Anywhere' : it.category || 'Other';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(it);
  }
  const names = [...groups.keys()].sort((a, b) => {
    if (order) return order.indexOf(a) - order.indexOf(b);
    if (a === 'Anywhere') return 1;
    if (b === 'Anywhere') return -1;
    return a.localeCompare(b);
  });
  return names.map((name) => ({
    name,
    items: groups.get(name).sort((a, b) => a.bought - b.bought || a.name.localeCompare(b.name)),
  }));
}

export function listAsText(dinner, items) {
  const toBuy = items.filter((i) => !i.have && !i.bought);
  const lines = [`${dinner.name || 'Dinner'} — shopping`];
  for (const g of groupItems(toBuy, 'category')) {
    lines.push('', g.name.toUpperCase());
    for (const it of g.items) lines.push(`• ${it.qtyText ? `${it.qtyText} ` : ''}${it.name}`);
  }
  return lines.join('\n');
}
