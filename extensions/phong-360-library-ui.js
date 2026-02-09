/**
 * Phong 360 Library UI - Layer 3
 *
 * Section-based library interface with pluggable template renderers.
 * Supports v4.0 library.json format with context, sections, badges,
 * theme management, accent colors, and deep-linking.
 *
 * @version 4.0.0
 * @author Phong
 * @license MIT
 */

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

        const img = document.createElement('img');
        const thumbPath = image.thumbnail?.path || image.thumbnail;
        if (thumbPath) {
            // Lazy loading via IntersectionObserver
            // Don't prepend baseUrl to absolute paths
            const isAbsolute = thumbPath.startsWith('/') || thumbPath.startsWith('http');
            img.dataset.src = isAbsolute ? thumbPath : this.config.baseUrl + thumbPath;
            img.alt = image.title || image.name || '';
        }

        wrapper.appendChild(img);

        // Render badges if present
        const badges = image.badges || [];
        if (badges.length > 0) {
            this._renderBadges(wrapper, badges);
        }

        wrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            this.engine.onImageClick(image);
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
        for (const image of (this.section.images || [])) {
            el.appendChild(this.createThumbnail(image));
        }
        return el;
    }
}

class FeedRenderer extends BaseRenderer {
    render() {
        const el = document.createElement('div');
        el.className = 'p360-feed';
        for (const image of (this.section.images || [])) {
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
        const innerContent = this.engine.templateEngine.render(innerSection, { baseUrl: this.config.baseUrl });
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
        for (const image of (this.section.images || [])) {
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

        for (const image of (this.section.images || [])) {
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
        for (const item of (this.section.items || this.section.images || [])) {
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
        for (const item of (this.section.items || this.section.images || [])) {
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
     * @param {number} [options.panelWidth] - Sidebar width in px (280-600)
     * @param {string} [options.infoBar] - Info bar alignment: 'center' | 'left'
     * @param {string} [options.favicon] - Emoji to use as favicon (e.g. '🌐')
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
        this.filterCollection = options.filterCollection || null;
        this.baseUrl = options.baseUrl || '';
        this._panelWidth = options.panelWidth || null;
        this._infoBarAlign = options.infoBar || null;
        this._favicon = options.favicon || null;

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
        this._currentImageId = null;

        // DOM references
        this._sidebar = null;
        this._backdrop = null;
        this._toggle = null;
        this._contentEl = null;
        this._observer = null;

        // Initialize
        this.init();
    }

    async init() {
        this._initCore();
        this._buildSidebarDOM();
        this._setupLazyLoading();
        this._applyTheme(this._theme);

        if (this.libraryUrl) {
            await this.loadLibrary();
        } else if (this.libraryData) {
            this._processLibraryData(this.libraryData);
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
        } catch (e) { /* ignore */ }

        if (typeof Phong360ViewerCore !== 'undefined') {
            this.core = new Phong360ViewerCore({
                containerId: this.containerId,
                config: {
                    viewRotation: { autoRotate, autoRotationRate: 1 }
                }
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
                            this._resDropdown.querySelectorAll('.p360-res-option').forEach(b => {
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
        this._toggle.innerHTML = '<i class="ph ph-list"></i>';
        this._toggle.title = 'Browse Library';
        this._toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSidebar();
        });
        document.body.appendChild(this._toggle);

        // Backdrop
        this._backdrop = document.createElement('div');
        this._backdrop.className = 'p360-sidebar-backdrop';
        this._backdrop.addEventListener('click', () => this.closeSidebar());
        document.body.appendChild(this._backdrop);

        // Sidebar
        this._sidebar = document.createElement('div');
        this._sidebar.className = 'p360-sidebar';
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
    }

    _buildToolbar() {
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

        this._infoBar.appendChild(this._prevBtn);
        this._infoBar.appendChild(this._infoText);
        this._infoBar.appendChild(this._nextBtn);
        document.body.appendChild(this._infoBar);
    }

    _updateInfoBar(imageData, resolution) {
        if (!this._infoBar) return;

        // Title
        this._infoTitle.textContent = imageData.title || imageData.name || 'Unknown';

        // Subtitle: resolution info
        if (resolution) {
            this._infoSubtitle.textContent = resolution.id.toUpperCase() + ' (' + resolution.width + '\u00D7' + resolution.height + ')';
        } else {
            this._infoSubtitle.textContent = 'Equirectangular';
        }

        // Show the bar
        this._infoBar.classList.add('visible');

        // Update prev/next button disabled state
        if (this.multiViewer && this._allImages.length > 0) {
            const idx = this._allImages.findIndex(img => img.id === imageData.id);
            this._prevBtn.disabled = idx <= 0;
            this._nextBtn.disabled = idx === -1 || idx >= this._allImages.length - 1;
        }
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
                this._resDropdown.querySelectorAll('.p360-res-option').forEach(b => b.classList.remove('active'));
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
        existing.forEach(el => el.remove());

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

    _processLibraryData(data) {
        this.libraryData = data;
        this._context = data.context || null;
        this._sections = data.sections || [];
        this._allImages = [];

        // Flatten all images from all sections
        for (const section of this._sections) {
            if (section.images) {
                this._allImages.push(...section.images);
            }
            if (section.items) {
                // items can also contain images (avatar sections)
                for (const item of section.items) {
                    if (item.resolutions) this._allImages.push(item);
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

        // Render
        this._renderContext(this._context);
        this._renderSections(this._sections);

        // Callbacks
        if (this.callbacks.onLibraryLoad) {
            this.callbacks.onLibraryLoad(data);
        }
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
            const title = document.createElement('h2');
            title.className = 'p360-header-title';
            title.textContent = context.title || (context.type === 'discover' ? 'Discover' : 'Library');
            header.appendChild(title);

            if (context.subtitle) {
                const sub = document.createElement('p');
                sub.className = 'p360-header-subtitle';
                sub.textContent = context.subtitle;
                header.appendChild(sub);
            }
        }

        // Insert header before content
        this._sidebar.insertBefore(header, this._contentEl);
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
        this._contentEl.innerHTML = '';

        const filtered = this.filterCollection
            ? sections.filter(s => s.id === this.filterCollection || s.slug === this.filterCollection)
            : sections;

        if (filtered.length === 0) {
            const emptySection = { template: 'empty', title: 'No images found', icon: 'image', message: 'This gallery is empty.' };
            const el = this.templateEngine.render(emptySection, { baseUrl: this.baseUrl });
            this._contentEl.appendChild(el);
            return;
        }

        for (const section of filtered) {
            const sectionEl = this.renderSection(section);
            if (sectionEl) {
                this._contentEl.appendChild(sectionEl);
            }
        }

        // Start observing lazy images
        this._observeImages();
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
                        this.callbacks.onSectionToggle(section, !sectionEl.classList.contains('p360-section--collapsed'));
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

        this.closeSidebar();

        setTimeout(() => {
            if (this.multiViewer) {
                this.multiViewer.loadImageById(image.id);
            }
            this._highlightImage(image.id);
            this._updateURL(image.slug || image.id);

            if (this.callbacks.onImageSelect) {
                this.callbacks.onImageSelect(image);
            }
        }, 200);
    }

    _onImageLoaded(imageData, resolution) {
        this._currentImageId = imageData.id;
        this._highlightImage(imageData.id);

        // Update toolbar controls
        this._updateResolutionSelector(imageData, resolution);
        this._updateProjectionButton(this.core?.projectionType ?? 1);
        this._updateInfoBar(imageData, resolution);

        if (this.callbacks.onImageLoad) {
            this.callbacks.onImageLoad(imageData, resolution);
        }
    }

    _highlightImage(imageId) {
        if (!this._contentEl) return;
        // Remove previous highlight
        const prev = this._contentEl.querySelectorAll('.p360-thumbnail--selected, .p360-list-item--selected');
        prev.forEach(el => el.classList.remove('p360-thumbnail--selected', 'p360-list-item--selected'));

        // Add highlight
        const thumb = this._contentEl.querySelector(`.p360-thumbnail[data-image-id="${imageId}"]`);
        if (thumb) thumb.classList.add('p360-thumbnail--selected');

        const listItem = this._contentEl.querySelector(`.p360-list-item[data-image-id="${imageId}"]`);
        if (listItem) listItem.classList.add('p360-list-item--selected');
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

    toggleSidebar() {
        this._sidebarOpen ? this.closeSidebar() : this.openSidebar();
    }

    openSidebar() {
        this._sidebarOpen = true;
        this._sidebar.classList.add('p360-sidebar--open');
        this._backdrop.classList.add('p360-sidebar-backdrop--visible');

        // Re-observe in case images were added
        this._observeImages();
    }

    closeSidebar() {
        this._sidebarOpen = false;
        this._sidebar.classList.remove('p360-sidebar--open');
        this._backdrop.classList.remove('p360-sidebar-backdrop--visible');
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
        this._sidebar.style.setProperty('--p360-accent-hover', `#${lighten(r).toString(16).padStart(2, '0')}${lighten(g).toString(16).padStart(2, '0')}${lighten(b).toString(16).padStart(2, '0')}`);
        this._sidebar.style.setProperty('--p360-accent-active', `rgba(${r},${g},${b},0.25)`);
        this._sidebar.style.setProperty('--p360-accent-border', `rgba(${r},${g},${b},0.6)`);
    }

    // --------------------------------------------------------
    // Lazy loading via IntersectionObserver
    // --------------------------------------------------------

    _setupLazyLoading() {
        if (typeof IntersectionObserver === 'undefined') return;

        this._observer = new IntersectionObserver((entries) => {
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
        }, {
            root: this._contentEl,
            rootMargin: '200px'
        });
    }

    _observeImages() {
        if (!this._observer || !this._sidebar) return;
        const images = this._sidebar.querySelectorAll('img[data-src]');
        images.forEach(img => this._observer.observe(img));
    }

    // --------------------------------------------------------
    // Deep-linking / URL parameters
    // --------------------------------------------------------

    _handleUrlParameters() {
        const params = new URLSearchParams(window.location.search);
        const imgParam = params.get('img');

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
        let found = this._allImages.find(img => img.id === idOrSlug);
        if (!found) {
            found = this._allImages.find(img => img.slug === idOrSlug);
        }

        if (found) {
            this.multiViewer.loadImageById(found.id);
            this._highlightImage(found.id);
        } else if (this._allImages.length > 0) {
            this.multiViewer.loadFirstImage();
        }
    }

    _updateURL(idOrSlug) {
        const newURL = '?img=' + encodeURIComponent(idOrSlug);
        window.history.pushState({}, '', newURL);
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
            headers.forEach(h => h.remove());
            await this.loadLibrary();
        }
    }
}

// Register globally for script-tag loading
if (typeof window !== 'undefined') {
    window.Phong360LibraryUI = Phong360LibraryUI;
    window.BaseRenderer = BaseRenderer;
}
