/**
 * Test: image:visible GPU-upload timing + full event chain (Task 1.5)
 *
 * Covers:
 *   Part 1 — Core loadImage: resolves only after hideLoading fade-out completes
 *   Part 2 — Multi-image loadImageWithResolution: async/await + events
 *   Part 3 — Library-ui selectImage (manifest path): full event chain
 *   Part 4 — Library-ui loadImage (raw URL path)
 *   Part 5 — Full event chain ordering
 *   Part 6 — Library lifecycle (loadLibrary, reloadLibrary, setLibrary)
 *   Part 7 — Last-write-wins ghost-event test
 *   Part 8 — Error paths (image:error, library:error)
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { setupMockDOM, teardownMockDOM } = require('./helpers/mock-dom');

// ---- Helpers ----

const viewerRoot = path.resolve(__dirname, '../..');

function loadSourceInto(relPath, sandbox) {
	const filePath = path.join(viewerRoot, relPath);
	const src = fs.readFileSync(filePath, 'utf-8');
	const script = new vm.Script(src, { filename: relPath });
	script.runInContext(sandbox);
}

function isArrayLike(x) {
	return x && typeof x === 'object' && typeof x.length === 'number';
}

/**
 * Create a sandbox with a controllable Three.js mock.
 * TextureLoader is replaced so tests can manually fire onLoad/onError.
 */
function createControllableSandbox() {
	const pendingTimeouts = [];
	const pendingRAF = [];
	let fakeNow = 0;

	const mockGlobal = {
		window: global.window,
		document: global.document,
		HTMLElement: global.HTMLElement,
		CustomEvent: global.CustomEvent,
		navigator: global.navigator,
		fetch: global.fetch,
		console: global.console,
		localStorage: global.localStorage,
		AbortController: global.AbortController,
		Phong360ViewerCore: undefined,
		Phong360MultiImage: undefined,
		Phong360LibraryUI: undefined,
		BaseRenderer: undefined,
		SlotRegistry: undefined,
		TemplateEngine: undefined,
		IntersectionObserver: undefined,
		setTimeout: function(fn, ms) {
			const id = pendingTimeouts.length;
			pendingTimeouts.push({ fn, at: fakeNow + (ms || 0), id });
			return id;
		},
		clearTimeout: function(id) {
			for (let i = 0; i < pendingTimeouts.length; i++) {
				if (pendingTimeouts[i].id === id) {
					pendingTimeouts.splice(i, 1); break;
				}
			}
		},
		requestAnimationFrame: function(fn) {
			const id = pendingRAF.length;
			pendingRAF.push({ fn, id });
			return id;
		},
		cancelAnimationFrame: function(id) {
			for (let i = 0; i < pendingRAF.length; i++) {
				if (pendingRAF[i].id === id) {
					pendingRAF.splice(i, 1); break;
				}
			}
		},
	};

	mockGlobal._advanceTimers = function(ms) {
		fakeNow += ms;
		const due = pendingTimeouts.filter(t => t.at <= fakeNow);
		due.sort((a, b) => a.at - b.at);
		for (const t of due) {
			const idx = pendingTimeouts.indexOf(t);
			if (idx !== -1) pendingTimeouts.splice(idx, 1);
		}
		for (const t of due) { try { t.fn(); } catch (e) { console.error('Timer error:', e); } }
	};

	mockGlobal._runAllTimers = function() {
		while (pendingTimeouts.length > 0) {
			const due = [...pendingTimeouts];
			pendingTimeouts.length = 0;
			due.sort((a, b) => a.at - b.at);
			if (due.length > 0) fakeNow = due[due.length - 1].at;
			for (const t of due) { try { t.fn(); } catch (e) { console.error('Timer error:', e); } }
		}
	};

	mockGlobal._flushRAF = function(maxIter) {
		const limit = maxIter || 50;
		let iters = 0;
		while (pendingRAF.length > 0 && iters < limit) {
			iters++;
			const batch = [...pendingRAF];
			pendingRAF.length = 0;
			for (const r of batch) { try { r.fn(fakeNow); } catch (e) { console.error('rAF error:', e); } }
		}
		if (iters >= limit && pendingRAF.length > 0) {
			console.warn('_flushRAF: hit iteration limit (animate loop active — expected)');
		}
	};

	mockGlobal._flushAll = function() {
		for (let i = 0; i < 20; i++) {
			// Cap inner rAF loop to avoid infinite spin from animate loop
			let rafIters = 0;
			while (pendingRAF.length > 0 && rafIters < 200) {
				rafIters++;
				const batch = [...pendingRAF];
				pendingRAF.length = 0;
				for (const r of batch) { try { r.fn(fakeNow); } catch (e) { console.error('rAF error:', e); } }
			}
			if (pendingTimeouts.length === 0) break;
			const due = [...pendingTimeouts];
			pendingTimeouts.length = 0;
			due.sort((a, b) => a.at - b.at);
			if (due.length > 0) fakeNow = due[due.length - 1].at;
			for (const t of due) { try { t.fn(); } catch (e) { console.error('Timer error:', e); } }
		}
	};

	const textureLoaders = [];
	mockGlobal._textureLoaders = textureLoaders;
	mockGlobal._lastTextureLoader = function() {
		return textureLoaders[textureLoaders.length - 1] || null;
	};

	mockGlobal.THREE = {
		MathUtils: {
			RAD2DEG: 57.29577951308232,
			DEG2RAD: 0.017453292519943295,
			degToRad: function(deg) { return deg * Math.PI / 180; },
			radToDeg: function(rad) { return rad * 180 / Math.PI; },
		},
		Vector2: class Vector2 { constructor(x = 0, y = 0) { this.x = x; this.y = y; } },
		Vector3: class Vector3 { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } },
		Quaternion: class Quaternion {},
		Euler: class Euler {},
		Matrix4: class Matrix4 {},
		Raycaster: class Raycaster {},
		Spherical: class Spherical {},
		PerspectiveCamera: class PerspectiveCamera {},
		WebGLRenderer: class WebGLRenderer {
			constructor() {
				this.domElement = { style: {}, parentNode: null };
				this.capabilities = { getMaxAnisotropy() { return 16; } };
				this.renderLists = { dispose() {} };
				this.properties = { get() { return null; } };
			}
			setSize() {}
			setClearColor() {}
			setPixelRatio() {}
			clear() {}
			render() {}
			dispose() {}
			getContext() { return { getExtension() { return null; } }; }
		},
		Scene: class Scene {
				constructor() {
					this.background = null;
					this._children = [];
				}
				add(child) { this._children.push(child); return child; }
				remove(child) {
					const idx = this._children.indexOf(child);
					if (idx !== -1) this._children.splice(idx, 1);
					return child;
				}
			},
		SphereGeometry: class SphereGeometry {},
		MeshBasicMaterial: class MeshBasicMaterial {},
		Mesh: class Mesh {},
		Texture: class Texture {
			constructor() { this.image = null; }
			dispose() {}
		},
		TextureLoader: class TextureLoader {
			constructor() {
				textureLoaders.push(this);
				this._pendingLoads = [];
			}
			load(url, onLoad, onProgress, onError) {
				this._pendingLoads.push({ url, onLoad, onProgress, onError });
				return {
					image: { width: 4096, height: 2048 },
					dispose() {},
					generateMipmaps: false,
					minFilter: null, magFilter: null,
					anisotropy: null, wrapS: null, wrapT: null,
					repeat: { x: 0 },
				};
			}
		},
		ShaderMaterial: class ShaderMaterial {
			constructor(opts) {
				this.uniforms = opts.uniforms || {};
				this.vertexShader = opts.vertexShader || '';
				this.fragmentShader = opts.fragmentShader || '';
				this.program = null;
			}
			dispose() {}
		},
		PlaneGeometry: class PlaneGeometry {},
		OrthographicCamera: class OrthographicCamera {
			constructor() { this.position = { z: 0 }; }
		},
		LinearMipmapLinearFilter: 1008,
		LinearFilter: 1006,
		NearestFilter: 1003,
		ClampToEdgeWrapping: 1001,
		RepeatWrapping: 1000,
		RGBAFormat: 1023,
		UnsignedByteType: 1009,
		DoubleSide: 2,
		Color: class Color { constructor(c) { this.c = c; } },
	};

	return vm.createContext(mockGlobal);
}

function getPendingLoad(sandbox) {
	const tl = sandbox._lastTextureLoader();
	if (!tl || !tl._pendingLoads || tl._pendingLoads.length === 0) return null;
	return tl._pendingLoads[tl._pendingLoads.length - 1];
}

function makeMockTexture(w, h) {
	return {
		image: { width: w || 4096, height: h || 2048 },
		dispose() {},
		generateMipmaps: false,
		minFilter: null, magFilter: null,
		anisotropy: null, wrapS: null, wrapT: null,
		repeat: { x: 0 },
	};
}

function makeMockEl() {
	const children = [];
	const el = {
		style: { setProperty() {}, getPropertyValue() {} },
		_parent: null,
		_children: children,
		get children() { return children; },
		get firstChild() { return children[0] || null; },
		get lastChild() { return children[children.length - 1] || null; },
		className: '',
		innerHTML: '',
		textContent: '',
		tagName: 'DIV',
		id: '',
		classList: {
			_list: [],
			add(...names) { for (const n of names) { if (!this._list.includes(n)) this._list.push(n); } },
			remove(...names) { this._list = this._list.filter((c) => !names.includes(c)); },
			contains(name) { return this._list.includes(name); },
			toggle(name) { if (this._list.includes(name)) { this._list = this._list.filter((c) => c !== name); return false; } this._list.push(name); return true; },
		},
		appendChild(child) { child._parent = this; children.push(child); return child; },
		removeChild(child) { child._parent = null; const idx = children.indexOf(child); if (idx !== -1) children.splice(idx, 1); return child; },
		insertBefore(newChild, refChild) { newChild._parent = this; const idx = refChild ? children.indexOf(refChild) : children.length; children.splice(idx === -1 ? children.length : idx, 0, newChild); return newChild; },
		remove() { if (this._parent) this._parent.removeChild(this); },
		contains(child) { return children.includes(child); },
		querySelector() { return null; },
		querySelectorAll() { return []; },
		setAttribute() {},
		getAttribute() { return null; },
		addEventListener() {},
		removeEventListener() {},
	};
	return el;
}

// ---- Fixtures ----

function makeFixtureImage(id) {
	return {
		id: id || 'img-1',
		slug: 'test-pano',
		title: 'Test Panorama',
		thumbnail: 'https://example.com/thumb/test.jpg',
		resolutions: [
			{ id: '8k', label: '8K', width: 8192, height: 4096, url: '/pano/test-8k.jpg', path: '/pano/test-8k.jpg' },
			{ id: '4k', label: '4K', width: 4096, height: 2048, url: '/pano/test-4k.jpg', path: '/pano/test-4k.jpg' },
		],
	};
}

function makeFixtureManifest() {
	return {
		version: 4,
		context: { scope: 'profile', profile: { username: 'testuser', displayName: 'Test User' }, theme: { default: 'dark' } },
		sections: [{ id: 'sec-1', title: 'Test Section', template: 'grid', collapsible: true, collapsed: false, images: [makeFixtureImage('img-1'), makeFixtureImage('img-2')] }],
		facets: { model: [{ id: 'sdxl', label: 'SDXL', count: 2 }] },
	};
}

function makeMockGetElementById() {
	return function(id) {
		const el = global.document.createElement('div');
		el.id = id;
		el.style = { setProperty() {}, getPropertyValue() {} };
		el._children = [];
		el.appendChild = function(child) { child._parent = el; el._children.push(child); return child; };
		el.removeChild = function(child) { child._parent = null; const idx = el._children.indexOf(child); if (idx !== -1) el._children.splice(idx, 1); return child; };
		el.querySelectorAll = function() { return []; };
		el.querySelector = function() { return null; };
		el.setAttribute = function(name, value) { this[name] = value; };
		el.getAttribute = function(name) { return this[name] || null; };
		el.hasAttribute = function(name) { return name in this && this[name] !== undefined; };
		el.removeAttribute = function(name) { delete this[name]; };
		el.closest = function() { return null; };
		el.getBoundingClientRect = function() { return { x: 0, y: 0, width: 1920, height: 1080, top: 0, left: 0, right: 0, bottom: 0 }; };
		el.clientWidth = 1920; el.clientHeight = 1080;
		el.classList = { _list: [], add() {}, remove() {}, contains() { return false; }, toggle() {}, replace() {} };
		el.addEventListener = function() {}; el.removeEventListener = function() {}; el.focus = function() {}; el.blur = function() {};
		el.dispatchEvent = function() {};
		return el;
	};
}

// ============================================================================
// Part 1: Core loadImage timing
// ============================================================================

async function runPart1() {
	console.log('Part 1: Core loadImage timing');

	setupMockDOM();
	const sandbox = createControllableSandbox();

	const origRAF = global.window.requestAnimationFrame;
	const origCAF = global.window.cancelAnimationFrame;
	global.window.requestAnimationFrame = sandbox.requestAnimationFrame;
	global.window.cancelAnimationFrame = sandbox.cancelAnimationFrame;

	global.document.getElementById = function(id) {
		const el = global.document.createElement('div');
		el.id = id;
		el.style = { setProperty() {}, getPropertyValue() {} };
		el._children = [];
		el.appendChild = function(child) { child._parent = el; el._children.push(child); return child; };
		el.removeChild = function(child) { child._parent = null; const idx = el._children.indexOf(child); if (idx !== -1) el._children.splice(idx, 1); return child; };
		el.querySelectorAll = function() { return []; };
		el.querySelector = function(sel) { return null; };
		el.setAttribute = function(name, value) { this[name] = value; };
		return el;
	};

	loadSourceInto('core/phong-360-viewer-core.js', sandbox);
	const Core = sandbox.window.Phong360ViewerCore;
	assert.ok(Core, 'Phong360ViewerCore available');

	// Helper: yield to real event loop so microtasks (Promise.then) drain
	const yieldMicro = () => new Promise(r => setTimeout(r, 0));

	// Test 1.1: loadImage resolves after hideLoading fade-out
	console.log('  Test 1.1: loadImage resolves after fade-out');
	{
		const core = new Core({ containerId: 'test-container' });
		sandbox._flushRAF(2); // let initial animate+rAF settle
		const overlay = core.loadingOverlay;
		assert.ok(overlay, 'loading overlay exists');
		assert.strictEqual(overlay.style.display, 'flex', 'overlay visible initially');

		let loadResolved = false;
		let loadRejected = false;
		core.loadImage('http://example.com/pano.jpg', 4096, 2048).then(() => { loadResolved = true; }).catch(() => { loadRejected = true; });

		assert.strictEqual(loadResolved, false, 'not resolved before texture loads');
		assert.strictEqual(loadRejected, false, 'not rejected');

		const pending = getPendingLoad(sandbox);
		assert.ok(pending, 'TextureLoader.load called');
		assert.ok(pending.url.includes('pano.jpg'), 'URL matches');

		pending.onLoad(makeMockTexture(4096, 2048));
		// Yield to real event loop so fadeInPromise.then microtask fires
		await yieldMicro();
		sandbox._flushAll();
		await yieldMicro();

		assert.strictEqual(loadResolved, true, 'resolves after full chain');
		assert.strictEqual(loadRejected, false, 'does not reject');
		assert.strictEqual(overlay.style.display, 'none', 'overlay hidden after fade');
		core.destroy();
		console.log('    Test 1.1: PASS');
	}

	// Test 1.2: loadImage rejects on error
	console.log('  Test 1.2: loadImage rejects on error');
	{
		const core = new Core({ containerId: 'test-container-2' });
		sandbox._flushRAF(2);

		core.loadImage('http://example.com/first.jpg', 4096, 2048);
		let firstPending = getPendingLoad(sandbox);
		firstPending.onLoad(makeMockTexture(4096, 2048));
		await yieldMicro();
		sandbox._flushAll();
		await yieldMicro();

		let errorReceived = false;
		core.loadImage('http://example.com/bad.jpg', 4096, 2048).catch(() => { errorReceived = true; });
		let secondPending = getPendingLoad(sandbox);
		secondPending.onError(new Error('Network error'));
		await yieldMicro();
		sandbox._flushAll();
		await yieldMicro();

		assert.strictEqual(errorReceived, true, 'rejects on error');
		core.destroy();
		console.log('    Test 1.2: PASS');
	}

	// Test 1.3: Last-write-wins at core level
	// Per design § "selectImage: last-write-wins concurrency": superseded loads
	// must RESOLVE (with null sentinel), not hang. Otherwise awaiting selectImage()
	// callers (e.g. owner-mode batch loads) accumulate hung promises.
	console.log('  Test 1.3: Last-write-wins (core level)');
	{
		const core = new Core({ containerId: 'test-container-3' });
		sandbox._flushRAF(2);

		let aResolved = false, bResolved = false, aValue, bValue;
		core.loadImage('http://example.com/a.jpg', 4096, 2048).then((v) => { aResolved = true; aValue = v; });
		const loadA = getPendingLoad(sandbox);

		core.loadImage('http://example.com/b.jpg', 4096, 2048).then((v) => { bResolved = true; bValue = v; });
		const loadB = getPendingLoad(sandbox);

		loadB.onLoad(makeMockTexture(4096, 2048));
		await yieldMicro();
		sandbox._flushAll();
		await yieldMicro();
		assert.strictEqual(bResolved, true, 'B resolves');
		assert.notStrictEqual(bValue, null, 'B resolves with texture, not null');
		assert.strictEqual(aResolved, false, 'A not resolved yet (no stale completion arrived)');

		// A's texture finally arrives after B already won — must resolve(null), not hang.
		loadA.onLoad(makeMockTexture(4096, 2048));
		await yieldMicro();
		sandbox._flushAll();
		await yieldMicro();
		assert.strictEqual(aResolved, true, 'A resolves on stale completion (must not hang)');
		assert.strictEqual(aValue, null, 'A resolves with null sentinel for superseded load');
		core.destroy();
		console.log('    Test 1.3: PASS');
	}

	global.window.requestAnimationFrame = origRAF;
	global.window.cancelAnimationFrame = origCAF;
	teardownMockDOM();
	console.log('Part 1: All core timing tests passed.\n');
}

// ============================================================================
// Part 2: Multi-image loadImageWithResolution
// ============================================================================

async function runPart2() {
	console.log('Part 2: Multi-image loadImageWithResolution');

	setupMockDOM();
	const sandbox = createControllableSandbox();

	sandbox.window.Phong360ViewerCore = class {
		constructor(opts) {
			this.options = opts;
			this.config = { sensitivity: {}, viewRotation: { autoRotate: false, autoRotationRate: 0 }, controls: { enableZoom: true, enablePan: true }, fov: { init: 150, initTarget: 100 }, loading: { backgroundColor: '#000', fadeInDuration: 500, fadeOutDuration: 500 } };
			this.container = {};
			this.isLoading = false; this.isFirstLoad = false; this._loadToken = 0;
			this.renderer = { domElement: { style: {} }, capabilities: { getMaxAnisotropy() { return 16; } }, renderLists: { dispose() {} }, setSize() {}, clear() {}, properties: { get() { return null; } }, getContext() { return null; } };
			this.mesh = { material: null }; this.scene = {}; this.camera = {};
			this.loadingOverlay = { style: { display: 'none', opacity: '0', transition: '' } };
			this.config = { loading: { fadeOutDuration: 0, fadeInDuration: 0, backgroundColor: '#000' } };
		}
		hideLoading() { return Promise.resolve(); }
		fadeInLoading() { return Promise.resolve(); }
		showLoading() {}
		applyTexture() {}
		disposeCurrentTexture() {}
	};
	sandbox.window.Phong360ViewerCore.prototype.loadImage = function() {
		++this._loadToken; this.isLoading = true;
		return Promise.resolve({ image: { width: 4096, height: 2048 } });
	};

	loadSourceInto('extensions/phong-360-multi-image.js', sandbox);
	const MultiImage = sandbox.window.Phong360MultiImage;
	assert.ok(MultiImage, 'Phong360MultiImage available');

	// Test 2.1: events fire in order
	console.log('  Test 2.1: event emission order');
	{
		const core = new sandbox.window.Phong360ViewerCore({});
		const events = [];
		const mi = new MultiImage({ core, images: [makeFixtureImage('img-1')] });
		mi.on('image:load-request', (p) => events.push({ event: 'image:load-request', payload: p }));
		mi.on('image:visible', (p) => events.push({ event: 'image:visible', payload: p }));

		const img = makeFixtureImage('img-1');
		const res = img.resolutions[0];
		const promise = mi.loadImageWithResolution(img, res);
		assert.ok(promise && typeof promise.then === 'function', 'returns a Promise');
		await promise;

		assert.strictEqual(events.length, 2, '2 events');
		assert.strictEqual(events[0].event, 'image:load-request', 'first: image:load-request');
		assert.strictEqual(events[1].event, 'image:visible', 'second: image:visible');
		assert.deepStrictEqual(events[0].payload.image, img, 'load-request has image');
		assert.deepStrictEqual(events[1].payload.image, img, 'visible has image');
		console.log('    Test 2.1: PASS');
	}

	// Test 2.2: onImageLoad fires after image:visible
	console.log('  Test 2.2: onImageLoad fires after image:visible');
	{
		const core = new sandbox.window.Phong360ViewerCore({});
		const timeline = [];
		const mi = new MultiImage({
			core, images: [makeFixtureImage('img-1')],
			callbacks: { onImageLoad: () => timeline.push('onImageLoad') }
		});
		mi.on('image:visible', () => timeline.push('image:visible'));
		const img = makeFixtureImage('img-1');
		await mi.loadImageWithResolution(img, img.resolutions[0]);
		assert.deepStrictEqual(timeline, ['image:visible', 'onImageLoad'], 'image:visible fires before onImageLoad');
		console.log('    Test 2.2: PASS');
	}

	// Test 2.3: image:error on failure
	console.log('  Test 2.3: image:error on failure');
	{
		const core = new sandbox.window.Phong360ViewerCore({});
		core.loadImage = function() { ++this._loadToken; this.isLoading = true; return Promise.reject(new Error('Texture load failed')); };
		const events = [];
		const mi = new MultiImage({ core, images: [] });
		mi.on('image:load-request', (p) => events.push({ event: 'image:load-request', payload: p }));
		mi.on('image:visible', (p) => events.push({ event: 'image:visible', payload: p }));
		mi.on('image:error', (p) => events.push({ event: 'image:error', payload: p }));

		const img = makeFixtureImage('img-1');
		try { await mi.loadImageWithResolution(img, img.resolutions[0]); } catch (e) {}
		assert.strictEqual(events.length, 2, '2 events');
		assert.strictEqual(events[0].event, 'image:load-request', 'first: image:load-request');
		assert.strictEqual(events[1].event, 'image:error', 'second: image:error');
		assert.strictEqual(events[1].payload.error, 'Texture load failed', 'error message');
		console.log('    Test 2.3: PASS');
	}

	teardownMockDOM();
	console.log('Part 2: All multi-image tests passed.\n');
}

// ============================================================================
// Part 3: Library-ui selectImage (manifest path)
// ============================================================================

async function runPart3() {
	console.log('Part 3: Library-ui selectImage event chain');

	setupMockDOM();
	const sandbox = createControllableSandbox();

	sandbox.window.Phong360ViewerCore = class {
		constructor(opts) {
			this.options = opts;
			this.config = { viewRotation: { autoRotate: false, autoRotationRate: 0 }, controls: { enableZoom: true, enablePan: true }, fov: { init: 150, initTarget: 100 }, loading: { backgroundColor: '#000', fadeInDuration: 500, fadeOutDuration: 500 }, sensitivity: {} };
			this.container = {}; this.canvas = null; this.projectionType = 1; this.isLoading = false; this._loadToken = 0;
			this.renderer = { domElement: { style: {} }, capabilities: { getMaxAnisotropy() { return 16; } }, renderLists: { dispose() {} }, setSize() {}, clear() {}, properties: { get() { return null; } }, getContext() { return null; } };
			this.mesh = { material: null }; this.scene = {}; this.camera = {};
			this.loadingOverlay = { style: { display: 'none', opacity: '0', transition: '' } };
			this.isFirstLoad = false; this.boundHandlers = {};
		}
		switchProjection(type) { this.projectionType = type; }
		destroy() {}
		loadImage() { this._loadToken++; this.isLoading = true; return Promise.resolve(); }
		hideLoading() { return Promise.resolve(); }
		fadeInLoading() { return Promise.resolve(); }
		showLoading() {}
		applyTexture() {}
		disposeCurrentTexture() {}
	};

	global.document.getElementById = makeMockGetElementById();
	global.IntersectionObserver = class { constructor(fn) {} observe() {} unobserve() {} disconnect() {} };
	sandbox.IntersectionObserver = global.IntersectionObserver;

	loadSourceInto('extensions/phong-360-multi-image.js', sandbox);
	loadSourceInto('extensions/phong-360-library-ui.js', sandbox);
	const LibraryUI = sandbox.window.Phong360LibraryUI;
	assert.ok(LibraryUI, 'Phong360LibraryUI available');

	// Test 3.1: selectImage event chain order
	console.log('  Test 3.1: selectImage event chain');
	{
		const instance = Object.create(LibraryUI.prototype);
		const img = makeFixtureImage('img-1');
		const img2 = makeFixtureImage('img-2');
		instance.libraryData = makeFixtureManifest();
		instance._context = instance.libraryData.context;
		instance._sections = instance.libraryData.sections;
		instance._allImages = [img, img2];
		instance._currentImageId = null; instance._currentImageData = null;
		instance._isLoading = false; instance._loadingPhase = 'idle';
		instance._abortController = null; instance._loadToken = 0; instance._selectToken = 0;
		instance._listeners = new Map(); instance._containerEl = makeMockEl(); instance._contentEl = makeMockEl();
		instance._infoBar = null; instance._resolutionMode = 'auto'; instance._activeResolution = '4k';
		instance._destroyed = false;
		instance.callbacks = { onImageLoad: null, onImageSelect: null, onImageError: null };

		instance.multiViewer = {
			selectOptimalResolution(resolutions) { return resolutions[0]; },
			loadImageWithResolution(imageData, resolution) {
				instance.emit('image:load-request', { image: { ...imageData }, resolution: resolution.id });
				return Promise.resolve().then(() => {
					instance.emit('image:visible', { image: { ...imageData }, resolution: resolution.id });
				});
			},
		};

		const events = [];
		for (const name of ['image:select', 'loading:start', 'loading:end', 'image:load-request', 'image:visible', 'image:error']) {
			instance.on(name, (p) => events.push({ event: name, payload: p }));
		}

		await instance.selectImage('img-1');
		const order = events.map(e => e.event);
		assert.deepStrictEqual(order, ['image:select', 'loading:start', 'image:load-request', 'image:visible', 'loading:end'], 'event order matches design doc');
		assert.strictEqual(events[1].payload.source, 'image', 'loading:start source=image');
		assert.strictEqual(events[4].payload.source, 'image', 'loading:end source=image');
		assert.strictEqual(events[4].payload.success, true, 'loading:end success=true');
		assert.strictEqual(events[0].payload.id, 'img-1', 'image:select correct id');
		console.log('    Test 3.1: PASS');
	}

	// Test 3.2: selectImage throws without library data
	console.log('  Test 3.2: selectImage throws without library data');
	{
		const instance = Object.create(LibraryUI.prototype);
		instance.libraryData = null; instance._allImages = []; instance._listeners = new Map();
		try {
			await instance.selectImage('img-1');
			assert.fail('Should have thrown');
		} catch (e) {
			assert.ok(e.message.includes('no library data'), 'throws without library data');
		}
		console.log('    Test 3.2: PASS');
	}

	teardownMockDOM();
	console.log('Part 3: All selectImage tests passed.\n');
}

// ============================================================================
// Part 4: Library-ui loadImage (raw URL path)
// ============================================================================

async function runPart4() {
	console.log('Part 4: Library-ui loadImage (raw URL path)');

	setupMockDOM();
	const sandbox = createControllableSandbox();

	sandbox.window.Phong360ViewerCore = class { constructor(opts) { this.options = opts; this.config = { sensitivity: {} }; } loadImage() { return Promise.resolve(); } destroy() {} };
	sandbox.window.Phong360MultiImage = class {};
	global.IntersectionObserver = class {}; sandbox.IntersectionObserver = global.IntersectionObserver;

	loadSourceInto('extensions/phong-360-library-ui.js', sandbox);
	const LibraryUI = sandbox.window.Phong360LibraryUI;
	assert.ok(LibraryUI, 'LibraryUI available');

	// Test 4.1: raw URL event payloads
	console.log('  Test 4.1: raw URL event payloads');
	{
		const instance = Object.create(LibraryUI.prototype);
		instance.core = { loadImage() { return Promise.resolve(); } };
		instance._isLoading = false; instance._loadingPhase = 'idle';
		instance._listeners = new Map(); instance.callbacks = {};
		instance.libraryData = null; instance._allImages = [];
		instance._currentImageId = null; instance._currentImageData = null;

		const events = [];
		instance.on('image:load-request', (p) => events.push({ event: 'image:load-request', payload: p }));
		instance.on('image:visible', (p) => events.push({ event: 'image:visible', payload: p }));
		await instance.loadImage('http://example.com/raw-pano.jpg');

		assert.strictEqual(events.length, 2, '2 events');
		assert.strictEqual(events[0].event, 'image:load-request');
		assert.strictEqual(events[0].payload.url, 'http://example.com/raw-pano.jpg');
		assert.strictEqual(Object.keys(events[0].payload).length, 1, 'only url key');
		assert.strictEqual(events[1].event, 'image:visible');
		assert.strictEqual(events[1].payload.url, 'http://example.com/raw-pano.jpg');
		assert.strictEqual(Object.keys(events[1].payload).length, 1, 'only url key');
		console.log('    Test 4.1: PASS');
	}

	// Test 4.2: getCurrentImage null after raw URL
	console.log('  Test 4.2: getCurrentImage null after raw URL');
	{
		const instance = Object.create(LibraryUI.prototype);
		instance.core = { loadImage() { return Promise.resolve(); } };
		instance._isLoading = false; instance._loadingPhase = 'idle';
		instance._listeners = new Map(); instance._currentImageData = null;
		instance._currentImageId = null; instance._allImages = [];
		instance.libraryData = null; instance.callbacks = {};

		assert.strictEqual(instance.getCurrentImage(), null, 'null before load');
		await instance.loadImage('http://example.com/pano.jpg');
		assert.strictEqual(instance.getCurrentImage(), null, 'null after raw load');
		console.log('    Test 4.2: PASS');
	}

	teardownMockDOM();
	console.log('Part 4: All raw URL tests passed.\n');
}

// ============================================================================
// Part 5: Full event chain ordering
// ============================================================================

async function runPart5() {
	console.log('Part 5: Full event chain ordering');

	setupMockDOM();
	const sandbox = createControllableSandbox();

	sandbox.window.Phong360ViewerCore = class {
		constructor(opts) {
			this.options = opts;
			this.config = { viewRotation: { autoRotate: false, autoRotationRate: 0 }, controls: { enableZoom: true, enablePan: true }, fov: { init: 150, initTarget: 100 }, loading: { backgroundColor: '#000', fadeInDuration: 500, fadeOutDuration: 500 }, sensitivity: {} };
			this.container = {}; this.projectionType = 1; this.isLoading = false; this._loadToken = 0;
			this.mesh = { material: null };
			this.renderer = { domElement: { style: {} }, capabilities: { getMaxAnisotropy() { return 16; } }, renderLists: { dispose() {} }, properties: { get() { return null; } } };
			this.scene = {}; this.camera = {};
			this.loadingOverlay = { style: { display: 'none', opacity: '0' } };
			this.isFirstLoad = false; this.boundHandlers = {};
		}
		switchProjection() {} destroy() {}
		loadImage() { this._loadToken++; return Promise.resolve(); }
		hideLoading() { return Promise.resolve(); }
		fadeInLoading() { return Promise.resolve(); }
		showLoading() {} applyTexture() {}
	};

	global.document.getElementById = makeMockGetElementById();
	global.IntersectionObserver = class { constructor(fn) {} observe() {} unobserve() {} disconnect() {} };
	sandbox.IntersectionObserver = global.IntersectionObserver;

	loadSourceInto('extensions/phong-360-multi-image.js', sandbox);
	loadSourceInto('extensions/phong-360-library-ui.js', sandbox);
	const LibraryUI = sandbox.window.Phong360LibraryUI;

	console.log('  Test 5.1: Full event chain order');
	{
		const instance = Object.create(LibraryUI.prototype);
		const manifest = makeFixtureManifest();
		instance.libraryData = null; instance._allImages = []; instance._sections = []; instance._context = null;
		instance._currentImageId = null; instance._currentImageData = null;
		instance._isLoading = false; instance._loadingPhase = 'idle';
		instance._abortController = null; instance._loadToken = 0; instance._selectToken = 0;
		instance._listeners = new Map();
		instance._containerEl = makeMockEl();
		instance._contentEl = makeMockEl(); instance._infoBar = null;
		instance._resolutionMode = 'auto'; instance._activeResolution = '4k';
		instance._modelFilterState = { architectures: new Set(), models: new Set(), includeCustom: false, includeUnknown: false };
		instance._destroyed = false; instance._sidebar = null; instance._backdrop = null;
		instance.libraryUrl = 'http://example.com/library.json';
		instance.baseUrl = ''; instance._accent = null; instance._theme = 'dark';
		instance._slotWrappers = {}; instance._slots = { renderAll() {} }; instance._contextLoaded = false;
		instance.callbacks = { onLibraryLoad: null, onContextReady: null, onImageLoad: null, onImageSelect: null, onSectionsRendered: null };
		instance.templateEngine = { render() { return makeMockEl(); }, renderSectionItems() { return []; } };
		instance._imageBaseUrl = '';
		instance._ownerState = { truncated: false };

		instance.multiViewer = {
			selectOptimalResolution(resolutions) { return resolutions[0]; },
			setImages() {},
			loadFirstImage() {},
			loadImageById() {},
			loadImageWithResolution(imageData, resolution) {
				instance.emit('image:load-request', { image: { ...imageData }, resolution: resolution.id });
				return Promise.resolve().then(() => {
					instance.emit('image:visible', { image: { ...imageData }, resolution: resolution.id });
				});
			},
		};

		const fullTrace = [];
		const trackedEvents = ['ready', 'loading:start', 'loading:progress', 'loading:end', 'library:load', 'library:error', 'context:ready', 'image:select', 'image:load-request', 'image:visible', 'image:error'];
		for (const name of trackedEvents) {
			instance.on(name, (p) => fullTrace.push({ event: name, payload: p }));
		}

		// Emit ready
		instance.emit('ready');

		// Simulate loadLibrary
		sandbox.fetch = async (url) => ({ ok: true, json: async () => manifest });
		instance.emit('loading:start', { source: 'library' });
		await instance.loadLibrary();

		// Select image
		await instance.selectImage('img-1');

		const stateMachineTrace = fullTrace.filter(e => e.event !== 'loading:progress');
		const order = stateMachineTrace.map(e => e.event);
		console.log('    Event order:', order.join(' → '));

		const idx = (evt) => order.indexOf(evt);
		assert.strictEqual(order[0], 'ready', 'first: ready');
		assert.ok(idx('loading:start') < idx('library:load'), 'loading:start before library:load');
		assert.ok(idx('library:load') < idx('context:ready'), 'library:load before context:ready');
		assert.ok(idx('context:ready') < idx('loading:end'), 'context:ready before loading:end');

		const firstLoadingEnd = order.indexOf('loading:end');
		assert.ok(firstLoadingEnd < idx('image:select'), 'loading:end(library) before image:select');

		const imageSelectIdx = order.indexOf('image:select', firstLoadingEnd);
		const imageLoadStart = order.indexOf('loading:start', imageSelectIdx);
		const imageLoadReq = order.indexOf('image:load-request', imageLoadStart);
		const imageVisible = order.indexOf('image:visible', imageLoadReq);
		const imageLoadEnd = order.indexOf('loading:end', imageVisible);

		assert.ok(imageSelectIdx !== -1 && imageLoadStart !== -1 && imageLoadReq !== -1 && imageVisible !== -1 && imageLoadEnd !== -1, 'all image events present');
		assert.ok(imageSelectIdx < imageLoadStart, 'image:select before loading:start(image)');
		assert.ok(imageLoadStart < imageLoadReq, 'loading:start before image:load-request');
		assert.ok(imageLoadReq < imageVisible, 'image:load-request before image:visible');
		assert.ok(imageVisible < imageLoadEnd, 'image:visible before loading:end(image)');
		console.log('    Test 5.1: PASS');
	}

	teardownMockDOM();
	console.log('Part 5: Full event chain tests passed.\n');
}

// ============================================================================
// Part 6: Library lifecycle semantics
// ============================================================================

async function runPart6() {
	console.log('Part 6: Library lifecycle semantics');

	setupMockDOM();
	const sandbox = createControllableSandbox();

	sandbox.window.Phong360ViewerCore = class {
		constructor(opts) {
			this.options = opts;
			this.config = { viewRotation: { autoRotate: false, autoRotationRate: 0 }, controls: { enableZoom: true, enablePan: true }, fov: { init: 150, initTarget: 100 }, loading: { backgroundColor: '#000', fadeInDuration: 500, fadeOutDuration: 500 }, sensitivity: {} };
			this.container = {}; this.projectionType = 1; this.isLoading = false;
			this.mesh = { material: null };
			this.renderer = { domElement: { style: {} }, capabilities: { getMaxAnisotropy() { return 16; } }, renderLists: { dispose() {} }, properties: { get() { return null; } } };
			this.scene = {}; this.camera = {};
			this.loadingOverlay = { style: { display: 'none', opacity: '0' } };
			this.isFirstLoad = false; this.boundHandlers = {};
		}
		switchProjection() {} destroy() {}
	};

	global.document.getElementById = makeMockGetElementById();
	global.IntersectionObserver = class { constructor(fn) {} observe() {} unobserve() {} disconnect() {} };
	sandbox.IntersectionObserver = global.IntersectionObserver;

	loadSourceInto('extensions/phong-360-multi-image.js', sandbox);
	loadSourceInto('extensions/phong-360-library-ui.js', sandbox);
	const LibraryUI = sandbox.window.Phong360LibraryUI;

	// Test 6.1: loadLibrary lifecycle
	console.log('  Test 6.1: loadLibrary(url) lifecycle');
	{
		const instance = Object.create(LibraryUI.prototype);
		const manifest = makeFixtureManifest();
		instance.libraryData = null; instance._allImages = []; instance._sections = []; instance._context = null;
		instance._isLoading = false; instance._loadingPhase = 'idle'; instance._abortController = null;
		instance._listeners = new Map();
		instance._containerEl = makeMockEl(); instance._contentEl = makeMockEl();
		instance._sidebar = makeMockEl(); instance._backdrop = null;
		instance.libraryUrl = 'http://example.com/library.json';
		instance.baseUrl = ''; instance._accent = null; instance._theme = 'dark';
		instance._slotWrappers = {}; instance._contextLoaded = true; instance._modelFilterState = { architectures: new Set(), models: new Set(), includeCustom: false, includeUnknown: false };
		instance.callbacks = { onLibraryLoad: null, onContextReady: null };
				instance.multiViewer = { setImages() {}, loadFirstImage() {}, loadImageById() {} };
		instance.templateEngine = { render() { return makeMockEl(); }, renderSectionItems() { return []; } };
		instance._imageBaseUrl = '';
		instance._ownerState = { truncated: false };

		const events = [];
		instance.on('library:load', (p) => events.push({ event: 'library:load', payload: p }));
		instance.on('context:ready', (p) => events.push({ event: 'context:ready', payload: p }));
		instance.on('library:error', (p) => events.push({ event: 'library:error', payload: p }));

		sandbox.fetch = async (url) => ({ ok: true, json: async () => manifest });
		await instance.loadLibrary();

		assert.strictEqual(events.length, 2, 'library:load + context:ready');
		assert.strictEqual(events[0].event, 'library:load');
		assert.strictEqual(events[1].event, 'context:ready');
		assert.ok(events[0].payload.manifest, 'has manifest');
		assert.ok(events[0].payload.context, 'has context');
		assert.ok(isArrayLike(events[0].payload.sections), 'has sections');
		assert.ok(isArrayLike(events[0].payload.images), 'has images');
		assert.ok(events[0].payload.facets, 'has facets');
		console.log('    Test 6.1: PASS');
	}

	// Test 6.2: setLibrary preempts loadLibrary
	console.log('  Test 6.2: setLibrary preempts in-flight loadLibrary');
	{
		const instance = Object.create(LibraryUI.prototype);
		const manifest = makeFixtureManifest();
		const overrideManifest = makeFixtureManifest();
		overrideManifest.context.scope = 'collection';

		instance.libraryData = null; instance._allImages = []; instance._sections = []; instance._context = null;
		instance._isLoading = false; instance._loadingPhase = 'idle'; instance._abortController = null;
		instance._listeners = new Map();
		instance._containerEl = makeMockEl(); instance._contentEl = makeMockEl();
		instance._sidebar = makeMockEl();
		instance.libraryUrl = 'http://example.com/library.json';
		instance.baseUrl = ''; instance._accent = null; instance._theme = 'dark';
		instance._slotWrappers = {}; instance._contextLoaded = true; instance._modelFilterState = { architectures: new Set(), models: new Set(), includeCustom: false, includeUnknown: false };
		instance.callbacks = { onLibraryLoad: null, onContextReady: null };
				instance.multiViewer = { setImages() {}, loadFirstImage() {}, loadImageById() {} };
		instance.templateEngine = { render() { return makeMockEl(); }, renderSectionItems() { return []; } };
		instance._imageBaseUrl = '';
		instance._ownerState = { truncated: false };

		const events = [];
		instance.on('library:load', (p) => events.push({ event: 'library:load', payload: p }));

		// Mock a slow fetch
		sandbox.fetch = async (url) => {
			await new Promise(resolve => setTimeout(resolve, 100));
			if (instance._abortController && instance._abortController.signal && instance._abortController.signal.aborted) {
				throw new Error('Aborted');
			}
			return { ok: true, json: async () => manifest };
		};

		const libPromise = instance.loadLibrary();
		// Immediately replace with setLibrary
		instance.setLibrary(overrideManifest);
		await libPromise;

		assert.strictEqual(events.length, 1, 'exactly one library:load');
		assert.strictEqual(events[0].payload.context.scope, 'collection', 'library:load for replacement');
		console.log('    Test 6.2: PASS');
	}

	// Test 6.3: reloadLibrary after URL-backed load
	console.log('  Test 6.3: reloadLibrary after URL-backed load');
	{
		const instance = Object.create(LibraryUI.prototype);
		const manifest = makeFixtureManifest();
		instance.libraryData = manifest;
		instance._allImages = manifest.sections[0].images;
		instance._sections = manifest.sections;
		instance._context = manifest.context;
		instance._isLoading = false; instance._loadingPhase = 'idle'; instance._abortController = null;
		instance._listeners = new Map();
		instance._containerEl = makeMockEl(); instance._contentEl = makeMockEl();
		instance._sidebar = makeMockEl();
		instance.libraryUrl = 'http://example.com/library.json';
		instance.baseUrl = ''; instance._accent = null; instance._theme = 'dark';
		instance._slotWrappers = {}; instance._contextLoaded = true; instance._modelFilterState = { architectures: new Set(), models: new Set(), includeCustom: false, includeUnknown: false };
		instance.callbacks = { onLibraryLoad: null, onContextReady: null };
				instance.multiViewer = { setImages() {}, loadFirstImage() {}, loadImageById() {} };
		instance.templateEngine = { render() { return makeMockEl(); }, renderSectionItems() { return []; } };
		instance._imageBaseUrl = '';
		instance._ownerState = { truncated: false };

		let fetchCalled = false;
		sandbox.fetch = async (url) => { fetchCalled = true; return { ok: true, json: async () => manifest }; };
		await instance.reloadLibrary();
		assert.strictEqual(fetchCalled, true, 'reloadLibrary re-fetches URL');
		console.log('    Test 6.3: PASS');
	}

	// Test 6.4: reloadLibrary after setLibrary
	console.log('  Test 6.4: reloadLibrary after setLibrary (no URL)');
	{
		const instance = Object.create(LibraryUI.prototype);
		const manifest = makeFixtureManifest();
		instance.libraryData = manifest;
		instance._allImages = manifest.sections[0].images;
		instance._sections = manifest.sections;
		instance._context = manifest.context;
		instance._isLoading = false; instance._loadingPhase = 'idle'; instance._abortController = null;
		instance._listeners = new Map();
		instance._containerEl = makeMockEl(); instance._contentEl = makeMockEl();
		instance._sidebar = makeMockEl();
		instance.libraryUrl = null; // No URL
		instance.baseUrl = ''; instance._accent = null; instance._theme = 'dark';
		instance._slotWrappers = {}; instance._contextLoaded = true; instance._modelFilterState = { architectures: new Set(), models: new Set(), includeCustom: false, includeUnknown: false };
		instance.callbacks = { onLibraryLoad: null, onContextReady: null };
				instance.multiViewer = { setImages() {}, loadFirstImage() {}, loadImageById() {} };
		instance.templateEngine = { render() { return makeMockEl(); }, renderSectionItems() { return []; } };
		instance._imageBaseUrl = '';
		instance._ownerState = { truncated: false };

		let fetchCalled = false;
		sandbox.fetch = async () => { fetchCalled = true; throw new Error('should not fetch'); };
		const events = [];
		instance.on('library:load', () => events.push('library:load'));
		await instance.reloadLibrary();
		assert.strictEqual(fetchCalled, false, 'no fetch when no URL');
		assert.strictEqual(events.length, 1, 'library:load re-fires');
		console.log('    Test 6.4: PASS');
	}

	// Test 6.5: library:error on failure
	console.log('  Test 6.5: library:error on fetch failure');
	{
		const instance = Object.create(LibraryUI.prototype);
		instance.libraryData = null; instance._allImages = []; instance._sections = []; instance._context = null;
		instance._isLoading = false; instance._loadingPhase = 'idle'; instance._abortController = null;
		instance._listeners = new Map();
		instance._containerEl = makeMockEl(); instance._contentEl = makeMockEl();
		instance._sidebar = makeMockEl();
		instance.libraryUrl = 'http://example.com/bad.json';
		instance.baseUrl = ''; instance._accent = null; instance._theme = 'dark';
		instance._slotWrappers = {}; instance._contextLoaded = true; instance._modelFilterState = { architectures: new Set(), models: new Set(), includeCustom: false, includeUnknown: false };
		instance.callbacks = { onLibraryLoad: null, onContextReady: null };
				instance.multiViewer = { setImages() {}, loadFirstImage() {}, loadImageById() {} };
		instance.templateEngine = { render() { return makeMockEl(); }, renderSectionItems() { return []; } };
		instance._imageBaseUrl = '';
		instance._ownerState = { truncated: false };

		const events = [];
		instance.on('library:error', (p) => events.push(p));
		instance.on('library:load', () => events.push('library:load'));
		sandbox.fetch = async () => { throw new Error('Network error'); };
		await instance.loadLibrary();
		assert.strictEqual(events.length, 1, 'only library:error');
		assert.strictEqual(events[0].error, 'Network error', 'error message');
		assert.strictEqual(events[0].url, 'http://example.com/bad.json', 'url');
		assert.strictEqual(events[0].code, 'network', 'code');
		console.log('    Test 6.5: PASS');
	}

	teardownMockDOM();
	console.log('Part 6: All library lifecycle tests passed.\n');
}

// ============================================================================
// Part 7: Last-write-wins ghost-event test
// ============================================================================

async function runPart7() {
	console.log('Part 7: Last-write-wins ghost-event test');

	setupMockDOM();
	const sandbox = createControllableSandbox();

	sandbox.window.Phong360ViewerCore = class {
		constructor(opts) {
			this.options = opts;
			this.config = { viewRotation: { autoRotate: false, autoRotationRate: 0 }, controls: { enableZoom: true, enablePan: true }, fov: { init: 150, initTarget: 100 }, loading: { backgroundColor: '#000', fadeInDuration: 500, fadeOutDuration: 500 }, sensitivity: {} };
			this.container = {}; this.projectionType = 1; this.isLoading = false;
			this.mesh = { material: null };
			this.renderer = { domElement: { style: {} }, capabilities: { getMaxAnisotropy() { return 16; } }, renderLists: { dispose() {} }, properties: { get() { return null; } } };
			this.scene = {}; this.camera = {};
			this.loadingOverlay = { style: { display: 'none', opacity: '0' } };
			this.isFirstLoad = false; this.boundHandlers = {};
		}
		switchProjection() {} destroy() {}
	};

	global.document.getElementById = makeMockGetElementById();
	global.IntersectionObserver = class { constructor(fn) {} observe() {} unobserve() {} disconnect() {} };
	sandbox.IntersectionObserver = global.IntersectionObserver;

	loadSourceInto('extensions/phong-360-multi-image.js', sandbox);
	loadSourceInto('extensions/phong-360-library-ui.js', sandbox);
	const LibraryUI = sandbox.window.Phong360LibraryUI;

	console.log('  Test 7.1: Last-write-wins — only B fires image:visible');
	{
		const instance = Object.create(LibraryUI.prototype);
		const imgA = makeFixtureImage('img-a');
		const imgB = makeFixtureImage('img-b');
		instance.libraryData = makeFixtureManifest();
		instance._allImages = [imgA, imgB];
		instance._sections = instance.libraryData.sections;
		instance._context = instance.libraryData.context;
		instance._currentImageId = null; instance._currentImageData = null;
		instance._isLoading = false; instance._loadingPhase = 'idle';
		instance._abortController = null; instance._loadToken = 0; instance._selectToken = 0;
		instance._listeners = new Map();
		instance._containerEl = makeMockEl(); instance._contentEl = makeMockEl();
		instance._infoBar = null; instance._resolutionMode = 'auto'; instance._activeResolution = '4k';
		instance._destroyed = false;
		instance.callbacks = { onImageLoad: null };

		let resolveA = null;
		instance.multiViewer = {
			selectOptimalResolution(resolutions) { return resolutions[0]; },
			loadImageWithResolution(imageData, resolution) {
				const callToken = instance._selectToken;
				instance.emit('image:load-request', { image: { ...imageData }, resolution: resolution.id });
				if (imageData.id === 'img-a') {
					return new Promise((resolve) => {
						resolveA = () => {
							if (instance._selectToken !== callToken) { resolve(); return; }
							instance.emit('image:visible', { image: { ...imageData }, resolution: resolution.id });
							resolve();
						};
					});
				}
				return Promise.resolve().then(() => {
					if (instance._selectToken !== callToken) return;
					instance.emit('image:visible', { image: { ...imageData }, resolution: resolution.id });
				});
			},
		};

		const visibleEvents = [];
		instance.on('image:visible', (p) => visibleEvents.push(p.image.id));

		const selectA = instance.selectImage('img-a');
		await instance.selectImage('img-b');
		if (resolveA) resolveA();
		await selectA;

		assert.deepStrictEqual(visibleEvents, ['img-b'], 'only B fires image:visible');
		console.log('    Test 7.1: PASS');
	}

	teardownMockDOM();
	console.log('Part 7: Last-write-wins tests passed.\n');
}

// ============================================================================
// Part 8: Error paths
// ============================================================================

async function runPart8() {
	console.log('Part 8: Error paths');

	setupMockDOM();
	const sandbox = createControllableSandbox();

	sandbox.window.Phong360ViewerCore = class {
		constructor(opts) {
			this.options = opts;
			this.config = { viewRotation: { autoRotate: false, autoRotationRate: 0 }, controls: { enableZoom: true, enablePan: true }, fov: { init: 150, initTarget: 100 }, loading: { backgroundColor: '#000', fadeInDuration: 500, fadeOutDuration: 500 }, sensitivity: {} };
			this.container = {}; this.projectionType = 1; this.isLoading = false;
			this.mesh = { material: null };
			this.renderer = { domElement: { style: {} }, capabilities: { getMaxAnisotropy() { return 16; } }, renderLists: { dispose() {} }, properties: { get() { return null; } } };
			this.scene = {}; this.camera = {};
			this.loadingOverlay = { style: { display: 'none', opacity: '0' } };
			this.isFirstLoad = false; this.boundHandlers = {};
		}
		switchProjection() {} destroy() {}
	};

	global.document.getElementById = makeMockGetElementById();
	global.IntersectionObserver = class { constructor(fn) {} observe() {} unobserve() {} disconnect() {} };
	sandbox.IntersectionObserver = global.IntersectionObserver;

	loadSourceInto('extensions/phong-360-multi-image.js', sandbox);
	loadSourceInto('extensions/phong-360-library-ui.js', sandbox);
	const LibraryUI = sandbox.window.Phong360LibraryUI;

	console.log('  Test 8.1: image:error preserves previous current image');
	{
		const instance = Object.create(LibraryUI.prototype);
		const prevImg = makeFixtureImage('img-1');
		const badImg = makeFixtureImage('img-bad');

		instance._currentImageData = prevImg; instance._currentImageId = prevImg.id;
		instance.libraryData = makeFixtureManifest();
		instance._allImages = [prevImg, badImg];
		instance._isLoading = false; instance._loadingPhase = 'idle';
		instance._abortController = null; instance._loadToken = 0; instance._selectToken = 0;
		instance._listeners = new Map();
		instance._containerEl = makeMockEl(); instance._contentEl = makeMockEl();
		instance._infoBar = null; instance._resolutionMode = 'auto'; instance._activeResolution = '4k';
		instance._destroyed = false;
		instance.callbacks = { onImageLoad: null };

		instance.multiViewer = {
			selectOptimalResolution(resolutions) { return resolutions[0]; },
			loadImageWithResolution(imageData, resolution) {
				instance.emit('image:load-request', { image: { ...imageData }, resolution: resolution.id });
				if (imageData.id === 'img-bad') {
					return Promise.reject(new Error('Texture load error'));
				}
				return Promise.resolve().then(() => {
					instance.emit('image:visible', { image: { ...imageData }, resolution: resolution.id });
				});
			},
		};

		const errorEvents = [];
		instance.on('image:error', (p) => errorEvents.push(p));

		try { await instance.selectImage('img-bad'); } catch (e) {}

		const cur = instance.getCurrentImage();
		assert.ok(cur, 'getCurrentImage not null');
		assert.strictEqual(cur.id, 'img-1', 'still previous image');
		console.log('    Test 8.1: PASS');
	}

	teardownMockDOM();
	console.log('Part 8: All error path tests passed.\n');
}

// ============================================================================
// Main
// ============================================================================

(async function main() {
	try {
		await runPart1();
		await runPart2();
		await runPart3();
		await runPart4();
		await runPart5();
		await runPart6();
		await runPart7();
		await runPart8();
		console.log('=== ALL IMAGE-VISIBLE-TIMING TESTS PASSED ===');
	} catch (e) {
		console.error('TEST FAILURE:', e);
		process.exit(1);
	}
})();
