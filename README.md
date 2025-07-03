# Chrome Snapshot Extension

A Chrome extension that enables users to take screenshots of selected screen areas with highlighting capabilities and multiple export options.

## Features

- 🖱️ **Area Selection**: Click and drag to select any area of the webpage
- 🎨 **Highlighting**: Add colored highlights to your screenshots
- 💾 **Save as PNG**: Download screenshots directly to your computer
- 📋 **Copy to Clipboard**: Copy screenshots for easy pasting elsewhere
- ⌨️ **Keyboard Shortcuts**: Quick access with `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac)
- 🖱️ **Context Menu**: Right-click anywhere to take a screenshot
- 🎯 **Visual Guides**: Crosshairs and coordinates for precise selection
- 🚀 **Fullscreen UI**: Clean, distraction-free interface

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

### From Chrome Web Store
*Coming soon - extension will be published to the Chrome Web Store*

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

## Development

### Project Structure

```
chrome-snapshot/
├── manifest.json              # Extension configuration
├── background.js              # Service worker for context menu/shortcuts
├── content.js                 # Main UI and selection logic
├── popup/
│   ├── popup.html            # Extension popup interface
│   └── popup.js              # Popup logic
├── styles/
│   └── selection-overlay.css # UI styling
└── assets/
    ├── icon.svg              # Source icon file
    ├── icon16.png           # 16x16 icon
    ├── icon48.png           # 48x48 icon
    └── icon128.png          # 128x128 icon
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Building for Production

1. Ensure all icon files are generated
2. Test the extension in Chrome
3. Zip the entire project directory (excluding `.git/`)
4. Upload to Chrome Web Store

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

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Look for existing issues on GitHub
3. Create a new issue with detailed information about the problem

---

Made with ❤️ for better screenshot workflows
chrome extension for taking quick snapshots w/ optional annotation
