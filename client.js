// Import Three.js and other necessary libraries
const THREE = window.THREE;
let scene, camera, renderer, mesh;
let loadingOverlay, phongLogoCenterImg, threeJSCanvas;
let isTabVisible = true;

const DEFAULT_IMAGE_ID = "a02580ab";

// Interaction State
let isUserInteracting = false,
    onPointerDownMouseX = 0,
    onPointerDownMouseY = 0,
    onPointerDownLon = 0,
    onPointerDownLat = 0,
    targetLon = 0,
    targetLat = 0,
    fov = 90;


let isPointerDown = false;
let lastPointerX = 0;
let lastPointerY = 0;
let pointerStartX = 0;
let pointerStartY = 0;

let currentImagePath = "";

// Time for calculating frame delta
let lastUpdate = Date.now();

let aspect = 1.0;
let projectionType = 1;

// Configure the hyper params of the view
// Can be unique per image
var config = {
    fov: { // This is the old object
        max: 300,
        min: 45,
        init: 100,
        initTarget: 60,
    },

    fov_gnomonic: { // Impliment this one when gnomonic projection is used
        max: 130,
        min: 45,
        init: 100,
        initTarget: 60,
    },

    fov_stereographic: {  // Impliment this one when stereographic projection is used
        max: 330,
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

// Setup initial rotation values
let initPhi = THREE.MathUtils.degToRad(90 - config.viewRotation.initAltitude),
    initTheta = THREE.MathUtils.degToRad(config.viewRotation.initAzimuth);

// Setup State Objects
var state = {
    lat: config.viewRotation.initAltitude,
    lon: config.viewRotation.initAzimuth,
    phi: initPhi,
    theta: initTheta,
    fov: config.fov.init,
    azimuthSign: 1,
};
var targetState = {
    lat: config.viewRotation.initAltitude,
    lon: config.viewRotation.initAzimuth,
    phi: initPhi,
    theta: initTheta,
    fov: config.fov.initTarget,
    azimuthSign: 1,
};

function loadInitialImage() {
    window.removeEventListener('libraryLoaded', loadInitialImage);
    const urlParams = new URLSearchParams(window.location.search);
    const imgId = urlParams.get("img") || DEFAULT_IMAGE_ID;
    window.loadImageById(imgId);
}

// Update the loadTextureAndCreateMaterial function
function loadTextureAndCreateMaterial(source, onLoad, fileName = null) {
    console.log("loadTextureAndCreateMaterial called with:", source, fileName);
    showLoading();
    fadeOutCurrentImage();

    const createMaterial = (texture) => {
        console.log("Creating material with texture:", texture);

        if (!texture || !(texture instanceof THREE.Texture)) {
            console.error("Invalid texture:", texture);
            hideLoading();
            alert('The image could not be loaded as a valid texture.');
            return;
        }

        // Enable mipmaps and set optimal texture settings
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.repeat.x = -1;

        // Use texture.format to determine the internal format
        let internalFormat;
        switch (texture.format) {
            case THREE.RGBAFormat:
                internalFormat = THREE.RGBA8;
                break;
            case THREE.RGBFormat:
                internalFormat = THREE.RGB8;
                break;
            default:
                internalFormat = THREE.RGBA8;
        }
        texture.internalFormat = internalFormat;

        try {
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    equirectangularMap: { value: texture },
                    lon: { value: state.lon },
                    lat: { value: state.lat },
                    fov: { value: state.fov },
                    aspect: { value: aspect },
                    projectionType: { value: projectionType }
                },
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
            });

            console.log("Material created successfully");

            // Update DOM elements
            updateImageInfo(source, fileName);

            onLoad(material);
            hideLoading();
            fadeInNewImage();

            // Update the current image path and highlight it in the library
            currentImagePath = source instanceof THREE.Texture ? fileName : source;
            window.currentImagePath = currentImagePath;
            console.log("Material created and loaded");
        } catch (error) {
            console.error("Error creating material:", error);
            hideLoading();
            alert('Error creating material from the texture.');
        }
    };

    if (source instanceof THREE.Texture || source instanceof THREE.CanvasTexture) {
        console.log("Source is already a texture");
        createMaterial(source);
    } else {
        console.log("Loading texture from source:", source);
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            source,
            createMaterial,
            (progress) => {
                console.log("Loading progress:", progress);
            },
            (error) => {
                console.error("An error occurred while loading the texture:", error);
                hideLoading();
                alert('Error loading the image.');
            }
        );
    }
}


// Add this helper function to check if an object is a valid THREE.Texture
function isValidTexture(obj) {
    return obj instanceof THREE.Texture && obj.image && obj.image.width > 0 && obj.image.height > 0;
}

function showLoading() {
    loadingOverlay.style.display = "block";
    phongLogoCenterImg.style.display = "block";
    phongLogoCenterImg.style.opacity = "1";
    startPulsing();
}

function hideLoading() {
    loadingOverlay.style.display = "none";
    stopPulsing();
    // Fade out the logo
    phongLogoCenterImg.style.transition = "opacity 0.5s ease-out";
    phongLogoCenterImg.style.opacity = "0";
    // Remove the logo after the fade-out transition
    setTimeout(() => {
        phongLogoCenterImg.style.display = "none";
    }, 500); // 500ms matches the transition duration
}

function startPulsing() {
    phongLogoCenterImg.style.animation = "pulse 2s infinite";
}

function stopPulsing() {
    phongLogoCenterImg.style.animation = "none";
    phongLogoCenterImg.style.opacity = "0";
}

function fadeOutCurrentImage() {
    threeJSCanvas.style.transition = "opacity 1s ease-out";
    threeJSCanvas.style.opacity = "0";
}

function fadeInNewImage() {
    setTimeout(() => {
        threeJSCanvas.style.transition = "opacity 1.8s ease-in";
        threeJSCanvas.style.opacity = "1";
    }, 100);
}

// Update the updateImageInfo function to handle both file names and URLs
function updateImageInfo(source, fileName = null) {
    let basename, extension;

    if (fileName) {
        // Use the provided file name for drag and drop
        basename = fileName.split(".").slice(0, -1).join(".");
        extension = fileName.split(".").pop().toUpperCase();
    } else if (typeof source === 'string') {
        // Extract filename from URL for initial load or other cases
        const filename = source.split("/").pop();
        basename = filename.split(".").slice(0, -1).join(".");
        extension = filename.split(".").pop().toUpperCase();
    } else {
        // Handle case where source is a texture (drag and drop)
        basename = "Dropped Image";
        extension = "Unknown";
    }

    // Update title
    const titleElement = document.getElementById("imageTitle");
    if (titleElement) {
        titleElement.textContent = basename;
    }

    // Update format
    const formatElement = document.getElementById("imageFormat");
    if (formatElement) {
        formatElement.textContent = `${extension} / Equirectangular`;
    }
}

// Shaders
const vertexShader = `
varying vec2 vUV;

void main() {
    vUV = uv;
    gl_Position = vec4(position, 1.0);
}
`;

// AA works but it has glitches at the poles
const fragmentShader = `
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


// Initialize and Animate
init();
animate();

function init() {
    const container = document.getElementById("container");
    lastUpdate = Date.now();

    loadingOverlay = document.getElementById("loading-overlay");
    phongLogoCenterImg = document.getElementById("phong-logo-center");

    // Set up scene, camera, and renderer
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    threeJSCanvas = renderer.domElement;

    // Create full-screen quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    mesh = new THREE.Mesh(geometry);
    scene.add(mesh);

    // Calculate initial aspect ratio
    aspect = window.innerWidth / window.innerHeight;

    // Event listeners
    window.addEventListener("resize", onWindowResize);
    document.addEventListener("wheel", onDocumentMouseWheel);
    document.addEventListener('pointerdown', onPointerDown, false);
    document.addEventListener('pointermove', onPointerMove, false);
    document.addEventListener('pointerup', onPointerUp, false);
    document.addEventListener('pointercancel', onPointerUp, false);

    // Add touch events for pinch zooming
    renderer.domElement.addEventListener('touchstart', onTouchStart, false);
    renderer.domElement.addEventListener('touchmove', onTouchMove, false);
    renderer.domElement.addEventListener('touchend', onTouchEnd, false);

    // Set up drag and drop functionality
    setupDragAndDrop();

    // Window / Tab visibility Change event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    document.getElementById('switchProjectionButton').addEventListener('click', function () {
        let currentType = projectionType;
        let newType = currentType === 0 ? 1 : 0;
        switchProjection(newType, this);
    });

    switchProjection(projectionType, document.getElementById('switchProjectionButton'));

    // Add fullscreen change event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
}

// MOBILE PINCH ZOOMING
function onTouchStart(event) {
    console.log("onTouchStart", event)
    if (event.touches.length === 2) {
        isZooming = true;
        console.log("isZooming", isZooming)
        initialPinchDistance = getPinchDistance(event);

    }
}

function onTouchMove(event) {
    console.log("onTouchMove", event)
    if (isZooming && event.touches.length === 2) {
        const currentPinchDistance = getPinchDistance(event);
        const pinchRatio = initialPinchDistance / currentPinchDistance;

        targetState.fov = clampFOV(state.fov * pinchRatio);
        initialPinchDistance = currentPinchDistance;
        console.log("currentPinchDistance", currentPinchDistance)

    } else if (event.touches.length === 1) {
        // Handle single touch panning
        const touch = event.touches[0];
        onPointerMove({
            clientX: touch.clientX,
            clientY: touch.clientY,
            isPrimary: true
        });
    }
}

function onTouchEnd(event) {
    if (event.touches.length < 2) {
        isZooming = false;
    }
    if (event.touches.length === 0) {
        onPointerUp({ isPrimary: true });
    }
}

function getPinchDistance(event) {
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    return Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
}


// VISIBLITY
function handleVisibilityChange() {
    isTabVisible = !document.hidden;
}

function handleFocus() {
    isTabVisible = true;
}

function handleBlur() {
    isTabVisible = false;
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    aspect = width / height;
    camera.left = -aspect;
    camera.right = aspect;
    camera.top = 1;
    camera.bottom = -1;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);

    // Update the aspect ratio uniform in the shader
    if (mesh && mesh.material && mesh.material.uniforms) {
        mesh.material.uniforms.aspect.value = aspect;
    }
}

function animate() {
    requestAnimationFrame(animate);
    update();
}

// Updated createShaderMaterial function
function createShaderMaterial(texture) {
    const initialFOVConfig = getCurrentFOVConfig();
    return new THREE.ShaderMaterial({
        uniforms: {
            equirectangularMap: { value: texture },
            lon: { value: state.lon },
            lat: { value: state.lat },
            fov: { value: state.fov },
            aspect: { value: aspect },
            projectionType: { value: projectionType }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
    });
}

// Updated switchProjection function
function switchProjection(type, dom) {
    projectionType = type;
    if (mesh && mesh.material && mesh.material.uniforms) {
        mesh.material.uniforms.projectionType.value = type;
    }

    // Clamp both targetState.fov and state.fov to the new range
    targetState.fov = clampFOV(targetState.fov);
    state.fov = clampFOV(state.fov);
    dom.title = type === 0 ? 'Gnomonic Projection' : 'Stereographic Projection';
    dom.textContent = type === 0 ? '📐 Gnomonic' : '🌐 Stereographic';

    //console.log(`Switched to ${type === 0 ? 'Gnomonic' : 'Stereographic'} projection. FOV clamped to:`, targetState.fov);
}

function onPointerDown(event) {
    if (event.isPrimary === false) return;

    isPointerDown = true;
    isUserInteracting = true;

    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;

    onPointerDownLon = targetState.lon;
    onPointerDownLat = targetState.lat;

    // Capture the pointer to receive events outside of the element
    event.target.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
    if (event.isPrimary === false || !isPointerDown) return;

    const deltaX = event.clientX - lastPointerX;
    const deltaY = event.clientY - lastPointerY;

    targetState.lon = (pointerStartX - event.clientX) * 0.1 + onPointerDownLon;
    targetState.lat = (event.clientY - pointerStartY) * 0.1 + onPointerDownLat;

    // Calculate the sign (direction) of the Azimuth as (-1) or (+1)
    state.azimuthSign = deltaX / Math.max(Math.abs(deltaX), 0.001);
    if (state.azimuthSign == 0) state.azimuthSign = 1;

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
}

function onPointerUp(event) {
    if (event.isPrimary === false) return;

    isPointerDown = false;
    isUserInteracting = false;

    // Only release pointer capture if the event target supports it
    if (event.target && typeof event.target.releasePointerCapture === 'function') {
        event.target.releasePointerCapture(event.pointerId);
    }
}

// New function to get the current FOV configuration based on projection type
function getCurrentFOVConfig() {
    return projectionType === 0 ? config.fov_gnomonic : config.fov_stereographic;
}

// New function to clamp FOV value
function clampFOV(fov) {
    const currentConfig = getCurrentFOVConfig();
    return THREE.MathUtils.clamp(fov, currentConfig.min, currentConfig.max);
}

// Updated onDocumentMouseWheel function
function onDocumentMouseWheel(event) {
    const elementUnderMouse = document.elementFromPoint(event.clientX, event.clientY);
    const threeJSCanvas = document.querySelector('#container canvas');

    if (elementUnderMouse === threeJSCanvas) {
        let scrollDirection = event.deltaY < 0 ? 0.95 : 1.05;
        targetState.fov = clampFOV(targetState.fov * scrollDirection);
        //console.log("FOV:", targetState.fov);
    }
}


// Spherical project a location in space to look at based on angles
function calculateLookAtTarget(theta, phi) {
    let result = {};
    let radius = 1000;
    result.x = radius * Math.sin(phi) * Math.cos(theta);
    result.y = radius * Math.cos(phi);
    result.z = radius * Math.sin(phi) * Math.sin(theta);
    return result;
}

// Updated update function
function update() {
    let now = Date.now(),
        delta = (now - lastUpdate) / 1000; // Delta in Seconds
    lastUpdate = now;

    if (!isUserInteracting && config.viewRotation.autoRotate) {
        targetState.lon = targetState.lon - (config.viewRotation.autoRotationRate * state.azimuthSign * delta);
    }

    const latRange = 90;

    // Clamp latitude to range
    targetState.lat = Math.max(-latRange, Math.min(latRange, targetState.lat));

    // Calculate target angle
    targetState.phi = THREE.MathUtils.degToRad(90 - targetState.lat);
    targetState.theta = THREE.MathUtils.degToRad(targetState.lon);

    // Smooth interpolation
    state.theta += (targetState.theta - state.theta) / (config.viewRotation.smoothness * delta);
    state.phi += (targetState.phi - state.phi) / (config.viewRotation.smoothness * delta);
    state.fov += (targetState.fov - state.fov) / (config.zoom.smoothing * delta);

    state.lon += (targetState.lon - state.lon) / (config.viewRotation.smoothness * delta);
    state.lat += (targetState.lat - state.lat) / (config.viewRotation.smoothness * delta);

    // Ensure FOV stays within the current projection's limits
    state.fov = clampFOV(state.fov);

    if (mesh && mesh.material && mesh.material.uniforms) {
        mesh.material.uniforms.lon.value = THREE.MathUtils.degToRad(state.lon);
        mesh.material.uniforms.lat.value = THREE.MathUtils.degToRad(state.lat);
        mesh.material.uniforms.fov.value = state.fov;
        mesh.material.uniforms.aspect.value = aspect;
    }

    renderer.render(scene, camera);
}

function setupDragAndDrop() {
    const overlay = document.getElementById("drag-drop-overlay");

    document.addEventListener("dragenter", function (event) {
        event.preventDefault();
        showDropOverlay();
    });

    document.addEventListener("dragover", function (event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    });

    document.addEventListener("dragleave", function (event) {
        event.preventDefault();
        if (!event.relatedTarget || event.relatedTarget.nodeName === "HTML") {
            hideDropOverlay();
        }
    });

    document.addEventListener("drop", function (event) {
        event.preventDefault();
        hideDropOverlay();
        console.log("File dropped");
        const file = event.dataTransfer.files[0];
        if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
            console.log("Valid image file dropped:", file.name);
            const reader = new FileReader();
            reader.onload = function (e) {
                console.log("File read successfully");
                createImageBitmap(file).then(function (imageBitmap) {
                    console.log("ImageBitmap created, dimensions:", imageBitmap.width, "x", imageBitmap.height);

                    // Create a canvas and draw the image without flipping
                    const canvas = document.createElement('canvas');
                    canvas.width = imageBitmap.width;
                    canvas.height = imageBitmap.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(imageBitmap, 0, 0);

                    // Create a texture from the canvas
                    const texture = new THREE.CanvasTexture(canvas);
                    texture.needsUpdate = true;

                    console.log("Texture created");

                    // Update image info with the file name
                    window.updateImageInfo(file.name);

                    // Load image and create material
                    window.loadImageAndCreateMaterial(texture);
                }).catch(function (error) {
                    console.error("Error creating ImageBitmap:", error);
                    alert('Error processing the image. Please try a different image file.');
                });
            };
            reader.onerror = function (error) {
                console.error("FileReader error:", error);
                alert('Error reading the dropped file.');
            };
            reader.readAsArrayBuffer(file);
            console.log("Started reading file");
        } else {
            console.error('Dropped file is not a supported image type:', file ? file.type : 'No file');
            alert('Please drop a JPG or PNG image file.');
        }
    });
}

function showDropOverlay() {
    const overlay = document.getElementById("drag-drop-overlay");
    overlay.style.display = "flex";
}

function hideDropOverlay() {
    const overlay = document.getElementById("drag-drop-overlay");
    overlay.style.display = "none";
}

// Update the isValidTexture function to handle ImageBitmap
function isValidTexture(texture) {
    return (texture instanceof THREE.Texture || texture instanceof THREE.CanvasTexture) &&
        texture.image &&
        texture.image.width > 0 &&
        texture.image.height > 0;
}

function onFullscreenToggle() {
    toggleFullscreen();
}


function showPanels(show) {
    const panels = ['toolbar-panel', 'info-panel', 'hamburger-menu'];
    panels.forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.style.display = show ? '' : 'none';
        }
    });
    // Library panel visibility is now handled in library.js
}

// Updated toggleFullscreen function
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        }
        showPanels(false);
        window.closeLibraryPanel();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        showPanels(true);
    }
}

// Function to handle fullscreen change
function handleFullscreenChange() {
    if (!document.fullscreenElement && !document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
        showPanels(true);
    }
}
