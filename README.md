# Chrome Snapshot Extension

A Chrome extension that enables users to take screenshots of selected screen areas with highlighting capabilities and multiple export options.

## Features

- **Area Selection**: Click and drag to select any area of the webpage
- **Highlighting**: Add colored highlights to your screenshots
- **Save as PNG**: Download screenshots directly to your computer
- **Copy to Clipboard**: Copy screenshots for easy pasting elsewhere
- **Keyboard Shortcuts**: Quick access with `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac)
- **Context Menu**: Right-click anywhere to take a screenshot
- **Visual Guides**: Crosshairs and coordinates for precise selection
- **Fullscreen UI**: Clean, distraction-free interface

## Installation

### From Source (Development)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mbarlow/chrome-snapshot.git
   cd chrome-snapshot
   ```

2. **Generate icon files** (required):
   - Navigate to `assets/` directory
   - Follow instructions in `assets/README.md` to generate the required PNG icons from the SVG file
   - Ensure `icon16.png`, `icon48.png`, and `icon128.png` are present

3. **Load the extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the `chrome-snapshot` folder
   - The extension should now appear in your extensions list

## Usage

### Taking a Screenshot

**Method 1: Keyboard Shortcut**
- Press `Ctrl+Shift+S` (Windows/Linux) or `Cmd+Shift+S` (Mac)
- Click and drag to select the area you want to capture

**Method 2: Context Menu**
- Right-click anywhere on a webpage
- Select "Take Screenshot" from the context menu
- Click and drag to select the area

**Method 3: Extension Icon**
- Click the Chrome Snapshot icon in the toolbar
- Click "Take Screenshot" in the popup
- Click and drag to select the area

### Selection Process

1. **Start Selection**: Click and drag to create a selection rectangle
2. **Visual Feedback**: See real-time coordinates and guides while selecting
3. **Complete Selection**: Release the mouse to capture the selected area
4. **Cancel**: Press `Esc` at any time to cancel

### Editing Screenshots

After capturing, you'll see the screenshot editor with these options:

- **Add Highlight**: Click to enter highlight mode, then click and drag to add colored highlights
- **Change Color**: Use the color picker to select highlight colors
- **Save PNG**: Download the screenshot to your computer
- **Copy to Clipboard**: Copy for pasting into other applications
- **Cancel**: Close without saving

### Keyboard Shortcuts

- `Ctrl+Shift+S` / `Cmd+Shift+S`: Take screenshot
- `Esc`: Cancel/close at any time

## Technical Details

### Permissions Required

- `activeTab`: Access current tab for screenshot capture
- `contextMenus`: Add right-click menu option
- `storage`: Save user preferences
- `<all_urls>`: Inject content scripts on all websites

### Browser Compatibility

- **Chrome**: Version 88+ (Manifest V3 support required)
- **Chromium-based browsers**: Edge, Brave, Opera (with Manifest V3 support)

### Privacy & Security

- 🔒 **No data collection**: All processing happens locally
- 🔒 **No external servers**: Screenshots never leave your device
- 🔒 **Minimal permissions**: Only requests necessary browser permissions
- 🔒 **No tracking**: No analytics or user tracking

## Troubleshooting

### Extension Won't Load
- Ensure all required icon files are present in `assets/`
- Check that you're using Chrome 88+ or a compatible browser
- Try disabling and re-enabling the extension

### Screenshots Are Blank
- Make sure the webpage has finished loading
- Try refreshing the page and taking the screenshot again
- Check that Chrome has permission to access the current site

### Keyboard Shortcut Not Working
- Check if another extension is using the same shortcut
- Go to `chrome://extensions/shortcuts` to modify key bindings
- Ensure the extension is enabled

## License

MIT License - see LICENSE file for details.
