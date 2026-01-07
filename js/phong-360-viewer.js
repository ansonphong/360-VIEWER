/**
 * Phong 360 Viewer - Modular, Embeddable 360° Image Viewer
 * 
 * A portable Three.js-based equirectangular image viewer with support for
 * gnomonic and stereographic projections. Features adaptive resolution loading.
 * 
 * @version 3.0.0
 * @author Phong
 * @license MIT
 */

(function(window) {
    'use strict';

    /**
     * Phong360Viewer Class
     * 
     * @class
     * @param {Object} options - Configuration options
     * @param {string} options.containerId - ID of the container element
     * @param {Object} options.libraryData - Library data in standard format
     * @param {string} [options.libraryUrl] - URL to load library.json from
     * @param {string} [options.baseUrl=''] - Base URL for resolving image paths
     * @param {Object} [options.config] - Viewer configuration
     * @param {Object} [options.ui] - UI element visibility configuration
     */
    class Phong360Viewer {
        constructor(options = {}) {
            // Validate Three.js dependency
            if (typeof THREE === 'undefined') {
                throw new Error('Phong360Viewer requires Three.js. Please load Three.js before initializing the viewer.');
            }

            // Configuration
            this.options = Object.assign({
                containerId: 'container',
                libraryData: null,
                libraryUrl: null,
                baseUrl: '',
                config: this.getDefaultConfig(),
                ui: {
                    showLibraryPanel: true,
                    showInfoPanel: true,
                    showToolbarPanel: true,
                    showHamburgerMenu: true,
                    showDragDrop: true,
                    showFullscreenToggle: true,
                    autoDiscovery: true  // Auto-discover and enhance UI elements if present
                },
                callbacks: {
                    onReady: null,              // (viewer) => {}
                    onImageLoad: null,          // (title) => {}
                    onImageError: null,         // (error) => {}
                    onLoadStart: null,          // () => {}
                    onLoadComplete: null,       // () => {}
                    onImageInfoUpdate: null,    // ({title, format, extension}) => {}
                    onProjectionChange: null,   // (type) => {} - 0=gnomonic, 1=stereographic
                    onFullscreenChange: null,   // (isFullscreen) => {}
                    onPanelsToggle: null        // (show) => {}
                }
            }, options);

            // Merge user config with defaults
            this.config = Object.assign(this.getDefaultConfig(), this.options.config || {});

            // State management
            this.state = {
                lat: this.config.viewRotation.initAltitude,
                lon: this.config.viewRotation.initAzimuth,
                phi: THREE.MathUtils.degToRad(90 - this.config.viewRotation.initAltitude),
                theta: THREE.MathUtils.degToRad(this.config.viewRotation.initAzimuth),
                fov: this.config.fov.init,
                azimuthSign: 1
            };

            this.targetState = {
                lat: this.config.viewRotation.initAltitude,
                lon: this.config.viewRotation.initAzimuth,
                phi: THREE.MathUtils.degToRad(90 - this.config.viewRotation.initAltitude),
                theta: THREE.MathUtils.degToRad(this.config.viewRotation.initAzimuth),
                fov: this.config.fov.initTarget
            };

            // Three.js components
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.mesh = null;

            // UI references
            this.elements = {};
            this.uiElements = {};

            // Resolution management (v3.0)
            this.currentResolution = null;
            this.currentImageData = null;
            this.availableResolutions = [];
            this.userPreferredResolution = null;
            this.autoAdaptiveLoading = options.autoAdaptiveLoading !== false;

            // Interaction state
            this.isUserInteracting = false;
            this.isPointerDown = false;
            this.pointerStartX = 0;
            this.pointerStartY = 0;
            this.lastPointerX = 0;
            this.lastPointerY = 0;
            this.onPointerDownLon = 0;
            this.onPointerDownLat = 0;

            // Aspect ratio and projection
            this.aspect = 1.0;
            this.projectionType = 1; // 0 = gnomonic, 1 = stereographic

            // Animation
            this.lastUpdate = Date.now();
            this.animationFrameId = null;

            // Library management
            this.library = null;
            this.currentImageId = null;

            // Initialize the viewer
            this.init();
        }

        /**
         * Get default configuration
         */
        getDefaultConfig() {
            return {
                fov: {
                    max: 300,
                    min: 45,
                    init: 100,
                    initTarget: 60
                },
                fov_gnomonic: {
                    max: 130,
                    min: 45,
                    init: 100,
                    initTarget: 60
                },
                fov_stereographic: {
                    max: 330,
                    min: 45,
                    init: 100,
                    initTarget: 60
                },
                zoom: {
                    increment: 2,
                    smoothing: 6000
                },
                viewRotation: {
                    initAltitude: 0,
                    initAzimuth: 90,
                    autoRotate: true,
                    autoRotationRate: 1,
                    smoothness: 8000
                }
            };
        }

        /**
         * Initialize the viewer
         */
        async init() {
            try {
                // Setup container
                this.setupContainer();

                // Load library data
                if (this.options.libraryUrl) {
                    await this.loadLibraryFromUrl(this.options.libraryUrl);
                } else if (this.options.libraryData) {
                    this.library = this.options.libraryData;
                } else {
                    console.warn('No library data provided. Viewer will start in empty state.');
                }

                // Initialize Three.js scene
                this.initScene();

                // Setup event listeners
                this.setupEventListeners();

                // Setup UI if enabled
                if (this.options.ui.showLibraryPanel && this.library) {
                    this.setupLibraryUI();
                }

                // Load initial image if library is available
                if (this.library) {
                    this.loadInitialImage();
                }

                // Start animation loop
                this.animate();

                // Call ready callback
                if (this.options.callbacks.onReady) {
                    this.options.callbacks.onReady(this);
                }

            } catch (error) {
                console.error('Error initializing Phong360Viewer:', error);
                throw error;
            }
        }

        /**
         * Setup container and UI elements
         */
        setupContainer() {
            const container = document.getElementById(this.options.containerId);
            if (!container) {
                throw new Error(`Container element with ID "${this.options.containerId}" not found.`);
            }

            this.elements.container = container;

            // Ensure container has proper styling
            if (!container.style.position || container.style.position === 'static') {
                container.style.position = 'relative';
            }
            if (!container.style.width) {
                container.style.width = '100%';
            }
            if (!container.style.height) {
                container.style.height = '100vh';
            }

            // Setup optional UI elements (if they exist in DOM)
            this.setupOptionalUIElements();
        }

        /**
         * Setup optional UI elements for enhanced features
         */
        setupOptionalUIElements() {
            // Loading overlay and logo
            this.uiElements.loadingOverlay = document.getElementById('loading-overlay');
            this.uiElements.phongLogoCenterImg = document.getElementById('phong-logo-center');
            
            // Info panel elements
            this.uiElements.imageTitle = document.getElementById('imageTitle');
            this.uiElements.imageFormat = document.getElementById('imageFormat');
            
            // Toolbar/control panels
            this.uiElements.toolbarPanel = document.getElementById('toolbar-panel');
            this.uiElements.infoPanel = document.getElementById('info-panel');
            this.uiElements.hamburgerMenu = document.getElementById('hamburger-menu');
            this.uiElements.libraryPanel = document.getElementById('library-panel');
            
            // Projection switcher
            this.uiElements.switchProjectionButton = document.getElementById('switchProjectionButton');
            if (this.uiElements.switchProjectionButton) {
                this.uiElements.switchProjectionButton.addEventListener('click', () => {
                    const newType = this.projectionType === 0 ? 1 : 0;
                    this.switchProjection(newType);
                    this.updateProjectionButton(newType);
                });
                this.updateProjectionButton(this.projectionType);
            }

            // Fullscreen toggle
            const phongLogo = document.querySelector('.phong-logo');
            if (phongLogo) {
                phongLogo.addEventListener('click', () => this.toggleFullscreen());
            }

            // Setup fullscreen change handlers
            document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
            document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange.bind(this));
            document.addEventListener('mozfullscreenchange', this.handleFullscreenChange.bind(this));
            document.addEventListener('MSFullscreenChange', this.handleFullscreenChange.bind(this));
        }

        /**
         * Load library data from URL
         */
        async loadLibraryFromUrl(url) {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to load library from ${url}: ${response.statusText}`);
                }
                this.library = await response.json();
                console.log('Library loaded successfully from:', url);
            } catch (error) {
                console.error('Error loading library:', error);
                throw error;
            }
        }

        /**
         * Initialize Three.js scene
         */
        initScene() {
            const container = this.elements.container;
            const width = container.clientWidth;
            const height = container.clientHeight;

            // Scene
            this.scene = new THREE.Scene();

            // Camera (orthographic for shader-based projection)
            this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
            this.camera.position.z = 1;

            // Renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(width, height);
            container.appendChild(this.renderer.domElement);

            this.elements.canvas = this.renderer.domElement;

            // Create full-screen quad
            const geometry = new THREE.PlaneGeometry(2, 2);
            this.mesh = new THREE.Mesh(geometry);
            this.scene.add(this.mesh);

            // Calculate initial aspect ratio
            this.aspect = width / height;
        }

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            // Window resize
            window.addEventListener('resize', this.onWindowResize.bind(this));

            // Mouse/touch events
            this.elements.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
            document.addEventListener('pointermove', this.onPointerMove.bind(this));
            document.addEventListener('pointerup', this.onPointerUp.bind(this));
            document.addEventListener('pointercancel', this.onPointerUp.bind(this));

            // Mouse wheel
            this.elements.canvas.addEventListener('wheel', this.onMouseWheel.bind(this));

            // Keyboard with active key tracking
            this.activeKeys = {
                ArrowUp: false,
                ArrowDown: false,
                ArrowLeft: false,
                ArrowRight: false,
                '=': false,
                '+': false,
                '-': false,
                '_': false
            };
            this.zoomInterval = null;
            this.panInterval = null;
            this.lastKeyPressTime = 0;
            this.DOUBLE_PRESS_DELAY = 300; // milliseconds
            
            document.addEventListener('keydown', this.onKeyDown.bind(this));
            document.addEventListener('keyup', this.onKeyUp.bind(this));

            // Touch events for pinch zoom
            this.isZooming = false;
            this.initialPinchDistance = 0;
            this.PINCH_ZOOM_DAMPING = 0.05;
            
            this.elements.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), false);
            this.elements.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), false);
            this.elements.canvas.addEventListener('touchend', this.onTouchEnd.bind(this), false);

            // Tab visibility
            this.isTabVisible = true;
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
            window.addEventListener('focus', this.handleFocus.bind(this));
            window.addEventListener('blur', this.handleBlur.bind(this));

            // Drag and drop
            if (this.options.ui.showDragDrop) {
                this.setupDragAndDrop();
            }
        }

        /**
         * Setup drag and drop functionality
         */
        setupDragAndDrop() {
            const container = this.elements.container;

            container.addEventListener('dragenter', (e) => {
                e.preventDefault();
                e.stopPropagation();
                container.classList.add('drag-over');
            });

            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });

            container.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.target === container) {
                    container.classList.remove('drag-over');
                }
            });

            container.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                container.classList.remove('drag-over');

                const file = e.dataTransfer.files[0];
                if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
                    this.loadImageFromFile(file);
                } else {
                    console.error('Invalid file type. Please drop a JPG or PNG image.');
                }
            });
        }

        /**
         * Load image from file
         */
        async loadImageFromFile(file) {
            try {
                const imageBitmap = await createImageBitmap(file);
                
                const canvas = document.createElement('canvas');
                canvas.width = imageBitmap.width;
                canvas.height = imageBitmap.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(imageBitmap, 0, 0);

                const texture = new THREE.CanvasTexture(canvas);
                texture.needsUpdate = true;

                this.loadTexture(texture, file.name);
            } catch (error) {
                console.error('Error loading image from file:', error);
                if (this.options.callbacks.onImageError) {
                    this.options.callbacks.onImageError(error);
                }
            }
        }

        /**
         * Load texture into viewer
         */
        loadTexture(texture, title = '') {
            // Show loading UI
            this.showLoading();
            this.fadeOutCurrentImage();

            // Configure texture
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.repeat.x = -1;

            const internalFormat = texture.format === THREE.RGBAFormat ? THREE.RGBA8 : THREE.RGB8;
            texture.internalFormat = internalFormat;

            // Create material
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    equirectangularMap: { value: texture },
                    lon: { value: THREE.MathUtils.degToRad(this.state.lon) },
                    lat: { value: THREE.MathUtils.degToRad(this.state.lat) },
                    fov: { value: this.state.fov },
                    aspect: { value: this.aspect },
                    projectionType: { value: this.projectionType }
                },
                vertexShader: this.getVertexShader(),
                fragmentShader: this.getFragmentShader()
            });

            // Update mesh material
            if (this.mesh.material) {
                this.mesh.material.dispose();
            }
            this.mesh.material = material;

            // Update UI
            this.updateImageInfo(title);
            this.hideLoading();
            this.fadeInNewImage();

            // Callback
            if (this.options.callbacks.onImageLoad) {
                this.options.callbacks.onImageLoad(title);
            }
        }

        /**
         * Load image by ID from library
         */
        loadImageById(id) {
            if (!this.library) {
                console.error('No library loaded');
                return;
            }

            const file = this.findFileById(this.library, id);
            if (!file) {
                console.error('Image not found with ID:', id);
                return;
            }

            this.currentImageId = id;
            const imagePath = this.resolveImagePath(file.Q75 || file.path);
            
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(
                imagePath,
                (texture) => {
                    this.loadTexture(texture, file.name);
                },
                undefined,
                (error) => {
                    console.error('Error loading texture:', error);
                    if (this.options.callbacks.onImageError) {
                        this.options.callbacks.onImageError(error);
                    }
                }
            );
        }

        /**
         * Resolve image path with base URL
         */
        resolveImagePath(path) {
            if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
                return path;
            }
            return this.options.baseUrl + (this.options.baseUrl && !this.options.baseUrl.endsWith('/') ? '/' : '') + path;
        }

        /**
         * Find file by ID in library
         */
        findFileById(library, id) {
            for (const category in library) {
                if (library[category].files) {
                    const file = library[category].files.find(f => f.id === id);
                    if (file) return file;
                }
            }
            return null;
        }

        /**
         * Load initial image
         */
        loadInitialImage() {
            // Try to get image ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const imgId = urlParams.get('img');

            if (imgId) {
                this.loadImageById(imgId);
            } else {
                // Load first image from library
                this.loadFirstImage();
            }
        }

        /**
         * Load first image from library
         */
        loadFirstImage() {
            if (!this.library) return;

            const firstCategory = Object.values(this.library)[0];
            if (firstCategory && firstCategory.files && firstCategory.files.length > 0) {
                this.loadImageById(firstCategory.files[0].id);
            }
        }

        /**
         * Setup library UI
         */
        setupLibraryUI() {
            // This is a placeholder - the full library UI implementation
            // would be in a separate library-ui.js file or implemented by the host
            console.log('Library UI setup - implement custom UI or use library.js');
        }

        /**
         * Window resize handler
         */
        onWindowResize() {
            const width = this.elements.container.clientWidth;
            const height = this.elements.container.clientHeight;
            
            this.aspect = width / height;
            this.camera.left = -this.aspect;
            this.camera.right = this.aspect;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);

            if (this.mesh && this.mesh.material && this.mesh.material.uniforms) {
                this.mesh.material.uniforms.aspect.value = this.aspect;
            }
        }

        /**
         * Pointer down handler
         */
        onPointerDown(event) {
            if (!event.isPrimary) return;

            this.isPointerDown = true;
            this.isUserInteracting = true;

            this.pointerStartX = event.clientX;
            this.pointerStartY = event.clientY;
            this.lastPointerX = event.clientX;
            this.lastPointerY = event.clientY;

            this.onPointerDownLon = this.targetState.lon;
            this.onPointerDownLat = this.targetState.lat;

            event.target.setPointerCapture(event.pointerId);
        }

        /**
         * Pointer move handler
         */
        onPointerMove(event) {
            if (!event.isPrimary || !this.isPointerDown) return;

            const deltaX = event.clientX - this.lastPointerX;

            this.targetState.lon = (this.pointerStartX - event.clientX) * 0.1 + this.onPointerDownLon;
            this.targetState.lat = (event.clientY - this.pointerStartY) * 0.1 + this.onPointerDownLat;

            this.state.azimuthSign = deltaX / Math.max(Math.abs(deltaX), 0.001);
            if (this.state.azimuthSign === 0) this.state.azimuthSign = 1;

            this.lastPointerX = event.clientX;
            this.lastPointerY = event.clientY;
        }

        /**
         * Pointer up handler
         */
        onPointerUp(event) {
            if (!event.isPrimary) return;

            this.isPointerDown = false;
            this.isUserInteracting = false;

            if (event.target && typeof event.target.releasePointerCapture === 'function') {
                event.target.releasePointerCapture(event.pointerId);
            }
        }

        /**
         * Mouse wheel handler
         */
        onMouseWheel(event) {
            event.preventDefault();
            const scrollDirection = event.deltaY < 0 ? 0.95 : 1.05;
            this.targetState.fov = this.clampFOV(this.targetState.fov * scrollDirection);
        }

        /**
         * Key down handler with continuous movement and double-tap
         */
        onKeyDown(event) {
            if (this.activeKeys.hasOwnProperty(event.key) && !this.activeKeys[event.key]) {
                this.activeKeys[event.key] = true;

                const currentTime = Date.now();
                const isDoubleTap = (currentTime - this.lastKeyPressTime) < this.DOUBLE_PRESS_DELAY;
                this.lastKeyPressTime = currentTime;

                if (event.key === '=' || event.key === '+') {
                    if (isDoubleTap) {
                        this.incrementalZoomIn();
                    } else {
                        this.startContinuousZoom('in');
                    }
                } else if (event.key === '-' || event.key === '_') {
                    if (isDoubleTap) {
                        this.incrementalZoomOut();
                    } else {
                        this.startContinuousZoom('out');
                    }
                } else {
                    if (isDoubleTap) {
                        this.incrementalPan(event.key);
                    } else {
                        this.startContinuousPan();
                    }
                }
            }
        }

        /**
         * Key up handler
         */
        onKeyUp(event) {
            if (this.activeKeys.hasOwnProperty(event.key)) {
                this.activeKeys[event.key] = false;

                if (event.key === '=' || event.key === '+' || event.key === '-' || event.key === '_') {
                    const isZoomingIn = this.activeKeys['='] || this.activeKeys['+'];
                    const isZoomingOut = this.activeKeys['-'] || this.activeKeys['_'];
                    if (!isZoomingIn && !isZoomingOut) {
                        this.stopContinuousZoom();
                    }
                } else {
                    if (!this.activeKeys.ArrowUp && !this.activeKeys.ArrowDown && 
                        !this.activeKeys.ArrowLeft && !this.activeKeys.ArrowRight) {
                        this.stopContinuousPan();
                    } else {
                        this.startContinuousPan();
                    }
                }

                // Update azimuthSign
                const lonDifference = this.targetState.lon - this.state.lon;
                this.state.azimuthSign = -Math.sign(lonDifference);
                if (this.state.azimuthSign === 0) {
                    this.state.azimuthSign = 1;
                }
            }
        }

        /**
         * Incremental zoom in (single tap)
         */
        incrementalZoomIn() {
            this.targetState.fov = this.clampFOV(this.targetState.fov - 10);
        }

        /**
         * Incremental zoom out (single tap)
         */
        incrementalZoomOut() {
            this.targetState.fov = this.clampFOV(this.targetState.fov + 10);
        }

        /**
         * Incremental pan (single tap)
         */
        incrementalPan(key) {
            switch (key) {
                case 'ArrowLeft':
                    this.targetState.lon -= 5;
                    break;
                case 'ArrowRight':
                    this.targetState.lon += 5;
                    break;
                case 'ArrowUp':
                    this.targetState.lat = Math.min(this.targetState.lat + 5, 90);
                    break;
                case 'ArrowDown':
                    this.targetState.lat = Math.max(this.targetState.lat - 5, -90);
                    break;
            }
        }

        /**
         * Start continuous zoom (hold key)
         */
        startContinuousZoom(direction) {
            if (this.zoomInterval) clearInterval(this.zoomInterval);
            this.zoomInterval = setInterval(() => {
                if (direction === 'in') {
                    this.targetState.fov = this.clampFOV(this.targetState.fov - 4);
                } else {
                    this.targetState.fov = this.clampFOV(this.targetState.fov + 4);
                }
            }, 100);
        }

        /**
         * Stop continuous zoom
         */
        stopContinuousZoom() {
            if (this.zoomInterval) {
                clearInterval(this.zoomInterval);
                this.zoomInterval = null;
            }
        }

        /**
         * Start continuous pan (hold key)
         */
        startContinuousPan() {
            if (this.panInterval) clearInterval(this.panInterval);
            this.panInterval = setInterval(() => {
                let deltaLon = 0;
                let deltaLat = 0;

                if (this.activeKeys.ArrowLeft) deltaLon -= 1;
                if (this.activeKeys.ArrowRight) deltaLon += 1;
                if (this.activeKeys.ArrowUp) deltaLat += 1;
                if (this.activeKeys.ArrowDown) deltaLat -= 1;

                this.targetState.lon += deltaLon;
                this.targetState.lat = THREE.MathUtils.clamp(this.targetState.lat + deltaLat, -90, 90);
            }, 100);
        }

        /**
         * Stop continuous pan
         */
        stopContinuousPan() {
            if (this.panInterval) {
                clearInterval(this.panInterval);
                this.panInterval = null;
            }
        }

        /**
         * Touch start handler (for pinch zoom)
         */
        onTouchStart(event) {
            if (event.touches.length === 2) {
                this.isZooming = true;
                this.initialPinchDistance = this.getPinchDistance(event);
            }
        }

        /**
         * Touch move handler (for pinch zoom and pan)
         */
        onTouchMove(event) {
            if (this.isZooming && event.touches.length === 2) {
                const currentPinchDistance = this.getPinchDistance(event);
                const rawPinchRatio = this.initialPinchDistance / currentPinchDistance;
                const dampedPinchRatio = 1 + (rawPinchRatio - 1) * this.PINCH_ZOOM_DAMPING;
                this.targetState.fov = this.clampFOV(this.state.fov * dampedPinchRatio);
                this.initialPinchDistance = currentPinchDistance;
            } else if (event.touches.length === 1) {
                // Single touch panning (delegated to pointer handlers)
                const touch = event.touches[0];
                this.onPointerMove({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    isPrimary: true
                });
            }
        }

        /**
         * Touch end handler
         */
        onTouchEnd(event) {
            if (event.touches.length < 2) {
                this.isZooming = false;
            }
            if (event.touches.length === 0) {
                this.onPointerUp({ isPrimary: true });
            }
        }

        /**
         * Get pinch distance between two touch points
         */
        getPinchDistance(event) {
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            return Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        }

        /**
         * Handle visibility change (pause when tab hidden)
         */
        handleVisibilityChange() {
            this.isTabVisible = !document.hidden;
        }

        /**
         * Handle window focus
         */
        handleFocus() {
            this.isTabVisible = true;
        }

        /**
         * Handle window blur
         */
        handleBlur() {
            this.isTabVisible = false;
        }

        // ============================================================================
        // UI HELPER METHODS (Auto-discovery with graceful degradation)
        // ============================================================================

        /**
         * Show loading overlay and start pulsing animation
         * Only if UI elements exist in DOM
         */
        showLoading() {
            if (this.uiElements.loadingOverlay) {
                this.uiElements.loadingOverlay.style.display = 'block';
            }
            
            if (this.uiElements.phongLogoCenterImg) {
                this.uiElements.phongLogoCenterImg.style.display = 'block';
                this.uiElements.phongLogoCenterImg.style.opacity = '1';
                this.startPulsing();
            }

            // Fire callback
            if (this.options.callbacks.onLoadStart) {
                this.options.callbacks.onLoadStart();
            }
        }

        /**
         * Hide loading overlay and stop pulsing animation
         */
        hideLoading() {
            if (this.uiElements.loadingOverlay) {
                this.uiElements.loadingOverlay.style.display = 'none';
            }
            
            if (this.uiElements.phongLogoCenterImg) {
                this.stopPulsing();
                this.uiElements.phongLogoCenterImg.style.transition = 'opacity 0.5s ease-out';
                this.uiElements.phongLogoCenterImg.style.opacity = '0';
                
                setTimeout(() => {
                    if (this.uiElements.phongLogoCenterImg) {
                        this.uiElements.phongLogoCenterImg.style.display = 'none';
                    }
                }, 500);
            }

            // Fire callback
            if (this.options.callbacks.onLoadComplete) {
                this.options.callbacks.onLoadComplete();
            }
        }

        /**
         * Start pulsing animation on logo
         */
        startPulsing() {
            if (this.uiElements.phongLogoCenterImg) {
                this.uiElements.phongLogoCenterImg.style.animation = 'pulse 2s infinite';
            }
        }

        /**
         * Stop pulsing animation
         */
        stopPulsing() {
            if (this.uiElements.phongLogoCenterImg) {
                this.uiElements.phongLogoCenterImg.style.animation = 'none';
                this.uiElements.phongLogoCenterImg.style.opacity = '0';
            }
        }

        /**
         * Fade out current image
         */
        fadeOutCurrentImage() {
            if (this.elements.canvas) {
                this.elements.canvas.style.transition = 'opacity 1s ease-out';
                this.elements.canvas.style.opacity = '0';
            }
        }

        /**
         * Fade in new image
         */
        fadeInNewImage() {
            if (this.elements.canvas) {
                setTimeout(() => {
                    this.elements.canvas.style.transition = 'opacity 1.8s ease-in';
                    this.elements.canvas.style.opacity = '1';
                }, 100);
            }
        }

        /**
         * Update image info display (title and format)
         */
        updateImageInfo(title = '', format = '') {
            // Extract basename from title
            let basename = title;
            let extension = 'JPG';
            
            if (title) {
                // Handle path: "folder/image.jpg" -> "image"
                basename = title.split('/').pop().split('.')[0];
                
                // Try to extract extension
                const parts = title.split('.');
                if (parts.length > 1) {
                    extension = parts.pop().toUpperCase();
                }
            }

            // Update title element
            if (this.uiElements.imageTitle) {
                this.uiElements.imageTitle.textContent = basename || 'Image';
            }

            // Update format element
            if (this.uiElements.imageFormat) {
                this.uiElements.imageFormat.textContent = format || `${extension} / Equirectangular`;
            }

            // Fire callback with image info
            if (this.options.callbacks.onImageInfoUpdate) {
                this.options.callbacks.onImageInfoUpdate({
                    title: basename,
                    format: format || `${extension} / Equirectangular`,
                    extension: extension
                });
            }
        }

        /**
         * Update projection button text and title
         */
        updateProjectionButton(type) {
            if (this.uiElements.switchProjectionButton) {
                this.uiElements.switchProjectionButton.title = type === 0 ? 'Gnomonic Projection' : 'Stereographic Projection';
                this.uiElements.switchProjectionButton.textContent = type === 0 ? '📐 Gnomonic' : '🌐 Stereographic';
            }

            // Fire callback
            if (this.options.callbacks.onProjectionChange) {
                this.options.callbacks.onProjectionChange(type);
            }
        }

        /**
         * Toggle fullscreen mode
         */
        toggleFullscreen() {
            if (!document.fullscreenElement) {
                // Enter fullscreen
                const elem = document.documentElement;
                if (elem.requestFullscreen) {
                    elem.requestFullscreen();
                } else if (elem.webkitRequestFullscreen) {
                    elem.webkitRequestFullscreen();
                } else if (elem.mozRequestFullScreen) {
                    elem.mozRequestFullScreen();
                } else if (elem.msRequestFullscreen) {
                    elem.msRequestFullscreen();
                }
                this.showPanels(false);
            } else {
                // Exit fullscreen
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
                this.showPanels(true);
            }
        }

        /**
         * Handle fullscreen change event
         */
        handleFullscreenChange() {
            const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || 
                                    document.mozFullScreenElement || document.msFullscreenElement);
            
            if (!isFullscreen) {
                this.showPanels(true);
            }

            // Fire callback
            if (this.options.callbacks.onFullscreenChange) {
                this.options.callbacks.onFullscreenChange(isFullscreen);
            }
        }

        /**
         * Show/hide UI panels
         */
        showPanels(show) {
            const panels = [
                this.uiElements.toolbarPanel,
                this.uiElements.infoPanel,
                this.uiElements.hamburgerMenu
            ];

            panels.forEach(panel => {
                if (panel) {
                    panel.style.display = show ? '' : 'none';
                }
            });

            // Fire callback
            if (this.options.callbacks.onPanelsToggle) {
                this.options.callbacks.onPanelsToggle(show);
            }
        }

        /**
         * Get current FOV configuration based on projection
         */
        getCurrentFOVConfig() {
            return this.projectionType === 0 ? this.config.fov_gnomonic : this.config.fov_stereographic;
        }

        /**
         * Clamp FOV to current projection limits
         */
        clampFOV(fov) {
            const currentConfig = this.getCurrentFOVConfig();
            return THREE.MathUtils.clamp(fov, currentConfig.min, currentConfig.max);
        }

        /**
         * Switch projection type
         */
        switchProjection(type) {
            this.projectionType = type;
            if (this.mesh && this.mesh.material && this.mesh.material.uniforms) {
                this.mesh.material.uniforms.projectionType.value = type;
            }

            // Clamp FOV to new projection limits
            this.targetState.fov = this.clampFOV(this.targetState.fov);
            this.state.fov = this.clampFOV(this.state.fov);

            // Update UI
            this.updateProjectionButton(type);
        }

        /**
         * Animation loop
         */
        animate() {
            this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
            this.update();
        }

        /**
         * Update loop
         */
        update() {
            const now = Date.now();
            const delta = (now - this.lastUpdate) / 1000;
            this.lastUpdate = now;

            // Auto-rotation
            if (!this.isUserInteracting && this.config.viewRotation.autoRotate) {
                this.targetState.lon -= this.config.viewRotation.autoRotationRate * this.state.azimuthSign * delta;
            }

            // Clamp latitude
            this.targetState.lat = THREE.MathUtils.clamp(this.targetState.lat, -90, 90);

            // Smooth interpolation
            this.state.lon += (this.targetState.lon - this.state.lon) / (this.config.viewRotation.smoothness * delta);
            this.state.lat += (this.targetState.lat - this.state.lat) / (this.config.viewRotation.smoothness * delta);
            this.state.fov += (this.targetState.fov - this.state.fov) / (this.config.zoom.smoothing * delta);

            // Clamp FOV
            this.state.fov = this.clampFOV(this.state.fov);

            // Update shader uniforms
            if (this.mesh && this.mesh.material && this.mesh.material.uniforms) {
                this.mesh.material.uniforms.lon.value = THREE.MathUtils.degToRad(this.state.lon);
                this.mesh.material.uniforms.lat.value = THREE.MathUtils.degToRad(this.state.lat);
                this.mesh.material.uniforms.fov.value = this.state.fov;
                this.mesh.material.uniforms.aspect.value = this.aspect;
            }

            // Render
            this.renderer.render(this.scene, this.camera);
        }

        // ============================================================================
        // RESOLUTION MANAGEMENT (v3.0)
        // ============================================================================

        /**
         * Select optimal resolution based on device, bandwidth, and user preference
         */
        selectOptimalResolution(resolutions) {
            if (!resolutions || resolutions.length === 0) {
                return null;
            }

            // User has manual selection?
            if (this.userPreferredResolution) {
                const preferred = resolutions.find(r => r.id === this.userPreferredResolution);
                if (preferred) return preferred;
            }

            // Auto-adaptive logic
            if (this.autoAdaptiveLoading) {
                // Check network connection if available
                const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
                if (connection) {
                    // Slow connection - use low bandwidth
                    if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                        const lowRes = resolutions.find(r => r.bandwidth === 'low');
                        if (lowRes) return lowRes;
                    }
                    // 3G - medium bandwidth
                    else if (connection.effectiveType === '3g') {
                        const medRes = resolutions.find(r => r.bandwidth === 'medium');
                        if (medRes) return medRes;
                    }
                    // 4G+ and high downlink - high bandwidth
                    else if (connection.effectiveType === '4g' && connection.downlink > 5) {
                        const highRes = resolutions.find(r => r.bandwidth === 'high');
                        if (highRes) return highRes;
                    }
                }

                // Check device capabilities
                const pixelRatio = window.devicePixelRatio || 1;
                const viewportWidth = window.innerWidth;

                // High DPI display or large viewport - prefer high resolution
                if (pixelRatio >= 2 || viewportWidth > 2560) {
                    const highRes = resolutions.find(r => r.id === '8k' || r.width >= 8192);
                    if (highRes) return highRes;
                }
                
                // Standard desktop - prefer 4K
                if (viewportWidth >= 1920) {
                    const medRes = resolutions.find(r => r.id === '4k' || r.width >= 4096);
                    if (medRes) return medRes;
                }
                
                // Mobile or small viewport - prefer 2K
                if (viewportWidth < 1920) {
                    const lowRes = resolutions.find(r => r.id === '2k' || r.width <= 2048);
                    if (lowRes) return lowRes;
                }
            }

            // Fallback to default resolution
            const defaultRes = resolutions.find(r => r.default);
            if (defaultRes) return defaultRes;

            // Ultimate fallback - middle resolution
            return resolutions[Math.floor(resolutions.length / 2)];
        }

        /**
         * Load image with specific resolution
         */
        loadImageWithResolution(imageData, resolution) {
            if (!imageData || !resolution) {
                console.error('Invalid image data or resolution');
                return;
            }

            this.currentImageData = imageData;
            this.currentResolution = resolution;
            this.availableResolutions = imageData.resolutions || [];

            // Build full path
            const imagePath = this.options.baseUrl + resolution.path;

            // Show loading UI
            this.showLoading();
            this.fadeOutCurrentImage();

            // Load the texture
            const loader = new THREE.TextureLoader();
            loader.load(
                imagePath,
                (texture) => {
                    // Configure texture
                    texture.generateMipmaps = true;
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    texture.repeat.x = -1;

                    const internalFormat = texture.format === THREE.RGBAFormat ? THREE.RGBA8 : THREE.RGB8;
                    texture.internalFormat = internalFormat;

                    // Create shader material
                    const material = new THREE.ShaderMaterial({
                        uniforms: {
                            equirectangularMap: { value: texture },
                            lon: { value: THREE.MathUtils.degToRad(this.state.lon) },
                            lat: { value: THREE.MathUtils.degToRad(this.state.lat) },
                            fov: { value: this.state.fov },
                            aspect: { value: this.aspect },
                            projectionType: { value: this.projectionType }
                        },
                        vertexShader: this.getVertexShader(),
                        fragmentShader: this.getFragmentShader()
                    });

                    // Update mesh
                    if (this.mesh.material) {
                        this.mesh.material.dispose();
                    }
                    this.mesh.material = material;

                    // Update UI
                    this.updateImageInfo(imageData.name, `${resolution.label} / Equirectangular`);
                    this.hideLoading();
                    this.fadeInNewImage();

                    // Fire callbacks
                    if (this.options.callbacks.onImageLoad) {
                        this.options.callbacks.onImageLoad(imageData.name, resolution);
                    }
                    
                    // Update resolution selector UI if present
                    this.updateResolutionSelector();
                },
                undefined,
                (error) => {
                    console.error('Error loading image:', error);
                    this.hideLoading();
                    
                    if (this.options.callbacks.onImageError) {
                        this.options.callbacks.onImageError(error);
                    }
                }
            );
        }

        /**
         * Load image by ID with automatic resolution selection
         */
        loadImageById(imageId) {
            const imageData = this.findImageById(imageId);
            if (!imageData) {
                console.error(`Image not found with ID: ${imageId}`);
                return;
            }

            // Select optimal resolution
            const resolution = this.selectOptimalResolution(imageData.resolutions);
            if (!resolution) {
                console.error('No suitable resolution found');
                return;
            }

            this.loadImageWithResolution(imageData, resolution);
        }

        /**
         * Switch to a different resolution for current image
         */
        switchResolution(resolutionId) {
            if (!this.currentImageData) {
                console.warn('No image currently loaded');
                return;
            }

            const resolution = this.currentImageData.resolutions.find(r => r.id === resolutionId);
            if (!resolution) {
                console.error(`Resolution ${resolutionId} not found`);
                return;
            }

            this.userPreferredResolution = resolutionId;
            this.loadImageWithResolution(this.currentImageData, resolution);
        }

        /**
         * Find image data by ID in library
         */
        findImageById(imageId) {
            if (!this.libraryData || !this.libraryData._categories) {
                return null;
            }

            for (const category of Object.values(this.libraryData._categories)) {
                if (category.images) {
                    const image = category.images.find(img => img.id === imageId);
                    if (image) return image;
                }
            }

            return null;
        }

        /**
         * Load first image in library
         */
        loadFirstImage() {
            if (!this.libraryData || !this.libraryData._categories) {
                console.error('No library data available');
                return;
            }

            // Find first category with images
            for (const category of Object.values(this.libraryData._categories)) {
                if (category.images && category.images.length > 0) {
                    const firstImage = category.images[0];
                    this.loadImageById(firstImage.id);
                    return;
                }
            }

            console.error('No images found in library');
        }

        /**
         * Update resolution selector UI
         */
        updateResolutionSelector() {
            const selector = document.getElementById('resolution-selector');
            if (!selector || !this.availableResolutions.length) return;

            // Clear existing options
            selector.innerHTML = '';

            // Add options for each available resolution
            this.availableResolutions.forEach(res => {
                const option = document.createElement('option');
                option.value = res.id;
                option.textContent = `${res.label} (${this.formatFileSize(res.fileSize)})`;
                
                if (this.currentResolution && this.currentResolution.id === res.id) {
                    option.selected = true;
                }
                
                selector.appendChild(option);
            });

            // Show the selector
            selector.style.display = 'block';
        }

        /**
         * Format file size for display
         */
        formatFileSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }

        /**
         * Destroy viewer and cleanup
         */
        destroy() {
            // Cancel animation
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
            }

            // Clear intervals
            this.stopContinuousZoom();
            this.stopContinuousPan();

            // Remove event listeners
            window.removeEventListener('resize', this.onWindowResize.bind(this));
            document.removeEventListener('keydown', this.onKeyDown.bind(this));
            document.removeEventListener('keyup', this.onKeyUp.bind(this));
            document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
            window.removeEventListener('focus', this.handleFocus.bind(this));
            window.removeEventListener('blur', this.handleBlur.bind(this));

            // Dispose Three.js objects
            if (this.mesh && this.mesh.material) {
                this.mesh.material.dispose();
            }
            if (this.mesh && this.mesh.geometry) {
                this.mesh.geometry.dispose();
            }
            if (this.renderer) {
                this.renderer.dispose();
                if (this.elements.canvas && this.elements.canvas.parentNode) {
                    this.elements.canvas.parentNode.removeChild(this.elements.canvas);
                }
            }
        }

        /**
         * Get vertex shader
         */
        getVertexShader() {
            return `
                varying vec2 vUV;
                
                void main() {
                    vUV = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `;
        }

        /**
         * Get fragment shader
         */
        getFragmentShader() {
            return `
                const float PI = 3.1415926536;
                const float PI_2 = PI * 0.5;
                const float PI2 = PI * 2.0;

                uniform sampler2D equirectangularMap;
                uniform float lon;
                uniform float lat;
                uniform float fov;
                uniform float aspect;
                uniform int projectionType;
                varying vec2 vUV;

                vec4 sampleEquirectangular(sampler2D tex, vec2 uv) {
                    vec2 texSize = vec2(textureSize(tex, 0));
                    uv.x = mod(uv.x, 1.0);
                    uv.y = clamp(uv.y, 0.0, 1.0);
                    vec2 texel = uv * texSize - 0.5;
                    ivec2 st = ivec2(floor(texel));
                    vec2 t = fract(texel);
                    st.x = (st.x + int(texSize.x)) % int(texSize.x);
                    st.y = clamp(st.y, 0, int(texSize.y) - 1);
                    vec4 tx0y0 = texelFetch(tex, st, 0);
                    vec4 tx1y0 = texelFetch(tex, ivec2((st.x + 1) % int(texSize.x), st.y), 0);
                    vec4 tx0y1 = texelFetch(tex, ivec2(st.x, min(st.y + 1, int(texSize.y) - 1)), 0);
                    vec4 tx1y1 = texelFetch(tex, ivec2((st.x + 1) % int(texSize.x), min(st.y + 1, int(texSize.y) - 1)), 0);
                    vec4 tx_y0 = mix(tx0y0, tx1y0, t.x);
                    vec4 tx_y1 = mix(tx0y1, tx1y1, t.x);
                    return mix(tx_y0, tx_y1, t.y);
                }

                vec2 gnomonicProjection(in vec2 screenCoord, in vec2 centralPoint, in float fovRadians) {
                    vec2 cp = (centralPoint * 2.0 - 1.0) * vec2(PI, PI_2);
                    float tanHalfFov = tan(fovRadians * 0.5);
                    vec2 scaledCoord = (screenCoord * 2.0 - 1.0) * vec2(aspect * tanHalfFov, tanHalfFov);
                    float x = scaledCoord.x;
                    float y = scaledCoord.y;
                    float rou = sqrt(x * x + y * y);
                    float c = atan(rou);
                    float sin_c = sin(c), cos_c = cos(c);
                    float lat = asin(cos_c * sin(cp.y) + (y * sin_c * cos(cp.y)) / max(rou, 1e-6));
                    float lon = cp.x + atan(x * sin_c, rou * cos(cp.y) * cos_c - y * sin(cp.y) * sin_c);
                    if (abs(lat) > 0.499 * PI) {
                        lon = cp.x;
                    }
                    lat = (lat / PI_2 + 1.0) * 0.5;
                    lon = mod(lon, PI2) / PI2;
                    return vec2(lon, lat);
                }

                vec2 stereographicProjection(in vec2 screenCoord, in vec2 centralPoint, in float fovRadians) {
                    vec2 cp = centralPoint * vec2(PI2, PI) - vec2(PI, PI_2);
                    float scale = tan(fovRadians * 0.25);
                    vec2 sp = (screenCoord - 0.5) * 2.0 * vec2(aspect, 1.0) * scale;
                    float rho = length(sp);
                    float c = 2.0 * atan(rho);
                    float sin_c = sin(c);
                    float cos_c = cos(c);
                    float lat = asin(cos_c * sin(cp.y) + (sp.y * sin_c * cos(cp.y)) / max(rho, 1e-6));
                    float lon = cp.x + atan(sp.x * sin_c, rho * cos(cp.y) * cos_c - sp.y * sin(cp.y) * sin_c);
                    lat = (lat / PI + 0.5);
                    lon = mod(lon / PI2, 1.0);
                    return vec2(lon, lat);
                }

                vec4 sampleWithAA(vec2 uv, vec2 centralPoint, float fovRadians) {
                    const float AA_SCALE = 0.5 / 2048.0;
                    vec4 color = vec4(0.0);
                    for (int i = 0; i < 4; i++) {
                        for (int j = 0; j < 4; j++) {
                            vec2 offset = vec2(float(i), float(j)) * AA_SCALE;
                            vec2 coord;
                            if (projectionType == 0) {
                                coord = gnomonicProjection(uv + offset, centralPoint, fovRadians);
                            } else {
                                coord = stereographicProjection(uv + offset, centralPoint, fovRadians);
                            }
                            color += sampleEquirectangular(equirectangularMap, coord);
                        }
                    }
                    return color * 0.0625;
                }

                void main() {
                    vec2 centralPoint = vec2(lon / PI2, (lat + PI_2) / PI);
                    float fovRadians = radians(fov);
                    vec2 coord;
                    if (projectionType == 0) {
                        coord = gnomonicProjection(vUV, centralPoint, fovRadians);
                    } else {
                        coord = stereographicProjection(vUV, centralPoint, fovRadians);
                    }
                    vec4 color = sampleWithAA(vUV, centralPoint, fovRadians);
                    float poleTransition = smoothstep(0.99, 1.0, abs(2.0 * coord.y - 1.0));
                    if (poleTransition > 0.0) {
                        vec4 poleColor;
                        if (coord.y > 0.5) {
                            poleColor = sampleEquirectangular(equirectangularMap, vec2(coord.x, 0.9999));
                        } else {
                            poleColor = sampleEquirectangular(equirectangularMap, vec2(coord.x, 0.0001));
                        }
                        color = mix(color, poleColor, poleTransition);
                    }
                    gl_FragColor = color;
                }
            `;
        }
    }

    // Export to window
    window.Phong360Viewer = Phong360Viewer;

})(window);

