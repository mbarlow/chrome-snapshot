// Content script for Chrome Snapshot extension
// Handles area selection overlay and screenshot UI

// Prevent class redeclaration
if (typeof window.ChromeSnapshotUI === "undefined") {
  class ChromeSnapshotUI {
    constructor() {
      this.isActive = false;
      this.isSelecting = false;
      this.isHighlighting = false;
      this.selection = null;
      this.highlightColors = [
        '#FEF08A', // yellow
        '#FBCFE8', // pink
        '#BBF7D0', // green
        '#BFDBFE', // blue
        '#FED7AA', // orange
        '#DDD6FE', // purple
      ];
      this.highlightColor = this.highlightColors[0];
      this.highlights = [];

      // DOM elements
      this.overlay = null;
      this.selectionRect = null;
      this.guides = { vertical: null, horizontal: null };
      this.coordsDisplay = null;
      this.instructions = null;
      this.screenshotUI = null;
      this.canvas = null;
      this.ctx = null;

      // Mouse tracking
      this.startX = 0;
      this.startY = 0;
      this.currentX = 0;
      this.currentY = 0;

      this.init();
    }

    init() {
      // Listen for messages from background script
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("Content script received message:", message);
        if (message.type === "START_SELECTION") {
          console.log("Starting selection...");
          this.startSelection();
          sendResponse({ success: true });
        }
        return true; // Keep message channel open
      });

      // Listen for ESC key to close UI
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.isActive) {
          this.cleanup();
        }
      });
    }

    startSelection() {
      if (this.isActive) {
        console.log("Selection already active");
        return;
      }

      console.log("Creating overlay...");
      this.isActive = true;
      this.createOverlay();
      this.attachEventListeners();
    }

    createOverlay() {
      // Create main overlay
      this.overlay = document.createElement("div");
      this.overlay.className = "chrome-snapshot-overlay";

      // Create selection rectangle
      this.selectionRect = document.createElement("div");
      this.selectionRect.className = "chrome-snapshot-selection";
      this.selectionRect.style.display = "none";

      // Create guides
      this.guides.vertical = document.createElement("div");
      this.guides.vertical.className = "chrome-snapshot-guide vertical";
      this.guides.vertical.style.display = "none";

      this.guides.horizontal = document.createElement("div");
      this.guides.horizontal.className = "chrome-snapshot-guide horizontal";
      this.guides.horizontal.style.display = "none";

      // Create coordinates display
      this.coordsDisplay = document.createElement("div");
      this.coordsDisplay.className = "chrome-snapshot-coords";
      this.coordsDisplay.style.display = "none";

      // Create instructions
      this.instructions = document.createElement("div");
      this.instructions.className = "chrome-snapshot-instructions";
      this.instructions.textContent =
        "Click and drag to select an area for screenshot. Press ESC to cancel.";

      // Append elements
      this.overlay.appendChild(this.selectionRect);
      this.overlay.appendChild(this.guides.vertical);
      this.overlay.appendChild(this.guides.horizontal);
      this.overlay.appendChild(this.coordsDisplay);
      this.overlay.appendChild(this.instructions);

      document.body.appendChild(this.overlay);
    }

    attachEventListeners() {
      this.overlay.addEventListener(
        "mousedown",
        this.handleMouseDown.bind(this),
      );
      this.overlay.addEventListener(
        "mousemove",
        this.handleMouseMove.bind(this),
      );
      this.overlay.addEventListener("mouseup", this.handleMouseUp.bind(this));
      document.addEventListener(
        "mousemove",
        this.handleDocumentMouseMove.bind(this),
      );
    }

    handleMouseDown(e) {
      if (this.isHighlighting) {
        this.startHighlight(e);
        return;
      }

      this.isSelecting = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.currentX = e.clientX;
      this.currentY = e.clientY;

      this.selectionRect.style.display = "block";
      this.updateSelection();

      e.preventDefault();
    }

    handleMouseMove(e) {
      if (!this.isSelecting) return;

      this.currentX = e.clientX;
      this.currentY = e.clientY;
      this.updateSelection();

      e.preventDefault();
    }

    handleDocumentMouseMove(e) {
      if (this.isSelecting) return;

      // Update guides
      this.guides.vertical.style.left = e.clientX + "px";
      this.guides.vertical.style.display = "block";

      this.guides.horizontal.style.top = e.clientY + "px";
      this.guides.horizontal.style.display = "block";

      // Update coordinates
      this.coordsDisplay.textContent = `${e.clientX}, ${e.clientY}`;
      this.coordsDisplay.style.left = e.clientX + 10 + "px";
      this.coordsDisplay.style.top = e.clientY - 30 + "px";
      this.coordsDisplay.style.display = "block";
    }

    handleMouseUp(e) {
      if (!this.isSelecting) return;

      this.isSelecting = false;

      const width = Math.abs(this.currentX - this.startX);
      const height = Math.abs(this.currentY - this.startY);

      if (width < 10 || height < 10) {
        this.selectionRect.style.display = "none";
        return;
      }

      this.selection = {
        x: Math.min(this.startX, this.currentX),
        y: Math.min(this.startY, this.currentY),
        width: width,
        height: height,
        devicePixelRatio: window.devicePixelRatio,
      };

      this.captureScreenshot();
    }

    updateSelection() {
      const left = Math.min(this.startX, this.currentX);
      const top = Math.min(this.startY, this.currentY);
      const width = Math.abs(this.currentX - this.startX);
      const height = Math.abs(this.currentY - this.startY);

      this.selectionRect.style.left = left + "px";
      this.selectionRect.style.top = top + "px";
      this.selectionRect.style.width = width + "px";
      this.selectionRect.style.height = height + "px";
    }

    async captureScreenshot() {
      // Hide the overlay so it doesn't appear in the captured image
      this.overlay.style.display = "none";

      try {
        // Wait a frame for the browser to repaint without the overlay
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        const response = await chrome.runtime.sendMessage({
          type: "CAPTURE_SCREENSHOT",
        });

        if (response.success) {
          // Crop the image to the selected area
          const croppedImageData = await this.cropImage(
            response.imageData,
            this.selection,
          );
          this.showScreenshotUI(croppedImageData);
        } else {
          throw new Error(response.error);
        }
      } catch (error) {
        console.error("Screenshot capture failed:", error);
        this.cleanup();
      }
    }

    // Crop image to selected area
    cropImage(dataUrl, selection) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = selection.width;
            canvas.height = selection.height;
            const ctx = canvas.getContext("2d");

            // Calculate device pixel ratio for high DPI displays
            const devicePixelRatio = selection.devicePixelRatio || 1;

            // Crop the image
            ctx.drawImage(
              img,
              selection.x * devicePixelRatio,
              selection.y * devicePixelRatio,
              selection.width * devicePixelRatio,
              selection.height * devicePixelRatio,
              0,
              0,
              selection.width,
              selection.height,
            );

            // Convert to data URL
            const croppedDataUrl = canvas.toDataURL("image/png");
            resolve(croppedDataUrl);
          } catch (error) {
            reject(new Error(`Image cropping failed: ${error.message}`));
          }
        };

        img.onerror = () => reject(new Error("Failed to load captured image"));
        img.src = dataUrl;
      });
    }

    showScreenshotUI(imageData) {
      // Remove selection overlay
      if (this.overlay) {
        this.overlay.remove();
      }

      // Create screenshot UI
      this.screenshotUI = document.createElement("div");
      this.screenshotUI.className = "chrome-snapshot-ui";

      // Create preview container
      const preview = document.createElement("div");
      preview.className = "chrome-snapshot-preview";

      // Create canvas for editing
      this.canvas = document.createElement("canvas");
      this.canvas.className = "chrome-snapshot-canvas";
      this.ctx = this.canvas.getContext("2d");

      // Load image
      const img = new Image();
      img.onload = () => {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);

        // Set canvas display size
        const maxWidth = window.innerWidth * 0.9;
        const maxHeight = window.innerHeight - 100;
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

        this.canvas.style.width = img.width * scale + "px";
        this.canvas.style.height = img.height * scale + "px";
      };
      img.src = imageData;

      // Create highlight drag preview element
      this.highlightPreview = document.createElement("div");
      this.highlightPreview.className = "chrome-snapshot-highlight-preview";
      this.highlightPreview.style.display = "none";

      // Create toolbar
      const toolbar = this.createToolbar();

      // Append elements
      preview.appendChild(this.canvas);
      preview.appendChild(this.highlightPreview);
      this.screenshotUI.appendChild(preview);
      this.screenshotUI.appendChild(toolbar);

      document.body.appendChild(this.screenshotUI);

      // Add canvas event listeners for highlighting
      this.attachCanvasListeners();
    }

    createToolbar() {
      const toolbar = document.createElement("div");
      toolbar.className = "chrome-snapshot-toolbar";

      // Highlight toggle
      this.highlightBtn = document.createElement("button");
      this.highlightBtn.className = "chrome-snapshot-btn";
      this.highlightBtn.textContent = "Highlight";
      this.highlightBtn.onclick = () => this.toggleHighlightMode();

      // Swatches
      this.swatchContainer = document.createElement("div");
      this.swatchContainer.className = "chrome-snapshot-swatches";
      this.swatchContainer.style.display = "none";
      this.highlightColors.forEach((color, i) => {
        const swatch = document.createElement("button");
        swatch.className = "chrome-snapshot-swatch" + (i === 0 ? " selected" : "");
        swatch.style.backgroundColor = color;
        swatch.onclick = () => {
          this.highlightColor = color;
          this.swatchContainer.querySelectorAll(".chrome-snapshot-swatch").forEach(s => s.classList.remove("selected"));
          swatch.classList.add("selected");
        };
        this.swatchContainer.appendChild(swatch);
      });

      // Separators
      const sep1 = document.createElement("div");
      sep1.className = "chrome-snapshot-separator";
      const sep2 = document.createElement("div");
      sep2.className = "chrome-snapshot-separator";

      // Save
      const saveBtn = document.createElement("button");
      saveBtn.className = "chrome-snapshot-btn primary";
      saveBtn.textContent = "Save PNG";
      saveBtn.onclick = () => this.saveImage();

      // Copy
      const copyBtn = document.createElement("button");
      copyBtn.className = "chrome-snapshot-btn";
      copyBtn.textContent = "Copy";
      copyBtn.onclick = () => this.copyToClipboard();

      // Close
      const closeBtn = document.createElement("button");
      closeBtn.className = "chrome-snapshot-btn close-btn";
      closeBtn.innerHTML = "\u00d7";
      closeBtn.onclick = () => this.cleanup();

      toolbar.appendChild(this.highlightBtn);
      toolbar.appendChild(this.swatchContainer);
      toolbar.appendChild(sep1);
      toolbar.appendChild(saveBtn);
      toolbar.appendChild(copyBtn);
      toolbar.appendChild(sep2);
      toolbar.appendChild(closeBtn);

      return toolbar;
    }

    attachCanvasListeners() {
      let isDrawing = false;
      let displayStartX, displayStartY;

      this.canvas.addEventListener("mousedown", (e) => {
        if (!this.isHighlighting) return;
        isDrawing = true;

        const rect = this.canvas.getBoundingClientRect();
        displayStartX = e.clientX - rect.left;
        displayStartY = e.clientY - rect.top;

        this.highlightPreview.style.display = "block";
        this.highlightPreview.style.left = displayStartX + "px";
        this.highlightPreview.style.top = displayStartY + "px";
        this.highlightPreview.style.width = "0";
        this.highlightPreview.style.height = "0";
        this.highlightPreview.style.backgroundColor = this.highlightColor + "40";
        e.preventDefault();
      });

      this.canvas.addEventListener("mousemove", (e) => {
        if (!isDrawing) return;

        const rect = this.canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const left = Math.min(displayStartX, currentX);
        const top = Math.min(displayStartY, currentY);
        const width = Math.abs(currentX - displayStartX);
        const height = Math.abs(currentY - displayStartY);

        this.highlightPreview.style.left = left + "px";
        this.highlightPreview.style.top = top + "px";
        this.highlightPreview.style.width = width + "px";
        this.highlightPreview.style.height = height + "px";
      });

      this.canvas.addEventListener("mouseup", (e) => {
        if (!this.isHighlighting || !isDrawing) return;
        isDrawing = false;
        this.highlightPreview.style.display = "none";

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const displayEndX = e.clientX - rect.left;
        const displayEndY = e.clientY - rect.top;

        const left = Math.min(displayStartX, displayEndX);
        const top = Math.min(displayStartY, displayEndY);
        const width = Math.abs(displayEndX - displayStartX);
        const height = Math.abs(displayEndY - displayStartY);

        if (width > 2 && height > 2) {
          this.addHighlight(left * scaleX, top * scaleY, width * scaleX, height * scaleY);
        }
      });
    }

    toggleHighlightMode() {
      this.isHighlighting = !this.isHighlighting;
      if (this.isHighlighting) {
        this.canvas.style.cursor = "crosshair";
        this.highlightBtn.classList.add("active");
        this.swatchContainer.style.display = "flex";
      } else {
        this.canvas.style.cursor = "default";
        this.highlightBtn.classList.remove("active");
        this.swatchContainer.style.display = "none";
      }
    }

    addHighlight(x, y, width, height) {
      this.ctx.fillStyle = this.highlightColor + "80";
      this.ctx.fillRect(x, y, width, height);
      this.highlights.push({ x, y, width, height, color: this.highlightColor });
    }

    async saveImage() {
      try {
        const blob = await new Promise((resolve) => {
          this.canvas.toBlob(resolve, "image/png");
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.cleanup();
      } catch (error) {
        console.error("Failed to save image:", error);
      }
    }

    async copyToClipboard() {
      try {
        const blob = await new Promise((resolve) => {
          this.canvas.toBlob(resolve, "image/png");
        });

        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);

        // Show feedback toast
        const toast = document.createElement("div");
        toast.className = "chrome-snapshot-toast";
        toast.textContent = "Copied to clipboard";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1500);
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
      }
    }

    cleanup() {
      this.isActive = false;
      this.isSelecting = false;
      this.isHighlighting = false;

      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }

      if (this.screenshotUI) {
        this.screenshotUI.remove();
        this.screenshotUI = null;
      }

      // Notify background script
      chrome.runtime.sendMessage({ type: "SCREENSHOT_CANCELLED" });
    }
  }

  // Close the class definition guard
  window.ChromeSnapshotUI = ChromeSnapshotUI;
}

// Initialize the UI when content script loads
if (typeof window.chromeSnapshotUI === "undefined") {
  console.log("Initializing Chrome Snapshot UI...");
  window.chromeSnapshotUI = new ChromeSnapshotUI();
} else {
  console.log("Chrome Snapshot UI already initialized");
}
