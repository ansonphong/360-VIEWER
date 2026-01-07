# 360 Viewer Loading Architecture Plan

## Overview
Implement a smooth, professional loading system with fade transitions and visual feedback.

## Architecture Goals
1. **Never show white background** - Always black with optional spinner
2. **Smooth transitions** - Fade in/out between images
3. **Visual feedback** - Loading spinner during image loads
4. **Proper sequence** - Clean unload → load → display pattern

## State Management

### Loading States
- `INITIAL_LOAD` - First page load, show black preloader
- `IDLE` - Image displayed, ready for interaction
- `TRANSITIONING_OUT` - Fading out current image
- `LOADING` - Loading new image (show spinner)
- `TRANSITIONING_IN` - Fading in new image

### Visual Layers (z-index from back to front)
1. **Background**: Black body/html (z-index: 0)
2. **Canvas Container**: Three.js viewer (z-index: 2)
3. **Loading Overlay**: Black + spinner (z-index: 10)
4. **UI Elements**: Menu, buttons, info panel (z-index: 100+)

## Transition Sequence

### Initial Page Load
```
1. Show black preloader overlay (z-index: 10)
2. Initialize Three.js with black scene
3. Load first image from library
4. Wait for texture to load completely
5. Fade in canvas (fade out preloader) - 500ms
```

### Image Change (User clicks new image)
```
1. User clicks image → STATE: TRANSITIONING_OUT
2. Fade out canvas to black - 300ms
   - Reduce canvas opacity: 1 → 0
   
3. Show loading overlay with spinner → STATE: LOADING
   - Black background + animated spinner
   - Overlay opacity: 0 → 1 (200ms)
   
4. Unload old image
   - Dispose old texture/materials
   - Clear Three.js memory
   
5. Load new image
   - THREE.TextureLoader.load()
   - Wait for onLoad callback
   
6. Apply new texture to scene → STATE: TRANSITIONING_IN
   - Update shader uniforms
   - Reset camera position if needed
   
7. Hide loading overlay + Fade in canvas - 500ms
   - Loading overlay opacity: 1 → 0 (200ms)
   - Canvas opacity: 0 → 1 (500ms fade-in)
   
8. Complete → STATE: IDLE
```

## Implementation Strategy

### Files to Modify

#### 1. `index.html`
- Add loading overlay with spinner HTML
- Update initialization code
- Manage loading states

#### 2. `styles.css`
- Add spinner animation styles
- Add fade transition classes
- Ensure proper z-index layering

#### 3. `core/phong-360-viewer-core.js`
- Add `setOpacity()` method for canvas fade
- Add texture disposal method
- Add loading callbacks (onLoadStart, onLoadComplete)
- Emit events for state changes

#### 4. `extensions/phong-360-multi-image.js`
- Implement transition sequence
- Call fade out before switching
- Call fade in after loading
- Manage loading states

#### 5. `extensions/phong-360-library-ui.js`
- Trigger transition sequence on image click
- Update UI to prevent clicks during transitions
- Show loading state in selected item

## Technical Details

### Canvas Opacity Control
```javascript
// In core: Add method to control canvas opacity
setCanvasOpacity(opacity, duration = 300) {
    const canvas = this.renderer.domElement;
    canvas.style.transition = `opacity ${duration}ms ease-in-out`;
    canvas.style.opacity = opacity;
}
```

### Loading Overlay Structure
```html
<div id="loading-overlay" style="z-index: 10;">
    <div class="spinner"></div>
    <div class="loading-text">Loading...</div>
</div>
```

### Transition Manager
```javascript
class TransitionManager {
    constructor(core, multiViewer) {
        this.state = 'IDLE';
        this.core = core;
        this.multiViewer = multiViewer;
    }
    
    async switchImage(imageId) {
        if (this.state !== 'IDLE') return; // Prevent double-clicks
        
        this.state = 'TRANSITIONING_OUT';
        await this.fadeOut(); // 300ms
        
        this.state = 'LOADING';
        this.showSpinner();
        await this.loadImage(imageId);
        
        this.state = 'TRANSITIONING_IN';
        this.hideSpinner();
        await this.fadeIn(); // 500ms
        
        this.state = 'IDLE';
    }
    
    fadeOut() {
        return new Promise(resolve => {
            this.core.setCanvasOpacity(0, 300);
            setTimeout(resolve, 300);
        });
    }
    
    fadeIn() {
        return new Promise(resolve => {
            this.core.setCanvasOpacity(1, 500);
            setTimeout(resolve, 500);
        });
    }
    
    showSpinner() {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';
    }
    
    hideSpinner() {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 200);
    }
}
```

### CSS Spinner Animation
```css
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.spinner {
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-top: 4px solid rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
}
```

## Timing Recommendations

- **Fade Out**: 300ms (quick exit)
- **Fade In**: 500ms (smooth entrance)
- **Spinner Show**: 200ms (subtle appearance)
- **Spinner Hide**: 200ms (quick disappear)
- **Total Transition Time**: ~1000ms + image load time

## Memory Management

### Texture Disposal
```javascript
disposeCurrentTexture() {
    if (this.mesh && this.mesh.material) {
        if (this.mesh.material.uniforms.equirectangularMap.value) {
            this.mesh.material.uniforms.equirectangularMap.value.dispose();
        }
        this.mesh.material.dispose();
    }
    // Force garbage collection hint
    if (this.renderer) {
        this.renderer.renderLists.dispose();
    }
}
```

## User Experience Enhancements

1. **Disable UI during transitions** - Prevent clicks on library items
2. **Show current selection** - Highlight selected image
3. **Preload thumbnails** - Library thumbnails load progressively
4. **Progressive enhancement** - Show low-res first, then high-res
5. **Error handling** - Graceful fallback if image fails to load

## Error Handling

```javascript
async switchImage(imageId) {
    try {
        await this.fadeOut();
        this.showSpinner();
        await this.loadImage(imageId);
        this.hideSpinner();
        await this.fadeIn();
    } catch (error) {
        console.error('Failed to load image:', error);
        // Show error message
        // Fade back to previous image or placeholder
        this.hideSpinner();
        this.showError('Failed to load image');
    }
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (30 min)
1. Add canvas opacity control to core
2. Add loading overlay HTML/CSS
3. Add spinner animation

### Phase 2: Transition Manager (45 min)
1. Create transition state machine
2. Implement fade in/out methods
3. Add spinner show/hide logic
4. Test transition sequence

### Phase 3: Integration (30 min)
1. Integrate with multi-image manager
2. Integrate with library UI
3. Disable UI during transitions
4. Add loading state indicators

### Phase 4: Polish (15 min)
1. Fine-tune timing
2. Add error handling
3. Test edge cases
4. Memory leak testing

## Expected Results

✅ No white flashes during any transition
✅ Smooth, professional fade effects
✅ Clear visual feedback during loading
✅ Clean memory management
✅ Responsive UI that prevents accidental double-clicks
✅ Beautiful user experience comparable to high-end gallery apps

## Testing Checklist

- [ ] Initial page load shows no white flash
- [ ] First image fades in smoothly
- [ ] Clicking new image fades out current
- [ ] Spinner shows during loading
- [ ] New image fades in after load
- [ ] Fast clicks don't break the system
- [ ] Slow network: spinner visible longer
- [ ] Memory usage stays stable after 50+ image switches
- [ ] Error states handled gracefully
- [ ] Works on mobile/tablet/desktop

