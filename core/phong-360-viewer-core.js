/**
 * Phong 360 Viewer Core - Ultra-Lightweight Layer 1
 * 
 * Pure 360° image rendering with controls. No library management, no multi-image support.
 * Just load ONE image and view it. Perfect for embedding anywhere.
 * 
 * @version 3.0.0-core
 * @author Phong
 * @license MIT
 * @size ~30KB minified
 */

(function(window) {
    'use strict';

    /**
     * Phong360ViewerCore - Ultra-lightweight single image viewer
     * 
     * @class
     * @param {Object} options - Configuration options
     * @param {string} options.containerId - ID of the container element
     * @param {string} [options.imageUrl] - URL of single image to load
     * @param {number} [options.width=4096] - Image width
     * @param {number} [options.height=2048] - Image height
     * @param {Object} [options.config] - Viewer configuration
     */
    class Phong360ViewerCore {
        constructor(options = {}) {
            // Validate Three.js dependency
            if (typeof THREE === 'undefined') {
                throw new Error('Phong360ViewerCore requires Three.js. Please load Three.js before initializing the viewer.');
            }

            // Core configuration
            this.options = Object.assign({
                containerId: 'container',
                imageUrl: null,
                width: 4096,
                height: 2048,
                config: this.getDefaultConfig()
            }, options);

            // Merge config
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

            // Container reference
            this.container = null;

            // Interaction state
            this.isUserInteracting = false;
            this.isPointerDown = false;
            this.pointerStartX = 0;
            this.pointerStartY = 0;
            this.lastPointerX = 0;
            this.lastPointerY = 0;
            this.onPointerDownLon = 0;
            this.onPointerDownLat = 0;

            // Touch interaction
            this.lastTouchDistance = 0;
            this.isTouching = false;

            // Keyboard interaction
            this.activeKeys = {
                zoomIn: false,
                zoomOut: false,
                panLeft: false,
                panRight: false,
                panUp: false,
                panDown: false
            };
            this.zoomInterval = null;
            this.panInterval = null;

            // Aspect ratio and projection
            this.aspect = 1.0;
            this.projectionType = 1; // 0 = gnomonic, 1 = stereographic

            // Animation
            this.lastUpdate = Date.now();
            this.animationFrameId = null;
            this.isTabVisible = true;

            // Initialize
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
                    rate: 0.06,
                    rateIncremental: 3
                },
                viewRotation: {
                    initAzimuth: 0,
                    initAltitude: 0,
                    autoRotate: false,
                    autoRotationRate: 0.5
                },
                interaction: {
                    sensitivity: 0.25,
                    smoothingFactor: 0.08
                }
            };
        }

        /**
         * Initialize viewer
         */
        init() {
            this.setupContainer();
            this.setupScene();
            this.setupEventListeners();
            this.animate();

            // Load initial image if provided
            if (this.options.imageUrl) {
                this.loadImage(this.options.imageUrl, this.options.width, this.options.height);
            }
        }

        /**
         * Setup container
         */
        setupContainer() {
            this.container = document.getElementById(this.options.containerId);
            if (!this.container) {
                throw new Error(`Container element with ID "${this.options.containerId}" not found.`);
            }

            // Ensure container has proper styling
            if (!this.container.style.position || this.container.style.position === 'static') {
                this.container.style.position = 'relative';
            }
        }

        /**
         * Setup Three.js scene
         */
        setupScene() {
            // Scene
            this.scene = new THREE.Scene();

            // Camera
            this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
            this.camera.position.z = 1;

            // Renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.container.appendChild(this.renderer.domElement);

            // Full-screen quad
            const geometry = new THREE.PlaneGeometry(2, 2);
            this.mesh = new THREE.Mesh(geometry);
            this.scene.add(this.mesh);

            // Calculate aspect ratio
            this.aspect = this.container.clientWidth / this.container.clientHeight;
        }

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            // Window resize
            window.addEventListener('resize', this.onWindowResize.bind(this));

            // Mouse/pointer events
            document.addEventListener('pointerdown', this.onPointerDown.bind(this));
            document.addEventListener('pointermove', this.onPointerMove.bind(this));
            document.addEventListener('pointerup', this.onPointerUp.bind(this));
            document.addEventListener('pointercancel', this.onPointerUp.bind(this));

            // Mouse wheel (non-passive to allow preventDefault)
            document.addEventListener('wheel', this.onDocumentMouseWheel.bind(this), { passive: false });

            // Touch events (non-passive to allow preventDefault)
            this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
            this.container.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
            this.container.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });

            // Keyboard
            document.addEventListener('keydown', this.onKeyDown.bind(this));
            document.addEventListener('keyup', this.onKeyUp.bind(this));

            // Tab visibility
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
            window.addEventListener('focus', this.handleFocus.bind(this));
            window.addEventListener('blur', this.handleBlur.bind(this));
        }

        /**
         * Load a single image
         * @param {string} url - Image URL
         * @param {number} width - Image width
         * @param {number} height - Image height
         */
        loadImage(url, width = 4096, height = 2048) {
            const loader = new THREE.TextureLoader();
            
            loader.load(
                url,
                (texture) => {
                    this.applyTexture(texture);
                },
                undefined,
                (error) => {
                    console.error('Error loading image:', error);
                }
            );
        }

        /**
         * Apply texture to mesh
         */
        applyTexture(texture) {
            // Configure texture
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.repeat.x = -1;

            // Don't set internalFormat for Three.js r128 - it causes errors
            // const internalFormat = texture.format === THREE.RGBAFormat ? THREE.RGBA8 : THREE.RGB8;
            // texture.internalFormat = internalFormat;

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
        }

        /**
         * Get current FOV config based on projection
         */
        getCurrentFOVConfig() {
            return this.projectionType === 0 ? this.config.fov_gnomonic : this.config.fov_stereographic;
        }

        /**
         * Clamp FOV to limits
         */
        clampFOV(fov) {
            const fovConfig = this.getCurrentFOVConfig();
            return Math.max(fovConfig.min, Math.min(fovConfig.max, fov));
        }

        /**
         * Reset view to initial state
         */
        resetView() {
            this.targetState.lat = this.config.viewRotation.initAltitude;
            this.targetState.lon = this.config.viewRotation.initAzimuth;
            this.targetState.fov = this.config.fov.initTarget;
        }

        // ============================================================================
        // INTERACTION HANDLERS
        // ============================================================================

        onPointerDown(event) {
            this.isPointerDown = true;
            this.isUserInteracting = true;
            this.pointerStartX = event.clientX;
            this.pointerStartY = event.clientY;
            this.lastPointerX = event.clientX;
            this.lastPointerY = event.clientY;
            this.onPointerDownLon = this.targetState.lon;
            this.onPointerDownLat = this.targetState.lat;
        }

        onPointerMove(event) {
            if (!this.isPointerDown) return;

            const sensitivity = this.config.interaction.sensitivity;
            this.targetState.lon = (this.pointerStartX - event.clientX) * sensitivity + this.onPointerDownLon;
            this.targetState.lat = (event.clientY - this.pointerStartY) * sensitivity + this.onPointerDownLat;
            this.targetState.lat = Math.max(-85, Math.min(85, this.targetState.lat));
        }

        onPointerUp(event) {
            this.isPointerDown = false;
            this.isUserInteracting = false;
        }

        onDocumentMouseWheel(event) {
            event.preventDefault();
            const fovConfig = this.getCurrentFOVConfig();
            const delta = event.deltaY * this.config.zoom.rate;
            this.targetState.fov = this.clampFOV(this.targetState.fov + delta);
        }

        onKeyDown(event) {
            switch(event.key) {
                case 'ArrowLeft':
                    this.activeKeys.panLeft = true;
                    this.startContinuousPan();
                    break;
                case 'ArrowRight':
                    this.activeKeys.panRight = true;
                    this.startContinuousPan();
                    break;
                case 'ArrowUp':
                    this.activeKeys.panUp = true;
                    this.startContinuousPan();
                    break;
                case 'ArrowDown':
                    this.activeKeys.panDown = true;
                    this.startContinuousPan();
                    break;
                case '+':
                case '=':
                    this.activeKeys.zoomIn = true;
                    this.startContinuousZoom('in');
                    break;
                case '-':
                case '_':
                    this.activeKeys.zoomOut = true;
                    this.startContinuousZoom('out');
                    break;
                case 'r':
                case 'R':
                    this.resetView();
                    break;
            }
        }

        onKeyUp(event) {
            switch(event.key) {
                case 'ArrowLeft':
                    this.activeKeys.panLeft = false;
                    this.stopContinuousPan();
                    break;
                case 'ArrowRight':
                    this.activeKeys.panRight = false;
                    this.stopContinuousPan();
                    break;
                case 'ArrowUp':
                    this.activeKeys.panUp = false;
                    this.stopContinuousPan();
                    break;
                case 'ArrowDown':
                    this.activeKeys.panDown = false;
                    this.stopContinuousPan();
                    break;
                case '+':
                case '=':
                    this.activeKeys.zoomIn = false;
                    this.stopContinuousZoom();
                    break;
                case '-':
                case '_':
                    this.activeKeys.zoomOut = false;
                    this.stopContinuousZoom();
                    break;
            }
        }

        startContinuousZoom(direction) {
            if (this.zoomInterval) return;
            
            this.zoomInterval = setInterval(() => {
                const delta = direction === 'in' ? -this.config.zoom.rateIncremental : this.config.zoom.rateIncremental;
                this.targetState.fov = this.clampFOV(this.targetState.fov + delta);
            }, 16);
        }

        stopContinuousZoom() {
            if (!this.activeKeys.zoomIn && !this.activeKeys.zoomOut) {
                clearInterval(this.zoomInterval);
                this.zoomInterval = null;
            }
        }

        startContinuousPan() {
            if (this.panInterval) return;
            
            this.panInterval = setInterval(() => {
                const panSpeed = 2;
                if (this.activeKeys.panLeft) this.targetState.lon -= panSpeed;
                if (this.activeKeys.panRight) this.targetState.lon += panSpeed;
                if (this.activeKeys.panUp) this.targetState.lat = Math.min(85, this.targetState.lat + panSpeed);
                if (this.activeKeys.panDown) this.targetState.lat = Math.max(-85, this.targetState.lat - panSpeed);
            }, 16);
        }

        stopContinuousPan() {
            if (!this.activeKeys.panLeft && !this.activeKeys.panRight && 
                !this.activeKeys.panUp && !this.activeKeys.panDown) {
                clearInterval(this.panInterval);
                this.panInterval = null;
            }
        }

        onTouchStart(event) {
            if (event.touches.length === 2) {
                this.lastTouchDistance = this.getPinchDistance(event);
                this.isTouching = true;
            }
        }

        onTouchMove(event) {
            if (event.touches.length === 2 && this.isTouching) {
                event.preventDefault();
                const currentDistance = this.getPinchDistance(event);
                const delta = (this.lastTouchDistance - currentDistance) * 0.5;
                this.targetState.fov = this.clampFOV(this.targetState.fov + delta);
                this.lastTouchDistance = currentDistance;
            }
        }

        onTouchEnd(event) {
            if (event.touches.length < 2) {
                this.isTouching = false;
                this.lastTouchDistance = 0;
            }
        }

        getPinchDistance(event) {
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }

        handleVisibilityChange() {
            this.isTabVisible = !document.hidden;
        }

        handleFocus() {
            this.isTabVisible = true;
        }

        handleBlur() {
            this.isTabVisible = false;
        }

        onWindowResize() {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            
            this.aspect = width / height;
            this.renderer.setSize(width, height);
            
            if (this.mesh && this.mesh.material && this.mesh.material.uniforms) {
                this.mesh.material.uniforms.aspect.value = this.aspect;
            }
        }

        // ============================================================================
        // ANIMATION LOOP
        // ============================================================================

        animate() {
            this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
            
            if (!this.isTabVisible) return;
            
            this.update();
            this.renderer.render(this.scene, this.camera);
        }

        update() {
            const now = Date.now();
            const dt = (now - this.lastUpdate) / 1000;
            this.lastUpdate = now;

            // Auto-rotation
            if (this.config.viewRotation.autoRotate && !this.isUserInteracting) {
                this.targetState.lon += this.config.viewRotation.autoRotationRate * dt * 10;
            }

            // Smooth interpolation
            const smoothing = this.config.interaction.smoothingFactor;
            this.state.lon += (this.targetState.lon - this.state.lon) * smoothing;
            this.state.lat += (this.targetState.lat - this.state.lat) * smoothing;
            this.state.fov += (this.targetState.fov - this.state.fov) * smoothing;

            // Update phi/theta
            this.state.phi = THREE.MathUtils.degToRad(90 - this.state.lat);
            this.state.theta = THREE.MathUtils.degToRad(this.state.lon);

            // Update shader uniforms
            if (this.mesh && this.mesh.material && this.mesh.material.uniforms) {
                this.mesh.material.uniforms.lon.value = THREE.MathUtils.degToRad(this.state.lon);
                this.mesh.material.uniforms.lat.value = THREE.MathUtils.degToRad(this.state.lat);
                this.mesh.material.uniforms.fov.value = this.state.fov;
                this.mesh.material.uniforms.aspect.value = this.aspect;
            }
        }

        // ============================================================================
        // SHADERS
        // ============================================================================

        getVertexShader() {
            return `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `;
        }

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

                varying vec2 vUv;

                vec2 equirectangularUV(vec3 dir) {
                    float u = 0.5 + atan(dir.z, dir.x) / PI2;
                    float v = 0.5 - asin(dir.y) / PI;
                    return vec2(u, v);
                }

                vec3 stereographicToCartesian(vec2 st, float fovRad) {
                    float r = length(st);
                    if (r > 1.0) return vec3(0.0);
                    
                    float theta = atan(st.y, st.x);
                    float rho = 2.0 * atan(r * tan(fovRad * 0.25));
                    
                    float sinRho = sin(rho);
                    return vec3(
                        sinRho * cos(theta),
                        sinRho * sin(theta),
                        cos(rho)
                    );
                }

                vec3 gnomonicToCartesian(vec2 st, float fovRad) {
                    float scale = tan(fovRad * 0.5);
                    vec3 dir = normalize(vec3(st.x * scale, st.y * scale, 1.0));
                    return dir;
                }

                mat3 rotationMatrix(float lon, float lat) {
                    float cosLon = cos(lon);
                    float sinLon = sin(lon);
                    float cosLat = cos(lat);
                    float sinLat = sin(lat);
                    
                    return mat3(
                        cosLon, 0.0, -sinLon,
                        sinLat * sinLon, cosLat, sinLat * cosLon,
                        cosLat * sinLon, -sinLat, cosLat * cosLon
                    );
                }

                void main() {
                    vec2 st = (vUv - 0.5) * 2.0;
                    st.x *= aspect;
                    
                    float fovRad = fov * PI / 180.0;
                    
                    vec3 dir;
                    if (projectionType == 0) {
                        dir = gnomonicToCartesian(st, fovRad);
                    } else {
                        dir = stereographicToCartesian(st, fovRad);
                    }
                    
                    if (length(dir) < 0.001) {
                        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                        return;
                    }
                    
                    mat3 rot = rotationMatrix(lon, lat);
                    vec3 rotatedDir = rot * dir;
                    
                    vec2 uv = equirectangularUV(rotatedDir);
                    gl_FragColor = texture2D(equirectangularMap, uv);
                }
            `;
        }

        // ============================================================================
        // CLEANUP
        // ============================================================================

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

            // Dispose Three.js resources
            if (this.mesh) {
                if (this.mesh.material) {
                    if (this.mesh.material.uniforms && this.mesh.material.uniforms.equirectangularMap.value) {
                        this.mesh.material.uniforms.equirectangularMap.value.dispose();
                    }
                    this.mesh.material.dispose();
                }
                if (this.mesh.geometry) {
                    this.mesh.geometry.dispose();
                }
            }

            if (this.renderer) {
                this.renderer.dispose();
                if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                    this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
                }
            }
        }
    }

    // Export
    window.Phong360ViewerCore = Phong360ViewerCore;

})(window);

