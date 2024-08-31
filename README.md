# 360° Viewer

A powerful and interactive 360° image viewer built with Three.js and modern web technologies.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Creating the Image Library](#creating-the-image-library)
  - [Setting Up Dependencies](#setting-up-dependencies)
  - [Steps to Create the Library](#steps-to-create-the-library)
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
- Python 3.6 or higher (for library management)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/360-viewer.git
   ```

2. Navigate to the project directory:
   ```
   cd 360-viewer
   ```

3. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Open `index.html` in your preferred browser or use a local development server.

## Usage

1. Open the application in your web browser.
2. Use mouse/touch controls to navigate the 360° image.
3. Click the hamburger menu to access the image library.
4. Drag and drop your own equirectangular images onto the viewer.
5. Toggle between Gnomonic and Stereographic projections using the button in the toolbar.

## Creating the Image Library

### Setting Up Dependencies

1. Ensure you have Python 3.6 or higher installed on your system.
2. Create a `requirements.txt` file in the root directory of your project with the following content:
   ```
   Pillow
   tqdm
   ```
3. Install the dependencies by running:
   ```
   pip install -r requirements.txt
   ```

### Steps to Create the Library

1. Create a `library` folder in the root of your project if it doesn't exist already.

2. Inside the `library` folder, create subfolders to organize your images. For example:
   ```
   library/
   ├── Landscapes/
   ├── Cityscapes/
   └── Interiors/
   ```

3. Place your full resolution, top-quality equirectangular images in these subfolders. Supported formats are PNG and JPG.

4. Open a command prompt or terminal in the project root directory.

5. Run the `make_library.bat` file:
   ```
   make_library.bat
   ```

6. The script will perform the following actions:
   - Scan the `library` folder and its subfolders
   - Generate thumbnails for all images
   - Create high-quality JPG versions of each image in three quality levels (100%, 75%, 50%)
   - Create a `library.json` file containing metadata for all images

7. Once the script completes, your library is ready to use with the 360° Viewer.

### Notes

- The script will only process new or modified images, so you can run it multiple times as you add new content.
- Ensure you have sufficient disk space, as the script generates multiple versions of each image.
- Large libraries may take some time to process. The script displays progress bars to keep you informed.

### Troubleshooting

- If you encounter any errors related to missing Python libraries, ensure you have installed all required dependencies using the `requirements.txt` file.
- For permission errors, make sure you have write access to the project directory.

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
├── make_library.bat
├── make_library.py
├── requirements.txt
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
    ├── Landscapes/
    ├── Cityscapes/
    ├── Interiors/
    ├── _thumbnails/
    ├── _Q100/
    ├── _Q75/
    └── _Q50/
```

## Key Components

1. **client.js**: Main application logic, 3D rendering, and user interactions.
2. **library.js**: Image library management and UI.
3. **library.json**: Image metadata and directory structure.
4. **Shaders**: Custom vertex and fragment shaders for image projections.
5. **make_library.py**: Python script for generating the image library and associated files.

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