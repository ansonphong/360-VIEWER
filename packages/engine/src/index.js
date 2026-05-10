/**
 * @phong/360-engine
 *
 * Headless 360 panorama renderer. No DOM beyond the canvas.
 * Wraps Phong360ViewerCore + Phong360MultiImage + TypedEventEmitter +
 * ThemeBridge + LibraryLoader into a unified public API.
 *
 * @version 5.0.0-rc.1
 * @license MIT
 */

// The IIFE sub-modules register their classes on `window` when loaded as
// scripts.  esbuild bundles them into a single scope so the references
// resolve after require(), regardless of loading order.
require('./events.js');          // TypedEventEmitter on window
require('./theme.js');           // ThemeBridge on window
require('./library-loader.js');  // LibraryLoader on window
require('./renderer.js');        // Phong360ViewerCore on window
require('./multi-image.js');     // Phong360MultiImage on window

const Phong360ViewerCore = (typeof window !== 'undefined' && window.Phong360ViewerCore) || null;
const Phong360MultiImage = (typeof window !== 'undefined' && window.Phong360MultiImage) || null;
const ThemeBridge        = (typeof window !== 'undefined' && window.ThemeBridge) || null;
const LibraryLoader      = (typeof window !== 'undefined' && window.LibraryLoader) || null;

// ---------------------------------------------------------------------------
// Phong360Engine
// ---------------------------------------------------------------------------

class Phong360Engine {
	/**
	 * @param {import('./index').EngineOptions} options
	 */
	constructor(options) {
		// Resolve container
		const containerRaw = options.container;
		const containerEl =
			typeof containerRaw === 'string'
				? document.getElementById(containerRaw)
				: containerRaw;
		if (!containerEl) {
			throw new Error(
				'Phong360Engine: container not found — ' +
				(typeof containerRaw === 'string' ? '#' + containerRaw : String(containerRaw))
			);
		}
		this._containerEl = containerEl;
		this._options = options;

		// Event emitter
		this._listeners = new Map();

		// Theme bridge (headless — no sidebar, no lib-ui chrome)
		this._themeBridge = new ThemeBridge({
			container: this._containerEl,
			sidebar: null,
			initialTheme: options.theme || 'auto',
			initialAccent: options.accent || null,
			emit: (evt, payload) => this.emit(evt, payload)
		});

		// Library loader
		this._libraryLoader = new LibraryLoader({
			libraryUrl: options.libraryUrl || null,
			emit: (evt, payload) => this.emit(evt, payload),
			onData: (data) => {
				this._manifest = data.manifest || null;
				this._context = data.context || null;
				this._sections = data.sections || [];
				this._allImages = data.images || [];
				if (this._multiViewer) this._multiViewer.setImages(this._allImages);
			}
		});

		// Build core config from options
		const coreConfig = {};
		const vr = {};
		if (options.autoRotate !== undefined) vr.autoRotate = !!options.autoRotate;
		if (options.autoRotationRate !== undefined) vr.autoRotationRate = Number(options.autoRotationRate);
		if (Object.keys(vr).length) coreConfig.viewRotation = vr;
		if (options.fov) coreConfig.fov = Object.assign({}, options.fov);
		if (options.controls) coreConfig.controls = Object.assign({}, options.controls);
		if (options.transition) {
			coreConfig.loading = Object.assign({}, options.transition);
		}

		this._core = new Phong360ViewerCore({
			containerId: this._containerEl.id || ('p360-engine-' + Math.random().toString(36).slice(2, 8)),
			config: coreConfig
		});

		// Multi-image manager
		this._multiViewer = new Phong360MultiImage({
			core: this._core,
			images: [],
			baseUrl: options.baseUrl || ''
		});
		this._wireMultiImageEvents();

		// State
		this._manifest = null;
		this._context = null;
		this._sections = [];
		this._allImages = [];
		this._currentImageId = null;
		this._currentImageData = null;
		this._isLoading = false;
		this._loadingPhase = 'idle';
		this._resolutionMode = 'auto';
		this._destroyed = false;
		this._selectToken = 0;
		this._abortController = null;

		// Seed initial projection / theme / accent
		if (options.projection) this.setProjection(options.projection);
		if (options.theme) this.setTheme(options.theme);
		if (options.accent) this.setAccent(options.accent);

		// Emit ready on next microtask so listeners attached after new work
		Promise.resolve().then(() => this.emit('ready'));
	}

	// -----------------------------------------------------------------------
	// Event emitter
	// -----------------------------------------------------------------------

	/**
	 * Register an event handler. Returns an unsubscribe function.
	 * @param {string} event
	 * @param {Function} handler
	 * @returns {Function}
	 */
	on(event, handler) {
		if (!this._listeners.has(event)) this._listeners.set(event, []);
		this._listeners.get(event).push(handler);
		return () => this.off(event, handler);
	}

	/**
	 * Remove a previously registered handler.
	 * @param {string} event
	 * @param {Function} handler
	 */
	off(event, handler) {
		const arr = this._listeners.get(event);
		if (!arr) return;
		const idx = arr.indexOf(handler);
		if (idx !== -1) arr.splice(idx, 1);
		if (arr.length === 0) this._listeners.delete(event);
	}

	/**
	 * Emit an event to all registered handlers.
	 * @param {string} event
	 * @param {*} [payload]
	 */
	emit(event, payload) {
		const handlers = this._listeners.get(event);
		if (!handlers || handlers.length === 0) return;
		const copy = handlers.slice();
		for (const fn of copy) {
			try { fn(payload); } catch (e) { console.error('[Phong360] Error in "' + event + '" handler:', e); }
		}
	}

	// -----------------------------------------------------------------------
	// Read-only DOM accessors
	// -----------------------------------------------------------------------

	get container() { return this._containerEl; }
	get canvas() { return this._core && this._core.renderer ? this._core.renderer.domElement : null; }

	// -----------------------------------------------------------------------
	// Manifest accessors
	// -----------------------------------------------------------------------

	/** @returns {object|null} */
	getContext() { return this._context; }

	/** @returns {object[]} */
	getSections() { return this._sections.slice(); }

	/** @returns {object[]} */
	getImages() { return this._allImages.slice(); }

	/** @returns {object|null} */
	getLibraryData() { return this._manifest; }

	/** @returns {object|null} */
	getCurrentImage() { return this._currentImageData; }

	// -----------------------------------------------------------------------
	// View controls
	// -----------------------------------------------------------------------

	/** @param {boolean} on */
	setAutoRotate(on) {
		if (this._core && this._core.config && this._core.config.viewRotation) {
			this._core.config.viewRotation.autoRotate = !!on;
		}
		this.emit('autorotate:change', { enabled: !!on });
	}

	/** @returns {boolean} */
	getAutoRotate() {
		if (this._core && this._core.config && this._core.config.viewRotation) {
			return this._core.config.viewRotation.autoRotate;
		}
		return false;
	}

	/** @param {string|null} hex */
	setAccent(hex) {
		this._themeBridge.setAccent(hex);
	}

	/**
	 * @param {'gnomonic'|'stereographic'} projection
	 */
	setProjection(projection) {
		const type = projection === 'gnomonic' ? 0 : projection === 'stereographic' ? 1 : null;
		if (type === null) {
			console.warn('[Phong360] setProjection: invalid projection "' + projection + '"');
			return;
		}
		if (this._core && this._core.projectionType !== type) {
			this._core.switchProjection(type);
		}
		this.emit('projection:change', { projection });
	}

	/** @returns {string} */
	getProjection() {
		if (this._core) return this._core.projectionType === 0 ? 'gnomonic' : 'stereographic';
		return 'stereographic';
	}

	/**
	 * @param {string|'auto'} level
	 * @returns {Promise<void>}
	 */
	async setResolution(level) {
		if (level === 'auto') {
			if (this._resolutionMode === 'auto') return;
			this._resolutionMode = 'auto';
			this.emit('resolution:change', { id: 'auto', label: 'Auto' });
			return;
		}
		this._resolutionMode = 'manual';
		if (this._multiViewer) this._multiViewer.switchResolution(level);
		const cur = this._currentImageData;
		if (cur && Array.isArray(cur.resolutions)) {
			const res = cur.resolutions.find((r) => r.id === level);
			if (res) this.emit('resolution:change', { id: res.id, label: res.label || res.id });
		}
	}

	/** @returns {string} */
	getResolution() {
		if (this._multiViewer && this._multiViewer.getCurrentResolution()) {
			return this._multiViewer.getCurrentResolution().id;
		}
		return '';
	}

	/** @returns {'auto'|'manual'} */
	getResolutionMode() { return this._resolutionMode; }

	/** @returns {object[]} */
	getAvailableResolutions() {
		if (this._multiViewer && this._multiViewer.getAvailableResolutions) {
			return this._multiViewer.getAvailableResolutions();
		}
		return [];
	}

	/**
	 * @param {'dark'|'light'|'auto'} theme
	 */
	setTheme(theme) {
		this._themeBridge.setTheme(theme);
	}

	/** @returns {string} */
	getTheme() {
		return this._themeBridge.theme;
	}

	// -----------------------------------------------------------------------
	// Loading state queries
	// -----------------------------------------------------------------------

	/** @returns {boolean} */
	isLoading() { return this._isLoading; }

	/** @returns {'idle'|'library'|'image'} */
	getLoadingPhase() { return this._loadingPhase; }

	// -----------------------------------------------------------------------
	// Image loading
	// -----------------------------------------------------------------------

	/**
	 * Load a raw equirectangular URL (no manifest needed).
	 * @param {string} url
	 * @returns {Promise<void>}
	 */
	async loadImage(url) {
		this._isLoading = true;
		this._loadingPhase = 'image';
		this.emit('loading:start', { source: 'image', url });
		this.emit('image:load-request', { url });
		try {
			await this._core.loadImage(url);
			this._isLoading = false;
			this._loadingPhase = 'idle';
			this.emit('image:visible', { url });
			this.emit('loading:end', { source: 'image', success: true });
		} catch (e) {
			this._isLoading = false;
			this._loadingPhase = 'idle';
			this.emit('image:error', { url, error: e.message || String(e) });
			this.emit('loading:end', { source: 'image', success: false });
			throw e;
		}
	}

	/**
	 * Select an image by id or slug. Requires a loaded manifest.
	 * @param {string} imageId
	 * @returns {Promise<void>}
	 */
	async selectImage(imageId) {
		if (!this._allImages || this._allImages.length === 0) {
			throw new Error('Phong360Engine: no library data loaded. Call loadLibrary() or setLibrary() first.');
		}
		if (!this._multiViewer) return;

		this._selectToken = (this._selectToken || 0) + 1;
		const token = this._selectToken;

		let found = this._allImages.find((img) => img.id === imageId);
		if (!found) found = this._allImages.find((img) => img.slug === imageId);
		if (!found) { console.warn('[Phong360] selectImage: image not found:', imageId); return; }

		const prevData = this._currentImageData;
		const prevId = this._currentImageId;

		this._currentImageId = found.id;
		this._currentImageData = found;
		this.emit('image:select', Object.assign({}, found));

		this._isLoading = true;
		this._loadingPhase = 'image';
		this.emit('loading:start', { source: 'image' });

		try {
			await this._multiViewer.loadImageById(found.id);
			if (this._selectToken !== token) return;
			this._isLoading = false;
			this._loadingPhase = 'idle';
			this.emit('loading:end', { source: 'image', success: true });
		} catch (e) {
			if (this._selectToken !== token) return;
			this._currentImageData = prevData;
			this._currentImageId = prevId;
			this._isLoading = false;
			this._loadingPhase = 'idle';
			this.emit('loading:end', { source: 'image', success: false });
			throw e;
		}
	}

	/** @returns {Promise<void>} */
	async nextImage() {
		if (!this._allImages || this._allImages.length === 0) return;
		if (!this._currentImageId) return this.selectImage(this._allImages[0].id);
		const idx = this._allImages.findIndex((img) => img.id === this._currentImageId);
		if (idx === -1) return;
		const nextIdx = idx >= this._allImages.length - 1 ? 0 : idx + 1;
		return this.selectImage(this._allImages[nextIdx].id);
	}

	/** @returns {Promise<void>} */
	async prevImage() {
		if (!this._allImages || this._allImages.length === 0) return;
		if (!this._currentImageId) return this.selectImage(this._allImages[0].id);
		const idx = this._allImages.findIndex((img) => img.id === this._currentImageId);
		if (idx === -1) return;
		const prevIdx = idx <= 0 ? this._allImages.length - 1 : idx - 1;
		return this.selectImage(this._allImages[prevIdx].id);
	}

	// -----------------------------------------------------------------------
	// Library loading
	// -----------------------------------------------------------------------

	/**
	 * Load the library manifest from a URL or object.
	 * @param {string|object} urlOrManifest
	 * @returns {Promise<void>}
	 */
	async loadLibrary(urlOrManifest) {
		this._isLoading = true;
		this._loadingPhase = 'library';
		return this._libraryLoader.loadLibrary(urlOrManifest).then(() => {
			this._isLoading = false;
			this._loadingPhase = 'idle';
		}).catch((e) => {
			this._isLoading = false;
			this._loadingPhase = 'idle';
			throw e;
		});
	}

	/**
	 * Synchronously set the library manifest (preempts in-flight fetch).
	 * @param {object} manifest
	 */
	setLibrary(manifest) {
		this._libraryLoader.setLibrary(manifest);
	}

	/**
	 * Re-apply the last library state. If loadLibrary(url) was used, re-fetches
	 * that URL. If setLibrary() was used, re-applies the in-memory manifest.
	 * @returns {Promise<void>}
	 */
	async reloadLibrary() {
		return this._libraryLoader.loadLibrary();
	}

	/**
	 * Set sections programmatically (for owner-overlay mutation).
	 * @param {object[]} sections
	 */
	setSections(sections) {
		this._sections = sections || [];
		this._allImages = [];
		for (const s of this._sections) {
			if (Array.isArray(s.images)) {
				for (const img of s.images) this._allImages.push(img);
			}
		}
		if (this._multiViewer) this._multiViewer.setImages(this._allImages);
	}

	// -----------------------------------------------------------------------
	// Fullscreen
	// -----------------------------------------------------------------------

	/**
	 * Toggle fullscreen mode.
	 * @param {boolean} on
	 * @returns {Promise<void>}
	 */
	async setFullscreen(on) {
		if (on) {
			if (!document.fullscreenElement) {
				try { await document.documentElement.requestFullscreen(); } catch (e) { /* denied */ }
			}
		} else {
			if (document.fullscreenElement && document.exitFullscreen) {
				try { await document.exitFullscreen(); } catch (e) { /* ignore */ }
			}
		}
		this.emit('fullscreen:change', { isFullscreen: !!document.fullscreenElement });
	}

	// -----------------------------------------------------------------------
	// Lifecycle
	// -----------------------------------------------------------------------

	/** Dispose all resources. Idempotent. */
	destroy() {
		if (this._destroyed) return;
		this._destroyed = true;
		if (this._libraryLoader && this._libraryLoader.abort) this._libraryLoader.abort();
		if (this._core && this._core.destroy) this._core.destroy();
		this._core = null;
		this._multiViewer = null;
		this._listeners.clear();
		this._sections = [];
		this._allImages = [];
		this._currentImageData = null;
		this._currentImageId = null;
		this._manifest = null;
		this._context = null;
	}

	// -----------------------------------------------------------------------
	// Internal helpers
	// -----------------------------------------------------------------------

	/**
	 * Wire multi-image events through to the engine event bus.
	 * @private
	 */
	_wireMultiImageEvents() {
		const mv = this._multiViewer;
		if (!mv) return;
		const forward = (event) => {
			mv.on(event, (payload) => {
				// image:visible from multi-image also updates engine state
				if (event === 'image:visible') {
					this._currentImageData = payload.image || null;
					this._currentImageId = payload.image ? payload.image.id : null;
				}
				this.emit(event, payload);
			});
		};
		forward('image:load-request');
		forward('image:visible');
		forward('image:error');
	}
}

// Export
module.exports = Phong360Engine;
module.exports.default = Phong360Engine;

// Also expose on window for UMD / script-tag consumers
if (typeof window !== 'undefined') {
	window.Phong360Engine = Phong360Engine;
}
