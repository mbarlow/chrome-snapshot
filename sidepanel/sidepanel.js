// Clip-history side panel.
// Renders the shared IndexedDB store as a thumbnail grid, copies/deletes
// clips, and accepts images pasted from other apps. Capture-originated saves
// arrive from the service worker, which broadcasts CLIPS_UPDATED on write.

import { getAllClips, deleteClip, clearClips, addClip } from "../db.js";

const $ = (id) => document.getElementById(id);
const grid = $("grid");
let toastTimer = null;

function toast(text) {
  const el = $("toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 1600);
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function copyClip(dataUrl) {
  try {
    const blob = await dataUrlToBlob(dataUrl);
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    toast("Copied to clipboard");
  } catch (error) {
    console.error("Copy failed:", error);
    toast("Copy failed");
  }
}

// Reopen a clip full-size in the active tab's editor, where highlights can
// be added. Fails on pages the extension can't inject into (chrome:// etc.).
async function openClip(clip) {
  try {
    const resp = await chrome.runtime.sendMessage({
      type: "OPEN_CLIP",
      id: clip.id,
      dataUrl: clip.dataUrl,
    });
    if (!resp?.success) throw new Error(resp?.error || "open failed");
  } catch (error) {
    console.error("Open failed:", error);
    toast("Can't open on this page");
  }
}

const ICON_COPY =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
const ICON_TRASH =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>';

function formatTime(ms) {
  return new Date(ms).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function makeCard(clip) {
  const card = document.createElement("div");
  card.className = "card";

  const thumb = document.createElement("div");
  thumb.className = "thumb";

  const img = document.createElement("img");
  img.src = clip.dataUrl;
  img.alt = "clip";
  img.loading = "lazy";
  // Single click anywhere on the image reopens it full-size in the page
  // editor for highlighting. Copy lives on the toolbar button.
  img.title = "Open in page";
  img.addEventListener("click", () => openClip(clip));
  thumb.appendChild(img);

  const meta = document.createElement("div");
  meta.className = "meta";

  const label = document.createElement("div");
  label.className = "label";
  const where = clip.host || (clip.source === "paste" ? "pasted" : "");
  label.innerHTML =
    (where ? `<span class="where">${where}</span>` : "") +
    `<span class="when">${formatTime(clip.createdAt)}</span>`;

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const copyBtn = document.createElement("button");
  copyBtn.title = "Copy to clipboard";
  copyBtn.innerHTML = ICON_COPY;
  copyBtn.addEventListener("click", () => copyClip(clip.dataUrl));

  const delBtn = document.createElement("button");
  delBtn.className = "del";
  delBtn.title = "Delete clip";
  delBtn.innerHTML = ICON_TRASH;
  delBtn.addEventListener("click", async () => {
    await deleteClip(clip.id);
    render();
  });

  actions.append(copyBtn, delBtn);
  meta.append(label, actions);
  card.append(thumb, meta);
  return card;
}

async function render() {
  const clips = await getAllClips();
  grid.innerHTML = "";
  $("count").textContent = clips.length ? `${clips.length} clip${clips.length === 1 ? "" : "s"}` : "";
  $("empty").hidden = clips.length > 0;
  for (const clip of clips) grid.appendChild(makeCard(clip));
}

async function addImageBlob(blob) {
  if (!blob || !blob.type.startsWith("image/")) return false;
  const dataUrl = await blobToDataUrl(blob);
  await addClip({ dataUrl, source: "paste" });
  await render();
  return true;
}

// Paste from the clipboard via the Paste button (explicit read).
async function pasteFromClipboard() {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find((t) => t.startsWith("image/"));
      if (type) {
        const blob = await item.getType(type);
        if (await addImageBlob(blob)) {
          toast("Pasted from clipboard");
          return;
        }
      }
    }
    toast("No image on clipboard");
  } catch (error) {
    console.error("Paste failed:", error);
    toast("Paste failed");
  }
}

// Native paste event (Ctrl/Cmd+V while the panel is focused).
window.addEventListener("paste", async (e) => {
  const items = e.clipboardData?.items || [];
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      e.preventDefault();
      if (await addImageBlob(item.getAsFile())) toast("Pasted from clipboard");
      return;
    }
  }
});

$("capture").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "INITIATE_SCREENSHOT" }).catch(() => {});
});

$("paste").addEventListener("click", pasteFromClipboard);

$("clear").addEventListener("click", async () => {
  const clips = await getAllClips();
  if (!clips.length) return;
  const ok = window.confirm(
    `Delete all ${clips.length} clip${clips.length === 1 ? "" : "s"}? This can't be undone.`,
  );
  if (!ok) return;
  await clearClips();
  await render();
  toast("History cleared");
});

// The service worker broadcasts this after capture-originated writes.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "CLIPS_UPDATED") render();
});

render();
