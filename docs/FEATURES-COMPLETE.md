# Phong 360 Viewer - Complete Feature Guide

## Hybrid UI Architecture (Best Practice Implementation)

The viewer now implements a **hybrid approach** combining:
- ✅ **Auto-discovery**: Automatically enhances UI elements if they exist
- ✅ **Callbacks**: Always fire, enabling custom UI implementations  
- ✅ **Graceful degradation**: Works perfectly without any UI elements
- ✅ **Maximum flexibility**: Use with WordPress, React, Vue, or standalone

---

## Complete Feature List

### ✅ All Original Features Preserved

| Feature | Status | Notes |
|---------|--------|-------|
| **Core Rendering** | ✅ | Gnomonic & Stereographic projections |
| **Mouse Controls** | ✅ | Click & drag to look around |
| **Wheel Zoom** | ✅ | Scroll to zoom |
| **Keyboard Controls** | ✅ | Arrow keys, +/-, double-tap |
| **Continuous Pan/Zoom** | ✅ | Hold keys for continuous movement |
| **Touch Support** | ✅ | Swipe to pan, pinch to zoom |
| **Drag & Drop** | ✅ | Drop 360° images to load |
| **Auto-rotation** | ✅ | Configurable auto-rotate |
| **Loading Animations** | ✅ | Pulsing logo, fade transitions |
| **Tab Visibility** | ✅ | Pause when tab hidden |
| **Fullscreen** | ✅ | Toggle fullscreen mode |
| **Image Library** | ✅ | Browse categorized images |
| **Projection Switch** | ✅ | Toggle between projections |
| **Info Display** | ✅ | Show image title & format |

---

## Usage Examples

### 1. Minimal Embed (Just the Container)

Works with **zero UI elements** - just rendering:

```html
<div id="viewer" style="width: 100%; height: 600px;"></div>

<script src="https://cdn.com/three.js/r128/three.min.js"></script>
<script src="phong-360-viewer.js"></script>
<script>
const viewer = new Phong360Viewer({
    containerId: 'viewer',
    libraryUrl: 'library.json'
});
</script>
```

**Result**: Pure 360 viewer with mouse/keyboard controls, no UI chrome.

---

### 2. Full UI (Auto-Discovery)

Include UI elements in HTML, viewer **automatically enhances** them:

```html
<!-- Loading overlay -->
<div id="loading-overlay"></div>
<img id="phong-logo-center" src="logo.png" />

<!-- Info panel -->
<div id="info-panel">
    <h1 id="imageTitle">Loading...</h1>
    <h2 id="imageFormat">360° Viewer</h2>
</div>

<!-- Toolbar -->
<div id="toolbar-panel">
    <button id="switchProjectionButton">🌐 Stereographic</button>
</div>

<!-- Viewer container -->
<div id="container"></div>

<script>
const viewer = new Phong360Viewer({
    containerId: 'container',
    libraryUrl: 'library.json'
    // UI auto-discovery enabled by default!
});
</script>
```

**Result**: Full standalone viewer with all UI features working automatically.

---

### 3. Custom UI with Callbacks (WordPress/React)

Use callbacks to update your own UI:

```javascript
const viewer = new Phong360Viewer({
    containerId: 'viewer-360',
    libraryData: wpLibrary,
    
    callbacks: {
        onReady: (viewer) => {
            console.log('Viewer ready!');
            // WordPress: Update post meta
            // React: Set state ready
        },
        
        onLoadStart: () => {
            // Show your custom loading UI
            $('#my-loading-spinner').show();
        },
        
        onLoadComplete: () => {
            // Hide your custom loading UI
            $('#my-loading-spinner').hide();
        },
        
        onImageLoad: (title) => {
            // Update your custom title display
            $('.my-image-title').text(title);
            
            // WordPress: Track in analytics
            // React: Update state
        },
        
        onImageInfoUpdate: (info) => {
            // Custom info display
            console.log('Title:', info.title);
            console.log('Format:', info.format);
            console.log('Extension:', info.extension);
        },
        
        onProjectionChange: (type) => {
            // Update your custom projection indicator
            const name = type === 0 ? 'Gnomonic' : 'Stereographic';
            $('.projection-name').text(name);
        },
        
        onFullscreenChange: (isFullscreen) => {
            // Update your custom fullscreen button
            if (isFullscreen) {
                $('.fullscreen-btn').text('Exit Fullscreen');
            } else {
                $('.fullscreen-btn').text('Enter Fullscreen');
            }
        },
        
        onImageError: (error) => {
            // Show your custom error UI
            alert('Error loading image: ' + error.message);
        }
    }
});
```

---

### 4. React Integration

```jsx
import { useEffect, useRef, useState } from 'react';

function Viewer360({ libraryData }) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const [imageTitle, setImageTitle] = useState('Loading...');
    const [loading, setLoading] = useState(false);
    const [projection, setProjection] = useState('Stereographic');

    useEffect(() => {
        if (containerRef.current && window.Phong360Viewer) {
            viewerRef.current = new window.Phong360Viewer({
                containerId: containerRef.current.id,
                libraryData: libraryData,
                
                // Use callbacks to update React state
                callbacks: {
                    onLoadStart: () => setLoading(true),
                    onLoadComplete: () => setLoading(false),
                    onImageLoad: (title) => setImageTitle(title),
                    onProjectionChange: (type) => {
                        setProjection(type === 0 ? 'Gnomonic' : 'Stereographic');
                    }
                }
            });
        }

        return () => {
            if (viewerRef.current) {
                viewerRef.current.destroy();
            }
        };
    }, [libraryData]);

    return (
        <div>
            {loading && <div className="loading-spinner">Loading...</div>}
            <div className="image-info">
                <h2>{imageTitle}</h2>
                <p>Projection: {projection}</p>
            </div>
            <div 
                id="viewer-360-react" 
                ref={containerRef} 
                style={{ width: '100%', height: '600px' }} 
            />
        </div>
    );
}
```

---

### 5. WordPress Integration

```php
<?php
// Generate library from WordPress media
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

<!-- WordPress container -->
<div id="viewer-360-wp" style="width: 100%; height: 70vh;"></div>

<!-- Optional: WordPress-specific UI -->
<div class="wp-360-controls">
    <button id="wp-projection-toggle">Change Projection</button>
    <span id="wp-image-title">Loading...</span>
</div>

<script>
const viewer = new Phong360Viewer({
    containerId: 'viewer-360-wp',
    libraryData: <?= json_encode($library) ?>,
    
    callbacks: {
        onImageLoad: (title) => {
            // Update WordPress UI
            document.getElementById('wp-image-title').textContent = title;
            
            // Track in WordPress analytics
            wp.ajax.post('track_360_view', { image: title });
        },
        
        onProjectionChange: (type) => {
            // Update WordPress button
            const btn = document.getElementById('wp-projection-toggle');
            btn.textContent = type === 0 ? 'Switch to Stereo' : 'Switch to Gnomonic';
        }
    }
});

// Wire up WordPress button
document.getElementById('wp-projection-toggle').addEventListener('click', () => {
    const newType = viewer.projectionType === 0 ? 1 : 0;
    viewer.switchProjection(newType);
});
</script>
```

---

## Available Callbacks (All Optional)

```javascript
callbacks: {
    // Fired when viewer is fully initialized and ready
    onReady: (viewer) => { },
    
    // Fired when an image starts loading
    onLoadStart: () => { },
    
    // Fired when image loading completes
    onLoadComplete: () => { },
    
    // Fired when an image is successfully loaded
    onImageLoad: (title) => { },
    
    // Fired when image loading fails
    onImageError: (error) => { },
    
    // Fired when image info is updated
    onImageInfoUpdate: ({title, format, extension}) => { },
    
    // Fired when projection changes (0=gnomonic, 1=stereographic)
    onProjectionChange: (type) => { },
    
    // Fired when fullscreen state changes
    onFullscreenChange: (isFullscreen) => { },
    
    // Fired when UI panels are shown/hidden
    onPanelsToggle: (show) => { }
}
```

---

## Auto-Discovered UI Elements (Optional)

If these elements exist in DOM, they'll be automatically enhanced:

| Element ID | Purpose |
|------------|---------|
| `loading-overlay` | Loading backdrop |
| `phong-logo-center` | Animated loading logo |
| `imageTitle` | Display image title |
| `imageFormat` | Display image format |
| `toolbar-panel` | Toolbar container |
| `info-panel` | Info panel container |
| `hamburger-menu` | Menu button |
| `library-panel` | Library browser |
| `switchProjectionButton` | Projection toggle button |

**If they don't exist**: Viewer works perfectly, callbacks still fire.

---

## Programmatic Control

```javascript
// Load image by ID
viewer.loadImageById('image-id-123');

// Load first image
viewer.loadFirstImage();

// Switch projection
viewer.switchProjection(0); // 0=gnomonic, 1=stereographic

// Load texture directly
const texture = new THREE.TextureLoader().load('image.jpg');
viewer.loadTexture(texture, 'My Image');

// Toggle fullscreen
viewer.toggleFullscreen();

// Show/hide UI panels
viewer.showPanels(false); // Hide
viewer.showPanels(true);  // Show

// Update image info manually
viewer.updateImageInfo('My Image', 'PNG / Equirectangular');

// Clean up
viewer.destroy();
```

---

## Best Practices

### 1. WordPress Theme Integration
```php
// Use callbacks to integrate with WordPress
callbacks: {
    onImageLoad: (title) => {
        // Update WordPress meta
        jQuery.post(ajaxurl, {
            action: 'update_360_view',
            title: title
        });
    }
}
```

### 2. React/Vue State Management
```javascript
// Update component state via callbacks
callbacks: {
    onImageLoad: (title) => setTitle(title),
    onLoadStart: () => setLoading(true),
    onLoadComplete: () => setLoading(false)
}
```

### 3. Analytics Tracking
```javascript
callbacks: {
    onImageLoad: (title) => {
        gtag('event', '360_view', {
            'image_title': title
        });
    }
}
```

### 4. Custom Loading UI
```javascript
callbacks: {
    onLoadStart: () => {
        myCustomLoadingSpinner.show();
    },
    onLoadComplete: () => {
        myCustomLoadingSpinner.hide();
    }
}
```

---

## Migration from v1.x

Old standalone script:
```javascript
// OLD: Required full UI in HTML
init(); // Global function, needed specific HTML structure
```

New modular approach:
```javascript
// NEW: Works anywhere, UI optional
const viewer = new Phong360Viewer({
    containerId: 'viewer',
    libraryUrl: 'library.json'
});
```

**Result**: Same functionality, works everywhere!

---

## Summary

✅ **Zero UI**: Works with just a `<div>`  
✅ **Full UI**: Auto-discovers and enhances elements  
✅ **Custom UI**: Use callbacks for your own implementation  
✅ **Hybrid**: Mix auto-discovery with custom callbacks  
✅ **Portable**: Works in WordPress, React, Vue, vanilla JS  
✅ **Backwards Compatible**: Original `client.js` still works  

The viewer now follows modern component design patterns while preserving all original functionality! 🎉

