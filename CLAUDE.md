# Phong 360 Viewer - Claude Code Context

## Architecture

Three-layer "Russian Doll" architecture. Use only what you need:

```
Layer 3: Library UI          extensions/phong-360-library-ui.js  (+25KB)
  Layer 2: Multi-Image       extensions/phong-360-multi-image.js (+15KB)
    Layer 1: Core Viewer     core/phong-360-viewer-core.js       (30KB)
```

CSS: `css/phong-360-ui.css` (Layer 3 styles, CSS custom properties, light/dark themes)
Icons: Phosphor Icons via CDN (`ph ph-icon-name`)

## Key Files

| File | Purpose |
|------|---------|
| `core/phong-360-viewer-core.js` | Three.js r128 viewer, mouse/touch/keyboard controls, projections |
| `extensions/phong-360-multi-image.js` | Multiple images, adaptive resolution, localStorage prefs |
| `extensions/phong-360-library-ui.js` | Sidebar, toolbar, info bar, templates, themes, badges |
| `css/phong-360-ui.css` | All UI styles with CSS custom properties |
| `library/build_library.py` | Builds library.json from images + 360-viewer.json config |
| `gallery-template/` | Starter kit for new gallery sites |

## Config System

Config flows through two paths:
- **Constructor options**: `new Phong360LibraryUI({ panelWidth: 420, infoBar: 'center' })`
- **Config file** (via `configUrl`): `360-viewer.json` loaded separately from `library.json`
- **Context in library.json**: embedded by `build_library.py` from `360-viewer.json`

Priority: Constructor options > configUrl > library.json context > CSS defaults

### 360-viewer.json fields

```json
{
  "context": {
    "type": "profile|local|discover",
    "title": "Gallery Name",
    "subtitle": "Description",
    "avatar": "assets/avatar.png",
    "theme": "dark|light|auto",
    "accent": "#6366f1",
    "panelWidth": 420,
    "infoBar": "center|left",
    "favicon": "emoji or empty",
    "links": [{"url": "...", "label": "Website"}]
  },
  "sections": { ... },
  "build": { ... }
}
```

## Gallery Site Pattern

A gallery site (like 360-PHONG-COM) has this structure:
```
my-gallery/
  index.html           # Host page (from gallery-template)
  360-viewer.json      # Site config (loaded via configUrl)
  360-viewer/          # Submodule -> this repo
  library/
    library.json       # Built by build_library.py
    _BUILD/            # Generated resolutions + thumbnails
    SectionName/       # Source images (equirectangular)
```

### Host page pattern (index.html)

The host page is minimal. The engine handles everything (sidebar, toolbar, info bar, theming).
Key constructor call:
```js
viewer = new Phong360LibraryUI({
    containerId: 'container',
    libraryUrl: 'library/library.json',
    configUrl: '360-viewer.json',    // Loaded separately from library
    baseUrl: 'library/',
    theme: 'auto'
});
```

The host page only adds:
- `p360-help` event listener for a help/instructions modal
- Drag-and-drop for user images
- P key for projection switching
- Google Analytics (optional)

### Build process

```bash
pip install Pillow tqdm
python 360-viewer/library/build_library.py \
  --root library/ --output library/library.json --config 360-viewer.json
```

Build locally, commit results, push. The library.json includes context from 360-viewer.json.

## Engine Features (built-in, not host-page)

These are all handled by the engine internally:
- Sidebar with profile header, sections, thumbnails
- Toolbar: resolution dropdown, projection toggle, theme toggle, help button
- Info bar: glassmorphic bottom panel with prev/next navigation
- Emoji favicon (canvas-rendered from config)
- Panel width (CSS custom property from config)
- Deep-linking via `?img=slug`
- Sidebar stays open on desktop, closes on mobile when clicking an image
- Double-click canvas for fullscreen
- WASD + Arrow keys for panning

## Deploy Gotchas

When deploying via GitHub webhook to a VPS:
1. **git safe.directory**: Must be set for BOTH the main repo AND the 360-viewer submodule
2. **.git ownership**: After `chown -R www-data:www-data`, restore `.git` dirs to deploy user
3. **pull.ff only**: Configure for the deploy user to prevent merge commits
4. **Build locally**: Don't build on server. Run `build_library.py` locally, commit, push

## Coding Patterns

- Vanilla JS, no build tools, no transpilation
- CSS custom properties for theming (`--p360-*` prefix)
- Phosphor Icons for all icons (not FontAwesome)
- Custom events for decoupled communication (`p360-help`, etc.)
- `p360-` prefix for all CSS classes
- Methods prefixed with `_` are internal

## Docs

Full documentation in `docs/`:
- `FORK-GUIDE.md` - Create your own gallery (most useful for setup)
- `API.md` - Complete API reference
- `LIBRARY-FORMAT.md` - Library JSON spec
- `TEMPLATES.md` - Section template renderers
- `THEMING.md` - Theme system and CSS custom properties
- `DEPLOYMENT.md` - Production deploy guide

## Claude Code Skill

Run `/create-gallery` for guided gallery site setup.
