# Chrome Snapshot Extension Icons

This directory contains the icon files for the Chrome Snapshot extension.

## Required Icon Sizes

The extension requires icons in the following sizes:
- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Generating Icons from SVG

You can generate the required PNG icons from the `icon.svg` file using any of these methods:

### Method 1: Online SVG to PNG Converter
1. Open `icon.svg` in any online SVG to PNG converter
2. Export at the required sizes (16px, 48px, 128px)
3. Save as `icon16.png`, `icon48.png`, and `icon128.png`

### Method 2: Using Inkscape (Command Line)
```bash
# Install Inkscape first, then run:
inkscape icon.svg --export-png=icon16.png --export-width=16 --export-height=16
inkscape icon.svg --export-png=icon48.png --export-width=48 --export-height=48
inkscape icon.svg --export-png=icon128.png --export-width=128 --export-height=128
```

### Method 3: Using ImageMagick
```bash
# Install ImageMagick first, then run:
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

### Method 4: Using Node.js (sharp)
```bash
npm install sharp
node -e "
const sharp = require('sharp');
const svg = require('fs').readFileSync('icon.svg');
[16, 48, 128].forEach(size => {
  sharp(svg).resize(size, size).png().toFile(\`icon\${size}.png\`);
});
"
```

## Icon Design

The icon features:
- Blue circular background (#007bff)
- White camera body with lens
- Gold flash/viewfinder indicator
- Dashed selection rectangle overlay
- Yellow highlight accent

This design clearly communicates the extension's purpose: taking screenshots with highlighting capabilities.

## File Requirements

Once generated, ensure all three PNG files are present in this directory:
- ✅ `icon16.png`
- ✅ `icon48.png` 
- ✅ `icon128.png`

The extension will not load properly without these icon files.