# Library Format Specification

## Version 4.0.0

This document describes the library format for Phong 360 Viewer. The format is JSON-based, extensible, and designed for maximum compatibility across WordPress, static sites, and custom applications.

---

## Table of Contents

- [Overview](#overview)
- [v4.0 Format (Current)](#v40-format-current)
- [Context Object](#context-object)
- [Section Object](#section-object)
- [Image Object](#image-object)
- [Badge Object](#badge-object)
- [Image Requirements](#image-requirements)
- [Building a Library](#building-a-library)

---

## Overview

The v4.0 library format uses a sections-based structure. Each section specifies a template for rendering and contains an array of images.

Key features:
- **Sections** replace the old `_categories` hierarchy
- **Templates** control how each section renders (grid, accordion, feed, etc.)
- **Context** provides header information (profile, discover, local modes)
- **Badges** enable reaction/metric overlays on thumbnails
- **Slugs** enable deep-linking via URL parameters
- **Themes** hint the viewer to use light/dark mode
- **v4.0 only** — legacy formats (v3.0, v2.0) are not supported; rebuild libraries with `build_library.py`

---

## v4.0 Format (Current)

### Complete Schema

```json
{
  "version": "4.0.0",
  "context": {
    "type": "local",
    "title": "My 360 Gallery",
    "subtitle": "Explore panoramic images",
    "theme": "auto",
    "accent": "#e13e13",
    "autoload": "image-slug"
  },
  "sections": [
    {
      "id": "landscapes",
      "title": "Landscapes",
      "template": "accordion",
      "icon": "mountains",
      "collapsible": true,
      "collapsed": false,
      "defaultOpen": true,
      "innerTemplate": "grid",
      "badge": 15,
      "images": [
        {
          "id": "a1b2c3d4",
          "title": "Mountain Sunset",
          "slug": "mountain-sunset",
          "thumbnail": {
            "path": "_BUILD/thumbnails/mountain-sunset.jpg",
            "width": 512,
            "height": 256
          },
          "resolutions": [
            {
              "id": "8k",
              "label": "8K",
              "width": 8192,
              "height": 4096,
              "path": "_BUILD/8K/mountain-sunset.jpg",
              "fileSize": 8049466,
              "quality": 95,
              "bandwidth": "high",
              "recommended": ["vr-headset", "desktop-4k"]
            },
            {
              "id": "4k",
              "label": "4K",
              "width": 4096,
              "height": 2048,
              "path": "_BUILD/4K/mountain-sunset.jpg",
              "fileSize": 1878156,
              "quality": 90,
              "bandwidth": "medium",
              "recommended": ["desktop", "tablet"],
              "default": true
            },
            {
              "id": "2k",
              "label": "2K",
              "width": 2048,
              "height": 1024,
              "path": "_BUILD/2K/mountain-sunset.jpg",
              "fileSize": 480329,
              "quality": 85,
              "bandwidth": "low",
              "recommended": ["mobile", "slow-connection"]
            }
          ],
          "badges": [
            { "emoji": "fire", "count": 42 },
            { "emoji": "heart", "count": 18 }
          ],
          "metadata": {
            "originalWidth": 8192,
            "originalHeight": 4096,
            "format": "JPEG",
            "mode": "RGB",
            "isPanorama": true,
            "fileSize": 17442420
          }
        }
      ]
    }
  ]
}
```

---

## Context Object

The context controls the sidebar header rendering.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | `"profile"`, `"discover"`, or `"local"` |
| `title` | string | No | Display title |
| `subtitle` | string | No | Subtitle text |
| `avatar` | string | No | Avatar image URL (profile type) |
| `theme` | string | No | Theme hint: `"dark"`, `"light"`, or `"auto"` |
| `accent` | string | No | Accent color hex (e.g. `"#6366f1"`) |
| `autoload` | string | No | Image ID or slug to auto-load |
| `links` | array | No | Social/external links (profile type) |
| `header` | boolean | No | Set to `false` to hide header entirely |

### Context Types

**Profile** - Shows avatar, name, subtitle, and social links:

```json
{
  "type": "profile",
  "title": "Phong",
  "subtitle": "@phong",
  "avatar": "/avatars/phong.jpg",
  "links": [
    { "url": "https://instagram.com/phong", "label": "Instagram" },
    { "url": "https://youtube.com/@phong", "label": "YouTube" },
    { "url": "https://phong.com", "label": "Website" }
  ]
}
```

**Discover** - Shows a discovery/browse header:

```json
{
  "type": "discover",
  "title": "360 Hextile Gallery",
  "subtitle": "Explore 360 panoramas"
}
```

**Local** - Simple local library header:

```json
{
  "type": "local",
  "title": "My 360 Library",
  "theme": "auto"
}
```

### Link Objects

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Link URL |
| `label` | string | Display label (optional, auto-detected from domain) |

Links are auto-detected for platform icons (Instagram, YouTube, Twitter/X, GitHub, TikTok, Facebook, LinkedIn, Discord, Twitch, Reddit, Pinterest, Threads).

---

## Section Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | required | Section identifier |
| `title` | string | `""` | Display title |
| `template` | string | `"grid"` | Template renderer name |
| `icon` | string | `""` | Phosphor icon name (e.g. `"folder"`, `"fire"`) |
| `images` | array | `[]` | Array of image objects |
| `items` | array | `[]` | Array of item objects (avatar templates) |
| `collapsible` | boolean | `true` | Enable collapse toggle |
| `collapsed` | boolean | `false` | Start collapsed |
| `defaultOpen` | boolean | `true` | Start expanded (accordion template) |
| `innerTemplate` | string | `"grid"` | Inner template for accordion |
| `badge` | number/object | auto | Section-level badge (defaults to image count) |
| `slug` | string | `""` | URL-safe identifier for filterCollection |
| `message` | string | `""` | Message for empty-state template |

### Available Templates

| Template | Description |
|----------|-------------|
| `grid` | Responsive thumbnail grid |
| `feed` | Vertical list with large thumbnails and metadata |
| `accordion` | Collapsible section with inner template |
| `hero` | Single large featured image with overlay |
| `list` | Compact rows with small thumbnails |
| `carousel` | Horizontal scrolling strip |
| `avatar-row` | Horizontal circular avatars |
| `avatar-grid` | Grid of avatar cards |
| `empty` | Empty state placeholder |

See [TEMPLATES.md](TEMPLATES.md) for detailed documentation on each template.

---

## Image Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (8+ char hash) |
| `title` | string | Yes | Display title |
| `slug` | string | No | URL-safe slug for deep-linking |
| `thumbnail` | object | Yes | Thumbnail reference |
| `resolutions` | array | Yes | Array of resolution objects |
| `badges` | array | No | Array of badge objects |
| `metadata` | object | No | Image metadata |
| `description` | string | No | Image description (used by hero template) |
| `creator` | string | No | Creator name (used by feed/list templates) |

### Thumbnail Object

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | Relative path to thumbnail image |
| `width` | number | Thumbnail width (default: 512) |
| `height` | number | Thumbnail height (default: 256) |

### Resolution Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Resolution ID (`"8k"`, `"4k"`, `"2k"`) |
| `label` | string | Yes | Display label (`"8K"`, `"4K"`, `"2K"`) |
| `path` | string | Yes | Relative path to image file |
| `width` | number | Yes | Image width in pixels |
| `height` | number | Yes | Image height in pixels |
| `fileSize` | number | No | File size in bytes |
| `quality` | number | No | JPEG quality 0-100 |
| `bandwidth` | string | No | `"high"`, `"medium"`, or `"low"` |
| `recommended` | array | No | Device type recommendations |
| `default` | boolean | No | Is the default resolution |

### Metadata Object

| Field | Type | Description |
|-------|------|-------------|
| `originalWidth` | number | Original image width |
| `originalHeight` | number | Original image height |
| `format` | string | Image format (JPEG, PNG) |
| `mode` | string | Color mode (RGB, RGBA) |
| `isPanorama` | boolean | Whether image is panoramic |
| `fileSize` | number | Original file size in bytes |

---

## Badge Object

Badges are rendered as small overlays on thumbnails (max 3 displayed).

| Field | Type | Description |
|-------|------|-------------|
| `emoji` | string | Emoji character or Phosphor icon name |
| `icon` | string | Alternative to emoji (Phosphor icon name) |
| `count` | number | Count to display |
| `value` | number | Alternative to count |

The renderer auto-detects whether the icon is an emoji or a Phosphor icon name.

```json
"badges": [
  { "emoji": "fire", "count": 42 },
  { "icon": "heart", "value": 18 },
  { "emoji": "eyes", "count": 3821 }
]
```

Count formatting: values >= 1000 show as "1.5K", >= 1000000 as "2.3M".

---

## Image Requirements

### Format Requirements

- **Projection**: Equirectangular (spherical) projection
- **Aspect Ratio**: 2:1 (e.g., 8192x4096)
- **File Types**: JPEG, PNG
- **Color Space**: RGB or sRGB

### Recommended Specifications

| Resolution | Dimensions | File Size | Quality | Best For |
|-----------|-----------|-----------|---------|----------|
| 8K | 8192x4096 | 8-15 MB | 95% | VR headsets, 4K displays |
| 4K | 4096x2048 | 2-4 MB | 90% | Desktop, tablets (default) |
| 2K | 2048x1024 | 400-800 KB | 85% | Mobile, slow connections |
| Thumbnail | 512x256 | 20-40 KB | 80% | Library browsing |

---

## Building a Library

### Using build_library.py

```bash
pip install Pillow tqdm

cd library
python build_library.py
```

The script will:
- Scan folders for equirectangular images
- Generate thumbnails (512x256)
- Create multiple resolutions (8K, 4K, 2K)
- Build v4.0 sections structure
- Generate unique IDs and slugs
- Extract image metadata
- Output `library.json`

### Directory Structure

```
library/
├── CategoryA/
│   ├── image1.jpg
│   └── image2.jpg
├── CategoryB/
│   └── image3.jpg
├── _BUILD/                    # Auto-generated
│   ├── thumbnails/
│   ├── 8K/
│   ├── 4K/
│   └── 2K/
└── library.json               # Auto-generated
```

### Path Resolution

Paths in library.json are relative to the library file. When using `baseUrl`:

```javascript
new Phong360LibraryUI({
    libraryUrl: 'library/library.json',
    baseUrl: 'library/'     // Prepended to all image paths
});
```

---

## Best Practices

1. **Use slugs** for deep-linking: add `slug` field to all images
2. **Set a default resolution**: mark one resolution with `"default": true`
3. **Include file sizes**: helps the adaptive loader make better decisions
4. **Use thumbnails**: 512x256 JPEG thumbnails load fast for sidebar browsing
5. **Organize into sections**: use meaningful section IDs and titles
6. **Version control**: keep library.json in git, add `_BUILD/` to `.gitignore`
7. **CDN hosting**: serve images from CDN for better performance
8. **Set bandwidth hints**: `"high"`, `"medium"`, `"low"` help adaptive loading

---

**See also:**
- [API.md](API.md) - Full API reference
- [TEMPLATES.md](TEMPLATES.md) - Template system
- [THEMING.md](THEMING.md) - Theming guide

---

**Version**: 4.0.0
**Last Updated**: February 2026
**Maintained by**: Phong
