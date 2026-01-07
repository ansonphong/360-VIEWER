# 🚀 Quick Start: Building Your Library

## Running the Library Builder

### macOS / Linux
1. Double-click `build_library.sh`
2. If it doesn't run, right-click → "Open With" → Terminal
3. First time only: System may ask for permission - click "Open"

**Alternative (Terminal)**:
```bash
cd /Users/phong/Projects/Websites/360.phong.com
./build_library.sh
```

### Windows
1. Double-click `build_library.bat`
2. The script will automatically install dependencies if needed
3. Watch the progress in the command window

## What It Does

The script will:
1. ✅ Check if Python and dependencies are installed
2. 📂 Scan `library/` folder for images (`.jpg`, `.png`)
3. 🖼️ Generate thumbnails in `library/_BUILD/thumbnails/`
4. 📊 Create 3 quality versions in `library/_BUILD/Q100/`, `Q75/`, `Q50/`
5. 📄 Generate `library.json` (v2.0 format)
6. 📄 Generate `library-legacy.json` (v1.x format)

## Manual Command Options

```bash
cd library
python3 build_library.py --help
```

### Common Options:
```bash
# Basic build
python3 build_library.py

# Build both formats
python3 build_library.py --format both

# Skip thumbnails (if already generated)
python3 build_library.py --skip-thumbnails

# Skip quality JPGs (if already generated)
python3 build_library.py --skip-jpgs

# Custom output file
python3 build_library.py --output my-library.json

# Compact JSON (no pretty-print)
python3 build_library.py --compact
```

## Expected Output

```
========================================
Phong 360 Viewer - Library Builder v2.0
========================================

Scanning directory: /path/to/360.phong.com/library
Output format: both
Include metadata: True

Scanning files: 100%|████████████| 21/21
Found 21 images in 2 categories

Generating 21 missing thumbnails...
Generating thumbnails: 100%|████████████| 21/21

Generating 21 sets of quality JPGs...
Generating quality JPGs: 100%|████████████| 63/63

Writing library files...
Library written to: library.json
Library written to: library-legacy.json

========================================
✓ Library build complete!
========================================
```

## Troubleshooting

### "Python not found"
Install Python 3:
- macOS: `brew install python3` or download from python.org
- Windows: Download from python.org

### "Permission denied"
Make script executable:
```bash
chmod +x build_library.sh
```

### "Pillow not found"
Install dependencies:
```bash
pip3 install Pillow tqdm
```

Or let the script install them automatically (it will prompt).

## File Structure After Build

```
360.phong.com/
├── build_library.sh          # ← Double-click this (Mac)
├── build_library.bat         # ← Double-click this (Windows)
├── library/
│   ├── library.json          # ← Generated: v2.0 format
│   ├── library-legacy.json   # ← Generated: v1.x format
│   ├── build_library.py      # The builder script
│   ├── NewAtlantis/          # Your images
│   │   ├── image1.jpg
│   │   └── image2.png
│   ├── PureLands/            # Your images
│   │   └── image3.png
│   └── _BUILD/               # ← Generated assets
│       ├── thumbnails/
│       │   ├── NewAtlantis-image1.jpg
│       │   └── PureLands-image3.jpg
│       ├── Q100/             # 100% quality
│       ├── Q75/              # 75% quality
│       └── Q50/              # 50% quality
```

## Next Steps

After building:
1. Open `index.html` in a browser to test
2. Or try `embed-example.html` to see integration examples
3. Check `library.json` to see the generated structure

## Performance

- **Small library** (5-10 images): ~10 seconds
- **Medium library** (20-50 images): ~1 minute
- **Large library** (100+ images): ~5 minutes

Progress bars will show you the status!

---

**Need help?** Check [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md) for format details or [README.md](README.md) for usage examples.

