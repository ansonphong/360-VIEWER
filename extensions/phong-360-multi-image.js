/**
 * Phong 360 Multi-Image Manager - Layer 2
 * 
 * Wraps the core viewer to add multi-image and resolution management.
 * Handles adaptive resolution selection based on device and bandwidth.
 * 
 * @version 3.0.0-multi
 * @author Phong
 * @license MIT
 * @size ~15KB minified
 */

(function(window) {
    'use strict';

    /**
     * Phong360MultiImage - Multi-image and resolution manager
     * 
     * @class
     * @param {Object} options - Configuration options
     * @param {Phong360ViewerCore} options.core - Core viewer instance
     * @param {Array} [options.images] - Array of image data
     * @param {string} [options.baseUrl=''] - Base URL for resolving paths
     * @param {boolean} [options.adaptiveLoading=true] - Enable adaptive resolution selection
     * @param {Object} [options.callbacks] - Event callbacks
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
            this.userPreferredResolution = null;

            // Callbacks
            this.callbacks = Object.assign({
                onImageLoad: null,          // (imageData, resolution) => {}
                onImageError: null,         // (error) => {}
                onResolutionChange: null,   // (resolution) => {}
                onLoadStart: null,          // () => {}
                onLoadComplete: null        // () => {}
            }, options.callbacks || {});
        }

        /**
         * Set images array
         */
        setImages(images) {
            this.images = images;
        }

        /**
         * Add single image
         */
        addImage(imageData) {
            this.images.push(imageData);
        }

        /**
         * Find image by ID
         */
        findImageById(id) {
            for (const image of this.images) {
                if (image.id === id) {
                    return image;
                }
            }
            return null;
        }

        /**
         * Get current image data
         */
        getCurrentImageData() {
            return this.currentImageData;
        }

        /**
         * Get available resolutions for current image
         */
        getAvailableResolutions() {
            if (!this.currentImageData || !this.currentImageData.resolutions) {
                return [];
            }
            return this.currentImageData.resolutions;
        }

        /**
         * Get current resolution
         */
        getCurrentResolution() {
            return this.currentResolution;
        }

        /**
         * Load image by ID
         */
        loadImageById(id) {
            const imageData = this.findImageById(id);
            if (!imageData) {
                console.error(`Image not found with ID: ${id}`);
                if (this.callbacks.onImageError) {
                    this.callbacks.onImageError(new Error(`Image not found: ${id}`));
                }
                return;
            }

            // Select optimal resolution
            const resolution = this.selectOptimalResolution(imageData.resolutions);
            if (!resolution) {
                console.error('No suitable resolution found');
                if (this.callbacks.onImageError) {
                    this.callbacks.onImageError(new Error('No suitable resolution found'));
                }
                return;
            }

            this.loadImageWithResolution(imageData, resolution);
        }

        /**
         * Load image with specific resolution
         */
        loadImageWithResolution(imageData, resolution) {
            if (!imageData || !resolution) {
                console.error('Invalid image data or resolution');
                return;
            }

            this.currentImageId = imageData.id;
            this.currentImageData = imageData;
            this.currentResolution = resolution;

            // Fire load start callback
            if (this.callbacks.onLoadStart) {
                this.callbacks.onLoadStart();
            }

            // Build full path
            const imagePath = this.baseUrl + resolution.path;

            // Load via core viewer
            this.core.loadImage(imagePath, resolution.width, resolution.height);

            // Fire callbacks
            if (this.callbacks.onImageLoad) {
                this.callbacks.onImageLoad(imageData, resolution);
            }
            if (this.callbacks.onLoadComplete) {
                this.callbacks.onLoadComplete();
            }
        }

        /**
         * Switch to different resolution for current image
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

            if (this.callbacks.onResolutionChange) {
                this.callbacks.onResolutionChange(resolution);
            }
        }

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
            if (this.adaptiveLoading) {
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
         * Load first image
         */
        loadFirstImage() {
            if (this.images.length === 0) {
                console.warn('No images available');
                return;
            }

            this.loadImageById(this.images[0].id);
        }

        /**
         * Load next image
         */
        loadNextImage() {
            if (!this.currentImageId) {
                this.loadFirstImage();
                return;
            }

            const currentIndex = this.images.findIndex(img => img.id === this.currentImageId);
            if (currentIndex === -1 || currentIndex === this.images.length - 1) {
                return; // No next image
            }

            this.loadImageById(this.images[currentIndex + 1].id);
        }

        /**
         * Load previous image
         */
        loadPreviousImage() {
            if (!this.currentImageId) {
                this.loadFirstImage();
                return;
            }

            const currentIndex = this.images.findIndex(img => img.id === this.currentImageId);
            if (currentIndex <= 0) {
                return; // No previous image
            }

            this.loadImageById(this.images[currentIndex - 1].id);
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
         * Get image count
         */
        getImageCount() {
            return this.images.length;
        }

        /**
         * Clear user preference
         */
        clearResolutionPreference() {
            this.userPreferredResolution = null;
        }
    }

    // Export
    window.Phong360MultiImage = Phong360MultiImage;

})(window);

