// Popup script for Chrome Snapshot extension

document.addEventListener("DOMContentLoaded", () => {
  const takeScreenshotBtn = document.getElementById("takeScreenshot");

  // Handle take screenshot button click
  takeScreenshotBtn.addEventListener("click", async () => {
    try {
      // Get current active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab) {
        // Send message to background script to initiate screenshot
        chrome.runtime.sendMessage(
          { type: "INITIATE_SCREENSHOT" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Failed to send message:",
                chrome.runtime.lastError,
              );
            }
          },
        );

        // Close popup
        window.close();
      }
    } catch (error) {
      console.error("Failed to initiate screenshot:", error);
    }
  });

  // Update keyboard shortcut display based on OS
  const updateShortcutDisplay = () => {
    const shortcutKey = document.querySelector(".shortcut-key");
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

    if (isMac) {
      shortcutKey.textContent = "Cmd+Shift+S";
    } else {
      shortcutKey.textContent = "Ctrl+Shift+S";
    }
  };

  updateShortcutDisplay();

  // Handle keyboard shortcuts in popup
  document.addEventListener("keydown", (e) => {
    // Take screenshot with Enter or Space
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      takeScreenshotBtn.click();
    }

    // Close popup with Escape
    if (e.key === "Escape") {
      window.close();
    }
  });

  // Focus the button for keyboard navigation
  takeScreenshotBtn.focus();
});
