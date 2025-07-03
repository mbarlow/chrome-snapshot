# Development Guide for Chrome Snapshot Extension

This guide covers setting up the development environment, testing, and contributing to the Chrome Snapshot extension.

## Prerequisites

- Google Chrome 88+ or Chromium-based browser
- Basic knowledge of JavaScript, HTML, and CSS
- Git for version control

## Development Setup

### 1. Clone and Setup

```bash
git clone https://github.com/mbarlow/chrome-snapshot.git
cd chrome-snapshot
```

### 2. Generate Required Icons

The extension requires PNG icons generated from the SVG source:

```bash
cd assets/
# Follow the instructions in assets/README.md to generate:
# - icon16.png (16x16)
# - icon48.png (48x48) 
# - icon128.png (128x128)
```

Quick method using online converter:
1. Open `assets/icon.svg` in any SVG to PNG converter
2. Export at 16px, 48px, and 128px sizes
3. Save as `icon16.png`, `icon48.png`, `icon128.png` in the assets folder

### 3. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" toggle (top right)
3. Click "Load unpacked"
4. Select the `chrome-snapshot` directory
5. Extension should appear in the extensions list

## Project Architecture

### File Structure

```
chrome-snapshot/
├── manifest.json              # Extension configuration (Manifest V3)
├── background.js              # Service worker for context menu/shortcuts
├── content.js                 # Main UI logic and area selection
├── popup/
│   ├── popup.html            # Extension popup interface
│   └── popup.js              # Popup interaction logic
├── styles/
│   └── selection-overlay.css # All UI styling
└── assets/                   # Icons and resources
```

### Key Components

#### Background Script (`background.js`)
- Service worker (Manifest V3)
- Handles context menu creation
- Manages keyboard shortcuts
- Captures screenshots using Chrome API
- Crops images to selected areas

#### Content Script (`content.js`)
- Injected into web pages
- Creates fullscreen overlay UI
- Handles area selection with mouse
- Manages screenshot editor interface
- Implements highlighting functionality

#### Popup (`popup/`)
- Simple interface for extension icon clicks
- Provides keyboard shortcut information
- Lists extension features

## Development Workflow

### Making Changes

1. **Edit files** in your preferred editor
2. **Reload extension**:
   - Go to `chrome://extensions/`
   - Click the reload button on the Chrome Snapshot extension
   - Or use `Ctrl+R` on the extensions page
3. **Test changes** on any webpage

### Testing Different Scenarios

#### Area Selection Testing
- Test on pages with different layouts
- Try selecting across different elements
- Test edge cases (very small/large selections)
- Verify on high DPI displays

#### UI Testing
- Test fullscreen overlay on different screen sizes
- Verify visual guides and coordinates work correctly
- Test ESC key cancellation
- Check z-index stacking with other page elements

#### Screenshot Quality Testing
- Test on pages with images, text, and graphics
- Verify device pixel ratio handling
- Check for proper cropping accuracy
- Test with browser zoom levels

#### Highlighting Testing
- Test adding multiple highlights
- Verify color picker functionality
- Test highlight positioning accuracy
- Check transparency rendering

### Debugging

#### Chrome DevTools
1. **Background Script Debugging**:
   - Go to `chrome://extensions/`
   - Click "Service Worker" under Chrome Snapshot
   - Use DevTools console for background script logs

2. **Content Script Debugging**:
   - Open DevTools on any webpage (`F12`)
   - Content script logs appear in the main console
   - Use breakpoints in Sources tab

3. **Popup Debugging**:
   - Right-click extension icon → "Inspect popup"
   - Debug popup.js in the popup DevTools window

#### Common Issues and Solutions

**Extension won't load:**
- Check manifest.json syntax
- Ensure all icon files exist
- Verify file permissions

**Screenshots are blank:**
- Check Chrome permissions for the site
- Verify `activeTab` permission in manifest
- Test on http:// and https:// pages

**Content script not injecting:**
- Check host permissions in manifest
- Verify script files exist and are valid
- Check for JavaScript errors in console

**Popup not working:**
- Verify popup files exist
- Check popup.html syntax
- Debug popup.js for errors

## Code Style and Standards

### JavaScript
- Use ES6+ features (async/await, arrow functions, etc.)
- Prefer `const` and `let` over `var`
- Use descriptive variable and function names
- Add comments for complex logic

### CSS
- Use CSS custom properties for theming
- Follow BEM naming convention for classes
- Ensure responsive design principles
- Test across different zoom levels

### HTML
- Use semantic HTML5 elements
- Include proper ARIA attributes for accessibility
- Validate HTML markup

## Testing Checklist

Before submitting changes, verify:

### Functional Testing
- [ ] Area selection works on various websites
- [ ] Screenshots capture correctly
- [ ] Highlighting functionality works
- [ ] Save PNG downloads properly
- [ ] Copy to clipboard functions
- [ ] ESC key cancels operations
- [ ] Keyboard shortcuts work
- [ ] Context menu appears and functions

### Cross-Browser Testing
- [ ] Chrome stable
- [ ] Chrome beta/dev (if available)
- [ ] Edge (Chromium)
- [ ] Brave browser

### UI/UX Testing
- [ ] Overlay appears correctly
- [ ] Visual guides are visible and helpful
- [ ] Instructions are clear
- [ ] Buttons are accessible and responsive
- [ ] No visual glitches or z-index issues

### Performance Testing
- [ ] Extension loads quickly
- [ ] Screenshot capture is fast
- [ ] No memory leaks during repeated use
- [ ] Smooth animations and transitions

## Contributing

### Pull Request Process

1. **Fork** the repository
2. **Create feature branch**: `git checkout -b feature-name`
3. **Make changes** following code standards
4. **Test thoroughly** using the checklist above
5. **Commit with descriptive messages**
6. **Push to your fork**
7. **Create pull request** with detailed description

### Commit Message Format
```
type: short description

Longer description if needed
- List specific changes
- Reference any issues

Fixes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Issue Reporting

When reporting bugs or requesting features:
1. Use the GitHub issue templates
2. Include browser version and OS
3. Provide steps to reproduce
4. Include screenshots if relevant
5. Check for existing similar issues

## Deployment

### Preparing for Release

1. **Update version** in `manifest.json`
2. **Test thoroughly** on multiple sites and browsers
3. **Update README.md** with any new features
4. **Create release notes**
5. **Generate production build**

### Chrome Web Store Submission

1. **Zip the extension** (exclude `.git/`, `node_modules/`, etc.)
2. **Upload to Chrome Web Store Developer Dashboard**
3. **Fill out store listing** with screenshots and description
4. **Submit for review**

## Resources

- [Chrome Extension API Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Extension Samples](https://github.com/GoogleChrome/chrome-extensions-samples)
- [Web Store Developer Policies](https://developer.chrome.com/docs/webstore/program-policies/)

## Getting Help

- **Documentation**: Check this guide and the main README
- **Issues**: Search existing GitHub issues
- **Community**: Create a GitHub discussion for questions
- **Chrome APIs**: Refer to official Chrome extension docs