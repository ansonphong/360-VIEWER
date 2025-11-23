/**
 * Phong 360 Library UI - Layer 3
 * 
 * Wraps multi-image manager to add browsable library interface.
 * Provides thumbnail tree view, category folders, and click-to-load functionality.
 * 
 * @version 3.0.0-library
 * @author Phong
 * @license MIT
 * @size ~20KB minified
 */

(function(window) {
    'use strict';

    /**
     * Phong360LibraryUI - Browsable library interface
     * 
     * @class
     * @param {Object} options - Configuration options
     * @param {Phong360MultiImage} options.multiViewer - Multi-image manager instance
     * @param {Object} [options.libraryData] - Library data structure
     * @param {string} [options.libraryUrl] - URL to load library.json
     * @param {Object} [options.ui] - UI element IDs
     * @param {Object} [options.callbacks] - Event callbacks
     */
    class Phong360LibraryUI {
        constructor(options = {}) {
            if (!options.multiViewer) {
                throw new Error('Phong360LibraryUI requires a multiViewer instance');
            }

            this.multiViewer = options.multiViewer;
            this.libraryData = options.libraryData || null;
            this.libraryUrl = options.libraryUrl || null;
            
            // UI element IDs
            this.ui = Object.assign({
                panelId: 'library-panel',
                hamburgerMenuId: 'hamburger-menu',
                treeId: 'library-tree',
                toolbarId: 'toolbar-panel',
                resolutionSelectorId: 'resolution-selector'
            }, options.ui || {});

            // Callbacks
            this.callbacks = Object.assign({
                onLibraryLoad: null,        // (libraryData) => {}
                onImageSelect: null,        // (imageId) => {}
                onPanelToggle: null,        // (isOpen) => {}
                onImageInfoUpdate: null     // (info) => {} - fires when image loads with display info
            }, options.callbacks || {});

            // UI state
            this.isPanelOpen = false;
            this.elements = {};

            // Initialize
            this.init();
        }

        /**
         * Initialize library UI
         */
        async init() {
            this.setupUIElements();
            this.setupEventListeners();

            // Load library data
            if (this.libraryUrl) {
                await this.loadLibraryFromUrl(this.libraryUrl);
            } else if (this.libraryData) {
                await this.processLibraryData(this.libraryData);
            }

            // Setup resolution selector if present
            this.setupResolutionSelector();

            // Check for URL parameters
            this.handleUrlParameters();
        }

        /**
         * Setup UI elements
         */
        setupUIElements() {
            this.elements.panel = document.getElementById(this.ui.panelId);
            this.elements.hamburgerMenu = document.getElementById(this.ui.hamburgerMenuId);
            this.elements.tree = document.getElementById(this.ui.treeId);
            this.elements.toolbar = document.getElementById(this.ui.toolbarId);
            this.elements.resolutionSelector = document.getElementById(this.ui.resolutionSelectorId);
        }

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            // Hamburger menu toggle
            if (this.elements.hamburgerMenu) {
                this.elements.hamburgerMenu.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.togglePanel();
                });
            }

            // Close panel when clicking outside
            document.addEventListener('click', (event) => {
                if (this.elements.panel && !this.elements.panel.contains(event.target) && 
                    this.elements.hamburgerMenu && !this.elements.hamburgerMenu.contains(event.target)) {
                    this.closePanel();
                }
            });

            // Listen to multi-viewer events
            this.multiViewer.callbacks.onLoadStart = () => {
                if (this.callbacks.onImageInfoUpdate) {
                    this.callbacks.onImageInfoUpdate({
                        name: 'Loading...',
                        resolution: '',
                        width: 0,
                        height: 0,
                        dimensions: '',
                        format: '360° Viewer'
                    });
                }
            };

            this.multiViewer.callbacks.onImageLoad = (imageData, resolution) => {
                this.onImageLoaded(imageData, resolution);
            };

            this.multiViewer.callbacks.onImageError = (error) => {
                if (this.callbacks.onImageInfoUpdate) {
                    this.callbacks.onImageInfoUpdate({
                        name: 'Error Loading Image',
                        resolution: '',
                        width: 0,
                        height: 0,
                        dimensions: '',
                        format: error.message || 'Unknown error'
                    });
                }
            };

            this.multiViewer.callbacks.onResolutionChange = (resolution) => {
                this.updateResolutionSelector();
            };
        }

        /**
         * Load library from URL
         */
        async loadLibraryFromUrl(url) {
            try {
                const response = await fetch(url);
                const data = await response.json();
                await this.processLibraryData(data);
            } catch (error) {
                console.error('Error loading library:', error);
            }
        }

        /**
         * Process library data and build UI
         */
        async processLibraryData(data) {
            this.libraryData = data;

            // Convert library format to images array
            const images = this.extractImagesFromLibrary(data);
            this.multiViewer.setImages(images);

            // Build tree UI
            if (this.elements.tree) {
                this.buildLibraryTree(data);
            }

            // Fire callback
            if (this.callbacks.onLibraryLoad) {
                this.callbacks.onLibraryLoad(data);
            }
        }

        /**
         * Extract images array from library data
         */
        extractImagesFromLibrary(libraryData) {
            const images = [];
            const categories = libraryData._categories || libraryData;

            for (const category of Object.values(categories)) {
                if (typeof category !== 'object' || category === null) continue;
                if (category.images && Array.isArray(category.images)) {
                    images.push(...category.images);
                }
            }

            return images;
        }

        /**
         * Build library tree UI
         */
        buildLibraryTree(data) {
            const tree = this.createTreeElement(data);
            this.elements.tree.innerHTML = '';
            this.elements.tree.appendChild(tree);

            // Dispatch library loaded event
            window.dispatchEvent(new Event('libraryLoaded'));
        }

        /**
         * Create tree element from data
         */
        createTreeElement(data, path = '') {
            const ul = document.createElement('ul');
            const categories = data._categories || data;

            for (const [key, value] of Object.entries(categories)) {
                // Skip metadata
                if (key.startsWith('_')) continue;

                const li = document.createElement('li');
                li.className = 'folder';
                li.setAttribute('data-folder-name', key);
                li.innerHTML = `<span>${value.name || key}</span>`;
                li.addEventListener('click', this.onFolderClick.bind(this));

                const subUl = document.createElement('ul');
                subUl.style.display = 'none';

                // Handle images
                const images = value.images || value.files || [];
                if (images.length > 0) {
                    images.forEach((image) => {
                        const fileLi = this.createImageElement(image);
                        subUl.appendChild(fileLi);
                    });
                }

                // Handle subcategories
                if (value.subcategories) {
                    for (const [subKey, subValue] of Object.entries(value.subcategories)) {
                        const subTree = this.createTreeElement({ [subKey]: subValue }, `${path}${key}/`);
                        subUl.appendChild(subTree);
                    }
                }

                if (subUl.children.length > 0) {
                    li.appendChild(subUl);
                }

                ul.appendChild(li);
            }

            return ul;
        }

        /**
         * Create image element
         */
        createImageElement(imageData) {
            const li = document.createElement('li');
            li.className = 'file';
            li.dataset.id = imageData.id;

            // Handle thumbnail (v3.0 object or v2.0 string)
            const thumbnailPath = imageData.thumbnail?.path || imageData.thumbnail;
            if (thumbnailPath) {
                const img = document.createElement('img');
                img.src = this.multiViewer.baseUrl + thumbnailPath;
                img.alt = imageData.name;
                img.className = 'file-thumbnail';
                li.appendChild(img);
            }

            li.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onImageClick(imageData.id);
            });

            return li;
        }

        /**
         * Handle folder click
         */
        onFolderClick(event) {
            event.stopPropagation();
            const folder = event.currentTarget;
            const subList = folder.querySelector('ul');
            
            if (subList) {
                const isExpanded = subList.style.display !== 'none';
                subList.style.display = isExpanded ? 'none' : 'block';
                folder.classList.toggle('expanded', !isExpanded);
            }
        }

        /**
         * Handle image click
         */
        onImageClick(imageId) {
            this.closePanel();

            setTimeout(() => {
                this.multiViewer.loadImageById(imageId);
                this.highlightCurrentImage(imageId);
                this.expandFolderForImage(imageId);
                this.updateURLWithImageId(imageId);

                if (this.callbacks.onImageSelect) {
                    this.callbacks.onImageSelect(imageId);
                }
            }, 250);
        }

        /**
         * Handle image loaded
         */
        onImageLoaded(imageData, resolution) {
            // Update tree selection and resolution selector (Library UI's responsibility)
            this.highlightCurrentImage(imageData.id);
            this.updateResolutionSelector();
            
            // Fire callback with formatted info (let consumer update their UI)
            if (this.callbacks.onImageInfoUpdate) {
                this.callbacks.onImageInfoUpdate({
                    name: imageData.name || 'Unknown',
                    resolution: resolution.label || 'Unknown',
                    width: resolution.width,
                    height: resolution.height,
                    dimensions: `${resolution.width}×${resolution.height}`,
                    format: 'Equirectangular'
                });
            }
        }

        /**
         * Highlight current image in tree
         */
        highlightCurrentImage(imageId) {
            if (!this.elements.tree) return;

            // Remove highlight from all images
            const allImages = this.elements.tree.querySelectorAll('.file');
            allImages.forEach((img) => img.classList.remove('current'));

            // Add highlight to current image
            const currentImage = this.elements.tree.querySelector(`.file[data-id="${imageId}"]`);
            if (currentImage) {
                currentImage.classList.add('current');
                currentImage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        /**
         * Expand folder containing image
         */
        expandFolderForImage(imageId) {
            if (!this.elements.tree) return;

            const imageElement = this.elements.tree.querySelector(`.file[data-id="${imageId}"]`);
            if (!imageElement) return;

            let parent = imageElement.parentElement;
            while (parent && parent !== this.elements.tree) {
                if (parent.tagName === 'UL') {
                    parent.style.display = 'block';
                    const folder = parent.parentElement;
                    if (folder && folder.classList.contains('folder')) {
                        folder.classList.add('expanded');
                    }
                }
                parent = parent.parentElement;
            }
        }

        /**
         * Setup resolution selector
         */
        setupResolutionSelector() {
            if (!this.elements.resolutionSelector) return;

            this.elements.resolutionSelector.addEventListener('change', (e) => {
                this.multiViewer.switchResolution(e.target.value);
            });
        }

        /**
         * Update resolution selector options
         */
        updateResolutionSelector() {
            if (!this.elements.resolutionSelector) return;

            const resolutions = this.multiViewer.getAvailableResolutions();
            const currentResolution = this.multiViewer.getCurrentResolution();

            if (resolutions.length === 0) {
                this.elements.resolutionSelector.style.display = 'none';
                return;
            }

            // Clear existing options
            this.elements.resolutionSelector.innerHTML = '';

            // Add options
            resolutions.forEach(res => {
                const option = document.createElement('option');
                option.value = res.id;
                option.textContent = `${res.label} (${this.multiViewer.formatFileSize(res.fileSize)})`;
                
                if (currentResolution && currentResolution.id === res.id) {
                    option.selected = true;
                }
                
                this.elements.resolutionSelector.appendChild(option);
            });

            // Show selector
            this.elements.resolutionSelector.style.display = 'block';
        }

        /**
         * Toggle panel
         */
        togglePanel() {
            if (!this.elements.panel) return;

            this.isPanelOpen = !this.isPanelOpen;
            this.elements.panel.classList.toggle('active', this.isPanelOpen);
            
            if (this.elements.hamburgerMenu) {
                this.elements.hamburgerMenu.classList.toggle('active', this.isPanelOpen);
            }

            if (this.callbacks.onPanelToggle) {
                this.callbacks.onPanelToggle(this.isPanelOpen);
            }
        }

        /**
         * Close panel
         */
        closePanel() {
            if (!this.elements.panel) return;

            this.isPanelOpen = false;
            this.elements.panel.classList.remove('active');
            
            if (this.elements.hamburgerMenu) {
                this.elements.hamburgerMenu.classList.remove('active');
            }
        }

        /**
         * Open panel
         */
        openPanel() {
            if (!this.elements.panel) return;

            this.isPanelOpen = true;
            this.elements.panel.classList.add('active');
            
            if (this.elements.hamburgerMenu) {
                this.elements.hamburgerMenu.classList.add('active');
            }
        }

        /**
         * Update URL with image ID
         */
        updateURLWithImageId(imageId) {
            const newURL = `?img=${imageId}`;
            window.history.pushState({}, '', newURL);
        }

        /**
         * Handle URL parameters
         */
        handleUrlParameters() {
            const urlParams = new URLSearchParams(window.location.search);
            const imgId = urlParams.get('img');
            
            if (imgId) {
                setTimeout(() => {
                    this.multiViewer.loadImageById(imgId);
                    this.expandFolderForImage(imgId);
                }, 200);
            } else {
                // Load first image
                this.multiViewer.loadFirstImage();
            }
        }

        /**
         * Get library data
         */
        getLibraryData() {
            return this.libraryData;
        }

        /**
         * Reload library
         */
        async reloadLibrary() {
            if (this.libraryUrl) {
                await this.loadLibraryFromUrl(this.libraryUrl);
            }
        }
    }

    // Export
    window.Phong360LibraryUI = Phong360LibraryUI;

})(window);

