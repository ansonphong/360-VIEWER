# API Reference

Complete API documentation for Phong 360 Viewer v4.0.

---

## Table of Contents

1. [Layer 1: Phong360ViewerCore](#layer-1-phong360viewercore)
2. [Layer 2: Phong360MultiImage](#layer-2-phong360multiimage)
3. [Layer 3: Phong360LibraryUI](#layer-3-phong360libraryui)
4. [TemplateEngine](#templateengine)
5. [BaseRenderer](#baserenderer)
6. [Configuration Options](#configuration-options)
7. [Callbacks](#callbacks)
8. [localStorage Keys](#localstorage-keys)

---

## Layer 1: Phong360ViewerCore

**File**: `core/phong-360-viewer-core.js`
**Size**: ~30KB
**Purpose**: Single image 360 viewer with controls and projections

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
    imageUrl: string,              // URL of 360 image to load
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
            sensitivity: number,        // Mouse drag sensitivity (default: 0.1)
            momentum: boolean,          // Enable momentum (default: true)
            momentumDamping: number     // Momentum decay 0-1 (default: 0.95)
        }
    }
}
```

### Methods

#### loadImage(imageUrl, width, height)

Load a new 360 image.

```javascript
core.loadImage('path/to/image.jpg', 4096, 2048);
```

**Returns**: `Promise`

---

#### switchProjection(type)

Switch between projection types.

```javascript
core.switchProjection(0);  // Gnomonic
core.switchProjection(1);  // Stereographic
```

**Parameters**:
- `type` (number): 0 = Gnomonic, 1 = Stereographic

Preference is saved to `localStorage` as `phong360.preferences.projection`.

---

#### setAutoRotate(enabled)

Enable or disable auto-rotation.

```javascript
core.setAutoRotate(true);
```

---

#### destroy()

Clean up and remove viewer, dispose textures and WebGL resources.

```javascript
core.destroy();
```

---

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `projectionType` | number | Current projection (0=Gnomonic, 1=Stereographic) |
| `state.lat` | number | Current latitude |
| `state.lon` | number | Current longitude |
| `state.fov` | number | Current field of view |
| `animationFrameId` | number | Animation frame ID (truthy if animating) |

---

## Layer 2: Phong360MultiImage

**File**: `extensions/phong-360-multi-image.js`
**Size**: ~15KB
**Purpose**: Multi-image management with adaptive resolution selection

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
    images: Array,                  // Array of v4.0 image objects (see below)
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

### Image Object Shape (v4.0)

```javascript
{
    id: string,                     // Unique image ID
    title: string,                  // Display title
    slug: string,                   // URL-safe slug for deep-linking
    thumbnail: {
        path: string,               // Thumbnail path
        width: number,              // Thumbnail width (default: 512)
        height: number              // Thumbnail height (default: 256)
    },
    resolutions: [
        {
            id: string,             // Resolution ID ('8k', '4k', '2k')
            label: string,          // Display label ('8K', '4K', '2K')
            path: string,           // Image path
            width: number,          // Image width
            height: number,         // Image height
            fileSize: number,       // File size in bytes (optional)
            quality: number,        // JPEG quality 0-100 (optional)
            bandwidth: string,      // 'high' | 'medium' | 'low' (optional)
            recommended: Array,     // Device recommendations (optional)
            default: boolean        // Is default resolution (optional)
        }
    ],
    badges: Array,                  // Badge objects (optional, passed through to Layer 3)
    metadata: Object                // Image metadata (optional, passed through)
}
```

### Methods

#### loadImageById(id)

Load image by ID or slug.

```javascript
multi.loadImageById('sunset-001');
multi.loadImageById('sunset-beach');  // Also works with slug
```

---

#### loadImageWithResolution(imageData, resolution)

Load a specific image at a specific resolution.

```javascript
const image = multi.findImageById('sunset-001');
const res = image.resolutions.find(r => r.id === '8k');
multi.loadImageWithResolution(image, res);
```

---

#### switchResolution(resolutionId)

Switch to a different resolution of the current image. Saves preference to localStorage.

```javascript
multi.switchResolution('8k');
```

---

#### setImages(images)

Set or replace the images array.

```javascript
multi.setImages(newImagesArray);
```

---

#### addImage(imageData)

Add a single image to the collection.

```javascript
multi.addImage({ id: 'new', title: 'New Image', resolutions: [...] });
```

---

#### findImageById(id)

Find image object by ID or slug.

```javascript
const image = multi.findImageById('sunset-001');
const image = multi.findImageById('sunset-beach');  // slug match
```

**Returns**: `Object|null`

---

#### loadFirstImage()

Load the first image in the collection.

---

#### loadNextImage() / loadPreviousImage()

Navigate to next or previous image.

---

#### getCurrentImageData()

**Returns**: `Object|null` - Current image object.

---

#### getAvailableResolutions()

**Returns**: `Array` - Resolution objects for current image.

---

#### getCurrentResolution()

**Returns**: `Object|null` - Current resolution object.

---

#### selectOptimalResolution(resolutions)

Automatically select best resolution based on device and bandwidth.

**Selection logic** (in priority order):
1. User preference saved in localStorage
2. Network connection type (2G/3G/4G detection)
3. Device pixel ratio (high-DPI displays get 8K)
4. Viewport width (mobile gets 2K)
5. Default resolution flag
6. Middle resolution as fallback

---

#### formatFileSize(bytes)

Format bytes to human-readable string.

```javascript
multi.formatFileSize(3800000);  // "3.6 MB"
```

---

#### getImageCount()

**Returns**: `number` - Total number of images.

---

#### clearResolutionPreference()

Clear the saved resolution preference.

---

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `currentImageId` | string | Current image ID |
| `currentImageData` | Object | Current image object |
| `currentResolution` | Object | Current resolution object |
| `userPreferredResolution` | string | Saved resolution preference |

---

## Layer 3: Phong360LibraryUI

**File**: `extensions/phong-360-library-ui.js`
**Size**: ~25KB
**Purpose**: Section-based library UI with template engine, badges, themes, and context-aware headers

Layer 3 creates Layer 1 and Layer 2 internally. You don't need to instantiate them separately.

### Constructor

```javascript
new Phong360LibraryUI(options)
```

### Options

```javascript
{
    // Required
    containerId: string,            // ID of container element for 360 canvas

    // Library source (one of these)
    libraryUrl: string,             // URL to library.json (fetched via fetch())
    libraryData: Object,            // Pre-loaded library data object

    // Optional - Display
    baseUrl: string,                // Base URL for resolving image paths (default: '')
    theme: string,                  // 'dark' | 'light' | 'auto' (default: 'auto')
    accent: string,                 // Accent color hex (e.g. '#6366f1')
    autoloadId: string,             // Auto-load image by ID or slug after library loads
    filterCollection: string,       // Only render section matching this ID/slug
}
```

### Callbacks

Set callbacks after construction:

```javascript
const viewer = new Phong360LibraryUI({ containerId: 'viewer', libraryUrl: '...' });

viewer.callbacks.onImageLoad = (imageData, resolution) => {
    // Image finished loading in the 360 canvas
};

viewer.callbacks.onImageSelect = (imageData) => {
    // User clicked an image in the sidebar
};

viewer.callbacks.onBadgeClick = (imageData, badge) => {
    // User clicked a badge on a thumbnail
    // badge: { emoji: '...', icon: '...', count: 42 }
};

viewer.callbacks.onLibraryLoad = (libraryData) => {
    // Library JSON loaded and parsed
};

viewer.callbacks.onContextReady = (context) => {
    // Context header rendered; context: { type, title, subtitle, avatar, links, ... }
};

viewer.callbacks.onSectionToggle = (section, isExpanded) => {
    // A collapsible section was toggled
};

viewer.callbacks.onLinkClick = (url, linkData) => {
    // A context link was clicked (can preventDefault by setting this callback)
};

viewer.callbacks.onThemeChange = (theme) => {
    // Theme changed: 'light' or 'dark'
};
```

### Methods

#### toggleSidebar() / openSidebar() / closeSidebar()

Control sidebar visibility.

```javascript
viewer.toggleSidebar();
viewer.openSidebar();
viewer.closeSidebar();
```

---

#### setTheme(theme)

Switch theme programmatically.

```javascript
viewer.setTheme('dark');
viewer.setTheme('light');
viewer.setTheme('auto');
```

---

#### setAccent(hex)

Set custom accent color. Automatically generates hover, active, and border variants.

```javascript
viewer.setAccent('#6366f1');
```

---

#### updateBadges(imageId, badges)

Update badges on a specific image's thumbnails in the sidebar. Designed for Layer 4 to call after API updates.

```javascript
viewer.updateBadges('abc123', [
    { emoji: 'fire', count: 43 },
    { emoji: 'heart', count: 19 }
]);
```

---

#### loadLibrary()

Re-fetch and reload the library from `libraryUrl`.

```javascript
await viewer.loadLibrary();
```

---

#### reloadLibrary()

Clear current content and reload. Removes existing headers and sections.

```javascript
await viewer.reloadLibrary();
```

---

#### getLibraryData()

**Returns**: `Object` - The full parsed library data.

---

#### onImageClick(image)

Programmatically trigger an image selection (same as user clicking a thumbnail).

```javascript
viewer.onImageClick(imageData);
```

---

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `core` | Phong360ViewerCore | Underlying core viewer instance |
| `multiViewer` | Phong360MultiImage | Underlying multi-image manager |
| `templateEngine` | TemplateEngine | Template engine instance |
| `libraryData` | Object | Parsed library data |
| `callbacks` | Object | Callback registry |

---

## TemplateEngine

The template engine maps template names to renderer classes.

### Usage

```javascript
// Access via viewer
viewer.templateEngine.register('custom', MyCustomRenderer);
```

### Methods

#### render(section, config)

Render a section using its template.

```javascript
const el = viewer.templateEngine.render(section, { baseUrl: 'library/' });
```

---

#### register(name, RendererClass)

Register a custom template renderer.

```javascript
class MyRenderer extends BaseRenderer {
    render() {
        const el = document.createElement('div');
        // Custom rendering logic
        return el;
    }
}

viewer.templateEngine.register('my-template', MyRenderer);
```

### Built-in Renderers

| Name | Class | Description |
|------|-------|-------------|
| `grid` | GridRenderer | Responsive thumbnail grid |
| `feed` | FeedRenderer | Vertical list with large thumbnails |
| `accordion` | AccordionRenderer | Collapsible section with inner template |
| `hero` | HeroRenderer | Single large featured image with overlay |
| `list` | ListRenderer | Compact rows with small thumbnails |
| `carousel` | CarouselRenderer | Horizontal scrolling strip |
| `avatar-row` | AvatarRowRenderer | Horizontal circular avatars |
| `avatar-grid` | AvatarGridRenderer | Grid of avatar cards |
| `empty` | EmptyStateRenderer | Empty/placeholder state |

See [TEMPLATES.md](TEMPLATES.md) for detailed config options for each renderer.

---

## BaseRenderer

All template renderers extend `BaseRenderer`. To create a custom renderer:

```javascript
class MyRenderer extends BaseRenderer {
    render() {
        const el = document.createElement('div');
        el.className = 'my-template';

        for (const image of (this.section.images || [])) {
            // Use inherited helpers:
            el.appendChild(this.createThumbnail(image));
        }

        return el;
    }
}
```

### Inherited Methods

| Method | Description |
|--------|-------------|
| `createSectionHeading()` | Creates a section heading element with icon, title, count, chevron |
| `createThumbnail(image)` | Creates a thumbnail element with lazy-loading, badges, and click handler |
| `_renderBadges(el, badges)` | Renders badge overlays on an element |
| `_formatCount(n)` | Formats number (1000 -> "1.0K", 1000000 -> "1.0M") |
| `_resolvePath(path)` | Resolves relative paths against baseUrl |
| `_resolveIcon(iconStr)` | Converts icon name to Phosphor CSS class |
| `_getBadgeIcon(icon)` | Returns emoji or Phosphor icon string |

### Constructor Parameters

| Parameter | Description |
|-----------|-------------|
| `this.section` | The section object being rendered |
| `this.config` | Render config (includes `baseUrl`) |
| `this.engine` | Reference to the parent Phong360LibraryUI instance |

---

## Configuration Options

### View Rotation

```javascript
viewRotation: {
    initAltitude: 0,        // Starting pitch (-90 to 90)
    initAzimuth: 90,        // Starting yaw (0 to 360)
    autoRotate: false,      // Enable auto-rotation
    autoRotationRate: 1,    // Degrees per second
    smoothness: 8000,       // Higher = smoother (1000-10000)
    latMin: -85,            // Minimum pitch
    latMax: 85              // Maximum pitch
}
```

### Field of View

```javascript
fov_stereographic: { max: 330, min: 45, init: 100, initTarget: 60 },
fov_gnomonic: { max: 130, min: 45, init: 100, initTarget: 60 }
```

### Zoom

```javascript
zoom: { smoothing: 6000, speed: 1.5 }
```

---

## Callbacks

### Layer 2 Callbacks

| Callback | Signature | Description |
|----------|-----------|-------------|
| `onImageLoad` | `(imageData, resolution)` | Image loaded in canvas |
| `onImageError` | `(error)` | Image failed to load |
| `onResolutionChange` | `(resolution)` | Resolution switched |
| `onLoadStart` | `()` | Loading started |
| `onLoadComplete` | `()` | Loading finished |

### Layer 3 Callbacks

| Callback | Signature | Description |
|----------|-----------|-------------|
| `onImageLoad` | `(imageData, resolution)` | Image loaded (from Layer 2) |
| `onImageSelect` | `(imageData)` | User clicked an image |
| `onBadgeClick` | `(imageData, badge)` | User clicked a badge |
| `onLibraryLoad` | `(libraryData)` | Library data loaded |
| `onContextReady` | `(context)` | Context header rendered |
| `onSectionToggle` | `(section, isExpanded)` | Section toggled |
| `onLinkClick` | `(url, linkData)` | Context link clicked |
| `onThemeChange` | `(theme)` | Theme changed |

---

## localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `phong360.preferences.projection` | number | Last projection type (0 or 1) |
| `phong360.preferences.resolution` | string | Preferred resolution ID ('8k', '4k', '2k') |
| `phong360.preferences.autoRotate` | string | Auto-rotate enabled ('true' or 'false') |

### Clearing Preferences

```javascript
localStorage.removeItem('phong360.preferences.projection');
localStorage.removeItem('phong360.preferences.resolution');
localStorage.removeItem('phong360.preferences.autoRotate');
```

---

## Browser Compatibility

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 88+ |
| Firefox | 85+ |
| Safari | 14+ |
| Edge | 88+ |
| Mobile Safari | 14+ |
| Chrome Android | 88+ |

**Requirements**: WebGL, ES6 JavaScript, localStorage.

---

## Link Icon Detection

Layer 3 automatically detects social platform URLs and displays the appropriate Phosphor icon:

| Domain | Icon |
|--------|------|
| instagram.com | instagram-logo |
| youtube.com | youtube-logo |
| twitter.com / x.com | twitter-logo / x-logo |
| github.com | github-logo |
| tiktok.com | tiktok-logo |
| facebook.com | facebook-logo |
| linkedin.com | linkedin-logo |
| discord.com / discord.gg | discord-logo |
| twitch.tv | twitch-logo |
| reddit.com | reddit-logo |
| pinterest.com | pinterest-logo |
| threads.net | threads-logo |
| (other) | link |

---

**See also:**
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md) - Library format specification
- [TEMPLATES.md](TEMPLATES.md) - Template system guide
- [THEMING.md](THEMING.md) - Theming and customization

---

**Last Updated**: February 2026
**Version**: 4.0.0
