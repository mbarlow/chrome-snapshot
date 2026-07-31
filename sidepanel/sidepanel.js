// Clip-history side panel.
// Renders the shared IndexedDB store as a thumbnail grid, copies/deletes
// clips, and accepts images pasted from other apps. Capture-originated saves
// arrive from the service worker, which broadcasts CLIPS_UPDATED on write.
//
// AI inspection also lives here (not in the service worker — it can sleep
// mid-inference): when the toggle is on, clips with meta.ai pending are
// analyzed sequentially by Gemini Nano whenever the panel is open.

import { getAllClips, deleteClip, clearClips, addClip, setClipMeta } from "../db.js";
import { buildBaseMetadata } from "../metadata/build.js";
import { getImageAiAvailability, analyzeImage } from "../ai/inspector.js";

const $ = (id) => document.getElementById(id);
const grid = $("grid");
let toastTimer = null;
let aiEnabled = false;
let draining = false;

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

  const jsonBtn = document.createElement("button");
  jsonBtn.className = "json";
  const aiStatus = clip.meta?.ai?.status;
  if (aiStatus === "done") jsonBtn.classList.add("done");
  jsonBtn.title =
    aiStatus === "done" ? "View metadata (AI analyzed)" : "View metadata";
  jsonBtn.textContent = "{ }";
  jsonBtn.addEventListener("click", () => openMetaOverlay(clip));

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

  actions.append(jsonBtn, copyBtn, delBtn);
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

// ---------------------------------------------------------------------------
// Metadata: backfill + AI analysis queue

// Ensure a clip has deterministic metadata; builds and persists it for clips
// that predate the metadata schema (or whose save-time build failed).
async function ensureMeta(clip) {
  if (clip.meta) return clip.meta;
  const meta = await buildBaseMetadata(clip);
  meta.ai = { status: "pending" };
  await setClipMeta(clip.id, meta);
  clip.meta = meta;
  return meta;
}

function setAiStatus(text) {
  $("aiStatus").textContent = text;
}

// Sequentially backfill metadata and, when AI inspection is on and the model
// supports image input, analyze pending clips. Re-entrant calls collapse into
// one rerun so a clip captured mid-drain isn't stranded pending.
let drainAgain = false;
async function drainAnalysis() {
  if (draining) {
    drainAgain = true;
    return;
  }
  draining = true;
  try {
    const clips = await getAllClips();

    // Backfill deterministic metadata regardless of the AI toggle.
    for (const clip of clips) {
      try {
        await ensureMeta(clip);
      } catch (error) {
        console.error("Metadata backfill failed:", error);
      }
    }

    if (!aiEnabled) return;

    const pending = clips.filter((c) => c.meta?.ai?.status === "pending");
    if (!pending.length) {
      setAiStatus("");
      return;
    }

    setAiStatus("checking model…");
    const { state, reason } = await getImageAiAvailability();
    if (state === "missing" || state === "unavailable") {
      // Not persisted: a Chrome upgrade can change the answer, so clips stay
      // pending and we simply report why nothing is happening right now.
      console.warn("Image AI unavailable:", reason || state);
      setAiStatus("model unavailable on this Chrome");
      return;
    }

    let done = 0;
    for (const clip of pending) {
      if (!aiEnabled) break; // toggle flipped off mid-drain
      setAiStatus(`analyzing ${done + 1}/${pending.length}…`);
      try {
        const result = await analyzeImage(clip.dataUrl, {
          onDownload: (pct) => setAiStatus(`downloading model ${pct}%…`),
        });
        clip.meta.ai = {
          status: "done",
          model: "gemini-nano",
          analyzedAt: new Date().toISOString(),
          ...result,
        };
      } catch (error) {
        console.error("AI analysis failed:", error);
        clip.meta.ai = { status: "error", error: String(error?.message || error) };
      }
      await setClipMeta(clip.id, clip.meta);
      done++;
    }
    setAiStatus("");
    await render();
  } finally {
    draining = false;
    if (drainAgain) {
      drainAgain = false;
      drainAnalysis();
    }
  }
}

// ---------------------------------------------------------------------------
// Metadata overlay: pretty-printed, colorized JSON + copy

let overlayJson = "";

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function colorizeJson(json) {
  return escapeHtml(json).replace(
    /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g,
    (match) => {
      if (match.startsWith('"')) {
        if (match.endsWith(":")) {
          const i = match.lastIndexOf('"');
          return `<span class="j-key">${match.slice(0, i + 1)}</span>${match.slice(i + 1)}`;
        }
        return `<span class="j-str">${match}</span>`;
      }
      if (match === "true" || match === "false")
        return `<span class="j-bool">${match}</span>`;
      if (match === "null") return `<span class="j-null">${match}</span>`;
      return `<span class="j-num">${match}</span>`;
    },
  );
}

async function openMetaOverlay(clip) {
  let meta;
  try {
    meta = await ensureMeta(clip);
  } catch (error) {
    console.error("Metadata build failed:", error);
    toast("Metadata unavailable");
    return;
  }

  const display = { id: clip.id, ...meta };
  overlayJson = JSON.stringify(display, null, 2);

  $("metaTitle").textContent =
    (clip.host || (clip.source === "paste" ? "pasted" : "clip")) +
    ` — ${formatTime(clip.createdAt)}`;

  const swatches = $("metaSwatches");
  swatches.innerHTML = "";
  for (const { hex, share } of meta.palette || []) {
    const sw = document.createElement("span");
    sw.className = "sw";
    sw.style.background = hex;
    sw.title = `${hex} (${Math.round(share * 100)}%)`;
    swatches.appendChild(sw);
  }

  $("metaJson").innerHTML = colorizeJson(overlayJson);
  $("metaOverlay").hidden = false;
}

function closeMetaOverlay() {
  $("metaOverlay").hidden = true;
}

$("metaClose").addEventListener("click", closeMetaOverlay);

$("metaCopy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(overlayJson);
    toast("JSON copied");
  } catch (error) {
    console.error("Copy failed:", error);
    toast("Copy failed");
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("metaOverlay").hidden) closeMetaOverlay();
});

// ---------------------------------------------------------------------------
// Paste / capture / clear

async function addImageBlob(blob) {
  if (!blob || !blob.type.startsWith("image/")) return false;
  const dataUrl = await blobToDataUrl(blob);
  let meta = null;
  try {
    meta = await buildBaseMetadata({ dataUrl, source: "paste" });
    meta.ai = { status: "pending" };
  } catch (error) {
    console.error("Metadata build failed:", error);
  }
  await addClip({ dataUrl, source: "paste", meta });
  await render();
  drainAnalysis();
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

// AI toggle — persisted, off by default. Enabling counts as the user gesture
// that permits the model download.
$("aiToggle").addEventListener("change", async (e) => {
  aiEnabled = e.target.checked;
  await chrome.storage.local.set({ aiInspect: aiEnabled });
  if (aiEnabled) drainAnalysis();
  else setAiStatus("");
});

// The service worker broadcasts this after capture-originated writes.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "CLIPS_UPDATED") {
    render().then(() => drainAnalysis());
  }
});

(async () => {
  const { aiInspect = false } = await chrome.storage.local.get("aiInspect");
  aiEnabled = aiInspect;
  $("aiToggle").checked = aiEnabled;
  await render();
  drainAnalysis();
})();
