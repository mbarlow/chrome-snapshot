# Chrome Snapshot

A Chrome extension for taking screenshots of selected screen areas with highlighting.

<img width="1847" height="886" alt="image" src="https://github.com/user-attachments/assets/6e0593e2-dc06-4df3-91c6-78ec52283830" />


## Features

- Click and drag to select any area of a webpage
- Captures copy straight to the clipboard the moment you select
- Add colored highlights — pressing Copy overwrites the clipboard with the annotated version
- Clip history in a side-panel gallery: copy or delete any past clip
- Paste images from other apps (`Ctrl/Cmd+V`) into the gallery
- Save as PNG or copy to clipboard
- Right-click context menu integration
- Visual guides and coordinates during selection
- Per-clip JSON metadata: resolution, origin, palette swatch — plus optional on-device AI description via Gemini Nano

## Clip History

Every capture is copied to the clipboard and saved to a local history, stored
in IndexedDB (extension-private — never leaves the browser). Open it from the
extension popup's **Open Clip History** button; it slides out as a native Chrome
side panel. From there you can copy any clip back to the clipboard, delete
clips, clear the lot, or paste in images from other tools.

## Clip Metadata

Every clip carries a JSON metadata record. Open it with the `{ }` button on
any clip card — pretty-printed, syntax-colorized, one-click copy.

Two layers, strictly separated:

**Deterministic — always on.** Resolution, format, byte size, capture time,
origin host, source, and a dominant-color palette swatch. Pure canvas math.
No model, no network.

**AI — opt-in.** Flip "AI-inspect clips" in the side panel and each clip is
analyzed on-device by Chrome's built-in Gemini Nano: a factual description,
visible contents, legible text, search tags. Output is schema-constrained
JSON, not parsed prose. The model reports what is visible. It never guesses.

Requirements for the AI layer: desktop Chrome 138+ with image input support
in the built-in model (`chrome://on-device-internals` shows model state). No
API keys. Nothing leaves the browser. Without it, the deterministic layer
still works and clips stay marked `pending`.

The schema is defined in one place: `metadata/schema.js`. It documents the
stored shape and doubles as the `responseConstraint` handed to the model.

## Install

1. Download and unzip the latest release from the [releases page](https://github.com/mbarlow/chrome-snapshot/releases), or clone this repo
2. Open `chrome://extensions`
3. Enable Developer Mode
4. Click "Load unpacked" and select the unzipped directory

## Usage

Click the extension icon or use the keyboard shortcut to start a screenshot. Click and drag to select an area, then save or annotate the result. Press Esc to cancel at any time.

## Keyboard Shortcut

`Ctrl+Shift+S` (`Cmd+Shift+S` on Mac)

## License

MIT
