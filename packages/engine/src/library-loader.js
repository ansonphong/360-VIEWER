/**
 * Phong 360 Engine — Library.json Loader
 *
 * Fetches and validates a library.json v4.0 manifest. Supports URL-based
 * (async fetch) and inline-object (synchronous setLibrary) loading paths.
 * Emits lifecycle events (loading:start, loading:end, library:load,
 * library:error) via the provided emitter.
 *
 * @version 5.0.0-rc.1
 * @license MIT
 */

class LibraryLoader {
	/**
	 * @param {{
	 *   libraryUrl: string|null,
	 *   emit: Function,
	 *   onData: Function  — called with parsed manifest data + context + sections + images
	 * }} opts
	 */
	constructor(opts) {
		this._libraryUrl = opts.libraryUrl || null;
		this._emit = opts.emit || (() => {});
		this._onData = opts.onData || (() => {});
		this._isLoading = false;
		this._abortController = null;
		this._manifest = null;
	}

	/** @returns {object|null} The last loaded manifest */
	get manifest() { return this._manifest; }

	/** @param {string} url */
	set libraryUrl(url) { this._libraryUrl = url; }

	/**
	 * Load the library manifest. Accepts either a URL string, an inline
	 * manifest object, or nothing (uses the configured libraryUrl).
	 *
	 * @param {string|object} [urlOrManifest]
	 * @returns {Promise<void>}
	 */
	async loadLibrary(urlOrManifest) {
		// Object form: synchronous setLibrary
		if (urlOrManifest && typeof urlOrManifest === 'object') {
			this.setLibrary(urlOrManifest);
			return;
		}
		// String form: update URL
		if (typeof urlOrManifest === 'string') {
			this._libraryUrl = urlOrManifest;
		}
		if (!this._libraryUrl) return;

		this._isLoading = true;
		this._abortController = new AbortController();
		const controller = this._abortController;
		this._emit('loading:start', { source: 'library' });

		const _endPreempted = () => {
			this._isLoading = false;
			this._emit('loading:end', { source: 'library', success: false });
		};

		try {
			const resp = await fetch(this._libraryUrl, {
				signal: controller.signal
			});
			if (controller.signal.aborted || this._abortController !== controller) {
				_endPreempted();
				return;
			}
			if (!resp.ok) throw new Error('HTTP ' + resp.status);
			const data = await resp.json();
			if (controller.signal.aborted || this._abortController !== controller) {
				_endPreempted();
				return;
			}
			this._processManifest(data);
			this._isLoading = false;
			this._emit('loading:end', { source: 'library', success: true });
		} catch (error) {
			if (error.name === 'AbortError' || controller.signal.aborted) {
				_endPreempted();
				return;
			}
			this._emit('library:error', {
				error: error.message,
				url: this._libraryUrl,
				code: error.name === 'SyntaxError' ? 'parse' : 'network'
			});
			this._isLoading = false;
			this._emit('loading:end', { source: 'library', success: false });
		} finally {
			if (this._abortController === controller) {
				this._abortController = null;
			}
		}
	}

	/**
	 * Synchronously load an inline manifest object, cancelling any
	 * in-flight fetch.
	 *
	 * @param {object} manifest
	 */
	setLibrary(manifest) {
		if (this._abortController) {
			this._abortController.abort();
			this._abortController = null;
		}
		this._processManifest(manifest);
	}

	/**
	 * Parse and validate a library.json manifest.
	 * @param {object} data
	 */
	_processManifest(data) {
		this._manifest = data;
		const context = data.context || null;
		const sections = data.sections || [];
		const allImages = [];

		// Flatten images from all sections
		for (const section of sections) {
			if (section.images) {
				for (const img of section.images) {
					if (this._isViewerLoadableImage(img)) allImages.push(img);
				}
			}
			if (section.items) {
				for (const item of section.items) {
					if (this._isViewerLoadableImage(item)) allImages.push(item);
				}
			}
		}

		this._emit('library:load', {
			manifest: data,
			context,
			sections,
			images: allImages,
			facets: data.facets || null
		});

		// Notify callback with structured data
		this._onData({ manifest: data, context, sections, images: allImages });
	}

	/**
	 * Check whether an image entry is loadable by the viewer.
	 * @param {object} image
	 * @returns {boolean}
	 */
	_isViewerLoadableImage(image) {
		if (!image) return false;
		if (image._drifted) return false;
		if (image.status && image.status !== 'ready') return false;
		return Array.isArray(image.resolutions) && image.resolutions.length > 0;
	}

	/**
	 * Cancel any in-flight fetch.
	 */
	abort() {
		if (this._abortController) {
			this._abortController.abort();
			this._abortController = null;
		}
	}
}

// Avoid polluting global if loaded as a module.
if (typeof window !== 'undefined') {
	window.LibraryLoader = LibraryLoader;
}

// ESM / CJS export compatibility
if (typeof module !== 'undefined' && module.exports) {
	module.exports = LibraryLoader;
}
