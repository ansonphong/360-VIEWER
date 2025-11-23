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
                    increment: 2,
                    smoothing: 6000
                },
                viewRotation: {
                    initAzimuth: 90,
                    initAltitude: 0,
                    autoRotate: true,
                    autoRotationRate: 1,
                    smoothness: 8000
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

            // Create shader material with uniforms in DEGREES (converted to radians in shader/update)
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    equirectangularMap: { value: texture },
                    lon: { value: this.state.lon },  // In degrees
                    lat: { value: this.state.lat },  // In degrees
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
            
            // Only render if mesh has material
            if (this.mesh && this.mesh.material) {
                this.renderer.render(this.scene, this.camera);
            }
        }

        update() {
            const now = Date.now();
            const delta = (now - this.lastUpdate) / 1000; // Delta in seconds
            this.lastUpdate = now;

            // Auto-rotation (matches original)
            if (this.config.viewRotation.autoRotate && !this.isUserInteracting) {
                this.targetState.lon = this.targetState.lon - (this.config.viewRotation.autoRotationRate * this.state.azimuthSign * delta);
            }

            // Clamp latitude
            const latRange = 90;
            this.targetState.lat = Math.max(-latRange, Math.min(latRange, this.targetState.lat));

            // Calculate target angles
            this.targetState.phi = THREE.MathUtils.degToRad(90 - this.targetState.lat);
            this.targetState.theta = THREE.MathUtils.degToRad(this.targetState.lon);

            // Smooth interpolation (matches original formula)
            this.state.theta += (this.targetState.theta - this.state.theta) / (this.config.viewRotation.smoothness * delta);
            this.state.phi += (this.targetState.phi - this.state.phi) / (this.config.viewRotation.smoothness * delta);
            this.state.fov += (this.targetState.fov - this.state.fov) / (this.config.zoom.smoothing * delta);

            this.state.lon += (this.targetState.lon - this.state.lon) / (this.config.viewRotation.smoothness * delta);
            this.state.lat += (this.targetState.lat - this.state.lat) / (this.config.viewRotation.smoothness * delta);

            // Ensure FOV stays within limits
            this.state.fov = this.clampFOV(this.state.fov);

            // Update shader uniforms (convert degrees to radians)
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
                varying vec2 vUV;
                void main() {
                    vUV = uv;
                    gl_Position = vec4(position, 1.0);
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
                uniform int projectionType; // 0 for gnomonic, 1 for stereographic
                varying vec2 vUV;

                // Sampling function with bilinear interpolation
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

                // Gnomonic projection function
                vec2 gnomonicProjection(in vec2 screenCoord, in vec2 centralPoint, in float fovRadians) {
                    vec2 cp = (centralPoint * 2.0 - 1.0) * vec2(PI, PI_2);
                    
                    // Calculate the tangent of half the FOV
                    float tanHalfFov = tan(fovRadians * 0.5);
                    
                    // Scale the screen coordinates based on FOV
                    vec2 scaledCoord = (screenCoord * 2.0 - 1.0) * vec2(aspect * tanHalfFov, tanHalfFov);
                    
                    float x = scaledCoord.x;
                    float y = scaledCoord.y;

                    float rou = sqrt(x * x + y * y);
                    float c = atan(rou);
                    float sin_c = sin(c), cos_c = cos(c);

                    float lat = asin(cos_c * sin(cp.y) + (y * sin_c * cos(cp.y)) / max(rou, 1e-6));
                    float lon = cp.x + atan(x * sin_c, rou * cos(cp.y) * cos_c - y * sin(cp.y) * sin_c);

                    // Improved pole handling
                    if (abs(lat) > 0.499 * PI) {
                        lon = cp.x;
                    }

                    lat = (lat / PI_2 + 1.0) * 0.5;
                    lon = mod(lon, PI2) / PI2;

                    return vec2(lon, lat);
                }

                vec2 stereographicProjection(in vec2 screenCoord, in vec2 centralPoint, in float fovRadians) {
                    vec2 cp = centralPoint * vec2(PI2, PI) - vec2(PI, PI_2);
                    
                    // Calculate the scale based on FOV
                    // We use tan(fovRadians * 0.25) instead of 1.0 / tan(fovRadians * 0.25)
                    // This inverts the behavior: higher FOV = zoomed out, lower FOV = zoomed in
                    float scale = tan(fovRadians * 0.25);  // Use quarter of FOV for stereographic
                    
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

                // Anti-aliasing function
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
                    
                    return color * 0.0625; // 1/16
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

                    // Pole handling
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

