# Phong360Engine — Public API Contract (v5.0)

**Status:** Locked (Phase 1 gate)
**Version:** 5.0.0-alpha.1
**Repo:** 360-VIEWER → `@phong/360-engine`
**Derived from:** `plans/meta/2026-05-05-viewer-gallery-split/00-design.md`

This document is the authoritative contract for the `Phong360Engine` public surface. Every method, event, type, and CSS variable listed here is covered by tests. Changes to this surface follow semver: removing or renaming is a major bump; adding is minor; bug fixes that do not change observable timing are patch.

---

## EngineOptions

```ts
interface EngineOptions {
  container: string | HTMLElement;       // CSS selector or element to mount the canvas into
  libraryUrl?: string;                   // initial library.json URL (optional — can call loadLibrary later)
  projection?: 'gnomonic' | 'stereographic';  // default 'gnomonic'
  resolution?: string | 'auto';          // default 'auto' (picks highest available)
  theme?: 'auto' | 'light' | 'dark';     // default 'auto'. Engine only sets CSS vars; does NOT persist.
  accent?: string | null;                // default null (uses brand default)
  autoRotate?: boolean;                  // default false. Engine does NOT read from localStorage — consumer seeds this.
  autoRotationRate?: number;             // default matches current core. Preserves WWW hero/background rotation-rate tuning.
  fov?: { init: number; initTarget: number };  // initial field-of-view
  controls?: { enableZoom?: boolean; enablePan?: boolean }; // default both true. Preserves current Core config.controls used by WWW hero viewers.
  transition?: { fadeInDuration?: number; fadeOutDuration?: number }; // canvas image cross-fade timing only; no spinner/loader UI.
  keyboardShortcuts?: boolean;           // default true. Set false to suppress engine keybinds (e.g. during owner edit mode).
}
```

Tests: `dev/test/test-controls.js` — constructor-option coverage.

---

## Phong360Engine class

```ts
class Phong360Engine {
  // Lifecycle
  constructor(opts: EngineOptions);
  destroy(): void;                                      // disposes Three.js renderer, removes canvas, removes all DOM children of container, removes all event listeners, cancels in-flight fetches, nulls internal refs. Safe to call at any lifecycle stage (before loadLibrary, mid-load, after errors). Idempotent.
  loadLibrary(url: string | LibraryManifest): Promise<void>;  // fetches + parses; stores URL for reloadLibrary()
  reloadLibrary(): Promise<void>;                       // LOCAL re-apply of last library state. If loadLibrary(url) was last, re-fetches that URL. If setLibrary(manifest) was last, re-applies that in-memory manifest — does NOT fabricate a URL or fetch from the server. For an explicit server refresh after setLibrary(), call loadLibrary(url) directly.
  setLibrary(manifest: LibraryManifest): void;          // imperative replacement (used by owner overlays). PREEMPTS any in-flight loadLibrary(): the in-flight fetch is cancelled, its promise resolves (not rejects), and library:load fires for the new manifest. Does NOT change the URL that reloadLibrary() would re-fetch.
  getLibraryData(): LibraryManifest | null;
  getContext(): LibraryContext | null;                   // manifest context/profile/discover metadata (data only, no DOM)
  getSections(): SectionData[];                          // parsed sections, no DOM nodes. SectionData: { id, title, template, collapsible, collapsed, images: ImageData[], items, badge }
  getImages(): ImageData[];                              // flattened parsed image list. ImageData shapes match library.json v4 image items (id, title, slug, shortId, thumbnail, resolutions, badges, tags, model, creator, etc.)

  // Image control
  getCurrentImage(): ImageData | null;                  // returns the last SUCCESSFULLY DISPLAYED image. After image:error, this still returns the previously visible image, not the failed one. Returns null after loadImage(url) (raw URL loads have no ImageData) — consumers must track raw URLs themselves.
  selectImage(idOrSlug: string): Promise<void>;         // last-write-wins concurrency. If a previous load is in flight, the engine cancels its texture fetch, the previous promise RESOLVES (does not reject), and only events from the new selection fire downstream. No ghost image:visible from the superseded load. Requires a manifest to be loaded (via loadLibrary/setLibrary) — throws if no library data exists.
  loadImage(url: string): Promise<void>;                // RAW PANORAMA URL — loads an equirectangular image directly without a manifest. No ImageData generated; image:visible payload is { url }. Use this when the consumer has its own image catalog (e.g. WWW hero thumbnails). Does NOT change the current manifest selection — next()/prev() still navigate the library, not raw URLs. Does not fire image:select (no manifest item to select). Fires image:load-request + image:visible with { url } payload. Last-write-wins concurrency applies.
  next(): Promise<void>;
  prev(): Promise<void>;

  // Loading state queries (synchronous, for late-mounting consumers that missed loading:start)
  isLoading(): boolean;
  getLoadingPhase(): 'idle' | 'library' | 'image';

  // View control
  setProjection(projection: 'gnomonic' | 'stereographic'): void;
  getProjection(): 'gnomonic' | 'stereographic';
  setResolution(level: string | 'auto'): Promise<void>; // ids match manifest variants ('2k'/'4k'/'8k'). When 'auto', engine picks the highest available resolution.
  getResolution(): string;                               // returns the actual active resolution id (e.g. '4k'), never 'auto'. Use getResolutionMode() to check if auto mode is active.
  getResolutionMode(): 'auto' | 'manual';                // whether the engine is currently in auto-resolution mode
  getAvailableResolutions(): {id: string, label: string, width: number, height: number}[];  // all resolution variants from the current image's manifest entry. Returns [] until the first image:visible has fired — consumers (e.g. gallery mobile kebab) must defer rendering the resolution sub-menu until after the first image is visible.
  setTheme(theme: 'auto' | 'light' | 'dark'): void;     // sets CSS variables on container; engine has no chrome. Does NOT persist to localStorage — the consumer (gallery or library-ui) owns persistence.
  setAccent(color: string | null): void;                 // CSS variable bridge only. Sets --p360-accent on container.
  setAutoRotate(enabled: boolean): void;                 // starts/stops auto-rotation. Engine reads initial state from opts.autoRotate (default false); does NOT read from localStorage — the consumer seeds the option.
  getAutoRotate(): boolean;
  setFullscreen(on: boolean): Promise<void>;

  // Events
  on<E extends EngineEvent>(event: E, handler: EventHandler<E>): () => void;
  off<E extends EngineEvent>(event: E, handler: EventHandler<E>): void;
  emit(event: string, payload?: any): void;             // public for app custom events

  // DOM access (read-only — for consumers that need to mount UI relative to canvas)
  readonly container: HTMLElement;
  readonly canvas: HTMLCanvasElement;
}
```

Tests:
- Lifecycle: `dev/test/test-controls.js` (destroy, fullscreen, selectImage, loadLibrary/reloadLibrary/setLibrary, loadImage)
- Accessors: `dev/test/test-accessors.js` (getContext, getSections, getImages, getLibraryData, getCurrentImage)
- Events: `dev/test/test-event-emitter.js` (on/off/emit)
- Image timing: `dev/test/test-image-visible-timing.js` (selectImage concurrency, loadImage raw URL path, event chain ordering)

---

## EngineEvent type enum

```ts
type EngineEvent =
  | 'ready'                 // engine mounted, canvas in DOM, ready for loadLibrary()
  | 'loading:start'         // a network fetch or texture load has begun. payload: { source: 'library' | 'image', url?: string }
  | 'loading:progress'      // optional progress update. payload: { source: 'library' | 'image', loaded: number, total?: number }
  | 'loading:end'           // a network fetch or texture load has completed (success or error). payload: { source: 'library' | 'image', success: boolean }
  | 'library:load'          // manifest parsed successfully. payload: { manifest: LibraryManifest, context: LibraryContext, sections: SectionData[], images: ImageData[], facets: FacetsData }
  | 'library:error'         // manifest fetch/parse failed. payload: { error: string, url: string, status?: number, code: 'network' | 'auth' | 'parse' | 'timeout' | 'unknown' }
  | 'context:ready'         // context parsed and theme/projection/resolution seeded. Fires AFTER library:load. payload: LibraryContext
  | 'image:select'          // selection changed (id/data only — texture not yet loaded). payload: ImageData
  | 'image:load-request'    // texture load handed to renderer. payload: { image?: ImageData, resolution?: string, url?: string }. image+resolution for manifest loads; url for raw loadImage(url) calls.
  | 'image:visible'         // texture loaded + fade complete. payload: { image?: ImageData, resolution?: string, url?: string }. Same dual shape — manifest loads get image+resolution; raw URL loads get url only.
  | 'image:error'           // texture load failed. payload: { image?: ImageData, error: string, url?: string }
  | 'resolution:change'     // payload: { id: string, label: string }
  | 'projection:change'     // payload: { projection: 'gnomonic' | 'stereographic' }
  | 'theme:change'          // payload: { resolved: 'light' | 'dark', choice: 'auto' | 'light' | 'dark' }
  | 'accent:change'         // payload: { color: string | null }
  | 'autorotate:change'     // payload: { enabled: boolean }
  | 'fullscreen:change';    // payload: { isFullscreen: boolean }
```

Tests: `dev/test/test-event-emitter.js` (emit/on/off), `dev/test/test-image-visible-timing.js` (complete event chain ordering), `dev/test/test-controls.js` (state-change events: projection, theme, accent, autorotate, fullscreen, resolution).

---

## Engine data types

```ts
interface LibraryManifest {
  version: 4;
  context?: LibraryContext;
  sections: SectionData[];
  facets?: FacetsData;
  // Other library.json v4 fields passed through unchanged.
}

interface LibraryContext {
  scope?: 'discover' | 'profile' | 'image' | 'collection' | 'tag';
  profile?: { username: string; displayName?: string; avatarUrl?: string; bio?: string };
  collection?: { id: string; title: string; slug?: string; cover?: string };
  brand?: { logo?: string; label?: string; href?: string };  // library-ui-only consumer (Tier 1 toolbar-leading slot). Engine exposes the field; it does NOT render it. Gallery ignores brand and renders its own brand pill.
  theme?: { default?: 'auto' | 'light' | 'dark'; accent?: string };
  projection?: 'gnomonic' | 'stereographic';
  // Server-side metadata (counts, dates, etc.) passed through unchanged.
}

interface SectionData {
  id: string;
  title: string;
  template?: 'default' | 'teaser' | 'grid' | string;
  collapsible: boolean;
  collapsed: boolean;
  badge?: { label: string; color?: string };
  images: ImageData[];
  items?: any[];                           // non-image items (rare, schema-defined)
}

interface ImageData {
  id: string;
  shortId?: string;
  slug?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  thumbnail: string;                       // absolute URL — already resolved against manifest baseUrl by the engine
  resolutions: { id: string; label: string; width: number; height: number; url: string }[];
  badges?: { label: string; color?: string }[];
  tags?: string[];
  model?: { name: string; arch?: string; version?: string };
  creator?: { username: string; displayName?: string; avatarUrl?: string };
  reactionCount?: number;                  // server-rendered hint; gallery may override with its own reaction store
  viewCount?: number;
  createdAt?: string;                      // ISO 8601
  updatedAt?: string;
}

interface FacetsData {
  model?: { id: string; label: string; count: number }[];
  arch?: { id: string; label: string; count: number }[];
  tag?: { id: string; label: string; count: number }[];
}
```

These shapes are normative for the engine API. Adding fields is a minor version. Removing or renaming fields is a major version.

Tests: `dev/test/test-accessors.js` — accessor return shapes match these types; defensive copies confirmed.

---

## Engine CSS variable contract

The engine sets the following CSS custom properties AND a `data-theme` attribute on its container element. Consumers can read both for their own UI theming, but the engine never styles UI beyond the canvas:

```
--p360-accent            // set via setAccent(), e.g. '#e13e13'
--p360-canvas-bg         // canvas background color (resolved from theme)
data-theme="light|dark"  // resolved theme attribute on container — gallery and library-ui CSS selectors target this
```

The engine sets `data-theme` on its CONTAINER (not `<html>`) on every `theme:change`, so the gallery's chrome and the canvas can theme independently if needed. Gallery CSS targets `[data-theme="dark"]` on `<html>` for chrome and may target the container's attribute for any chrome rendered inside the engine container.

At minimum the engine needs no other CSS. The container size is the consumer's responsibility; the engine observes its container via ResizeObserver and sizes the canvas accordingly. The engine calls `renderer.setSize()` on every ResizeObserver entry that reports non-zero dimensions; entries reporting 0x0 (e.g. `display:none` parent, off-screen tab panel) are queued and replayed on the first non-zero entry — Three.js is never asked to size to zero.

Tests: `dev/test/test-controls.js` — `setTheme()` sets `--p360-canvas-bg` and `data-theme` attribute on container; `setAccent()` sets `--p360-accent`.

---

## Event-ordering guarantee

Every `loadLibrary` / `selectImage` cycle:

```
ready → loading:start(source:'library') → loading:progress* → library:load → context:ready → loading:end(source:'library')
                                                                                       ↓
image:select → loading:start(source:'image') → image:load-request → loading:progress* → image:visible → loading:end(source:'image')
```

Event timing details:

| Event | When | Cardinality |
|---|---|---|
| `ready` | Engine mounted, canvas in DOM, ready for `loadLibrary()` | Fires exactly once |
| `loading:start` | A network fetch or texture load has begun. `source` is `'library'` (manifest fetch) or `'image'` (texture load) | Once per load cycle |
| `loading:progress` | OPTIONAL progress update (useful for large manifests or slow connections) | Zero or more |
| `loading:end` | A load cycle completed (success or error). `source` matches the corresponding `loading:start` | Once per load cycle |
| `library:load` | Manifest parsed successfully. Payload includes all parsed data | Once per successful manifest load |
| `library:error` | Manifest fetch/parse failed. Engine remains in ready state; consumer can retry | Once per failed manifest load |
| `context:ready` | Fires AFTER `library:load`. Context is parsed and theme/projection/resolution defaults are seeded | Once per manifest load |
| `image:select` | User or programmatic selection changed current image id/data (texture NOT yet loaded) | Once per selection change |
| `image:load-request` | The selected image/resolution has been handed to `renderer.loadImage` | Once per texture load |
| `image:visible` | The renderer reports the panorama is loaded and visible. Wired to the resolved `core.loadImage()` promise resolution, NOT the old eager `onImageLoad` timing | Once per successful texture load |
| `image:error` | Texture load failed. Current image remains the previously-loaded one (if any) | Once per failed texture load |

**selectImage: last-write-wins concurrency** — If a previous load is in flight when `selectImage()` is called again, the engine cancels the superseded texture fetch, the previous promise RESOLVES (does not reject), and only events from the new selection fire downstream. No ghost `image:visible` from the superseded load, even if its texture happens to complete after the new selection.

**State-machine events** (`ready`, `library:load`, `library:error`, `image:visible`, `image:error`) never coalesce. `loading:progress` may coalesce in the event bridge but not at the engine level.

Tests: `dev/test/test-image-visible-timing.js` — full event chain ordering, last-write-wins ghost-event suppression, library lifecycle semantics.

---

## Loading state ownership

Spinners and skeleton states are rendered by the **consumer** (gallery or library-ui), keyed off:

- `loading:start` / `loading:end` events (for push-based UI updates)
- `isLoading()` / `getLoadingPhase()` synchronous queries (for late-mounting consumers that missed the `loading:start` event)

The engine **never renders a loader**. The gallery mounts spinners outside the engine container so they never collide with the canvas.

Tests: `dev/test/test-controls.js` — `isLoading()` and `getLoadingPhase()` return correct values across lifecycle stages.

---

## Framework-neutrality guarantee

The engine (`@phong/360-engine`) has **zero framework dependencies.** It does not import, reference, or assume React, Vue, Svelte, Alpine, jQuery, or any other UI framework. It is a vanilla TypeScript/JavaScript class that takes a DOM container and returns events + methods. This is by design and is non-negotiable.

The library-ui (`@phong/360-library-ui`) has **zero framework dependencies.** It manipulates vanilla DOM directly. It does not import or assume Alpine or any other reactive framework.

| Component | Framework | Why |
|---|---|---|
| `@phong/360-engine` | **None** (vanilla TS) | Headless renderer — must work in any stack |
| `@phong/360-library-ui` | **None** (vanilla TS + DOM) | Drop-in `<script>` tag, no build step for Tier 1 |
| **360-HEXTILE-GALLERY** UI | **Alpine.js** | Gallery's own choice for its Jinja-templated chrome |
| **360-HEXTILE-WWW** viewer usage | **None** (vanilla JS) | Just instantiates the engine — no framework needed for a decorative panorama |
| **360-HEXTILE-APP** (desktop) | **Svelte 5** | Separate product, own viewer integration path |

A third party can use `@phong/360-engine` in a React SPA, a Vue SPA, a static HTML page, or a WordPress plugin — the engine doesn't know or care.

---

## Decorator lifecycle (library-ui only)

Decorators live on `@phong/360-library-ui`, not on the engine. They run after every `_renderSections()` call inside `library-ui`, including `setLibrary()`, `loadLibraryData()`, `reloadLibrary()`, model filter changes, section expand/collapse re-renders, and owner manifest swaps.

**Idempotency:** Decorators must be idempotent — the library-ui may call them multiple times on the same DOM node. Library-ui assigns each decorator handle a stable `data-p360-decorator-id` value. It checks each target for a child carrying that handle id before re-running child-injection decorators, and uses a per-target `WeakMap<Element, Set<handleId>>` for decorators that mutate only the target node. Consumers MUST set `data-p360-decorator-id="<handleId>"` on any node they inject; failure to do so produces a `console.warn` on the second render.

**Exception containment:** Decorator exceptions are contained: log a warning and continue. Removing a `SlotHandle` prevents future decoration and triggers one re-render of affected regions when feasible.

**Memory bound:** Library-ui tracks all registered decorator handles. If more than 20 decorators of the same kind are registered, library-ui logs a `console.warn` once with the call site stack. Hard limit: 100 per kind, after which `add*Decorator` returns a no-op handle and logs `console.error`.

```ts
// @phong/360-library-ui
class Phong360LibraryUI {
  constructor(opts: LibraryUIOptions);                  // creates an engine internally
  readonly engine: Phong360Engine;                       // accessible if needed

  // Existing v4.2.0 slot system — preserved verbatim
  setSlot(name: SlotName, factory: SlotFactory): void;
  clearSlot(name: SlotName): void;
  renderDefault(name: SlotName, props?: object): HTMLElement | null;

  // New decorators for Tier 1 customization
  addToolbarButton(spec: ToolbarButtonSpec): SlotHandle;
  addThumbnailDecorator(fn: (el: HTMLElement, img: ImageData, section: SectionData | null) => void): SlotHandle;
  addSectionHeadingDecorator(fn: (headingEl: HTMLElement, section: SectionData) => void): SlotHandle;
  addSidebarSection(spec: SidebarSectionSpec): SlotHandle;
  setInfoBarSlot(position: 'left' | 'center' | 'right', el: HTMLElement | null): void;
}
```

The gallery does not use this API at all post-split — it has no library-ui to decorate. These rules exist for Tier 1 consumers and `gallery-template`.

Tests: `dev/test/test-decorators.js` (Phase 2), `dev/test/test-decorator-cleanup.js` (Phase 2).

---

## Compatibility events (delete in v5.x)

The following events exist ONLY during the compatibility track (Phases 1-5). They must not become engine API. They exist so the gallery can drain `gallery-integration.js` safely while `Phong360LibraryUI` still owns DOM chrome.

### Callback-bridged events

| Existing callback / event | Compatibility event | Final owner |
|---|---|---|
| `callbacks.onLibraryLoad(data)` | `library:load` | Engine |
| `callbacks.onContextReady(context)` | `context:ready` | Engine emits parsed context; gallery renders it |
| `callbacks.onImageSelect(image)` | `image:select` | Engine |
| `callbacks.onImageLoad(image, resolution)` | `image:visible` | Engine, after visible |
| `callbacks.onThemeChange(theme)` | `theme:change` | Engine CSS-var bridge + gallery DOM theme sync |
| `callbacks.onLinkClick(url, item)` | `link:click` during compatibility only | Library-ui; gallery renders its own links after split |
| `callbacks.onSectionToggle(section, open)` | `section:toggle` during compatibility only | Library-ui; gallery sidebar owns this after split |
| `callbacks.onSectionsRendered(sections, filterActive)` | `sections:render` during compatibility only | Library-ui; gallery renders sections itself after split |
| `callbacks.onBadgeClick(image, badge)` | `badge:click` during compatibility only | Library-ui; gallery-owned badges after split |

Compatibility-only events carry an internal flag (`__compat: true` in payload) and are registered in a `static COMPAT_EVENTS = new Set(['link:click', 'section:toggle', 'sections:render', 'badge:click', 'help:open', 'owner:*'])`. They are deleted in Phase 5.

### Legacy DOM bridge events (delete in Phase 5)

These are document-dispatched CustomEvents (not engine `emit()` events). They facilitate communication between the legacy library-ui owner DOM and the gallery's `gallery-integration.js` during the compatibility track. Registered in a `static LEGACY_DOM_BRIDGE_EVENTS` set. Phase 5 Task 5.1 deletes both listener and dispatcher.

| DOM Event | Purpose | Deletion phase |
|---|---|---|
| `p360-owner-mode` | Signals gallery that owner mode is active in library-ui | Phase 5 |
| `p360-owner-action` | Gallery routes owner actions to backend API | Phase 5 |
| `p360-library-replace` | Owner overlay replaces the full manifest | Phase 5 |
| `p360-rollback` | Owner optimistic mutation rollback | Phase 5 |
| `p360-toast` | Owner-mode toast notifications | Phase 5 |
| `p360-section-updated` | Section metadata changed by owner | Phase 5 |
| `p360-collections-reordered` | Sections reordered by owner drag | Phase 5 |
| `p360-help` | Legacy help modal triggered from library-ui | Phase 5 |

Tests: `dev/test/test-compat-parity.js` — parity between legacy callbacks and new engine events; legacy DOM bridge event enumeration.

---

## Animation/transition ownership

The image cross-fade between texture loads is **engine-owned** (lives on the canvas / Three.js material). All other transitions — sidebar slide, info-bar fade, dropup expand, modal backdrop, button hover — are owned by whichever layer renders the chrome (library-ui for Tier 1; gallery CSS for Tier 2).

---

## Keyboard shortcut boundary

| Layer | Shortcuts |
|---|---|
| **Engine** | WASD/arrow pan, `+`/`-` zoom, mouse drag, scroll/pinch zoom, double-click fullscreen, `P` toggles projection, `F` toggles fullscreen |
| **Library-ui** | `?` opens help modal, `Esc` closes overlays |
| **Gallery** | All non-canvas keyboard shortcuts |

Engine keyboard shortcuts are suppressible via the `keyboardShortcuts: boolean` constructor option (default `true`). Pointer/touch control availability is separately controlled by `controls.enablePan` and `controls.enableZoom`.

---

## Versioning policy

- **Engine breaking changes (major bump):** removing or renaming an event, method, or type field; changing event payload shape in a non-additive way; changing observable timing semantics (e.g. when `image:visible` fires).
- **Engine minor changes:** adding new events, methods, or optional payload fields; adding new resolution variants; adding new manifest fields.
- **Engine patch changes:** bug fixes, performance improvements with no observable timing change, internal refactors.
- **Library-ui:** visual changes are minor; CSS variable contract changes are major; default UI structure changes are major.

---

## Cross-reference: test coverage map

| API surface | Test file | Phase |
|---|---|---|
| `on()` / `off()` / `emit()` | `dev/test/test-event-emitter.js` | Phase 1 (Task 1.2) |
| `getContext()` / `getSections()` / `getImages()` / `getLibraryData()` / `getCurrentImage()` | `dev/test/test-accessors.js` | Phase 1 (Task 1.3) |
| `setTheme()` / `setAccent()` / `setAutoRotate()` / `setProjection()` / `setResolution()` / `getResolution()` / `getResolutionMode()` / `getAvailableResolutions()` / `isLoading()` / `getLoadingPhase()` / `destroy()` / `setFullscreen()` / `selectImage()` / `loadImage()` / `loadLibrary()` / `reloadLibrary()` / `setLibrary()` / `next()` / `prev()` / constructor options / CSS var contract | `dev/test/test-controls.js` | Phase 1 (Task 1.4) |
| `image:visible` GPU-upload timing / full event chain / last-write-wins concurrency / library lifecycle semantics | `dev/test/test-image-visible-timing.js` | Phase 1 (Task 1.5) |
| Compatibility callback/event parity | `dev/test/test-compat-parity.js` | Phase 1 (Task 1.6) |
| Decorator API | `dev/test/test-decorators.js` | Phase 2 |
| Decorator cleanup / memory bound | `dev/test/test-decorator-cleanup.js` | Phase 2 |
