# Template System

Layer 3 of the Phong 360 Viewer includes a pluggable template engine with 9 built-in renderers. Each section in the library.json specifies which template to use for rendering its content.

---

## How It Works

1. Each section in `library.json` has a `template` field (defaults to `"grid"`)
2. The `TemplateEngine` maps template names to renderer classes
3. Each renderer extends `BaseRenderer` and implements a `render()` method
4. The rendered DOM element is inserted into the sidebar

```json
{
  "sections": [
    {
      "id": "landscapes",
      "title": "Landscapes",
      "template": "accordion",
      "icon": "mountains",
      "images": [...]
    }
  ]
}
```

---

## Built-in Templates

### grid

Responsive thumbnail grid. Auto-calculates columns based on container width.

```
 Sci-Fi Worlds                    (8)
 ┌────┐ ┌────┐ ┌────┐
 │    │ │    │ │    │
 └────┘ └────┘ └────┘
 ┌────┐ ┌────┐ ┌────┐
 │    │ │    │ │    │
 └────┘ └────┘ └────┘
```

**CSS classes**: `.p360-grid`, `.p360-thumbnail`

**Behavior**: Uses CSS `grid-template-columns: repeat(auto-fill, minmax(120px, 1fr))` for automatic responsive layout. Thumbnails have 2:1 aspect ratio with hover zoom effect.

**Section config**:

```json
{
  "template": "grid",
  "images": [...]
}
```

---

### feed

Vertical list of larger thumbnails with title and metadata.

```
 Recently Published
 ┌────────────────────────┐
 │                        │
 │     Neon City          │
 │     by Phong           │
 └────────────────────────┘
 ┌────────────────────────┐
 │                        │
 │     Space Station      │
 └────────────────────────┘
```

**CSS classes**: `.p360-feed`, `.p360-feed-item`, `.p360-feed-item-info`, `.p360-feed-item-title`, `.p360-feed-item-meta`

**Behavior**: Each image gets a larger thumbnail with title below. Shows creator name from `image.metadata.creator` or `image.creator`. Badges rendered on thumbnails.

**Section config**:

```json
{
  "template": "feed",
  "images": [...]
}
```

---

### accordion

Collapsible section with a trigger button and inner content rendered by another template (composable).

```
 > Nature Scenes                 (15)    <- collapsed
 v Sci-Fi Worlds                  (8)    <- expanded
   ┌────┐ ┌────┐ ┌────┐
   │    │ │    │ │    │
   └────┘ └────┘ └────┘
```

**CSS classes**: `.p360-accordion`, `.p360-accordion-trigger`, `.p360-accordion-body`, `.p360-accordion-inner`, `.p360-accordion-chevron`, `.p360-accordion--open`

**Behavior**: Clicking the trigger toggles `.p360-accordion--open`. Inner content is rendered using the `innerTemplate` field (defaults to `"grid"`). Chevron rotates on open/close.

**Section config**:

```json
{
  "template": "accordion",
  "icon": "folder",
  "defaultOpen": true,
  "innerTemplate": "grid",
  "images": [...]
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultOpen` | boolean | `true` | Whether accordion starts expanded |
| `innerTemplate` | string | `"grid"` | Template for inner content |

---

### hero

Single large featured image with overlay text and gradient.

```
 Featured
 ┌────────────────────────────┐
 │                            │
 │                            │
 │      Cosmic Nebula         │
 │      A journey through...  │
 └────────────────────────────┘
```

**CSS classes**: `.p360-hero`, `.p360-hero-overlay`, `.p360-hero-title`, `.p360-hero-subtitle`

**Behavior**: Renders only the first image from the section. Shows title and description overlay with gradient background. 16:9 aspect ratio.

**Section config**:

```json
{
  "template": "hero",
  "images": [
    {
      "id": "featured-1",
      "title": "Cosmic Nebula",
      "description": "A journey through space",
      "thumbnail": { "path": "..." },
      "resolutions": [...]
    }
  ]
}
```

---

### list

Compact vertical list with small thumbnails and titles.

```
 Search Results
 [thumb] Neon City
 [thumb] Space Station
 [thumb] Forest Path
 [thumb] Ocean Sunset
```

**CSS classes**: `.p360-list`, `.p360-list-item`, `.p360-list-item-thumb`, `.p360-list-item-info`, `.p360-list-item-title`, `.p360-list-item-meta`, `.p360-list-item--selected`

**Behavior**: Each image gets a 64x32px thumbnail on the left with title and optional creator name. Selected items get accent border highlight.

**Section config**:

```json
{
  "template": "list",
  "images": [...]
}
```

---

### carousel

Horizontal scrolling strip with scroll-snap.

```
 Trending
 ┌────┐ ┌────┐ ┌────┐ ┌──
 │    │ │    │ │    │ │
 └────┘ └────┘ └────┘ └──
            <- swipe ->
```

**CSS classes**: `.p360-carousel`, `.p360-carousel-track`, `.p360-carousel-item`

**Behavior**: Horizontal scrolling with `scroll-snap-type: x mandatory`. Each item is 200x100px. Scrollbar is hidden. Uses standard thumbnails inside.

**Section config**:

```json
{
  "template": "carousel",
  "images": [...]
}
```

---

### avatar-row

Horizontal row of circular avatars. Designed for non-image content like user/creator cards.

```
 Active Creators
 (O) Phong  (O) AJ  (O) Max
```

**CSS classes**: `.p360-avatar-row`, `.p360-avatar-item`, `.p360-avatar`, `.p360-avatar-name`

**Behavior**: Uses `items` array (or falls back to `images`). Each item shows a circular 56x56px avatar and name. Clicking navigates to `item.url` (via `onLinkClick` callback) or loads the image if `item.id` exists.

**Section config**:

```json
{
  "template": "avatar-row",
  "items": [
    { "name": "Phong", "avatar": "/avatars/phong.jpg", "url": "/u/phong" },
    { "name": "AJ", "avatar": "/avatars/aj.jpg", "url": "/u/aj" }
  ]
}
```

---

### avatar-grid

Grid of avatar cards with name and image count.

```
 All Creators
 ┌─────┐ ┌─────┐ ┌─────┐
 │ (O) │ │ (O) │ │ (O) │
 │Phong│ │ AJ  │ │ Max │
 │47img│ │23img│ │12img│
 └─────┘ └─────┘ └─────┘
```

**CSS classes**: `.p360-avatar-grid`, `.p360-avatar-card`, `.p360-avatar-card-name`, `.p360-avatar-card-meta`

**Behavior**: Grid layout using `grid-template-columns: repeat(auto-fill, minmax(100px, 1fr))`. Shows avatar, name, and image count from `item.count` or `item.imageCount`.

**Section config**:

```json
{
  "template": "avatar-grid",
  "items": [
    { "name": "Phong", "avatar": "/avatars/phong.jpg", "count": 47, "url": "/u/phong" }
  ]
}
```

---

### empty

Placeholder for empty sections.

```
         [icon]
     No images yet
  This gallery is empty.
```

**CSS classes**: `.p360-empty-state`, `.p360-empty-state-title`, `.p360-empty-state-message`

**Behavior**: Shows a Phosphor icon, title text, and optional message. Automatically shown when a section has no images.

**Section config**:

```json
{
  "template": "empty",
  "title": "No images yet",
  "icon": "image",
  "message": "Upload your first 360 image to get started."
}
```

---

## Custom Templates

Register a custom template renderer:

```javascript
class MyCustomRenderer extends BaseRenderer {
    render() {
        const el = document.createElement('div');
        el.className = 'my-custom-template';

        for (const image of (this.section.images || [])) {
            // createThumbnail() handles lazy loading, badges, and click events
            const thumb = this.createThumbnail(image);
            el.appendChild(thumb);
        }

        return el;
    }
}

// Register after viewer creation
viewer.templateEngine.register('my-custom', MyCustomRenderer);
```

Then use it in library.json:

```json
{
  "id": "my-section",
  "title": "Custom Section",
  "template": "my-custom",
  "images": [...]
}
```

### BaseRenderer Helpers

All renderers inherit these methods from `BaseRenderer`:

| Method | Returns | Description |
|--------|---------|-------------|
| `createSectionHeading()` | HTMLElement | Section heading with icon, title, count, chevron |
| `createThumbnail(image)` | HTMLElement | Thumbnail with lazy-loading `data-src`, badges, click handler |
| `_renderBadges(el, badges)` | void | Renders badge overlays (max 3 shown) |
| `_formatCount(n)` | string | "42", "1.5K", "2.3M" |
| `_resolvePath(path)` | string | Prepends baseUrl to relative paths |
| `_resolveIcon(name)` | string | Converts "folder" to "ph ph-folder" |

---

## Section Object Reference

Full section object shape used by all templates:

```javascript
{
    id: string,             // Section identifier
    title: string,          // Display title
    template: string,       // Template name (default: 'grid')
    icon: string,           // Phosphor icon name (e.g. 'folder', 'fire')
    images: Array,          // Array of image objects
    items: Array,           // Array of item objects (for avatar templates)
    collapsible: boolean,   // Enable collapse toggle (default: true for non-accordion)
    collapsed: boolean,     // Start collapsed (default: false)
    defaultOpen: boolean,   // Start expanded (accordion only, default: true)
    innerTemplate: string,  // Inner template for accordion (default: 'grid')
    badge: number|object,   // Section-level badge count
    message: string,        // Message for empty-state template
}
```

---

**See also:**
- [API.md](API.md) - Full API reference
- [THEMING.md](THEMING.md) - Styling and theming
- [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md) - Library format specification

---

**Last Updated**: February 2026
**Version**: 4.0.0
