# Documentation Index

Welcome to the Phong 360 Viewer documentation.

---

## Getting Started

**New to the viewer?** Start here:

1. **[Quick Start Guide](QUICKSTART.md)** - Get up and running in 5 minutes

---

## Core Documentation

### [API Reference](API.md)
Complete API documentation for all three layers:
- **Layer 1**: `Phong360ViewerCore` - Single image viewer (30KB)
- **Layer 2**: `Phong360MultiImage` - Multi-image + resolution management (+15KB)
- **Layer 3**: `Phong360LibraryUI` - Section-based library UI (+25KB)

Includes: constructor options, methods, properties, callbacks, localStorage keys, TemplateEngine and BaseRenderer APIs.

### [Library Format Specification](LIBRARY-FORMAT.md)
v4.0 JSON format for image libraries:
- Sections-based organization with template rendering
- Context block (profile, discover, local)
- Badge system for reaction/metric overlays
- Slug-based deep-linking
- Resolution metadata (8K, 4K, 2K with fileSize, bandwidth)

### [Template System](TEMPLATES.md)
Guide to the 9 built-in template renderers:
- Grid, Feed, Accordion, Hero, List, Carousel
- Avatar Row, Avatar Grid, Empty State
- Config options for each template
- Custom template registration

### [Theming Guide](THEMING.md)
Customizing the viewer's appearance:
- Light/dark/auto theme modes
- CSS custom properties reference
- Accent color customization
- Creating custom themes
- Phosphor icon integration
- Responsive breakpoints

### [Deployment Guide](DEPLOYMENT.md)
Production deployment:
- Static hosting (Netlify, Vercel, GitHub Pages, Cloudflare)
- Traditional servers (Nginx, Apache)
- CDN configuration
- Performance optimization
- Security best practices

---

## Create Your Own Gallery

### [Fork Guide](FORK-GUIDE.md)
Step-by-step guide to creating your own 360 gallery website:
- Prerequisites and quick start
- Configuration reference (`360-viewer.json`)
- Context types, section options, themes, accent colors
- Build settings and resolution overrides
- Deployment (Netlify, GitHub Pages, any static host)
- Claude Code kickoff prompt for guided setup

Also see the **[Gallery Template](../gallery-template/)** for ready-to-use starter files.

---

## Integration Guides

### [WordPress Integration](WORDPRESS-INTEGRATION-PLAN.md)
Adding 360 viewer to WordPress themes:
- Post meta and gallery type registration
- PHP helper functions
- Template examples

### [Open Source Strategy](OPEN-SOURCE-READY.md)
Roadmap for adoption and growth:
- Competitive advantages
- Target markets
- Growth phases

---

## Quick Reference

| Document | Best For |
|----------|----------|
| **[QUICKSTART.md](QUICKSTART.md)** | Beginners, quick implementations |
| **[API.md](API.md)** | Developers, advanced usage |
| **[LIBRARY-FORMAT.md](LIBRARY-FORMAT.md)** | Building libraries, data format |
| **[TEMPLATES.md](TEMPLATES.md)** | Customizing section layouts |
| **[THEMING.md](THEMING.md)** | Styling, dark/light mode, colors |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Going live, hosting setup |
| **[FORK-GUIDE.md](FORK-GUIDE.md)** | Creating your own 360 gallery website |
| **[WORDPRESS-INTEGRATION-PLAN.md](WORDPRESS-INTEGRATION-PLAN.md)** | WordPress developers |

---

## Find What You Need

### "I want to embed a single 360 image"
Go to [QUICKSTART.md](QUICKSTART.md) - Layer 1

### "I want section-based browsing with templates"
Go to [TEMPLATES.md](TEMPLATES.md) and [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md)

### "I want to customize colors and themes"
Go to [THEMING.md](THEMING.md)

### "I need the full API reference"
Go to [API.md](API.md)

### "I want to build an image library"
Go to [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md) - Building a Library

### "I want to add badges/reactions to images"
Go to [LIBRARY-FORMAT.md](LIBRARY-FORMAT.md) - Badge Object and [API.md](API.md) - updateBadges()

### "I want to create a custom template renderer"
Go to [TEMPLATES.md](TEMPLATES.md) - Custom Templates and [API.md](API.md) - BaseRenderer

### "I want to create my own 360 gallery website"
Go to [FORK-GUIDE.md](FORK-GUIDE.md) and the [Gallery Template](../gallery-template/)

### "I'm integrating into WordPress"
Go to [WORDPRESS-INTEGRATION-PLAN.md](WORDPRESS-INTEGRATION-PLAN.md)

---

## Roadmap

### v4.0 (Current)
- Section-based UI with template engine
- 9 built-in renderers
- Badge system, themes, context headers
- Deep-linking, lazy loading, accent colors

### v4.1 (Coming Soon)
- NPM package, CDN, TypeScript definitions

### v4.2 (Future)
- VR mode, hotspots, video 360, framework wrappers

Full roadmap: [../README.md](../README.md)

---

## Support

- **Issues**: [GitHub Issues](https://github.com/ansonphong/360-VIEWER/issues)
- **Website**: [https://360.phong.com](https://360.phong.com)
- **Main README**: [../README.md](../README.md)

---

**Version**: 4.0.0
**Last Updated**: February 2026
