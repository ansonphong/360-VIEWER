# Create Your Own 360 Gallery

Create your own 360 panoramic image gallery website using the Phong 360 Viewer engine.

## Prerequisites

- Python 3.8+ with pip
- Git
- Equirectangular 360 images (JPEG or PNG, ideally 8192x4096 or 4096x2048)

## Quick Start

### 1. Create Your Gallery Repository

```bash
mkdir my-360-gallery && cd my-360-gallery
git init
```

### 2. Add the Viewer Engine

```bash
git submodule add https://github.com/ansonphong/360-VIEWER.git 360-viewer
```

### 3. Copy the Gallery Template

```bash
cp -r 360-viewer/gallery-template/* .
cp 360-viewer/gallery-template/.gitignore .
```

This gives you: `index.html`, `360-viewer.json`, `netlify.toml`, `.gitignore`

### 4. Add Your 360 Images

Each subdirectory becomes a section in the sidebar.

```bash
mkdir -p library/Landscapes
mkdir -p library/Architecture
# Copy your equirectangular images into these directories
```

### 5. Configure Your Gallery

Edit `360-viewer.json`:

```json
{
  "context": {
    "type": "profile",
    "title": "Your Name",
    "subtitle": "360 Photography",
    "avatar": "assets/avatar.jpg",
    "theme": "dark",
    "accent": "#6366f1",
    "links": [
      {"url": "https://yourwebsite.com", "label": "Website"},
      {"url": "https://instagram.com/you", "label": "Instagram"}
    ]
  },
  "sections": {
    "Landscapes": {
      "title": "Landscapes",
      "icon": "mountains",
      "template": "grid",
      "titleStrip": "MyPrefix-"
    }
  }
}
```

### Configuration Reference

#### Context Types

| Type | Description |
|------|-------------|
| `profile` | Avatar, name, subtitle, social links |
| `discover` | Browse/explore header |
| `local` | Simple local library header |

#### Section Options

| Field | Description |
|-------|-------------|
| `title` | Display title (overrides directory name) |
| `icon` | Phosphor icon name (e.g., `mountains`, `buildings`, `flower-lotus`) |
| `template` | Rendering template: `grid`, `feed`, `accordion`, `hero`, `list`, `carousel` |
| `titleStrip` | Prefix to strip from image filenames for cleaner titles |

#### Themes & Accent Colors

- `theme`: `"dark"`, `"light"`, or `"auto"` (follows system preference)
- `accent`: Any hex color (e.g., `"#4CAF50"`, `"#6366f1"`, `"#e13e13"`)

#### Build Settings (Optional)

Add a `build` key to customize build behavior. All fields are optional — defaults are hardcoded in the build script.

```json
{
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

| Field | Default | Description |
|-------|---------|-------------|
| `outputDir` | `_BUILD` | Build output directory inside `library/` |
| `resolutions` | 8K/4K/2K presets | Override quality, dimensions, or labels per preset |
| `thumbnail` | 512x256 @ Q80 | Thumbnail dimensions and quality |

### 6. Build the Library

```bash
pip install Pillow tqdm
python 360-viewer/library/build_library.py \
  --root library/ \
  --output library/library.json \
  --config 360-viewer.json
```

This generates:
- `library/library.json` — Image catalog in v4.0 format
- `library/_BUILD/thumbnails/` — 512x256 preview thumbnails
- `library/_BUILD/8K/` — 8192x4096 ultra-quality variants
- `library/_BUILD/4K/` — 4096x2048 high-quality variants (default)
- `library/_BUILD/2K/` — 2048x1024 standard variants

### 7. Test Locally

```bash
python -m http.server 8000
# Open http://localhost:8000
```

## Deployment

### Netlify (Recommended)

The template includes a `netlify.toml` with optimized cache headers.

1. **Drag & Drop**: Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag your gallery folder
2. **Git Integration**: Connect your GitHub repo for automatic deploys
3. **CLI**: `npm install -g netlify-cli && netlify deploy --prod`

### GitHub Pages

Push to GitHub → Settings → Pages → main branch, root directory.

### Any Static Host

Pure static files — upload the directory to any web server.

## Updating the Viewer

```bash
cd 360-viewer && git pull origin master && cd ..
git add 360-viewer && git commit -m "chore: update 360-viewer"
```

## Adding New Images

1. Drop new equirectangular images into a `library/` subdirectory
2. Re-run the build command
3. Commit the updated `library.json` and `_BUILD/`

## Example

See [360-PHONG-COM](https://github.com/ansonphong/360-PHONG-COM) for a complete gallery example powering [360.phong.com](https://360.phong.com).

---

## Quick Setup with Claude Code

If you use [Claude Code](https://claude.com/claude-code), paste the following prompt to have it set up your gallery automatically:

<details>
<summary>Click to expand the Claude Code kickoff prompt</summary>

```
I want to create a new 360 panoramic image gallery using the Phong 360 Viewer engine.

Setup steps:
1. Initialize a new git repo in the current directory
2. Add 360-viewer as a submodule: git submodule add https://github.com/ansonphong/360-VIEWER.git 360-viewer
3. Copy the gallery template: cp -r 360-viewer/gallery-template/* . && cp 360-viewer/gallery-template/.gitignore .
4. Ask me for:
   - Gallery name and subtitle
   - Profile type (profile with avatar/links, or local/simple)
   - Theme (dark/light/auto) and accent color
   - Social links (if profile type)
   - Domain name (if known, for SEO meta tags)
   - Google Analytics ID (optional)
5. Generate a customized 360-viewer.json based on my answers
6. Customize index.html with my title, meta tags, analytics, and branding
7. I'll add my equirectangular 360 images to library/ subdirectories — ask me when ready
8. Run the build: python 360-viewer/library/build_library.py --root library/ --output library/library.json --config 360-viewer.json
9. Start a local test server: python -m http.server 8000
10. Help me verify everything works and commit

Reference docs in the 360-viewer submodule:
- Fork guide: 360-viewer/docs/FORK-GUIDE.md
- Library format: 360-viewer/docs/LIBRARY-FORMAT.md
- Templates: 360-viewer/docs/TEMPLATES.md
- Theming: 360-viewer/docs/THEMING.md
```

</details>

Or if the viewer repo has Claude Code commands configured, run: `/create-gallery`
