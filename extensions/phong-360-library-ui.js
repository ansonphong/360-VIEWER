/**
 * Phong 360 Library UI - Layer 3
 *
 * Section-based library interface with pluggable template renderers.
 * Supports v4.0 library.json format with context, sections, badges,
 * theme management, accent colors, and deep-linking.
 *
 * @version 4.2.0
 * @author Phong
 * @license MIT
 */

// ============================================================
// SlotRegistry — keyed factory map for named UI slots
// ============================================================

/**
 * SlotRegistry — keyed factory map for named UI slots.
 *
 * Slots are named insertion points the engine renders into during
 * sidebar DOM construction. Consumers call viewer.setSlot(name, factory)
 * to register a render function; the engine calls it at the right time
 * and inserts the result.
 *
 * The registry validates names against the engine's frozen SLOT_NAMES
 * list — registering an unknown slot throws so consumer typos surface
 * loudly instead of silently no-oping.
 *
 * @since 4.2.0
 */
class SlotRegistry {
	constructor(validNames) {
		this._valid = new Set(validNames);
		this._factories = new Map();
	}

	set(name, factory) {
		if (!this._valid.has(name)) {
			throw new Error(
				`Phong360LibraryUI: unknown slot "${name}". ` +
				`Valid: ${[...this._valid].join(', ')}`,
			);
		}
		if (typeof factory !== 'function') {
			throw new Error(
				`Phong360LibraryUI: slot factory for "${name}" must be a function`,
			);
		}
		this._factories.set(name, factory);
	}

	clear(name) {
		this._factories.delete(name);
	}

	get(name) {
		return this._factories.get(name) || null;
	}

	has(name) {
		return this._factories.has(name);
	}
}

// ============================================================
// BaseRenderer — shared utilities for all template renderers
// ============================================================

class BaseRenderer {
	constructor(section, config, engine) {
		this.section = section;
		this.config = config;
		this.engine = engine;
	}

	createSectionHeading() {
		const heading = document.createElement('button');
		heading.className = 'p360-section-heading';
		heading.type = 'button';

		if (this.section.icon) {
			const icon = document.createElement('i');
			icon.className = this._resolveIcon(this.section.icon);
			heading.appendChild(icon);
		}

		const title = document.createElement('span');
		title.textContent = this.section.title || this.section.id || 'Section';
		heading.appendChild(title);

		const images = this.section.images || [];
		if (images.length > 0) {
			const count = document.createElement('span');
			count.className = 'p360-section-heading-count';
			count.textContent = images.length;
			heading.appendChild(count);
		}

		const chevron = document.createElement('span');
		chevron.className = 'p360-section-chevron';
		chevron.innerHTML = '&#9660;';
		heading.appendChild(chevron);

		return heading;
	}

	createThumbnail(image) {
		const wrapper = document.createElement('div');
		wrapper.className = 'p360-thumbnail';
		wrapper.dataset.imageId = image.id;
		wrapper.dataset.status = image.status || 'ready';
		if (image.primaryCollectionId !== undefined && image.primaryCollectionId !== null) {
			wrapper.dataset.primaryCollectionId = image.primaryCollectionId;
		}

		const thumbPath = image.thumbnail?.path || image.thumbnail;
		const isReady = !image._drifted && (!image.status || image.status === 'ready') && thumbPath;
		if (isReady) {
			const img = document.createElement('img');
			// Lazy loading via IntersectionObserver
			// Don't prepend baseUrl to absolute paths
			const isAbsolute = thumbPath.startsWith('/') || thumbPath.startsWith('http');
			img.dataset.src = isAbsolute ? thumbPath : this.config.baseUrl + thumbPath;
			img.alt = image.title || image.name || '';
			wrapper.appendChild(img);
		} else {
			wrapper.classList.add('p360-thumbnail--placeholder');
			if (image._drifted) wrapper.classList.add('p360-thumbnail--drifted');
			if (image.status === 'processing') wrapper.classList.add('p360-thumbnail--processing');
			if (image.status === 'error') wrapper.classList.add('p360-thumbnail--error');
			const placeholder = document.createElement('div');
			placeholder.className = 'p360-placeholder-tile';
			const icon = document.createElement('div');
			icon.className = 'p360-placeholder-icon';
			if (image._drifted) {
				icon.textContent = '!';
			} else if (image.status === 'processing') {
				icon.className += ' p360-placeholder-spinner';
			} else if (image.status === 'error') {
				icon.textContent = '!';
			}
			const caption = document.createElement('div');
			caption.className = 'p360-placeholder-caption';
			if (image._drifted) {
				caption.textContent = 'Recovering...';
			} else if (image.status === 'processing') {
				caption.textContent = 'Processing...';
			} else if (image.status === 'error') {
				caption.textContent = 'Failed - tap for options';
			} else {
				caption.textContent = 'Unavailable';
			}
			placeholder.appendChild(icon);
			placeholder.appendChild(caption);
			wrapper.appendChild(placeholder);
		}

		// Render badges if present
		const badges = image.badges || [];
		if (badges.length > 0) {
			this._renderBadges(wrapper, badges);
		}

		wrapper.addEventListener('click', (e) => {
			e.stopPropagation();
			if (!image._drifted && (!image.status || image.status === 'ready')) {
				this.engine.onImageClick(image);
			}
		});

		return wrapper;
	}

	_renderBadges(el, badges) {
		const container = document.createElement('div');
		container.className = 'p360-badges';

		const display = badges.slice(0, 3);
		for (const badge of display) {
			const b = document.createElement('span');
			b.className = 'p360-badge';

			// Normalize: accept both emoji/count and icon/value
			const icon = badge.emoji || badge.icon || '';
			const value = badge.count ?? badge.value ?? 0;

			const iconSpan = document.createElement('span');
			iconSpan.className = 'p360-badge-icon';
			iconSpan.textContent = this._getBadgeIcon(icon);
			b.appendChild(iconSpan);

			if (value > 0) {
				const countSpan = document.createElement('span');
				countSpan.className = 'p360-badge-count';
				countSpan.textContent = this._formatCount(value);
				b.appendChild(countSpan);
			}

			b.addEventListener('click', (ev) => {
				ev.stopPropagation();
				const imageData = this.engine._findImageInSections(el.dataset.imageId);
				if (this.engine.callbacks.onBadgeClick) {
					this.engine.callbacks.onBadgeClick(imageData, badge);
				}
			});

			container.appendChild(b);
		}

		el.appendChild(container);
	}

	_getBadgeIcon(icon) {
		if (!icon) return '';
		// If it contains a letter character, it's likely a Phosphor class, otherwise emoji
		if (/^[a-z]/i.test(icon) && !icon.match(/[\u{1F000}-\u{1FFFF}]/u)) {
			return icon; // Will be handled as CSS class by caller if needed
		}
		return icon; // Emoji — render as text
	}

	_formatCount(n) {
		if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
		if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
		return String(n);
	}

	_resolvePath(path) {
		if (!path) return '';
		if (path.startsWith('/') || path.startsWith('http')) return path;
		return this.config.baseUrl + path;
	}

	_resolveIcon(iconStr) {
		if (!iconStr) return '';
		// If already a full Phosphor class (e.g. "ph ph-folder")
		if (iconStr.startsWith('ph ')) return iconStr;
		// Short name (e.g. "folder" -> "ph ph-folder")
		return 'ph ph-' + iconStr;
	}

	render() {
		throw new Error('render() must be implemented by subclass');
	}
}

// ============================================================
// Built-in Renderers
// ============================================================

class GridRenderer extends BaseRenderer {
	render() {
		const el = document.createElement('div');
		el.className = 'p360-grid';
		for (const image of this.section.images || []) {
			el.appendChild(this.createThumbnail(image));
		}
		return el;
	}
}

class FeedRenderer extends BaseRenderer {
	render() {
		const el = document.createElement('div');
		el.className = 'p360-feed';
		for (const image of this.section.images || []) {
			const item = document.createElement('div');
			item.className = 'p360-feed-item';
			item.dataset.imageId = image.id;

			const img = document.createElement('img');
			const thumbPath = image.thumbnail?.path || image.thumbnail;
			if (thumbPath) {
				img.dataset.src = this._resolvePath(thumbPath);
				img.alt = image.title || image.name || '';
			}
			item.appendChild(img);

			// Badges
			if (image.badges && image.badges.length > 0) {
				this._renderBadges(item, image.badges);
			}

			const info = document.createElement('div');
			info.className = 'p360-feed-item-info';
			const title = document.createElement('p');
			title.className = 'p360-feed-item-title';
			title.textContent = image.title || image.name || '';
			info.appendChild(title);

			if (image.metadata?.creator || image.creator) {
				const meta = document.createElement('p');
				meta.className = 'p360-feed-item-meta';
				meta.textContent = 'by ' + (image.metadata?.creator || image.creator);
				info.appendChild(meta);
			}

			item.appendChild(info);

			item.addEventListener('click', (e) => {
				e.stopPropagation();
				this.engine.onImageClick(image);
			});

			el.appendChild(item);
		}
		return el;
	}
}

class AccordionRenderer extends BaseRenderer {
	render() {
		const el = document.createElement('div');
		el.className = 'p360-accordion';

		const trigger = document.createElement('button');
		trigger.className = 'p360-accordion-trigger';
		trigger.type = 'button';

		if (this.section.icon) {
			const icon = document.createElement('i');
			icon.className = this._resolveIcon(this.section.icon);
			trigger.appendChild(icon);
		}

		const titleSpan = document.createElement('span');
		titleSpan.textContent = this.section.title || this.section.id || 'Section';
		trigger.appendChild(titleSpan);

		const images = this.section.images || [];
		if (images.length > 0) {
			const count = document.createElement('span');
			count.className = 'p360-section-heading-count';
			count.textContent = images.length;
			trigger.appendChild(count);
		}

		const chevron = document.createElement('span');
		chevron.className = 'p360-accordion-chevron';
		chevron.innerHTML = '&#9660;';
		trigger.appendChild(chevron);

		el.appendChild(trigger);

		const body = document.createElement('div');
		body.className = 'p360-accordion-body';
		const inner = document.createElement('div');
		inner.className = 'p360-accordion-inner';

		// Delegate inner content to template engine directly (no section wrapper/heading)
		const innerTemplate = this.section.innerTemplate || 'grid';
		const innerSection = { ...this.section, template: innerTemplate, title: null };
		const innerContent = this.engine.templateEngine.render(innerSection, {
			baseUrl: this.config.baseUrl
		});
		if (innerContent) {
			inner.appendChild(innerContent);
		}

		body.appendChild(inner);
		el.appendChild(body);

		trigger.addEventListener('click', () => {
			el.classList.toggle('p360-accordion--open');
		});

		// Default open
		if (this.section.defaultOpen !== false) {
			el.classList.add('p360-accordion--open');
		}

		return el;
	}
}

class HeroRenderer extends BaseRenderer {
	render() {
		const images = this.section.images || [];
		if (images.length === 0) return document.createElement('div');

		const image = images[0];
		const el = document.createElement('div');
		el.className = 'p360-hero';
		el.dataset.imageId = image.id;

		const img = document.createElement('img');
		const thumbPath = image.thumbnail?.path || image.thumbnail;
		if (thumbPath) {
			img.dataset.src = this._resolvePath(thumbPath);
			img.alt = image.title || image.name || '';
		}
		el.appendChild(img);

		const overlay = document.createElement('div');
		overlay.className = 'p360-hero-overlay';

		const title = document.createElement('h3');
		title.className = 'p360-hero-title';
		title.textContent = image.title || image.name || '';
		overlay.appendChild(title);

		if (image.description) {
			const sub = document.createElement('p');
			sub.className = 'p360-hero-subtitle';
			sub.textContent = image.description;
			overlay.appendChild(sub);
		}

		el.appendChild(overlay);

		// Badges
		if (image.badges && image.badges.length > 0) {
			this._renderBadges(el, image.badges);
		}

		el.addEventListener('click', (e) => {
			e.stopPropagation();
			this.engine.onImageClick(image);
		});

		return el;
	}
}

class ListRenderer extends BaseRenderer {
	render() {
		const el = document.createElement('div');
		el.className = 'p360-list';
		for (const image of this.section.images || []) {
			const item = document.createElement('div');
			item.className = 'p360-list-item';
			item.dataset.imageId = image.id;

			const thumbPath = image.thumbnail?.path || image.thumbnail;
			if (thumbPath) {
				const img = document.createElement('img');
				img.className = 'p360-list-item-thumb';
				img.dataset.src = this._resolvePath(thumbPath);
				img.alt = image.title || image.name || '';
				item.appendChild(img);
			}

			const info = document.createElement('div');
			info.className = 'p360-list-item-info';
			const title = document.createElement('div');
			title.className = 'p360-list-item-title';
			title.textContent = image.title || image.name || '';
			info.appendChild(title);

			if (image.metadata?.creator || image.creator) {
				const meta = document.createElement('div');
				meta.className = 'p360-list-item-meta';
				meta.textContent = image.metadata?.creator || image.creator;
				info.appendChild(meta);
			}

			item.appendChild(info);

			item.addEventListener('click', (e) => {
				e.stopPropagation();
				this.engine.onImageClick(image);
			});

			el.appendChild(item);
		}
		return el;
	}
}

class CarouselRenderer extends BaseRenderer {
	render() {
		const el = document.createElement('div');
		el.className = 'p360-carousel';

		const track = document.createElement('div');
		track.className = 'p360-carousel-track';

		for (const image of this.section.images || []) {
			const item = document.createElement('div');
			item.className = 'p360-carousel-item';
			item.appendChild(this.createThumbnail(image));
			track.appendChild(item);
		}

		el.appendChild(track);
		return el;
	}
}

class AvatarRowRenderer extends BaseRenderer {
	render() {
		const el = document.createElement('div');
		el.className = 'p360-avatar-row';
		for (const item of this.section.items || this.section.images || []) {
			const avatar = document.createElement('div');
			avatar.className = 'p360-avatar-item';

			const img = document.createElement('img');
			img.className = 'p360-avatar';
			const avatarUrl = item.avatar || item.thumbnail?.path || item.thumbnail || '';
			if (avatarUrl) {
				img.dataset.src = this._resolvePath(avatarUrl);
			}
			img.alt = item.name || item.title || '';
			avatar.appendChild(img);

			const name = document.createElement('span');
			name.className = 'p360-avatar-name';
			name.textContent = item.name || item.title || '';
			avatar.appendChild(name);

			avatar.addEventListener('click', (e) => {
				e.stopPropagation();
				if (item.url && this.engine.callbacks.onLinkClick) {
					this.engine.callbacks.onLinkClick(item.url, item);
				} else if (item.id) {
					this.engine.onImageClick(item);
				}
			});

			el.appendChild(avatar);
		}
		return el;
	}
}

class AvatarGridRenderer extends BaseRenderer {
	render() {
		const el = document.createElement('div');
		el.className = 'p360-avatar-grid';
		for (const item of this.section.items || this.section.images || []) {
			const card = document.createElement('div');
			card.className = 'p360-avatar-card';

			const img = document.createElement('img');
			img.className = 'p360-avatar';
			const avatarUrl = item.avatar || item.thumbnail?.path || item.thumbnail || '';
			if (avatarUrl) {
				img.dataset.src = this._resolvePath(avatarUrl);
			}
			img.alt = item.name || item.title || '';
			card.appendChild(img);

			const name = document.createElement('div');
			name.className = 'p360-avatar-card-name';
			name.textContent = item.name || item.title || '';
			card.appendChild(name);

			if (item.count !== undefined || item.imageCount !== undefined) {
				const meta = document.createElement('div');
				meta.className = 'p360-avatar-card-meta';
				const n = item.count ?? item.imageCount;
				meta.textContent = n + ' image' + (n !== 1 ? 's' : '');
				card.appendChild(meta);
			}

			card.addEventListener('click', (e) => {
				e.stopPropagation();
				if (item.url && this.engine.callbacks.onLinkClick) {
					this.engine.callbacks.onLinkClick(item.url, item);
				} else if (item.id) {
					this.engine.onImageClick(item);
				}
			});

			el.appendChild(card);
		}
		return el;
	}
}

class EmptyStateRenderer extends BaseRenderer {
	render() {
		const el = document.createElement('div');
		el.className = 'p360-empty-state';

		const icon = document.createElement('i');
		icon.className = this._resolveIcon(this.section.icon || 'image');
		el.appendChild(icon);

		const title = document.createElement('div');
		title.className = 'p360-empty-state-title';
		title.textContent = this.section.title || 'No images yet';
		el.appendChild(title);

		if (this.section.message) {
			const msg = document.createElement('div');
			msg.className = 'p360-empty-state-message';
			msg.textContent = this.section.message;
			el.appendChild(msg);
		}

		return el;
	}
}

// ============================================================
// TemplateEngine — maps template names to renderers
// ============================================================

class TemplateEngine {
	constructor(engine) {
		this.engine = engine;
		this.renderers = {
			grid: GridRenderer,
			feed: FeedRenderer,
			accordion: AccordionRenderer,
			hero: HeroRenderer,
			list: ListRenderer,
			carousel: CarouselRenderer,
			'avatar-row': AvatarRowRenderer,
			'avatar-grid': AvatarGridRenderer,
			empty: EmptyStateRenderer
		};
	}

	register(name, RendererClass) {
		this.renderers[name] = RendererClass;
	}

	render(section, config) {
		const templateName = section.template || 'grid';
		const Renderer = this.renderers[templateName];
		if (!Renderer) {
			console.warn(`Unknown template "${templateName}", falling back to grid`);
			return new GridRenderer(section, config, this.engine).render();
		}
		return new Renderer(section, config, this.engine).render();
	}
}

// ============================================================
// Link detection — URL domain → Phosphor icon
// ============================================================

const LINK_ICONS = {
	'instagram.com': 'instagram-logo',
	'youtube.com': 'youtube-logo',
	'twitter.com': 'twitter-logo',
	'x.com': 'x-logo',
	'github.com': 'github-logo',
	'tiktok.com': 'tiktok-logo',
	'facebook.com': 'facebook-logo',
	'linkedin.com': 'linkedin-logo',
	'discord.com': 'discord-logo',
	'discord.gg': 'discord-logo',
	'twitch.tv': 'twitch-logo',
	'reddit.com': 'reddit-logo',
	'pinterest.com': 'pinterest-logo',
	'threads.net': 'threads-logo'
};

function detectLinkIcon(url) {
	try {
		const hostname = new URL(url).hostname.replace('www.', '');
		for (const [domain, icon] of Object.entries(LINK_ICONS)) {
			if (hostname === domain || hostname.endsWith('.' + domain)) {
				return 'ph ph-' + icon;
			}
		}
	} catch (e) {
		// invalid URL
	}
	return 'ph ph-link';
}

// ============================================================
// Phong360LibraryUI — main class
// ============================================================

class Phong360LibraryUI {
	static MOBILE_BREAKPOINT = 768;

	/**
	 * Names of all UI slots a consumer may register a factory for.
	 * Frozen to prevent runtime mutation. Renaming any of these is a
	 * breaking change.
	 * @since 4.2.0
	 */
	static SLOT_NAMES = Object.freeze([
		'toolbar-leading',
		'info-bar-leading',
		'info-bar-trailing',
		'sidebar-toggle-icon',
	]);

	/**
	 * @param {Object} options
	 * @param {string} options.containerId - DOM element ID for the 360 viewer canvas
	 * @param {string} [options.libraryUrl] - URL to fetch library.json
	 * @param {Object} [options.libraryData] - Pre-loaded library data
	 * @param {string} [options.autoloadId] - Auto-load image by id or slug after render
	 * @param {string} [options.filterCollection] - Only render section matching this collection slug
	 * @param {string} [options.theme] - 'dark' | 'light' | 'auto'
	 * @param {string} [options.accent] - Accent color hex (e.g. '#6366f1')
	 * @param {string} [options.baseUrl] - Base URL for resolving image paths
	 * @param {string} [options.configUrl] - URL to 360-viewer.json config (loaded separately from library)
	 * @param {number} [options.panelWidth] - Sidebar width in px (280-600)
	 * @param {string} [options.infoBar] - Info bar alignment: 'center' | 'left'
	 * @param {string} [options.favicon] - Emoji to use as favicon (e.g. '🌐')
	 * @param {boolean} [options.desktopOpenByDefault=false] - If true, sidebar opens
	 *     automatically on load when window > MOBILE_BREAKPOINT. Manual collapse
	 *     on desktop is remembered across resize round-trips.
	 */
	constructor(options = {}) {
		this.containerId = options.containerId;
		this.container = document.getElementById(options.containerId);
		if (!this.container) {
			throw new Error(`Container element "${options.containerId}" not found`);
		}

		this.libraryUrl = options.libraryUrl || null;
		this.libraryData = options.libraryData || null;
		this.autoloadId = options.autoloadId || null;
		// urlSync: true (default) | false | { read?: fn, write?: fn }
		// Controls deep-link URL behavior. Fires on every image change
		// (click, prev, next, autoload). Default preserves the legacy
		// `?img=<slug>` read/write pair for every existing consumer.
		this.urlSync = options.urlSync !== undefined ? options.urlSync : true;
		this.filterCollection = options.filterCollection || null;
		this.baseUrl = options.baseUrl || '';
		this.configUrl = options.configUrl || null;
		this._panelWidth = options.panelWidth || null;
		this._infoBarAlign = options.infoBar || null;
		this._favicon = options.favicon || null;
		this._sensitivity = options.sensitivity || null;
		this._grid = options.grid || null;
		this._desktopOpenByDefault = options.desktopOpenByDefault === true;

		// Core viewer instances (created internally)
		this.core = null;
		this.multiViewer = null;

		// Template engine
		this.templateEngine = new TemplateEngine(this);

		// Theme
		this._theme = options.theme || 'auto';
		this._accent = options.accent || null;

		// Callbacks
		this.callbacks = {
			onBadgeClick: null,
			onImageSelect: null,
			onImageLoad: null,
			onContextReady: null,
			onLibraryLoad: null,
			onSectionToggle: null,
			onLinkClick: null,
			onThemeChange: null
		};

		// State
		this._sections = [];
		this._allImages = [];
		this._context = null;
		this._sidebarOpen = false;
		this._userCollapsedOnDesktop = false;
		this._wasDesktop = null;
		this._currentImageId = null;
		this._currentImageData = null;

		// Owner-mode state (gallery management). Layer 4 dispatches
		// p360-owner-mode and p360-owner-action handles API writes; Layer 3
		// owns the DOM affordances and local optimistic mutations.
		this._ownerState = {
			enabled: false,
			userId: null,
			username: null,
			selectedImages: new Set(),
			dragInFlight: false,
			truncated: false
		};
		this._ownerMenus = new Set();

		// Model filter state (see plans/meta/2026-04-19-gallery-model-metadata/ §7.4)
		this._modelFilterState = {
			architectures: new Set(),
			models: new Set(),
			includeCustom: false,
			includeUnknown: false
		};
		this._modelFilterContainer = null;
		this._headerEl = null;
		this._hashchangeBound = false;
		this._infoDetails = null;

		// DOM references
		this._sidebar = null;
		this._backdrop = null;
		this._toggle = null;
		this._contentEl = null;
		this._observer = null;

		// Slot system (since 4.2.0)
		this._slots = new SlotRegistry(Phong360LibraryUI.SLOT_NAMES);
		// Slot factories receive loaded context. The sidebar DOM is built
		// BEFORE loadLibrary() resolves (engine builds chrome up-front, then
		// fetches the manifest). _contextLoaded gates slot rendering so
		// factories never see an empty {} context — first paint waits for
		// the library load to complete.
		this._contextLoaded = false;
		this._slotWrappers = {};

		// Initialize
		this.init();
		this._bindOwnerModeEvents();
	}

	async init() {
		this._initCore();
		this._buildSidebarDOM();
		this._setupLazyLoading();
		this._applyTheme(this._theme);

		// Track viewport class for resize handler
		this._wasDesktop = this._isDesktop();
		window.addEventListener('resize', () => this._handleResize());

		// Load standalone config (360-viewer.json) before library
		if (this.configUrl) {
			await this._loadConfig();
		}

		if (this.libraryUrl) {
			await this.loadLibrary();
		} else if (this.libraryData) {
			this._processLibraryData(this.libraryData);
		}

		// Opt-in default-open on desktop (after config + library applied, so
		// panel width / theme / content are settled before first paint).
		if (this._desktopOpenByDefault && this._isDesktop()) {
			this.openSidebar();
		}
	}

	async _loadConfig() {
		try {
			const resp = await fetch(this.configUrl);
			if (!resp.ok) return;
			const data = await resp.json();
			const ctx = data.context || data;
			// Apply config fields (constructor values take precedence)
			if (!this._panelWidth && ctx.panelWidth) this._panelWidth = ctx.panelWidth;
			if (!this._infoBarAlign && ctx.infoBar) this._infoBarAlign = ctx.infoBar;
			if (!this._favicon && ctx.favicon) this._favicon = ctx.favicon;
			if (!this._accent && ctx.accent) this._accent = ctx.accent;
			if (!this._grid && ctx.grid) this._grid = ctx.grid;
			if (ctx.sensitivity && this.core) {
				Object.assign(this.core.config.sensitivity, ctx.sensitivity);
			}
			if (this._theme === 'auto' && ctx.theme && ctx.theme !== 'auto') {
				this._applyTheme(ctx.theme);
			}
			// Apply early so sidebar width is correct before library loads
			this._applyPanelConfig();
		} catch (e) {
			console.warn('Could not load config:', e);
		}
	}

	// --------------------------------------------------------
	// Core viewer setup
	// --------------------------------------------------------

	_initCore() {
		// Auto-rotate preference
		let autoRotate = false;
		try {
			const saved = localStorage.getItem('phong360.preferences.autoRotate');
			if (saved !== null) autoRotate = saved === 'true';
		} catch (e) {
			/* ignore */
		}

		if (typeof Phong360ViewerCore !== 'undefined') {
			const coreConfig = {
				viewRotation: { autoRotate, autoRotationRate: 1 }
			};
			if (this._sensitivity) coreConfig.sensitivity = this._sensitivity;
			this.core = new Phong360ViewerCore({
				containerId: this.containerId,
				config: coreConfig
			});
		}

		if (typeof Phong360MultiImage !== 'undefined' && this.core) {
			this.multiViewer = new Phong360MultiImage({
				core: this.core,
				baseUrl: this.baseUrl,
				adaptiveLoading: true,
				callbacks: {
					onImageLoad: (imageData, resolution) => {
						this._onImageLoaded(imageData, resolution);
					},
					onImageError: (error) => {
						console.error('Image load error:', error);
					},
					onResolutionChange: (resolution) => {
						if (this._resBtn) {
							this._resBtn.textContent = resolution.id.toUpperCase();
						}
						if (this._resDropdown) {
							this._resDropdown.querySelectorAll('.p360-res-option').forEach((b) => {
								b.classList.toggle('active', b.dataset.resId === resolution.id);
							});
						}
					}
				}
			});
		}
	}

	// --------------------------------------------------------
	// Sidebar DOM
	// --------------------------------------------------------

	_buildSidebarDOM() {
		// Toggle button
		this._toggle = document.createElement('button');
		this._toggle.className = 'p360-sidebar-toggle';
		this._toggle.title = 'Browse Library';
		this._toggle.setAttribute('aria-controls', 'p360-sidebar');
		this._toggle.addEventListener('click', (e) => {
			e.stopPropagation();
			this.toggleSidebar();
		});
		// sidebar-toggle-icon slot wrapper (since 4.2.0). Persistent
		// across state changes so _updateToggleIcon → _renderSlot only
		// swaps the inner <i>, never the wrapper.
		const iconWrapper = document.createElement('span');
		iconWrapper.dataset.slot = 'sidebar-toggle-icon';
		iconWrapper.className = 'p360-slot';
		this._toggle.appendChild(iconWrapper);
		this._slotWrappers['sidebar-toggle-icon'] = iconWrapper;
		document.body.appendChild(this._toggle);

		// Backdrop
		this._backdrop = document.createElement('div');
		this._backdrop.className = 'p360-sidebar-backdrop';
		this._backdrop.addEventListener('click', () => this.closeSidebar());
		document.body.appendChild(this._backdrop);

		// Sidebar
		this._sidebar = document.createElement('div');
		this._sidebar.className = 'p360-sidebar';
		this._sidebar.id = 'p360-sidebar';
		this._sidebar.setAttribute('data-theme', this._resolveTheme());

		// Toolbar (resolution selector + projection toggle)
		this._toolbar = document.createElement('div');
		this._toolbar.className = 'p360-toolbar';
		this._buildToolbar();
		this._sidebar.appendChild(this._toolbar);

		// Content area
		this._contentEl = document.createElement('div');
		this._contentEl.className = 'p360-content';
		this._sidebar.appendChild(this._contentEl);

		document.body.appendChild(this._sidebar);
		this._buildInfoBar();
		this._updateToggleIcon();
	}

	_buildToolbar() {
		// toolbar-leading slot (since 4.2.0) — first child of toolbar.
		// Contains brand pill (default) or consumer-registered factory output.
		const leadingWrapper = document.createElement('div');
		leadingWrapper.dataset.slot = 'toolbar-leading';
		leadingWrapper.className = 'p360-slot';
		this._toolbar.appendChild(leadingWrapper);
		this._slotWrappers['toolbar-leading'] = leadingWrapper;
		// Defer first render to _renderAllSlots() after context loads.

		// Resolution dropdown
		this._resWrapper = document.createElement('div');
		this._resWrapper.className = 'p360-res-wrapper';
		this._resWrapper.style.display = 'none';

		this._resBtn = document.createElement('button');
		this._resBtn.className = 'p360-res-btn';
		this._resBtn.title = 'Image Resolution';
		this._resBtn.textContent = '--';
		this._resBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this._resDropdown.classList.toggle('open');
		});

		this._resDropdown = document.createElement('div');
		this._resDropdown.className = 'p360-res-dropdown';

		this._resWrapper.appendChild(this._resBtn);
		this._resWrapper.appendChild(this._resDropdown);
		this._toolbar.appendChild(this._resWrapper);

		// Projection toggle button
		this._projectionBtn = document.createElement('button');
		this._projectionBtn.className = 'p360-toolbar-btn';
		this._projectionBtn.title = 'Switch Projection (P)';
		this._projectionBtn.innerHTML = '<i class="ph ph-globe-hemisphere-east"></i>';
		this._projectionBtn.addEventListener('click', () => {
			if (this.core) {
				const next = this.core.projectionType === 0 ? 1 : 0;
				this.core.switchProjection(next);
				this._updateProjectionButton(next);
			}
		});
		this._toolbar.appendChild(this._projectionBtn);

		// Theme toggle button
		this._themeBtn = document.createElement('button');
		this._themeBtn.className = 'p360-toolbar-btn';
		this._themeBtn.title = 'Toggle Theme';
		this._themeBtn.innerHTML = '<i class="ph ph-moon"></i>';
		this._themeBtn.addEventListener('click', () => {
			const resolved = this._resolveTheme();
			const next = resolved === 'dark' ? 'light' : 'dark';
			this.setTheme(next);
			this._updateThemeButton(next);
		});
		this._toolbar.appendChild(this._themeBtn);

		// Help button
		this._helpBtn = document.createElement('button');
		this._helpBtn.className = 'p360-toolbar-btn';
		this._helpBtn.title = 'Help';
		this._helpBtn.innerHTML = '<i class="ph ph-question"></i>';
		this._helpBtn.addEventListener('click', () => {
			document.dispatchEvent(new CustomEvent('p360-help'));
			if (this.callbacks.onHelpClick) this.callbacks.onHelpClick();
		});
		this._toolbar.appendChild(this._helpBtn);

		// Close resolution dropdown on outside click
		document.addEventListener('click', () => {
			if (this._resDropdown) this._resDropdown.classList.remove('open');
		});
	}

	_buildInfoBar() {
		this._infoBar = document.createElement('div');
		this._infoBar.className = 'p360-info-bar p360-info-center'; // default center

		// Prev button
		this._prevBtn = document.createElement('button');
		this._prevBtn.className = 'p360-info-nav';
		this._prevBtn.innerHTML = '<i class="ph ph-caret-left"></i>';
		this._prevBtn.title = 'Previous image';
		this._prevBtn.disabled = true;
		this._prevBtn.addEventListener('click', () => {
			if (this.multiViewer) this.multiViewer.loadPreviousImage();
		});

		// Text
		this._infoText = document.createElement('div');
		this._infoText.className = 'p360-info-text';

		this._infoTitle = document.createElement('div');
		this._infoTitle.className = 'p360-info-title';
		this._infoTitle.textContent = 'Loading...';

		this._infoSubtitle = document.createElement('div');
		this._infoSubtitle.className = 'p360-info-subtitle';
		this._infoSubtitle.textContent = '360\u00B0 Viewer';

		this._infoText.appendChild(this._infoTitle);
		this._infoText.appendChild(this._infoSubtitle);

		// Next button
		this._nextBtn = document.createElement('button');
		this._nextBtn.className = 'p360-info-nav';
		this._nextBtn.innerHTML = '<i class="ph ph-caret-right"></i>';
		this._nextBtn.title = 'Next image';
		this._nextBtn.disabled = true;
		this._nextBtn.addEventListener('click', () => {
			if (this.multiViewer) this.multiViewer.loadNextImage();
		});

		// info-bar-leading slot (since 4.2.0) — between prev arrow and title
		const leadingWrapper = document.createElement('div');
		leadingWrapper.dataset.slot = 'info-bar-leading';
		leadingWrapper.className = 'p360-slot';
		this._slotWrappers['info-bar-leading'] = leadingWrapper;

		// info-bar-trailing slot (since 4.2.0) — between title and next arrow
		const trailingWrapper = document.createElement('div');
		trailingWrapper.dataset.slot = 'info-bar-trailing';
		trailingWrapper.className = 'p360-slot';
		this._slotWrappers['info-bar-trailing'] = trailingWrapper;

		this._infoBar.appendChild(this._prevBtn);
		this._infoBar.appendChild(leadingWrapper);
		this._infoBar.appendChild(this._infoText);
		this._infoBar.appendChild(trailingWrapper);
		this._infoBar.appendChild(this._nextBtn);
		document.body.appendChild(this._infoBar);
	}

	_updateInfoBar(imageData, resolution) {
		if (!this._infoBar) return;

		// Title
		this._infoTitle.textContent = imageData.title || imageData.name || 'Unknown';

		// Subtitle: resolution info
		if (resolution) {
			this._infoSubtitle.textContent =
				resolution.id.toUpperCase() + ' (' + resolution.width + '\u00D7' + resolution.height + ')';
		} else {
			this._infoSubtitle.textContent = 'Equirectangular';
		}

		// Show the bar
		this._infoBar.classList.add('visible');

		// Update prev/next button disabled state
		if (this.multiViewer && this._allImages.length > 0) {
			const idx = this._allImages.findIndex((img) => img.id === imageData.id);
			this._prevBtn.disabled = idx <= 0;
			this._nextBtn.disabled = idx === -1 || idx >= this._allImages.length - 1;
		}

		// Model / LoRAs / Full settings block (design §7.5)
		if (!this._infoDetails) {
			this._infoDetails = document.createElement('div');
			this._infoDetails.className = 'p360-info-details';
			this._infoBar.appendChild(this._infoDetails);
		}
		this._renderInfoDetails(imageData);
	}

	_updateResolutionSelector(imageData, currentResolution) {
		if (!this._resBtn || !imageData?.resolutions) return;

		this._resDropdown.innerHTML = '';
		for (const res of imageData.resolutions) {
			const btn = document.createElement('button');
			btn.className = 'p360-res-option';
			btn.textContent = res.id.toUpperCase();
			btn.dataset.resId = res.id;
			if (currentResolution && currentResolution.id === res.id) {
				btn.classList.add('active');
				this._resBtn.textContent = res.id.toUpperCase();
			}
			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				if (this.multiViewer) this.multiViewer.switchResolution(res.id);
				this._resDropdown
					.querySelectorAll('.p360-res-option')
					.forEach((b) => b.classList.remove('active'));
				btn.classList.add('active');
				this._resBtn.textContent = res.id.toUpperCase();
				this._resDropdown.classList.remove('open');
			});
			this._resDropdown.appendChild(btn);
		}
		this._resWrapper.style.display = '';
	}

	_updateProjectionButton(type) {
		if (!this._projectionBtn) return;
		if (type === 1) {
			this._projectionBtn.innerHTML = '<i class="ph ph-globe-hemisphere-east"></i>';
			this._projectionBtn.title = 'Stereographic — click for Gnomonic (P)';
			this._projectionBtn.classList.remove('active');
		} else {
			this._projectionBtn.innerHTML = '<i class="ph ph-cube"></i>';
			this._projectionBtn.title = 'Gnomonic — click for Stereographic (P)';
			this._projectionBtn.classList.add('active');
		}
	}

	_updateThemeButton(theme) {
		if (!this._themeBtn) return;
		if (theme === 'dark') {
			this._themeBtn.innerHTML = '<i class="ph ph-moon"></i>';
		} else {
			this._themeBtn.innerHTML = '<i class="ph ph-sun"></i>';
		}
	}

	_applyPanelConfig() {
		// Panel width: constructor > context > default CSS
		const pw = this._panelWidth || this._context?.panelWidth;
		if (pw) {
			const w = Math.max(280, Math.min(600, parseInt(pw)));
			document.documentElement.style.setProperty('--p360-sidebar-width', w + 'px');
		}

		// Info bar alignment: constructor > context > default 'center'
		if (this._infoBar) {
			const align = this._infoBarAlign || this._context?.infoBar || 'center';
			this._infoBar.classList.remove('p360-info-left', 'p360-info-center');
			this._infoBar.classList.add(align === 'left' ? 'p360-info-left' : 'p360-info-center');
		}

		// Favicon: constructor > context
		const emoji = this._favicon || this._context?.favicon;
		if (emoji) {
			this._setEmojiFavicon(emoji);
		}

		// Grid layout: constructor > context
		const grid = this._grid || this._context?.grid;
		if (grid) {
			if (grid.minWidth) {
				document.documentElement.style.setProperty(
					'--p360-grid-min-width',
					parseInt(grid.minWidth) + 'px'
				);
			}
			if (grid.gap) {
				document.documentElement.style.setProperty('--p360-grid-gap', parseInt(grid.gap) + 'px');
			}
		}
	}

	_setEmojiFavicon(emoji) {
		const canvas = document.createElement('canvas');
		canvas.width = 64;
		canvas.height = 64;
		const ctx = canvas.getContext('2d');
		ctx.font = '56px serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(emoji, 32, 38);

		// Remove existing favicons
		const existing = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
		existing.forEach((el) => el.remove());

		const link = document.createElement('link');
		link.rel = 'icon';
		link.href = canvas.toDataURL('image/png');
		document.head.appendChild(link);
	}

	// --------------------------------------------------------
	// Library loading
	// --------------------------------------------------------

	async loadLibrary() {
		if (!this.libraryUrl) return;
		try {
			const resp = await fetch(this.libraryUrl);
			if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
			const data = await resp.json();
			this._processLibraryData(data);
		} catch (error) {
			console.error('Error loading library:', error);
		}
	}

	_isViewerLoadableImage(image) {
		if (!image) return false;
		if (image._drifted) return false;
		if (image.status && image.status !== 'ready') return false;
		return Array.isArray(image.resolutions) && image.resolutions.length > 0;
	}

	_processLibraryData(data) {
		this.libraryData = data;
		this._context = data.context || null;
		this._sections = data.sections || [];
		this._ownerState.truncated = !!(data.truncated || (data.meta && data.meta.truncated));
		this._allImages = [];

		// Flatten all images from all sections
		for (const section of this._sections) {
			if (section.images) {
				this._allImages.push(...section.images.filter((img) => this._isViewerLoadableImage(img)));
			}
			if (section.items) {
				// items can also contain images (avatar sections)
				for (const item of section.items) {
					if (this._isViewerLoadableImage(item)) this._allImages.push(item);
				}
			}
		}

		// Set images on multi-viewer
		if (this.multiViewer) {
			this.multiViewer.setImages(this._allImages);
		}

		// Apply accent from context if not set via constructor
		if (!this._accent && this._context?.accent) {
			this._accent = this._context.accent;
		}
		if (this._accent) {
			this.setAccent(this._accent);
		}

		// Apply theme from context if constructor was 'auto'
		if (this._theme === 'auto' && this._context?.theme && this._context.theme !== 'auto') {
			this._applyTheme(this._context.theme);
		}

		this._applyPanelConfig();

		// Build the model filter block before sections render (appears above them)
		this._buildModelFilter(data.facets && data.facets.model);

		// Render (sections first since it clears innerHTML, then context prepends header)
		this._renderSections(this._sections);
		this._renderContext(this._context);
		this._syncOwnerDecorations();

		// Callbacks
		if (this.callbacks.onLibraryLoad) {
			this.callbacks.onLibraryLoad(data);
		}
		// Mark context as loaded BEFORE firing onContextReady. Until this
		// flips, all _renderSlot calls (from setSlot/clearSlot/state changes)
		// are deferred. Guarantees factories never see an empty context.
		this._contextLoaded = true;
		// Render all slots: wrappers built earlier during _buildSidebarDOM
		// / _buildInfoBar are in the DOM — we now swap their inner content
		// with context-aware defaults / registered factories.
		this._renderAllSlots();

		if (this._context && this.callbacks.onContextReady) {
			this.callbacks.onContextReady(this._context);
		}

		// Handle URL params or autoload
		this._handleUrlParameters();
	}

	// --------------------------------------------------------
	// Context header rendering
	// --------------------------------------------------------

	_renderContext(context) {
		if (!context) return;

		const header = document.createElement('div');
		header.className = 'p360-header';

		if (context.type === 'profile') {
			const row = document.createElement('div');
			row.className = 'p360-header-profile';

			if (context.avatar) {
				const avatar = document.createElement('img');
				avatar.className = 'p360-header-avatar';
				avatar.src = context.avatar;
				avatar.alt = context.title || '';
				row.appendChild(avatar);
			}

			const info = document.createElement('div');
			info.className = 'p360-header-info';

			const title = document.createElement('h2');
			title.className = 'p360-header-title';
			title.textContent = context.title || '';
			info.appendChild(title);

			if (context.subtitle) {
				const sub = document.createElement('p');
				sub.className = 'p360-header-subtitle';
				sub.textContent = context.subtitle;
				info.appendChild(sub);
			}

			row.appendChild(info);
			header.appendChild(row);

			// Links
			if (context.links && context.links.length > 0) {
				const linksEl = document.createElement('div');
				linksEl.className = 'p360-header-links';
				for (const link of context.links) {
					const a = document.createElement('a');
					a.className = 'p360-header-link';
					a.href = link.url;
					a.target = '_blank';
					a.rel = 'noopener noreferrer';

					const icon = document.createElement('i');
					icon.className = detectLinkIcon(link.url);
					a.appendChild(icon);

					const label = document.createTextNode(link.label || this._domainFromUrl(link.url));
					a.appendChild(label);

					a.addEventListener('click', (e) => {
						if (this.callbacks.onLinkClick) {
							e.preventDefault();
							this.callbacks.onLinkClick(link.url, link);
						}
					});

					linksEl.appendChild(a);
				}
				header.appendChild(linksEl);
			}
		} else {
			// discover or local
			// Skip the legacy <h2> when context.suppressHeader is true.
			// Independent of context.brand — third-party consumers can have
			// a brand pill AND a distinct discover/local heading.
			if (!context.suppressHeader) {
				const title = document.createElement('h2');
				title.className = 'p360-header-title';
				title.textContent = context.title || (context.type === 'discover' ? 'Discover' : 'Library');
				header.appendChild(title);
			}

			if (context.subtitle) {
				const sub = document.createElement('p');
				sub.className = 'p360-header-subtitle';
				sub.textContent = context.subtitle;
				header.appendChild(sub);
			}
		}

		// Insert header inside scrollable content area
		this._contentEl.insertBefore(header, this._contentEl.firstChild);
		this._headerEl = header;
	}

	_domainFromUrl(url) {
		try {
			return new URL(url).hostname.replace('www.', '');
		} catch (e) {
			return url;
		}
	}

	// --------------------------------------------------------
	// Section rendering
	// --------------------------------------------------------

	_renderSections(sections) {
		// Selective clear — preserve persistent UI (header + filter bar) and
		// only remove section/empty-state children. The old code wiped
		// innerHTML and re-attached _headerEl + _modelFilterContainer, which
		// destroyed the .p360-filter-bar wrapper introduced for the new
		// dropdown layout. The bar is now a permanent child of _contentEl.
		const keep = new Set(
			[this._headerEl, this._filterBarEl].filter(Boolean)
		);
		Array.from(this._contentEl.children).forEach((child) => {
			if (!keep.has(child)) this._contentEl.removeChild(child);
		});

		const collScoped = this.filterCollection
			? sections.filter((s) => s.id === this.filterCollection || s.slug === this.filterCollection)
			: sections;

		const filtered = this._applyModelFilterToSections(collScoped);

		const allEmpty = filtered.length === 0 || filtered.every(
			(s) => !s.keepEmpty && !(s.images && s.images.length) && !(s.items && s.items.length)
		);

		if (allEmpty) {
			const emptySection = {
				template: 'empty',
				title: 'No images found',
				icon: 'image',
				message: this._isModelFilterActive()
					? 'No images match the selected models.'
					: 'This gallery is empty.'
			};
			const el = this.templateEngine.render(emptySection, { baseUrl: this.baseUrl });
			this._contentEl.appendChild(el);
		} else {
			for (const section of filtered) {
				const sectionEl = this.renderSection(section);
				if (sectionEl) {
					this._contentEl.appendChild(sectionEl);
				}
			}
			// Start observing lazy images
			this._observeImages();
		}

		// Notify consumers (e.g. gallery-integration's teaser-row injector)
		// that section DOM has just been rebuilt. `filtered` is the array
		// that was actually rendered — already model-filtered.
		if (this.callbacks && typeof this.callbacks.onSectionsRendered === 'function') {
			this.callbacks.onSectionsRendered(filtered, this._isModelFilterActive());
		}
		this._syncOwnerDecorations();
	}

	_isModelFilterActive() {
		const s = this._modelFilterState;
		return s.architectures.size > 0 || s.models.size > 0 || s.includeCustom || s.includeUnknown;
	}

	_applyModelFilterToSections(sections) {
		if (!this._isModelFilterActive()) return sections;
		const s = this._modelFilterState;
		return sections.map((section) => {
			const images = Array.isArray(section.images) ? section.images : null;
			if (!images) return section;
			const kept = images.filter((item) => {
				const m = item.model;
				if (m == null) return s.includeUnknown;
				if (m.isCustom) return s.includeCustom || (m.id && s.models.has(m.id));
				if (m.id && s.models.has(m.id)) return true;
				if (m.architecture && s.architectures.has(m.architecture)) return true;
				return false;
			});
			return { ...section, images: kept };
		});
	}

	_applyModelFilter() {
		this._renderSections(this._sections);
		this._writeHash();
		this._renderActivePills();
		this._updateFilterCountBadge();
		if (this._filterClearBtn) {
			this._filterClearBtn.style.display = this._isModelFilterActive() ? '' : 'none';
		}
	}

	_buildModelFilter(facets) {
		// Build the filter bar (self-contained: trigger + dropdown + pills)
		// inside _contentEl so the gallery's toolbar relocation can't touch it.
		this._buildFilterBar();
		if (this._filterDropdown) this._filterDropdown.innerHTML = '';
		this._modelFilterContainer = null;
		if (this._filterBarEl) this._filterBarEl.style.display = 'none';
		if (this._activePillsEl) this._activePillsEl.innerHTML = '';

		if (!facets || !this._filterDropdown) return;

		const archs = Array.isArray(facets.architectures) ? facets.architectures : [];
		const models = Array.isArray(facets.models) ? facets.models : [];
		const customCount = facets.customCount || 0;
		const unknownCount = facets.unknownCount || 0;
		if (archs.length === 0 && models.length === 0 && customCount === 0 && unknownCount === 0) {
			return;
		}

		// Cache facets so _renderActivePills can resolve display labels
		this._modelFacets = { archs, models, customCount, unknownCount };

		const wrap = document.createElement('div');
		wrap.className = 'p360-model-filter';

		const heading = document.createElement('div');
		heading.className = 'p360-model-filter-heading';
		const headingLabel = document.createElement('span');
		headingLabel.textContent = 'Model';
		heading.appendChild(headingLabel);
		const clearBtn = document.createElement('button');
		clearBtn.type = 'button';
		clearBtn.className = 'p360-model-filter-clear';
		clearBtn.textContent = 'Clear all';
		clearBtn.addEventListener('click', () => {
			const s = this._modelFilterState;
			s.architectures.clear();
			s.models.clear();
			s.includeCustom = false;
			s.includeUnknown = false;
			this._syncFilterUIFromState();
			this._applyModelFilter();
		});
		heading.appendChild(clearBtn);
		this._filterClearBtn = clearBtn;
		wrap.appendChild(heading);

		const modelsByArch = {};
		for (const m of models) {
			const a = m.architecture || '__';
			(modelsByArch[a] = modelsByArch[a] || []).push(m);
		}

		for (const arch of archs) {
			const archRow = document.createElement('div');
			archRow.className = 'p360-model-filter-arch';

			const archLabel = document.createElement('label');
			const archCb = document.createElement('input');
			archCb.type = 'checkbox';
			archCb.dataset.archId = arch.id;
			archCb.addEventListener('change', () => {
				if (archCb.checked) this._modelFilterState.architectures.add(arch.id);
				else this._modelFilterState.architectures.delete(arch.id);
				this._applyModelFilter();
			});
			archLabel.appendChild(archCb);
			archLabel.appendChild(document.createTextNode(` ${arch.label || arch.id} (${arch.count})`));
			archRow.appendChild(archLabel);

			const archModels = modelsByArch[arch.id] || [];
			if (archModels.length) {
				const subList = document.createElement('div');
				subList.className = 'p360-model-filter-sublist';
				for (const m of archModels) {
					const modLabel = document.createElement('label');
					const modCb = document.createElement('input');
					modCb.type = 'checkbox';
					modCb.dataset.modelId = m.id;
					modCb.addEventListener('change', () => {
						if (modCb.checked) this._modelFilterState.models.add(m.id);
						else this._modelFilterState.models.delete(m.id);
						this._applyModelFilter();
					});
					modLabel.appendChild(modCb);
					modLabel.appendChild(document.createTextNode(` ${m.displayName || m.id} (${m.count})`));
					subList.appendChild(modLabel);
				}
				archRow.appendChild(subList);
			}
			wrap.appendChild(archRow);
		}

		if (customCount > 0) {
			const row = document.createElement('div');
			row.className = 'p360-model-filter-bucket';
			const lbl = document.createElement('label');
			const cb = document.createElement('input');
			cb.type = 'checkbox';
			cb.dataset.bucket = 'custom';
			cb.addEventListener('change', () => {
				this._modelFilterState.includeCustom = cb.checked;
				this._applyModelFilter();
			});
			lbl.appendChild(cb);
			lbl.appendChild(document.createTextNode(` Other / Custom (${customCount})`));
			row.appendChild(lbl);
			wrap.appendChild(row);
		}

		if (unknownCount > 0) {
			const row = document.createElement('div');
			row.className = 'p360-model-filter-bucket';
			const lbl = document.createElement('label');
			const cb = document.createElement('input');
			cb.type = 'checkbox';
			cb.dataset.bucket = 'unknown';
			cb.addEventListener('change', () => {
				this._modelFilterState.includeUnknown = cb.checked;
				this._applyModelFilter();
			});
			lbl.appendChild(cb);
			lbl.appendChild(document.createTextNode(` Unknown (${unknownCount})`));
			row.appendChild(lbl);
			wrap.appendChild(row);
		}

		this._filterDropdown.appendChild(wrap);
		this._modelFilterContainer = wrap;
		if (this._filterBarEl) this._filterBarEl.style.display = '';

		// Restore from URL on first build, then listen for back/forward
		this._readHash();
		this._syncFilterUIFromState();
		if (!this._hashchangeBound) {
			window.addEventListener('hashchange', () => {
				this._readHash();
				this._syncFilterUIFromState();
				this._renderSections(this._sections);
			});
			this._hashchangeBound = true;
		}
	}

	_writeHash() {
		const s = this._modelFilterState;
		const parts = [];
		if (s.architectures.size > 0) {
			parts.push('arch=' + [...s.architectures].join(','));
		}
		const modelVals = [...s.models];
		if (s.includeCustom) modelVals.push('custom');
		if (s.includeUnknown) modelVals.push('unknown');
		if (modelVals.length > 0) {
			parts.push('model=' + modelVals.join(','));
		}
		const hash = parts.length ? '#' + parts.join('&') : '';
		const url = window.location.pathname + window.location.search + hash;
		try { history.replaceState(null, '', url); } catch (_) { /* file:// may reject */ }
	}

	_readHash() {
		const raw = (window.location.hash || '').replace(/^#/, '');
		const s = this._modelFilterState;
		s.architectures.clear();
		s.models.clear();
		s.includeCustom = false;
		s.includeUnknown = false;
		if (!raw) return false;
		for (const pair of raw.split('&')) {
			const eq = pair.indexOf('=');
			if (eq < 0) continue;
			const key = pair.slice(0, eq);
			const val = decodeURIComponent(pair.slice(eq + 1));
			if (!val) continue;
			const items = val.split(',').filter(Boolean);
			if (key === 'arch') {
				for (const a of items) s.architectures.add(a);
			} else if (key === 'model') {
				for (const m of items) {
					if (m === 'custom') s.includeCustom = true;
					else if (m === 'unknown') s.includeUnknown = true;
					else s.models.add(m);
				}
			}
		}
		return true;
	}

	_syncFilterUIFromState() {
		const s = this._modelFilterState;
		if (this._modelFilterContainer) {
			const archCbs = this._modelFilterContainer.querySelectorAll('input[data-arch-id]');
			archCbs.forEach((cb) => { cb.checked = s.architectures.has(cb.dataset.archId); });
			const modCbs = this._modelFilterContainer.querySelectorAll('input[data-model-id]');
			modCbs.forEach((cb) => { cb.checked = s.models.has(cb.dataset.modelId); });
			const customCb = this._modelFilterContainer.querySelector('input[data-bucket="custom"]');
			if (customCb) customCb.checked = s.includeCustom;
			const unknownCb = this._modelFilterContainer.querySelector('input[data-bucket="unknown"]');
			if (unknownCb) unknownCb.checked = s.includeUnknown;
		}
		this._renderActivePills();
		this._updateFilterCountBadge();
		if (this._filterClearBtn) {
			this._filterClearBtn.style.display = this._isModelFilterActive() ? '' : 'none';
		}
	}

	_buildFilterBar() {
		if (this._filterBarEl && this._filterBarEl.parentNode === this._contentEl) return;
		if (!this._contentEl) return;
		// If a stale reference exists but the node was detached, drop it so we rebuild.
		this._filterBarEl = null;

		const bar = document.createElement('div');
		bar.className = 'p360-filter-bar';
		bar.style.display = 'none';

		const trigger = document.createElement('button');
		trigger.type = 'button';
		trigger.className = 'p360-filter-trigger';
		trigger.setAttribute('aria-haspopup', 'menu');
		trigger.setAttribute('aria-expanded', 'false');
		trigger.innerHTML =
			'<i class="ph ph-funnel-simple"></i>' +
			'<span class="p360-filter-trigger-label">Filter</span>' +
			'<span class="p360-filter-trigger-count" data-count="0"></span>' +
			'<i class="ph ph-caret-down p360-filter-trigger-caret"></i>';
		this._filterTrigger = trigger;
		this._filterCountBadge = trigger.querySelector('.p360-filter-trigger-count');

		const pills = document.createElement('div');
		pills.className = 'p360-active-filters';
		pills.addEventListener('click', (e) => {
			const pill = e.target.closest('.p360-active-pill');
			if (!pill) return;
			const kind = pill.dataset.kind;
			const id = pill.dataset.id;
			const s = this._modelFilterState;
			if (kind === 'arch') s.architectures.delete(id);
			else if (kind === 'model') s.models.delete(id);
			else if (kind === 'bucket' && id === 'custom') s.includeCustom = false;
			else if (kind === 'bucket' && id === 'unknown') s.includeUnknown = false;
			this._syncFilterUIFromState();
			this._applyModelFilter();
		});
		this._activePillsEl = pills;

		const dropdown = document.createElement('div');
		dropdown.className = 'p360-filter-dropdown';
		dropdown.dataset.state = 'closed';
		dropdown.setAttribute('role', 'menu');
		dropdown.addEventListener('click', (e) => e.stopPropagation());
		this._filterDropdown = dropdown;

		trigger.addEventListener('click', (e) => {
			e.stopPropagation();
			const isOpen = dropdown.dataset.state === 'open';
			dropdown.dataset.state = isOpen ? 'closed' : 'open';
			trigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
			if (!isOpen) this._syncFilterUIFromState();
		});

		bar.appendChild(trigger);
		bar.appendChild(pills);
		bar.appendChild(dropdown);

		// Insert as the first child of _contentEl so it sits above all sections
		if (this._contentEl.firstChild) {
			this._contentEl.insertBefore(bar, this._contentEl.firstChild);
		} else {
			this._contentEl.appendChild(bar);
		}
		this._filterBarEl = bar;

		// Outside click + ESC close the dropdown
		if (!this._filterOutsideBound) {
			document.addEventListener('click', (e) => {
				if (!this._filterDropdown) return;
				if (this._filterDropdown.dataset.state !== 'open') return;
				// Only clicks INSIDE the dropdown panel itself keep it open.
				// Trigger toggles via its own handler (stopPropagation), so
				// clicks anywhere else — including pills, the bar's
				// background, sections, header — close the dropdown.
				if (this._filterDropdown.contains(e.target)) return;
				this._filterDropdown.dataset.state = 'closed';
				this._filterTrigger.setAttribute('aria-expanded', 'false');
			});
			document.addEventListener('keydown', (e) => {
				if (e.key !== 'Escape') return;
				if (!this._filterDropdown) return;
				if (this._filterDropdown.dataset.state !== 'open') return;
				this._filterDropdown.dataset.state = 'closed';
				this._filterTrigger.setAttribute('aria-expanded', 'false');
			});
			this._filterOutsideBound = true;
		}
	}

	_renderActivePills() {
		if (!this._activePillsEl) return;
		this._activePillsEl.innerHTML = '';
		const s = this._modelFilterState;
		const facets = this._modelFacets || { archs: [], models: [] };
		const archById = new Map(facets.archs.map((a) => [a.id, a]));
		const modelById = new Map(facets.models.map((m) => [m.id, m]));

		const make = (kind, id, label) => {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'p360-active-pill';
			btn.dataset.kind = kind;
			btn.dataset.id = id;
			btn.title = `Remove ${label} filter`;
			const lbl = document.createElement('span');
			lbl.className = 'p360-active-pill-label';
			lbl.textContent = label;
			const x = document.createElement('span');
			x.className = 'p360-active-pill-x';
			x.innerHTML = '<i class="ph ph-x"></i>';
			btn.appendChild(lbl);
			btn.appendChild(x);
			this._activePillsEl.appendChild(btn);
		};

		s.architectures.forEach((id) => {
			const a = archById.get(id);
			make('arch', id, a ? (a.label || a.id) : id);
		});
		s.models.forEach((id) => {
			const m = modelById.get(id);
			make('model', id, m ? (m.displayName || m.id) : id);
		});
		if (s.includeCustom) make('bucket', 'custom', 'Other / Custom');
		if (s.includeUnknown) make('bucket', 'unknown', 'Unknown');
	}

	_updateFilterCountBadge() {
		if (!this._filterCountBadge) return;
		const s = this._modelFilterState;
		const count = s.architectures.size + s.models.size +
			(s.includeCustom ? 1 : 0) + (s.includeUnknown ? 1 : 0);
		this._filterCountBadge.dataset.count = String(count);
		this._filterCountBadge.textContent = count > 0 ? String(count) : '';
	}

	_renderInfoDetails(imageData) {
		if (!this._infoDetails) return;
		this._infoDetails.innerHTML = '';

		if (imageData.model) {
			const row = document.createElement('div');
			row.className = 'p360-info-model';
			const lbl = document.createElement('span');
			lbl.className = 'p360-info-label';
			lbl.textContent = 'Model';
			row.appendChild(lbl);

			if (imageData.model.architecture) {
				const arch = document.createElement('button');
				arch.type = 'button';
				arch.className = 'p360-info-badge';
				arch.textContent = imageData.model.architecture;
				arch.addEventListener('click', () => {
					this._modelFilterState.architectures.clear();
					this._modelFilterState.architectures.add(imageData.model.architecture);
					this._modelFilterState.models.clear();
					this._modelFilterState.includeCustom = false;
					this._modelFilterState.includeUnknown = false;
					this._syncFilterUIFromState();
					this._writeHash();
					this._renderSections(this._sections);
				});
				row.appendChild(arch);
			}
			if (imageData.model.id) {
				const mod = document.createElement('button');
				mod.type = 'button';
				mod.className = 'p360-info-badge';
				mod.textContent = imageData.model.displayName || imageData.model.id;
				mod.addEventListener('click', () => {
					this._modelFilterState.architectures.clear();
					this._modelFilterState.models.clear();
					this._modelFilterState.models.add(imageData.model.id);
					this._modelFilterState.includeCustom = false;
					this._modelFilterState.includeUnknown = false;
					this._syncFilterUIFromState();
					this._writeHash();
					this._renderSections(this._sections);
				});
				row.appendChild(mod);
			}
			this._infoDetails.appendChild(row);
		}

		if (Array.isArray(imageData.loras) && imageData.loras.length > 0) {
			const row = document.createElement('div');
			row.className = 'p360-info-loras';
			const lbl = document.createElement('span');
			lbl.className = 'p360-info-label';
			lbl.textContent = 'LoRAs';
			row.appendChild(lbl);
			const ul = document.createElement('ul');
			for (const lora of imageData.loras) {
				const li = document.createElement('li');
				const strength = (typeof lora.strength === 'number') ? lora.strength.toFixed(2) : lora.strength;
				li.textContent = `${lora.displayName} (${strength})`;
				ul.appendChild(li);
			}
			row.appendChild(ul);
			this._infoDetails.appendChild(row);
		}

		if (imageData.hasConfig && imageData.id) {
			const details = document.createElement('details');
			details.className = 'p360-info-fullsettings';
			const summary = document.createElement('summary');
			summary.textContent = 'Full settings';
			details.appendChild(summary);

			const body = document.createElement('div');
			body.className = 'p360-info-fullsettings-body';
			body.textContent = 'Loading…';
			details.appendChild(body);

			let loaded = false;
			details.addEventListener('toggle', async () => {
				if (!details.open || loaded) return;
				loaded = true;
				try {
					const resp = await fetch(`/api/v1/images/${encodeURIComponent(imageData.id)}/config`);
					if (resp.status === 404) {
						body.textContent = 'No config available.';
						return;
					}
					if (!resp.ok) {
						body.textContent = `Failed to load (${resp.status}).`;
						return;
					}
					const cfg = await resp.json();
					body.innerHTML = '';
					const dl = document.createElement('dl');
					this._renderConfigAsDl(cfg, dl, '');
					body.appendChild(dl);
				} catch (err) {
					body.textContent = 'Failed to load config.';
				}
			});
			this._infoDetails.appendChild(details);
		}
	}

	_renderConfigAsDl(obj, dl, prefix) {
		if (obj == null || typeof obj !== 'object') {
			const dd = document.createElement('dd');
			dd.textContent = String(obj);
			dl.appendChild(dd);
			return;
		}
		for (const [k, v] of Object.entries(obj)) {
			const dt = document.createElement('dt');
			dt.textContent = prefix ? `${prefix}.${k}` : k;
			dl.appendChild(dt);
			if (v && typeof v === 'object' && !Array.isArray(v)) {
				this._renderConfigAsDl(v, dl, prefix ? `${prefix}.${k}` : k);
			} else {
				const dd = document.createElement('dd');
				dd.textContent = Array.isArray(v) ? JSON.stringify(v) : String(v);
				dl.appendChild(dd);
			}
		}
	}

	renderSection(section) {
		// For accordion template, skip the section wrapper — accordion is self-contained
		if (section.template === 'accordion') {
			const config = { baseUrl: this.baseUrl };
			const sectionEl = document.createElement('div');
			sectionEl.className = 'p360-section';
			sectionEl.dataset.sectionId = section.id || '';
			const body = this.templateEngine.render(section, config);
			sectionEl.appendChild(body);
			return sectionEl;
		}

		const sectionEl = document.createElement('div');
		sectionEl.className = 'p360-section';
		sectionEl.dataset.sectionId = section.id || '';

		// Section heading with collapse toggle
		if (section.title) {
			const collapsible = section.collapsible !== false;
			const heading = document.createElement(collapsible ? 'button' : 'div');
			heading.className = 'p360-section-heading';
			if (collapsible) heading.type = 'button';

			if (section.icon) {
				const icon = document.createElement('i');
				icon.className = /^ph /.test(section.icon) ? section.icon : 'ph ph-' + section.icon;
				heading.appendChild(icon);
			}

			const title = document.createElement('span');
			title.textContent = section.title;
			heading.appendChild(title);

			// Section-level badge (number or object from library_service)
			const badgeValue = section.badge;
			if (badgeValue !== undefined && badgeValue !== null) {
				const count = document.createElement('span');
				count.className = 'p360-section-heading-count';
				count.textContent = typeof badgeValue === 'object' ? badgeValue.text : badgeValue;
				heading.appendChild(count);
			} else {
				const images = section.images || [];
				if (images.length > 0) {
					const count = document.createElement('span');
					count.className = 'p360-section-heading-count';
					count.textContent = images.length;
					heading.appendChild(count);
				}
			}

			if (collapsible) {
				const chevron = document.createElement('span');
				chevron.className = 'p360-section-chevron';
				chevron.innerHTML = '&#9660;';
				heading.appendChild(chevron);

				heading.addEventListener('click', () => {
					sectionEl.classList.toggle('p360-section--collapsed');
					// Update max-height for animation
					const body = sectionEl.querySelector('.p360-section-body');
					if (body && !sectionEl.classList.contains('p360-section--collapsed')) {
						body.style.maxHeight = body.scrollHeight + 'px';
					}
					if (this.callbacks.onSectionToggle) {
						this.callbacks.onSectionToggle(
							section,
							!sectionEl.classList.contains('p360-section--collapsed')
						);
					}
				});
			}

			sectionEl.appendChild(heading);

			// Apply initial collapsed state
			if (collapsible && section.collapsed) {
				sectionEl.classList.add('p360-section--collapsed');
			}
		}

		// Section body
		const body = document.createElement('div');
		body.className = 'p360-section-body';
		const config = { baseUrl: this.baseUrl };
		const content = this.templateEngine.render(section, config);
		body.appendChild(content);

		// Set max-height for animation
		requestAnimationFrame(() => {
			body.style.maxHeight = body.scrollHeight + 'px';
		});

		sectionEl.appendChild(body);
		return sectionEl;
	}

	// --------------------------------------------------------
	// Image click / selection
	// --------------------------------------------------------

	onImageClick(image) {
		this._currentImageId = image.id;

		// Only close sidebar on mobile; keep open on desktop
		if (window.innerWidth <= Phong360LibraryUI.MOBILE_BREAKPOINT) {
			this.closeSidebar();
		}

		setTimeout(() => {
			if (this.multiViewer) {
				this.multiViewer.loadImageById(image.id);
			}
			this._highlightImage(image.id);

			if (this.callbacks.onImageSelect) {
				this.callbacks.onImageSelect(image);
			}
		}, 200);
	}

	_onImageLoaded(imageData, resolution) {
		this._currentImageId = imageData.id;
		this._currentImageData = imageData;
		this._highlightImage(imageData.id);

		// Update toolbar controls
		this._updateResolutionSelector(imageData, resolution);
		this._updateProjectionButton(this.core?.projectionType ?? 1);
		this._updateInfoBar(imageData, resolution);

		// Re-render info-bar slots with new imageData (since 4.2.0)
		this._renderSlot('info-bar-leading');
		this._renderSlot('info-bar-trailing');

		if (this.callbacks.onImageLoad) {
			this.callbacks.onImageLoad(imageData, resolution);
		}

		this._urlSyncWrite(imageData);
	}

	_highlightImage(imageId) {
		if (!this._contentEl) return;
		// Remove previous highlight
		const prev = this._contentEl.querySelectorAll(
			'.p360-thumbnail--selected, .p360-list-item--selected'
		);
		prev.forEach((el) =>
			el.classList.remove('p360-thumbnail--selected', 'p360-list-item--selected')
		);

		// Add highlight
		const thumb = this._contentEl.querySelector(`.p360-thumbnail[data-image-id="${imageId}"]`);
		if (thumb) thumb.classList.add('p360-thumbnail--selected');

		const listItem = this._contentEl.querySelector(`.p360-list-item[data-image-id="${imageId}"]`);
		if (listItem) listItem.classList.add('p360-list-item--selected');
	}

	// --------------------------------------------------------
	// Owner-mode gallery management
	// --------------------------------------------------------

	setLibrary(data) { this._processLibraryData(data); }
	loadLibraryData(data) { this.setLibrary(data); }

	_bindOwnerModeEvents() {
		document.addEventListener('p360-owner-mode', (event) => {
			const detail = event.detail || {};
			if (detail.enabled) this._enableOwnerMode(detail);
			else this._disableOwnerMode();
		});
		document.addEventListener('p360-library-replace', (event) => {
			if (event.detail) this.setLibrary(event.detail);
		});
		document.addEventListener('p360-rollback', (event) => {
			const snap = event.detail || {};
			if (snap.kind === 'reorder') this.reorderImages(snap.collectionId, snap.imageIds || []);
			if (snap.kind === 'move') {
				this.moveImageToSection(
					snap.imageId,
					snap.fromCollectionId,
					snap.fromIndex == null ? 1 : snap.fromIndex + 1
				);
			}
		});
		document.addEventListener('p360-toast', (event) => {
			const detail = event.detail || {};
			this.showToast(detail.message || '', detail.level || 'info');
		});
		document.addEventListener('p360-section-updated', (event) => {
			const detail = event.detail || {};
			if (detail.collectionId) this.updateSection(detail.collectionId, detail);
		});
		document.addEventListener('p360-collections-reordered', (event) => {
			const order = (event.detail && event.detail.collectionIds) || [];
			this.reorderSections(order);
		});
	}

	_enableOwnerMode(detail) {
		this._ownerState.enabled = true;
		this._ownerState.userId = detail.userId || null;
		this._ownerState.username = detail.username || null;
		this._sidebar?.classList.add('p360-sidebar--owner');
		this._syncOwnerDecorations();
	}

	_disableOwnerMode() {
		this._ownerState.enabled = false;
		this._ownerState.userId = null;
		this._ownerState.username = null;
		this._ownerState.selectedImages.clear();
		this._closeOwnerMenus();
		this._sidebar?.classList.remove('p360-sidebar--owner', 'p360-drag-in-flight');
		this._syncOwnerDecorations();
	}

	_syncOwnerDecorations() {
		if (!this._contentEl) return;
		const enabled = !!this._ownerState.enabled;
		this._sidebar?.classList.toggle('p360-sidebar--owner', enabled);
		if (!enabled) {
			this._contentEl.querySelectorAll('[data-owner-ui="true"]').forEach((el) => el.remove());
			this._contentEl.querySelectorAll('[draggable="true"]').forEach((el) => el.removeAttribute('draggable'));
			return;
		}
		this._injectOwnerCollectionMenus();
		this._injectOwnerThumbnailMenus();
		this._injectOwnerAddCollection();
	}

	_injectOwnerAddCollection() {
		if (this._contentEl.querySelector('.p360-owner-add-collection')) return;
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'p360-owner-add-collection';
		btn.dataset.ownerUi = 'true';
		btn.textContent = '+ New Collection';
		btn.addEventListener('click', () => {
			this._renderInlineForm({
				anchorEl: btn,
				label: 'New collection',
				maxLength: 80,
				placeholder: 'Collection name',
				onSubmit: async (name) => {
					return new Promise((resolve) => {
						document.dispatchEvent(new CustomEvent('p360-owner-action', {
							detail: {
								action: 'create-collection',
								imageId: null,
								ctx: { name },
								callback: (err) => resolve(err ? { error: err.message || 'Create failed.' } : null),
							},
						}));
					});
				},
			});
		});
		const other = this._contentEl.querySelector('.p360-section[data-section-id="uncategorized"]');
		if (other) this._contentEl.insertBefore(btn, other);
		else this._contentEl.appendChild(btn);
	}

	_injectOwnerCollectionMenus() {
		this._contentEl.querySelectorAll('.p360-section[data-section-id]').forEach((sectionEl) => {
			const section = this._sectionById(sectionEl.dataset.sectionId);
			const isOther = !section || section.isOther || section.collectionId == null || section.id === 'uncategorized';
			const heading = sectionEl.querySelector(':scope > .p360-section-heading');
			if (!heading) return;
			sectionEl.dataset.collectionId = section && section.collectionId != null ? section.collectionId : '';
			if (isOther) return;
			if (!heading.querySelector('.p360-owner-section-menu')) {
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = 'p360-owner-section-menu';
				btn.dataset.ownerUi = 'true';
				btn.setAttribute('aria-label', 'Collection actions');
				btn.textContent = '...';
				btn.addEventListener('mousedown', (e) => e.stopPropagation());
				btn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
				btn.addEventListener('click', (e) => {
					e.stopPropagation();
					this._openCollectionMenu(btn, section);
				});
				heading.appendChild(btn);
			}
			heading.draggable = !this._ownerState.truncated;
			heading.setAttribute('aria-disabled', this._ownerState.truncated ? 'true' : 'false');
			heading.title = this._ownerState.truncated
				? 'Reorder is disabled while older images are hidden - coming in v2.'
				: '';
			if (!heading.dataset.ownerDragBound) {
				heading.dataset.ownerDragBound = 'true';
				heading.addEventListener('dragstart', (e) => this._onSectionDragStart(e, section));
				heading.addEventListener('dragover', (e) => this._onSectionDragOver(e));
				heading.addEventListener('drop', (e) => this._onSectionDrop(e, section));
			}
		});
	}

	_injectOwnerThumbnailMenus() {
		this._contentEl.querySelectorAll('.p360-section[data-section-id]').forEach((sectionEl) => {
			const section = this._sectionById(sectionEl.dataset.sectionId);
			const isOther = !section || section.isOther || section.collectionId == null || section.id === 'uncategorized';
			sectionEl.querySelectorAll('.p360-thumbnail[data-image-id]').forEach((thumb) => {
				const image = this._findImageInSectionsDeep(thumb.dataset.imageId);
				if (!image) return;
				if (!thumb.querySelector('.p360-owner-thumb-menu')) {
					const btn = document.createElement('button');
					btn.type = 'button';
					btn.className = 'p360-owner-thumb-menu';
					btn.dataset.ownerUi = 'true';
					btn.setAttribute('aria-label', 'Image actions');
					btn.textContent = '...';
					btn.addEventListener('click', (e) => {
						e.stopPropagation();
						this._openThumbnailMenu(btn, image, section);
					});
					thumb.appendChild(btn);
				}
				if (!isOther && !thumb.querySelector('.p360-owner-drag-handle')) {
					const handle = document.createElement('span');
					handle.className = 'p360-owner-drag-handle';
					handle.dataset.ownerUi = 'true';
					handle.setAttribute('aria-hidden', 'true');
					thumb.appendChild(handle);
				}
				thumb.draggable = !this._ownerState.dragInFlight;
				if (!thumb.dataset.ownerDragBound) {
					thumb.dataset.ownerDragBound = 'true';
					thumb.addEventListener('dragstart', (e) => this._onThumbDragStart(e, image, section));
					thumb.addEventListener('dragover', (e) => this._onThumbDragOver(e));
					thumb.addEventListener('drop', (e) => this._onThumbDrop(e, image, section));
				}
			});
		});
	}

	/**
	 * Inline form anchored under `anchorEl`. Calls `onSubmit(value)` when user
	 * submits; `onSubmit` may return a Promise resolving to {error: string} to
	 * render an inline error and keep the form open. Returns the form node.
	 */
	_renderInlineForm({ anchorEl, label, initial = '', maxLength = 80, placeholder = '', onSubmit }) {
		this._closeOwnerMenus();
		const wrap = document.createElement('div');
		wrap.className = 'p360-owner-inline-form';
		wrap.dataset.ownerUi = 'true';

		const labelEl = document.createElement('label');
		labelEl.className = 'p360-owner-inline-form__label';
		labelEl.textContent = label;

		const input = document.createElement('input');
		input.type = 'text';
		input.value = initial;
		input.maxLength = maxLength;
		input.placeholder = placeholder;
		input.className = 'p360-owner-inline-form__input';
		input.setAttribute('aria-label', label);

		const error = document.createElement('div');
		error.className = 'p360-owner-inline-form__error';
		error.setAttribute('role', 'alert');

		const actions = document.createElement('div');
		actions.className = 'p360-owner-inline-form__actions';

		const cancelBtn = document.createElement('button');
		cancelBtn.type = 'button';
		cancelBtn.className = 'p360-owner-inline-form__cancel';
		cancelBtn.textContent = 'Cancel';

		const saveBtn = document.createElement('button');
		saveBtn.type = 'button';
		saveBtn.className = 'p360-owner-inline-form__save';
		saveBtn.textContent = 'Save';

		actions.appendChild(cancelBtn);
		actions.appendChild(saveBtn);
		wrap.appendChild(labelEl);
		wrap.appendChild(input);
		wrap.appendChild(error);
		wrap.appendChild(actions);
		anchorEl.parentElement.appendChild(wrap);

		const close = () => { wrap.remove(); };
		const setBusy = (busy) => {
			input.disabled = busy;
			saveBtn.disabled = busy;
			cancelBtn.disabled = busy;
			wrap.classList.toggle('p360-owner-inline-form--busy', busy);
		};
		const showError = (msg) => {
			error.textContent = msg || '';
			if (msg) input.focus();
		};

		cancelBtn.addEventListener('click', close);
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') { e.stopPropagation(); close(); }
			if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
		});
		saveBtn.addEventListener('click', async () => {
			const value = (input.value || '').trim();
			if (!value) { showError('Cannot be empty.'); return; }
			showError('');
			setBusy(true);
			try {
				const result = await onSubmit(value);
				if (result && result.error) {
					showError(result.error);
					setBusy(false);
					return;
				}
				close();
			} catch (e) {
				showError(e && e.message ? e.message : 'Something went wrong.');
				setBusy(false);
			}
		});

		setTimeout(() => input.focus(), 0);
		this._ownerMenus.add(wrap); // so _closeOwnerMenus tears it down too
		return wrap;
	}

	/**
	 * Modal-style confirm dialog with focus trap. Resolves true if confirmed,
	 * false if cancelled.
	 */
	_renderConfirmDialog({ title, body, confirmLabel = 'Delete', danger = true }) {
		return new Promise((resolve) => {
			const overlay = document.createElement('div');
			overlay.className = 'p360-owner-dialog-overlay';
			overlay.dataset.ownerUi = 'true';

			const dialog = document.createElement('div');
			dialog.className = 'p360-owner-dialog';
			dialog.setAttribute('role', 'dialog');
			dialog.setAttribute('aria-modal', 'true');
			dialog.setAttribute('aria-labelledby', 'p360-owner-dialog-title');

			const h = document.createElement('h2');
			h.id = 'p360-owner-dialog-title';
			h.className = 'p360-owner-dialog__title';
			h.textContent = title;

			const p = document.createElement('p');
			p.className = 'p360-owner-dialog__body';
			p.textContent = body;

			const actions = document.createElement('div');
			actions.className = 'p360-owner-dialog__actions';

			const cancelBtn = document.createElement('button');
			cancelBtn.type = 'button';
			cancelBtn.className = 'p360-owner-dialog__cancel';
			cancelBtn.textContent = 'Cancel';

			const confirmBtn = document.createElement('button');
			confirmBtn.type = 'button';
			confirmBtn.className = danger
				? 'p360-owner-dialog__confirm p360-owner-dialog__confirm--danger'
				: 'p360-owner-dialog__confirm';
			confirmBtn.textContent = confirmLabel;

			actions.appendChild(cancelBtn);
			actions.appendChild(confirmBtn);
			dialog.appendChild(h);
			dialog.appendChild(p);
			dialog.appendChild(actions);
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);

			const previousFocus = document.activeElement;
			const focusables = [cancelBtn, confirmBtn];
			let focusIndex = 1;
			confirmBtn.focus();

			const close = (result) => {
				overlay.removeEventListener('keydown', onKey);
				overlay.remove();
				if (previousFocus && previousFocus.focus) previousFocus.focus();
				resolve(result);
			};
			const onKey = (e) => {
				if (e.key === 'Escape') { e.stopPropagation(); close(false); }
				if (e.key === 'Tab') {
					e.preventDefault();
					focusIndex = (focusIndex + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
					focusables[focusIndex].focus();
				}
			};
			overlay.addEventListener('keydown', onKey);
			cancelBtn.addEventListener('click', () => close(false));
			confirmBtn.addEventListener('click', () => close(true));
			// Click on overlay outside dialog cancels
			overlay.addEventListener('click', (e) => {
				if (e.target === overlay) close(false);
			});
		});
	}

	/**
	 * Picker that lists the user's collections + an "Other" target. `onPick`
	 * receives the collectionId or null (for Other). Sources collections from
	 * this._sections so it always reflects current state.
	 */
	_renderMovePicker({ anchorEl, currentCollectionId, onPick }) {
		this._closeOwnerMenus();
		const wrap = document.createElement('div');
		wrap.className = 'p360-owner-move-picker';
		wrap.dataset.ownerUi = 'true';
		wrap.setAttribute('role', 'listbox');

		const items = this._sections
			.filter((s) => s.collectionId != null)
			.map((s) => ({ id: s.collectionId, label: s.title || 'Untitled' }));
		items.push({ id: null, label: 'Other (uncategorized)' });

		items.forEach((item) => {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'p360-owner-move-picker__item';
			btn.setAttribute('role', 'option');
			btn.textContent = item.label;
			if (item.id === currentCollectionId) {
				btn.setAttribute('aria-selected', 'true');
				btn.disabled = true;
			}
			btn.addEventListener('click', () => {
				wrap.remove();
				onPick(item.id);
			});
			wrap.appendChild(btn);
		});

		anchorEl.parentElement.appendChild(wrap);
		this._ownerMenus.add(wrap);
		setTimeout(() => {
			const first = wrap.querySelector('button:not([disabled])');
			if (first) first.focus();
		}, 0);
	}

	_openCollectionMenu(anchor, section) {
		this._closeOwnerMenus();
		const menu = this._makeOwnerMenu(anchor);
		this._addOwnerMenuButton(menu, 'Rename', () => {
			this._renderInlineForm({
				anchorEl: anchor,
				label: 'Rename collection',
				initial: section.title || '',
				maxLength: 80,
				onSubmit: async (name) => {
					return new Promise((resolve) => {
						document.dispatchEvent(new CustomEvent('p360-owner-action', {
							detail: {
								action: 'rename',
								imageId: null,
								ctx: { collectionId: section.collectionId, name },
								callback: (err) => resolve(err ? { error: err.message || 'Rename failed.' } : null),
							},
						}));
					});
				},
			});
		});
		this._addOwnerMenuButton(menu, 'Edit Description', () => {
			this._renderInlineForm({
				anchorEl: anchor,
				label: 'Description (max 1000)',
				initial: section.description || '',
				maxLength: 1000,
				placeholder: 'Describe this collection',
				onSubmit: async (description) => {
					return new Promise((resolve) => {
						document.dispatchEvent(new CustomEvent('p360-owner-action', {
							detail: {
								action: 'edit-collection-description',
								imageId: null,
								ctx: { collectionId: section.collectionId, description },
								callback: (err) => resolve(err ? { error: err.message || 'Update failed.' } : null),
							},
						}));
					});
				},
			});
		});
		this._addOwnerMenuButton(menu, section.isPublished === false ? 'Publish' : 'Unpublish', () => {
			this._dispatchOwnerAction('publish-toggle-collection', null, {
				collectionId: section.collectionId,
				publish: section.isPublished === false
			});
		});
		this._addOwnerMenuButton(menu, 'Delete', async () => {
			const ok = await this._renderConfirmDialog({
				title: 'Delete collection?',
				body: 'Images in this collection will move to Other.',
				confirmLabel: 'Delete',
				danger: true,
			});
			if (!ok) return;
			this._dispatchOwnerAction('delete-collection', null, { collectionId: section.collectionId });
		}, true);
	}

	_openThumbnailMenu(anchor, image, section) {
		this._closeOwnerMenus();
		const menu = this._makeOwnerMenu(anchor);
		this._addOwnerMenuButton(menu, 'Move to Collection', () => {
			this._renderMovePicker({
				anchorEl: anchor,
				currentCollectionId: section && section.collectionId != null ? section.collectionId : null,
				onPick: (targetCollectionId) => {
					this._dispatchOwnerAction('move', image.id, {
						imageId: image.id,
						fromCollectionId: section && section.collectionId != null ? section.collectionId : null,
						targetCollectionId,
						position: 1,
					});
				},
			});
		});
		if (section && section.collectionId != null) {
			this._addOwnerMenuButton(menu, 'Set as Cover', () => {
				this._dispatchOwnerAction('set-cover', image.id, {
					imageId: image.id,
					collectionId: section.collectionId
				});
			});
		}
		this._addOwnerMenuButton(menu, 'Delete Image', async () => {
			const ok = await this._renderConfirmDialog({
				title: 'Delete image?',
				body: 'This permanently deletes the image and all its variants.',
				confirmLabel: 'Delete',
				danger: true,
			});
			if (!ok) return;
			this._dispatchOwnerAction('delete-image', image.id, { imageId: image.id });
		}, true);
	}

	_makeOwnerMenu(anchor) {
		const menu = document.createElement('div');
		menu.className = 'p360-owner-menu';
		menu.dataset.ownerUi = 'true';
		anchor.parentElement.appendChild(menu);
		this._ownerMenus.add(menu);
		return menu;
	}

	_addOwnerMenuButton(menu, label, handler, danger = false) {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = danger ? 'p360-owner-menu-item p360-owner-menu-item--danger' : 'p360-owner-menu-item';
		btn.textContent = label;
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			this._closeOwnerMenus();
			handler();
		});
		menu.appendChild(btn);
	}

	_closeOwnerMenus() {
		this._ownerMenus.forEach((m) => m.remove());
		this._ownerMenus.clear();
	}

	_dispatchOwnerAction(action, imageId, ctx) {
		document.dispatchEvent(new CustomEvent('p360-owner-action', {
			detail: { action, imageId, ctx: ctx || {} }
		}));
	}

	_onThumbDragStart(event, image, section) {
		if (this._ownerState.dragInFlight) {
			event.preventDefault();
			return;
		}
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('application/json', JSON.stringify({
			type: 'image',
			imageId: image.id,
			fromCollectionId: section && section.collectionId != null ? section.collectionId : null
		}));
	}

	_onThumbDragOver(event) {
		if (!this._ownerState.dragInFlight) event.preventDefault();
	}

	_onThumbDrop(event, targetImage, section) {
		event.preventDefault();
		const data = this._readDragData(event);
		if (!data || data.type !== 'image') return;
		const collectionId = section && section.collectionId != null ? section.collectionId : null;

		// Cross-section move: safe under truncation
		if (data.fromCollectionId !== collectionId) {
			this._dispatchOwnerAction('move', data.imageId, {
				imageId: data.imageId,
				fromCollectionId: data.fromCollectionId,
				targetCollectionId: collectionId,
				position: 1,
			});
			return;
		}

		// Within-collection reorder: blocked under truncation
		if (this._ownerState.truncated) {
			this.showToast(
				"Reorder is disabled while older images aren't loaded. Move single images instead.",
				'warn'
			);
			return;
		}

		if (collectionId == null) return;
		const ids = this.getSectionImageIds(collectionId);
		const from = ids.indexOf(data.imageId);
		const to = ids.indexOf(targetImage.id);
		if (from < 0 || to < 0 || from === to) return;
		ids.splice(from, 1);
		ids.splice(to, 0, data.imageId);
		this._dispatchOwnerAction('reorder', data.imageId, { collectionId, imageIds: ids });
	}

	_onSectionDragStart(event, section) {
		if (this._ownerState.truncated || this._ownerState.dragInFlight || !section || section.collectionId == null) {
			event.preventDefault();
			return;
		}
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('application/json', JSON.stringify({
			type: 'section',
			collectionId: section.collectionId
		}));
	}

	_onSectionDragOver(event) {
		if (!this._ownerState.dragInFlight) event.preventDefault();
	}

	_onSectionDrop(event, section) {
		event.preventDefault();
		const data = this._readDragData(event);
		if (!data || !section) return;
		if (data.type === 'image') {
			const targetCollectionId = section.collectionId != null ? section.collectionId : null;
			this._dispatchOwnerAction('move', data.imageId, {
				imageId: data.imageId,
				fromCollectionId: data.fromCollectionId == null ? null : data.fromCollectionId,
				targetCollectionId,
				position: 1
			});
			return;
		}
		if (data.type === 'section' && section.collectionId != null) {
			const ids = this._sections.filter((s) => s.collectionId != null).map((s) => s.collectionId);
			const from = ids.indexOf(data.collectionId);
			const to = ids.indexOf(section.collectionId);
			if (from < 0 || to < 0 || from === to) return;
			ids.splice(from, 1);
			ids.splice(to, 0, data.collectionId);
			this._dispatchOwnerAction('reorder-collections', null, { collectionIds: ids });
		}
	}

	_readDragData(event) {
		try { return JSON.parse(event.dataTransfer.getData('application/json') || 'null'); }
		catch (_) { return null; }
	}

	_sectionById(sectionId) {
		return this._sections.find((s) => s.id === sectionId || s.collectionId === sectionId) || null;
	}

	_findImageInSectionsDeep(imageId) {
		for (const section of this._sections) {
			for (const image of (section.images || [])) {
				if (image.id === imageId) return image;
			}
		}
		return null;
	}

	_refreshOwnerLibraryData() {
		this.libraryData = { ...(this.libraryData || {}), sections: this._sections };
		this._allImages = [];
		for (const section of this._sections) {
			if (Array.isArray(section.images)) {
				this._allImages.push(...section.images.filter((img) => this._isViewerLoadableImage(img)));
			}
		}
		if (this.multiViewer) this.multiViewer.setImages(this._allImages);
		this._renderSections(this._sections);
		if (this._currentImageId) this._highlightImage(this._currentImageId);
	}

	getSectionImageIds(collectionId) {
		const section = this._sections.find((s) => s.collectionId === collectionId || s.id === collectionId);
		return section ? (section.images || []).map((img) => img.id) : [];
	}

	moveImageToSection(imageId, targetSectionId, position = 1) {
		let image = null;
		for (const section of this._sections) {
			const idx = (section.images || []).findIndex((img) => img.id === imageId);
			if (idx >= 0) {
				image = section.images.splice(idx, 1)[0];
				break;
			}
		}
		if (!image) return;
		image.primaryCollectionId = targetSectionId == null ? null : targetSectionId;
		let target = this._sections.find((s) => s.collectionId === targetSectionId || s.id === targetSectionId);
		if (!target && targetSectionId == null) {
			target = this._sections.find((s) => s.id === 'uncategorized');
			if (!target) {
				target = { id: 'uncategorized', collectionId: null, title: 'Other', template: 'grid', images: [], isOther: true };
				this._sections.push(target);
			}
		}
		if (!target) return;
		if (!Array.isArray(target.images)) target.images = [];
		const pos = Math.max(0, Math.min(position - 1, target.images.length));
		target.images.splice(pos, 0, image);
		this._refreshOwnerLibraryData();
	}

	reorderImages(sectionId, imageIds) {
		const section = this._sections.find((s) => s.collectionId === sectionId || s.id === sectionId);
		if (!section || !Array.isArray(section.images)) return;
		const byId = new Map(section.images.map((img) => [img.id, img]));
		const ordered = [];
		imageIds.forEach((id) => { if (byId.has(id)) ordered.push(byId.get(id)); });
		section.images.forEach((img) => { if (!imageIds.includes(img.id)) ordered.push(img); });
		section.images = ordered;
		this._refreshOwnerLibraryData();
	}

	addSection(collection) {
		const id = collection.id || collection.collectionId;
		if (!id || this._sections.some((s) => s.collectionId === id || s.id === id)) return;
		const otherIndex = this._sections.findIndex((s) => s.id === 'uncategorized');
		const section = {
			id,
			collectionId: id,
			title: collection.name || collection.title || 'Untitled',
			description: collection.description || null,
			isPublished: collection.is_published ?? collection.isPublished ?? true,
			template: 'grid',
			collapsible: true,
			collapsed: false,
			badge: 0,
			images: [],
			keepEmpty: true
		};
		if (otherIndex >= 0) this._sections.splice(otherIndex, 0, section);
		else this._sections.push(section);
		this._refreshOwnerLibraryData();
	}

	removeSection(collectionId) {
		const idx = this._sections.findIndex((s) => s.collectionId === collectionId || s.id === collectionId);
		if (idx < 0) return;
		const removed = this._sections.splice(idx, 1)[0];
		let other = this._sections.find((s) => s.id === 'uncategorized');
		if (!other) {
			other = { id: 'uncategorized', collectionId: null, title: 'Other', template: 'grid', images: [], isOther: true };
			this._sections.push(other);
		}
		for (const image of (removed.images || [])) {
			image.primaryCollectionId = null;
			other.images.unshift(image);
		}
		this._refreshOwnerLibraryData();
	}

	renameSection(collectionId, newName) {
		const section = this._sections.find((s) => s.collectionId === collectionId || s.id === collectionId);
		if (!section) return;
		section.title = newName;
		this._refreshOwnerLibraryData();
	}

	updateSection(collectionId, patch) {
		const section = this._sections.find((s) => s.collectionId === collectionId || s.id === collectionId);
		if (!section || !patch) return;
		Object.assign(section, patch);
		this._refreshOwnerLibraryData();
	}

	reorderSections(collectionIds) {
		const order = Array.isArray(collectionIds) ? collectionIds : [];
		if (!order.length) return;
		const otherSections = this._sections.filter((s) => s.collectionId == null);
		const byId = new Map(this._sections
			.filter((s) => s.collectionId != null)
			.map((s) => [s.collectionId, s]));
		const reordered = [];
		order.forEach((id) => { if (byId.has(id)) reordered.push(byId.get(id)); });
		this._sections.forEach((s) => {
			if (s.collectionId != null && !order.includes(s.collectionId) && !reordered.includes(s)) {
				reordered.push(s);
			}
		});
		this._sections = reordered.concat(otherSections);
		this._refreshOwnerLibraryData();
	}

	removeImage(imageId) {
		for (const section of this._sections) {
			if (!Array.isArray(section.images)) continue;
			section.images = section.images.filter((img) => img.id !== imageId);
		}
		this._refreshOwnerLibraryData();
	}

	updateImage(imageId, patch) {
		const body = patch && patch.image ? patch.image : patch;
		const image = this._findImageInSectionsDeep(imageId);
		if (!image || !body) return;
		Object.assign(image, body);
		if (body.primary_collection_id !== undefined) image.primaryCollectionId = body.primary_collection_id;
		if (body.is_published !== undefined) image.isPublished = body.is_published;
		this._refreshOwnerLibraryData();
	}

	selectImage(imageId) {
		this._ownerState.selectedImages.add(imageId);
		this._contentEl?.querySelector(`[data-image-id="${CSS.escape(imageId)}"]`)?.classList.add('p360-thumbnail--selected-owner');
	}
	deselectImage(imageId) {
		this._ownerState.selectedImages.delete(imageId);
		this._contentEl?.querySelector(`[data-image-id="${CSS.escape(imageId)}"]`)?.classList.remove('p360-thumbnail--selected-owner');
	}
	clearSelection() {
		this._ownerState.selectedImages.clear();
		this._contentEl?.querySelectorAll('.p360-thumbnail--selected-owner').forEach((el) => {
			el.classList.remove('p360-thumbnail--selected-owner');
		});
	}
	getSelectedImages() { return Array.from(this._ownerState.selectedImages); }
	isSelected(imageId) { return this._ownerState.selectedImages.has(imageId); }
	setDragInFlight(flag) {
		this._ownerState.dragInFlight = !!flag;
		this._sidebar?.classList.toggle('p360-drag-in-flight', this._ownerState.dragInFlight);
	}
	showToast(message, level = 'info') {
		if (!message) return;
		let root = document.querySelector('.p360-toast-root');
		if (!root) {
			root = document.createElement('div');
			root.className = 'p360-toast-root';
			document.body.appendChild(root);
		}
		const toast = document.createElement('div');
		toast.className = `p360-toast p360-toast--${level}`;
		toast.textContent = message;
		root.appendChild(toast);
		setTimeout(() => toast.remove(), 4000);
	}

	// --------------------------------------------------------
	// Badge update (called from Layer 4)
	// --------------------------------------------------------

	updateBadges(imageId, badges) {
		if (!this._contentEl) return;

		// Find all thumbnail/feed elements for this image
		const els = this._contentEl.querySelectorAll(`[data-image-id="${imageId}"]`);
		for (const el of els) {
			// Remove existing badges
			const existing = el.querySelector('.p360-badges');
			if (existing) existing.remove();

			if (badges && badges.length > 0) {
				const container = document.createElement('div');
				container.className = 'p360-badges';
				const display = badges.slice(0, 3);
				for (const badge of display) {
					const b = document.createElement('span');
					b.className = 'p360-badge';

					const icon = badge.emoji || badge.icon || '';
					const value = badge.count ?? badge.value ?? 0;

					const iconSpan = document.createElement('span');
					iconSpan.className = 'p360-badge-icon';
					iconSpan.textContent = icon;
					b.appendChild(iconSpan);

					if (value > 0) {
						const countSpan = document.createElement('span');
						countSpan.className = 'p360-badge-count';
						countSpan.textContent = value >= 1000 ? (value / 1000).toFixed(1) + 'K' : String(value);
						b.appendChild(countSpan);
					}

					b.addEventListener('click', (ev) => {
						ev.stopPropagation();
						const imageData = this._findImageInSections(imageId);
						if (this.callbacks.onBadgeClick) {
							this.callbacks.onBadgeClick(imageData, badge);
						}
					});

					container.appendChild(b);
				}
				el.appendChild(container);
			}
		}
	}

	_findImageInSections(imageId) {
		for (const img of this._allImages) {
			if (img.id === imageId) return img;
		}
		return { id: imageId };
	}

	// --------------------------------------------------------
	// Sidebar toggle
	// --------------------------------------------------------

	_isDesktop() {
		return window.innerWidth > Phong360LibraryUI.MOBILE_BREAKPOINT;
	}

	_handleResize() {
		const desktop = this._isDesktop();
		if (desktop && this._wasDesktop === false) {
			// mobile → desktop: re-open only if opted in AND user hasn't collapsed
			this._backdrop.classList.remove('p360-sidebar-backdrop--visible');
			if (this._desktopOpenByDefault && !this._userCollapsedOnDesktop) {
				this.openSidebar();
			}
		} else if (!desktop && this._wasDesktop === true) {
			// desktop → mobile: always close so panel doesn't trap the canvas
			this.closeSidebar();
		} else if (desktop && this._sidebarOpen) {
			// already desktop, sidebar already open — ensure no leftover backdrop
			this._backdrop.classList.remove('p360-sidebar-backdrop--visible');
		}
		this._wasDesktop = desktop;
	}

	_updateToggleIcon() {
		if (!this._toggle) return;
		// Button-level attributes (label/title/aria-expanded) — engine owns
		// these because they reflect the button's semantic state, not the
		// icon glyph.
		if (this._sidebarOpen) {
			this._toggle.title = 'Collapse panel';
			this._toggle.setAttribute('aria-label', 'Collapse panel');
			this._toggle.setAttribute('aria-expanded', 'true');
		} else {
			this._toggle.title = 'Browse Library';
			this._toggle.setAttribute('aria-label', 'Browse library');
			this._toggle.setAttribute('aria-expanded', 'false');
		}
		// Icon glyph is owned by the sidebar-toggle-icon slot (since 4.2.0).
		// _renderSlot reads this._sidebarOpen via _buildSlotProps. The
		// default renderer paints immediately even before _contextLoaded
		// (rule 3 of context-load gating) so the toggle is never blank.
		this._renderSlot('sidebar-toggle-icon');
	}

	toggleSidebar() {
		if (this._sidebarOpen) {
			if (this._isDesktop()) this._userCollapsedOnDesktop = true;
			this.closeSidebar();
		} else {
			this._userCollapsedOnDesktop = false;
			this.openSidebar();
		}
	}

	openSidebar() {
		this._sidebarOpen = true;
		this._sidebar.classList.add('p360-sidebar--open');
		if (!this._isDesktop()) {
			this._backdrop.classList.add('p360-sidebar-backdrop--visible');
		}

		// Re-observe in case images were added
		this._observeImages();
		this._updateToggleIcon();
	}

	closeSidebar() {
		this._sidebarOpen = false;
		this._sidebar.classList.remove('p360-sidebar--open');
		this._backdrop.classList.remove('p360-sidebar-backdrop--visible');
		this._updateToggleIcon();
	}

	// --------------------------------------------------------
	// Theme management
	// --------------------------------------------------------

	setTheme(theme) {
		this._theme = theme;
		this._applyTheme(theme);
	}

	_applyTheme(theme) {
		const resolved = this._resolveTheme(theme);
		this._sidebar?.setAttribute('data-theme', resolved);
		this._updateThemeButton(resolved);

		if (this.callbacks.onThemeChange) {
			this.callbacks.onThemeChange(resolved);
		}
	}

	_resolveTheme(theme) {
		const t = theme || this._theme;
		if (t === 'auto') {
			return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
		}
		return t;
	}

	// --------------------------------------------------------
	// Accent color
	// --------------------------------------------------------

	setAccent(hex) {
		this._accent = hex;
		if (!this._sidebar) return;

		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);

		// Lighten ~15% for hover
		const lighten = (v) => Math.min(255, Math.round(v + (255 - v) * 0.15));

		this._sidebar.style.setProperty('--p360-accent', hex);
		this._sidebar.style.setProperty(
			'--p360-accent-hover',
			`#${lighten(r).toString(16).padStart(2, '0')}${lighten(g).toString(16).padStart(2, '0')}${lighten(b).toString(16).padStart(2, '0')}`
		);
		this._sidebar.style.setProperty('--p360-accent-active', `rgba(${r},${g},${b},0.25)`);
		this._sidebar.style.setProperty('--p360-accent-border', `rgba(${r},${g},${b},0.6)`);
	}

	// --------------------------------------------------------
	// Lazy loading via IntersectionObserver
	// --------------------------------------------------------

	_setupLazyLoading() {
		if (typeof IntersectionObserver === 'undefined') return;

		this._observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const img = entry.target;
						if (img.dataset.src) {
							img.src = img.dataset.src;
							img.onload = () => img.classList.add('p360-loaded');
							img.removeAttribute('data-src');
							this._observer.unobserve(img);
						}
					}
				}
			},
			{
				root: this._contentEl,
				rootMargin: '200px'
			}
		);
	}

	_observeImages() {
		if (!this._observer || !this._sidebar) return;
		const images = this._sidebar.querySelectorAll('img[data-src]');
		images.forEach((img) => this._observer.observe(img));
	}

	// --------------------------------------------------------
	// Deep-linking / URL parameters
	// --------------------------------------------------------

	_urlSyncRead() {
		const s = this.urlSync;
		if (s === false) return null;

		// Object form with explicit read:null disables read direction only.
		if (s && typeof s === 'object' && s.read === null) return null;

		const fn = (s && typeof s === 'object' && typeof s.read === 'function')
			? s.read
			: (url) => url.searchParams.get('img');

		try {
			return fn(new URL(window.location.href));
		} catch (e) {
			return null;
		}
	}

	_urlSyncWrite(image) {
		const s = this.urlSync;
		if (s === false) return;

		// Object form with explicit write:null disables write direction only.
		if (s && typeof s === 'object' && s.write === null) return;

		const fn = (s && typeof s === 'object' && typeof s.write === 'function')
			? s.write
			: (img) => '?img=' + encodeURIComponent(img.slug || img.id);

		let out;
		try {
			out = fn(image);
		} catch (e) {
			return;
		}
		if (out == null) return;

		const url = typeof out === 'string' ? out : (out && out.url);
		if (!url) return;

		const replace = typeof out === 'object' && out.replace === true;
		if (replace) {
			window.history.replaceState({}, '', url);
		} else {
			window.history.pushState({}, '', url);
		}
	}

	_handleUrlParameters() {
		const imgParam = this._urlSyncRead();

		// Priority: constructor autoloadId > context.autoload > URL ?img= > first image
		const autoload = this.autoloadId || (this._context && this._context.autoload);

		if (autoload) {
			this._loadImageByIdOrSlug(autoload);
		} else if (imgParam) {
			this._loadImageByIdOrSlug(imgParam);
		} else if (this.multiViewer && this._allImages.length > 0) {
			this.multiViewer.loadFirstImage();
		}
	}

	_loadImageByIdOrSlug(idOrSlug) {
		if (!this.multiViewer) return;

		// Try direct ID first, then slug
		let found = this._allImages.find((img) => img.id === idOrSlug);
		if (!found) {
			found = this._allImages.find((img) => img.slug === idOrSlug);
		}

		if (found) {
			this.multiViewer.loadImageById(found.id);
			this._highlightImage(found.id);
		} else if (this._allImages.length > 0) {
			this.multiViewer.loadFirstImage();
		}
	}

	// --------------------------------------------------------
	// Slot API (since 4.2.0)
	// --------------------------------------------------------

	/**
	 * Register a factory function to produce content for a named slot.
	 * The factory is called when the engine renders that slot's region
	 * (during _buildSidebarDOM and on subsequent re-renders).
	 *
	 * @param {string} name     One of Phong360LibraryUI.SLOT_NAMES
	 * @param {Function} factory  (slotProps) => HTMLElement | null
	 *                            Return null to fall back to engine default.
	 * @throws {Error} if name is not a known slot, or factory is not a function
	 * @since 4.2.0
	 */
	setSlot(name, factory) {
		this._slots.set(name, factory);
		// Re-render immediately ONLY if the library has loaded. Before
		// load, the sidebar DOM exists but context is empty — we defer
		// first paint to _renderAllSlots() after loadLibrary() sets
		// _contextLoaded. Consumers that register before load get their
		// first render for free at load completion.
		if (this._sidebar && this._contextLoaded) {
			this._renderSlot(name);
		}
	}

	/**
	 * Remove a registered slot factory and revert to engine default.
	 *
	 * @param {string} name  One of Phong360LibraryUI.SLOT_NAMES
	 * @since 4.2.0
	 */
	clearSlot(name) {
		this._slots.clear(name);
		if (this._sidebar && this._contextLoaded) {
			this._renderSlot(name);
		}
	}

	/**
	 * Render the engine's default content for a slot, with the current
	 * slotProps (or an override). Lets consumer factories COMPOSE the
	 * default with custom content rather than only REPLACE it.
	 *
	 * Returns a fresh DOM node each call (no shared instances), or null
	 * if the slot has no engine default.
	 *
	 * @param {string} name         One of Phong360LibraryUI.SLOT_NAMES
	 * @param {Object} [slotProps]  Optional; defaults to engine's current
	 *                              slotProps for that slot
	 * @returns {HTMLElement|null}
	 * @throws {Error} if name is not a known slot
	 * @since 4.2.0
	 */
	renderDefault(name, slotProps) {
		if (!Phong360LibraryUI.SLOT_NAMES.includes(name)) {
			throw new Error(
				`Phong360LibraryUI.renderDefault: unknown slot "${name}"`,
			);
		}
		const props = slotProps || this._buildSlotProps(name);
		return this._defaultSlotContent(name, props);
	}

	/**
	 * Render a single slot's content into its wrapper element.
	 * Called internally during _buildSidebarDOM, on setSlot/clearSlot,
	 * and on slot-specific state changes (toggle open/close, image change).
	 *
	 * @param {string} name  One of Phong360LibraryUI.SLOT_NAMES
	 * @private
	 */
	_renderSlot(name) {
		const wrapper = this._slotWrappers && this._slotWrappers[name];
		if (!wrapper) return; // slot not yet built

		// Context-load gating (see master plan "Context-load gating rule"):
		//   - factory registered + context not loaded → defer
		//   - no factory + context-dependent default + context not loaded → defer
		//   - no factory + context-independent default → render immediately
		const factoryRegistered = this._slots.has(name);
		const defaultReadsContext = (name === 'toolbar-leading'); // brand pill reads context.brand
		if (!this._contextLoaded && (factoryRegistered || defaultReadsContext)) {
			return;
		}

		// Clear existing slot content
		while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

		const slotProps = this._buildSlotProps(name);
		const factory = this._slots.get(name);
		let node = null;

		if (factory) {
			try {
				node = factory(slotProps);
			} catch (err) {
				console.warn(
					`[Phong360LibraryUI] slot "${name}" factory threw, ` +
					`falling back to default:`, err,
				);
				node = null;
			}
			// Validate return value: must be a Node or null/undefined.
			// Strings, numbers, arrays, plain objects, Promises etc. are
			// rejected with a warning and treated as null. Contains third-
			// party bugs to a single warn instead of a thrown appendChild.
			if (node != null && !(node instanceof Node)) {
				console.warn(
					`[Phong360LibraryUI] slot "${name}" factory returned ` +
					`non-Node value (got ${typeof node}); ` +
					`falling back to default`, node,
				);
				node = null;
			}
		}

		// Engine defaults — if no factory or factory returned null
		if (!node) {
			node = this._defaultSlotContent(name, slotProps);
		}

		if (node) wrapper.appendChild(node);
	}

	/**
	 * Build the props object passed to a slot's factory and to the
	 * engine's own default renderer.
	 *
	 * @param {string} name
	 * @returns {Object}
	 * @private
	 * @since 4.2.0
	 */
	_buildSlotProps(name) {
		const props = { context: this._context || {} };
		if (name === 'sidebar-toggle-icon') {
			props.isOpen = !!this._sidebarOpen;
		}
		if (name === 'info-bar-leading' || name === 'info-bar-trailing') {
			props.imageData = this._currentImageData || null;
		}
		return props;
	}

	/**
	 * Render the engine's built-in default for a slot. Returns null
	 * if the slot has no default content.
	 *
	 * @param {string} name
	 * @param {Object} slotProps
	 * @returns {HTMLElement|null}
	 * @private
	 * @since 4.2.0
	 */
	_defaultSlotContent(name, slotProps) {
		if (name === 'toolbar-leading') {
			return this._renderBrandPillDefault(slotProps);
		}
		if (name === 'sidebar-toggle-icon') {
			return this._renderToggleIconDefault(slotProps);
		}
		// info-bar-leading, info-bar-trailing have no default
		return null;
	}

	/**
	 * Re-render every registered slot. Called from loadLibrary()
	 * after data is processed (so context-dependent defaults pick up
	 * the new context) and from reloadLibrary() after the reload completes.
	 *
	 * @private
	 * @since 4.2.0
	 */
	_renderAllSlots() {
		for (const name of Phong360LibraryUI.SLOT_NAMES) {
			this._renderSlot(name);
		}
	}

	/**
	 * Default renderer for the toolbar-leading slot.
	 * Reads context.brand = { logo, label, href } and produces a pill.
	 * Returns null when context.brand is absent (slot stays empty).
	 *
	 * @param {Object} slotProps  { context }
	 * @returns {HTMLElement|null}
	 * @private
	 * @since 4.2.0
	 */
	_renderBrandPillDefault(slotProps) {
		const brand = slotProps.context.brand || null;
		if (!brand || !brand.label) return null;

		const tag = brand.href ? 'a' : 'span';
		const el = document.createElement(tag);
		el.className = 'p360-brand-pill';

		// Heading semantics — pill becomes the primary heading ONLY when:
		//   1. brand.label set (already guaranteed above)
		//   2. context.suppressHeader === true (legacy <h2> being skipped)
		//   3. context.type ∈ {discover, local} (the only types that emit
		//      the legacy <h2>; profile has its own header layout)
		const ctxType = slotProps.context.type;
		const emitsLegacyH2 = (ctxType === 'discover' || ctxType === 'local');
		if (slotProps.context.suppressHeader === true && emitsLegacyH2) {
			el.setAttribute('role', 'heading');
			el.setAttribute('aria-level', '1');
		}

		if (brand.href) {
			el.href = brand.href;
			el.setAttribute('aria-label', `Go to ${brand.label}`);
		}

		if (brand.logo) {
			const img = document.createElement('img');
			img.className = 'p360-brand-pill-logo';
			img.src = brand.logo;
			img.alt = '';
			el.appendChild(img);
		}

		const label = document.createElement('span');
		label.className = 'p360-brand-pill-label';
		label.textContent = brand.label;
		el.appendChild(label);

		return el;
	}

	/**
	 * Default renderer for the sidebar-toggle-icon slot.
	 * State-aware: receives isOpen via slotProps.
	 *
	 * @param {Object} slotProps  { context, isOpen }
	 * @returns {HTMLElement}
	 * @private
	 * @since 4.2.0
	 */
	_renderToggleIconDefault(slotProps) {
		const i = document.createElement('i');
		i.className = 'ph';
		i.classList.add(slotProps.isOpen ? 'ph-caret-right' : 'ph-list');
		return i;
	}

	// --------------------------------------------------------
	// Public getters
	// --------------------------------------------------------

	getLibraryData() {
		return this.libraryData;
	}

	async reloadLibrary() {
		if (this.libraryUrl) {
			// Clear existing content
			const headers = this._sidebar.querySelectorAll('.p360-header');
			headers.forEach((h) => h.remove());
			await this.loadLibrary();
			// Refresh slot content with new context (since 4.2.0)
			this._renderAllSlots();
		}
	}
}

// Register globally for script-tag loading
if (typeof window !== 'undefined') {
	window.Phong360LibraryUI = Phong360LibraryUI;
	window.BaseRenderer = BaseRenderer;
}
