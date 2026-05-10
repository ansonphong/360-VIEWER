/**
 * @phong/360-library-ui — TypeScript public-API declarations
 *
 * Batteries-included sidebar, toolbar, info-bar, and theming for
 * 360-degree panorama experiences.  Depends on @phong/360-engine.
 *
 * This file declares the types for `src/index.js`.  The JS implementation
 * lives in the sibling .js files; `tsc --emitDeclarationOnly` turns this
 * into `dist/library-ui.d.ts`.
 *
 * Engine types are redeclared inline (rather than imported via paths) so
 * `tsc` with `rootDir: ./src` works without cross-package references.
 *
 * @version 5.0.0-rc.1
 * @license MIT
 */

// =========================================================================
// Engine types (duplicated from @phong/360-engine for build isolation)
// =========================================================================

interface EngineOptions {
  container: HTMLElement | string;
  libraryUrl?: string;
  baseUrl?: string;
  projection?: 'gnomonic' | 'stereographic';
  resolution?: string | 'auto';
  theme?: 'auto' | 'light' | 'dark';
  accent?: string | null;
  autoRotate?: boolean;
  autoRotationRate?: number;
  fov?: { init: number; initTarget?: number };
  controls?: { enableZoom?: boolean; enablePan?: boolean };
  transition?: { fadeInDuration?: number; fadeOutDuration?: number };
  keyboardShortcuts?: boolean;
}

interface LibraryContext {
  [key: string]: any;
}

interface ImageData {
  id: string;
  [key: string]: any;
}

interface SectionData {
  id: string;
  title?: string;
  [key: string]: any;
}

interface LibraryManifest {
  version: number | string;
  [key: string]: any;
}

interface ResolutionVariant {
  id: string;
  label: string;
  width: number;
  height: number;
}

interface FacetsData {
  [key: string]: any;
}

// =========================================================================
// Library-UI option types
// =========================================================================

export interface LibraryUIOptions extends EngineOptions {
  /** Pre-loaded library data (skips network fetch) */
  libraryData?: LibraryManifest;

  /** Auto-load image by id or slug after initial render */
  autoloadId?: string;

  /** Only render the section matching this collection slug */
  filterCollection?: string;

  /** Sidebar width in px (280-600) */
  panelWidth?: number;

  /** Info bar alignment */
  infoBar?: 'center' | 'left';

  /** Emoji favicon for the browser tab */
  favicon?: string;

  /** Sidebar opens automatically on desktop load */
  desktopOpenByDefault?: boolean;

  /** URL to a 360-viewer.json config file (loaded separately) */
  configUrl?: string;

  /** Deep-link behaviour — true (default), false, or custom {read,write} */
  urlSync?:
    | boolean
    | { read?: () => string | null; write?: (slug: string) => void };

  /**
   * Opt out of the legacy model-filter sidebar block. When false the
   * engine does not build/own any model facet UI — the consumer (gallery)
   * renders its own.
   */
  legacyModelFilter?: boolean;

  /** Touch/mouse sensitivity multiplier */
  sensitivity?: number;

  /** Grid layout config for the grid template renderer */
  grid?: { minWidth?: number };
}

// =========================================================================
// Slot system types
// =========================================================================

export type SlotName =
  | 'toolbar-leading'
  | 'info-bar-leading'
  | 'info-bar-trailing'
  | 'sidebar-toggle-icon';

export type SlotFactory = (props: SlotProps) => HTMLElement | null;

export interface SlotProps {
  container: HTMLElement;
  context: LibraryContext | null;
  theme: string;
  accent: string | null;
  sidebarOpen: boolean;
}

// =========================================================================
// Decorator types
// =========================================================================

export interface SlotHandle {
  /** Opaque id for this decorator registration */
  readonly id: number;
  /** Remove this decorator / slot */
  remove(): void;
}

export interface ToolbarButtonSpec {
  /** Phosphor icon class, e.g. 'ph ph-gear' */
  icon: string;
  /** Accessible label */
  label: string;
  /** Click handler */
  onClick: (event: MouseEvent) => void;
  /** Optional tooltip text */
  title?: string;
  /** Insertion position. 'leading' = before standard buttons. Default: 'trailing'. */
  position?: 'leading' | 'trailing';
}

export interface SidebarSectionSpec {
  /** Unique id for this sidebar section */
  id: string;
  /** Display title */
  title: string;
  /** DOM content to render inside the section body */
  content: HTMLElement;
  /** Insertion position. Default: 'bottom'. */
  position?: 'top' | 'bottom';
  /** Whether the section starts collapsed */
  collapsed?: boolean;
}

// =========================================================================
// Main library-ui class
// =========================================================================

export declare class Phong360LibraryUI {
  constructor(options: LibraryUIOptions);

  /** The underlying engine instance */
  readonly engine: any /* Phong360Engine */;

  /** The engine's container element */
  readonly container: HTMLElement;

  /** The engine's canvas element */
  readonly canvas: HTMLCanvasElement | null;

  // Events (delegates to engine)
  on(event: string, handler: (payload: any) => void): () => void;
  off(event: string, handler: (payload: any) => void): void;
  emit(event: string, payload?: any): void;

  // Manifest accessors (delegates to engine)
  getContext(): LibraryContext | null;
  getSections(): SectionData[];
  getImages(): ImageData[];
  getLibraryData(): LibraryManifest | null;
  getCurrentImage(): ImageData | null;

  // View controls (delegates to engine)
  setAutoRotate(on: boolean): void;
  getAutoRotate(): boolean;
  setAccent(hex: string | null): void;
  setProjection(projection: 'gnomonic' | 'stereographic'): void;
  getProjection(): 'gnomonic' | 'stereographic';
  setResolution(level: string | 'auto'): Promise<void>;
  getResolution(): string;
  getResolutionMode(): 'auto' | 'manual';
  getAvailableResolutions(): ResolutionVariant[];
  setTheme(theme: 'auto' | 'light' | 'dark'): void;
  getTheme(): string;

  // Image loading (delegates to engine)
  loadImage(url: string): Promise<void>;
  selectImage(imageId: string): Promise<void>;
  nextImage(): Promise<void>;
  prevImage(): Promise<void>;

  // Library management (delegates to engine)
  loadLibrary(urlOrManifest: string | LibraryManifest): Promise<void>;
  setLibrary(manifest: LibraryManifest): void;
  reloadLibrary(): Promise<void>;
  setSections(sections: SectionData[]): void;

  // Loading state queries
  isLoading(): boolean;
  getLoadingPhase(): 'idle' | 'library' | 'image';

  // Fullscreen
  setFullscreen(on: boolean): Promise<void>;

  // Sidebar
  toggleSidebar(): void;
  openSidebar(): void;
  closeSidebar(): void;

  // Slot system (since 4.2.0)
  /** Register a factory for a named UI slot */
  setSlot(name: SlotName, factory: SlotFactory): void;
  /** Remove a previously registered slot factory */
  clearSlot(name: SlotName): void;
  /** Render the default content for a named slot */
  renderDefault(name: SlotName, props?: Partial<SlotProps>): HTMLElement | null;

  // Decorators (Tier 1 customization)
  /** Add a custom button to the toolbar */
  addToolbarButton(spec: ToolbarButtonSpec): SlotHandle;
  /** Run a function after every thumbnail is rendered */
  addThumbnailDecorator(
    fn: (
      el: HTMLElement,
      img: ImageData,
      section: SectionData | null
    ) => void
  ): SlotHandle;
  /** Run a function after every section heading is rendered */
  addSectionHeadingDecorator(
    fn: (headingEl: HTMLElement, section: SectionData) => void
  ): SlotHandle;
  /** Add a custom section to the sidebar */
  addSidebarSection(spec: SidebarSectionSpec): SlotHandle;
  /** Set custom content for an info-bar slot position */
  setInfoBarSlot(
    position: 'left' | 'center' | 'right',
    el: HTMLElement | null
  ): void;

  // Lifecycle
  destroy(): void;
}
