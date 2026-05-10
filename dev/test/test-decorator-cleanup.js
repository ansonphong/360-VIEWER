/**
 * Test: Decorator cleanup-handle stress (Task 2.5)
 *
 * C1: 1000 re-renders with one persistent decorator — DOM markers bounded, remove() clears them.
 * C2: 1000 register/remove cycles — no listener growth, no _thumbnailDecorators growth.
 * C3: Memory probe (best-effort, heuristic) — heapUsed delta < 5MB if --expose-gc available.
 *
 * Node.js only — uses mock-dom helpers + vm sandbox.
 *
 * Listener-storage note: decorators do NOT subscribe to the engine's _listeners Map internally.
 * addThumbnailDecorator pushes to _thumbnailDecorators[] only. Therefore C2 asserts that the
 * _listeners Map size is entirely flat across register/remove cycles (zero subscriptions added).
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
		requestAnimationFrame: (fn) => setTimeout(fn, 0),
		cancelAnimationFrame: (id) => clearTimeout(id),
	};
	vm.createContext(box);
	return box;
}

// No-op Phong360ViewerCore
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
	loadImage() { return Promise.resolve(); }
	setCanvasOpacity() { return Promise.resolve(); }
};

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
 * Wires all state that the constructor normally sets.
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
	// Decorator state
	i._thumbnailDecorators = [];
	i._headingDecorators = [];
	i._decoratorIdCounter = 0;
	i._decoratorWarned  = { thumbnail: false, heading: false, 'sidebar-section': false, 'toolbar-button': false };
	i._decoratorErrored = { thumbnail: false, heading: false, 'sidebar-section': false, 'toolbar-button': false };
	i._sidebarSectionCount = 0;
	i._toolbarButtonCount  = 0;
	i._thumbnailDecoratorTargets  = new WeakMap();
	i._headingDecoratorTargets    = new WeakMap();
	i._thumbnailDecoratorFirstRun = new WeakMap();
	i._headingDecoratorFirstRun   = new WeakMap();
	i._missingMarkerWarned = new Set();
	i.onImageClick = () => {};
	i.baseUrl = '';
	i.templateEngine = {
		render(section, config) {
			return global.document.createElement('div');
		},
	};
	return i;
}

/**
 * Build a manifest with N images in one section.
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
 * Build a rich tracking element whose querySelector searches _children recursively.
 * Required so the decorator idempotency marker checks work correctly.
 */
function makeTrackingElement(tag) {
	const el = {
		tagName: (tag || 'div').toUpperCase(),
		className: '',
		textContent: '',
		dataset: {},
		style: { setProperty() {}, removeProperty() {}, getPropertyValue() { return ''; } },
		_children: [],
		_attrs: {},
		_listeners: {},
		_parent: null,
		_p360DecoratorUid: null,
		appendChild(child) { child._parent = this; this._children.push(child); return child; },
		removeChild(child) {
			child._parent = null;
			const idx = this._children.indexOf(child);
			if (idx !== -1) this._children.splice(idx, 1);
			return child;
		},
		insertBefore(newChild) { newChild._parent = this; return newChild; },
		remove() { if (this._parent) this._parent.removeChild(this); },
		setAttribute(name, value) { this._attrs[name] = value; },
		getAttribute(name) { return this._attrs[name] != null ? this._attrs[name] : null; },
		hasAttribute(name) { return name in this._attrs; },
		removeAttribute(name) { delete this._attrs[name]; },
		contains(child) { return child === this; },
		closest() { return null; },
		focus() {},
		blur() {},
		addEventListener(event, fn) {
			if (!this._listeners[event]) this._listeners[event] = [];
			this._listeners[event].push(fn);
		},
		removeEventListener(event, fn) {
			if (!this._listeners[event]) return;
			this._listeners[event] = this._listeners[event].filter((f) => f !== fn);
		},
		dispatchEvent() {},
		getBoundingClientRect() { return { x: 0, y: 0, width: 100, height: 100, top: 0, left: 0, right: 0, bottom: 0 }; },
		classList: null, // set below
		querySelector(selector) {
			const attrMatch = selector.match(/^\[data-p360-decorator-id="([^"]+)"\]$/);
			if (attrMatch) {
				const id = attrMatch[1];
				return this._findByAttr('data-p360-decorator-id', id);
			}
			return null;
		},
		querySelectorAll(selector) {
			const attrMatch = selector.match(/^\[([^\]]+)\]$/);
			if (attrMatch) {
				const attr = attrMatch[1];
				return this._findAllByAttrPresent(attr);
			}
			return [];
		},
		_findByAttr(attr, value) {
			for (const child of this._children) {
				if (child._attrs && child._attrs[attr] === value) return child;
				if (child._findByAttr) {
					const found = child._findByAttr(attr, value);
					if (found) return found;
				}
			}
			return null;
		},
		_findAllByAttrPresent(attr) {
			const results = [];
			for (const child of this._children) {
				if (child._attrs && attr in child._attrs) results.push(child);
				if (child._findAllByAttrPresent) {
					results.push(...child._findAllByAttrPresent(attr));
				}
			}
			return results;
		},
	};
	el.classList = {
		_list: [],
		add(...names) { for (const n of names) if (!this._list.includes(n)) this._list.push(n); },
		remove(...names) { this._list = this._list.filter((c) => !names.includes(c)); },
		contains(name) { return this._list.includes(name); },
		toggle(name) {
			if (this._list.includes(name)) { this._list = this._list.filter((c) => c !== name); return false; }
			this._list.push(name); return true;
		},
	};
	return el;
}

/**
 * Simulate N render cycles, each producing fresh tracking elements.
 * Returns the LAST batch of elements (the "current-render" live nodes).
 *
 * @param {Object} engine
 * @param {Object} section   A section object { id, images: [...] }
 * @param {number} cycles    Number of re-render cycles to run
 * @returns {Array}          The elements produced in the final cycle
 */
function doReRenders(engine, section, cycles) {
	let lastBatch = [];
	for (let c = 0; c < cycles; c++) {
		const batch = [];
		for (const image of section.images) {
			const el = makeTrackingElement('div');
			engine._runThumbnailDecorators(el, image, section);
			batch.push(el);
		}
		lastBatch = batch;
	}
	return lastBatch;
}

// =============================================================================
// C3 — Memory probe (best-effort; runs first so measurements wrap C1)
// =============================================================================

console.log('C3: Memory probe (best-effort heuristic)');

let heapBefore = null;
const gcAvailable = typeof global.gc === 'function';

if (!gcAvailable) {
	console.log('  C3: NOTE — global.gc not available (run with --expose-gc to enable full probe). Skipping heap-delta assertion.');
} else {
	global.gc();
	heapBefore = process.memoryUsage().heapUsed;
	console.log(`  C3: heapUsed before stress: ${(heapBefore / 1024 / 1024).toFixed(2)} MB`);
}

// =============================================================================
// C1 — 1000 re-renders with one persistent decorator
// =============================================================================

console.log('C1: 1000 re-renders with one persistent decorator — DOM markers bounded, remove() clears them');

{
	const N = 10; // thumbnails per render
	const CYCLES = 1000;
	const manifest = makeManifest(N);
	const section = manifest.sections[0];

	const engine = makeBareInstance();

	// Register one decorator that injects a child with the marker
	const handle = engine.addThumbnailDecorator((el, image) => {
		const span = makeTrackingElement('span');
		span._attrs['data-p360-decorator-id'] = handle.id;
		el.appendChild(span);
	});

	// Run 1000 re-renders
	const lastBatch = doReRenders(engine, section, CYCLES);

	// C1a: DOM markers are bounded — only the last-render's N elements carry markers;
	// old elements are standalone objects (no global DOM registry in our test harness),
	// so the live set is exactly the lastBatch elements. Count markers in live elements.
	let liveMarkerCount = 0;
	for (const el of lastBatch) {
		const markers = el._findAllByAttrPresent('data-p360-decorator-id');
		liveMarkerCount += markers.length;
	}
	assert.ok(liveMarkerCount <= N,
		`C1a: live marker count (${liveMarkerCount}) must be ≤ N=${N} (current-render thumbnails only)`);
	console.log(`  C1a: PASS — ${liveMarkerCount} live markers after 1000 re-renders (bounded by N=${N})`);

	// C1b: call handle.remove(), render once more; the decorator's markers must not appear
	handle.remove();

	const postRemoveBatch = [];
	for (const image of section.images) {
		const el = makeTrackingElement('div');
		engine._runThumbnailDecorators(el, image, section);
		postRemoveBatch.push(el);
	}

	let postRemoveMarkerCount = 0;
	for (const el of postRemoveBatch) {
		const found = el._findByAttr('data-p360-decorator-id', handle.id);
		if (found) postRemoveMarkerCount++;
	}
	assert.strictEqual(postRemoveMarkerCount, 0,
		`C1b: after handle.remove(), post-render must have 0 markers for handleId "${handle.id}", got ${postRemoveMarkerCount}`);
	console.log(`  C1b: PASS — 0 markers for removed handle after post-remove render`);

	// C1c: _thumbnailDecorators must be empty after remove (single decorator was registered)
	assert.strictEqual(engine._thumbnailDecorators.length, 0,
		`C1c: _thumbnailDecorators must be empty after remove(), got ${engine._thumbnailDecorators.length}`);
	console.log(`  C1c: PASS — _thumbnailDecorators.length === 0 after remove()`);
}

// =============================================================================
// C2 — 1000 register/remove cycles with no growth
// =============================================================================

console.log('C2: 1000 register/remove cycles — no listener growth, no decorator-list growth');

{
	const engine = makeBareInstance();

	// Capture initial sizes
	const initialDecoratorLen = engine._thumbnailDecorators.length; // should be 0
	const initialListenerSize = engine._listeners.size;              // should be 0 (fresh instance)

	const CYCLES = 1000;
	for (let i = 0; i < CYCLES; i++) {
		const h = engine.addThumbnailDecorator(() => {});
		h.remove();
	}

	// C2a: _thumbnailDecorators.length must be exactly the initial value
	assert.strictEqual(engine._thumbnailDecorators.length, initialDecoratorLen,
		`C2a: _thumbnailDecorators.length must be ${initialDecoratorLen} after 1000 register/remove cycles, got ${engine._thumbnailDecorators.length}`);
	console.log(`  C2a: PASS — _thumbnailDecorators.length === ${initialDecoratorLen} (unchanged)`);

	// C2b: engine._listeners Map size must be unchanged (decorators don't subscribe to events)
	assert.strictEqual(engine._listeners.size, initialListenerSize,
		`C2b: engine._listeners.size must be ${initialListenerSize} after 1000 cycles (decorators must not subscribe to events), got ${engine._listeners.size}`);
	console.log(`  C2b: PASS — _listeners.size === ${initialListenerSize} (no event subscriptions from decorator registration)`);

	// C2c: idCounter grows (expected — each registration increments it), but no entries leak
	// Verify that performing one more register+render+remove cycle still works correctly
	const image = { id: 'verify-img', title: 'Verify', thumbnail: 'verify.jpg' };
	const section = { id: 'verify-sec', images: [image] };
	let callCount = 0;
	const verifyHandle = engine.addThumbnailDecorator((el) => {
		callCount++;
		const span = makeTrackingElement('span');
		span._attrs['data-p360-decorator-id'] = verifyHandle.id;
		el.appendChild(span);
	});
	const verifyEl = makeTrackingElement('div');
	engine._runThumbnailDecorators(verifyEl, image, section);
	assert.strictEqual(callCount, 1, 'C2c: decorator registered after 1000 cycles must run normally');
	verifyHandle.remove();
	assert.strictEqual(engine._thumbnailDecorators.length, initialDecoratorLen,
		'C2c: list returns to initial length after final remove');
	console.log(`  C2c: PASS — post-cycle register/render/remove works correctly`);
}

// =============================================================================
// C3 — Memory probe (conclusion)
// =============================================================================

if (gcAvailable && heapBefore !== null) {
	global.gc();
	const heapAfter = process.memoryUsage().heapUsed;
	const deltaMB = (heapAfter - heapBefore) / 1024 / 1024;
	console.log(`  C3: heapUsed after stress: ${(heapAfter / 1024 / 1024).toFixed(2)} MB  (delta: ${deltaMB >= 0 ? '+' : ''}${deltaMB.toFixed(2)} MB)`);
	assert.ok(deltaMB < 5,
		`C3: heap delta must be < 5 MB after 1000 re-renders (got ${deltaMB.toFixed(2)} MB) — possible memory leak`);
	console.log(`  C3: PASS — heap delta ${deltaMB.toFixed(2)} MB < 5 MB`);
} else if (!gcAvailable) {
	console.log('  C3: SKIP (--expose-gc not set; heap-delta assertion skipped; C1/C2 are the authoritative tests)');
}

// ---- Done ----

teardownMockDOM();
console.log('\n=== ALL DECORATOR CLEANUP STRESS TESTS PASSED ===');
process.exit(0);
