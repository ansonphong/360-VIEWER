# Phong 360 Viewer

**Ultra-lightweight, modular 360 image viewer with progressive enhancement.**

**[See it live at 360.phong.com](https://360.phong.com)**

[![Version](https://img.shields.io/badge/version-4.1.0-blue)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Three.js](https://img.shields.io/badge/three.js-r128-orange)](https://threejs.org/)
[![Claude Code](https://img.shields.io/badge/Claude_Code-ready-blueviolet)](CLAUDE.md)

## What Makes This Special

- **Claude Code Ready**: Includes `CLAUDE.md` project context, `/create-gallery` skill for guided setup, and comprehensive docs that AI agents can read and act on. Set up a full gallery site in minutes with Claude Code.
- **Truly Modular**: Russian Doll architecture — use Layer 1 (30KB), add Layer 2 (+15KB), or Layer 3 (+25KB). Only load what you need.
- **Ultra-Lightweight**: Core is only 30KB — 6x smaller than competitors. No webpack, no babel, no build step.
- **Complete Gallery Engine**: Sidebar, toolbar, info bar, theming, favicon, resolution switching, prev/next navigation — all built in. Your host page stays minimal.
- **Section-Based UI**: Template engine with 9 built-in renderers (grid, feed, accordion, hero, list, carousel, avatar-row, avatar-grid, empty-state)
- **JSON-Driven Config**: One `360-viewer.json` file controls everything — title, theme, accent color, panel width, favicon, social links. No code changes needed.
- **Deploy Templates**: Ready-to-use webhook scripts (PHP and Python) with documented server setup and gotchas.
- **Theme System**: Light/dark/auto modes with CSS custom properties and accent color support
- **Deep-Linking**: Configurable via the `urlSync` option. Default `true` keeps the legacy `?img=<slug>` read/write behavior. Pass `false` for embeds that must not touch the host URL, or `{read, write}` for custom strategies. See `docs/API.md`.
- **Mobile Optimized**: Touch gestures, responsive sidebar, WASD + arrow key controls, double-click fullscreen
- **Adaptive Loading**: Smart resolution selection (8K/4K/2K) based on device and bandwidth

---

## Create Your Own Gallery

The fastest way to get started:

### With Claude Code

```bash
git submodule add https://github.com/ansonphong/360-VIEWER.git 360-viewer
```

Then run `/create-gallery` — the skill walks you through everything: profile setup, theme, deploy scripts, image building, and testing.

### Manual Setup

1. **[Gallery Template](gallery-template/)** — Starter files (index.html, config, deploy scripts, cache headers)
2. **[Fork Guide](docs/FORK-GUIDE.md)** — Step-by-step setup and full configuration reference
3. **[Example: 360.phong.com](https://360.phong.com)** — Live gallery built with this engine ([source](https://github.com/ansonphong/360-PHONG-COM))

---

## Peer Dependencies

The viewer uses [Phosphor Icons](https://phosphoricons.com/) for all UI glyphs
(toolbar buttons, sidebar toggle, info bar nav). Your host page **must** load
Phosphor Icons before the viewer initializes — either via CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css" />
```

or via your own bundled copy. If Phosphor is missing you'll see empty boxes
where the icons should be — there is no fallback inside the viewer.

Three.js r128 is also required for Layer 1 (Core Viewer) and is similarly
loaded by the host page. See [QUICKSTART.md](docs/QUICKSTART.md) for the full
host-page template.

---

## Architecture

The viewer uses a **Russian Doll** architecture with three progressive layers:

```
Layer 3: Library UI (+25KB)          Sidebar, toolbar, info bar, templates, themes
  Layer 2: Multi-Image (+15KB)       Multiple images, adaptive resolution, preferences
    Layer 1: Core Viewer (30KB)      Three.js renderer, controls, projections
```

**Layer 4** (optional, separate repo) adds gallery features like reactions, auth, and sharing via callbacks.

---

## Quick Start

### Layer 1: Single Image Viewer (30KB)

```html
<div id="viewer" style="width: 100%; height: 600px;"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="core/phong-360-viewer-core.js"></script>
<link rel="stylesheet" href="css/styles.css" />

<script>
	const viewer = new Phong360ViewerCore({
		containerId: 'viewer',
		imageUrl: 'my-360-image.jpg',
		config: {
			viewRotation: { autoRotate: true }
		}
	});
</script>
```

**You get**: mouse drag, wheel zoom, touch gestures, keyboard controls (WASD + arrows), auto-rotation, projection switching, double-click fullscreen.

### Layer 3: Full Gallery (recommended)

```html
<script src="extensions/phong-360-library-ui.js"></script>
<link rel="stylesheet" href="css/phong-360-ui.css" />
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css" />

<script>
	const gallery = new Phong360LibraryUI({
		containerId: 'viewer',
		libraryUrl: 'library/library.json',
		configUrl: '360-viewer.json',
		baseUrl: 'library/',
		theme: 'auto'
	});
</script>
```

**Full-featured gallery**: section-based sidebar, toolbar with resolution switching, glassmorphic info bar with prev/next navigation, light/dark themes, emoji favicon, deep-linking, lazy loading — all configured via `360-viewer.json`.

---

## Configuration

Everything is driven by `360-viewer.json`:

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
			{ "url": "https://yoursite.com", "label": "Website" },
			{ "url": "https://instagram.com/you", "label": "Instagram" }
		]
	},
	"sections": {
		"Landscapes": {
			"title": "Landscapes",
			"icon": "mountains",
			"template": "grid"
		}
	}
}
```

See the [Fork Guide](docs/FORK-GUIDE.md) for all configuration options.

### Engine config (Phong360ViewerCore)

Pass overrides through `new Phong360ViewerCore({ config: { ... } })`. Notable toggles:

- `controls.enableZoom` *(default `true`)* — set to `false` to disable mouse-wheel and pinch zoom so the host page scrolls normally over the canvas. Drag-to-pan and keyboard pan still work.
- `loading.backgroundColor` *(default `'#000'`)* — drives canvas inline bg, overlay bg, `scene.background`, and `renderer.setClearColor`. All four stay in sync.
- `loading.fadeInDuration` *(default `500` ms)* — overlay fade-in before a new image swaps in (subsequent `loadImage()` calls only). Set to `0` to snap straight to the new image.
- `loading.fadeOutDuration` *(default `500` ms)* — overlay fade-out once the new image has painted. Set to `0` for instant reveal.

The container element dispatches a bubbling `phong-360-loaded` CustomEvent (`detail: { url }`) **after the overlay fade-out completes** — i.e., once the new panorama is fully visible. Useful for synchronizing host-page UI (captions, auto-rotate, analytics).

**Multi-viewer pages:** each viewer creates its own loading overlay scoped to its container — there is no shared global state. If a host page wants to pre-create an overlay for an instance (e.g. for FOUC prevention), place it as a `<div id="loading-overlay">` inside the viewer's container element; the engine will adopt it (and leave it alone on `destroy()`).

**Concurrency:** `loadImage()` is latest-wins. A new call during an in-flight load cancels the previous (the prior result is discarded), no lock-out window. The returned Promise from a superseded call never resolves; consumers that need to track completion of a specific call should `await` its Promise.

---

## Documentation

| Document                                        | Description                                   |
| ----------------------------------------------- | --------------------------------------------- |
| **[CLAUDE.md](CLAUDE.md)**                      | Project context for Claude Code and AI agents |
| **[CHANGELOG.md](CHANGELOG.md)**                | Version history with migration guides         |
| **[FORK-GUIDE.md](docs/FORK-GUIDE.md)**         | Create your own 360 gallery website           |
| **[API.md](docs/API.md)**                       | Complete API reference for all 3 layers       |
| **[LIBRARY-FORMAT.md](docs/LIBRARY-FORMAT.md)** | Library format specification (v4.0)           |
| **[TEMPLATES.md](docs/TEMPLATES.md)**           | Template system and renderers guide           |
| **[THEMING.md](docs/THEMING.md)**               | Theming, CSS custom properties, accent colors |
| **[DEPLOYMENT.md](docs/DEPLOYMENT.md)**         | Production deployment guide                   |
| **[QUICKSTART.md](docs/QUICKSTART.md)**         | Get started in 5 minutes                      |

---

## Template System

Layer 3 includes a pluggable template engine with 9 built-in renderers:

| Template      | Description                             | Use Case                    |
| ------------- | --------------------------------------- | --------------------------- |
| `grid`        | Responsive thumbnail grid               | Default browsing            |
| `feed`        | Vertical list with large thumbnails     | Recent/featured content     |
| `accordion`   | Collapsible section with inner template | Category organization       |
| `hero`        | Single large featured image             | Featured/spotlight          |
| `list`        | Compact rows with small thumbnails      | Search results, dense lists |
| `carousel`    | Horizontal scrolling strip              | Trending, related content   |
| `avatar-row`  | Horizontal circular avatars             | Creator highlights          |
| `avatar-grid` | Grid of avatar cards                    | Creator directory           |
| `empty`       | Placeholder for empty sections          | No-content state            |

---

## Controls

| Action                | Mouse        | Keyboard          | Touch      |
| --------------------- | ------------ | ----------------- | ---------- |
| **Look Around**       | Click & Drag | WASD / Arrow Keys | Swipe      |
| **Zoom In**           | Scroll Up    | `+` or `=`        | Pinch Out  |
| **Zoom Out**          | Scroll Down  | `-` or `_`        | Pinch In   |
| **Fullscreen**        | Double-click | -                 | Double-tap |
| **Toggle Projection** | Button       | `P`               | Button     |

---

## Installation

### Git Submodule (Recommended)

```bash
git submodule add https://github.com/ansonphong/360-VIEWER.git 360-viewer
```

### Download

```bash
git clone https://github.com/ansonphong/360-VIEWER.git
```

---

## File Structure

```
360-viewer/
├── core/
│   └── phong-360-viewer-core.js       # Layer 1: Core viewer (30KB)
├── extensions/
│   ├── phong-360-multi-image.js       # Layer 2: Multi-image manager (+15KB)
│   └── phong-360-library-ui.js        # Layer 3: Library UI (+25KB)
├── css/
│   ├── styles.css                     # Core page styles
│   └── phong-360-ui.css               # Library UI styles
├── library/
│   └── build_library.py              # Multi-resolution library builder
├── gallery-template/                   # Starter kit for new galleries
│   ├── index.html                     # Host page template
│   ├── 360-viewer.json                # Config template
│   ├── deploy/                        # Webhook deploy scripts (PHP + Python)
│   └── netlify.toml                   # Cache headers for Netlify
├── .claude/
│   └── commands/create-gallery.md     # Claude Code setup skill
├── docs/                              # Full documentation
├── CLAUDE.md                          # AI agent project context
├── CHANGELOG.md                       # Version history + migration guides
└── README.md                          # This file
```

---

## Comparison

| Feature                | Phong 360         | Photo Sphere Viewer | Pannellum | Marzipano  |
| ---------------------- | ----------------- | ------------------- | --------- | ---------- |
| **Core Size**          | **30KB**          | 180KB               | 75KB      | 95KB       |
| **Modular**            | 3 Layers          | No                  | No        | No         |
| **Template Engine**    | 9 renderers       | No                  | No        | No         |
| **Theme System**       | Light/Dark/Auto   | No                  | No        | No         |
| **AI-Assisted Setup**  | Claude Code skill | No                  | No        | No         |
| **Deploy Templates**   | PHP + Python      | No                  | No        | No         |
| **Build Required**     | No                | Yes                 | No        | Partial    |
| **Framework Agnostic** | Yes               | Partial             | Yes       | Partial    |
| **Adaptive Loading**   | Yes               | No                  | No        | Partial    |
| **License**            | MIT               | MIT                 | MIT       | Apache 2.0 |

---

## Roadmap

### v4.1 (Current)

- [x] Glassmorphic info bar with prev/next navigation
- [x] Custom resolution dropdown (replaces `<select>`)
- [x] WASD keyboard controls
- [x] Double-click fullscreen
- [x] configUrl for separate config loading
- [x] panelWidth, infoBar, favicon config fields
- [x] Claude Code integration (CLAUDE.md, /create-gallery skill)
- [x] Deploy script templates (PHP + Python)
- [x] CHANGELOG.md with migration guides

### v4.2 (Next)

- [ ] NPM package
- [ ] CDN distribution (jsDelivr)
- [ ] TypeScript definitions
- [ ] Minified builds

### v5.0 (Future)

- [ ] VR mode support
- [ ] Hotspot/annotation system
- [ ] Video 360 support
- [ ] React/Vue wrapper components

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Version**: 4.1.0 | **Author**: [Phong](https://phong.com) | **License**: MIT
