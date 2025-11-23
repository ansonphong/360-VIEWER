# 📚 Library Format Specification

## Version 3.0.0

This document describes the library format for Phong 360 Viewer. The format is JSON-based, extensible, and designed for maximum compatibility across WordPress, static sites, and custom applications.

## Table of Contents

- [Overview](#overview)
- [Format Versions](#format-versions)
- [Library Structure v2.0](#library-structure-v20)
- [Legacy Format v1.x](#legacy-format-v1x)
- [Image Requirements](#image-requirements)
- [File Organization](#file-organization)
- [Metadata Fields](#metadata-fields)
- [Building a Library](#building-a-library)
- [Usage Examples](#usage-examples)

## Overview

The library format defines how 360° equirectangular images are organized, described, and served to the viewer. It supports:

- **Hierarchical categorization** - Organize images in nested categories/folders
- **Multiple quality levels** - Serve optimal image quality based on bandwidth/device
- **Thumbnails** - Fast library browsing with small preview images
- **Rich metadata** - Store image properties, dimensions, and custom data
- **Unique IDs** - Stable references for sharing and deep-linking
- **Extensibility** - Add custom fields without breaking compatibility

## Format Versions

### Version 3.0 (Current)
- Semantic resolution naming (8K, 4K, 2K)
- Resolution metadata (fileSize, bandwidth, deviceRecommendation)
- Configurable via `resolutions.json`
- Adaptive loading support
- localStorage preference integration

### Version 2.0 (Legacy)
- Nested category structure with `_categories` object
- Quality-based naming (Q100, Q75, Q50)
- Basic metadata support

## Library Structure v3.0

### Complete Schema

```json
{
  "_metadata": {
    "version": "3.0.0",
    "generated": "2025-11-23T10:30:00",
    "total_images": 25,
    "total_categories": 5,
    "image_format": "equirectangular",
    "resolutions": ["8K", "4K", "2K"]
  },
  "_categories": {
    "CategoryName": {
      "name": "Category Display Name",
      "description": "Optional category description",
      "images": [
        {
          "id": "a1b2c3d4",
          "name": "Image Name",
          "filename": "original-filename.jpg",
          "path": "CategoryName/original-filename.jpg",
          "thumbnail": {
            "path": "_BUILD/thumbnails/CategoryName-original-filename.jpg",
            "width": 512,
            "height": 256
          },
          "resolutions": [
            {
              "id": "8k",
              "label": "8K",
              "path": "_BUILD/8K/CategoryName-original-filename.jpg",
              "width": 8192,
              "height": 4096,
              "quality": 95,
              "fileSize": 12500000,
              "bandwidth": "high",
              "deviceRecommendation": "desktop"
            },
            {
              "id": "4k",
              "label": "4K",
              "path": "_BUILD/4K/CategoryName-original-filename.jpg",
              "width": 4096,
              "height": 2048,
              "quality": 90,
              "fileSize": 3800000,
              "bandwidth": "medium",
              "deviceRecommendation": "desktop,tablet",
              "default": true
            },
            {
              "id": "2k",
              "label": "2K",
              "path": "_BUILD/2K/CategoryName-original-filename.jpg",
              "width": 2048,
              "height": 1024,
              "quality": 85,
              "fileSize": 950000,
              "bandwidth": "low",
              "deviceRecommendation": "mobile,tablet"
            }
          ]
        }
      ],
      "subcategories": {
        "SubcategoryName": {
          "name": "Subcategory Display Name",
          "images": [],
          "subcategories": {}
        }
      }
    }
  }
}
```

### Field Descriptions

#### Top Level

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_metadata` | object | Yes | Library-wide metadata |
| `_categories` | object | Yes | Category hierarchy with images |

#### _metadata Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | Yes | Format version (e.g., "2.0.0") |
| `generated` | string | No | ISO 8601 timestamp of generation |
| `total_images` | number | No | Total count of images |
| `total_categories` | number | No | Total count of categories |
| `image_format` | string | No | Image projection type (e.g., "equirectangular") |
| `quality_levels` | array | No | Available quality level identifiers |
| `custom` | object | No | Custom metadata fields |

#### Category Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name for category |
| `description` | string | No | Category description |
| `images` | array | Yes | Array of image objects |
| `subcategories` | object | No | Nested subcategories |
| `custom` | object | No | Custom category fields |

#### Image Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (8-char hash) |
| `name` | string | Yes | Display name (filename without extension) |
| `filename` | string | No | Original filename |
| `path` | string | Yes | Relative path to original image |
| `thumbnail` | string | Yes | Path to thumbnail (512x256) |
| `Q100` | string | Yes | Path to full quality image (100%) |
| `Q75` | string | Yes | Path to high quality image (75%) |
| `Q50` | string | Yes | Path to medium quality image (50%) |
| `metadata` | object | No | Image metadata |
| `custom` | object | No | Custom image fields |

#### Image Metadata Object

| Field | Type | Description |
|-------|------|-------------|
| `width` | number | Image width in pixels |
| `height` | number | Image height in pixels |
| `format` | string | Image format (JPEG, PNG, etc.) |
| `mode` | string | Color mode (RGB, RGBA, etc.) |
| `is_panorama` | boolean | Whether image is wide enough to be panoramic |

## Legacy Format v1.x

The legacy format uses a simpler flat structure:

```json
{
  "CategoryName": {
    "files": [
      {
        "id": "a1b2c3d4",
        "name": "Image Name",
        "path": "CategoryName/image.jpg",
        "thumbnail": "_BUILD/thumbnails/CategoryName-image.jpg",
        "Q100": "_BUILD/Q100/CategoryName-image.jpg",
        "Q75": "_BUILD/Q75/CategoryName-image.jpg",
        "Q50": "_BUILD/Q50/CategoryName-image.jpg"
      }
    ]
  }
}
```

### Converting Between Formats

Use the build script's `--format` option:

```bash
# Generate v2.0 format
python build_library.py --format new

# Generate v1.x format
python build_library.py --format legacy

# Generate both formats
python build_library.py --format both
```

## Image Requirements

### Format Requirements

- **Projection**: Equirectangular (spherical) projection
- **Aspect Ratio**: 2:1 recommended (e.g., 8192x4096)
- **File Types**: JPEG, PNG
- **Color Space**: RGB or sRGB

### Recommended Specifications

| Use Case | Resolution | File Size | Quality |
|----------|-----------|-----------|---------|
| Web Standard | 4096x2048 | 2-5 MB | 75-85% |
| High Quality | 8192x4096 | 8-15 MB | 85-95% |
| Archive | 16384x8192 | 20-40 MB | 95-100% |

### Minimum Requirements

- **Resolution**: 2048x1024 minimum
- **Quality**: 70% JPEG or higher
- **File Size**: No hard limit, but <10MB recommended for web

## File Organization

### Directory Structure

```
project-root/
├── library.json                 # Generated library file
├── CategoryA/
│   ├── image1.jpg
│   ├── image2.png
│   └── SubcategoryA/
│       └── image3.jpg
├── CategoryB/
│   └── image4.jpg
└── _BUILD/                     # Generated assets (auto-created)
    ├── thumbnails/
    │   ├── CategoryA-image1.jpg
    │   ├── CategoryA-image2.jpg
    │   ├── CategoryA-SubcategoryA-image3.jpg
    │   └── CategoryB-image4.jpg
    ├── Q100/                   # 100% quality
    │   └── ...
    ├── Q75/                    # 75% quality
    │   └── ...
    └── Q50/                    # 50% quality
        └── ...
```

### Path Resolution

Paths in `library.json` are relative to the library file location:

```javascript
// If library.json is at: https://example.com/360/library.json
// Then image paths resolve to:
"path": "Category/image.jpg"
// → https://example.com/360/Category/image.jpg

"thumbnail": "_BUILD/thumbnails/Category-image.jpg"
// → https://example.com/360/_BUILD/thumbnails/Category-image.jpg
```

## Building a Library

### Using build_library.py

```bash
# Basic usage - scan current directory
python build_library.py

# Specify directory and output
python build_library.py --root ./images --output library.json

# Generate with options
python build_library.py \
  --root ./images \
  --output library.json \
  --format both \
  --compact

# Skip generation steps
python build_library.py --skip-thumbnails --skip-jpgs
```

### Command Line Options

| Option | Description |
|--------|-------------|
| `--root, -r` | Root directory to scan (default: ./) |
| `--output, -o` | Output JSON file (default: library.json) |
| `--format, -f` | Output format: new, legacy, or both |
| `--no-metadata` | Exclude image metadata from output |
| `--skip-thumbnails` | Skip thumbnail generation |
| `--skip-jpgs` | Skip JPG quality generation |
| `--compact` | Output compact JSON (no pretty-print) |

### Manual Creation

You can create a library file manually or programmatically:

```javascript
const library = {
  "_metadata": {
    "version": "2.0.0",
    "generated": new Date().toISOString(),
    "total_images": 1,
    "total_categories": 1
  },
  "_categories": {
    "Examples": {
      "name": "Example Images",
      "images": [
        {
          "id": "abc12345",
          "name": "My 360 Image",
          "path": "examples/my-360-image.jpg",
          "thumbnail": "examples/my-360-image-thumb.jpg",
          "Q100": "examples/my-360-image.jpg",
          "Q75": "examples/my-360-image.jpg",
          "Q50": "examples/my-360-image.jpg"
        }
      ],
      "subcategories": {}
    }
  }
};

// Save to file
fs.writeFileSync('library.json', JSON.stringify(library, null, 2));
```

## Usage Examples

### Loading from URL

```javascript
const viewer = new Phong360Viewer({
  containerId: 'viewer-container',
  libraryUrl: 'library.json'
});
```

### Loading from Object

```javascript
const library = {
  "_metadata": { version: "2.0.0" },
  "_categories": {
    "MyCategory": {
      "name": "My Images",
      "images": [/* ... */],
      "subcategories": {}
    }
  }
};

const viewer = new Phong360Viewer({
  containerId: 'viewer-container',
  libraryData: library
});
```

### With Custom Base URL

```javascript
const viewer = new Phong360Viewer({
  containerId: 'viewer-container',
  libraryUrl: 'https://cdn.example.com/360/library.json',
  baseUrl: 'https://cdn.example.com/360/'
});
```

### WordPress Integration

```php
<?php
// Generate library from WordPress media
$library = [
  '_metadata' => [
    'version' => '2.0.0',
    'generated' => date('c')
  ],
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
    'Q50' => wp_get_attachment_image_url($id, 'medium_large')
  ];
}
?>

<script>
new Phong360Viewer({
  containerId: 'viewer-360',
  libraryData: <?= json_encode($library) ?>
});
</script>
```

## Extension Points

### Custom Metadata

Add custom fields to `_metadata`, categories, or images:

```json
{
  "_metadata": {
    "version": "2.0.0",
    "custom": {
      "author": "Your Name",
      "license": "CC BY 4.0",
      "tags": ["nature", "architecture"]
    }
  },
  "_categories": {
    "MyCategory": {
      "name": "My Category",
      "custom": {
        "featured": true,
        "order": 1
      },
      "images": [
        {
          "id": "abc123",
          "name": "Image",
          "path": "image.jpg",
          "thumbnail": "thumb.jpg",
          "Q100": "image.jpg",
          "Q75": "image.jpg",
          "Q50": "image.jpg",
          "custom": {
            "location": "Tokyo, Japan",
            "camera": "Ricoh Theta Z1",
            "date": "2024-01-15"
          }
        }
      ]
    }
  }
}
```

### Quality Levels

Add custom quality levels by extending the build script:

```python
QUALITY_LEVELS = {
    'Q100': 100,
    'Q75': 75,
    'Q50': 50,
    'Q25': 25,  # Add low quality for slow connections
    'Q90': 90   # Add custom quality
}
```

## Best Practices

1. **Use descriptive IDs**: While auto-generated IDs work, custom IDs can be more meaningful
2. **Organize logically**: Group related images in categories
3. **Optimize images**: Balance quality vs file size based on use case
4. **Include metadata**: Helps with searching and filtering
5. **Version control**: Keep library.json in git, exclude _BUILD/
6. **CDN hosting**: Serve images from CDN for better performance
7. **Lazy loading**: Use lower quality levels initially, upgrade on demand
8. **Cache headers**: Set appropriate cache headers for images and library.json

## Troubleshooting

### Common Issues

**Images not loading**
- Check path resolution and base URL
- Verify CORS headers if loading cross-origin
- Ensure image files exist at specified paths

**Library not found**
- Check libraryUrl is correct relative to page location
- Verify library.json is accessible (check network tab)
- Ensure JSON is valid (use validator)

**Slow loading**
- Use appropriate quality levels
- Enable CDN caching
- Optimize original images before processing
- Consider progressive/adaptive loading

## License

This format specification is released under MIT License and can be freely used and extended.

---

**Version**: 2.0.0  
**Last Updated**: January 2025  
**Maintained by**: Phong  
**Repository**: https://github.com/yourusername/360-viewer

