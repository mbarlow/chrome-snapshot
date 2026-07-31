// Background service worker for Chrome Snapshot extension

import { addClip, updateClip, getClip, setClipMeta } from "./db.js";
import { buildBaseMetadata } from "./metadata/build.js";

let isScreenshotInProgress = false;

// Tell any open side panel that the clip store changed so it can re-render.
function broadcastClipsUpdated() {
  chrome.runtime.sendMessage({ type: "CLIPS_UPDATED" }).catch(() => {});
}

// Initialize the extension
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu item
  chrome.contextMenus.create({
    id: "takeScreenshot",
    title: "Take Screenshot",
    contexts: ["page", "selection", "image", "link"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "takeScreenshot") {
    initiateScreenshot(tab);
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "take-screenshot") {
    initiateScreenshot(tab);
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "CAPTURE_SCREENSHOT":
      captureFullScreenshot(sender.tab)
        .then((imageData) => {
          sendResponse({ success: true, imageData });
        })
        .catch((error) => {
          console.error("Screenshot capture failed:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep message channel open for async response

    case "INITIATE_SCREENSHOT":
      // Handle popup button click
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          initiateScreenshot(tabs[0]);
        }
      });
      break;

    case "SCREENSHOT_CANCELLED":
      isScreenshotInProgress = false;
      break;

    case "SAVE_CLIP":
      // Content script captured a region — persist it to the shared store.
      // Deterministic metadata is built here so it exists even if the side
      // panel never opens; a build failure must not lose the clip.
      saveClipWithMeta(message)
        .then((id) => {
          sendResponse({ id });
          broadcastClipsUpdated();
        })
        .catch((error) => {
          console.error("Failed to save clip:", error);
          sendResponse({ error: error.message });
        });
      return true;

    case "OPEN_CLIP":
      // Side panel wants a history clip reopened in the page editor.
      openClipInActiveTab(message)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error("Failed to open clip in tab:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case "UPDATE_CLIP":
      // Annotated copy overwrote the clipboard — follow it in history, then
      // refresh the deterministic metadata (the pixels changed; the AI
      // analysis of the underlying capture is kept as-is).
      updateClip(message.id, message.dataUrl)
        .then(async (ok) => {
          if (ok) await refreshClipMeta(message.id, message.dataUrl);
          sendResponse({ ok });
          broadcastClipsUpdated();
        })
        .catch((error) => {
          console.error("Failed to update clip:", error);
          sendResponse({ error: error.message });
        });
      return true;
  }
});

// Persist a captured region with its deterministic metadata. The metadata
// builder is best-effort: if it throws (odd data URL, canvas limits), the
// clip still saves with meta null and the side panel backfills later.
async function saveClipWithMeta(message) {
  const clip = {
    dataUrl: message.dataUrl,
    source: "capture",
    host: message.host || "",
    url: message.url || "",
    w: message.w,
    h: message.h,
  };
  let meta = null;
  try {
    meta = await buildBaseMetadata(clip);
    meta.ai = { status: "pending" };
  } catch (error) {
    console.error("Metadata build failed:", error);
  }
  return addClip({ ...clip, meta });
}

// Rebuild deterministic metadata after the clip's image changed, preserving
// any existing AI analysis.
async function refreshClipMeta(id, dataUrl) {
  try {
    const rec = await getClip(id);
    if (!rec) return;
    const meta = await buildBaseMetadata({
      dataUrl,
      source: rec.source,
      host: rec.host,
      url: rec.url,
      createdAt: rec.createdAt,
    });
    meta.ai = rec.meta?.ai || { status: "pending" };
    await setClipMeta(id, meta);
  } catch (error) {
    console.error("Metadata refresh failed:", error);
  }
}

// Inject the content script + overlay CSS into a tab. executeScript resolves
// only after content.js has run its top level, so its message listener is
// already registered when this returns — no delay needed.
async function injectContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });

  await chrome.scripting.insertCSS({
    target: { tabId },
    files: ["styles/overlay.css"],
  });
}

// Initiate screenshot process
async function initiateScreenshot(tab) {
  if (isScreenshotInProgress) {
    console.log("Screenshot already in progress");
    return;
  }

  isScreenshotInProgress = true;

  try {
    await injectContentScript(tab.id);

    chrome.tabs.sendMessage(tab.id, { type: "START_SELECTION" }, () => {
      if (chrome.runtime.lastError) {
        console.error("Message sending failed:", chrome.runtime.lastError);
        isScreenshotInProgress = false;
      }
    });
  } catch (error) {
    console.error("Failed to initiate screenshot:", error);
    isScreenshotInProgress = false;
  }
}

// Reopen a history clip in the active tab's editor UI. Throws if there's no
// injectable tab (chrome:// pages, the Web Store, etc.) so the side panel can
// surface the failure.
async function openClipInActiveTab({ id, dataUrl }) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error("No active tab");

  await injectContentScript(tab.id);
  await chrome.tabs.sendMessage(tab.id, {
    type: "OPEN_CLIP",
    clipId: id,
    dataUrl,
  });
}

// Capture full screenshot with Chrome API
async function captureFullScreenshot(tab) {
  try {
    // Capture the visible tab (quality is ignored for PNG)
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png",
    });

    return dataUrl;
  } catch (error) {
    throw new Error(`Screenshot capture failed: ${error.message}`);
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  initiateScreenshot(tab);
});

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  if (isScreenshotInProgress) {
    isScreenshotInProgress = false;
  }
});

// Handle tab updates (navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading" && isScreenshotInProgress) {
    isScreenshotInProgress = false;
  }
});
