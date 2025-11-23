# 🌐 Phong 360 Viewer

A powerful, portable, and embeddable 360° image viewer built with Three.js. Features gnomonic and stereographic projections, smooth interactions, and flexible library management.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **🎯 Portable & Embeddable** - Use anywhere: WordPress, static sites, React, Vue, etc.
- **🔄 Dual Projections** - Switch between gnomonic and stereographic views
- **📚 Flexible Library System** - Load from JSON, inline data, or single images
- **🖱️ Smooth Interactions** - Mouse, touch, keyboard, and wheel support
- **📂 Drag & Drop** - Load local 360° images instantly
- **🎨 Customizable** - Configure behavior, UI elements, and callbacks
- **⚡ Performance** - Hardware-accelerated WebGL rendering
- **📱 Mobile Friendly** - Touch gestures and responsive design
- **🔧 Extensible** - Easy to extend and integrate

## 🚀 Quick Start

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
    <title>360 Viewer</title>
</head>
<body>
    <!-- Container -->
    <div id="viewer-360" style="width: 100%; height: 600px;"></div>

    <!-- Dependencies -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="phong-360-viewer.js"></script>

    <!-- Initialize -->
    <script>
        const viewer = new Phong360Viewer({
            containerId: 'viewer-360',
            libraryUrl: 'library/library.json'
        });
    </script>
</body>
</html>
```

## 📦 Installation

### Option 1: Direct Download

1. Download `phong-360-viewer.js`
2. Include Three.js and the viewer script in your HTML
3. Initialize with your configuration

### Option 2: Git Submodule (Recommended for WordPress)

```bash
cd your-project/assets/
git submodule add https://github.com/yourusername/360-viewer.git
```

### Option 3: NPM Package (Coming Soon)

```bash
npm install phong-360-viewer
```

## 📖 Documentation

### Initialization Options

```javascript
const viewer = new Phong360Viewer({
    // Required: Container element ID
    containerId: 'viewer-360',
    
    // Library Source (choose one)
    libraryUrl: 'library/library.json',      // Load from URL
    libraryData: { /* library object */ },    // Provide inline data
    
    // Optional: Base URL for resolving image paths
    baseUrl: 'https://cdn.example.com/360/',
    
    // Optional: Viewer configuration
    config: {
        viewRotation: {
            initAltitude: 0,        // Starting vertical angle (-90 to 90)
            initAzimuth: 90,        // Starting horizontal angle
            autoRotate: true,       // Enable auto-rotation
            autoRotationRate: 1,    // Rotation speed (degrees/second)
            smoothness: 8000        // Movement smoothness (higher = smoother)
        },
        zoom: {
            smoothing: 6000         // Zoom smoothness
        },
        fov_stereographic: {
            max: 330,               // Maximum field of view
            min: 45,                // Minimum field of view
            init: 100,              // Initial FOV
            initTarget: 60          // Target FOV after init
        },
        fov_gnomonic: {
            max: 130,
            min: 45,
            init: 100,
            initTarget: 60
        }
    },
    
    // Optional: UI element visibility
    ui: {
        showLibraryPanel: true,
        showInfoPanel: true,
        showToolbarPanel: true,
        showHamburgerMenu: true,
        showDragDrop: true,
        showFullscreenToggle: true
    },
    
    // Optional: Callbacks
    callbacks: {
        onReady: (viewer) => console.log('Ready!'),
        onImageLoad: (title) => console.log('Loaded:', title),
        onImageError: (error) => console.error('Error:', error)
    }
});
```

### API Methods

```javascript
// Load image by ID from library
viewer.loadImageById('image-id-123');

// Load first image from library
viewer.loadFirstImage();

// Switch projection (0 = gnomonic, 1 = stereographic)
viewer.switchProjection(0);

// Load texture directly
const texture = new THREE.TextureLoader().load('image.jpg');
viewer.loadTexture(texture, 'My Image');

// Clean up and destroy viewer
viewer.destroy();
```

### Library Format

See [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md) for complete specification.

#### Quick Example

```json
{
  "_metadata": {
    "version": "2.0.0",
    "total_images": 2
  },
  "_categories": {
    "Nature": {
      "name": "Nature Scenes",
      "images": [
        {
          "id": "abc123",
          "name": "Mountain Sunset",
          "path": "nature/mountain.jpg",
          "thumbnail": "_BUILD/thumbnails/nature-mountain.jpg",
          "Q100": "_BUILD/Q100/nature-mountain.jpg",
          "Q75": "_BUILD/Q75/nature-mountain.jpg",
          "Q50": "_BUILD/Q50/nature-mountain.jpg"
        }
      ],
      "subcategories": {}
    }
  }
}
```

## 🔨 Building a Library

Use the included Python script to automatically generate optimized libraries:

```bash
# Install dependencies
pip install Pillow tqdm

# Build library from images
cd library
python build_library.py

# Advanced options
python build_library.py \
  --root ./my-images \
  --output library.json \
  --format both \
  --no-metadata
```

### What it does:
- ✅ Scans folders for equirectangular images
- ✅ Generates thumbnails (512x256)
- ✅ Creates 3 quality levels (100%, 75%, 50%)
- ✅ Builds hierarchical category structure
- ✅ Generates unique IDs
- ✅ Extracts image metadata

## 🎨 Embedding Examples

### WordPress Integration

```php
<?php
// In your WordPress theme
$library = [
    '_metadata' => ['version' => '2.0.0'],
    '_categories' => [
        'WordPress' => [
            'name' => 'WordPress Media',
            'images' => []
        ]
    ]
];

foreach ($attachment_ids as $id) {
    $library['_categories']['WordPress']['images'][] = [
        'id' => (string)$id,
        'name' => get_the_title($id),
        'path' => wp_get_attachment_url($id),
        'thumbnail' => wp_get_attachment_image_url($id, 'thumbnail'),
        'Q100' => wp_get_attachment_url($id),
        'Q75' => wp_get_attachment_image_url($id, 'large'),
        'Q50' => wp_get_attachment_image_url($id, 'medium')
    ];
}
?>

<div id="viewer-360" style="width: 100%; height: 70vh;"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="<?= get_template_directory_uri() ?>/assets/360-viewer/phong-360-viewer.js"></script>
<script>
new Phong360Viewer({
    containerId: 'viewer-360',
    libraryData: <?= json_encode($library) ?>
});
</script>
```

### React Component

```jsx
import { useEffect, useRef } from 'react';

function Viewer360({ libraryData }) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current && window.Phong360Viewer) {
            viewerRef.current = new window.Phong360Viewer({
                containerId: containerRef.current.id,
                libraryData: libraryData
            });
        }

        return () => {
            if (viewerRef.current) {
                viewerRef.current.destroy();
            }
        };
    }, [libraryData]);

    return <div id="viewer-360-react" ref={containerRef} style={{ width: '100%', height: '600px' }} />;
}
```

### Single Image Viewer

```html
<script>
const viewer = new Phong360Viewer({
    containerId: 'viewer-360',
    ui: {
        showLibraryPanel: false,
        showInfoPanel: false,
        showDragDrop: true
    }
});

// Load single image
const loader = new THREE.TextureLoader();
loader.load('my-360-image.jpg', (texture) => {
    viewer.loadTexture(texture, 'My 360° Image');
});
</script>
```

## 🎮 Controls

### Mouse
- **Click & Drag** - Look around
- **Scroll Wheel** - Zoom in/out

### Keyboard
- **Arrow Keys** - Pan view
- **+ / =** - Zoom in
- **- / _** - Zoom out

### Touch
- **Swipe** - Look around
- **Pinch** - Zoom (coming soon)

## 📋 Requirements

### Image Requirements
- **Format**: Equirectangular (spherical) projection
- **Aspect Ratio**: 2:1 (e.g., 4096x2048)
- **File Types**: JPG, PNG
- **Recommended Size**: 4096x2048 to 8192x4096

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- WebGL support required

### Dependencies
- **Three.js** r128 or later

## 🔧 Development

### File Structure

```
360-viewer/
├── phong-360-viewer.js     # Main viewer (modular, embeddable)
├── library.js              # Legacy library UI (optional)
├── client.js               # Legacy client (backup)
├── index.html              # Demo/standalone viewer
├── embed-example.html      # Embedding examples
├── styles.css              # Viewer styles
├── library/
│   ├── library.json        # Image library
│   ├── build_library.py    # Library builder
│   └── [images]            # Source images
├── LIBRARY-FORMAT.md       # Format specification
└── README.md               # This file
```

### Building From Source

```bash
# Clone repository
git clone https://github.com/yourusername/360-viewer.git
cd 360-viewer

# Install dependencies
pip install -r library/requirements.txt

# Build library
cd library
python build_library.py

# Start local server for testing
python -m http.server 8000

# Open in browser
open http://localhost:8000
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

- Three.js team for the excellent 3D library
- Equirectangular projection mathematics
- Community feedback and contributions

## 📞 Support

- **Documentation**: [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md)
- **Examples**: [embed-example.html](embed-example.html)
- **Issues**: GitHub Issues
- **Email**: your.email@example.com

## 🗺️ Roadmap

- [x] Modular, embeddable architecture
- [x] Flexible library format v2.0
- [x] WordPress integration support
- [ ] NPM package
- [ ] TypeScript definitions
- [ ] VR mode support
- [ ] Hotspot/annotation system
- [ ] Video 360 support
- [ ] Multi-resolution streaming

---

**Version**: 2.0.0  
**Last Updated**: November 2025  
**Author**: Phong  
**Website**: https://360.phong.com
