# 360° Viewer

A powerful and interactive 360° image viewer built with Three.js and modern web technologies.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Architecture](#architecture)
- [File Structure](#file-structure)
- [Key Components](#key-components)
- [Configuration](#configuration)
- [Best Practices](#best-practices)
- [Contributing](#contributing)
- [License](#license)

## Features

- Smooth 360° image navigation
- Support for equirectangular images
- Gnomonic and Stereographic projections
- Interactive image library
- Drag and drop image loading
- Responsive design
- Fullscreen mode
- Customizable UI elements

## Getting Started

### Prerequisites

- Modern web browser with WebGL support
- Local development server (e.g., Live Server for VS Code)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/360-viewer.git
   ```

2. Navigate to the project directory:
   ```
   cd 360-viewer
   ```

3. Open `index.html` in your preferred browser or use a local development server.

## Usage

1. Open the application in your web browser.
2. Use mouse/touch controls to navigate the 360° image.
3. Click the hamburger menu to access the image library.
4. Drag and drop your own equirectangular images onto the viewer.
5. Toggle between Gnomonic and Stereographic projections using the button in the toolbar.

## Architecture

The 360° Viewer is built using a modular architecture with the following main components:

- Three.js for 3D rendering
- Custom shaders for image projections
- Vanilla JavaScript for UI interactions and image management

## File Structure

```
360-viewer/
│
├── index.html
├── client.js
├── library.js
├── library.json
├── README.md
│
├── css/
│   └── styles.css
│
├── images/
│   ├── phong-logo.png
│   └── ...
│
└── library/
    ├── NewAtlantis/
    ├── PureLands/
    └── _thumbnails/
```

## Key Components

1. **client.js**: Main application logic, 3D rendering, and user interactions.
2. **library.js**: Image library management and UI.
3. **library.json**: Image metadata and directory structure.
4. **Shaders**: Custom vertex and fragment shaders for image projections.

## Configuration

Adjust the following parameters in `client.js` to customize the viewer:

```javascript
var config = {
  fov: {
    max: 300,
    min: 45,
    init: 100,
    initTarget: 60,
  },
  zoom: {
    increment: 2,
    smoothing: 6000,
  },
  viewRotation: {
    initAltitude: 0,
    initAzimuth: 90,
    autoRotate: true,
    autoRotationRate: 1,
    smoothness: 8000,
  },
};
```

## Best Practices

1. **Performance Optimization**
   - Use mipmaps and anisotropic filtering for textures.
   - Implement level-of-detail (LOD) for large image libraries.

2. **Code Organization**
   - Separate concerns: keep rendering, UI, and data management in different modules.
   - Use ES6 modules for better code organization and dependency management.

3. **User Experience**
   - Provide smooth transitions between images and projections.
   - Implement intuitive touch controls for mobile devices.

4. **Error Handling**
   - Gracefully handle unsupported browsers or devices.
   - Provide meaningful error messages for image loading failures.

5. **Accessibility**
   - Ensure keyboard navigation for all features.
   - Add proper ARIA labels to interactive elements.

6. **Testing**
   - Implement unit tests for core functions.
   - Conduct cross-browser and device testing.

7. **Documentation**
   - Maintain clear inline comments for complex logic.
   - Keep the README up-to-date with all features and usage instructions.

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
