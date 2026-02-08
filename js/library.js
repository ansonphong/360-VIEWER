// library.js

document.addEventListener("DOMContentLoaded", () => {
    initializeLibrary();
});

function initializeLibrary() {
    const libraryPanel = document.getElementById("library-panel");
    const hamburgerMenu = document.getElementById("hamburger-menu");
    const libraryTree = document.getElementById("library-tree");

    // Toggle library panel
    hamburgerMenu.addEventListener("click", (e) => {
        e.stopPropagation();
        libraryPanel.classList.toggle("active");
        hamburgerMenu.classList.toggle("active");
    });

    // Close library panel when clicking outside
    document.addEventListener("click", (event) => {
        if (!libraryPanel.contains(event.target) && !hamburgerMenu.contains(event.target)) {
            libraryPanel.classList.remove("active");
            hamburgerMenu.classList.remove("active");
        }
    });

    // Load library data
    fetch("library/library.json")
        .then((response) => response.json())
        .then((data) => {
            const tree = buildLibraryTree(data);
            libraryTree.appendChild(tree);

            // Dispatch a custom event when the library is loaded
            window.dispatchEvent(new Event('libraryLoaded'));

            // Check for image ID in URL and load it
            const urlParams = new URLSearchParams(window.location.search);
            const imgId = urlParams.get("img");
            if (imgId) {
                setTimeout(() => {
                    loadImageById(imgId);
                    expandFolderForImage(imgId);
                }, 200);
            } else if (window.currentImageId) {
                window.highlightCurrentImage(window.currentImageId);
                expandFolderForImage(window.currentImageId);
            } else {
                console.log("No image ID specified in URL or currentImageId");
                loadDefaultImage();
            }
        })
        .catch((error) => {
            console.error("Error loading library:", error);
            loadDefaultImage();
        });
}

function buildLibraryTree(data, path = "") {
    const ul = document.createElement("ul");
    
    // Handle v3.0 format with _categories
    const categories = data._categories || data;

    for (const [key, value] of Object.entries(categories)) {
        // Skip metadata
        if (key.startsWith('_')) continue;
        
        const li = document.createElement("li");
        li.className = "folder";
        li.setAttribute("data-folder-name", key);
        li.innerHTML = `<span>${value.name || key}</span>`;
        li.addEventListener("click", toggleFolder);

        const subUl = document.createElement("ul");
        subUl.style.display = "none";

        // Handle v3.0 'images', v2.0 'images', and v1.x 'files' format
        const images = value.images || value.files || [];
        
        if (images.length > 0) {
            images.forEach((file) => {
                const fileLi = document.createElement("li");
                fileLi.className = "file";

                // v3.0: thumbnail is an object with path property
                const thumbnailPath = file.thumbnail?.path || file.thumbnail;
                const thumbnailImg = document.createElement("img");
                thumbnailImg.src = `library/${thumbnailPath}`;
                thumbnailImg.alt = file.name;
                thumbnailImg.className = "file-thumbnail";

                fileLi.appendChild(thumbnailImg);

                fileLi.dataset.id = file.id;

                fileLi.addEventListener("click", (e) => {
                    e.stopPropagation();
                    window.closeLibraryPanel();

                    setTimeout(() => {
                        loadImageById(file.id);
                    }, 250);
                });

                subUl.appendChild(fileLi);
            });
        }

        // Handle subcategories (v2.0+)
        if (value.subcategories) {
            for (const [subKey, subValue] of Object.entries(value.subcategories)) {
                const subTree = buildLibraryTree({ [subKey]: subValue }, `${path}${key}/`);
                subUl.appendChild(subTree);
            }
        }
        
        // Handle nested objects (v1.x compatibility)
        for (const [subKey, subValue] of Object.entries(value)) {
            if (subKey !== "files" && subKey !== "images" && subKey !== "name" && subKey !== "subcategories") {
                const subTree = buildLibraryTree({ [subKey]: subValue }, `${path}${key}/`);
                subUl.appendChild(subTree);
            }
        }

        if (subUl.children.length > 0) {
            li.appendChild(subUl);
        }

        ul.appendChild(li);
    }

    return ul;
}




function toggleFolder(e) {
    e.stopPropagation();
    const subUl = this.querySelector("ul");
    if (subUl) {
        subUl.style.display = subUl.style.display === "none" ? "block" : "none";
    }
}

function highlightCurrentImage(id) {
    if (!id) {
        console.warn("No image ID provided to highlight");
        return;
    }

    // Remove highlight from all images
    const allImages = document.querySelectorAll("#library-tree .file");
    allImages.forEach((img) => img.classList.remove("current"));

    // Add highlight to the current image
    const currentImage = document.querySelector(`#library-tree .file[data-id="${id}"]`);
    if (currentImage) {
        currentImage.classList.add("current");
        currentImage.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
        console.warn("Current image not found in the library:", id);
    }
}

function updateURLWithImageId(id) {
    const newURL = `?img=${id}`;
    window.history.pushState({}, '', newURL);
}

function setCurrentImageId(id) {
    window.currentImageId = id;
    if (window.highlightCurrentImage) {
        window.highlightCurrentImage(id);
    }
}


function loadImageById(id) {
    fetch("library/library.json")
        .then((response) => response.json())
        .then((data) => {
            const file = findFileById(data, id);
            if (file) {
                // v3.0: Delegate to viewer for resolution selection
                if (window.phong360Viewer) {
                    window.phong360Viewer.loadImageById(id);
                } else {
                    console.error("Viewer not initialized");
                }
                updateURLWithImageId(id);
                setCurrentImageId(id);
                expandFolderForImage(id);
            } else {
                console.warn("Image not found with ID:", id);
                loadFirstImageInLibrary(data);
            }
        })
        .catch((error) => {
            console.error("Error loading library data:", error);
            loadDefaultImage();
        });
}

function loadFirstImageInLibrary(data) {
    // Handle v3.0 format with _categories
    const categories = data._categories || data;
    
    // Find first category with images
    for (const category of Object.values(categories)) {
        if (typeof category !== 'object' || category === null) continue;
        
        const images = category.images || category.files;
        if (images && images.length > 0) {
            const firstFile = images[0];
            console.log("Loading first image in library:", firstFile.id);
            
            // v3.0: Delegate to viewer for resolution selection
            if (window.phong360Viewer) {
                window.phong360Viewer.loadImageById(firstFile.id);
            } else {
                console.error("Viewer not initialized");
            }
            
            updateURLWithImageId(firstFile.id);
            setCurrentImageId(firstFile.id);
            expandFolderForImage(firstFile.id);
            return;
        }
    }
    
    console.error("No images found in the library");
    loadDefaultImage();
}

function loadDefaultImage() {
    const DEFAULT_IMAGE_ID = "8bab1c81";
    console.log("Loading default image with ID:", DEFAULT_IMAGE_ID);
    loadImageById(DEFAULT_IMAGE_ID);
}

function findFileById(data, id) {
    // Handle v2.0 format with _categories
    const categories = data._categories || data;
    
    for (const category of Object.values(categories)) {
        // Skip metadata
        if (typeof category !== 'object' || category === null) continue;
        
        // Check images (v2.0) or files (v1.x)
        const images = category.images || category.files;
        if (images) {
            const file = images.find(file => file.id === id);
            if (file) return file;
        }
        
        // Check subcategories recursively (v2.0)
        if (category.subcategories) {
            const file = findFileById({ _categories: category.subcategories }, id);
            if (file) return file;
        }
    }
    return null;
}

function expandFolderForImage(id) {
    const imageElement = document.querySelector(`#library-tree .file[data-id="${id}"]`);
    if (imageElement) {
        let parent = imageElement.parentElement;
        while (parent && !parent.classList.contains('folder')) {
            parent = parent.parentElement;
        }
        if (parent) {
            const subUl = parent.querySelector('ul');
            if (subUl) {
                subUl.style.display = 'block';
            }
        }
    }
}



function updateURLWithImagePath(path) {
    const cleanPath = path.replace(/^library\//, '');
    const newURL = `?img=${encodeURIComponent(cleanPath)}`;
    window.history.pushState({}, '', newURL);
}

function setCurrentImagePath(path) {
    window.currentImagePath = path;
    if (window.highlightCurrentImage) {
        window.highlightCurrentImage(path);
    }
}

function updateImageInfo(title) {
    let basename, extension;
    //console.log("title", title);

    if (typeof title === 'string') {
        // Extract only the filename without folders or extension
        const parts = title.split("/");
        const filename = parts[parts.length - 1];
        basename = filename.split(".")[0];
        extension = filename.split(".").pop().toUpperCase();
    } else {
        basename = "Unnamed Image";
        extension = "Unknown";
    }

    const titleElement = document.getElementById("imageTitle");
    if (titleElement) {
        titleElement.textContent = basename;
    }

    const formatElement = document.getElementById("imageFormat");
    if (formatElement) {
        formatElement.textContent = `${extension} / Equirectangular`;
    }
}

function createMaterialFromTexture(texture) {
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.x = -1;

    let internalFormat = texture.format === THREE.RGBAFormat ? THREE.RGBA8 : THREE.RGB8;
    texture.internalFormat = internalFormat;

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

function loadTextureFromSource(source) {
    return new Promise((resolve, reject) => {
        if (source instanceof THREE.Texture || source instanceof THREE.CanvasTexture) {
            resolve(source);
        } else {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(
                source,
                resolve,
                undefined,
                reject
            );
        }
    });
}

function loadImageAndCreateMaterial(source) {
    showLoading();
    fadeOutCurrentImage();

    loadTextureFromSource(source)
        .then(texture => {
            const material = createMaterialFromTexture(texture);
            
            if (mesh && mesh.material) {
                mesh.material.dispose();
                mesh.material = material;
            }

            hideLoading();
            fadeInNewImage();
            window.closeLibraryPanel();
        })
        .catch(error => {
            console.error("Error loading texture:", error);
            hideLoading();
            alert('Error loading the image.');
        });
}

function loadImage(path, title) {
    const fullPath = path.startsWith('library/') ? path : `library/${path}`;
    
    // Call updateImageInfo with the title
    updateImageInfo(title);
    
    // Call loadImageAndCreateMaterial
    loadImageAndCreateMaterial(fullPath);

    if (window.currentImageId) {
        updateURLWithImageId(window.currentImageId);
    }
}

// Expose functions to global scope
window.toggleLibraryPanel = () => {
    const libraryPanel = document.getElementById("library-panel");
    const hamburgerMenu = document.getElementById("hamburger-menu");
    libraryPanel.classList.toggle("active");
    hamburgerMenu.classList.toggle("active");
};

window.closeLibraryPanel = () => {
    const libraryPanel = document.getElementById("library-panel");
    const hamburgerMenu = document.getElementById("hamburger-menu");
    libraryPanel.classList.remove("active");
    hamburgerMenu.classList.remove("active");
};

window.loadImageById = loadImageById;
window.highlightCurrentImage = highlightCurrentImage;
window.loadImage = loadImage;
window.loadImageAndCreateMaterial = loadImageAndCreateMaterial;