# 🌐 Phong 360 Viewer

**Ultra-lightweight, modular 360° image viewer with progressive enhancement.**

[![Version](https://img.shields.io/badge/version-3.0.0-blue)](https://github.com/ansonphong/360-VIEWER)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Three.js](https://img.shields.io/badge/three.js-r128-orange)](https://threejs.org/)

## 🚀 What Makes This Special

- **🎯 Truly Modular**: Russian Doll architecture - use Layer 1 (30KB), or add Layer 2 (+15KB), or Layer 3 (+20KB)
- **⚡ Ultra-Lightweight**: Core is only 30KB - 6x smaller than competitors
- **🔧 Framework Agnostic**: Works with WordPress, React, Vue, or vanilla JS
- **📦 No Build Required**: Drop it in and go - no webpack, no babel
- **🌐 WordPress Ready**: Comprehensive integration guide included
- **💾 Smart Preferences**: localStorage with namespaced keys
- **🎮 Full Controls**: Mouse, touch, keyboard navigation
- **📱 Mobile Optimized**: Touch gestures and responsive
- **🔄 Two Projections**: Gnomonic and Stereographic
- **🎨 Adaptive Loading**: Smart resolution selection

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[QUICKSTART.md](docs/QUICKSTART.md)** | Get started in 5 minutes |
| **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** | Production deployment guide |
| **[API.md](docs/API.md)** | Complete API reference |
| **[LIBRARY-FORMAT.md](docs/LIBRARY-FORMAT.md)** | Library format specification |
| **[WORDPRESS-INTEGRATION-PLAN.md](docs/WORDPRESS-INTEGRATION-PLAN.md)** | WordPress integration guide |
| **[OPEN-SOURCE-READY.md](docs/OPEN-SOURCE-READY.md)** | Open-source strategy & roadmap |

---

## ⚡ Quick Start

### Layer 1: Single Image Viewer (30KB)

Perfect for embedding a single 360° image anywhere:

```html
<!DOCTYPE html>
<html>
<head>
    <title>360 Viewer</title>
</head>
<body>
    <!-- Container -->
    <div id="viewer" style="width: 100%; height: 600px;"></div>

    <!-- Dependencies -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    
    <!-- Layer 1: Core -->
    <script src="core/phong-360-viewer-core.js"></script>
    <link rel="stylesheet" href="styles/phong-360-core.css">

    <!-- Initialize -->
    <script>
        const viewer = new Phong360ViewerCore({
            containerId: 'viewer',
            imageUrl: 'my-360-image.jpg',
            config: {
                viewRotation: { autoRotate: true }
            }
        });
    </script>
</body>
</html>
```

**That's it!** You now have:
- ✅ Mouse drag to pan
- ✅ Mouse wheel to zoom
- ✅ Touch gestures
- ✅ Keyboard controls
- ✅ Auto-rotation
- ✅ Projection switching

### Layer 2: Multiple Images + Adaptive Resolution (+15KB)

Add multi-image support and smart resolution management:

```html
<!-- Layer 1 + -->
<script src="extensions/phong-360-multi-image.js"></script>

<script>
    // Initialize core
    const core = new Phong360ViewerCore({
        containerId: 'viewer'
    });

    // Add multi-image manager
    const multi = new Phong360MultiImage({
        core: core,
        images: [
            {
                id: 'sunset',
                name: 'Sunset Beach',
                resolutions: [
                    { id: '4k', label: '4K', path: 'sunset-4k.jpg', width: 4096, height: 2048, default: true },
                    { id: '2k', label: '2K', path: 'sunset-2k.jpg', width: 2048, height: 1024 }
                ]
            },
            {
                id: 'mountain',
                name: 'Mountain View',
                resolutions: [
                    { id: '4k', label: '4K', path: 'mountain-4k.jpg', width: 4096, height: 2048, default: true }
                ]
            }
        ],
        adaptiveLoading: true  // Automatically selects best resolution
    });

    // Load first image
    multi.loadImageById('sunset');

    // Switch images
    setTimeout(() => multi.loadImageById('mountain'), 5000);
</script>
```

**Now you have**:
- ✅ Multiple images
- ✅ Adaptive resolution (based on device/bandwidth)
- ✅ Manual resolution switching
- ✅ localStorage preferences
- ✅ Loading callbacks

### Layer 3: Full Library UI (+20KB)

Add browsable library with thumbnails and controls:

```html
<!-- Layers 1+2 + -->
<script src="extensions/phong-360-library-ui.js"></script>
<link rel="stylesheet" href="styles/phong-360-ui.css">

<script>
    const libraryUI = new Phong360LibraryUI({
        containerId: 'viewer',
        libraryUrl: 'library/library.json',
        showLibraryPanel: true,
        showInfoPanel: true
    });
</script>
```

**Full-featured viewer**:
- ✅ Categorized image library
- ✅ Thumbnail previews
- ✅ Resolution selector dropdown
- ✅ Projection toggle button
- ✅ Info panel
- ✅ Search/filter (coming soon)

---

## 📦 Installation

### Method 1: Download & Include

```bash
# Download from GitHub
git clone https://github.com/ansonphong/360-VIEWER.git

# Use the files you need
# Layer 1: core/phong-360-viewer-core.js
# Layer 2: extensions/phong-360-multi-image.js
# Layer 3: extensions/phong-360-library-ui.js
```

### Method 2: Git Submodule (For Themes/Plugins)

```bash
cd your-wordpress-theme/assets/
git submodule add https://github.com/ansonphong/360-VIEWER.git 360-viewer
```

### Method 3: NPM (Coming Soon)

```bash
npm install phong-360-viewer
```

### Method 4: CDN (Coming Soon)

```html
<script src="https://cdn.jsdelivr.net/npm/phong-360-viewer@3.0.0/dist/core/phong-360-viewer-core.min.js"></script>
```

---

## 🎨 Use Cases

### WordPress Theme Integration

Perfect for adding 360° galleries to WordPress posts. See [WORDPRESS-INTEGRATION-PLAN.md](docs/WORDPRESS-INTEGRATION-PLAN.md) for complete guide.

```php
<?php
// In your template
$images = postworld_prepare_360_images($attachment_ids);
?>

<div id="viewer-360" style="width: 100%; height: 70vh;"></div>

<script src="<?= get_template_directory_uri() ?>/assets/360-viewer/core/phong-360-viewer-core.js"></script>
<script src="<?= get_template_directory_uri() ?>/assets/360-viewer/extensions/phong-360-multi-image.js"></script>

<script>
const core = new Phong360ViewerCore({ containerId: 'viewer-360' });
const multi = new Phong360MultiImage({ 
    core: core,
    images: <?= json_encode($images) ?>
});
multi.loadImageById('<?= $images[0]['id'] ?>');
</script>
```

### React Component

```jsx
import { useEffect, useRef } from 'react';

function Viewer360({ imageUrl }) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current && window.Phong360ViewerCore) {
            viewerRef.current = new window.Phong360ViewerCore({
                containerId: containerRef.current.id,
                imageUrl: imageUrl
            });
        }

        return () => {
            if (viewerRef.current) {
                viewerRef.current.destroy();
            }
        };
    }, [imageUrl]);

    return <div id="viewer-360" ref={containerRef} style={{ width: '100%', height: '600px' }} />;
}
```

### Static Site (Hugo, Jekyll, 11ty)

```html
<div id="viewer-360" style="width: 100%; height: 600px;"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="/assets/360-viewer/core/phong-360-viewer-core.js"></script>
<link rel="stylesheet" href="/assets/360-viewer/styles/phong-360-core.css">

<script>
new Phong360ViewerCore({
    containerId: 'viewer-360',
    imageUrl: '/images/360/{{ page.image }}'
});
</script>
```

---

## 🔧 Building Image Libraries

Use the included Python script to generate optimized libraries:

```bash
# Install dependencies
pip install Pillow tqdm

# Build library from images folder
cd library
python build_library.py

# The script will:
# ✅ Scan folders for equirectangular images
# ✅ Generate thumbnails (512x256)
# ✅ Create multiple resolutions (8K, 4K, 2K)
# ✅ Build hierarchical category structure
# ✅ Generate unique IDs
# ✅ Extract image metadata
```

See [LIBRARY-FORMAT.md](docs/LIBRARY-FORMAT.md) for format specification.

---

## 🎮 Controls

| Action | Mouse | Keyboard | Touch |
|--------|-------|----------|-------|
| **Look Around** | Click & Drag | Arrow Keys | Swipe |
| **Zoom In** | Scroll Up | `+` or `=` | Pinch Out |
| **Zoom Out** | Scroll Down | `-` or `_` | Pinch In |
| **Toggle Projection** | Button | `P` | Button |
| **Auto-Rotate** | - | `Space` | - |

---

## 📋 Requirements

### Browser Support
- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Modern mobile browsers
- **WebGL support required**

### Dependencies
- **Three.js** r128 or later

### Image Requirements
- **Format**: Equirectangular (2:1 aspect ratio)
- **File Types**: JPG, PNG
- **Recommended Size**: 4096×2048 to 8192×4096

---

## 🏗️ Architecture

```
📁 360-viewer/
├── 📄 README.md                    # You are here
├── 📁 core/
│   └── phong-360-viewer-core.js    # Layer 1: Core (30KB)
├── 📁 extensions/
│   ├── phong-360-multi-image.js    # Layer 2: Multi-image (+15KB)
│   └── phong-360-library-ui.js     # Layer 3: Library UI (+20KB)
├── 📁 styles/
│   ├── phong-360-core.css          # Core styles
│   └── phong-360-ui.css            # UI styles
├── 📁 library/
│   ├── library.json                # Image library
│   ├── build_library.py            # Library builder
│   └── resolutions.json            # Resolution config
├── 📁 docs/
│   ├── README.md                   # Documentation index
│   ├── QUICKSTART.md               # Quick start guide
│   ├── API.md                      # API reference
│   ├── LIBRARY-FORMAT.md           # Library format spec
│   ├── WORDPRESS-INTEGRATION-PLAN.md
│   └── OPEN-SOURCE-READY.md
└── 📄 index.html                   # Standalone demo
```

---

## 🆚 Comparison

| Feature | Phong 360 | Photo Sphere Viewer | Pannellum | Marzipano |
|---------|-----------|---------------------|-----------|-----------|
| **Core Size** | **30KB** | 180KB | 75KB | 95KB |
| **Modular** | ✅ 3 Layers | ❌ | ❌ | ❌ |
| **Build Required** | ❌ | ✅ | ❌ | ⚠️ |
| **Framework Agnostic** | ✅ | ⚠️ | ✅ | ⚠️ |
| **WordPress Docs** | ✅ | ❌ | ❌ | ❌ |
| **Adaptive Loading** | ✅ | ❌ | ❌ | ⚠️ |
| **localStorage Prefs** | ✅ | ⚠️ | ❌ | ❌ |
| **License** | MIT | MIT | MIT | Apache 2.0 |

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [OPEN-SOURCE-READY.md](docs/OPEN-SOURCE-READY.md) for growth strategy and roadmap.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🗺️ Roadmap

### v3.0 ✅ (Current)
- [x] Modular Russian Doll architecture
- [x] Semantic resolution naming (8K/4K/2K)
- [x] Adaptive loading
- [x] localStorage preferences
- [x] WordPress integration guide

### v3.1 (Coming Soon)
- [ ] NPM package
- [ ] CDN distribution (jsDelivr)
- [ ] TypeScript definitions
- [ ] Minified builds
- [ ] Source maps

### v3.2 (Future)
- [ ] VR mode support
- [ ] Hotspot/annotation system
- [ ] Video 360 support
- [ ] Multi-resolution streaming
- [ ] React/Vue wrapper components

---

## 📞 Support

- **Documentation**: See [docs/](docs/) folder
- **Issues**: [GitHub Issues](https://github.com/ansonphong/360-VIEWER/issues)
- **Website**: [https://360.phong.com](https://360.phong.com)

---

**Version**: 3.0.0  
**Last Updated**: November 2025  
**Author**: Phong  
**License**: MIT
