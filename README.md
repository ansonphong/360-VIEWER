# Phong 360 Viewer

**Ultra-lightweight, modular 360 image viewer with progressive enhancement.**

[![Version](https://img.shields.io/badge/version-4.0.0-blue)](https://github.com/ansonphong/360-VIEWER)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Three.js](https://img.shields.io/badge/three.js-r128-orange)](https://threejs.org/)

## What Makes This Special

- **Truly Modular**: Russian Doll architecture - use Layer 1 (30KB), add Layer 2 (+15KB), or Layer 3 (+25KB)
- **Ultra-Lightweight**: Core is only 30KB - 6x smaller than competitors
- **Section-Based UI**: Template engine with 9 built-in renderers (grid, feed, accordion, hero, list, carousel, avatar-row, avatar-grid, empty-state)
- **Theme System**: Light/dark/auto modes with CSS custom properties and accent color support
- **Badge System**: Emoji and icon badges on thumbnails with click events
- **Context-Aware Headers**: Profile, discover, and local context rendering with social link icons
- **Deep-Linking**: URL parameter support (`?img=slug`) for direct image access
- **Framework Agnostic**: Works with WordPress, React, Vue, or vanilla JS
- **No Build Required**: Drop it in and go - no webpack, no babel
- **Smart Preferences**: localStorage with namespaced keys
- **Full Controls**: Mouse, touch, keyboard navigation
- **Mobile Optimized**: Touch gestures and responsive sidebar
- **Two Projections**: Gnomonic and Stereographic
- **Adaptive Loading**: Smart resolution selection based on device and bandwidth

---

## Documentation

| Document | Description |
|----------|-------------|
| **[QUICKSTART.md](docs/QUICKSTART.md)** | Get started in 5 minutes |
| **[API.md](docs/API.md)** | Complete API reference for all 3 layers |
| **[LIBRARY-FORMAT.md](docs/LIBRARY-FORMAT.md)** | Library format specification (v4.0) |
| **[TEMPLATES.md](docs/TEMPLATES.md)** | Template system and renderers guide |
| **[THEMING.md](docs/THEMING.md)** | Theming, CSS custom properties, accent colors |
| **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** | Production deployment guide |
| **[WORDPRESS-INTEGRATION-PLAN.md](docs/WORDPRESS-INTEGRATION-PLAN.md)** | WordPress integration guide |
| **[OPEN-SOURCE-READY.md](docs/OPEN-SOURCE-READY.md)** | Open-source strategy and roadmap |

---

## Architecture

The viewer uses a **Russian Doll** architecture with three progressive layers. Use only what you need:

```
Layer 3: Library UI (+25KB)          Section-based sidebar, templates, badges, themes
  Layer 2: Multi-Image (+15KB)       Multiple images, adaptive resolution, preferences
    Layer 1: Core Viewer (30KB)      Three.js renderer, controls, projections
```

**Layer 4** (optional, separate repo) adds gallery-specific features like reactions, auth, and sharing. It lives in the `360-HEXTILE-GALLERY` repo and extends Layer 3 via callbacks.

---

## Quick Start

### Layer 1: Single Image Viewer (30KB)

```html
<div id="viewer" style="width: 100%; height: 600px;"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="core/phong-360-viewer-core.js"></script>
<link rel="stylesheet" href="css/styles.css">

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

**You get**: mouse drag, wheel zoom, touch gestures, keyboard controls, auto-rotation, projection switching.

### Layer 2: Multiple Images + Adaptive Resolution (+15KB)

```html
<script src="extensions/phong-360-multi-image.js"></script>

<script>
    const core = new Phong360ViewerCore({ containerId: 'viewer' });
    const multi = new Phong360MultiImage({
        core: core,
        images: [
            {
                id: 'sunset',
                title: 'Sunset Beach',
                slug: 'sunset-beach',
                resolutions: [
                    { id: '4k', label: '4K', path: 'sunset-4k.jpg', width: 4096, height: 2048, default: true },
                    { id: '2k', label: '2K', path: 'sunset-2k.jpg', width: 2048, height: 1024 }
                ]
            }
        ],
        adaptiveLoading: true
    });
    multi.loadFirstImage();
</script>
```

**Adds**: multiple images, adaptive resolution, manual resolution switching, localStorage preferences.

### Layer 3: Full Library UI (+25KB)

```html
<script src="extensions/phong-360-library-ui.js"></script>
<link rel="stylesheet" href="css/phong-360-ui.css">
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css">

<script>
    const libraryUI = new Phong360LibraryUI({
        containerId: 'viewer',
        libraryUrl: 'library/library.json',
        baseUrl: 'library/',
        theme: 'auto',                  // 'light' | 'dark' | 'auto'
        accent: '#6366f1',              // Custom accent color
        callbacks: {
            onImageLoad: (imageData, resolution) => {
                console.log('Loaded:', imageData.title, resolution.label);
            },
            onBadgeClick: (imageData, badge) => {
                console.log('Badge clicked:', badge.emoji, badge.count);
            }
        }
    });
</script>
```

**Full-featured viewer**: section-based sidebar, 9 template renderers, badge overlays, light/dark themes, context-aware headers, deep-linking, lazy loading.

---

## Library Format (v4.0)

The viewer uses a JSON-based library format with sections and templates:

```json
{
  "version": "4.0.0",
  "context": {
    "type": "local",
    "title": "My 360 Gallery",
    "theme": "auto"
  },
  "sections": [
    {
      "id": "landscapes",
      "title": "Landscapes",
      "template": "accordion",
      "icon": "mountains",
      "images": [
        {
          "id": "abc123",
          "title": "Mountain Sunset",
          "slug": "mountain-sunset",
          "thumbnail": { "path": "_BUILD/thumbnails/mountain-sunset.jpg", "width": 512, "height": 256 },
          "resolutions": [
            { "id": "4k", "label": "4K", "path": "_BUILD/4K/mountain-sunset.jpg", "width": 4096, "height": 2048, "default": true },
            { "id": "2k", "label": "2K", "path": "_BUILD/2K/mountain-sunset.jpg", "width": 2048, "height": 1024 }
          ],
          "badges": [
            { "emoji": "fire", "count": 42 }
          ]
        }
      ]
    }
  ]
}
```

See [LIBRARY-FORMAT.md](docs/LIBRARY-FORMAT.md) for the full specification and [TEMPLATES.md](docs/TEMPLATES.md) for available templates.

---

## Template System

Layer 3 includes a pluggable template engine with 9 built-in renderers:

| Template | Description | Use Case |
|----------|-------------|----------|
| `grid` | Responsive thumbnail grid | Default browsing |
| `feed` | Vertical list with large thumbnails | Recent/featured content |
| `accordion` | Collapsible section with inner template | Category organization |
| `hero` | Single large featured image | Featured/spotlight |
| `list` | Compact rows with small thumbnails | Search results, dense lists |
| `carousel` | Horizontal scrolling strip | Trending, related content |
| `avatar-row` | Horizontal circular avatars | Creator highlights |
| `avatar-grid` | Grid of avatar cards | Creator directory |
| `empty` | Placeholder for empty sections | No-content state |

Custom templates can be registered via `templateEngine.register('name', RendererClass)`.

See [TEMPLATES.md](docs/TEMPLATES.md) for config options and visual examples.

---

## Controls

| Action | Mouse | Keyboard | Touch |
|--------|-------|----------|-------|
| **Look Around** | Click & Drag | Arrow Keys | Swipe |
| **Zoom In** | Scroll Up | `+` or `=` | Pinch Out |
| **Zoom Out** | Scroll Down | `-` or `_` | Pinch In |
| **Toggle Projection** | Button | `P` | Button |
| **Auto-Rotate** | - | `Space` | - |

---

## Installation

### Method 1: Download & Include

```bash
git clone https://github.com/ansonphong/360-VIEWER.git

# Layer 1: core/phong-360-viewer-core.js
# Layer 2: extensions/phong-360-multi-image.js
# Layer 3: extensions/phong-360-library-ui.js
```

### Method 2: Git Submodule

```bash
cd your-project/assets/
git submodule add https://github.com/ansonphong/360-VIEWER.git 360-viewer
```

### Method 3: NPM (Coming Soon)

```bash
npm install phong-360-viewer
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
│                                       #   Includes TemplateEngine, BaseRenderer,
│                                       #   and all 9 built-in template renderers
├── css/
│   ├── styles.css                     # Core page styles
│   └── phong-360-ui.css               # Library UI styles (CSS custom properties,
│                                       #   light/dark themes, all template styles)
├── library/
│   ├── library.json                   # Sample library (v4.0 format)
│   └── build_library.py              # Library builder script
├── docs/
│   ├── README.md                      # Documentation index
│   ├── API.md                         # Complete API reference
│   ├── LIBRARY-FORMAT.md             # Library format spec (v4.0)
│   ├── TEMPLATES.md                  # Template system guide
│   ├── THEMING.md                    # Theming and customization
│   ├── QUICKSTART.md                 # Quick start guide
│   ├── DEPLOYMENT.md                 # Production deployment
│   ├── WORDPRESS-INTEGRATION-PLAN.md
│   └── OPEN-SOURCE-READY.md
├── index.html                         # Demo page
├── embed-example.html                 # Integration examples
└── README.md                          # This file
```

---

## Requirements

### Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Modern mobile browsers
- **WebGL support required**

### Dependencies

- **Three.js** r128 or later
- **Phosphor Icons** (Layer 3 only, loaded via CDN or local)

### Image Requirements

- **Format**: Equirectangular (2:1 aspect ratio)
- **File Types**: JPG, PNG
- **Recommended Size**: 4096x2048 to 8192x4096

---

## Comparison

| Feature | Phong 360 | Photo Sphere Viewer | Pannellum | Marzipano |
|---------|-----------|---------------------|-----------|-----------|
| **Core Size** | **30KB** | 180KB | 75KB | 95KB |
| **Modular** | 3 Layers | No | No | No |
| **Template Engine** | 9 renderers | No | No | No |
| **Theme System** | Light/Dark/Auto | No | No | No |
| **Badge System** | Built-in | No | No | No |
| **Build Required** | No | Yes | No | Partial |
| **Framework Agnostic** | Yes | Partial | Yes | Partial |
| **Adaptive Loading** | Yes | No | No | Partial |
| **localStorage Prefs** | Yes | Partial | No | No |
| **License** | MIT | MIT | MIT | Apache 2.0 |

---

## Roadmap

### v4.0 (Current)

- [x] Section-based library UI with template engine
- [x] 9 built-in template renderers
- [x] Badge system with emoji/icon support
- [x] Context-aware headers (profile, discover, local)
- [x] Light/dark/auto theming with CSS custom properties
- [x] Accent color customization
- [x] Deep-linking via URL parameters
- [x] Phosphor icon integration
- [x] Lazy loading via IntersectionObserver
- [x] Link auto-detection (URL to platform icon)
- [x] v4.0 library format with sections, slugs, badges

### v4.1 (Coming Soon)

- [ ] NPM package
- [ ] CDN distribution (jsDelivr)
- [ ] TypeScript definitions
- [ ] Minified builds
- [ ] Source maps

### v4.2 (Future)

- [ ] VR mode support
- [ ] Hotspot/annotation system
- [ ] Video 360 support
- [ ] Multi-resolution streaming
- [ ] React/Vue wrapper components

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [OPEN-SOURCE-READY.md](docs/OPEN-SOURCE-READY.md) for growth strategy and roadmap.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Support

- **Documentation**: See [docs/](docs/) folder
- **Issues**: [GitHub Issues](https://github.com/ansonphong/360-VIEWER/issues)
- **Website**: [https://360.phong.com](https://360.phong.com)

---

**Version**: 4.0.0
**Last Updated**: February 2026
**Author**: Phong
**License**: MIT
