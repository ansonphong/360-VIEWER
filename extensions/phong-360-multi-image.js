/**
 * Phong 360 Multi-Image Manager - Layer 2
 *
 * Wraps the core viewer to add multi-image and resolution management.
 * Handles adaptive resolution selection based on device and bandwidth.
 *
 * @version 5.0.0-alpha.2
 * @author Phong
 * @license MIT
 */

class Phong360MultiImage {
	constructor(options = {}) {
		if (!options.core) {
			throw new Error('Phong360MultiImage requires a core viewer instance');
		}

		this.core = options.core;
		this.images = options.images || [];
		this.baseUrl = options.baseUrl || '';
		this.adaptiveLoading = options.adaptiveLoading !== false;

		this.currentImageId = null;
		this.currentImageData = null;
		this.currentResolution = null;

		// Load saved resolution preference from localStorage
		this.userPreferredResolution = null;
		try {
			const savedResolution = localStorage.getItem('phong360.preferences.resolution');
			if (savedResolution) {
				this.userPreferredResolution = savedResolution;
			}
		} catch (e) {
			// localStorage unavailable
		}

		// Callbacks
		this.callbacks = Object.assign(
			{
				onImageLoad: null,
				onImageError: null,
				onResolutionChange: null,
				onLoadStart: null,
				onLoadComplete: null
			},
			options.callbacks || {}
		);

		// Typed event emitter (Phase 1 — engine API)
		/** @type {Map<string, Function[]>} */
		this._listeners = new Map();
	}

	setImages(images) {
		this.images = images;
	}

	addImage(imageData) {
		this.images.push(imageData);
	}

	findImageById(id) {
		for (const image of this.images) {
			if (image.id === id) return image;
			// Also match by slug for deep-linking
			if (image.slug && image.slug === id) return image;
		}
		return null;
	}

	getCurrentImageData() {
		return this.currentImageData;
	}

	getAvailableResolutions() {
		if (!this.currentImageData || !this.currentImageData.resolutions) {
			return [];
		}
		return this.currentImageData.resolutions;
	}

	getCurrentResolution() {
		return this.currentResolution;
	}

	loadImageById(id) {
		const imageData = this.findImageById(id);
		if (!imageData) {
			console.error(`Image not found with ID: ${id}`);
			if (this.callbacks.onImageError) {
				this.callbacks.onImageError(new Error(`Image not found: ${id}`));
			}
			return Promise.reject(new Error(`Image not found: ${id}`));
		}

		const resolution = this.selectOptimalResolution(imageData.resolutions);
		if (!resolution) {
			console.error('No suitable resolution found');
			if (this.callbacks.onImageError) {
				this.callbacks.onImageError(new Error('No suitable resolution found'));
			}
			return Promise.reject(new Error('No suitable resolution found'));
		}

		return this.loadImageWithResolution(imageData, resolution);
	}

	async loadImageWithResolution(imageData, resolution) {
		if (!imageData || !resolution) {
			const err = new Error('Invalid image data or resolution');
			console.error(err.message);
			return Promise.reject(err);
		}

		this.currentImageId = imageData.id;
		this.currentImageData = imageData;
		this.currentResolution = resolution;

		if (this.callbacks.onLoadStart) {
			this.callbacks.onLoadStart();
		}

		// Emit image:load-request before handing texture to core renderer
		this.emit('image:load-request', {
			image: imageData,
			resolution: resolution.id
		});

		const imagePath = this.baseUrl + resolution.path;

		try {
			await this.core.loadImage(imagePath, resolution.width, resolution.height);

			// Emit image:visible AFTER texture load + material apply + hideLoading fade-out
			this.emit('image:visible', {
				image: imageData,
				resolution: resolution.id
			});

			// Backward-compat: fire onImageLoad AFTER image:visible (same post-visible timing)
			if (this.callbacks.onImageLoad) {
				this.callbacks.onImageLoad(imageData, resolution);
			}
		} catch (error) {
			this.emit('image:error', {
				image: imageData,
				resolution: resolution.id,
				error: error.message || String(error)
			});

			if (this.callbacks.onImageError) {
				this.callbacks.onImageError(error);
			}

			throw error;
		} finally {
			if (this.callbacks.onLoadComplete) {
				this.callbacks.onLoadComplete();
			}
		}
	}

	switchResolution(resolutionId) {
		if (!this.currentImageData) {
			console.warn('No image currently loaded');
			return;
		}

		const resolution = this.currentImageData.resolutions.find((r) => r.id === resolutionId);
		if (!resolution) {
			console.error(`Resolution ${resolutionId} not found`);
			return;
		}

		this.userPreferredResolution = resolutionId;

		try {
			localStorage.setItem('phong360.preferences.resolution', resolutionId);
		} catch (e) {
			// localStorage unavailable
		}

		this.loadImageWithResolution(this.currentImageData, resolution);

		if (this.callbacks.onResolutionChange) {
			this.callbacks.onResolutionChange(resolution);
		}
	}

	selectOptimalResolution(resolutions) {
		if (!resolutions || resolutions.length === 0) {
			return null;
		}

		if (this.userPreferredResolution) {
			const preferred = resolutions.find((r) => r.id === this.userPreferredResolution);
			if (preferred) return preferred;
		}

		const defaultRes = resolutions.find((r) => r.default);
		const mobile2K = resolutions.find((r) => r.id === '2k' || r.width <= 2048);

		const pixelRatio = window.devicePixelRatio || 1;
		const viewportWidth = window.innerWidth;

		if (this.adaptiveLoading) {
			const connection =
				navigator.connection || navigator.mozConnection || navigator.webkitConnection;
			if (connection) {
				if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
					if (mobile2K) return mobile2K;
				}
			}

			if (pixelRatio >= 2.5 || viewportWidth > 3000) {
				const highRes = resolutions.find((r) => r.id === '8k' || r.width >= 8192);
				if (highRes) return highRes;
			}

			if (viewportWidth < 1024) {
				if (mobile2K) return mobile2K;
			}

			if (defaultRes) return defaultRes;
		}

		if (defaultRes) return defaultRes;
		return resolutions[Math.floor(resolutions.length / 2)];
	}

	loadFirstImage() {
		if (this.images.length === 0) {
			console.warn('No images available');
			return;
		}
		this.loadImageById(this.images[0].id);
	}

	loadNextImage() {
		if (!this.currentImageId) {
			this.loadFirstImage();
			return;
		}
		const currentIndex = this.images.findIndex((img) => img.id === this.currentImageId);
		if (currentIndex === -1 || currentIndex === this.images.length - 1) return;
		this.loadImageById(this.images[currentIndex + 1].id);
	}

	loadPreviousImage() {
		if (!this.currentImageId) {
			this.loadFirstImage();
			return;
		}
		const currentIndex = this.images.findIndex((img) => img.id === this.currentImageId);
		if (currentIndex <= 0) return;
		this.loadImageById(this.images[currentIndex - 1].id);
	}

	formatFileSize(bytes) {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	getImageCount() {
		return this.images.length;
	}

	clearResolutionPreference() {
		this.userPreferredResolution = null;
	}

	// ------------------------------------------------------------------
	// Event Emitter (Phase 1 — typed engine API)
	// ------------------------------------------------------------------

	/**
	 * Register an event handler. Returns an unsubscribe function.
	 *
	 * @template {keyof EngineEventPayload} E
	 * @param {E} event - Engine event name (e.g. 'image:visible')
	 * @param {function(EngineEventPayload[E]): void} handler
	 * @returns {function(): void} Unsubscribe function (idempotent)
	 *
	 * @typedef {Object} EngineEventPayload
	 * @property {void} ready - Engine mounted, canvas in DOM.
	 * @property {{ source: 'library'|'image', url?: string }} loading:start - Network fetch or texture load begun.
	 * @property {{ source: 'library'|'image', loaded: number, total?: number }} loading:progress - Optional progress update.
	 * @property {{ source: 'library'|'image', success: boolean }} loading:end - Fetch/texture load completed.
	 * @property {LibraryManifest} library:load - Manifest parsed successfully.
	 * @property {{ error: string, url: string, status?: number, code: 'network'|'auth'|'parse'|'timeout'|'unknown' }} library:error - Manifest fetch/parse failed.
	 * @property {LibraryContext} context:ready - Context parsed, theme/projection/resolution seeded.
	 * @property {ImageData} image:select - Selection changed (texture not yet loaded).
	 * @property {{ image?: ImageData, resolution?: string, url?: string }} image:load-request - Texture load handed to renderer.
	 * @property {{ image?: ImageData, resolution?: string, url?: string }} image:visible - Texture loaded + fade complete.
	 * @property {{ image?: ImageData, error: string, url?: string }} image:error - Texture load failed.
	 * @property {{ id: string, label: string }} resolution:change - Resolution variant changed.
	 * @property {{ projection: 'gnomonic'|'stereographic' }} projection:change - Projection mode changed.
	 * @property {{ resolved: 'light'|'dark', choice: 'auto'|'light'|'dark' }} theme:change - Theme changed.
	 * @property {{ color: string|null }} accent:change - Accent color changed.
	 * @property {{ enabled: boolean }} autorotate:change - Auto-rotate toggled.
	 * @property {{ isFullscreen: boolean }} fullscreen:change - Fullscreen state changed.
	 */
	on(event, handler) {
		if (!this._listeners.has(event)) {
			this._listeners.set(event, []);
		}
		this._listeners.get(event).push(handler);
		return () => this.off(event, handler);
	}

	/**
	 * Remove a previously registered event handler.
	 *
	 * @param {string} event
	 * @param {Function} handler
	 */
	off(event, handler) {
		const handlers = this._listeners.get(event);
		if (!handlers) return;
		const idx = handlers.indexOf(handler);
		if (idx !== -1) handlers.splice(idx, 1);
		if (handlers.length === 0) this._listeners.delete(event);
	}

	/**
	 * Emit an event to all registered handlers. Handlers fire in
	 * registration order; a throwing handler does not block subsequent
	 * handlers (error is logged to console).
	 *
	 * @param {string} event
	 * @param {*} [payload]
	 */
	emit(event, payload) {
		const handlers = this._listeners.get(event);
		if (!handlers || handlers.length === 0) return;
		const copy = handlers.slice();
		for (const handler of copy) {
			try {
				handler(payload);
			} catch (e) {
				console.error(`[Phong360] Error in "${event}" handler:`, e);
			}
		}
	}
}

// Register globally for script-tag loading
if (typeof window !== 'undefined') {
	window.Phong360MultiImage = Phong360MultiImage;
}
