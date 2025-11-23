# 🚀 Quick Start Guide

Get started with Phong 360 Viewer in 5 minutes! Choose your path based on your needs.

---

## Table of Contents

1. [Single Image Viewer (Easiest)](#1-single-image-viewer-easiest)
2. [Multiple Images with Resolution Switching](#2-multiple-images-with-resolution-switching)
3. [Full Library with UI](#3-full-library-with-ui)
4. [WordPress Integration](#4-wordpress-integration)
5. [React Integration](#5-react-integration)
6. [Troubleshooting](#troubleshooting)

---

## 1. Single Image Viewer (Easiest)

**Use Case**: Embed a single 360° image on any webpage  
**Size**: 30KB + Three.js  
**Time**: 2 minutes

### Step 1: Download Files

Download these files from the repo:
- `core/phong-360-viewer-core.js`
- `styles/phong-360-core.css`

### Step 2: Create HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My 360 Viewer</title>
    
    <!-- Styles -->
    <link rel="stylesheet" href="phong-360-core.css">
    
    <style>
        body { margin: 0; overflow: hidden; }
        #viewer { width: 100vw; height: 100vh; }
    </style>
</head>
<body>
    <!-- Viewer Container -->
    <div id="viewer"></div>

    <!-- Dependencies -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    
    <!-- 360 Viewer Core -->
    <script src="phong-360-viewer-core.js"></script>

    <!-- Initialize -->
    <script>
        const viewer = new Phong360ViewerCore({
            containerId: 'viewer',
            imageUrl: 'my-360-image.jpg',  // Path to your image
            config: {
                viewRotation: {
                    autoRotate: true,
                    autoRotationRate: 1
                }
            }
        });
    </script>
</body>
</html>
```

### Step 3: Test

Open the HTML file in a modern browser. You should see your 360° image with:
- ✅ Click & drag to look around
- ✅ Scroll wheel to zoom
- ✅ Auto-rotation

**Done!** That's the simplest implementation.

---

## 2. Multiple Images with Resolution Switching

**Use Case**: Gallery with multiple 360° images and quality options  
**Size**: 45KB + Three.js  
**Time**: 5 minutes

### Step 1: Download Additional Files

In addition to Step 1 files, download:
- `extensions/phong-360-multi-image.js`

### Step 2: Prepare Your Images

Create multiple resolutions for each image:

```
images/
├── sunset-8k.jpg (8192×4096)
├── sunset-4k.jpg (4096×2048)
├── sunset-2k.jpg (2048×1024)
├── mountain-8k.jpg
├── mountain-4k.jpg
└── mountain-2k.jpg
```

### Step 3: Create HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>360 Gallery</title>
    <link rel="stylesheet" href="phong-360-core.css">
    <style>
        body { margin: 0; font-family: Arial, sans-serif; }
        #viewer { width: 100vw; height: 100vh; }
        #controls {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.7);
            padding: 15px;
            border-radius: 8px;
            display: flex;
            gap: 10px;
            z-index: 100;
        }
        button, select {
            padding: 10px 20px;
            background: #333;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        button:hover, select:hover {
            background: #444;
        }
    </style>
</head>
<body>
    <!-- Viewer Container -->
    <div id="viewer"></div>

    <!-- Custom Controls -->
    <div id="controls">
        <button id="prevBtn">← Previous</button>
        <button id="nextBtn">Next →</button>
        <select id="resolutionSelector">
            <option value="8k">8K Ultra HD</option>
            <option value="4k" selected>4K High Quality</option>
            <option value="2k">2K Standard</option>
        </select>
        <button id="projectionBtn">🌐 Stereographic</button>
    </div>

    <!-- Scripts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="phong-360-viewer-core.js"></script>
    <script src="phong-360-multi-image.js"></script>

    <script>
        // Initialize core viewer
        const core = new Phong360ViewerCore({
            containerId: 'viewer',
            config: {
                viewRotation: { autoRotate: true }
            }
        });

        // Define images with resolutions
        const images = [
            {
                id: 'sunset',
                name: 'Sunset Beach',
                resolutions: [
                    { id: '8k', label: '8K', path: 'images/sunset-8k.jpg', width: 8192, height: 4096 },
                    { id: '4k', label: '4K', path: 'images/sunset-4k.jpg', width: 4096, height: 2048, default: true },
                    { id: '2k', label: '2K', path: 'images/sunset-2k.jpg', width: 2048, height: 1024 }
                ]
            },
            {
                id: 'mountain',
                name: 'Mountain View',
                resolutions: [
                    { id: '8k', label: '8K', path: 'images/mountain-8k.jpg', width: 8192, height: 4096 },
                    { id: '4k', label: '4K', path: 'images/mountain-4k.jpg', width: 4096, height: 2048, default: true },
                    { id: '2k', label: '2K', path: 'images/mountain-2k.jpg', width: 2048, height: 1024 }
                ]
            }
        ];

        // Initialize multi-image manager
        const multi = new Phong360MultiImage({
            core: core,
            images: images,
            adaptiveLoading: true  // Automatically picks best resolution
        });

        // Load first image
        let currentIndex = 0;
        multi.loadImageById(images[currentIndex].id);

        // Setup controls
        document.getElementById('prevBtn').addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            multi.loadImageById(images[currentIndex].id);
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % images.length;
            multi.loadImageById(images[currentIndex].id);
        });

        document.getElementById('resolutionSelector').addEventListener('change', (e) => {
            multi.switchResolution(e.target.value);
        });

        let projection = 1; // Start with Stereographic
        document.getElementById('projectionBtn').addEventListener('click', () => {
            projection = projection === 0 ? 1 : 0;
            core.switchProjection(projection);
            document.getElementById('projectionBtn').textContent = 
                projection === 0 ? '📐 Gnomonic' : '🌐 Stereographic';
        });
    </script>
</body>
</html>
```

**Done!** You now have a multi-image gallery with resolution switching.

---

## 3. Full Library with UI

**Use Case**: Professional standalone viewer with built-in library panel  
**Size**: 65KB + Three.js  
**Time**: 10 minutes

### Step 1: Download All Files

Download:
- `core/phong-360-viewer-core.js`
- `extensions/phong-360-multi-image.js`
- `extensions/phong-360-library-ui.js`
- `styles/phong-360-core.css`
- `styles/phong-360-ui.css`

### Step 2: Build Image Library

```bash
# Install Python dependencies
pip install Pillow tqdm

# Place your 360° images in folders
mkdir -p library/Nature
mkdir -p library/Architecture
cp your-images/*.jpg library/Nature/
cp more-images/*.jpg library/Architecture/

# Run build script
cd library
python build_library.py

# This generates:
# - library.json (image database)
# - _BUILD/thumbnails/ (preview images)
# - _BUILD/8K/, 4K/, 2K/ (optimized resolutions)
```

### Step 3: Use the Viewer

Simply copy `index.html` from the repo and customize:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>360 Library Viewer</title>
    <link rel="stylesheet" href="phong-360-core.css">
    <link rel="stylesheet" href="phong-360-ui.css">
</head>
<body>
    <div id="container"></div>
    <div id="info-panel">
        <h1 id="imageTitle">Loading...</h1>
        <h2 id="imageFormat">360° Viewer</h2>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="phong-360-viewer-core.js"></script>
    <script src="phong-360-multi-image.js"></script>
    <script src="phong-360-library-ui.js"></script>

    <script>
        const libraryUI = new Phong360LibraryUI({
            containerId: 'container',
            libraryUrl: 'library/library.json',
            showLibraryPanel: true,
            showInfoPanel: true,
            callbacks: {
                onImageInfoUpdate: (info) => {
                    document.getElementById('imageTitle').textContent = info.name;
                    document.getElementById('imageFormat').textContent = 
                        `${info.resolution} (${info.dimensions}) / ${info.format}`;
                }
            }
        });
    </script>
</body>
</html>
```

**Done!** You have a full-featured library viewer with:
- ✅ Categorized image library
- ✅ Thumbnail navigation
- ✅ Resolution selector
- ✅ Projection toggle
- ✅ Info display

---

## 4. WordPress Integration

**Use Case**: Add 360° viewer to WordPress posts  
**Time**: 15 minutes

### Step 1: Add to Theme

```bash
cd wp-content/themes/your-theme/assets/
git submodule add https://github.com/ansonphong/360-VIEWER.git 360-viewer
```

### Step 2: Enqueue Scripts

In `functions.php`:

```php
function mytheme_enqueue_360_viewer() {
    if (is_singular('post') && has_360_gallery()) {
        // Three.js
        wp_enqueue_script(
            'threejs',
            'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
            [],
            'r128',
            true
        );
        
        // 360 Viewer Core
        wp_enqueue_script(
            '360-viewer-core',
            get_template_directory_uri() . '/assets/360-viewer/core/phong-360-viewer-core.js',
            ['threejs'],
            '3.0.0',
            true
        );
        
        // Multi-Image Manager
        wp_enqueue_script(
            '360-viewer-multi',
            get_template_directory_uri() . '/assets/360-viewer/extensions/phong-360-multi-image.js',
            ['360-viewer-core'],
            '3.0.0',
            true
        );
        
        // Styles
        wp_enqueue_style(
            '360-viewer-core',
            get_template_directory_uri() . '/assets/360-viewer/styles/phong-360-core.css',
            [],
            '3.0.0'
        );
    }
}
add_action('wp_enqueue_scripts', 'mytheme_enqueue_360_viewer');
```

### Step 3: Create Template

Create `template-parts/gallery-360.php`:

```php
<?php
$attachment_ids = [/* Get from post meta or gallery shortcode */];
$images = [];

foreach ($attachment_ids as $id) {
    $images[] = [
        'id' => (string)$id,
        'name' => get_the_title($id),
        'resolutions' => [
            [
                'id' => '4k',
                'label' => '4K',
                'path' => wp_get_attachment_url($id),
                'width' => 4096,
                'height' => 2048,
                'default' => true
            ],
            [
                'id' => '2k',
                'label' => '2K',
                'path' => wp_get_attachment_image_url($id, 'large'),
                'width' => 2048,
                'height' => 1024
            ]
        ]
    ];
}
?>

<div id="viewer-360" style="width: 100%; height: 70vh;"></div>

<script>
(function() {
    const core = new Phong360ViewerCore({
        containerId: 'viewer-360',
        config: {
            viewRotation: { autoRotate: true }
        }
    });

    const multi = new Phong360MultiImage({
        core: core,
        images: <?php echo wp_json_encode($images); ?>,
        adaptiveLoading: true
    });

    // Load first image
    <?php if (!empty($images)): ?>
    multi.loadImageById('<?php echo $images[0]['id']; ?>');
    <?php endif; ?>
})();
</script>
```

**See [WORDPRESS-INTEGRATION-PLAN.md](WORDPRESS-INTEGRATION-PLAN.md) for complete guide.**

---

## 5. React Integration

**Time**: 10 minutes

### Step 1: Install Files

Place viewer files in `public/360-viewer/` or `src/lib/360-viewer/`

### Step 2: Create Component

```jsx
import { useEffect, useRef, useState } from 'react';

function Viewer360({ imageUrl, config = {} }) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const [containerId] = useState(`viewer-${Date.now()}`);

    useEffect(() => {
        // Load Three.js if not already loaded
        if (!window.THREE) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            script.onload = initViewer;
            document.head.appendChild(script);
        } else {
            initViewer();
        }

        function initViewer() {
            if (containerRef.current && window.Phong360ViewerCore) {
                viewerRef.current = new window.Phong360ViewerCore({
                    containerId: containerId,
                    imageUrl: imageUrl,
                    config: config
                });
            }
        }

        return () => {
            if (viewerRef.current && viewerRef.current.destroy) {
                viewerRef.current.destroy();
            }
        };
    }, [imageUrl, config, containerId]);

    return (
        <div 
            id={containerId}
            ref={containerRef} 
            style={{ width: '100%', height: '600px' }} 
        />
    );
}

export default Viewer360;

// Usage:
// <Viewer360 
//     imageUrl="/images/360/sunset.jpg" 
//     config={{ viewRotation: { autoRotate: true } }}
// />
```

---

## Troubleshooting

### Image not loading?

**Check:**
1. Image path is correct (relative to HTML file)
2. Image is equirectangular (2:1 aspect ratio)
3. Image file exists and is accessible
4. Browser console for errors (F12)

**Test with a known good image:**
```javascript
imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Equirectangular_projection_SW.jpg'
```

### Black screen?

**Check:**
1. Three.js is loaded before viewer script
2. Container has height (check with browser inspector)
3. WebGL is supported in your browser
4. No JavaScript errors in console

### Controls not working?

**Check:**
1. Canvas is receiving events (not covered by other elements)
2. No CSS `pointer-events: none` on container
3. Container has proper dimensions

### Performance issues?

**Optimize:**
1. Use smaller images (start with 4K: 4096×2048)
2. Enable adaptive loading
3. Use 2K resolution on mobile:
   ```javascript
   config: {
       defaultResolution: window.innerWidth < 768 ? '2k' : '4k'
   }
   ```

### Still stuck?

- Check [API.md](API.md) for detailed options
- See [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md) for format issues
- Open an issue on GitHub

---

## Next Steps

- 📖 Read [API.md](API.md) for all configuration options
- 🏗️ Read [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md) to build libraries
- 🎨 Customize the UI with your own CSS
- 🔧 Add callbacks for custom interactions

---

**🎉 Happy 360° viewing!**

