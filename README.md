# Phong 360 Viewer

**Ultra-lightweight, modular 360° panorama viewer with progressive enhancement.**

**[See it live at 360.phong.com](https://360.phong.com)**

[![@ansonphong/360-viewer](https://img.shields.io/npm/v/@ansonphong/360-viewer?label=%40ansonphong%2F360-viewer&color=blue)](https://www.npmjs.com/package/@ansonphong/360-viewer)
[![@ansonphong/360-viewer-library](https://img.shields.io/npm/v/@ansonphong/360-viewer-library?label=%40ansonphong%2F360-viewer-library&color=blue)](https://www.npmjs.com/package/@ansonphong/360-viewer-library)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Three.js](https://img.shields.io/badge/three.js-r128-orange)](https://threejs.org/)
[![Claude Code](https://img.shields.io/badge/Claude_Code-ready-blueviolet)](CLAUDE.md)

---

## 📦 Install via npm

Two packages, install one or both:

```bash
# Engine: headless 360 panorama renderer (no DOM beyond canvas)
npm install @ansonphong/360-viewer

# Library UI: sidebar / toolbar / info-bar chrome (depends on the engine)
npm install @ansonphong/360-viewer-library
```

Three.js is a peer dependency:

```bash
npm install three
```

> **Renamed in 6.0.0.** The old packages `@ansonphong/360-engine` and `@ansonphong/360-library-ui` are **deprecated** on npm and redirect installs to these names. See [migration notes](#migration-from-5x-to-6x).

---

## 🚀 Quick Start

### Option A — Plain HTML + UMD bundles (no build step)

```html
<!-- Three.js (peer dep) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

<!-- 360-Viewer engine (UMD) -->
<link rel="stylesheet" href="https://unpkg.com/@ansonphong/360-viewer@6/dist/viewer.css" />
<script src="https://unpkg.com/@ansonphong/360-viewer@6/dist/viewer.umd.js"></script>

<div id="viewer" style="width: 100%; height: 600px;"></div>

<script>
  const viewer = new Phong360Viewer({
    container: 'viewer',
    autoRotate: true,
    autoRotationRate: 1.5,
  });
  viewer.loadImage('my-360-image.jpg');
</script>
```

**You get:** mouse drag, wheel zoom, touch gestures, keyboard controls (WASD + arrows), auto-rotation, projection switching, double-click fullscreen.

### Option B — ESM (Vite / webpack / Rollup / Next.js)

```bash
npm install @ansonphong/360-viewer three
```

```js
import 'three';                                    // peer dep, loaded once into window.THREE
import { Phong360Viewer } from '@ansonphong/360-viewer';
import '@ansonphong/360-viewer/dist/viewer.css';

const viewer = new Phong360Viewer({
  container: document.getElementById('viewer'),
  autoRotate: true,
});
viewer.loadImage('/panoramas/sunset.jpg');
```

### Option C — Full gallery chrome (engine + library-ui)

```bash
npm install @ansonphong/360-viewer @ansonphong/360-viewer-library three
```

```html
<!-- Peer deps -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css" />

<!-- Engine + Library UI (UMD) -->
<link rel="stylesheet" href="https://unpkg.com/@ansonphong/360-viewer@6/dist/viewer.css" />
<link rel="stylesheet" href="https://unpkg.com/@ansonphong/360-viewer-library@6/dist/viewer-library.css" />
<script src="https://unpkg.com/@ansonphong/360-viewer@6/dist/viewer.umd.js"></script>
<script src="https://unpkg.com/@ansonphong/360-viewer-library@6/dist/viewer-library.umd.js"></script>

<div id="viewer" style="width: 100%; height: 100vh;"></div>

<script>
  const gallery = new Phong360ViewerLibrary({
    container: 'viewer',
    libraryUrl: 'library/library.json',
    configUrl: '360-viewer.json',
    baseUrl: 'library/',
    theme: 'auto',
  });
</script>
```

**Full-featured gallery:** section-based sidebar, toolbar with resolution switching, glassmorphic info bar with prev/next navigation, light/dark themes, emoji favicon, deep-linking, lazy loading — all configured via `360-viewer.json`.

### Option D — Single-file standalone bundle

If you want to ship one file with no peer-dep coordination, use the standalone UMD:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://unpkg.com/@ansonphong/360-viewer@6/dist/viewer.standalone.umd.js"></script>
```

Same `Phong360Viewer` global, internally uses `window.THREE` via a shim — guarantees a single Three.js instance even in pages that already load Three.

---

## Peer Dependencies

The viewer relies on:

- **Three.js r128** — required by the engine. The viewer expects it on `window.THREE` (UMD) or as an ESM import (ESM bundle).
- **[Phosphor Icons](https://phosphoricons.com/)** — required by the library-ui for toolbar/sidebar/info-bar glyphs. Load before the library-ui initializes:

  ```html
  <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css" />
  ```

If Phosphor is missing you'll see empty boxes where icons should be — there is no fallback inside the viewer.

---

## Architecture

The viewer uses a **Russian Doll** architecture with three progressive layers:

```
Layer 3: Library UI (+25KB)          Sidebar, toolbar, info bar, templates, themes
  Layer 2: Multi-Image (+15KB)       Multiple images, adaptive resolution, preferences
    Layer 1: Core Viewer (30KB)      Three.js renderer, controls, projections
```

**Layer 4** (optional, separate repo) adds gallery features like reactions, auth, and sharing via callbacks.

| Layer | npm package | Class | Size |
|-------|-------------|-------|------|
| 1 (core) | `@ansonphong/360-viewer` | `Phong360ViewerCore` | 30KB |
| 2 (multi-image) | `@ansonphong/360-viewer` | `Phong360Viewer` (wraps core + multi-image) | +15KB |
| 3 (library UI) | `@ansonphong/360-viewer-library` | `Phong360ViewerLibrary` | +25KB |

---

## Configuration

Everything for Layer 3 is driven by `360-viewer.json`:

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

### Engine config (Phong360Viewer)

Pass overrides through `new Phong360Viewer({ ... })`. Notable toggles:

- `controls.enableZoom` *(default `true`)* — set to `false` to disable mouse-wheel and pinch zoom so the host page scrolls normally over the canvas. Drag-to-pan and keyboard pan still work.
- `controls.enablePan` *(default `true`)* — set to `false` to disable mouse drag, single-finger touch drag, and keyboard arrow/WASD pan. Pinch-zoom and auto-rotate are unaffected. Useful for mobile hero viewers where a single-finger vertical drag should scroll the page rather than rotate the panorama.
- `loading.backgroundColor` *(default `'#000'`)* — drives canvas inline bg, overlay bg, `scene.background`, and `renderer.setClearColor`. All four stay in sync.
- `loading.fadeInDuration` *(default `500` ms)* — overlay fade-in before a new image swaps in (subsequent `loadImage()` calls only). Set to `0` to snap straight to the new image.
- `loading.fadeOutDuration` *(default `500` ms)* — overlay fade-out once the new image has painted. Set to `0` for instant reveal.
- `loading.showSpinner` *(default `true`)* — set to `false` to suppress the spinning indicator inside the engine-created loading overlay. The overlay itself still exists and drives fade-through-black transitions. No-op when the host provides its own overlay (host owns inner content). Useful for marketing/hero viewers where a UI spinner breaks the cinematic effect.

The container element dispatches a bubbling `phong-viewer-loaded` CustomEvent (`detail: { url }`) **after the overlay fade-out completes** — i.e., once the new panorama is fully visible. Useful for synchronizing host-page UI (captions, auto-rotate, analytics).

**Multi-viewer pages:** each viewer creates its own loading overlay scoped to its container — there is no shared global state. If a host page wants to pre-create an overlay for an instance (e.g. for FOUC prevention), place it as a `<div id="loading-overlay">` inside the viewer's container element; the engine will adopt it (and leave it alone on `destroy()`).

**Concurrency:** `loadImage()` is latest-wins. A new call during an in-flight load cancels the previous (the prior result is discarded), no lock-out window. The returned Promise from a superseded call never resolves; consumers that need to track completion of a specific call should `await` its Promise.

---

## What Makes This Special

- **Claude Code Ready** — Includes `CLAUDE.md` project context, `/create-gallery` skill for guided setup, and comprehensive docs that AI agents can read and act on. Set up a full gallery site in minutes with Claude Code.
- **Truly Modular** — Russian Doll architecture: use Layer 1 (30KB), add Layer 2 (+15KB), or Layer 3 (+25KB). Only load what you need.
- **Ultra-Lightweight** — Core is only 30KB — 6× smaller than competitors. No webpack, no babel, no build step required for consumers.
- **Complete Gallery Engine** — Sidebar, toolbar, info bar, theming, favicon, resolution switching, prev/next navigation — all built in. Your host page stays minimal.
- **Section-Based UI** — Template engine with 9 built-in renderers (grid, feed, accordion, hero, list, carousel, avatar-row, avatar-grid, empty-state).
- **JSON-Driven Config** — One `360-viewer.json` file controls everything — title, theme, accent color, panel width, favicon, social links. No code changes needed.
- **Deploy Templates** — Ready-to-use webhook scripts (PHP and Python) with documented server setup and gotchas.
- **Theme System** — Light/dark/auto modes with CSS custom properties (`--pv-*`) and accent-color support.
- **Deep-Linking** — Configurable via the `urlSync` option. Default `true` keeps the legacy `?img=<slug>` read/write behavior. Pass `false` for embeds that must not touch the host URL, or `{read, write}` for custom strategies. See `docs/API.md`.
- **Mobile Optimized** — Touch gestures, responsive sidebar, WASD + arrow key controls, double-click fullscreen.
- **Adaptive Loading** — Smart resolution selection (8K/4K/2K) based on device and bandwidth.

---

## Migration from 5.x to 6.x

The packages were **renamed** in 6.0.0. There are no behavior changes — pure rename across the public surface:

| 5.x | 6.x |
|---|---|
| `@ansonphong/360-engine` | `@ansonphong/360-viewer` |
| `@ansonphong/360-library-ui` | `@ansonphong/360-viewer-library` |
| `Phong360Engine` class | `Phong360Viewer` class |
| `Phong360LibraryUI` class | `Phong360ViewerLibrary` class |
| `dist/engine.*` files | `dist/viewer.*` files |
| `dist/library-ui.*` files | `dist/viewer-library.*` files |
| CSS prefix `--p360-*` / `.p360-*` | `--pv-*` / `.pv-*` |
| Events `phong-360-*` (loaded, paused, resumed, error) | `phong-viewer-*` |
| Event `p360-help` | `pv-help` |

**Inner class `Phong360ViewerCore` is unchanged** (still the core Three.js renderer class).

### Migration steps

```bash
# 1. Swap dependencies
npm uninstall @ansonphong/360-engine @ansonphong/360-library-ui
npm install @ansonphong/360-viewer @ansonphong/360-viewer-library

# 2. Update imports
# Before: import { Phong360Engine } from '@ansonphong/360-engine';
# After:  import { Phong360Viewer } from '@ansonphong/360-viewer';

# 3. Update CSS class refs and custom properties
# sed -i 's/--p360-/--pv-/g; s/\.p360-/.pv-/g' your-styles.css

# 4. Update event listeners
# Before: element.addEventListener('phong-360-loaded', ...)
# After:  element.addEventListener('phong-viewer-loaded', ...)
```

Old npm packages remain installable indefinitely (with a deprecation notice) so existing lockfiles do not break.

---

## Documentation

| Document | Description |
|---|---|
| **[CLAUDE.md](CLAUDE.md)** | Project context for Claude Code and AI agents |
| **[CHANGELOG.md](CHANGELOG.md)** | Version history with migration guides |
| **[FORK-GUIDE.md](docs/FORK-GUIDE.md)** | Create your own 360 gallery website |
| **[API.md](docs/API.md)** | Complete API reference for all 3 layers |
| **[LIBRARY-FORMAT.md](docs/LIBRARY-FORMAT.md)** | Library format specification (v4.0) |
| **[TEMPLATES.md](docs/TEMPLATES.md)** | Template system and renderers guide |
| **[THEMING.md](docs/THEMING.md)** | Theming, CSS custom properties, accent colors |
| **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** | Production deployment guide |
| **[QUICKSTART.md](docs/QUICKSTART.md)** | Get started in 5 minutes |

---

## Template System

Layer 3 (library-ui) includes a pluggable template engine with 9 built-in renderers:

| Template | Description | Use Case |
|---|---|---|
| `grid` | Responsive thumbnail grid | Default browsing |
| `feed` | Vertical list with large thumbnails | Recent/featured content |
| `accordion` | Collapsible section with inner template | Category organization |
| `hero` | Single large featured image | Featured/spotlight |
| `list` | Compact rows with small thumbnails | Search results, dense lists |
| `carousel` | Horizontal scrolling strip | Trending, related content |
| `avatar-row` | Horizontal circular avatars | Creator highlights |
| `avatar-grid` | Grid of avatar cards | Creator directory |
| `empty` | Placeholder for empty sections | No-content state |

---

## Controls

| Action | Mouse | Keyboard | Touch |
|---|---|---|---|
| **Look Around** | Click & Drag | WASD / Arrow Keys | Swipe |
| **Zoom In** | Scroll Up | `+` or `=` | Pinch Out |
| **Zoom Out** | Scroll Down | `-` or `_` | Pinch In |
| **Fullscreen** | Double-click | — | Double-tap |
| **Toggle Projection** | Button | `P` | Button |

---

## Monorepo Structure

This repository is an npm workspaces monorepo containing both packages plus the gallery-template starter kit and demo assets.

```
360-VIEWER/
├── packages/
│   ├── engine/          # @ansonphong/360-viewer (published to npm)
│   │   ├── src/
│   │   ├── dist/
│   │   └── package.json
│   └── library-ui/      # @ansonphong/360-viewer-library (published to npm)
│       ├── src/
│       ├── dist/
│       └── package.json
├── gallery-template/    # Starter kit — fork this for a new gallery site
│   ├── index.html
│   ├── 360-viewer.json
│   ├── deploy/          # PHP + Python webhook scripts
│   └── netlify.toml
├── docs/                # Full documentation (FORK-GUIDE, API, THEMING, etc.)
├── core/                # Legacy Layer-1 standalone build (pre-monorepo)
├── extensions/          # Legacy Layer-2/3 standalone builds (pre-monorepo)
├── library/             # Multi-resolution image library builder (Python)
├── .claude/             # Claude Code skills (/create-gallery)
├── CLAUDE.md            # AI agent project context
├── CHANGELOG.md         # Version history
└── README.md            # This file
```

### Working on the source

```bash
git clone https://github.com/ansonphong/360-VIEWER.git
cd 360-VIEWER
npm install
npm run build              # builds both packages
npm run build -w @ansonphong/360-viewer  # builds engine only
```

---

## Comparison

| Feature | Phong 360 | Photo Sphere Viewer | Pannellum | Marzipano |
|---|---|---|---|---|
| **Core Size** | **30KB** | 180KB | 75KB | 95KB |
| **Modular** | 3 Layers | No | No | No |
| **Template Engine** | 9 renderers | No | No | No |
| **Theme System** | Light/Dark/Auto | No | No | No |
| **AI-Assisted Setup** | Claude Code skill | No | No | No |
| **Deploy Templates** | PHP + Python | No | No | No |
| **Build Required** | No | Yes | No | Partial |
| **Framework Agnostic** | Yes | Partial | Yes | Partial |
| **Adaptive Loading** | Yes | No | No | Partial |
| **License** | MIT | MIT | MIT | Apache 2.0 |

---

## Alternative Installation: Git Submodule

If you want to fork the whole monorepo (including the gallery-template starter and Python library builder), use a submodule:

```bash
git submodule add https://github.com/ansonphong/360-VIEWER.git 360-viewer
```

This is the recommended path if you want to:
- Self-host the JS/CSS without an npm pipeline
- Fork the gallery-template and customize the deploy scripts
- Use the `/create-gallery` Claude Code skill for guided setup

For most use cases, **npm install is the simpler path** — the packages above are pre-built and ready to drop into any project.

---

## Roadmap

### 6.x (current)

- [x] Published as `@ansonphong/360-viewer` + `@ansonphong/360-viewer-library` on npm
- [x] CDN distribution via unpkg / jsDelivr
- [x] Minified UMD + ESM + standalone bundles
- [x] Glassmorphic info bar with prev/next navigation
- [x] Custom resolution dropdown
- [x] WASD keyboard controls + double-click fullscreen
- [x] Claude Code integration (CLAUDE.md, /create-gallery skill)
- [x] Deploy script templates (PHP + Python)

### 6.x (next)

- [ ] TypeScript definitions shipped from source (currently aspirational)
- [ ] Stable inter-package version range (currently exact pin)
- [ ] React / Vue / Svelte wrapper components

### 7.0 (future)

- [ ] VR mode support
- [ ] Hotspot / annotation system
- [ ] Video 360 support

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

MIT License — see [LICENSE](LICENSE) for details.

---

**Latest**: `@ansonphong/360-viewer@6.0.3` · `@ansonphong/360-viewer-library@6.0.0` | **Author**: [Phong](https://phong.com) | **License**: MIT
