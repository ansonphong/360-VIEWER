# 📘 API Reference

Complete API documentation for Phong 360 Viewer v3.0.

---

## Table of Contents

1. [Layer 1: Phong360ViewerCore](#layer-1-phong360viewercore)
2. [Layer 2: Phong360MultiImage](#layer-2-phong360multiimage)
3. [Layer 3: Phong360LibraryUI](#layer-3-phong360libraryui)
4. [Configuration Options](#configuration-options)
5. [Callbacks](#callbacks)
6. [Methods](#methods)
7. [Events](#events)

---

## Layer 1: Phong360ViewerCore

**File**: `core/phong-360-viewer-core.js`  
**Size**: ~30KB  
**Purpose**: Single image 360° viewer with controls

### Constructor

```javascript
new Phong360ViewerCore(options)
```

### Options

```javascript
{
    // Required
    containerId: string,           // ID of container element

    // Optional - Image
    imageUrl: string,              // URL of 360° image to load
    width: number,                 // Image width (default: 4096)
    height: number,                // Image height (default: 2048)

    // Optional - Configuration
    config: {
        viewRotation: {
            initAltitude: number,       // Starting vertical angle (default: 0)
            initAzimuth: number,        // Starting horizontal angle (default: 90)
            autoRotate: boolean,        // Enable auto-rotation (default: false)
            autoRotationRate: number,   // Rotation speed in degrees/second (default: 1)
            smoothness: number,         // Movement smoothness (default: 8000)
            latMin: number,             // Min vertical angle (default: -85)
            latMax: number              // Max vertical angle (default: 85)
        },
        zoom: {
            smoothing: number,          // Zoom smoothness (default: 6000)
            speed: number               // Zoom speed multiplier (default: 1.5)
        },
        fov_stereographic: {
            max: number,                // Max FOV (default: 330)
            min: number,                // Min FOV (default: 45)
            init: number,               // Initial FOV (default: 100)
            initTarget: number          // Target FOV after init (default: 60)
        },
        fov_gnomonic: {
            max: number,                // Max FOV (default: 130)
            min: number,                // Min FOV (default: 45)
            init: number,               // Initial FOV (default: 100)
            initTarget: number          // Target FOV after init (default: 60)
        },
        interaction: {
            sensitivity: number,        // Mouse sensitivity (default: 0.1)
            momentum: boolean,          // Enable momentum (default: true)
            momentumDamping: number     // Momentum damping (default: 0.95)
        }
    }
}
```

### Methods

#### loadImage(imageUrl, width, height)
Load a new 360° image.

```javascript
core.loadImage('path/to/image.jpg', 4096, 2048);
```

**Parameters:**
- `imageUrl` (string): URL to image
- `width` (number): Image width
- `height` (number): Image height

**Returns:** `void`

---

#### switchProjection(type)
Switch between projection types.

```javascript
core.switchProjection(0);  // Gnomonic
core.switchProjection(1);  // Stereographic
```

**Parameters:**
- `type` (number): 0 = Gnomonic, 1 = Stereographic

**Returns:** `void`

**Note:** Preference is saved to `localStorage` as `phong360.preferences.projection`

---

#### setAutoRotate(enabled)
Enable or disable auto-rotation.

```javascript
core.setAutoRotate(true);
```

**Parameters:**
- `enabled` (boolean): Enable/disable

**Returns:** `void`

---

#### destroy()
Clean up and remove viewer.

```javascript
core.destroy();
```

**Returns:** `void`

---

### Properties

#### projectionType
Current projection type (0 = Gnomonic, 1 = Stereographic)

```javascript
console.log(core.projectionType);  // 0 or 1
```

#### state
Current viewer state

```javascript
console.log(core.state.lat);  // Current latitude
console.log(core.state.lon);  // Current longitude
console.log(core.state.fov);  // Current field of view
```

---

## Layer 2: Phong360MultiImage

**File**: `extensions/phong-360-multi-image.js`  
**Size**: ~15KB  
**Purpose**: Multi-image and resolution management

### Constructor

```javascript
new Phong360MultiImage(options)
```

### Options

```javascript
{
    // Required
    core: Phong360ViewerCore,      // Core viewer instance

    // Optional - Images
    images: [                       // Array of image objects
        {
            id: string,             // Unique image ID
            name: string,           // Display name
            resolutions: [          // Array of resolution objects
                {
                    id: string,             // Resolution ID (e.g., '4k')
                    label: string,          // Display label (e.g., '4K')
                    path: string,           // Image path
                    width: number,          // Image width
                    height: number,         // Image height
                    fileSize: number,       // File size in bytes (optional)
                    default: boolean,       // Is default resolution? (optional)
                    bandwidth: string       // 'high'|'medium'|'low' (optional)
                }
            ],
            thumbnail: {
                path: string,       // Thumbnail path
                width: number,      // Thumbnail width
                height: number      // Thumbnail height
            }
        }
    ],

    // Optional - Settings
    baseUrl: string,                // Base URL for resolving paths (default: '')
    adaptiveLoading: boolean,       // Enable adaptive resolution (default: true)

    // Optional - Callbacks
    callbacks: {
        onImageLoad: function,      // (imageData, resolution) => {}
        onImageError: function,     // (error) => {}
        onResolutionChange: function, // (resolution) => {}
        onLoadStart: function,      // () => {}
        onLoadComplete: function    // () => {}
    }
}
```

### Methods

#### loadImageById(id)
Load image by ID.

```javascript
multi.loadImageById('sunset-001');
```

**Parameters:**
- `id` (string): Image ID

**Returns:** `void`

---

#### switchResolution(resolutionId)
Switch to different resolution of current image.

```javascript
multi.switchResolution('8k');
```

**Parameters:**
- `resolutionId` (string): Resolution ID (e.g., '8k', '4k', '2k')

**Returns:** `void`

**Note:** Preference is saved to `localStorage` as `phong360.preferences.resolution`

---

#### setImages(images)
Set or update images array.

```javascript
multi.setImages(newImagesArray);
```

**Parameters:**
- `images` (Array): Array of image objects

**Returns:** `void`

---

#### addImage(imageData)
Add single image to collection.

```javascript
multi.addImage({
    id: 'new-image',
    name: 'New Image',
    resolutions: [...]
});
```

**Parameters:**
- `imageData` (Object): Image object

**Returns:** `void`

---

#### findImageById(id)
Find image object by ID.

```javascript
const image = multi.findImageById('sunset-001');
```

**Parameters:**
- `id` (string): Image ID

**Returns:** `Object|null` - Image object or null if not found

---

#### getCurrentImageData()
Get current image data.

```javascript
const current = multi.getCurrentImageData();
console.log(current.name);
console.log(current.resolutions);
```

**Returns:** `Object|null` - Current image object or null

---

#### getAvailableResolutions()
Get available resolutions for current image.

```javascript
const resolutions = multi.getAvailableResolutions();
// Returns: [{ id: '8k', label: '8K', ... }, { id: '4k', ... }]
```

**Returns:** `Array` - Array of resolution objects

---

#### selectOptimalResolution()
Automatically select best resolution based on device and bandwidth.

```javascript
const resolution = multi.selectOptimalResolution();
console.log(resolution.id);  // e.g., '4k'
```

**Returns:** `Object` - Selected resolution object

**Considers:**
- Network connection type (2G/3G/4G)
- Device pixel ratio
- Viewport size
- User preference (if saved)
- Bandwidth metadata

---

### Properties

#### currentImageId
Current image ID

```javascript
console.log(multi.currentImageId);  // 'sunset-001'
```

#### currentImageData
Current image object

```javascript
console.log(multi.currentImageData.name);
```

#### currentResolution
Current resolution object

```javascript
console.log(multi.currentResolution.label);  // '4K'
console.log(multi.currentResolution.width);  // 4096
```

---

## Layer 3: Phong360LibraryUI

**File**: `extensions/phong-360-library-ui.js`  
**Size**: ~20KB  
**Purpose**: Full library UI with panels and controls

### Constructor

```javascript
new Phong360LibraryUI(options)
```

### Options

```javascript
{
    // Required (one of these)
    containerId: string,            // ID of container element
    libraryUrl: string,             // URL to library.json
    // OR
    libraryData: Object,            // Inline library data

    // Optional
    baseUrl: string,                // Base URL for resolving paths
    
    // UI Options
    showLibraryPanel: boolean,      // Show library panel (default: true)
    showInfoPanel: boolean,         // Show info panel (default: true)
    showToolbar: boolean,           // Show toolbar (default: true)
    
    // Core/Multi Options (passed through)
    config: Object,                 // Core config (see Phong360ViewerCore)
    
    // Callbacks
    callbacks: {
        onLibraryLoad: function,    // (library) => {}
        onImageSelect: function,    // (imageId) => {}
        onPanelToggle: function,    // (isOpen) => {}
        onImageInfoUpdate: function // (info) => {}
    }
}
```

### Methods

#### loadLibrary(url)
Load library from URL.

```javascript
libraryUI.loadLibrary('path/to/library.json');
```

**Parameters:**
- `url` (string): URL to library.json

**Returns:** `Promise`

---

#### toggleLibraryPanel()
Toggle library panel visibility.

```javascript
libraryUI.toggleLibraryPanel();
```

**Returns:** `void`

---

#### selectImageById(id)
Select and load image by ID.

```javascript
libraryUI.selectImageById('sunset-001');
```

**Parameters:**
- `id` (string): Image ID

**Returns:** `void`

---

### Properties

#### multiViewer
Access to underlying `Phong360MultiImage` instance

```javascript
libraryUI.multiViewer.switchResolution('8k');
```

#### core
Access to underlying `Phong360ViewerCore` instance

```javascript
libraryUI.core.switchProjection(0);
```

---

## Configuration Options

### View Rotation

```javascript
viewRotation: {
    initAltitude: 0,        // Starting pitch (-90 to 90 degrees)
    initAzimuth: 90,        // Starting yaw (0 to 360 degrees)
    autoRotate: false,      // Enable auto-rotation
    autoRotationRate: 1,    // Degrees per second
    smoothness: 8000,       // Higher = smoother (1000-10000)
    latMin: -85,            // Minimum pitch
    latMax: 85              // Maximum pitch
}
```

### Field of View

```javascript
fov_stereographic: {
    max: 330,               // Maximum FOV (zoom out limit)
    min: 45,                // Minimum FOV (zoom in limit)
    init: 100,              // Initial FOV on load
    initTarget: 60          // FOV to animate to after loading
},
fov_gnomonic: {
    max: 130,
    min: 45,
    init: 100,
    initTarget: 60
}
```

### Zoom

```javascript
zoom: {
    smoothing: 6000,        // Zoom smoothness
    speed: 1.5              // Zoom speed multiplier
}
```

### Interaction

```javascript
interaction: {
    sensitivity: 0.1,       // Mouse drag sensitivity
    momentum: true,         // Enable momentum after release
    momentumDamping: 0.95   // Momentum decay (0-1)
}
```

---

## Callbacks

### Core Callbacks

```javascript
callbacks: {
    onReady: (core) => {
        console.log('Viewer ready', core);
    },
    
    onImageLoad: (imageUrl) => {
        console.log('Image loaded:', imageUrl);
    },
    
    onImageError: (error) => {
        console.error('Error loading image:', error);
    }
}
```

### Multi-Image Callbacks

```javascript
callbacks: {
    onImageLoad: (imageData, resolution) => {
        console.log('Loaded:', imageData.name);
        console.log('Resolution:', resolution.label);
    },
    
    onImageError: (error) => {
        console.error('Error:', error);
    },
    
    onResolutionChange: (resolution) => {
        console.log('Switched to:', resolution.label);
    },
    
    onLoadStart: () => {
        console.log('Loading started');
    },
    
    onLoadComplete: () => {
        console.log('Loading complete');
    }
}
```

### Library UI Callbacks

```javascript
callbacks: {
    onLibraryLoad: (library) => {
        console.log('Library loaded:', library._metadata.total_images, 'images');
    },
    
    onImageSelect: (imageId) => {
        console.log('User selected:', imageId);
    },
    
    onPanelToggle: (isOpen) => {
        console.log('Panel is:', isOpen ? 'open' : 'closed');
    },
    
    onImageInfoUpdate: (info) => {
        console.log('Image:', info.name);
        console.log('Resolution:', info.resolution);
        console.log('Dimensions:', info.dimensions);
        console.log('Format:', info.format);
    }
}
```

---

## localStorage Keys

The viewer uses namespaced `localStorage` keys to save user preferences:

| Key | Type | Description |
|-----|------|-------------|
| `phong360.preferences.projection` | number | Last projection type (0 or 1) |
| `phong360.preferences.resolution` | string | Last resolution ID ('8k', '4k', '2k') |

### Clearing Preferences

```javascript
localStorage.removeItem('phong360.preferences.projection');
localStorage.removeItem('phong360.preferences.resolution');
```

---

## Advanced Examples

### Custom Resolution Logic

```javascript
const multi = new Phong360MultiImage({
    core: core,
    images: images,
    adaptiveLoading: false  // Disable automatic selection
});

// Load with custom logic
const isMobile = window.innerWidth < 768;
const hasSlowConnection = navigator.connection && navigator.connection.effectiveType === '2g';

const resolutionId = hasSlowConnection ? '2k' : (isMobile ? '4k' : '8k');
multi.switchResolution(resolutionId);
```

### Dynamic Image Loading

```javascript
const multi = new Phong360MultiImage({ core: core, images: [] });

// Load images dynamically
fetch('/api/360-images')
    .then(res => res.json())
    .then(data => {
        multi.setImages(data.images);
        multi.loadImageById(data.images[0].id);
    });
```

### Custom UI Integration

```javascript
const core = new Phong360ViewerCore({ containerId: 'viewer' });
const multi = new Phong360MultiImage({
    core: core,
    images: images,
    callbacks: {
        onImageLoad: (imageData, resolution) => {
            // Update your custom UI
            document.getElementById('title').textContent = imageData.name;
            document.getElementById('res').textContent = resolution.label;
        }
    }
});
```

---

## Error Handling

```javascript
const core = new Phong360ViewerCore({
    containerId: 'viewer',
    imageUrl: 'image.jpg'
});

// Core doesn't have error callbacks, but you can catch errors:
try {
    core.loadImage('invalid-image.jpg', 4096, 2048);
} catch (error) {
    console.error('Error:', error);
}

// Multi-image has error callback:
const multi = new Phong360MultiImage({
    core: core,
    images: images,
    callbacks: {
        onImageError: (error) => {
            alert('Failed to load image: ' + error.message);
        }
    }
});
```

---

## TypeScript (Coming Soon)

Type definitions will be available in v3.1:

```typescript
interface Phong360ViewerCoreOptions {
    containerId: string;
    imageUrl?: string;
    width?: number;
    height?: number;
    config?: ViewerConfig;
}

interface ViewerConfig {
    viewRotation?: ViewRotationConfig;
    zoom?: ZoomConfig;
    fov_stereographic?: FOVConfig;
    fov_gnomonic?: FOVConfig;
    interaction?: InteractionConfig;
}

// ... etc
```

---

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 88+ | Full support |
| Firefox | 85+ | Full support |
| Safari | 14+ | Full support |
| Edge | 88+ | Full support |
| Mobile Safari | 14+ | Touch gestures supported |
| Chrome Android | 88+ | Touch gestures supported |

**Requirements:**
- WebGL support
- ES6 JavaScript support
- localStorage (for preferences)

---

## Performance Tips

1. **Use appropriate resolutions**: Don't load 8K images on mobile
2. **Enable adaptive loading**: Let the viewer choose optimal resolution
3. **Preload thumbnails**: Small thumbnails load fast
4. **Lazy load**: Only load images when needed
5. **Optimize images**: Use JPEG with 85-90% quality

```javascript
// Good: Adaptive loading
const multi = new Phong360MultiImage({
    core: core,
    images: images,
    adaptiveLoading: true  // ✅
});

// Better: Custom logic for your use case
const isMobile = window.innerWidth < 768;
const defaultRes = isMobile ? '2k' : '4k';
multi.switchResolution(defaultRes);
```

---

**📖 See also:**
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md) - Library format specification
- [WORDPRESS-INTEGRATION-PLAN.md](WORDPRESS-INTEGRATION-PLAN.md) - WordPress integration

---

**Last Updated**: November 2025  
**Version**: 3.0.0

