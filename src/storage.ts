// storage.ts — where this browser keeps rhogov's state, and what happens when
// localStorage is full.
//
// localStorage holds about 5 MB per site, and the site is shared: every app
// published at rhovision-org.github.io (quantum-os keeps its rooms there) draws
// on the same allowance. When it is full, a write is refused. Before, rhogov
// swallowed that refusal, so a key you had just set up worked until the next
// reload and was then gone.
//
// Now a refused write goes to IndexedDB instead, which has a far larger,
// separate allowance, and the stale localStorage copy is removed so it can
// never come back in its place. A read takes localStorage first, then the
// backup. The backup is read once, before the app starts (`openBackup`), so
// reads stay synchronous.

import { signal } from "@preact/signals";

const DB = "rhogov", STORE = "kv";
const backup = new Map<string, string>();
let db: IDBDatabase | null = null;

/** Keys this browser holds in the backup because localStorage refused them. */
export const inBackup = signal<string[]>([]);
/** A write neither localStorage nor the backup kept: it is gone on reload. */
export const notKept = signal(false);

const listBackup = () => { inBackup.value = [...backup.keys()]; };

/** Read the backup into memory. Call once before the app's state is loaded. */
export function openBackup(timeoutMs = 2000): Promise<void> {
  if (typeof indexedDB === "undefined") return Promise.resolve();
  const opened = new Promise<void>((done) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onerror = () => done();
      req.onsuccess = () => {
        db = req.result;
        try {
          const tx = db.transaction(STORE, "readonly"), store = tx.objectStore(STORE);
          const keys = store.getAllKeys(), values = store.getAll();
          tx.oncomplete = () => {
            keys.result.forEach((k, i) => backup.set(String(k), String(values.result[i])));
            listBackup();
            done();
          };
          tx.onerror = () => done();
        } catch { done(); }
      };
    } catch { done(); }
  });
  // A browser that never answers must not keep the app from starting.
  return Promise.race([opened, new Promise<void>((r) => setTimeout(r, timeoutMs))]);
}

function toBackup(k: string, v: string | null) {
  if (v === null) backup.delete(k); else backup.set(k, v);
  listBackup();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, "readwrite"), store = tx.objectStore(STORE);
    if (v === null) store.delete(k); else store.put(v, k);
    if (v !== null) tx.onerror = tx.onabort = () => { notKept.value = true; };
  } catch { if (v !== null) notKept.value = true; }
}

export function getItem(k: string): string | null {
  try { const v = localStorage.getItem(k); if (v !== null) return v; } catch { /* storage refused */ }
  return backup.get(k) ?? null;
}

/** Keep a value. False when it is only in the backup (or nowhere). */
export function setItem(k: string, v: string): boolean {
  try {
    localStorage.setItem(k, v);
    if (backup.has(k)) toBackup(k, null);
    return true;
  } catch {
    // Full (or refused). With no backup either, leave the old copy alone: it is
    // all that survives a reload. Otherwise drop it, since a reload would read it
    // back in place of this one, and keep the new one in the backup.
    if (!db) { notKept.value = true; return false; }
    try { localStorage.removeItem(k); } catch { /* storage refused */ }
    toBackup(k, v);
    return false;
  }
}

export function removeItem(k: string) {
  try { localStorage.removeItem(k); } catch { /* storage refused */ }
  if (backup.has(k)) toBackup(k, null);
}

/** Roughly how much of this site's localStorage each app uses, in characters. */
export function usage(): { rhogov: number; other: number } {
  let rhogov = 0, other = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? "", n = k.length + (localStorage.getItem(k)?.length ?? 0);
      if (k.startsWith("rhogov:")) rhogov += n; else other += n;
    }
  } catch { /* storage refused */ }
  return { rhogov, other };
}
