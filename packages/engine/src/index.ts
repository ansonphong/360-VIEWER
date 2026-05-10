/**
 * @phong/360-engine — TypeScript public-API declarations
 *
 * This file declares the types for `src/index.js`.  The JS implementation
 * lives in the sibling .js files; `tsc --emitDeclarationOnly` turns this
 * into `dist/engine.d.ts`.
 *
 * @version 5.0.0-rc.1
 * @license MIT
 */

// =========================================================================
// Option types
// =========================================================================

export interface EngineOptions {
  /** CSS selector or HTMLElement to mount the canvas into */
  container: HTMLElement | string;

  /** Initial library.json URL (optional — you can call loadLibrary later) */
  libraryUrl?: string;

  /** Base URL for resolving relative image paths in the manifest */
  baseUrl?: string;

  /** Projection mode */
  projection?: 'gnomonic' | 'stereographic';

  /** Resolution id or 'auto' (default 'auto' picks the highest available) */
  resolution?: string | 'auto';

  /** Theme mode — engine only sets CSS vars, does NOT persist */
  theme?: 'auto' | 'light' | 'dark';

  /** Accent colour hex, e.g. '#e13e13'. null = brand default */
  accent?: string | null;

  /** Start auto-rotation on load */
  autoRotate?: boolean;

  /** Auto-rotation rate in degrees per second */
  autoRotationRate?: number;

  /** Initial field-of-view */
  fov?: { init: number; initTarget?: number };

  /** Enable / disable zoom and pan */
  controls?: { enableZoom?: boolean; enablePan?: boolean };

  /** Canvas image cross-fade timing */
  transition?: { fadeInDuration?: number; fadeOutDuration?: number };

  /** Suppress engine keybinds (e.g. during owner edit mode). Default true. */
  keyboardShortcuts?: boolean;
}

// =========================================================================
// Data types (mirrors library.json v4 shapes)
// =========================================================================

export interface LibraryContext {
  scope?: 'discover' | 'profile' | 'image' | 'collection' | 'tag';
  profile?: {
    username: string;
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
  };
  collection?: {
    id: string;
    title: string;
    slug?: string;
    cover?: string;
  };
  brand?: {
    logo?: string;
    label?: string;
    href?: string;
  };
  theme?: { default?: 'auto' | 'light' | 'dark'; accent?: string };
  projection?: 'gnomonic' | 'stereographic';
  [key: string]: any;
}

export interface ImageData {
  id: string;
  shortId?: string;
  slug?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  /** Absolute URL — already resolved against manifest baseUrl by the engine */
  thumbnail?: string;
  resolutions: ResolutionVariant[];
  badges?: BadgeData[];
  tags?: string[];
  model?: ModelInfo;
  creator?: CreatorInfo;
  reactionCount?: number;
  viewCount?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface ResolutionVariant {
  id: string;
  label: string;
  width: number;
  height: number;
  /** Relative path resolved via baseUrl, or absolute URL */
  path?: string;
  url?: string;
  /** File size hint in bytes */
  size?: number;
  default?: boolean;
}

export interface BadgeData {
  label?: string;
  icon?: string;
  emoji?: string;
  color?: string;
  count?: number;
  value?: number;
}

export interface ModelInfo {
  id?: string;
  name?: string;
  arch?: string;
  architecture?: string;
  version?: string;
  displayName?: string;
  isCustom?: boolean;
}

export interface CreatorInfo {
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface SectionData {
  id: string;
  collectionId?: string;
  title?: string;
  template?: 'default' | 'teaser' | 'grid' | string;
  collapsible?: boolean;
  collapsed?: boolean;
  icon?: string;
  badge?: BadgeData;
  images: ImageData[];
  items?: any[];
  defaultOpen?: boolean;
  [key: string]: any;
}

export interface FacetsData {
  model?: {
    architectures?: FacetEntry[];
    models?: FacetEntry[];
    customCount?: number;
    unknownCount?: number;
  };
  arch?: FacetEntry[];
  tag?: FacetEntry[];
  [key: string]: any;
}

export interface FacetEntry {
  id: string;
  label: string;
  count: number;
}

export interface LibraryManifest {
  version: number | string;
  context?: LibraryContext;
  sections?: SectionData[];
  facets?: FacetsData;
  meta?: Record<string, any>;
  [key: string]: any;
}

// =========================================================================
// Event payloads
// =========================================================================

export interface EngineEventPayload {
  ready: void;
  'loading:start': { source: 'library' | 'image'; url?: string };
  'loading:progress': {
    source: 'library' | 'image';
    loaded: number;
    total?: number;
  };
  'loading:end': { source: 'library' | 'image'; success: boolean };
  'library:load': {
    manifest: LibraryManifest;
    context: LibraryContext | null;
    sections: SectionData[];
    images: ImageData[];
    facets: FacetsData | null;
  };
  'library:error': {
    error: string;
    url: string;
    status?: number;
    code: 'network' | 'auth' | 'parse' | 'timeout' | 'unknown';
  };
  'context:ready': LibraryContext;
  'image:select': ImageData;
  'image:load-request': {
    image?: ImageData;
    resolution?: string;
    url?: string;
  };
  'image:visible': { image?: ImageData; resolution?: string; url?: string };
  'image:error': {
    image?: ImageData;
    error: string;
    url?: string;
  };
  'resolution:change': { id: string; label: string };
  'projection:change': { projection: 'gnomonic' | 'stereographic' };
  'theme:change': { resolved: 'light' | 'dark'; choice: 'auto' | 'light' | 'dark' };
  'accent:change': { color: string | null };
  'autorotate:change': { enabled: boolean };
  'fullscreen:change': { isFullscreen: boolean };
}

export type EngineEvent = keyof EngineEventPayload;

// =========================================================================
// Main engine class
// =========================================================================

export declare class Phong360Engine {
  constructor(options: EngineOptions);

  // Read-only DOM accessors
  readonly container: HTMLElement;
  readonly canvas: HTMLCanvasElement | null;

  // Events
  on<E extends EngineEvent>(
    event: E,
    handler: (payload: EngineEventPayload[E]) => void
  ): () => void;
  off<E extends EngineEvent>(
    event: E,
    handler: (payload: EngineEventPayload[E]) => void
  ): void;
  emit(event: string, payload?: any): void;

  // Manifest accessors (data only, no DOM)
  getContext(): LibraryContext | null;
  getSections(): SectionData[];
  getImages(): ImageData[];
  getLibraryData(): LibraryManifest | null;
  getCurrentImage(): ImageData | null;

  // View controls
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

  // Loading state queries
  isLoading(): boolean;
  getLoadingPhase(): 'idle' | 'library' | 'image';

  // Image loading
  loadImage(url: string): Promise<void>;
  selectImage(imageId: string): Promise<void>;
  nextImage(): Promise<void>;
  prevImage(): Promise<void>;

  // Library management
  loadLibrary(urlOrManifest: string | LibraryManifest): Promise<void>;
  setLibrary(manifest: LibraryManifest): void;
  reloadLibrary(): Promise<void>;
  setSections(sections: SectionData[]): void;

  // Fullscreen
  setFullscreen(on: boolean): Promise<void>;

  // Lifecycle
  destroy(): void;
}
