# 📚 Documentation Index

Welcome to the Phong 360 Viewer documentation! This guide will help you find the information you need.

---

## 🚀 Getting Started

**New to the viewer?** Start here:

1. **[Quick Start Guide](QUICKSTART.md)** - Get up and running in 5 minutes
   - Single image viewer
   - Multiple images with resolution switching
   - Full library with UI
   - WordPress integration
   - React integration

---

## 📖 Core Documentation

### [API Reference](API.md)
Complete API documentation for all three layers:
- **Layer 1**: `Phong360ViewerCore` - Single image viewer (30KB)
- **Layer 2**: `Phong360MultiImage` - Multi-image + resolution management (+15KB)
- **Layer 3**: `Phong360LibraryUI` - Full library UI (+20KB)

**Includes:**
- Constructor options
- Methods and properties
- Configuration reference
- Callbacks and events
- localStorage keys
- Error handling
- Performance tips

### [Library Format Specification](LIBRARY-FORMAT.md)
JSON format for image libraries:
- v3.0 format with semantic resolutions (8K/4K/2K)
- Image and resolution object structure
- Metadata fields
- Category organization
- Building libraries with Python script
- WordPress integration examples

---

## 🔧 Integration Guides

### [WordPress Integration Plan](WORDPRESS-INTEGRATION-PLAN.md)
Complete guide for adding 360° viewer to WordPress themes:
- **Why it's perfect for open source** (portability, modularity, best practices)
- Step-by-step WordPress integration
- Post meta and gallery type registration
- PHP helper functions
- Asset enqueuing
- Template examples
- CSS styling

**Includes:**
- Comparison vs competitors (Photo Sphere Viewer, Pannellum, Marzipano)
- Target audience analysis
- Success metrics and roadmap

### [Open Source Strategy](OPEN-SOURCE-READY.md)
Roadmap for open-source adoption and growth:
- Why this will gain widespread use
- Competitive advantages
- Target markets (WordPress, static sites, frameworks)
- Growth strategy with phases
- Timeline through 2025
- Success metrics
- Marketing plan
- Call to action for contributors

---

## 📋 Document Quick Reference

| Document | Purpose | Best For |
|----------|---------|----------|
| **[QUICKSTART.md](QUICKSTART.md)** | Step-by-step tutorials | Beginners, quick implementations |
| **[API.md](API.md)** | Complete API reference | Developers, advanced usage |
| **[LIBRARY-FORMAT.md](LIBRARY-FORMAT.md)** | Library JSON format | Building libraries, WordPress integration |
| **[WORDPRESS-INTEGRATION-PLAN.md](WORDPRESS-INTEGRATION-PLAN.md)** | WordPress integration | Theme developers, WordPress users |
| **[OPEN-SOURCE-READY.md](OPEN-SOURCE-READY.md)** | Growth strategy | Contributors, stakeholders |

---

## 🎯 Find What You Need

### "I want to embed a single 360° image on my website"
→ Go to [QUICKSTART.md](QUICKSTART.md) → Section 1

### "I need multiple images with quality options"
→ Go to [QUICKSTART.md](QUICKSTART.md) → Section 2

### "I want the full library UI with panels"
→ Go to [QUICKSTART.md](QUICKSTART.md) → Section 3

### "I'm integrating into WordPress"
→ Go to [WORDPRESS-INTEGRATION-PLAN.md](WORDPRESS-INTEGRATION-PLAN.md)

### "I'm using React/Vue/Angular"
→ Go to [QUICKSTART.md](QUICKSTART.md) → Section 5

### "I need to build an image library"
→ Go to [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md)

### "What methods and options are available?"
→ Go to [API.md](API.md)

### "Why should I use this over competitors?"
→ Go to [OPEN-SOURCE-READY.md](OPEN-SOURCE-READY.md) → Competitive Analysis

### "I want to contribute"
→ Go to [OPEN-SOURCE-READY.md](OPEN-SOURCE-READY.md) → Call to Action

---

## 💡 Common Use Cases

### Portfolio Websites
```javascript
const viewer = new Phong360ViewerCore({
    containerId: 'viewer',
    imageUrl: 'my-work.jpg',
    config: { viewRotation: { autoRotate: true } }
});
```
**See:** [QUICKSTART.md](QUICKSTART.md) → Single Image Viewer

### Real Estate Virtual Tours
```javascript
const multi = new Phong360MultiImage({
    core: core,
    images: propertyImages,
    adaptiveLoading: true
});
```
**See:** [QUICKSTART.md](QUICKSTART.md) → Multiple Images

### Travel Photography Galleries
```javascript
const libraryUI = new Phong360LibraryUI({
    containerId: 'viewer',
    libraryUrl: 'destinations.json',
    showLibraryPanel: true
});
```
**See:** [QUICKSTART.md](QUICKSTART.md) → Full Library

### Product Photography (E-commerce)
```javascript
// Show product from all angles
const multi = new Phong360MultiImage({
    core: core,
    images: productAngles,
    adaptiveLoading: true
});
```
**See:** [API.md](API.md) → Phong360MultiImage

### Educational/Museum Exhibits
```javascript
// Accessible 360° exhibits with keyboard controls
const core = new Phong360ViewerCore({
    containerId: 'exhibit',
    imageUrl: 'museum-room.jpg'
});
// Full keyboard navigation included!
```
**See:** [API.md](API.md) → Controls

---

## 🔍 Search by Topic

### Architecture
- **Modular design**: [../README.md](../README.md) → Architecture
- **Russian Doll layers**: [OPEN-SOURCE-READY.md](OPEN-SOURCE-READY.md) → True Modularity
- **Why it's lightweight**: [OPEN-SOURCE-READY.md](OPEN-SOURCE-READY.md) → Competitive Analysis

### Configuration
- **All config options**: [API.md](API.md) → Configuration Options
- **View rotation**: [API.md](API.md) → View Rotation
- **Field of view**: [API.md](API.md) → Field of View
- **Interaction settings**: [API.md](API.md) → Interaction

### Features
- **Adaptive loading**: [API.md](API.md) → selectOptimalResolution()
- **localStorage preferences**: [API.md](API.md) → localStorage Keys
- **Callbacks**: [API.md](API.md) → Callbacks
- **Projection switching**: [API.md](API.md) → switchProjection()

### Integration
- **WordPress**: [WORDPRESS-INTEGRATION-PLAN.md](WORDPRESS-INTEGRATION-PLAN.md)
- **React**: [QUICKSTART.md](QUICKSTART.md) → Section 5
- **Static sites**: [QUICKSTART.md](QUICKSTART.md) → Section 3
- **Custom frameworks**: [API.md](API.md) → Advanced Examples

### Library Management
- **Building libraries**: [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md) → Building a Library
- **Format specification**: [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md) → Library Structure
- **Resolution config**: [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md) → Resolution Configuration
- **Python script**: [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md) → build_library.py

---

## 🆘 Troubleshooting

### Common Issues
**See:** [QUICKSTART.md](QUICKSTART.md) → Troubleshooting

- Image not loading
- Black screen
- Controls not working
- Performance issues

### Getting Help
1. Check [QUICKSTART.md](QUICKSTART.md) troubleshooting section
2. Review [API.md](API.md) for correct usage
3. Check browser console for errors (F12)
4. Open issue on [GitHub](https://github.com/ansonphong/360-VIEWER/issues)

---

## 📊 Comparison

**vs Photo Sphere Viewer, Pannellum, Marzipano**

See [OPEN-SOURCE-READY.md](OPEN-SOURCE-READY.md) → Competitive Analysis

**Key advantages:**
- ✅ 6x smaller core (30KB vs 180KB)
- ✅ Truly modular (3 independent layers)
- ✅ No build tools required
- ✅ WordPress integration guide
- ✅ Adaptive loading
- ✅ localStorage preferences

---

## 🗺️ Roadmap

### v3.0 ✅ (Current)
- Modular architecture
- Semantic resolutions
- Adaptive loading
- localStorage preferences

### v3.1 (Coming Soon)
- NPM package
- CDN distribution
- TypeScript definitions
- Minified builds

### v3.2 (Future)
- VR mode
- Hotspots/annotations
- Video 360 support
- Framework wrappers

**Full roadmap:** [../README.md](../README.md) → Roadmap

---

## 🤝 Contributing

Want to contribute?

**See:** [OPEN-SOURCE-READY.md](OPEN-SOURCE-READY.md) → Call to Action

**Ideas:**
- Add TypeScript definitions
- Create React/Vue components
- Write more examples
- Improve accessibility
- Test on more devices
- Translate documentation

---

## 📞 Support

- **Documentation**: You're here! 📚
- **Issues**: [GitHub Issues](https://github.com/ansonphong/360-VIEWER/issues)
- **Website**: [https://360.phong.com](https://360.phong.com)
- **Main README**: [../README.md](../README.md)

---

## 📄 License

MIT License - Use freely in any project!

**See:** [../LICENSE](../LICENSE)

---

**Version**: 3.0.0  
**Last Updated**: November 2025

**Happy 360° viewing!** 🌐✨


