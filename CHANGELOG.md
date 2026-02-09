# Changelog

All notable changes to the Phong 360 Viewer are documented here.

This project uses [Semantic Versioning](https://semver.org/). When updating the 360-viewer submodule, check this file for breaking changes and migration steps.

## [4.1.0] - 2026-02-09

### Added
- **Info bar**: Glassmorphic bottom panel with image title, resolution, and prev/next navigation buttons. Built into the engine — no host page markup needed.
- **Resolution dropdown**: Compact button+dropdown replaces the old `<select>` element in the toolbar.
- **Help button**: Added to toolbar, dispatches `p360-help` custom event for decoupled help modals.
- **configUrl option**: Load `360-viewer.json` separately from `library.json` via `new Phong360LibraryUI({ configUrl: '360-viewer.json' })`.
- **panelWidth config**: Set sidebar width via `360-viewer.json` context (`280`-`600` px).
- **infoBar config**: Set info bar alignment (`"center"` or `"left"`) via config.
- **favicon config**: Emoji favicon rendered via canvas, configurable in `360-viewer.json`.
- **WASD keys**: W/A/S/D as aliases for arrow key panning in core viewer.
- **Double-click fullscreen**: Double-click the canvas to toggle fullscreen mode.
- **Fullscreen overlay hiding**: Sidebar toggle and info bar hidden in fullscreen via `:fullscreen` CSS.
- **Scrollable profile header**: Profile card scrolls with content (Instagram-style) instead of staying fixed.
- **Desktop sidebar persistence**: Sidebar stays open on desktop when clicking an image (closes on mobile only).
- **Deploy script templates**: PHP and Python webhook scripts in `gallery-template/deploy/`.
- **CLAUDE.md**: Project context file for Claude Code integration.
- **Claude skill**: `/create-gallery` skill with guided setup including deploy options.

### Changed
- Toolbar buttons are larger (42px, was 36px) with more padding.
- Theme toggle button uses unified `p360-toolbar-btn` class.
- Gallery template updated to match current engine patterns.
- `netlify.toml` updated: JS/CSS use `no-cache` (revalidate via ETag), only `_BUILD/` images are immutable.

### Removed
- **Toolbar spacer** element (`.p360-toolbar-spacer`).
- **Old resolution `<select>`** element (`.p360-resolution-select`).
- **`.p360-theme-toggle`** CSS class (unified into `.p360-toolbar-btn`).

### Migration Guide (from 4.0.0)

**Host page changes required:**

1. **Remove `#info-panel`** from your HTML if you had one. The engine now builds the info bar internally.

2. **Remove `onImageLoad` callback** if you were using it to update a title/format display. The info bar handles this automatically.

3. **Add `configUrl`** to your constructor call:
   ```js
   // Before:
   new Phong360LibraryUI({ containerId: 'container', libraryUrl: '...', baseUrl: '...' });

   // After:
   new Phong360LibraryUI({ containerId: 'container', libraryUrl: '...', configUrl: '360-viewer.json', baseUrl: '...' });
   ```

4. **Add `p360-help` event listener** if you have a help/instructions modal:
   ```js
   document.addEventListener('p360-help', function() {
       document.getElementById('instructions').classList.add('show');
   });
   ```

5. **Update `360-viewer.json`** with new fields:
   ```json
   {
     "context": {
       "panelWidth": 420,
       "infoBar": "center",
       "favicon": "🎨"
     }
   }
   ```

6. **Rebuild library.json** to include the new context fields:
   ```bash
   python 360-viewer/library/build_library.py --root library/ --output library/library.json --config 360-viewer.json
   ```

**CSS changes:**
- If you had custom styles targeting `.p360-theme-toggle`, `.p360-toolbar-spacer`, or `.p360-resolution-select`, remove them. These classes no longer exist.

---

## [4.0.0] - 2026-02-01

### Added
- Section-based library UI with template engine (Layer 3)
- 9 built-in template renderers: grid, feed, accordion, hero, list, carousel, avatar-row, avatar-grid, empty
- Badge system with emoji/icon support and click events
- Context-aware headers (profile, discover, local)
- Light/dark/auto theming with CSS custom properties
- Accent color customization
- Deep-linking via `?img=slug` URL parameters
- Phosphor icon integration
- Lazy loading via IntersectionObserver
- Link auto-detection (URL to platform icon)
- v4.0 library.json format with sections, slugs, badges
- `build_library.py` script for multi-resolution builds
- Gallery template starter kit

### Breaking Changes from v3.x
- Library JSON format changed from flat array to section-based structure
- Constructor API changed for Layer 3
- CSS class prefix changed to `p360-`
