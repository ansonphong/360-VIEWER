# Create 360 Gallery

Set up a new 360 panoramic image gallery website using the Phong 360 Viewer engine.

## Important Context

Read `CLAUDE.md` in the repo root first for architecture and config details.

The engine handles everything internally (sidebar, toolbar, info bar, theming, favicon). The host page is minimal — just a container div, script tags, and an optional help modal.

## Step 1: Gather Info

Ask the user for:
- **Gallery name** and subtitle
- **Profile type**: `profile` (with avatar, name, social links — like an Instagram profile) or `local` (simple, no avatar)
- **Theme**: dark, light, or auto (follows system)
- **Accent color**: hex color (default: #6366f1)
- **Domain name** (if known, for SEO meta tags and og:image)
- **Social links** (if profile type): website, Instagram, YouTube, Twitter, etc.
- **Emoji favicon** (optional): any emoji like 🌐 🎨 🏔️
- **Hosting preference**: Netlify (easiest), GitHub Pages, or VPS with webhook deploy
- If VPS: ask PHP or Python for the deploy webhook script

## Step 2: Initialize

```bash
mkdir my-gallery && cd my-gallery
git init
git submodule add https://github.com/ansonphong/360-VIEWER.git 360-viewer
cp -r 360-viewer/gallery-template/* .
cp 360-viewer/gallery-template/.gitignore .
```

## Step 3: Configure 360-viewer.json

Generate based on user's answers. All fields:

```json
{
  "context": {
    "type": "profile",
    "title": "User's Name",
    "subtitle": "360° Photography",
    "avatar": "assets/avatar.jpg",
    "theme": "dark",
    "accent": "#6366f1",
    "panelWidth": 420,
    "infoBar": "center",
    "favicon": "🎨",
    "links": [
      {"url": "https://example.com", "label": "Website"},
      {"url": "https://instagram.com/user", "label": "Instagram"}
    ]
  },
  "sections": {
    "Landscapes": {
      "title": "Landscapes",
      "icon": "mountains",
      "template": "grid",
      "titleStrip": "Prefix-"
    }
  },
  "build": {
    "outputDir": "_BUILD",
    "resolutions": {
      "8K": { "width": 8192, "height": 4096, "quality": 95, "label": "8K", "bandwidth": "high" },
      "4K": { "width": 4096, "height": 2048, "quality": 90, "label": "4K", "bandwidth": "medium", "default": true },
      "2K": { "width": 2048, "height": 1024, "quality": 85, "label": "2K", "bandwidth": "low" }
    },
    "thumbnail": { "width": 512, "height": 256, "quality": 80 }
  }
}
```

For `local` type, omit `avatar` and `links`.

Common Phosphor icons for sections: `mountains`, `buildings`, `flower-lotus`, `planet`, `tree`, `camera`, `paint-brush`, `star`, `globe`, `sun`.

## Step 4: Customize index.html

- Update `<title>` and meta description
- Set og:title, og:description, og:image, og:url if domain is known
- Uncomment and set Google Analytics ID if provided
- Update the help modal title and accent color in the button gradient
- The help modal button gradient should use the user's accent color

## Step 5: Deploy Script (VPS only)

If user chose VPS deployment, copy the appropriate deploy script:

**PHP:**
```bash
cp 360-viewer/gallery-template/deploy/deploy-webhook.php deploy.php
```

**Python:**
```bash
cp 360-viewer/gallery-template/deploy/deploy-webhook.py deploy-webhook.py
```

Then customize the config variables at the top:
- `$webhookSecret` / `WEBHOOK_SECRET` — generate with: `python3 -c "import secrets; print(secrets.token_hex(32))"`
- `$urlSecret` / `URL_SECRET` — generate another one
- `$deployDir` / `DEPLOY_DIR` — server path
- `$deployUser` / `DEPLOY_USER` — deploy user name
- `$branch` / `BRANCH` — master or main

Tell the user about the server setup steps documented in the deploy script comments.

Key gotchas to warn about:
- `.git` directories must be owned by deploy user, not www-data
- `safe.directory` must be configured for both the main repo AND the 360-viewer submodule
- `pull.ff only` should be set for the deploy user
- Build library locally, don't build on server

## Step 6: Add Images

Ask the user to add equirectangular 360 images. Each subdirectory under `library/` becomes a section:

```bash
mkdir -p library/Landscapes
mkdir -p library/Architecture
# Copy equirectangular images into these directories
```

Images should be:
- JPEG or PNG
- 2:1 aspect ratio (equirectangular)
- Ideally 4096x2048 or 8192x4096

## Step 7: Build Library

```bash
pip install Pillow tqdm
python 360-viewer/library/build_library.py \
  --root library/ \
  --output library/library.json \
  --config 360-viewer.json
```

This generates:
- `library/library.json` — Image catalog with context from 360-viewer.json
- `library/_BUILD/thumbnails/` — 512x256 preview thumbnails
- `library/_BUILD/8K/`, `4K/`, `2K/` — Multi-resolution variants

## Step 8: Test Locally

```bash
python -m http.server 8000
# Open http://localhost:8000
```

Verify:
- Sidebar opens with sections and thumbnails
- Clicking an image loads it in the viewer
- Info bar shows at the bottom with title and prev/next
- Theme toggle works
- Resolution switching works
- WASD/arrow keys pan the view
- Double-click toggles fullscreen

## Step 9: Commit and Deploy

```bash
git add -A
git commit -m "Initial gallery setup"
```

**Netlify:** Push to GitHub, connect repo in Netlify dashboard, or `netlify deploy --prod`
**GitHub Pages:** Push to GitHub, enable Pages in repo settings (main branch, root)
**VPS:** Push to GitHub, webhook auto-deploys

## Step 10: Adding More Images Later

1. Drop new equirectangular images into a `library/` subdirectory
2. Re-run the build command
3. Commit the updated `library.json` and `_BUILD/`
4. Push — auto-deploys if webhook is set up

## Reference

- Full guide: `docs/FORK-GUIDE.md`
- Library format: `docs/LIBRARY-FORMAT.md`
- Templates: `docs/TEMPLATES.md`
- Theming: `docs/THEMING.md`
- API: `docs/API.md`
- Live example: https://360.phong.com (source: github.com/ansonphong/360-PHONG-COM)
