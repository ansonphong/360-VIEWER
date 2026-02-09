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

This gives you: `index.html`, `360-viewer.json`, `netlify.toml`, `.gitignore`, `deploy/`

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
    "panelWidth": 420,
    "infoBar": "center",
    "favicon": "🎨",
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

#### Context Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | `"local"` | Header type: `profile` (avatar + links), `discover`, or `local` |
| `title` | string | | Gallery name |
| `subtitle` | string | | Shown below title |
| `avatar` | string | | Path to avatar image (profile type only) |
| `theme` | string | `"auto"` | `"dark"`, `"light"`, or `"auto"` (follows system) |
| `accent` | string | `"#6366f1"` | Accent color (hex) |
| `panelWidth` | number | 360 | Sidebar width in px (280-600) |
| `infoBar` | string | `"center"` | Bottom info bar alignment: `"center"` or `"left"` |
| `favicon` | string | | Emoji favicon (e.g. `"🌐"`, `"🎨"`) or empty for default |
| `links` | array | | Social links (profile type only) |

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
- `library/library.json` — Image catalog in v4.0 format with context from 360-viewer.json
- `library/_BUILD/thumbnails/` — 512x256 preview thumbnails
- `library/_BUILD/8K/` — 8192x4096 ultra-quality variants
- `library/_BUILD/4K/` — 4096x2048 high-quality variants (default)
- `library/_BUILD/2K/` — 2048x1024 standard variants

### 7. Test Locally

```bash
python -m http.server 8000
# Open http://localhost:8000
```

---

## Deployment

### Netlify (Easiest)

The template includes a `netlify.toml` with optimized cache headers.

1. **Drag & Drop**: Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag your gallery folder
2. **Git Integration**: Connect your GitHub repo for automatic deploys
3. **CLI**: `npm install -g netlify-cli && netlify deploy --prod`

### GitHub Pages

Push to GitHub, then Settings > Pages > main branch, root directory.

### VPS with Webhook Auto-Deploy

For self-hosted servers with automatic deployment on push.

#### Choose Your Deploy Script

The template includes ready-to-use webhook scripts in `deploy/`:

**PHP** (if your server already runs PHP/Nginx):
```bash
cp deploy/deploy-webhook.php deploy.php
```

**Python** (Flask + Gunicorn):
```bash
cp deploy/deploy-webhook.py deploy-webhook.py
pip install flask gunicorn
```

#### Server Setup

1. **Create a deploy user** (runs git operations):
   ```bash
   sudo adduser --system --group gallery-deploy
   sudo usermod -aG www-data gallery-deploy
   ```

2. **Clone your repo on the server**:
   ```bash
   sudo -u gallery-deploy git clone https://github.com/YOU/YOUR-GALLERY.git /var/www/gallery
   cd /var/www/gallery
   sudo -u gallery-deploy git submodule update --init --recursive
   ```

3. **Configure git for the deploy user** (critical):
   ```bash
   sudo -u gallery-deploy git config --global pull.ff only
   sudo -u gallery-deploy git config --global --add safe.directory /var/www/gallery
   sudo -u gallery-deploy git config --global --add safe.directory /var/www/gallery/360-viewer
   ```

4. **Generate webhook secrets**:
   ```bash
   python3 -c "import secrets; print(secrets.token_hex(32))"
   # Generate two: one for WEBHOOK_SECRET, one for URL_SECRET
   ```

5. **Configure the deploy script** — edit the config variables at the top of your chosen script.

6. **Set up GitHub webhook**:
   - Repo > Settings > Webhooks > Add webhook
   - Payload URL: `https://yourdomain.com/deploy.php?SECRET=YOUR_URL_SECRET`
   - Content type: `application/json`
   - Secret: `YOUR_WEBHOOK_SECRET`
   - Events: Just the push event

7. **Sudoers** (allow web server to run git as deploy user):
   ```bash
   echo 'www-data ALL=(gallery-deploy) NOPASSWD: /usr/bin/git' | sudo tee /etc/sudoers.d/gallery-deploy
   ```

#### Deploy Gotchas

These are common pitfalls we've encountered:

- **`.git` ownership**: After `chown -R www-data:www-data`, you MUST restore `.git` directories to the deploy user. The deploy scripts handle this automatically.
- **`safe.directory`**: Must be configured for BOTH the main repo AND the `360-viewer` submodule path.
- **`pull.ff only`**: Prevents merge commits on deploy. Set for the deploy user globally.
- **Build locally**: Run `build_library.py` on your local machine, commit the results, then push. Don't build on the server.

### Any Static Host

Pure static files — upload the directory to any web server.

---

## Updating the Viewer

```bash
cd 360-viewer && git pull origin master && cd ..
git add 360-viewer && git commit -m "chore: update 360-viewer"
```

Check [CHANGELOG.md](../CHANGELOG.md) for breaking changes before updating.

## Adding New Images

1. Drop new equirectangular images into a `library/` subdirectory
2. Re-run the build command
3. Commit the updated `library.json` and `_BUILD/`
4. Push (auto-deploys if webhook is set up)

## Example

See [360-PHONG-COM](https://github.com/ansonphong/360-PHONG-COM) for a complete gallery example powering [360.phong.com](https://360.phong.com).

---

## Quick Setup with Claude Code

If you use [Claude Code](https://claude.com/claude-code), run `/create-gallery` for guided setup. The skill will ask your preferences and set everything up automatically.

Or paste this prompt:

<details>
<summary>Click to expand the Claude Code kickoff prompt</summary>

```
I want to create a new 360 panoramic image gallery using the Phong 360 Viewer engine.

Read CLAUDE.md and docs/FORK-GUIDE.md in the 360-viewer submodule for full context.

Setup steps:
1. Initialize a new git repo
2. Add 360-viewer as a submodule: git submodule add https://github.com/ansonphong/360-VIEWER.git 360-viewer
3. Copy the gallery template: cp -r 360-viewer/gallery-template/* . && cp 360-viewer/gallery-template/.gitignore .
4. Ask me for gallery config (name, profile type, theme, accent, hosting preference)
5. Generate 360-viewer.json and customize index.html
6. Set up deploy script if I'm using a VPS (ask PHP or Python)
7. I'll add my 360 images to library/ subdirectories
8. Build the library: python 360-viewer/library/build_library.py --root library/ --output library/library.json --config 360-viewer.json
9. Test locally and commit
```

</details>
