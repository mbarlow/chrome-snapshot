document.addEventListener("DOMContentLoaded", () => {
  const takeScreenshotBtn = document.getElementById("takeScreenshot");
  const shortcutKey = document.getElementById("shortcutKey");

  // Update keyboard shortcut display based on platform
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  shortcutKey.textContent = isMac ? "Cmd+Shift+S" : "Ctrl+Shift+S";

  // Handle take screenshot button click
  takeScreenshotBtn.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab) {
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

        window.close();
      }
    } catch (error) {
      console.error("Failed to initiate screenshot:", error);
    }
  });

  // Handle keyboard shortcuts in popup
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      takeScreenshotBtn.click();
    }
    if (e.key === "Escape") {
      window.close();
    }
  });

  takeScreenshotBtn.focus();
});
