// Ingredient lines: parsing free text, formatting, scaling, categorising and combining.

const FRACTIONS = {
  '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4,
  '⅕': 1 / 5, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
};
const FRACTION_CHARS = Object.keys(FRACTIONS).join('');

// [canonical, family, factor to the family's base unit, aliases]
// Mass is based on grams, volume on millilitres; other units only combine with themselves.
const UNIT_DEFS = [
  ['g', 'mass', 1, ['g', 'gr', 'gram', 'grams', 'gramme', 'grammes']],
  ['kg', 'mass', 1000, ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms']],
  ['mg', 'mass', 0.001, ['mg']],
  ['oz', 'mass', 28.35, ['oz', 'ounce', 'ounces']],
  ['lb', 'mass', 453.6, ['lb', 'lbs', 'pound', 'pounds']],
  ['ml', 'vol', 1, ['ml', 'mls', 'millilitre', 'millilitres', 'milliliter', 'milliliters']],
  ['cl', 'vol', 10, ['cl']],
  ['dl', 'vol', 100, ['dl']],
  ['l', 'vol', 1000, ['l', 'litre', 'litres', 'liter', 'liters', 'ltr']],
  ['tsp', 'vol', 5, ['tsp', 'tsps', 'teaspoon', 'teaspoons']],
  ['tbsp', 'vol', 15, ['tbsp', 'tbsps', 'tbs', 'tablespoon', 'tablespoons']],
  ['cup', 'vol', 240, ['cup', 'cups']],
  ...[
    'pinch', 'bunch', 'clove', 'sprig', 'handful', 'tin', 'jar', 'pack', 'slice', 'sheet',
    'stick', 'head', 'knob', 'bulb', 'fillet', 'leaf', 'splash', 'dash', 'bag', 'bottle',
    'punnet', 'sachet', 'stalk', 'rasher', 'pot', 'drop',
  ].map((u) => [u, u, 1, [u, `${u}s`, `${u}es`]]),
];
const EXTRA_ALIASES = { can: 'tin', cans: 'tin', packet: 'pack', packets: 'pack', leaves: 'leaf' };

const UNITS = new Map();
for (const [canon, family, factor, aliases] of UNIT_DEFS) {
  const def = { canon, family, factor };
  UNITS.set(canon, def);
  for (const a of aliases) if (!UNITS.has(a)) UNITS.set(a, def);
}
for (const [alias, canon] of Object.entries(EXTRA_ALIASES)) UNITS.set(alias, UNITS.get(canon));

export const unitDef = (u) => UNITS.get(String(u || '').toLowerCase());

function readNumber(s) {
  let m;
  if ((m = s.match(/^(\d+)\s+(\d+)\/(\d+)/))) return [+m[1] + m[2] / m[3], m[0].length];
  if ((m = s.match(/^(\d+)\/(\d+)/))) return [m[1] / m[2], m[0].length];
  if ((m = s.match(new RegExp(`^(\\d+)?\\s*([${FRACTION_CHARS}])`)))) {
    return [(+m[1] || 0) + FRACTIONS[m[2]], m[0].length];
  }
  if ((m = s.match(/^\d+(?:[.,]\d+)?/))) return [parseFloat(m[0].replace(',', '.')), m[0].length];
  return null;
}

// "1½ tbsp olive oil, plus extra" → { qty: 1.5, unit: 'tbsp', name: 'olive oil', note: 'plus extra' }
// "For the sauce:" → { header: 'For the sauce' }
export function parseLine(raw) {
  let s = String(raw).trim().replace(/^[-•*·]\s*/, '');
  if (!s) return null;
  if (s.endsWith(':')) return { header: s.slice(0, -1).trim() };

  let qty = null;
  let unit = '';
  const n = readNumber(s);
  if (n) {
    qty = n[0];
    s = s.slice(n[1]);
    // Ranges such as "2-3" or "2 to 3": plan for the upper end.
    const range = s.match(/^\s*(?:-|–|to)\s*/);
    if (range) {
      const n2 = readNumber(s.slice(range[0].length));
      if (n2) {
        qty = Math.max(qty, n2[0]);
        s = s.slice(range[0].length + n2[1]);
      }
    }
    // Multipliers such as "2 x 400g tins".
    const times = s.match(/^\s*[x×]\s*/i);
    if (times) {
      const n2 = readNumber(s.slice(times[0].length));
      if (n2) {
        qty *= n2[0];
        s = s.slice(times[0].length + n2[1]);
      }
    }
    const u = s.match(/^\s*([a-zA-Z]+)\.?(?=[\s,]|$)/);
    if (u && unitDef(u[1])) {
      unit = unitDef(u[1]).canon;
      s = s.slice(u[0].length);
    }
    s = s.replace(/^\s*of\s+/i, '');
    // "400g tins tomatoes" → "tomatoes"; the weight is what matters for shopping.
    if (['mass', 'vol'].includes(unitDef(unit)?.family)) s = s.replace(/^\s*(tins?|cans?|jars?|packs?|packets?)\s+(of\s+)?/i, '');
  }

  s = s.trim();
  const comma = s.indexOf(',');
  const name = (comma >= 0 ? s.slice(0, comma) : s).trim();
  const note = comma >= 0 ? s.slice(comma + 1).trim() : '';
  return { qty, unit, name: name || String(raw).trim(), note };
}

export const parseLines = (text) =>
  String(text || '').split('\n').map(parseLine).filter(Boolean);

export function fmtQty(q, unit = '') {
  if (q == null || Number.isNaN(q)) return '';
  const fam = unitDef(unit)?.family;
  if ((fam === 'mass' || fam === 'vol') && ['g', 'ml', 'mg'].includes(unit) && q >= 10) {
    return String(Math.round(q));
  }
  const whole = Math.floor(q + 1e-9);
  const frac = q - whole;
  if (frac < 0.04) return String(whole);
  if (frac > 0.96) return String(whole + 1);
  const nice = [[1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾']];
  for (const [v, ch] of nice) if (Math.abs(frac - v) < 0.04) return `${whole || ''}${ch}`;
  return String(Math.round(q * (q < 1 ? 100 : 10)) / (q < 1 ? 100 : 10));
}

const PLURALS = { leaf: 'leaves', pinch: 'pinches', bunch: 'bunches', splash: 'splashes', dash: 'dashes' };

// Abbreviated units stay as they are; words such as "clove" or "cup" are pluralised.
export function unitLabel(unit, qty) {
  const def = unitDef(unit);
  if (!unit || !def || qty == null || qty <= 1) return unit || '';
  if (def.family === 'mass' || (def.family === 'vol' && unit !== 'cup')) return unit;
  return PLURALS[unit] || `${unit}s`;
}

export function fmtLine(ing) {
  if (ing.header) return `${ing.header}:`;
  const q = fmtQty(ing.qty, ing.unit);
  return [q, unitLabel(ing.unit, ing.qty), ing.name].filter(Boolean).join(' ') + (ing.note ? `, ${ing.note}` : '');
}

export const linesToText = (list) => (list || []).map(fmtLine).join('\n');

export const scaled = (ing, factor) =>
  ing.qty == null || factor === 1 ? ing : { ...ing, qty: ing.qty * factor };

// ---------- shopping categories ----------

export const CATEGORIES = [
  'Fruit & veg', 'Meat & fish', 'Dairy & chilled', 'Bakery', 'Pantry',
  'Spices & seasoning', 'Drinks', 'Frozen', 'Other',
];

// First match wins, so specific phrases come before general words. Each word matches at a
// word start; a trailing `$` also requires a word end (so "gin$" skips "ginger").
const CATEGORY_RULES = [
  ['Frozen', ['frozen', 'ice cream', 'sorbet']],
  ['Pantry', ['coconut milk', 'peanut butter', 'butter bean', 'tomato puree', 'tomato purée', 'passata', 'tinned',
    'chopped tomatoes', 'wine vinegar', 'stock', 'breadcrumb', 'panko', 'puff pastry', 'fish sauce']],
  ['Fruit & veg', ['eggplant', 'butternut', 'ginger', 'green bean', 'broad bean', 'runner bean', 'spring onion']],
  ['Drinks', ['wine', 'beer', 'cider', 'vermouth', 'brandy', 'cognac', 'rum$', 'port$', 'sherry', 'champagne',
    'prosecco', 'gin$', 'vodka', 'whisky', 'tonic', 'sparkling water', 'marsala', 'madeira']],
  ['Meat & fish', ['beef', 'lamb', 'pork', 'chicken', 'duck', 'veal', 'venison', 'bacon', 'pancetta', 'sausage',
    'chorizo', 'ham$', 'prosciutto', 'guinea fowl', 'pheasant', 'rabbit', 'steak', 'mince$', 'fish', 'salmon',
    'cod$', 'hake', 'sea bass', 'bream', 'tuna', 'prawn', 'shrimp', 'scallop', 'mussel', 'clam', 'crab', 'lobster',
    'squid', 'octopus', 'mackerel', 'trout', 'halibut', 'turbot', 'monkfish', 'oyster', 'brill', 'plaice', 'sole$']],
  ['Dairy & chilled', ['milk', 'cream', 'butter', 'cheese', 'parmesan', 'parmigiano', 'pecorino', 'gruyère',
    'gruyere', 'comté', 'comte', 'yoghurt', 'yogurt', 'crème', 'creme', 'egg', 'mascarpone', 'ricotta', 'mozzarella',
    'feta', 'burrata', 'buttermilk', 'kefir', 'labneh', 'halloumi', 'goat', 'pastry', 'tofu']],
  ['Spices & seasoning', ['black pepper', 'peppercorn', 'white pepper', 'coriander seed', 'fennel seed', 'cumin',
    'chilli flake', 'chili flake', 'bay lea', 'salt', 'paprika', 'cinnamon', 'nutmeg', 'cardamom', 'star anise',
    'saffron', 'turmeric', 'allspice', 'cayenne', 'dried oregano', 'sumac', 'za\'atar', 'mustard seed', 'clove$',
    'cloves$']],
  ['Bakery', ['bread', 'brioche', 'sourdough', 'baguette', 'focaccia', 'ciabatta', 'pitta', 'flatbread', 'tortilla',
    'crackers']],
  ['Pantry', ['flour', 'sugar', 'rice', 'pasta', 'spaghetti', 'oil', 'vinegar', 'honey', 'syrup', 'chocolate',
    'cocoa', 'almond', 'hazelnut', 'walnut', 'pistachio', 'pine nut', 'pecan', 'cashew', 'oats', 'polenta', 'lentil',
    'chickpea', 'mustard', 'soy', 'miso', 'tahini', 'yeast', 'baking powder', 'bicarbonate', 'gelatine', 'vanilla',
    'caper', 'olive', 'anchov', 'couscous', 'quinoa', 'noodle', 'treacle', 'jam$', 'dried', 'harissa',
    'sesame', 'nut', 'raisin', 'sultana', 'beans', 'worcestershire']],
  ['Fruit & veg', ['onion', 'garlic', 'shallot', 'leek', 'carrot', 'potato', 'tomato', 'lemon', 'lime', 'orange',
    'apple', 'pear$', 'pears$', 'parsley', 'basil', 'thyme', 'rosemary', 'coriander', 'cilantro', 'mint', 'dill',
    'chive', 'sage$', 'tarragon', 'chervil', 'lettuce', 'spinach', 'chard', 'kale', 'cabbage', 'fennel', 'celery',
    'mushroom', 'pepper', 'chilli', 'chili', 'courgette', 'zucchini', 'aubergine', 'squash', 'pumpkin', 'beetroot',
    'beet', 'radish', 'cucumber', 'avocado', 'berr', 'rhubarb', 'fig$', 'figs$', 'cherr', 'grape', 'pea$', 'peas$',
    'bean', 'asparagus', 'broccoli', 'cauliflower', 'artichoke', 'salad', 'rocket', 'watercress', 'plum',
    'peach', 'apricot', 'quince', 'pomegranate', 'mango', 'banana', 'celeriac', 'parsnip', 'turnip', 'swede',
    'endive', 'chicory', 'radicchio', 'sprout', 'herb', 'lemongrass', 'samphire']],
].map(([cat, words]) => [cat, words.map((w) => {
  const exact = w.endsWith('$');
  const body = w.replace(/\$$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}])${body}${exact ? '(?![\\p{L}])' : ''}`, 'u');
})]);

export function guessCategory(name) {
  const n = String(name || '').toLowerCase();
  for (const [cat, patterns] of CATEGORY_RULES) if (patterns.some((re) => re.test(n))) return cat;
  return 'Other';
}

// ---------- combining ----------

const SIZE_WORDS = /^(large|small|medium|big|fresh|ripe|good|good-quality|free-range|organic|extra)\s+/;

function singular(word) {
  if (/ies$/.test(word)) return word.replace(/ies$/, 'y');
  if (/(o|ch|sh|ss|x)es$/.test(word)) return word.replace(/es$/, '');
  if (/s$/.test(word) && !/ss$/.test(word)) return word.slice(0, -1);
  return word;
}

export function normName(name) {
  let n = String(name || '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();
  let prev;
  do { prev = n; n = n.replace(SIZE_WORDS, ''); } while (n !== prev);
  const words = n.split(' ');
  words[words.length - 1] = singular(words[words.length - 1]);
  return words.join(' ');
}

function familyOf(unit) {
  if (!unit) return 'count';
  return unitDef(unit)?.family || unit;
}

function displayAmount(base, family, unitsSeen) {
  const units = [...unitsSeen];
  if (units.length === 1) {
    const u = units[0];
    const q = base / (unitDef(u)?.factor || 1);
    return [fmtQty(q, u), unitLabel(u, q)].filter(Boolean).join(' ');
  }
  if (family === 'mass') return base >= 1000 ? `${fmtQty(base / 1000)} kg` : `${fmtQty(base, 'g')} g`;
  if (family === 'vol') {
    if (units.every((u) => u === 'tsp' || u === 'tbsp')) {
      return base >= 15 ? `${fmtQty(base / 15)} tbsp` : `${fmtQty(base / 5)} tsp`;
    }
    return base >= 1000 ? `${fmtQty(base / 1000)} l` : `${fmtQty(base, 'ml')} ml`;
  }
  return fmtQty(base);
}

// entries: [{ ing, factor, source }] → combined shopping items
export function consolidate(entries) {
  const map = new Map();
  for (const { ing, factor, source } of entries) {
    if (!ing || ing.header || !ing.name) continue;
    const family = familyOf(ing.unit);
    const key = `${normName(ing.name)}|${family}`;
    let item = map.get(key);
    if (!item) {
      item = { key, name: ing.name, family, base: 0, hasQty: false, units: new Set(), sources: [] };
      map.set(key, item);
    }
    if (ing.qty != null) {
      item.base += ing.qty * (factor || 1) * (unitDef(ing.unit)?.factor || 1);
      item.hasQty = true;
      if (ing.unit) item.units.add(ing.unit);
    }
    if (source && !item.sources.includes(source)) item.sources.push(source);
  }
  return [...map.values()].map((it) => ({
    key: it.key,
    name: it.name,
    qtyText: it.hasQty ? displayAmount(it.base, it.family, it.units) : '',
    sources: it.sources,
    category: guessCategory(it.name),
  }));
}
