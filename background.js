// Background service worker for Chrome Snapshot extension

let isScreenshotInProgress = false;

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

    case "SCREENSHOT_COMPLETE":
      isScreenshotInProgress = false;
      break;

    case "SCREENSHOT_CANCELLED":
      isScreenshotInProgress = false;
      break;
  }
});

// Initiate screenshot process
async function initiateScreenshot(tab) {
  if (isScreenshotInProgress) {
    console.log("Screenshot already in progress");
    return;
  }

  isScreenshotInProgress = true;

  try {
    // Inject content script and CSS
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["styles/selection-overlay.css"],
    });

    // Wait a bit for injection to complete, then send message
    setTimeout(() => {
      chrome.tabs.sendMessage(
        tab.id,
        { type: "START_SELECTION" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Message sending failed:", chrome.runtime.lastError);
            isScreenshotInProgress = false;
          }
        },
      );
    }, 100);
  } catch (error) {
    console.error("Failed to initiate screenshot:", error);
    isScreenshotInProgress = false;
  }
}

// Capture full screenshot with Chrome API
async function captureFullScreenshot(tab) {
  try {
    // Capture the visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png",
      quality: 100,
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
