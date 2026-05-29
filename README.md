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

## Clip History

Every capture is copied to the clipboard and saved to a local history, stored
in IndexedDB (extension-private — never leaves the browser). Open it from the
extension popup's **Open Clip History** button; it slides out as a native Chrome
side panel. From there you can copy any clip back to the clipboard, delete
clips, clear the lot, or paste in images from other tools.

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
