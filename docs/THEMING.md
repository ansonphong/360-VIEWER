# Theming Guide

The Phong 360 Viewer's Layer 3 UI uses CSS custom properties for all colors, spacing, and visual treatment. Switching between light and dark mode is a matter of changing variable values via the `data-theme` attribute.

---

## Theme Modes

### Auto (Default)

Follows the user's system preference via `prefers-color-scheme`:

```javascript
new Phong360LibraryUI({
    containerId: 'viewer',
    libraryUrl: 'library.json',
    theme: 'auto'
});
```

### Dark Mode

```javascript
new Phong360LibraryUI({
    containerId: 'viewer',
    libraryUrl: 'library.json',
    theme: 'dark'
});
```

### Light Mode

```javascript
new Phong360LibraryUI({
    containerId: 'viewer',
    libraryUrl: 'library.json',
    theme: 'light'
});
```

### Switching at Runtime

```javascript
viewer.setTheme('dark');
viewer.setTheme('light');
viewer.setTheme('auto');
```

### Theme from Library Context

The library.json `context.theme` field can specify a theme hint:

```json
{
  "context": {
    "type": "local",
    "title": "My Gallery",
    "theme": "dark"
  }
}
```

Priority: constructor `theme` option > `context.theme` > system default.

---

## CSS Custom Properties

All UI elements reference these variables. Override them to customize the look.

### Dark Mode (Default)

```css
:root {
  --p360-bg: #1a1a2e;
  --p360-bg-elevated: #1e1e36;
  --p360-text: #e2e8f0;
  --p360-text-muted: #94a3b8;
  --p360-text-dim: #64748b;
  --p360-border: rgba(255, 255, 255, 0.08);
  --p360-border-strong: rgba(255, 255, 255, 0.15);
  --p360-accent: #e13e13;
  --p360-accent-hover: #f06040;
  --p360-accent-active: rgba(225, 62, 19, 0.25);
  --p360-accent-border: rgba(225, 62, 19, 0.6);
  --p360-hover-bg: rgba(255, 255, 255, 0.05);
  --p360-thumbnail-radius: 4px;
  --p360-sidebar-width: 320px;
  --p360-badge-bg: rgba(0, 0, 0, 0.6);
  --p360-badge-text: #ffffff;
  --p360-overlay-bg: rgba(0, 0, 0, 0.5);
  --p360-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  --p360-transition: 0.2s ease;
}
```

### Light Mode

```css
[data-theme="light"] {
  --p360-bg: #ffffff;
  --p360-bg-elevated: #fafafa;
  --p360-text: #1e293b;
  --p360-text-muted: #64748b;
  --p360-text-dim: #94a3b8;
  --p360-border: rgba(0, 0, 0, 0.08);
  --p360-border-strong: rgba(0, 0, 0, 0.15);
  --p360-hover-bg: rgba(0, 0, 0, 0.05);
  --p360-badge-bg: rgba(255, 255, 255, 0.85);
  --p360-badge-text: #1e293b;
  --p360-overlay-bg: rgba(0, 0, 0, 0.3);
  --p360-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
```

---

## Accent Colors

### Via Constructor

```javascript
new Phong360LibraryUI({
    containerId: 'viewer',
    libraryUrl: 'library.json',
    accent: '#6366f1'
});
```

### Via Library Context

```json
{
  "context": {
    "type": "profile",
    "title": "Phong",
    "accent": "#6366f1"
  }
}
```

### Via Runtime

```javascript
viewer.setAccent('#6366f1');
```

### How It Works

When you set an accent color, the viewer automatically generates four CSS custom properties:

| Variable | Description | Example (#6366f1) |
|----------|-------------|--------------------|
| `--p360-accent` | Base accent color | `#6366f1` |
| `--p360-accent-hover` | 15% lighter for hover states | `#7e81f3` |
| `--p360-accent-active` | 25% opacity for active/selected backgrounds | `rgba(99,102,241,0.25)` |
| `--p360-accent-border` | 60% opacity for borders | `rgba(99,102,241,0.6)` |

These are used by:
- Section heading icons
- Accordion trigger icons
- Selected thumbnail outlines
- Link hover states
- Badge hover states
- Avatar card hover borders

---

## Creating a Custom Theme

### Method 1: Override CSS Variables

Add a stylesheet after `phong-360-ui.css`:

```css
/* my-theme.css */
.p360-sidebar[data-theme="dark"] {
  --p360-bg: #0d1117;
  --p360-bg-elevated: #161b22;
  --p360-text: #c9d1d9;
  --p360-text-muted: #8b949e;
  --p360-accent: #58a6ff;
  --p360-accent-hover: #79b8ff;
  --p360-accent-active: rgba(88, 166, 255, 0.25);
  --p360-accent-border: rgba(88, 166, 255, 0.6);
  --p360-border: rgba(240, 246, 252, 0.1);
  --p360-hover-bg: rgba(240, 246, 252, 0.05);
}
```

### Method 2: Custom data-theme Value

Create a new theme value and apply it:

```css
[data-theme="ocean"] {
  --p360-bg: #0a192f;
  --p360-text: #ccd6f6;
  --p360-accent: #64ffda;
  /* ... */
}
```

```javascript
viewer._sidebar.setAttribute('data-theme', 'ocean');
```

---

## Sidebar Layout

The sidebar has a fixed structure:

```
┌──────────────────────────┐
│ .p360-header             │  <- Context header (fixed)
│  - avatar + title        │
│  - subtitle              │
│  - social links          │
├──────────────────────────┤
│ .p360-content            │  <- Scrollable content area
│  - sections              │
│  - templates             │
│  - thumbnails            │
│                          │
│        (scrollable)      │
└──────────────────────────┘
```

Key layout properties:
- **Width**: `var(--p360-sidebar-width)` (default: 320px)
- **Max width**: 90vw (prevents sidebar from covering entire screen)
- **Mobile**: 100vw on screens < 480px
- **Tablet**: 80vw on screens 481-768px
- **Position**: Fixed, right-aligned, full height
- **Slide animation**: `transform: translateX(100%)` -> `translateX(0)`

---

## Phosphor Icons

Layer 3 uses [Phosphor Icons](https://phosphoricons.com/) for all UI iconography. Icons are loaded via CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css">
```

For production, host locally:

```html
<link rel="stylesheet" href="/assets/vendor/phosphor/style.css">
```

Icons inherit `color` from their parent, so they automatically adapt to the current theme.

### Common Icons Used

| Element | Icon | Class |
|---------|------|-------|
| Sidebar toggle | List | `ph ph-list` |
| Help button | Question | `ph ph-question` |
| Default section | Folder | `ph ph-folder` |
| Empty state | Image | `ph ph-image` |
| Auto-rotate | Arrows clockwise | `ph ph-arrows-clockwise` |

---

## Responsive Breakpoints

| Breakpoint | Sidebar Width | Grid Columns |
|------------|--------------|--------------|
| > 768px | 320px | auto-fill, min 120px |
| 481-768px | 80vw | auto-fill, min 120px |
| < 480px | 100vw | auto-fill, min 100px |

---

**See also:**
- [API.md](API.md) - setTheme(), setAccent() methods
- [TEMPLATES.md](TEMPLATES.md) - Template CSS classes
- [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md) - Context and theme fields

---

**Last Updated**: February 2026
**Version**: 4.0.0
