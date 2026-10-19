// Persistence: the whole notebook is one JSON-able object kept in IndexedDB,
// with localStorage as a fallback if IndexedDB is unavailable.

const DB_NAME = 'mise';
const STORE = 'kv';
const KEY = 'state';
const LS_KEY = 'mise-state';

let dbPromise;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const db = () => (dbPromise ||= openDb());

export async function loadState() {
  try {
    const d = await db();
    return await new Promise((resolve, reject) => {
      const req = d.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB unavailable, using localStorage', err);
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}

export async function saveState(state) {
  try {
    const d = await db();
    await new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(state, KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, using localStorage', err);
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { console.error(e); }
  }
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persisted && await navigator.storage.persisted()) return true;
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch { /* not supported */ }
  return false;
}
