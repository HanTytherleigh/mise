// An example dinner so the whole workflow can be tried before planning a real one.

import {
  newDinner, newDish, addDishToDinner, newTask, newStorage, newLog, setCurrentDinner, todayStr,
} from './store.js';
import { parseLines } from './ingredients.js';

const recipe = (ingredients, method, notes = '') => ({ ingredients: parseLines(ingredients), method, notes });

export function loadSample() {
  const day = 5;
  const dinner = newDinner({
    name: "Dany's Birthday",
    date: todayStr(day),
    serveTime: '19:00',
    guests: 6,
    courses: ['Canapés', 'Main', 'Dessert'],
    notes: 'Canapés with drinks from 19:00 · main at 20:00 · dessert around 21:15. Candles for the dessert!',
  });

  const dish = (name, course, ingredients, method, extra = {}) =>
    newDish({ name, course, servings: 6, original: recipe(ingredients, method, extra.notes), ...extra });

  // ---------- canapés ----------
  const croustades = dish('Smoked salmon croustades', 'Canapés',
    `9 slices white bread\n30 g butter, melted\n150 g smoked salmon\n150 g cream cheese\n1 lemon, zested\n1 bunch dill\nBlack pepper`,
    `Cut 18 rounds from the bread with a 5 cm cutter and roll each one thin.\nPress into a mini muffin tin, brush with melted butter and bake at 180°C for 10–12 minutes until crisp.\nCool completely and keep in an airtight tin.\nBeat the cream cheese with the lemon zest, chopped dill and black pepper.\nPipe into the cases, top with a ribbon of smoked salmon and a sprig of dill.`,
    { notes: 'Makes 18 — three each.' });

  const tartlets = dish('Pesto tartlets, whipped brie, confit cherry tomatoes', 'Canapés',
    `1 sheet ready-rolled shortcrust pastry\n18 cherry tomatoes\n100 ml olive oil\n2 garlic cloves, bashed\n2 sprigs thyme\n150 g brie, rind removed\n50 ml double cream\n3 tbsp basil pesto, homemade or good shop-bought\n1 bunch basil`,
    `Cut 18 rounds of pastry, line a mini tart tin and blind-bake at 190°C for about 12 minutes until golden.\nConfit the tomatoes in the olive oil with the garlic and thyme at 120°C for about 1 hour, until soft but holding their shape.\nWhip the brie with the cream until smooth and pipeable.\nTo serve: a little pesto in each case, a swirl of brie, a confit tomato and a small basil leaf.`);

  const tartare = dish('Rice crackers with steak tartare', 'Canapés',
    `200 g beef fillet\n1 shallot, very finely diced\n1 tbsp capers, chopped\n2 cornichons, finely chopped\n1 tsp Dijon mustard\n1 tsp Worcestershire sauce\n2 dashes Tabasco\n1 egg yolk\n1 tbsp chives, finely chopped\nSalt and black pepper\n18 rice crackers`,
    `Put the beef in the freezer for 20 minutes to firm up, then dice very finely by hand. Keep cold.\nMix the shallot, capers, cornichons, mustard, Worcestershire, Tabasco and egg yolk.\nJust before serving, fold the dressing and chives through the beef and season.\nSpoon onto the rice crackers at the last minute so they stay crisp.`,
    { notes: 'Ask the butcher for fillet suitable for tartare and buy it as close to the day as you can.' });

  // ---------- main ----------
  const duck = dish('Duck leg confit', 'Main',
    `6 duck legs\n60 g coarse sea salt\n4 garlic cloves, sliced\n6 sprigs thyme\n2 bay leaves\n1 tsp black peppercorns, crushed\n1 kg duck fat`,
    `Rub the legs with the salt, garlic, thyme, bay and pepper. Cover and cure in the fridge overnight.\nRinse off the cure and pat the legs very dry.\nMelt the duck fat, submerge the legs and cook at 140°C for 2½–3 hours until the meat is very tender.\nCool and keep the legs submerged in the fat.\nOn the day: lift out, scrape off the excess fat and roast skin-side up at 200°C for 25–30 minutes until crisp.`,
    { lessons: 'Dry the skin really well before the final roast — it crisps much better.' });

  const mash = dish('Comté mashed potatoes', 'Main',
    `1.2 kg floury potatoes, such as Maris Piper\n100 g butter\n150 ml whole milk\n100 ml double cream\n150 g Comté, finely grated\nNutmeg\nSalt`,
    `Peel and cut the potatoes into even chunks; boil in salted water until completely tender.\nDrain well and let them steam dry for a couple of minutes, then pass through a ricer.\nHeat the milk, cream and butter; beat into the potatoes.\nBeat in the Comté until glossy and stretchy. Season with salt and a grating of nutmeg.`);

  const carrots = dish('Braised rainbow carrots', 'Main',
    `800 g rainbow carrots\n40 g butter\n250 ml chicken stock\n1 tbsp honey\n3 sprigs thyme\n1 tbsp parsley, chopped`,
    `Peel the carrots and halve any large ones lengthways.\nPut them in a wide pan with the butter, stock, honey and thyme. Cover and braise gently for about 15 minutes.\nUncover and bubble until the liquid reduces to a glaze. Finish with parsley.`);

  const asparagus = dish('Blanched buttered asparagus', 'Main',
    `2 bunches asparagus\n30 g butter\n1 lemon, zested\nFlaky sea salt`,
    `Snap off the woody ends.\nBlanch in well-salted boiling water for 2–3 minutes, then plunge into iced water and drain.\nTo serve: toss in foaming butter for 1–2 minutes, finish with lemon zest and flaky salt.`);

  const jus = dish('Blackberry & white wine jus', 'Main',
    `2 shallots, finely sliced\n1 tbsp duck fat\n200 ml dry white wine\n500 ml chicken stock\n2 sprigs thyme\n150 g blackberries\n1 tbsp redcurrant jelly\n1 tsp sherry vinegar\n20 g cold butter, diced`,
    `Soften the shallots in the duck fat.\nAdd the wine and reduce by half.\nAdd the stock, thyme and half the blackberries; simmer until reduced to about 250 ml.\nStrain, pressing on the berries. Stir in the redcurrant jelly and vinegar.\nTo serve: reheat, whisk in the cold butter and add the remaining blackberries.`);

  // ---------- dessert ----------
  const iceCream = dish('Vanilla ice cream', 'Dessert',
    `300 ml whole milk\n300 ml double cream\n1 vanilla pod\n5 egg yolks\n100 g caster sugar`,
    `Heat the milk and cream with the split vanilla pod and seeds; leave to infuse for 20 minutes.\nWhisk the yolks and sugar until pale, pour over the warm milk and return to the pan.\nStir over a low heat until the custard coats the back of a spoon. Strain and chill thoroughly.\nChurn in an ice cream maker, then freeze.`);

  const crumble = dish('Oat flour crumble', 'Dessert',
    `100 g oat flour\n50 g rolled oats\n75 g cold butter, diced\n60 g light brown sugar\n½ tsp ground cinnamon\n1 pinch salt`,
    `Rub the butter into the oat flour until it looks like breadcrumbs.\nStir in the oats, sugar, cinnamon and salt, and squeeze into small clumps.\nSpread on a lined tray and bake at 180°C for 15–18 minutes, stirring halfway, until golden.\nCool on the tray and keep in an airtight tin.`);

  const pears = dish('White wine poached pear halves', 'Dessert',
    `3 pears, ripe but firm\n500 ml dry white wine\n250 ml water\n150 g caster sugar\n1 lemon, peel in strips\n1 cinnamon stick\n2 star anise`,
    `Simmer the wine, water, sugar, lemon peel and spices until the sugar dissolves.\nPeel, halve and core the pears; poach gently for 15–20 minutes until tender.\nCool in the syrup.\nReduce a ladle of the syrup to drizzle over when serving.`,
    { notes: 'Six halves — one each.' });

  for (const d of [croustades, tartlets, tartare, duck, mash, carrots, asparagus, jus, iceCream, crumble, pears]) {
    addDishToDinner(dinner.id, d.id, d.course);
  }

  // ---------- preparation plan ----------
  const T = (p) => newTask({ dinnerId: dinner.id, ...p });
  const oven = ['Oven'];
  const hob = ['Hob'];

  // Advance
  const cure = T({ title: 'Cure the duck legs', dishId: duck.id, phase: 'advance', kind: 'prep', minutes: 20, deadline: todayStr(day - 3), status: 'done', doneAt: Date.now() });
  const confit = T({ title: 'Confit the duck legs in fat', dishId: duck.id, phase: 'advance', kind: 'cook', minutes: 180, active: false, equipment: oven, deadline: todayStr(day - 2), deps: [cure.id] });
  const churn = T({ title: 'Make & churn the vanilla ice cream', dishId: iceCream.id, phase: 'advance', kind: 'cook', minutes: 60, equipment: ['Ice cream maker'], deadline: todayStr(day - 2), notes: 'Freeze the ice cream maker bowl the day before.' });
  const bakeCrumble = T({ title: 'Bake the oat crumble', dishId: crumble.id, phase: 'advance', kind: 'cook', minutes: 30, equipment: oven, deadline: todayStr(day - 2) });
  const cases = T({ title: 'Bake croustade cases', dishId: croustades.id, phase: 'advance', kind: 'cook', minutes: 30, equipment: oven, deadline: todayStr(day - 2) });

  // Day before
  const poach = T({ title: 'Poach the pears', dishId: pears.id, phase: 'daybefore', kind: 'cook', minutes: 40, equipment: hob });
  const jusBase = T({ title: 'Make the jus base', dishId: jus.id, phase: 'daybefore', kind: 'cook', minutes: 60, equipment: hob });
  T({ title: 'Blind-bake tartlet cases', dishId: tartlets.id, phase: 'daybefore', kind: 'cook', minutes: 30, equipment: oven });
  const tomatoes = T({ title: 'Confit the cherry tomatoes', dishId: tartlets.id, phase: 'daybefore', kind: 'cook', minutes: 60, active: false, equipment: oven });
  const brie = T({ title: 'Whip the brie', dishId: tartlets.id, phase: 'daybefore', kind: 'prep', minutes: 10 });
  const blanch = T({ title: 'Blanch & refresh the asparagus', dishId: asparagus.id, phase: 'daybefore', kind: 'prep', minutes: 20, equipment: hob });
  T({ title: 'Peel & halve the carrots', dishId: carrots.id, phase: 'daybefore', kind: 'prep', minutes: 20 });
  T({ title: 'Mix the dill cream cheese', dishId: croustades.id, phase: 'daybefore', kind: 'prep', minutes: 10 });

  // On the day — canapés at 19:00
  T({ title: 'Fill the croustades', dishId: croustades.id, phase: 'dayof', kind: 'finish', minutes: 15, doneBy: '18:30', deps: [cases.id] });
  T({ title: 'Assemble the tartlets', dishId: tartlets.id, phase: 'dayof', kind: 'finish', minutes: 15, doneBy: '18:45', deps: [tomatoes.id, brie.id] });
  const dice = T({ title: 'Dice the beef for tartare', dishId: tartare.id, phase: 'dayof', kind: 'prep', minutes: 20, doneBy: '18:15', notes: '20 minutes in the freezer first makes it much easier to dice.' });
  T({ title: 'Dress tartare & spoon onto crackers', dishId: tartare.id, phase: 'dayof', kind: 'finish', minutes: 10, deps: [dice.id], notes: 'Last minute, so the crackers stay crisp.' });

  // Main at 20:00
  const outOfFat = T({ title: 'Lift duck legs out of the fat', dishId: duck.id, phase: 'dayof', kind: 'prep', minutes: 10, deps: [confit.id] });
  const crisp = T({ title: 'Crisp the duck legs', dishId: duck.id, phase: 'dayof', kind: 'cook', minutes: 30, active: false, equipment: oven, deps: [outOfFat.id], notes: '200°C, skin-side up.' });
  const boil = T({ title: 'Boil the potatoes', dishId: mash.id, phase: 'dayof', kind: 'cook', minutes: 25, active: false });
  const mashIt = T({ title: 'Mash with butter & Comté', dishId: mash.id, phase: 'dayof', kind: 'finish', minutes: 15, deps: [boil.id] });
  const braise = T({ title: 'Braise the carrots', dishId: carrots.id, phase: 'dayof', kind: 'cook', minutes: 25, active: false });
  const finishJus = T({ title: 'Reheat & finish the jus', dishId: jus.id, phase: 'dayof', kind: 'reheat', minutes: 10, doneBy: '19:40', deps: [jusBase.id] });
  const butterAsp = T({ title: 'Butter the asparagus', dishId: asparagus.id, phase: 'dayof', kind: 'reheat', minutes: 5, deps: [blanch.id] });
  T({ title: 'Plate the main', phase: 'dayof', kind: 'finish', minutes: 10, doneBy: '20:05', deps: [crisp.id, mashIt.id, braise.id, finishJus.id, butterAsp.id] });

  // Dessert around 21:15
  const soften = T({ title: 'Take the ice cream out to soften', dishId: iceCream.id, phase: 'dayof', kind: 'rest', minutes: 10, active: false, deps: [churn.id] });
  const warmPears = T({ title: 'Warm the pears in their syrup', dishId: pears.id, phase: 'dayof', kind: 'reheat', minutes: 10, deps: [poach.id] });
  T({ title: 'Plate dessert (and light the candles!)', phase: 'dayof', kind: 'finish', minutes: 10, doneBy: '21:20', deps: [soften.id, warmPears.id, bakeCrumble.id] });

  // ---------- storage ----------
  const S = (p) => newStorage({ dinnerId: dinner.id, ...p });
  S({ dishId: duck.id, taskId: crisp.id, item: 'Confit duck legs', container: 'Deep dish, covered by the fat', location: 'Fridge, bottom shelf', instructions: 'Keep the legs fully submerged in the fat.', finishing: 'Scrape off the fat; roast skin-side up at 200°C for 25–30 min until crisp.' });
  S({ dishId: iceCream.id, taskId: soften.id, item: 'Vanilla ice cream', container: '1 l tub', location: 'Freezer', finishing: 'Out 10 minutes before scooping.' });
  S({ dishId: crumble.id, item: 'Oat crumble', container: 'Airtight tin', location: 'Larder', finishing: 'Re-crisp for 5 minutes in a warm oven if it has softened.' });
  S({ dishId: croustades.id, item: 'Croustade cases', container: 'Airtight tin', location: 'Larder' });
  S({ dishId: pears.id, taskId: warmPears.id, item: 'Poached pears', container: 'Lidded tub, in their syrup', location: 'Fridge', finishing: 'Warm gently in the syrup.' });
  S({ dishId: jus.id, taskId: finishJus.id, item: 'Jus base', container: 'Jug, covered', location: 'Fridge', finishing: 'Reheat, whisk in the cold butter, add the fresh blackberries.' });
  S({ dishId: asparagus.id, taskId: butterAsp.id, item: 'Blanched asparagus', container: 'Tub lined with kitchen paper', location: 'Fridge', finishing: 'Toss in foaming butter for 1–2 minutes.' });
  S({ dishId: tartlets.id, item: 'Confit cherry tomatoes', container: 'Jar, in their oil', location: 'Fridge', finishing: 'Bring back to room temperature.' });
  S({ dishId: tartlets.id, item: 'Whipped brie', container: 'Piping bag', location: 'Fridge', finishing: 'Out 30 minutes before piping.' });

  // ---------- notes ----------
  newLog({ dinnerId: dinner.id, text: 'Order beef fillet from the butcher for tartare — collect the day before.' });
  newLog({ dinnerId: dinner.id, dishId: duck.id, text: "Duck is Dany's favourite — think about doing an extra leg for seconds." });
  newLog({ dinnerId: dinner.id, text: 'Birthday candles and matches!' });

  setCurrentDinner(dinner.id);
  return dinner;
}
