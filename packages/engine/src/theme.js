/**
 * Phong 360 Engine — Theme Bridge
 *
 * Manages dark/light mode and accent-color CSS-variable contracts.
 * Theme state lives on the container element via data-theme and --p360-*
 * custom properties. Library-ui layers read these for their own chrome.
 *
 * @version 5.0.0-rc.1
 * @license MIT
 */

class ThemeBridge {
	/**
	 * @param {{
	 *   container: HTMLElement,
	 *   sidebar: HTMLElement|null,
	 *   initialTheme: string,
	 *   initialAccent: string|null,
	 *   emit: Function,
	 *   onThemeResolved: Function|null
	 * }} opts
	 */
	constructor(opts) {
		this._containerEl = opts.container;
		this._sidebar       = opts.sidebar || null;
		this._theme         = opts.initialTheme || 'auto';
		this._accent        = opts.initialAccent || null;
		this._emit          = opts.emit || (() => {});
		this._onResolved    = opts.onThemeResolved || null; // called with (resolved) for UI updates
	}

	/** @returns {string} */
	get theme() { return this._theme; }

	/** @returns {string|null} */
	get accent() { return this._accent; }

	/**
	 * Set the current theme (dark, light, or auto).
	 * @param {string} theme
	 */
	setTheme(theme) {
		this._theme = theme;
		this._applyTheme(theme);
	}

	/**
	 * Apply the theme to the DOM via data-theme and --p360-canvas-bg.
	 * @param {string} theme
	 */
	_applyTheme(theme) {
		const resolved = this._resolveTheme(theme);
		if (this._containerEl) {
			this._containerEl.setAttribute('data-theme', resolved);
			this._containerEl.style.setProperty(
				'--p360-canvas-bg',
				resolved === 'dark' ? '#000000' : '#f0f0f0'
			);
		}
		if (this._sidebar) {
			this._sidebar.setAttribute('data-theme', resolved);
		}
		if (this._onResolved) this._onResolved(resolved);
	}

	/**
	 * Resolve a theme string (including 'auto' → OS preference).
	 * @param {string} theme
	 * @returns {'dark'|'light'}
	 */
	_resolveTheme(theme) {
		const t = theme || this._theme;
		if (t === 'auto') {
			return window.matchMedia?.('(prefers-color-scheme: light)').matches
				? 'light'
				: 'dark';
		}
		return t;
	}

	/**
	 * Resolve the current effective theme.
	 * @returns {'dark'|'light'}
	 */
	getResolvedTheme() {
		return this._resolveTheme(this._theme);
	}

	/**
	 * Set the accent color (hex string or null to clear).
	 * Writes --p360-accent, --p360-accent-hover, --p360-accent-active,
	 * and --p360-accent-border custom properties.
	 *
	 * @param {string|null} hex - e.g. '#6366f1', or null to reset
	 */
	setAccent(hex) {
		this._accent = hex;

		if (hex === null) {
			if (this._containerEl) {
				this._containerEl.style.removeProperty('--p360-accent');
			}
			if (this._sidebar) {
				this._sidebar.style.removeProperty('--p360-accent');
				this._sidebar.style.removeProperty('--p360-accent-hover');
				this._sidebar.style.removeProperty('--p360-accent-active');
				this._sidebar.style.removeProperty('--p360-accent-border');
			}
			this._emit('accent:change', { color: null });
			return;
		}

		if (!this._sidebar) return;

		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);

		// Lighten ~15% for hover
		const lighten = (v) => Math.min(255, Math.round(v + (255 - v) * 0.15));

		if (this._containerEl) {
			this._containerEl.style.setProperty('--p360-accent', hex);
		}
		this._sidebar.style.setProperty('--p360-accent', hex);
		this._sidebar.style.setProperty(
			'--p360-accent-hover',
			'#' +
				lighten(r).toString(16).padStart(2, '0') +
				lighten(g).toString(16).padStart(2, '0') +
				lighten(b).toString(16).padStart(2, '0')
		);
		this._sidebar.style.setProperty('--p360-accent-active', `rgba(${r},${g},${b},0.25)`);
		this._sidebar.style.setProperty('--p360-accent-border', `rgba(${r},${g},${b},0.6)`);

		this._emit('accent:change', { color: hex });
	}
}

// Avoid polluting global if loaded as a module.
if (typeof window !== 'undefined') {
	window.ThemeBridge = ThemeBridge;
}

// ESM / CJS export compatibility
if (typeof module !== 'undefined' && module.exports) {
	module.exports = ThemeBridge;
}
