# 360 Gallery Template

Starter template for creating a 360 panoramic image gallery with the [Phong 360 Viewer](https://github.com/ansonphong/360-VIEWER).

## Quick Start

1. Create a new repo and add the viewer as a submodule:
   ```bash
   mkdir my-gallery && cd my-gallery
   git init
   git submodule add https://github.com/ansonphong/360-VIEWER.git 360-viewer
   cp -r 360-viewer/gallery-template/* .
   cp 360-viewer/gallery-template/.gitignore .
   ```

2. Add your equirectangular 360 images:
   ```bash
   mkdir -p library/MyCollection
   # Copy your images into library/MyCollection/
   ```

3. Edit `360-viewer.json` with your profile info, theme, accent color, and section settings.

4. Build the library:
   ```bash
   pip install Pillow tqdm
   python 360-viewer/library/build_library.py \
     --root library/ \
     --output library/library.json \
     --config 360-viewer.json
   ```

5. Test locally:
   ```bash
   python -m http.server 8000
   ```

## What's Included

| File | Purpose |
|------|---------|
| `index.html` | Host page with viewer init, drag-and-drop, help modal |
| `360-viewer.json` | Gallery config (title, theme, accent, panelWidth, favicon, etc.) |
| `netlify.toml` | Optimized cache headers for Netlify hosting |
| `.gitignore` | Ignores build artifacts and OS files |
| `deploy/deploy-webhook.php` | GitHub webhook deploy script (PHP) |
| `deploy/deploy-webhook.py` | GitHub webhook deploy script (Python/Flask) |

## Using Claude Code?

Run `/create-gallery` for guided setup.

See [FORK-GUIDE.md](https://github.com/ansonphong/360-VIEWER/blob/master/docs/FORK-GUIDE.md) for full documentation.
