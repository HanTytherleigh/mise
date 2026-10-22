import { state, commit, replaceState, emptyState, todayStr } from '../store.js';
import { requestPersistence } from '../db.js';
import { loadSample } from '../sample.js';
import { esc, icon, pageHead, on, toast, refresh, go, fmtStamp } from '../ui.js';

export const APP_VERSION = '1.1.0';

function backupFile() {
  const json = JSON.stringify({ app: 'mise', version: APP_VERSION, exportedAt: new Date().toISOString(), data: state });
  return new File([json], `mise-backup-${todayStr()}.json`, { type: 'application/json' });
}

async function exportBackup() {
  const file = backupFile();
  // On iPhone the share sheet lets you "Save to Files" (iCloud Drive) or AirDrop it.
  if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ files: [file], title: 'Mise backup' });
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return true;
}

function validBackup(obj) {
  const data = obj?.app === 'mise' ? obj.data : obj;
  if (!data || !Array.isArray(data.dinners) || !Array.isArray(data.dishes)) return null;
  return data;
}

export function settingsView() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const counts = [
    [state.dinners.length, 'dinner'], [state.dishes.length, 'dish'], [state.tasks.length, 'task'], [state.logs.length, 'note'],
  ].map(([n, w]) => `${n} ${w}${n === 1 ? '' : w.endsWith('h') ? 'es' : 's'}`).join(' · ');

  return {
    tab: 'home',
    title: 'Settings',
    html: `
      ${pageHead({ title: 'Settings & backup', back: '/' })}

      <section class="card">
        <h2 class="section-title">Backup</h2>
        <p>${esc(counts)}</p>
        <p class="small muted">${state.settings.lastBackup ? `Last backup ${esc(fmtStamp(state.settings.lastBackup))}.` : 'Never backed up.'}
          Your notebook lives only on this device. Save a backup file now and then — to Files, iCloud Drive or email.</p>
        <div class="stack">
          <button class="btn primary block" data-act="export">${icon('share')} Save a backup</button>
          <label class="btn ghost block file-btn">Restore from a backup<input type="file" accept="application/json,.json" data-act="import" hidden></label>
        </div>
      </section>

      <section class="card">
        <h2 class="section-title">On your iPhone</h2>
        ${standalone ? '<p class="ok">Running from your Home Screen.</p>' : `
          <ol class="steps">
            <li>Open this page in <strong>Safari</strong>.</li>
            <li>Tap the <strong>Share</strong> button.</li>
            <li>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
          </ol>`}
        <p class="small muted">Once added, Mise opens full-screen, works offline, and Safari won't clear its data for being unused.</p>
        <p class="small muted" data-persist></p>
      </section>

      <section class="card">
        <h2 class="section-title">Try it out</h2>
        <p class="small muted">Adds an example three-course dinner (Dany's Birthday) with dishes, tasks, storage and notes.</p>
        <button class="btn ghost block" data-act="sample">Add sample dinner</button>
      </section>

      <div class="danger-zone">
        <button class="btn danger block" data-act="wipe">Erase everything on this device</button>
      </div>
      <p class="small muted center">Mise ${APP_VERSION}</p>`,
    mount(root) {
      requestPersistence().then((ok) => {
        const el = root.querySelector('[data-persist]');
        if (el) el.textContent = ok ? 'Storage is marked as persistent.' : '';
      });
      on(root, 'click', '[data-act="export"]', async () => {
        if (await exportBackup()) {
          state.settings.lastBackup = Date.now();
          commit();
          toast('Backup saved');
          refresh();
        }
      });
      on(root, 'change', '[data-act="import"]', async (el) => {
        const file = el.files?.[0];
        if (!file) return;
        try {
          const data = validBackup(JSON.parse(await file.text()));
          if (!data) throw new Error('That file is not a Mise backup');
          const msg = `Replace everything on this device with the backup (${data.dinners.length} dinners, ${data.dishes.length} dishes)?`;
          if (!confirm(msg)) return;
          await replaceState(data);
          toast('Backup restored');
          go('/');
        } catch (err) {
          toast(err.message || 'Could not read that file');
        } finally {
          el.value = '';
        }
      });
      on(root, 'click', '[data-act="sample"]', () => {
        loadSample();
        commit();
        toast('Sample dinner added');
        go('/');
      });
      on(root, 'click', '[data-act="wipe"]', async () => {
        if (!confirm('Erase every dinner, dish and note on this device? Save a backup first if you might want them.')) return;
        if (!confirm('Really erase everything?')) return;
        await replaceState(emptyState());
        toast('Erased');
        go('/');
      });
    },
  };
}
