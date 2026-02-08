/**
 * Phong 360 Multi-Image Manager - Layer 2
 *
 * Wraps the core viewer to add multi-image and resolution management.
 * Handles adaptive resolution selection based on device and bandwidth.
 *
 * @version 4.0.0
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
        this.callbacks = Object.assign({
            onImageLoad: null,
            onImageError: null,
            onResolutionChange: null,
            onLoadStart: null,
            onLoadComplete: null
        }, options.callbacks || {});
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
            return;
        }

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

    loadImageWithResolution(imageData, resolution) {
        if (!imageData || !resolution) {
            console.error('Invalid image data or resolution');
            return;
        }

        this.currentImageId = imageData.id;
        this.currentImageData = imageData;
        this.currentResolution = resolution;

        if (this.callbacks.onLoadStart) {
            this.callbacks.onLoadStart();
        }

        const imagePath = this.baseUrl + resolution.path;
        this.core.loadImage(imagePath, resolution.width, resolution.height);

        // Pass full image data object through callback
        if (this.callbacks.onImageLoad) {
            this.callbacks.onImageLoad(imageData, resolution);
        }
        if (this.callbacks.onLoadComplete) {
            this.callbacks.onLoadComplete();
        }
    }

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
            const preferred = resolutions.find(r => r.id === this.userPreferredResolution);
            if (preferred) return preferred;
        }

        const defaultRes = resolutions.find(r => r.default);
        const mobile2K = resolutions.find(r => r.id === '2k' || r.width <= 2048);

        const pixelRatio = window.devicePixelRatio || 1;
        const viewportWidth = window.innerWidth;

        if (this.adaptiveLoading) {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                    if (mobile2K) return mobile2K;
                }
            }

            if (pixelRatio >= 2.5 || viewportWidth > 3000) {
                const highRes = resolutions.find(r => r.id === '8k' || r.width >= 8192);
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
        const currentIndex = this.images.findIndex(img => img.id === this.currentImageId);
        if (currentIndex === -1 || currentIndex === this.images.length - 1) return;
        this.loadImageById(this.images[currentIndex + 1].id);
    }

    loadPreviousImage() {
        if (!this.currentImageId) {
            this.loadFirstImage();
            return;
        }
        const currentIndex = this.images.findIndex(img => img.id === this.currentImageId);
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
}

// Register globally for script-tag loading
if (typeof window !== 'undefined') {
    window.Phong360MultiImage = Phong360MultiImage;
}
