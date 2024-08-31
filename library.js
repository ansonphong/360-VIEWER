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

    for (const [key, value] of Object.entries(data)) {
        const li = document.createElement("li");
        li.className = "folder";
        li.setAttribute("data-folder-name", key);
        li.innerHTML = `<span>${key}</span>`;
        li.addEventListener("click", toggleFolder);

        const subUl = document.createElement("ul");
        subUl.style.display = "none";

        if (value.files) {
            value.files.forEach((file) => {
                const fileLi = document.createElement("li");
                fileLi.className = "file";

                const thumbnailImg = document.createElement("img");
                thumbnailImg.src = `library/${file.thumbnail}`;
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

        for (const [subKey, subValue] of Object.entries(value)) {
            if (subKey !== "files") {
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
                window.loadImage(`library/${file.Q75}`, true);
                updateURLWithImageId(id);
                setCurrentImageId(id);
                expandFolderForImage(id);
            } else {
                console.warn("Image not found with ID:", id);
                loadDefaultImage();
            }
        })
        .catch((error) => {
            console.error("Error loading library data:", error);
            loadDefaultImage();
        });
}


function loadDefaultImage() {
    const DEFAULT_IMAGE_ID = "8bab1c81";
    console.log("Loading default image with ID:", DEFAULT_IMAGE_ID);
    loadImageById(DEFAULT_IMAGE_ID);
}

function findFileById(data, id) {
    for (const category of Object.values(data)) {
        if (category.files) {
            const file = category.files.find(file => file.id === id);
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

function updateImageInfo(source, fileName = null) {
    let basename, extension;

    if (fileName) {
        basename = fileName.split(".").slice(0, -1).join(".");
        extension = fileName.split(".").pop().toUpperCase();
    } else if (typeof source === 'string') {
        const filename = source.split("/").pop();
        basename = filename.split(".").slice(0, -1).join(".");
        extension = filename.split(".").pop().toUpperCase();
    } else {
        basename = "Dropped Image";
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

function loadImageAndCreateMaterial(source, fileName = null) {
    showLoading();
    fadeOutCurrentImage();

    loadTextureFromSource(source)
        .then(texture => {
            const material = createMaterialFromTexture(texture);
            updateImageInfo(source, fileName);
            
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

function loadImage(path, updateURL = true) {
    const fullPath = path.startsWith('library/') ? path : `library/${path}`;
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