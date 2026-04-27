# Changelog

All notable changes to the Phong 360 Viewer are documented here.

This project uses [Semantic Versioning](https://semver.org/). When updating the 360-viewer submodule, check this file for breaking changes and migration steps.

## [4.2.0] — 2026-04-20

### Added — Slot System

A new named-slot extension surface for chrome composition (toolbar,
info-bar, sidebar-toggle). Lets consumers customize UI without
mutating engine-owned DOM.

- **`viewer.setSlot(name, factory)`** — register a render function for a named slot
- **`viewer.clearSlot(name)`** — revert a slot to engine default
- **`viewer.renderDefault(name, slotProps?)`** — render the engine default
  inside a custom factory (composition pattern)
- **`Phong360LibraryUI.SLOT_NAMES`** — frozen array of valid slot names
- **`context.brand = { logo, label, href }`** — config-driven default for the
  `toolbar-leading` slot. Engine renders a `.p360-brand-pill` element from this
  data automatically. Consumers can still override via `setSlot`.

#### Slot inventory v1 (4 slots)

| Slot | Default | Position | slotProps |
|---|---|---|---|
| `toolbar-leading` | brand pill from `context.brand` (or empty) | First child of `.p360-toolbar` | `{ context }` |
| `info-bar-leading` | empty | Between prev arrow and title in `.p360-info-bar` | `{ context, imageData }` |
| `info-bar-trailing` | empty | Between title and next arrow in `.p360-info-bar` | `{ context, imageData }` |
| `sidebar-toggle-icon` | state-aware `ph-list` (closed) / `ph-caret-right` (open) | Inside `.p360-sidebar-toggle` | `{ context, isOpen }` |

#### Behavior change (opt-in, via `context.suppressHeader`)

When `context.suppressHeader === true` AND `context.type` is `discover` or
`local`, the engine skips emitting the legacy `<h2 class="p360-header-title">`
inside `.p360-header`. Intended for consumers whose `toolbar-leading` slot
already carries the page heading. Independent of `context.brand` —
setting `brand` alone does NOT trigger header suppression. Consumers without
`suppressHeader` see the legacy header rendering unchanged.

### Changed

- `_updateToggleIcon()` no longer rewrites `this._toggle.innerHTML` directly;
  it delegates icon rendering to `_renderSlot('sidebar-toggle-icon')`. Button
  attributes (title, aria-label, aria-expanded) are still owned by the engine.
  **Observable behavior for consumers: unchanged** unless they register a
  custom `sidebar-toggle-icon` slot factory.

### Added (docs)

- `docs/API.md` "Slots" section
- `docs/LIBRARY-FORMAT.md` `context.brand` and `context.suppressHeader` fields
- `tests/slot-system.html` manual visual smoke test

## Unreleased

### Added

- **`urlSync` constructor option** on `Phong360LibraryUI`. Accepts `true` (default, legacy `?img=<slug>` behavior), `false` (disable both directions), or `{read?, write?}` for per-direction override. The `write` formatter receives the image object and may return a URL string (→ `pushState`), `{url, replace: true}` (→ `replaceState`), or `null`/`undefined` (skip). See `docs/API.md` and `README.md`.
- **`controls.enableZoom` config option** on `Phong360ViewerCore` (default `true`). When set to `false`, the mouse wheel and two-finger pinch no longer zoom the panorama — wheel events bubble up so the host page scrolls normally over the canvas. Drag-to-pan, keyboard pan, and auto-rotate are unaffected. Useful for embedded hero viewers where the canvas shouldn't trap page scrolling. Pass via `new Phong360ViewerCore({ config: { controls: { enableZoom: false } } })`.
- **`controls.enablePan` config option** on `Phong360ViewerCore` (default `true`). When set to `false`, mouse drag, single-finger touch drag, and keyboard arrow/WASD pan are all disabled — the touch/pointer events bubble so the host page can scroll over the canvas. Pinch-zoom (gated by `enableZoom`) and auto-rotate are unaffected, so the inverse of `enableZoom: false` (`enablePan: false, enableZoom: true`) gives a "watch but don't drive" mobile hero where the user sees the panorama auto-rotate, can pinch to zoom, but can still scroll the page with a single-finger drag.
- **`loading.showSpinner` config option** on `Phong360ViewerCore` (default `true`). When `false`, the engine-created loading overlay no longer contains the spinning indicator — the overlay itself remains so fade-through-black transitions still work, but it's empty / just an opaque colored fill. No-op for host-provided overlays (host owns inner content). Use for marketing/hero viewers where a UI spinner breaks the cinematic effect. Pass via `new Phong360ViewerCore({ config: { loading: { showSpinner: false } } })`.
- **`loading` config block** on `Phong360ViewerCore` with three fields: `backgroundColor` (default `'#000'`), `fadeInDuration` (default `500` ms), `fadeOutDuration` (default `500` ms). Drives the overlay color, the canvas inline backing color, `scene.background`, and `renderer.setClearColor` — so all four match the documented "canvas + overlay backing" contract. Set durations to `0` to disable fading.
- **Fade-through-black transitions for `loadImage()`** on subsequent calls. The first call still uses the original "overlay opaque from start, fade out when ready" flow; second-and-later calls now fade the overlay IN before swapping the texture, hold during network, then fade OUT — eliminating the snap-cut between panoramas. Configurable via `loading.fadeInDuration` (set `0` to restore snap behavior).
- **`phong-360-loaded` CustomEvent** dispatched from the viewer container after the overlay fade-out completes (i.e., when the new panorama is fully visible to the user). `event.detail = { url }`. Bubbles. Useful for host pages that need to coordinate UI (caption fade-in, auto-rotate kickoff, analytics).
- **Container-scoped loading overlay**. `createLoadingOverlay` now uses `container.querySelector('#loading-overlay')` instead of a global `document.getElementById`, so multiple viewers on the same page each have their own overlay. Engine-created overlays are children of the viewer container (not `document.body`), `position: absolute; inset: 0`. Host-provided overlays (placed inside the viewer container) are still respected — engine writes transition + background inline so config wins. Spinner `@keyframes` are auto-injected to `<head>` once globally.

### Changed

- **URL write hook moved from `onImageClick` to the unified `_onImageLoaded` path.** Previously only sidebar clicks updated the URL; now prev/next navigation and autoload also fire the write hook. Default URL format (`?img=<slug>`) is unchanged. Consumers that depended on prev/next NOT writing the URL can restore old behavior by passing `urlSync: { write: () => null }` and updating the URL from their own click handler, but this should only be required for edge cases.
- **`loadImage()` concurrency model: latest-wins.** Previously concurrent calls during a load were silently ignored (`isLoading` guard). Now each call increments a load token; stale completions discard their loaded texture and bail. Rapid clicks no longer lock the user out for the (now longer) transition window. Consumers should still `await` the returned Promise if they care about completion of a specific call.
- **`hideLoading()` returns a Promise** that resolves after the fade-out completes. (Was previously `void`.)
- **Old texture disposal moved from before-fetch to swap-time** (inside `applyTexture`). Keeps the previous panorama valid through the full fade-in + network window so failed loads can fade back out cleanly and the fade-in mask covers a still-valid image.
- **`destroy()` honors overlay ownership**: only removes overlays the engine itself created (tracked via internal `_ownsOverlay` flag). Host-provided overlays are left in place.

### Fixed

- **White flash on first paint** of `Phong360ViewerCore` instances. `setupScene()` now calls `renderer.clear()` synchronously after canvas append, guaranteeing the GL drawing buffer is the configured color before any browser paint can occur. The `animate()` loop also clears every frame when no material is present (previously it skipped `render()` entirely until the texture loaded, leaving the WebGL drawing buffer in its uninitialized state — which composited as white on some Windows GPU/browser combinations). The canvas DOM element also gets an inline `background-color` matching `loading.backgroundColor`.
- **Multi-viewer overlay collision** on pages with two or more `Phong360ViewerCore` instances. Each viewer now owns its own scoped overlay; the global `#loading-overlay` lookup that previously caused viewers to share state is gone.

### Removed

- Private method `_updateURL(idOrSlug)`. Underscore-prefixed internal API — out-of-tree consumers should migrate to `urlSync: { write: fn }`.

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
   new Phong360LibraryUI({
   	containerId: 'container',
   	libraryUrl: '...',
   	configUrl: '360-viewer.json',
   	baseUrl: '...'
   });
   ```

4. **Add `p360-help` event listener** if you have a help/instructions modal:

   ```js
   document.addEventListener('p360-help', function () {
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
