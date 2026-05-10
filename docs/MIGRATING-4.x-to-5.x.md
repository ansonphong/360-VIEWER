# Migrating from 4.x to 5.x — DRAFT

**Status:** DRAFT — final version in `packages/library-ui/MIGRATING-4.x-to-5.x.md` (Phase 7)

## Breaking Changes

### 1. Owner Mode Removed from Library-UI
All owner-mode functionality (`_openThumbnailMenu`, `_openCollectionMenu`,
`_injectOwnerHeaderMenu`, `_renderInlineForm`, `_renderConfirmDialog`,
`_renderMovePicker`, drag handlers, selection helpers, optimistic mutations)
has been removed from `Phong360LibraryUI`. Gallery consumers must implement
owner UI at Tier 2 (Alpine + Jinja). See 360-HEXTILE-GALLERY for reference.

### 2. `legacyOwnerMode` Flag Removed
The `legacyOwnerMode` constructor option and `GALLERY_LEGACY_OWNER_MODE`
environment flag are deleted. Owner mode is always gallery-owned.

### 3. Model Filter Moved to Gallery
`_buildModelFilter` is gated behind `legacyModelFilter` option (default `true`).
Set `legacyModelFilter: false` to opt out; gallery now owns `#arch=`/`#model=`
hash sync via `modules/model-filter.js`.

### 4. `image:visible` Event Timing
`image:visible` now fires AFTER GPU upload completes (not on eager fetch).
View tracking keys off `image:visible` + 3s dwell (was `onImageLoad`).

### 5. Decorator API
- `addThumbnailDecorator(fn)` — runs after every thumbnail render
- `addSectionHeadingDecorator(fn)` — runs after every heading render
- `addSidebarSection(spec)` — inject custom sidebar section
- `setInfoBarSlot(position, el)` — inject info-bar content
- `addToolbarButton(spec)` — inject toolbar button
- Memory bounds: warn at 20/kind, hard-cap at 100/kind
- Decorators are idempotent via `data-p360-decorator-id`

### 6. Public Engine API
- `getContext()`, `getSections()`, `getImages()`, `getLibraryData()`, `getCurrentImage()`
- `setAutoRotate(bool)`, `getAutoRotate()`, `setAccent(hex)`
- `setProjection(id)` (`'gnomonic'`|`'stereographic'`)
- `getResolution()`, `setResolution()`, `getResolutionMode()`, `getAvailableResolutions()`
- `setTheme(id)` (`'dark'`|`'light'`|`'auto'`)
- Event system: `on(name, fn)`, `off(name, fn)`, `emit(name, payload)`

### 7. CSS Variable Contract
All theme variables use `--p360-*` prefix. Gallery CSS (`viewer-chrome.css`,
`viewer-glass-overrides.css`) extends these. Do not override `--p360-*` in
Tier 1 consumers without documenting.

### 8. Constructor Signature Unchanged
`new Phong360LibraryUI({ containerId, libraryUrl, configUrl, baseUrl, theme, ... })`
is backward-compatible through Phase 5. Phase 6 replaces with `Phong360Engine`.

### 9. `updateBadges()` Removed
Gallery renders its own badge nodes via `reaction-bridge`/`badge-sync` modules.
Do not call `viewer.updateBadges(imageId, badges)`.

### 10. `gallery-integration.js` Deleted
Gallery integration class is deleted. All functionality moved to:
- `viewer-bootstrap.js` — engine construction + event bridge
- `modules/*.js` — reaction-bridge, badge-sync, dropup-menu, model-filter, mobile-toolbar, url-sync, tag-editor, view-tracking, owner-state, owner-actions
- `alpine/*.js` — owner-sidebar, toolbar, info-bar, dropup-menu, help-modal, owner-menu, inline-form
- `templates/viewer/*.html` — _sidebar, _toolbar, _info_bar, _reaction_picker, _dropup_menu, _help_modal, _owner_menu, _inline_form

## Framework Neutrality
The engine never imports Alpine, React, Vue, or Svelte. The library-ui never
imports a framework either. Alpine is gallery-only (Tier 2).

## Tier 1 vs Tier 2
- **Tier 1** (`@phong/360-library-ui`): Batteries-included sidebar/toolbar/info-bar
- **Tier 2** (360-HEXTILE-GALLERY, 360-HEXTILE-WWW): Owns 100% of UI, consumes
  `@phong/360-engine` only

## Migration Checklist
1. Replace `viewer.callbacks.onImageLoad` with `engine.on('image:visible', ...)`
2. Replace all `viewer._*` private DOM accesses with engine API calls
3. Set `legacyModelFilter: false` and implement gallery-side model filtering
4. Remove `legacyOwnerMode` flag; use gallery Alpine components for owner UI
5. Update view tracking to key off `engine:image-visible` + dwell
6. Replace `new Phong360LibraryUI({...})` → `new Phong360Engine({...})` (Phase 6)
