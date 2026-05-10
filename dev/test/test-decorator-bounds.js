/**
 * Test: Decorator memory bounds + idempotency (Task 2.4)
 *
 * Memory bounds (B1–B8):
 *   B1: Register 20 thumbnail decorators → zero warns.
 *   B2: Register 21st thumbnail decorator → exactly one console.warn with kind name + stack hint.
 *   B3: Register 100 thumbnail decorators → exactly one warn (only the 21st triggers; 22–100 don't repeat).
 *   B4: Register 101st thumbnail decorator → returned handle, _thumbnailDecorators.length === 100,
 *       exactly one console.error logged. Handle's remove() is no-op.
 *   B5: 101st decorator's fn is NOT called during render.
 *   B6: Existing 100 thumbnail decorators still run normally on render.
 *   B7: Per-kind independence: 100 thumbnail decorators + 1 heading decorator → no error; heading works.
 *   B8: Per-kind warn independence: 21 thumbnail (1 warn) + 21 heading (1 warn) = 2 warns, distinct kinds.
 *
 * Idempotency (I1–I5):
 *   I1: Decorator A injects child with data-p360-decorator-id. Render twice → fn called once per target.
 *   I2: Decorator A + B inject their own children → both fns run on first render; both skip on second.
 *   I3: Decorator C mutates only target (no child injection) → WeakMap tracks it; called once per target node.
 *   I4: New element node after setLibrary → WeakMap-tracked decorator C runs again on new node.
 *   I5: Decorator D injects child but omits marker → second render logs exactly one console.warn about contract.
 *
 * Node.js only — uses mock-dom helpers + vm sandbox.
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

// No-op Phong360ViewerCore so library-ui init doesn't explode
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
 * Build a rich mock element with querySelector/querySelectorAll tracking children.
 * Used for idempotency tests that need real child lookups.
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
		appendChild(child) {
			child._parent = this;
			this._children.push(child);
			return child;
		},
		removeChild(child) {
			child._parent = null;
			const idx = this._children.indexOf(child);
			if (idx !== -1) this._children.splice(idx, 1);
			return child;
		},
		insertBefore(newChild, refChild) { newChild._parent = this; return newChild; },
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
		dispatchEvent(event) {
			const handlers = this._listeners[event.type];
			if (handlers) handlers.forEach((fn) => fn(event));
		},
		getBoundingClientRect() { return { x: 0, y: 0, width: 100, height: 100, top: 0, left: 0, right: 0, bottom: 0 }; },
		classList: {
			_list: [],
			add(...names) { for (const n of names) if (!this._list.includes(n)) this._list.push(n); },
			remove(...names) { this._list = this._list.filter((c) => !names.includes(c)); },
			contains(name) { return this._list.includes(name); },
			toggle(name) {
				if (this._list.includes(name)) { this._list = this._list.filter((c) => c !== name); return false; }
				this._list.push(name); return true;
			},
		},
		/**
		 * querySelector implementation that searches through _children recursively.
		 * Handles '[data-p360-decorator-id="<id>"]' attribute selectors.
		 */
		querySelector(selector) {
			// Parse '[data-p360-decorator-id="<id>"]'
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
	// Give each element a fresh classList instance
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
 * Build a bare Phong360LibraryUI prototype instance (no constructor side-effects).
 * Wires state that the constructor would normally set.
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
	i._thumbnailDecorators = [];
	i._headingDecorators = [];
	i._decoratorIdCounter = 0;
	// Bounds + idempotency state (Task 2.4)
	i._decoratorWarned  = { thumbnail: false, heading: false, 'sidebar-section': false, 'toolbar-button': false };
	i._decoratorErrored = { thumbnail: false, heading: false, 'sidebar-section': false, 'toolbar-button': false };
	i._sidebarSectionCount = 0;
	i._toolbarButtonCount  = 0;
	i._thumbnailDecoratorTargets  = new WeakMap();
	i._headingDecoratorTargets    = new WeakMap();
	i._thumbnailDecoratorFirstRun = new WeakMap();
	i._headingDecoratorFirstRun   = new WeakMap();
	i._missingMarkerWarned = new Set();
	// onImageClick stub so click handler in createThumbnail doesn't crash
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
 * Simulate rendering section thumbnails via BaseRenderer.createThumbnail.
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

/**
 * Simulate rendering section thumbnails, using tracking elements so idempotency
 * tests can pass real querySelectors. Directly calls _runThumbnailDecorators
 * with pre-built tracking elements.
 */
function renderGridTracking(engine, section, elements) {
	for (let i = 0; i < elements.length; i++) {
		engine._runThumbnailDecorators(elements[i], section.images[i], section);
	}
}

/**
 * Capture console.warn and console.error calls during a thunk.
 * Returns { warns, errors }.
 */
function captureConsole(thunk) {
	const warns = [];
	const errors = [];
	const origWarn = global.console.warn;
	const origError = global.console.error;
	global.console.warn = (...args) => warns.push(args.join(' '));
	global.console.error = (...args) => errors.push(args.join(' '));
	try {
		thunk();
	} finally {
		global.console.warn = origWarn;
		global.console.error = origError;
	}
	return { warns, errors };
}

// =============================================================================
// Memory bounds tests (B1–B8)
// =============================================================================

// ---- B1: Register 20 thumbnail decorators → zero warns ----

console.log('B1: 20 thumbnail decorators → zero warns');
{
	const engine = makeBareInstance();
	const { warns, errors } = captureConsole(() => {
		for (let i = 0; i < 20; i++) {
			engine.addThumbnailDecorator(() => {});
		}
	});
	assert.strictEqual(warns.length, 0, `B1: expected 0 warns, got ${warns.length}: ${warns.join('; ')}`);
	assert.strictEqual(errors.length, 0, `B1: expected 0 errors, got ${errors.length}`);
	assert.strictEqual(engine._thumbnailDecorators.length, 20, 'B1: must have 20 decorators registered');
	console.log('  B1: PASS — 20 decorators, 0 warns, 0 errors');
}

// ---- B2: 21st thumbnail decorator → exactly one console.warn with kind name + stack hint ----

console.log('B2: 21st thumbnail decorator → exactly one warn with kind name + stack info');
{
	const engine = makeBareInstance();
	const { warns } = captureConsole(() => {
		for (let i = 0; i < 21; i++) {
			engine.addThumbnailDecorator(() => {});
		}
	});
	assert.strictEqual(warns.length, 1, `B2: expected exactly 1 warn, got ${warns.length}: ${warns.join('; ')}`);
	const w = warns[0];
	assert.ok(
		/thumbnail/i.test(w),
		`B2: warn must include kind name "thumbnail", got: "${w}"`
	);
	// Must include stack/call-site hint: either "stack" or "Error" or "at " lines or a file name
	assert.ok(
		/stack|Error|at |\.js/i.test(w),
		`B2: warn must include stack/call-site hint, got: "${w}"`
	);
	console.log('  B2: PASS — exactly 1 warn with kind name and stack hint');
}

// ---- B3: Register 100 thumbnail decorators → exactly one warn (21st triggers; 22–100 don't repeat) ----

console.log('B3: 100 thumbnail decorators → exactly one warn total');
{
	const engine = makeBareInstance();
	const { warns } = captureConsole(() => {
		for (let i = 0; i < 100; i++) {
			engine.addThumbnailDecorator(() => {});
		}
	});
	assert.strictEqual(warns.length, 1, `B3: expected exactly 1 warn across 100 registrations, got ${warns.length}`);
	assert.strictEqual(engine._thumbnailDecorators.length, 100, 'B3: must have exactly 100 decorators');
	console.log('  B3: PASS — exactly 1 warn across 100 registrations');
}

// ---- B4: 101st thumbnail decorator → handle returned, list stays at 100, one console.error ----

console.log('B4: 101st thumbnail decorator → capped, one console.error, list stays at 100');
{
	const engine = makeBareInstance();
	let capHandle;
	const { warns, errors } = captureConsole(() => {
		for (let i = 0; i < 100; i++) {
			engine.addThumbnailDecorator(() => {});
		}
		capHandle = engine.addThumbnailDecorator(() => {});
	});
	// Exactly 1 warn (from the 21st) + 1 error (from the 101st)
	assert.strictEqual(warns.length, 1, `B4: expected 1 warn, got ${warns.length}`);
	assert.strictEqual(errors.length, 1, `B4: expected exactly 1 error, got ${errors.length}: ${errors.join('; ')}`);
	assert.strictEqual(engine._thumbnailDecorators.length, 100,
		`B4: list must remain at 100, got ${engine._thumbnailDecorators.length}`);
	assert.ok(capHandle && typeof capHandle === 'object', 'B4: 101st add must still return a handle object');
	assert.ok(typeof capHandle.id === 'string', 'B4: handle must have string id');
	assert.ok(typeof capHandle.remove === 'function', 'B4: handle must have remove()');

	// remove() on capped handle must be no-op (no throw, list unchanged)
	const lenBefore = engine._thumbnailDecorators.length;
	assert.doesNotThrow(() => capHandle.remove(), 'B4: capped handle.remove() must not throw');
	assert.strictEqual(engine._thumbnailDecorators.length, lenBefore,
		'B4: capped handle.remove() must not shrink the list');
	console.log('  B4: PASS — capped at 100, 1 error, no-op remove');
}

// ---- B5: 101st decorator's fn is NOT called during render ----

console.log('B5: 101st decorator fn is NOT called during render');
{
	const engine = makeBareInstance();
	let capFnCalled = 0;
	const { warns, errors } = captureConsole(() => {
		for (let i = 0; i < 100; i++) {
			engine.addThumbnailDecorator(() => {});
		}
		engine.addThumbnailDecorator(() => { capFnCalled++; });
	});
	// Silence the expected warn/error so test output is clean
	void warns; void errors;

	const section = makeManifest(3).sections[0];
	renderGrid(engine, section);
	assert.strictEqual(capFnCalled, 0, `B5: 101st decorator fn must NOT be called, got ${capFnCalled} calls`);
	console.log('  B5: PASS — 101st fn never called during render');
}

// ---- B6: Existing 100 thumbnail decorators still run normally ----

console.log('B6: Existing 100 decorators still run after cap');
{
	const engine = makeBareInstance();
	const counters = new Array(100).fill(0);
	captureConsole(() => {
		for (let i = 0; i < 100; i++) {
			const idx = i;
			engine.addThumbnailDecorator(() => { counters[idx]++; });
		}
		// Register (and ignore) the 101st
		engine.addThumbnailDecorator(() => {});
	});

	const N = 2; // thumbnails to render
	const section = makeManifest(N).sections[0];
	renderGrid(engine, section);

	for (let i = 0; i < 100; i++) {
		assert.strictEqual(counters[i], N, `B6: decorator[${i}] should run ${N} times, got ${counters[i]}`);
	}
	console.log('  B6: PASS — all 100 decorators called', N, 'times each');
}

// ---- B7: Per-kind independence: 100 thumbnail + 1 heading → no error for heading ----

console.log('B7: Per-kind independence — 100 thumbnails does not cap headings');
{
	const engine = makeBareInstance();
	let headingCalled = 0;
	const { errors } = captureConsole(() => {
		for (let i = 0; i < 100; i++) {
			engine.addThumbnailDecorator(() => {});
		}
		engine.addSectionHeadingDecorator((el, section) => { headingCalled++; });
	});
	assert.strictEqual(errors.length, 0,
		`B7: adding 1 heading decorator after 100 thumbnails must not error, got: ${errors.join('; ')}`);

	// Verify heading decorator runs
	const headingEl = makeTrackingElement('h2');
	const section = { id: 'sec-x', title: 'Section X' };
	engine._runHeadingDecorators(headingEl, section);
	assert.strictEqual(headingCalled, 1, 'B7: heading decorator must run on render');
	console.log('  B7: PASS — heading unaffected by thumbnail cap');
}

// ---- B8: Per-kind warn independence: 21 thumbnail + 21 heading = 2 warns, distinct kind names ----

console.log('B8: 21 thumbnails + 21 headings → 2 warns with distinct kind names');
{
	const engine = makeBareInstance();
	const { warns } = captureConsole(() => {
		for (let i = 0; i < 21; i++) {
			engine.addThumbnailDecorator(() => {});
		}
		for (let i = 0; i < 21; i++) {
			engine.addSectionHeadingDecorator(() => {});
		}
	});
	assert.strictEqual(warns.length, 2,
		`B8: expected exactly 2 warns (one per kind), got ${warns.length}: ${warns.join('; ')}`);
	const allText = warns.join(' ');
	assert.ok(/thumbnail/i.test(allText), 'B8: one warn must mention "thumbnail"');
	assert.ok(/heading/i.test(allText), 'B8: one warn must mention "heading"');
	// The two warns should have different kind names
	const hasThumb = warns.some((w) => /thumbnail/i.test(w));
	const hasHead = warns.some((w) => /heading/i.test(w));
	assert.ok(hasThumb, 'B8: first kind warn must mention thumbnail');
	assert.ok(hasHead, 'B8: second kind warn must mention heading');
	console.log('  B8: PASS — 2 warns with distinct kind names:', warns.map((w) => w.slice(0, 80)));
}

// =============================================================================
// Idempotency tests (I1–I5)
// =============================================================================

// ---- I1: Decorator A injects child with marker → fn called once per target ----

console.log('I1: Decorator A injects child with marker → fn called once per target on double-render');
{
	const engine = makeBareInstance();
	let callCount = 0;
	const handle = engine.addThumbnailDecorator((el, image, section) => {
		callCount++;
		// Inject a child with the marker
		const span = makeTrackingElement('span');
		span._attrs['data-p360-decorator-id'] = handle.id;
		el.appendChild(span);
	});

	const section = { id: 'sec-a', images: [{ id: 'img-0', title: 'Img', thumbnail: 'x.jpg' }] };
	const targetEl = makeTrackingElement('div');

	// First render
	engine._runThumbnailDecorators(targetEl, section.images[0], section);
	assert.strictEqual(callCount, 1, 'I1: fn must be called on first render');
	// Verify span exists
	assert.ok(targetEl.querySelector(`[data-p360-decorator-id="${handle.id}"]`),
		'I1: marker child must be present after first render');

	// Second render on SAME element
	engine._runThumbnailDecorators(targetEl, section.images[0], section);
	assert.strictEqual(callCount, 1, 'I1: fn must NOT be called on second render of same target');
	// Still only one span
	const spans = targetEl._findAllByAttrPresent('data-p360-decorator-id');
	assert.strictEqual(spans.length, 1, 'I1: only one marker span must exist after double-render');
	console.log('  I1: PASS — fn called once; single marker span after two renders');
}

// ---- I2: Decorator A + B inject their own children → both run first; both skip second ----

console.log('I2: Decorator A + B → both run on first render, both skip on second');
{
	const engine = makeBareInstance();
	let callsA = 0, callsB = 0;
	const handleA = engine.addThumbnailDecorator((el) => {
		callsA++;
		const span = makeTrackingElement('span');
		span._attrs['data-p360-decorator-id'] = handleA.id;
		el.appendChild(span);
	});
	const handleB = engine.addThumbnailDecorator((el) => {
		callsB++;
		const span = makeTrackingElement('span');
		span._attrs['data-p360-decorator-id'] = handleB.id;
		el.appendChild(span);
	});

	const section = { id: 'sec-a', images: [{ id: 'img-0', title: 'Img', thumbnail: 'x.jpg' }] };
	const targetEl = makeTrackingElement('div');

	// First render
	engine._runThumbnailDecorators(targetEl, section.images[0], section);
	assert.strictEqual(callsA, 1, 'I2: A called once on first render');
	assert.strictEqual(callsB, 1, 'I2: B called once on first render');
	const spans = targetEl._findAllByAttrPresent('data-p360-decorator-id');
	assert.strictEqual(spans.length, 2, 'I2: both marker spans exist after first render');

	// Second render on SAME element
	engine._runThumbnailDecorators(targetEl, section.images[0], section);
	assert.strictEqual(callsA, 1, 'I2: A must NOT be called on second render');
	assert.strictEqual(callsB, 1, 'I2: B must NOT be called on second render');
	const spansAfter = targetEl._findAllByAttrPresent('data-p360-decorator-id');
	assert.strictEqual(spansAfter.length, 2, 'I2: still only 2 spans after second render');
	console.log('  I2: PASS — A and B each called once; 2 spans after double-render');
}

// ---- I3: Target-only mutator (no child injection) → WeakMap tracks it; called once per node ----

console.log('I3: Target-only mutator → called once per node; new node triggers it again');
{
	const engine = makeBareInstance();
	let callCount = 0;
	const handle = engine.addThumbnailDecorator((el) => {
		callCount++;
		// Only mutate the element; do NOT inject a child
		el.classList.add('decorated');
	});

	const section = { id: 'sec-a', images: [{ id: 'img-0', title: 'Img', thumbnail: 'x.jpg' }] };
	const targetEl = makeTrackingElement('div');

	// First render
	engine._runThumbnailDecorators(targetEl, section.images[0], section);
	assert.strictEqual(callCount, 1, 'I3: fn called on first render');

	// Second render on SAME element → skip via WeakMap
	engine._runThumbnailDecorators(targetEl, section.images[0], section);
	assert.strictEqual(callCount, 1, 'I3: fn NOT called on second render of same element');

	// Brand-new element → should trigger again (WeakMap keys old node)
	const newEl = makeTrackingElement('div');
	engine._runThumbnailDecorators(newEl, section.images[0], section);
	assert.strictEqual(callCount, 2, 'I3: fn called again on brand-new element node');
	console.log('  I3: PASS — target-only fn called once per unique element node');
}

// ---- I4: New node after setLibrary → WeakMap-tracked decorator runs again ----

console.log('I4: Replacement node after setLibrary → target-only decorator runs on new node');
{
	const engine = makeBareInstance();
	let callCount = 0;
	engine.addThumbnailDecorator((el) => {
		callCount++;
		// Only mutate; no child injection
		el.dataset.touched = 'true';
	});

	const image = { id: 'img-0', title: 'Img', thumbnail: 'x.jpg' };
	const section = { id: 'sec-a', images: [image] };

	// Simulate first render
	const el1 = makeTrackingElement('div');
	engine._runThumbnailDecorators(el1, image, section);
	assert.strictEqual(callCount, 1, 'I4: called on first element');

	// Second render same element → skip
	engine._runThumbnailDecorators(el1, image, section);
	assert.strictEqual(callCount, 1, 'I4: skipped on second call with same element');

	// setLibrary produces a NEW element node — WeakMap key is the old node, so new node must run
	const el2 = makeTrackingElement('div'); // different object → WeakMap miss
	engine._runThumbnailDecorators(el2, image, section);
	assert.strictEqual(callCount, 2, 'I4: runs again on new element node (WeakMap key is old node)');
	console.log('  I4: PASS — runs on new node; skips on repeated old node');
}

// ---- I5: Marker-contract warn: injects child but omits data-p360-decorator-id ----

console.log('I5: Decorator injects child but omits marker → one warn on second render, not repeated');
{
	const engine = makeBareInstance();
	let callCount = 0;
	engine.addThumbnailDecorator((el) => {
		callCount++;
		// Inject a child WITHOUT the decorator id attribute
		const span = makeTrackingElement('span');
		// deliberately omit: span._attrs['data-p360-decorator-id'] = handle.id;
		el.appendChild(span);
	});

	const image = { id: 'img-0', title: 'Img', thumbnail: 'x.jpg' };
	const section = { id: 'sec-a', images: [image] };
	const targetEl = makeTrackingElement('div');

	// First render — no warn (first time is OK)
	const { warns: firstWarns } = captureConsole(() => {
		engine._runThumbnailDecorators(targetEl, image, section);
	});
	// First render may or may not warn — implementation decides. No strict check here.

	// Second render on same target — detect missing marker and warn
	const { warns: secondWarns } = captureConsole(() => {
		engine._runThumbnailDecorators(targetEl, image, section);
	});
	const markerWarns = secondWarns.filter((w) => /marker|data-p360-decorator-id/i.test(w));
	assert.ok(
		markerWarns.length >= 1,
		`I5: second render must log at least one warn about missing marker, got ${secondWarns.length} warns: ${secondWarns.join('; ')}`
	);

	// Third render — warn must NOT repeat (deduplicated per handleId+target)
	const { warns: thirdWarns } = captureConsole(() => {
		engine._runThumbnailDecorators(targetEl, image, section);
	});
	const thirdMarkerWarns = thirdWarns.filter((w) => /marker|data-p360-decorator-id/i.test(w));
	assert.strictEqual(thirdMarkerWarns.length, 0,
		`I5: warn must not repeat on third render, got: ${thirdWarns.join('; ')}`);

	console.log('  I5: PASS — missing-marker warn fires once, not repeated');
}

// ---- Done ----

teardownMockDOM();
console.log('\n=== ALL DECORATOR BOUNDS + IDEMPOTENCY TESTS PASSED ===');
process.exit(0);
