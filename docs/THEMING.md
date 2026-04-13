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

The 768px boundary is the source of truth in JS as
`Phong360LibraryUI.MOBILE_BREAKPOINT`. CSS `@media` queries in
`css/phong-360-ui.css` mirror this value — if you change one, change both.

---

## Override Slot — Skinning Without Forking

The viewer is designed to be re-skinned by consumers without modifying the
vendored source. The pattern:

1. **Load `phong-360-ui.css` first** in your host page.
2. **Load your own override stylesheet immediately after**, e.g.
   `<link rel="stylesheet" href="my-viewer-overrides.css">`.
3. **In your override file, set CSS custom properties** scoped to the elements
   you want to skin. The viewer's default values are no-ops where possible
   (no blur, no extra borders), so any property you don't set falls back to
   the existing visual.

### Example: smoked-glass desktop sidebar

```css
@media (min-width: 769px) {
  .p360-sidebar[data-theme="dark"] {
    --p360-sidebar-bg: rgba(12, 14, 20, 0.62);
    --p360-sidebar-backdrop-filter: blur(28px) saturate(160%);
    --p360-sidebar-border-left: 1px solid rgba(255, 255, 255, 0.08);
  }
}
```

### Hookable Variables

Per-component surface hooks (set on the component selector, not `:root`,
to scope cleanly):

| Component               | Variables                                                                                 |
|-------------------------|--------------------------------------------------------------------------------------------|
| `.p360-sidebar`         | `--p360-sidebar-bg`, `--p360-sidebar-backdrop-filter`, `--p360-sidebar-border-left`        |
| `.p360-toolbar`         | `--p360-toolbar-bg`, `--p360-toolbar-border-bottom`, `--p360-toolbar-backdrop-filter`      |
| `.p360-info-bar`        | `--p360-info-bar-bg`, `--p360-info-bar-border`, `--p360-info-bar-backdrop-filter`          |
| `.p360-sidebar-toggle`  | `--p360-toggle-btn-bg`, `--p360-toggle-btn-border`, `--p360-toggle-btn-backdrop-filter`    |

Global theme variables (`--p360-bg`, `--p360-text`, `--p360-accent`, etc.)
are defined on `:root` and apply across all components — set those for
broad theme changes, set per-component hooks for surface-only changes.

### Why scope to the component selector, not `:root`?

Setting `--p360-sidebar-bg` on `:root` would technically work, but scoping
it to `.p360-sidebar[data-theme="dark"]` (or similar) gives you free
dark/light variants and prevents the variable from leaking to unrelated
selectors that might consume it later.

---

**See also:**
- [API.md](API.md) - setTheme(), setAccent() methods
- [TEMPLATES.md](TEMPLATES.md) - Template CSS classes
- [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md) - Context and theme fields

---

**Last Updated**: April 2026
**Version**: 4.0.0
