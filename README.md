# Mise

A personal, mobile-first chef's notebook for planning dinner parties.

> Let the cook focus on cooking; let the notebook remember the logistics.

Mise is an installable web app (PWA). It's plain HTML, CSS and JavaScript, so there's no build step and nothing to install, and GitHub Pages can host it as-is. Everything you enter stays on your phone (in the browser's IndexedDB). Nothing is sent anywhere.

## What it does

- **Dinners**: name, date, guests, serving time and courses. You can duplicate a past dinner to host it again.
- **Dish notebook**: ingredients, method, source, photos, preferences, substitutions and lessons. Each dish keeps the **original** recipe separate from **my version**, and changes for one dinner are stored on that dinner.
- **Preparation plan**: tasks grouped into *Advance*, *Day before* and *On the day*, each with a duration, deadline, the tasks it waits for, and the equipment it uses.
- **Service timeline**: works backwards from the serving time. It flags overlapping hands-on tasks, equipment clashes (e.g. two things needing the oven) and tasks timed to start before the thing they depend on is finished. You can fix any task's start or "done by" time.
- **Service mode**: a full-screen checklist with big tick buttons, a live countdown and storage reminders. It keeps the screen awake where the phone allows it.
- **Shopping list**: combines the ingredients from every dish, scaled to your guest count, with units merged (g/kg, ml/l, spoons). You can group it by category or by shop, mark things you already have, correct amounts, add your own items, and copy or share the list.
- **Storage**: container, location, date prepared, and notes on cooling, defrosting and finishing. Mise doesn't make food-safety assumptions.
- **Notes & review**: quick notes that don't need sorting, plus a post-dinner review (what worked, substitutions, real timings, next time). You can add any of these notes to *my version* of a dish.
- **Backup**: save a single `.json` file (through the iPhone share sheet: Files, iCloud Drive, AirDrop) and restore it later.

### Ingredient lines

Type one ingredient per line, like you'd write it:

```
200 g plain flour
1½ tbsp olive oil, plus extra
2 x 400g tins chopped tomatoes
For the sauce:
1 bunch parsley
Salt, to taste
```

Mise reads the quantity, unit, name and note. A line ending in `:` starts a section. Set "Recipe serves" on a dish so its quantities scale to the number of guests.

## Hosting on GitHub Pages

1. Merge this into your default branch (or use any branch).
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, then pick the branch and the `/ (root)` folder.
3. After a minute or so the app is live at `https://<your-username>.github.io/mise/`.

### Install on iPhone

Open the Pages URL in **Safari**, tap **Share**, choose **Add to Home Screen**, then **Add**. Mise then opens full-screen and works offline. Home Screen apps also keep their data even if you don't open them for a while, which isn't true of ordinary Safari sites.

Your data is tied to that installed app on that phone. **Save a backup now and then** from Settings. The home screen reminds you if you haven't backed up in two weeks.

## Releasing changes

Phones keep a cached copy of the app so it works offline. When you change any app file, bump `VERSION` in `sw.js` (and add new files to its `SHELL` list). Phones then pick up the new version the next time Mise is opened.

## Running locally

Any static server works, for example:

```
npx http-server -c-1 .
```

and open http://localhost:8080. (Service workers need `localhost` or HTTPS, so opening `index.html` directly from disk won't give you offline support.)

## Code map

| File | Purpose |
| --- | --- |
| `js/store.js` | Data model, creation and mutation helpers, persistence |
| `js/db.js` | IndexedDB storage (localStorage fallback) |
| `js/ingredients.js` | Parsing, formatting, scaling, categorising and combining ingredient lines |
| `js/schedule.js` | Backwards scheduling, next recommended task, conflict detection |
| `js/shopping.js` | Builds the consolidated shopping list for a dinner |
| `js/views/*.js` | One module per area: home, menu, dish, tasks, shopping, notes, settings |
| `js/sample.js` | The example dinner (Dany's Birthday) |
| `sw.js` | Offline caching |
