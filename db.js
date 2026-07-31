// Shared IndexedDB layer for the clip history.
//
// Imported by both the background service worker and the side panel — both
// run in the extension origin, so they share a single object store. The
// content script lives in the *page* origin and cannot reach this DB; it
// routes saves through the service worker by message instead.

const DB_NAME = "chrome-snapshot-clips";
const STORE = "clips";
const VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Add a clip. `dataUrl` is a PNG data URL. `host` is the originating
// hostname when known (captures), empty for pasted images. `meta` is the
// metadata object described in metadata/schema.js (null when the builder
// failed — the side panel backfills it). Returns the id.
export async function addClip({
  dataUrl,
  source = "capture",
  host = "",
  w = 0,
  h = 0,
  meta = null,
}) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add({
      dataUrl,
      source,
      host,
      w,
      h,
      meta,
      createdAt: Date.now(),
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getClip(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// Replace a clip's metadata (backfill, AI analysis results, post-annotation
// refresh). Returns false if the clip no longer exists.
export async function setClipMeta(id, meta) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (!rec) {
        resolve(false);
        return;
      }
      rec.meta = meta;
      const putReq = store.put(rec);
      putReq.onsuccess = () => resolve(true);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// Replace a clip's image in place (used when annotated copy overwrites the
// clipboard — the history entry should follow what's on the clipboard).
export async function updateClip(id, dataUrl) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (!rec) {
        resolve(false);
        return;
      }
      rec.dataUrl = dataUrl;
      const putReq = store.put(rec);
      putReq.onsuccess = () => resolve(true);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// All clips, newest first.
export async function getAllClips() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () =>
      resolve((req.result || []).sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export async function deleteClip(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function clearClips() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).clear();
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}
