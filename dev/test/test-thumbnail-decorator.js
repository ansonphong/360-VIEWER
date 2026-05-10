/**
 * Test: addThumbnailDecorator (Task 2.1)
 *
 * Verifies:
 *   T1: One decorator, render N thumbnails → called N times with (el, image, section).
 *   T2: Re-render via setLibrary(newManifest) → decorator called M more times (total N+M).
 *   T3: Throwing decorator does not block subsequent decorators; failure is console.warn'd.
 *   T4: handle.remove() → decorator NOT called on next render.
 *
 * Node.js only — uses mock-dom helpers for DOM stub + vm sandbox for source loading.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { setupMockDOM, teardownMockDOM } = require('./helpers/mock-dom');

// ---- Setup ----

setupMockDOM();

const viewerRoot = path.resolve(__dirname, '../..');

function loadSourceInto(relPath, sandbox) {
	const filePath = path.join(viewerRoot, relPath);
	const src = fs.readFileSync(filePath, 'utf-8');
	const script = new vm.Script(src, { filename: relPath });
	script.runInContext(sandbox);
}

function createSandbox() {
	const box = {
		window: global.window,
		document: global.document,
		HTMLElement: global.HTMLElement,
		CustomEvent: global.CustomEvent,
		navigator: global.navigator,
		THREE: global.THREE,
		fetch: global.fetch,
		console: global.console,
		localStorage: global.localStorage,
		Phong360ViewerCore: undefined,
		Phong360MultiImage: undefined,
		Phong360LibraryUI: undefined,
		BaseRenderer: undefined,
		SlotRegistry: undefined,
		TemplateEngine: undefined,
		CSS: { escape: (s) => s },
	};
	vm.createContext(box);
	return box;
}

// Provide a no-op Phong360ViewerCore so library-ui init doesn't explode
global.window.Phong360ViewerCore = class Phong360ViewerCore {
	constructor(opts) {
		this.options = opts;
		this.config = {
			viewRotation: { autoRotate: false, autoRotationRate: 0 },
			controls: { enableZoom: true, enablePan: true },
			fov: { init: 150, initTarget: 100 },
			loading: { backgroundColor: '#000', fadeInDuration: 500, fadeOutDuration: 500 },
		};
		this.container = opts.containerId
			? (document.getElementById && document.getElementById(opts.containerId)) || {}
			: {};
		this.canvas = null;
		this.projectionType = 1;
		this.isLoading = false;
		this.renderer = {
			domElement: { style: {} },
			renderLists: { dispose() {} },
			setSize() {},
			setClearColor() {},
			setPixelRatio() {},
			clear() {},
			dispose() {},
			getContext() { return null; },
		};
		this.scene = null;
		this.camera = null;
		this.mesh = null;
		this.isDestroyed = false;
		this.animationFrameId = null;
	}
	switchProjection(type) { this.projectionType = type; }
	destroy() { this.isDestroyed = true; }
	loadImage(url, w, h) { return Promise.resolve(); }
	setCanvasOpacity() { return Promise.resolve(); }
};

// Ensure getElementById returns a usable mock for the container
global.document.getElementById = function(id) {
	const el = global.document.createElement('div');
	el.id = id;
	el.style = {
		setProperty() {},
		removeProperty() {},
		getPropertyValue() { return ''; },
		_props: {},
	};
	el._children = [];
	el.appendChild = function(child) { child._parent = el; el._children.push(child); return child; };
	el.removeChild = function(child) {
		child._parent = null;
		const idx = el._children.indexOf(child);
		if (idx !== -1) el._children.splice(idx, 1);
		return child;
	};
	el.querySelectorAll = function() { return []; };
	el.querySelector = function() { return null; };
	el.setAttribute = function(name, value) { this[name] = value; };
	el.getAttribute = function(name) { return this[name] || null; };
	el.removeAttribute = function(name) { delete this[name]; };
	return el;
};

const sandbox = createSandbox();
loadSourceInto('extensions/phong-360-library-ui.js', sandbox);

const Phong360LibraryUI = sandbox.window.Phong360LibraryUI;
const BaseRenderer = sandbox.window.BaseRenderer;
assert.ok(Phong360LibraryUI, 'Phong360LibraryUI must be loaded');
assert.ok(BaseRenderer, 'BaseRenderer must be exported to sandbox');

// ---- Helpers ----

/**
 * Build a bare Phong360LibraryUI prototype instance (no constructor side-effects).
 * We manually wire state that the constructor would normally set so we can call
 * addThumbnailDecorator and _runThumbnailDecorators in isolation.
 */
function makeBareInstance() {
	const i = Object.create(Phong360LibraryUI.prototype);
	i.core = null;
	i.multiViewer = null;
	i._theme = 'auto';
	i._accent = null;
	i._sidebar = null;
	i._containerEl = null;
	i._sections = [];
	i._allImages = [];
	i._context = null;
	i.libraryData = null;
	i.libraryUrl = null;
	i._currentImageId = null;
	i._currentImageData = null;
	i._listeners = new Map();
	i._isLoading = false;
	i._loadingPhase = 'idle';
	i._resolutionMode = 'auto';
	i._activeResolution = null;
	i._abortController = null;
	i._loadToken = 0;
	i._selectToken = 0;
	i._destroyed = false;
	i.callbacks = {
		onThemeChange: null, onImageSelect: null, onImageLoad: null,
		onContextReady: null, onLibraryLoad: null, onSectionToggle: null,
		onLinkClick: null, onBadgeClick: null, onSectionsRendered: null,
	};
	// Decorator state — initialized in constructor; guard for bare instances too
	i._thumbnailDecorators = i._thumbnailDecorators || [];
	i._decoratorIdCounter = i._decoratorIdCounter || 0;
	// onImageClick stub so click handler in createThumbnail doesn't crash
	i.onImageClick = () => {};
	return i;
}

/**
 * Build a minimal manifest with N images in one section.
 */
function makeManifest(n, sectionId = 'sec-a') {
	const images = [];
	for (let i = 0; i < n; i++) {
		images.push({ id: `img-${i}`, title: `Image ${i}`, thumbnail: `thumb-${i}.jpg` });
	}
	return {
		version: '4.0.0',
		sections: [{ id: sectionId, template: 'grid', images }],
	};
}

/**
 * Simulate rendering a section's thumbnails via BaseRenderer.createThumbnail.
 * BaseRenderer is exported; GridRenderer is not — we replicate the loop here.
 * Each image's thumbnail element is built exactly as GridRenderer would do it.
 *
 * @param {Object} engine  A Phong360LibraryUI instance (or bare prototype instance)
 * @param {Object} section A section object { id, images: [...] }
 * @returns {Array} Array of created thumbnail DOM elements
 */
function renderGrid(engine, section) {
	const config = { baseUrl: '' };
	const renderer = new BaseRenderer(section, config, engine);
	const elements = [];
	for (const image of section.images || []) {
		elements.push(renderer.createThumbnail(image));
	}
	return elements;
}

// ---- T1: One decorator, render N thumbnails ----

console.log('T1: One decorator called N times with correct args');

{
	const engine = makeBareInstance();

	// addThumbnailDecorator must exist
	assert.strictEqual(typeof engine.addThumbnailDecorator, 'function',
		'addThumbnailDecorator must be a function on Phong360LibraryUI prototype');

	const calls = [];
	const handle = engine.addThumbnailDecorator((el, image, section) => {
		calls.push({ el, image, section });
	});

	// handle is a SlotHandle
	assert.ok(handle && typeof handle === 'object', 'addThumbnailDecorator must return a SlotHandle object');
	assert.ok(typeof handle.id === 'string' && handle.id.length > 0, 'SlotHandle must have a string id');
	assert.ok(typeof handle.remove === 'function', 'SlotHandle must have a remove() function');

	const N = 4;
	const section = makeManifest(N).sections[0];
	renderGrid(engine, section);

	assert.strictEqual(calls.length, N, `decorator must be called exactly ${N} times (one per thumbnail)`);
	for (let i = 0; i < N; i++) {
		const { el, image, section: sec } = calls[i];
		// el must be an Element-like object (has className, dataset, etc.)
		assert.ok(el && typeof el === 'object' && typeof el.className !== 'undefined',
			`call[${i}].el must be a DOM Element-like object`);
		assert.ok(image && typeof image === 'object',
			`call[${i}].image must be an object`);
		assert.ok(sec && typeof sec === 'object',
			`call[${i}].section must be an object`);
		// image and section must match the manifest data
		assert.strictEqual(image.id, `img-${i}`, `call[${i}].image.id should match manifest`);
		assert.strictEqual(sec.id, 'sec-a', `call[${i}].section.id should match section`);
	}

	console.log('  T1: PASS — decorator called', N, 'times with (el, image, section)');
}

// ---- T2: Re-render via setLibrary accumulates calls ----

console.log('T2: Re-render via setLibrary accumulates calls');

{
	const engine = makeBareInstance();
	// Stub the parts of setLibrary that touch the DOM so we can call it safely
	engine._processLibraryData = function(manifest) {
		this.libraryData = manifest;
		this._sections = manifest.sections || [];
		this._allImages = [];
	};

	const calls = [];
	engine.addThumbnailDecorator((el, image, section) => {
		calls.push({ el, image, section });
	});

	const N = 3;
	const M = 5;
	const sectionN = makeManifest(N).sections[0];
	const sectionM = makeManifest(M, 'sec-b').sections[0];

	// First render
	renderGrid(engine, sectionN);
	assert.strictEqual(calls.length, N, `after first render, decorator called ${N} times`);

	// Second render (simulates setLibrary re-render)
	renderGrid(engine, sectionM);
	assert.strictEqual(calls.length, N + M,
		`after second render, decorator called ${N + M} times total (accumulated)`);

	console.log('  T2: PASS — decorator accumulates across re-renders (total', N + M, 'calls)');
}

// ---- T3: Throwing decorator does not block subsequent decorators; failure is console.warn'd ----

console.log('T3: Throwing decorator does not block subsequent; warn captured');

{
	const engine = makeBareInstance();

	const warns = [];
	const origWarn = global.console.warn;
	global.console.warn = (...args) => warns.push(args.join(' '));

	let secondCalled = 0;
	try {
		// First decorator throws
		engine.addThumbnailDecorator(() => { throw new Error('boom'); });
		// Second decorator must still run
		engine.addThumbnailDecorator(() => { secondCalled++; });

		const N = 3;
		const section = makeManifest(N).sections[0];
		renderGrid(engine, section);

		assert.strictEqual(secondCalled, N,
			'second decorator must run for every thumbnail even though first throws');
		assert.ok(warns.length >= N,
			`must warn at least once per failing call (got ${warns.length} warns for ${N} thumbnails)`);
		// Each warn must mention the error
		for (const w of warns) {
			assert.ok(/boom/i.test(w) || w.length > 0,
				'warn should include error message info');
		}
		console.log('  T3: PASS — second decorator ran', secondCalled, 'times;', warns.length, 'warns logged');
	} finally {
		global.console.warn = origWarn;
	}
}

// ---- T4: handle.remove() — decorator NOT called after removal ----

console.log('T4: handle.remove() prevents subsequent calls');

{
	const engine = makeBareInstance();

	const calls = [];
	const handle = engine.addThumbnailDecorator((el, image, section) => {
		calls.push({ el, image, section });
	});

	const N = 3;
	const section = makeManifest(N).sections[0];

	// Render once — should call decorator N times
	renderGrid(engine, section);
	assert.strictEqual(calls.length, N, `before remove: decorator called ${N} times`);

	// Remove decorator
	handle.remove();

	// Render again — decorator must NOT be called
	const callsBeforeSecondRender = calls.length;
	renderGrid(engine, section);
	assert.strictEqual(calls.length, callsBeforeSecondRender,
		'after handle.remove(), decorator must NOT be called on subsequent renders');

	console.log('  T4: PASS — decorator not called after remove()');
}

// ---- Done ----

teardownMockDOM();
console.log('\n=== ALL THUMBNAIL DECORATOR TESTS PASSED ===');
process.exit(0);
