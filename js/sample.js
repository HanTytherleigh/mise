// An example dinner so the whole workflow can be tried before planning a real one.

import {
  newDinner, newDish, addDishToDinner, newTask, newStorage, newLog, setCurrentDinner, todayStr,
} from './store.js';
import { parseLines } from './ingredients.js';

const recipe = (ingredients, method, notes = '') => ({ ingredients: parseLines(ingredients), method, notes });

export function loadSample() {
  const dinner = newDinner({
    name: 'Autumn supper',
    date: todayStr(5),
    serveTime: '19:30',
    guests: 6,
    notes: 'Sam: no pork. Drinks from 18:45, sit down 19:30.',
  });

  const gougeres = newDish({
    name: 'Gougères',
    course: 'Snacks',
    servings: 6,
    source: { title: 'Classic choux', url: '' },
    original: recipe(
      `125 ml water\n125 ml milk\n100 g butter\n1 tsp salt\n150 g plain flour\n4 eggs\n120 g Gruyère, grated`,
      `Bring water, milk, butter and salt to the boil.\nBeat in the flour and cook out for 2 minutes.\nCool slightly, then beat in the eggs one at a time.\nFold in most of the cheese, pipe, top with the rest.\nBake at 200°C for 20–25 minutes.`,
    ),
    working: {
      ...recipe(
        `125 ml water\n125 ml milk\n100 g butter\n1 tsp salt\n150 g plain flour\n4 eggs\n150 g Comté, grated\n1 pinch cayenne pepper`,
        `Bring water, milk, butter and salt to the boil.\nBeat in the flour and cook out for 2 minutes.\nCool slightly, then beat in the eggs one at a time.\nFold in the cheese and cayenne; pipe onto lined trays and freeze.\nBake from frozen at 200°C for 25 minutes.`,
        'Comté gives a nuttier flavour than Gruyère. Freezing piped dough means they come out of the oven warm as guests arrive.',
      ),
      updatedAt: Date.now(),
    },
    lessons: 'Pipe smaller than you think — about a walnut.',
  });

  const beetroot = newDish({
    name: 'Roast beetroot, whipped feta & hazelnuts',
    course: 'Starter',
    servings: 4,
    original: recipe(
      `6 beetroot\n2 tbsp olive oil\n4 sprigs thyme\n200 g feta\n100 ml Greek yoghurt\n1 lemon, zested and juiced\n50 g hazelnuts`,
      `Roast the beetroot wrapped in foil with oil and thyme until tender, about 1 hour.\nPeel and cut into wedges.\nWhip the feta with the yoghurt and lemon.\nSpread feta on plates, top with beetroot and toasted hazelnuts.`,
    ),
  });

  const lamb = newDish({
    name: 'Slow-roast lamb shoulder, salsa verde',
    course: 'Main',
    servings: 6,
    source: { title: 'Adapted from a Sunday paper', url: '' },
    original: recipe(
      `2 kg lamb shoulder, bone in\n1 bulb garlic\n4 sprigs rosemary\n250 ml white wine\n2 tbsp olive oil\nFor the salsa verde:\n1 bunch parsley\n1 bunch mint\n2 tbsp capers\n4 anchovies\n1 tsp Dijon mustard\n100 ml olive oil\n1 lemon`,
      `Stud the lamb with garlic and rosemary, rub with oil and season.\nRoast at 160°C for 4 hours with the wine in the tin, basting now and then.\nRest under foil for 30 minutes.\nChop the herbs, capers and anchovies; mix with mustard, oil and lemon.`,
    ),
  });

  const potatoes = newDish({
    name: 'Crushed new potatoes',
    course: 'Main',
    servings: 4,
    original: recipe(
      `1 kg new potatoes\n50 g butter\n2 tbsp olive oil\nSea salt flakes`,
      `Boil the potatoes until just tender.\nCrush lightly, dot with butter and oil, season.\nRoast at 220°C until crisp, about 30 minutes.`,
    ),
  });

  const pots = newDish({
    name: 'Chocolate pots, crème fraîche',
    course: 'Dessert',
    servings: 6,
    original: recipe(
      `200 g dark chocolate\n300 ml double cream\n150 ml milk\n3 egg yolks\n50 g caster sugar\n200 ml crème fraîche`,
      `Heat cream and milk; pour over the chocolate and stir until smooth.\nWhisk yolks and sugar, combine, pour into ramekins.\nBake in a bain-marie at 150°C for 25 minutes; cool, then chill.\nServe with crème fraîche.`,
    ),
  });

  for (const dish of [gougeres, beetroot, lamb, potatoes, pots]) addDishToDinner(dinner.id, dish.id, dish.course);

  const T = (p) => newTask({ dinnerId: dinner.id, ...p });
  const freezeGougeres = T({ title: 'Make & freeze gougère dough', dishId: gougeres.id, phase: 'advance', kind: 'prep', minutes: 40, deadline: todayStr(2), equipment: ['Stand mixer'], status: 'done', doneAt: Date.now() });
  T({ title: 'Toast hazelnuts', dishId: beetroot.id, phase: 'advance', kind: 'cook', minutes: 15, deadline: todayStr(3), equipment: ['Oven'] });
  const roastBeets = T({ title: 'Roast beetroot', dishId: beetroot.id, phase: 'daybefore', kind: 'cook', minutes: 60, active: false, equipment: ['Oven'] });
  T({ title: 'Peel & cut beetroot', dishId: beetroot.id, phase: 'daybefore', kind: 'prep', minutes: 15, deps: [roastBeets.id] });
  T({ title: 'Whip feta', dishId: beetroot.id, phase: 'daybefore', kind: 'prep', minutes: 10, equipment: ['Food processor'] });
  const makePots = T({ title: 'Make chocolate pots', dishId: pots.id, phase: 'daybefore', kind: 'cook', minutes: 45, equipment: ['Oven'] });
  T({ title: 'Stud & season lamb', dishId: lamb.id, phase: 'daybefore', kind: 'prep', minutes: 15 });

  const lambOut = T({ title: 'Take lamb out of the fridge', dishId: lamb.id, phase: 'dayof', kind: 'rest', minutes: 60, active: false });
  const roast = T({ title: 'Slow-roast lamb', dishId: lamb.id, phase: 'dayof', kind: 'cook', minutes: 240, active: false, equipment: ['Oven'], deps: [lambOut.id], notes: '160°C, wine in the tin. Baste every hour.' });
  T({ title: 'Rest lamb under foil', dishId: lamb.id, phase: 'dayof', kind: 'rest', minutes: 30, active: false, deps: [roast.id], doneBy: '20:15' });
  T({ title: 'Make salsa verde', dishId: lamb.id, phase: 'dayof', kind: 'prep', minutes: 15, doneBy: '20:00' });
  const boil = T({ title: 'Boil potatoes', dishId: potatoes.id, phase: 'dayof', kind: 'cook', minutes: 25, equipment: ['Hob'] });
  T({ title: 'Crush & roast potatoes', dishId: potatoes.id, phase: 'dayof', kind: 'cook', minutes: 30, active: false, equipment: ['Oven'], deps: [boil.id], doneBy: '20:15' });
  const bake = T({ title: 'Bake gougères from frozen', dishId: gougeres.id, phase: 'dayof', kind: 'cook', minutes: 25, active: false, equipment: ['Oven'], deps: [freezeGougeres.id], doneBy: '19:00' });
  T({ title: 'Plate the beetroot', dishId: beetroot.id, phase: 'dayof', kind: 'finish', minutes: 10 });
  T({ title: 'Take chocolate pots out of the fridge', dishId: pots.id, phase: 'dayof', kind: 'rest', minutes: 20, active: false, deps: [makePots.id], doneBy: '21:00' });

  newStorage({ dinnerId: dinner.id, dishId: gougeres.id, taskId: bake.id, item: 'Piped gougère dough', container: 'Freezer bag, labelled', location: 'Freezer, top drawer', preparedOn: todayStr(), status: 'stored', instructions: 'Frozen on a tray first, then bagged.', defrost: 'Bake straight from frozen.', finishing: 'Egg wash, cheese on top, 200°C for 25 min.' });
  newStorage({ dinnerId: dinner.id, dishId: beetroot.id, item: 'Whipped feta', container: 'Glass tub', location: 'Fridge', status: 'planned', finishing: 'Loosen with a little lemon juice.' });
  newStorage({ dinnerId: dinner.id, dishId: pots.id, item: 'Chocolate pots', container: 'Ramekins, clingfilmed', location: 'Fridge, bottom shelf', status: 'planned', finishing: 'Out 20 minutes before serving.' });

  newLog({ dinnerId: dinner.id, text: 'Borrow the long serving platter from Jo for the lamb.' });
  newLog({ dinnerId: dinner.id, dishId: lamb.id, kind: 'next', text: 'Try a couple of anchovies in the rub as well.' });

  setCurrentDinner(dinner.id);
  return dinner;
}
