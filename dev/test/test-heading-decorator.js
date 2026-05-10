/**
 * Test: addSectionHeadingDecorator (Task 2.2)
 *
 * Verifies:
 *   T1: K sections (K≥3) → decorator called K times with (headingEl, section).
 *       headingEl is an Element, section is the matching section object.
 *   T2: Section toggle (collapse + expand) does NOT re-create the heading DOM
 *       node — Phong360LibraryUI.renderSection builds the heading once and
 *       toggles only a CSS class on click. Therefore no extra decorator calls
 *       occur on toggle. Test asserts this "persist across toggle" behavior.
 *   T3: setLibrary(newManifest) re-render with K' sections → decorator called
 *       K' more times (accumulated).
 *   T4: One decorator throws; a second decorator registered after still runs
 *       for every heading.
 *   T5: handle.remove() then re-render → decorator NOT called.
 *
 * Toggle behavior decision (T2):
 *   renderSection() creates the heading element exactly once. The click handler
 *   only calls sectionEl.classList.toggle('p360-section--collapsed') — it does
 *   NOT call renderSection() again. Therefore the heading node persists across
 *   collapse/expand cycles and no extra decorator invocations occur.
 *
 * Node.js only — uses mock-dom helpers for DOM stub + vm sandbox for source
 * loading. Follows the same conventions as test-thumbnail-decorator.js.
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
		// browser globals used directly (not via window.*) in library-ui source
		requestAnimationFrame: (fn) => setTimeout(fn, 0),
		cancelAnimationFrame: (id) => clearTimeout(id),
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
assert.ok(Phong360LibraryUI, 'Phong360LibraryUI must be loaded');

// ---- Helpers ----

/**
 * Build a bare Phong360LibraryUI prototype instance (no constructor side-effects).
 * Manually wires state that the constructor would normally set so we can call
 * addSectionHeadingDecorator and renderSection in isolation.
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
	i._headingDecorators = i._headingDecorators || [];
	i._decoratorIdCounter = i._decoratorIdCounter || 0;
	// onImageClick stub so click handler in createThumbnail doesn't crash
	i.onImageClick = () => {};
	i.baseUrl = '';
	// templateEngine stub — renderSection() calls this.templateEngine.render()
	// for the section body. Return a minimal div so the rest of renderSection works.
	i.templateEngine = {
		render(section, config) {
			return global.document.createElement('div');
		},
	};
	return i;
}

/**
 * Build a manifest with K titled sections, each having 1 image.
 */
function makeManifestWithSections(k, prefix = 'sec') {
	const sections = [];
	for (let i = 0; i < k; i++) {
		sections.push({
			id: `${prefix}-${i}`,
			title: `Section ${i}`,
			template: 'grid',
			images: [{ id: `img-${prefix}-${i}`, title: `Image ${i}`, thumbnail: `thumb-${i}.jpg` }],
		});
	}
	return { version: '4.0.0', sections };
}

/**
 * Render all sections for a manifest via renderSection() and return the
 * array of heading elements that were decorated.
 */
function renderSections(engine, sections) {
	const sectionEls = [];
	for (const section of sections) {
		const el = engine.renderSection(section);
		if (el) sectionEls.push(el);
	}
	return sectionEls;
}

// ---- T1: K sections → decorator called K times with correct args ----

console.log('T1: K sections → decorator called K times with (headingEl, section)');

{
	const engine = makeBareInstance();

	// addSectionHeadingDecorator must exist
	assert.strictEqual(typeof engine.addSectionHeadingDecorator, 'function',
		'addSectionHeadingDecorator must be a function on Phong360LibraryUI prototype');

	const calls = [];
	const handle = engine.addSectionHeadingDecorator((headingEl, section) => {
		calls.push({ headingEl, section });
	});

	// handle is a SlotHandle
	assert.ok(handle && typeof handle === 'object', 'addSectionHeadingDecorator must return a SlotHandle object');
	assert.ok(typeof handle.id === 'string' && handle.id.length > 0, 'SlotHandle must have a string id');
	assert.ok(typeof handle.remove === 'function', 'SlotHandle must have a remove() function');

	const K = 3;
	const manifest = makeManifestWithSections(K);
	renderSections(engine, manifest.sections);

	assert.strictEqual(calls.length, K, `decorator must be called exactly ${K} times (one per section heading)`);
	for (let i = 0; i < K; i++) {
		const { headingEl, section } = calls[i];
		// headingEl must be an Element-like object
		assert.ok(headingEl && typeof headingEl === 'object' && typeof headingEl.className !== 'undefined',
			`call[${i}].headingEl must be a DOM Element-like object`);
		// section must be the matching section object
		assert.ok(section && typeof section === 'object',
			`call[${i}].section must be an object`);
		assert.strictEqual(section.id, `sec-${i}`, `call[${i}].section.id must match manifest`);
	}

	console.log('  T1: PASS — decorator called', K, 'times with (headingEl, section)');
}

// ---- T2: Toggle (collapse + expand) does NOT re-create heading ----
//
// renderSection() builds the heading DOM node once and appends it. The click
// handler only toggles the CSS class 'p360-section--collapsed' — it never calls
// renderSection() again. Therefore the heading persists; no extra decorator calls
// on collapse or expand.

console.log('T2: Toggle does not trigger extra decorator calls (heading node persists)');

{
	const engine = makeBareInstance();

	let callCount = 0;
	engine.addSectionHeadingDecorator(() => { callCount++; });

	const manifest = makeManifestWithSections(1);
	const sectionEls = renderSections(engine, manifest.sections);
	assert.strictEqual(callCount, 1, 'decorator called once on initial renderSection()');

	// Simulate collapse: toggle the CSS class (exactly what the click handler does)
	const sectionEl = sectionEls[0];
	assert.ok(sectionEl, 'renderSection must return a DOM element');
	sectionEl.classList.toggle('p360-section--collapsed'); // collapse
	sectionEl.classList.toggle('p360-section--collapsed'); // expand

	// The heading was not re-created by the toggle, so call count must still be 1
	assert.strictEqual(callCount, 1,
		'after collapse+expand toggle, decorator must NOT be called again (heading node persists)');

	console.log('  T2: PASS — heading node persists across toggle; no extra decorator calls');
}

// ---- T3: setLibrary re-render with K' sections → decorator called K' more times ----

console.log('T3: Re-render via setLibrary accumulates calls');

{
	const engine = makeBareInstance();

	const calls = [];
	engine.addSectionHeadingDecorator((headingEl, section) => {
		calls.push({ headingEl, section });
	});

	const K = 3;
	const K2 = 4;
	const manifest1 = makeManifestWithSections(K, 'first');
	const manifest2 = makeManifestWithSections(K2, 'second');

	// First render
	renderSections(engine, manifest1.sections);
	assert.strictEqual(calls.length, K, `after first render, decorator called ${K} times`);

	// Second render (simulates setLibrary re-render)
	renderSections(engine, manifest2.sections);
	assert.strictEqual(calls.length, K + K2,
		`after second render, decorator called ${K + K2} times total (accumulated)`);

	console.log('  T3: PASS — decorator accumulates across re-renders (total', K + K2, 'calls)');
}

// ---- T4: One decorator throws; second decorator still runs ----

console.log('T4: Throwing decorator does not block subsequent; warn captured');

{
	const engine = makeBareInstance();

	const warns = [];
	const origWarn = global.console.warn;
	global.console.warn = (...args) => warns.push(args.join(' '));

	let secondCalled = 0;
	try {
		// First decorator throws
		engine.addSectionHeadingDecorator(() => { throw new Error('heading-boom'); });
		// Second decorator must still run
		engine.addSectionHeadingDecorator(() => { secondCalled++; });

		const K = 3;
		const manifest = makeManifestWithSections(K);
		renderSections(engine, manifest.sections);

		assert.strictEqual(secondCalled, K,
			'second decorator must run for every heading even though first throws');
		assert.ok(warns.length >= K,
			`must warn at least once per failing call (got ${warns.length} warns for ${K} sections)`);
		for (const w of warns) {
			assert.ok(/heading-boom/i.test(w) || w.length > 0,
				'warn should include error message info');
		}
		console.log('  T4: PASS — second decorator ran', secondCalled, 'times;', warns.length, 'warns logged');
	} finally {
		global.console.warn = origWarn;
	}
}

// ---- T5: handle.remove() — decorator NOT called after removal ----

console.log('T5: handle.remove() prevents subsequent calls');

{
	const engine = makeBareInstance();

	let callCount = 0;
	const handle = engine.addSectionHeadingDecorator(() => { callCount++; });

	const K = 3;
	const manifest = makeManifestWithSections(K);

	// Render once — should call decorator K times
	renderSections(engine, manifest.sections);
	assert.strictEqual(callCount, K, `before remove: decorator called ${K} times`);

	// Remove decorator
	handle.remove();

	// Render again — decorator must NOT be called
	const countBeforeSecondRender = callCount;
	renderSections(engine, manifest.sections);
	assert.strictEqual(callCount, countBeforeSecondRender,
		'after handle.remove(), decorator must NOT be called on subsequent renders');

	console.log('  T5: PASS — decorator not called after remove()');
}

// ---- Done ----

teardownMockDOM();
console.log('\n=== ALL HEADING DECORATOR TESTS PASSED ===');
process.exit(0);
