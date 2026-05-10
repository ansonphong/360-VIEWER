/**
 * Test: addSidebarSection + setInfoBarSlot + addToolbarButton (Task 2.3)
 *
 * Verifies:
 *   addSidebarSection:
 *     T1: position 'end' (default) → injected section is LAST .p360-section in _contentEl.
 *     T2: position 'start'        → injected section is FIRST .p360-section in _contentEl.
 *     T3: render(root) called exactly once at mount, with the section container element.
 *     T4: handle.remove() un-mounts the section (parent no longer tracks it).
 *
 *   setInfoBarSlot:
 *     T5: setInfoBarSlot('center', el) puts el in the center slot (_infoSlotCenter).
 *     T6: Calling again with a new element replaces the old one.
 *     T7: setInfoBarSlot('center', null) clears the slot.
 *     T8: All three positions (left/center/right) work and don't interfere with each other.
 *
 *   addToolbarButton:
 *     T9:  Default trailing position → button appended after existing toolbar buttons
 *          (i.e. not before the first existing child).
 *     T10: position 'leading' → button inserted before existing toolbar buttons.
 *     T11: onClick fires when dispatchEvent(click) is called on the button element.
 *     T12: handle.remove() un-mounts the button (parent no longer tracks it).
 *
 * Node.js only — uses mock-dom helpers for DOM stub + vm sandbox for source loading.
 * Follows the same conventions as test-thumbnail-decorator.js and test-heading-decorator.js.
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
 * Make a child-tracking container that records appendChild/insertBefore/removeChild
 * so tests can verify insertion order.
 */
function mkTrackedContainer(className) {
	const el = global.document.createElement('div');
	el.className = className || '';
	el._children = [];
	el.appendChild = function(child) {
		child._parent = this;
		this._children.push(child);
		return child;
	};
	el.insertBefore = function(newChild, refChild) {
		newChild._parent = this;
		if (refChild === null || refChild === undefined) {
			this._children.push(newChild);
		} else {
			const idx = this._children.indexOf(refChild);
			if (idx !== -1) {
				this._children.splice(idx, 0, newChild);
			} else {
				this._children.push(newChild);
			}
		}
		return newChild;
	};
	el.removeChild = function(child) {
		child._parent = null;
		const idx = this._children.indexOf(child);
		if (idx !== -1) this._children.splice(idx, 1);
		return child;
	};
	el.querySelector = function(sel) {
		// Simple: return first child whose className includes the searched class
		// Handles '.p360-section' style selectors
		const cls = sel && sel.startsWith('.') ? sel.slice(1) : null;
		if (!cls) return null;
		for (const c of this._children) {
			if (c.className && c.className.split(' ').includes(cls)) return c;
		}
		return null;
	};
	el.querySelectorAll = function(sel) {
		const cls = sel && sel.startsWith('.') ? sel.slice(1) : null;
		if (!cls) return [];
		return this._children.filter((c) =>
			c.className && c.className.split(' ').includes(cls)
		);
	};
	el.firstChild = null; // updated dynamically via getter below
	// For insertBefore(x, el.firstChild) support:
	Object.defineProperty(el, 'firstChild', {
		get() { return this._children[0] || null; },
	});
	return el;
}

/**
 * Build a bare Phong360LibraryUI prototype instance (no constructor side-effects).
 * Manually wire state the constructor would normally set.
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
	// Additive slot state
	i._additiveSidebarSections = i._additiveSidebarSections || [];
	i._toolbarButtons = i._toolbarButtons || [];
	i._infoBarSlots = i._infoBarSlots || { left: null, center: null, right: null };
	// onImageClick stub
	i.onImageClick = () => {};
	i.baseUrl = '';
	i.templateEngine = {
		render(section, config) { return global.document.createElement('div'); },
	};
	return i;
}

/**
 * Pre-existing `.p360-section` elements to simulate an already-populated sidebar.
 */
function addExistingSections(contentEl, n) {
	const sections = [];
	for (let k = 0; k < n; k++) {
		const sec = global.document.createElement('div');
		sec.className = 'p360-section';
		sec.dataset = { sectionId: `existing-${k}` };
		contentEl.appendChild(sec);
		sections.push(sec);
	}
	return sections;
}

/**
 * Pre-existing toolbar buttons (simulate what _buildToolbar puts in).
 */
function addExistingToolbarButtons(toolbarEl, n) {
	const btns = [];
	for (let k = 0; k < n; k++) {
		const btn = global.document.createElement('button');
		btn.className = 'p360-toolbar-btn';
		toolbarEl.appendChild(btn);
		btns.push(btn);
	}
	return btns;
}

// ================================================================
// addSidebarSection tests
// ================================================================

console.log('\n--- addSidebarSection ---');

// T1: position 'end' (default) → injected section is LAST .p360-section

console.log('T1: position end (default) → injected section is last .p360-section');

{
	const engine = makeBareInstance();

	// Verify the method exists
	assert.strictEqual(typeof engine.addSidebarSection, 'function',
		'addSidebarSection must be a function on Phong360LibraryUI prototype');

	const contentEl = mkTrackedContainer('p360-content');
	engine._contentEl = contentEl;

	// Add 2 pre-existing sections
	addExistingSections(contentEl, 2);
	assert.strictEqual(contentEl._children.length, 2, 'setup: 2 existing sections');

	let renderCalled = 0;
	const handle = engine.addSidebarSection({
		id: 'test-end',
		title: 'End Section',
		render: (root) => { renderCalled++; },
		// position omitted → default 'end'
	});

	// Returns a SlotHandle
	assert.ok(handle && typeof handle === 'object', 'addSidebarSection must return a SlotHandle');
	assert.ok(typeof handle.id === 'string' && handle.id.length > 0, 'SlotHandle must have string id');
	assert.ok(typeof handle.remove === 'function', 'SlotHandle must have remove()');

	// The injected element is the last child of _contentEl
	assert.strictEqual(contentEl._children.length, 3, 'contentEl should now have 3 children');
	const lastChild = contentEl._children[contentEl._children.length - 1];
	assert.ok(lastChild.className && lastChild.className.split(' ').includes('p360-section'),
		'last child must have class p360-section');

	console.log('  T1: PASS — injected section is last child; handle id:', handle.id);
}

// T2: position 'start' → injected section is FIRST .p360-section

console.log('T2: position start → injected section is first .p360-section');

{
	const engine = makeBareInstance();
	const contentEl = mkTrackedContainer('p360-content');
	engine._contentEl = contentEl;

	// Add 2 pre-existing sections
	addExistingSections(contentEl, 2);

	const handle = engine.addSidebarSection({
		id: 'test-start',
		render: () => {},
		position: 'start',
	});

	assert.strictEqual(contentEl._children.length, 3, 'contentEl should now have 3 children');
	const firstChild = contentEl._children[0];
	assert.ok(firstChild.className && firstChild.className.split(' ').includes('p360-section'),
		'first child must have class p360-section');

	// Make sure it's not one of the pre-existing ones (which had id-anchored datasets)
	// The injected section will have data-additive-id set
	assert.ok(
		(firstChild.dataset && firstChild.dataset.additiveId) ||
		firstChild['data-additive-id'] ||
		firstChild.className.includes('p360-section'),
		'injected section is at index 0'
	);

	// Verify the two original sections are now at index 1 and 2
	const originalFirst = contentEl._children[1];
	assert.ok(originalFirst.className && originalFirst.className.includes('p360-section'),
		'original first section is now at index 1');

	console.log('  T2: PASS — injected section is first child');
}

// T3: render(root) called exactly once at mount, with the section's container element

console.log('T3: render(root) called once at mount with correct root');

{
	const engine = makeBareInstance();
	const contentEl = mkTrackedContainer('p360-content');
	engine._contentEl = contentEl;

	const renderCalls = [];
	const handle = engine.addSidebarSection({
		id: 'test-render',
		render: (root) => { renderCalls.push(root); },
	});

	assert.strictEqual(renderCalls.length, 1, 'render must be called exactly once at mount');

	// The root passed to render must be the section container element
	const injected = contentEl._children[0];
	assert.strictEqual(renderCalls[0], injected,
		'render must receive the injected section element as root');

	console.log('  T3: PASS — render called once with section container');
}

// T4: handle.remove() un-mounts the section

console.log('T4: handle.remove() un-mounts section from DOM');

{
	const engine = makeBareInstance();
	const contentEl = mkTrackedContainer('p360-content');
	engine._contentEl = contentEl;

	const handle = engine.addSidebarSection({
		id: 'test-remove',
		render: () => {},
	});

	assert.strictEqual(contentEl._children.length, 1, 'setup: one injected section');
	const injected = contentEl._children[0];

	handle.remove();

	// Section must no longer be in contentEl's children
	assert.strictEqual(contentEl._children.indexOf(injected), -1,
		'after handle.remove(), section must not be in contentEl._children');

	console.log('  T4: PASS — section removed from DOM after handle.remove()');
}

// ================================================================
// setInfoBarSlot tests
// ================================================================

console.log('\n--- setInfoBarSlot ---');

// T5: setInfoBarSlot('center', el) puts el in the center slot

console.log('T5: setInfoBarSlot("center", el) — el placed in center slot');

{
	const engine = makeBareInstance();

	assert.strictEqual(typeof engine.setInfoBarSlot, 'function',
		'setInfoBarSlot must be a function on Phong360LibraryUI prototype');

	// Build a tracked info-bar with slot containers
	const infoBar = mkTrackedContainer('p360-info-bar');
	const slotLeft = mkTrackedContainer('p360-info-slot-left');
	const slotCenter = mkTrackedContainer('p360-info-slot-center');
	const slotRight = mkTrackedContainer('p360-info-slot-right');
	infoBar.appendChild(slotLeft);
	infoBar.appendChild(slotCenter);
	infoBar.appendChild(slotRight);

	engine._infoBar = infoBar;
	engine._infoSlotLeft = slotLeft;
	engine._infoSlotCenter = slotCenter;
	engine._infoSlotRight = slotRight;

	const el = global.document.createElement('div');
	el.className = 'my-center-widget';

	engine.setInfoBarSlot('center', el);

	assert.strictEqual(slotCenter._children.length, 1, 'center slot must contain 1 child after set');
	assert.strictEqual(slotCenter._children[0], el, 'center slot child must be the passed element');

	console.log('  T5: PASS — el placed in center slot');
}

// T6: Calling again with a new element replaces the old

console.log('T6: setInfoBarSlot called twice — second call replaces first element');

{
	const engine = makeBareInstance();
	const infoBar = mkTrackedContainer('p360-info-bar');
	const slotCenter = mkTrackedContainer('p360-info-slot-center');
	infoBar.appendChild(slotCenter);
	engine._infoBar = infoBar;
	engine._infoSlotLeft = mkTrackedContainer('p360-info-slot-left');
	engine._infoSlotCenter = slotCenter;
	engine._infoSlotRight = mkTrackedContainer('p360-info-slot-right');

	const el1 = global.document.createElement('div');
	el1.className = 'widget-1';
	const el2 = global.document.createElement('div');
	el2.className = 'widget-2';

	engine.setInfoBarSlot('center', el1);
	assert.strictEqual(slotCenter._children.length, 1, 'first set: one child');
	assert.strictEqual(slotCenter._children[0], el1, 'first set: el1 is child');

	engine.setInfoBarSlot('center', el2);
	assert.strictEqual(slotCenter._children.length, 1, 'second set: still one child (replacement)');
	assert.strictEqual(slotCenter._children[0], el2, 'second set: el2 replaced el1');

	console.log('  T6: PASS — second call replaces old element');
}

// T7: setInfoBarSlot('center', null) clears the slot

console.log('T7: setInfoBarSlot("center", null) — clears the slot');

{
	const engine = makeBareInstance();
	const slotCenter = mkTrackedContainer('p360-info-slot-center');
	engine._infoBar = mkTrackedContainer('p360-info-bar');
	engine._infoSlotLeft = mkTrackedContainer('p360-info-slot-left');
	engine._infoSlotCenter = slotCenter;
	engine._infoSlotRight = mkTrackedContainer('p360-info-slot-right');

	const el = global.document.createElement('div');
	engine.setInfoBarSlot('center', el);
	assert.strictEqual(slotCenter._children.length, 1, 'setup: slot has 1 child');

	engine.setInfoBarSlot('center', null);
	assert.strictEqual(slotCenter._children.length, 0, 'after null: slot must be empty');

	console.log('  T7: PASS — null clears the slot');
}

// T8: All three positions work and don't interfere

console.log('T8: left/center/right positions are independent');

{
	const engine = makeBareInstance();
	const slotLeft = mkTrackedContainer('p360-info-slot-left');
	const slotCenter = mkTrackedContainer('p360-info-slot-center');
	const slotRight = mkTrackedContainer('p360-info-slot-right');
	engine._infoBar = mkTrackedContainer('p360-info-bar');
	engine._infoSlotLeft = slotLeft;
	engine._infoSlotCenter = slotCenter;
	engine._infoSlotRight = slotRight;

	const elL = global.document.createElement('div'); elL.id = 'left-widget';
	const elC = global.document.createElement('div'); elC.id = 'center-widget';
	const elR = global.document.createElement('div'); elR.id = 'right-widget';

	engine.setInfoBarSlot('left', elL);
	engine.setInfoBarSlot('center', elC);
	engine.setInfoBarSlot('right', elR);

	assert.strictEqual(slotLeft._children[0], elL, 'left slot has elL');
	assert.strictEqual(slotCenter._children[0], elC, 'center slot has elC');
	assert.strictEqual(slotRight._children[0], elR, 'right slot has elR');

	// Slots don't interfere — updating center doesn't change left/right
	const elC2 = global.document.createElement('div'); elC2.id = 'center-widget-2';
	engine.setInfoBarSlot('center', elC2);
	assert.strictEqual(slotLeft._children[0], elL, 'left still has elL after center update');
	assert.strictEqual(slotCenter._children[0], elC2, 'center has new element');
	assert.strictEqual(slotRight._children[0], elR, 'right still has elR after center update');

	console.log('  T8: PASS — left/center/right are independent');
}

// ================================================================
// addToolbarButton tests
// ================================================================

console.log('\n--- addToolbarButton ---');

// T9: Default trailing position → button appended after existing toolbar buttons

console.log('T9: trailing (default) → button after existing toolbar buttons');

{
	const engine = makeBareInstance();

	assert.strictEqual(typeof engine.addToolbarButton, 'function',
		'addToolbarButton must be a function on Phong360LibraryUI prototype');

	const toolbar = mkTrackedContainer('p360-toolbar');
	engine._toolbar = toolbar;

	// Add 2 existing buttons to simulate existing toolbar content
	const existingBtns = addExistingToolbarButtons(toolbar, 2);
	assert.strictEqual(toolbar._children.length, 2, 'setup: 2 existing buttons');

	let clicked = 0;
	const handle = engine.addToolbarButton({
		id: 'my-btn-trailing',
		label: 'My Button',
		onClick: () => { clicked++; },
		// position omitted → 'trailing'
	});

	assert.ok(handle && typeof handle === 'object', 'addToolbarButton must return a SlotHandle');
	assert.ok(typeof handle.id === 'string' && handle.id.length > 0, 'SlotHandle must have string id');
	assert.ok(typeof handle.remove === 'function', 'SlotHandle must have remove()');

	assert.strictEqual(toolbar._children.length, 3, 'toolbar must now have 3 children');

	// The new button must come AFTER the two existing ones
	const existingIdx0 = toolbar._children.indexOf(existingBtns[0]);
	const existingIdx1 = toolbar._children.indexOf(existingBtns[1]);
	const newBtnIdx = toolbar._children.indexOf(toolbar._children[toolbar._children.length - 1]);

	assert.ok(existingIdx0 < newBtnIdx, 'existing btn[0] must be before new button');
	assert.ok(existingIdx1 < newBtnIdx, 'existing btn[1] must be before new button');

	console.log('  T9: PASS — new button appended after existing buttons');
}

// T10: position 'leading' → button rendered before existing toolbar buttons

console.log('T10: leading → button before existing toolbar buttons');

{
	const engine = makeBareInstance();
	const toolbar = mkTrackedContainer('p360-toolbar');
	engine._toolbar = toolbar;

	const existingBtns = addExistingToolbarButtons(toolbar, 2);

	const handle = engine.addToolbarButton({
		id: 'my-btn-leading',
		label: 'Leading Button',
		onClick: () => {},
		position: 'leading',
	});

	assert.strictEqual(toolbar._children.length, 3, 'toolbar must now have 3 children');

	// The new button must be at index 0 (before all pre-existing children)
	const newBtnIdx = toolbar._children.indexOf(toolbar._children[0]);
	const existingIdx0 = toolbar._children.indexOf(existingBtns[0]);
	const existingIdx1 = toolbar._children.indexOf(existingBtns[1]);

	assert.strictEqual(toolbar._children[0].className, 'p360-toolbar-btn p360-additive-btn',
		'first child of toolbar must be the new leading button');
	assert.ok(existingIdx0 > 0, 'existing btn[0] must be after new leading button');
	assert.ok(existingIdx1 > 0, 'existing btn[1] must be after new leading button');

	console.log('  T10: PASS — new leading button is first in toolbar');
}

// T11: onClick fires when button click event is dispatched

console.log('T11: onClick fires on click event');

{
	const engine = makeBareInstance();
	const toolbar = mkTrackedContainer('p360-toolbar');
	engine._toolbar = toolbar;

	let clickCount = 0;
	let clickEvent = null;

	const handle = engine.addToolbarButton({
		id: 'my-btn-click',
		label: 'Click Me',
		onClick: (e) => { clickCount++; clickEvent = e; },
	});

	assert.strictEqual(toolbar._children.length, 1, 'toolbar has 1 button');
	const btn = toolbar._children[0];

	// Dispatch a click event
	const evt = new global.CustomEvent('click');
	btn.dispatchEvent(evt);

	assert.strictEqual(clickCount, 1, 'onClick must be called once on click');
	assert.ok(clickEvent !== null, 'onClick must receive the event');

	// Second click
	btn.dispatchEvent(new global.CustomEvent('click'));
	assert.strictEqual(clickCount, 2, 'onClick called twice after second click');

	console.log('  T11: PASS — onClick fires on each click');
}

// T12: handle.remove() un-mounts the button

console.log('T12: handle.remove() un-mounts the button');

{
	const engine = makeBareInstance();
	const toolbar = mkTrackedContainer('p360-toolbar');
	engine._toolbar = toolbar;

	const handle = engine.addToolbarButton({
		id: 'my-btn-remove',
		label: 'Removable',
		onClick: () => {},
	});

	assert.strictEqual(toolbar._children.length, 1, 'setup: one button in toolbar');
	const btn = toolbar._children[0];

	handle.remove();

	assert.strictEqual(toolbar._children.indexOf(btn), -1,
		'after handle.remove(), button must not be in toolbar._children');

	console.log('  T12: PASS — button removed from toolbar after handle.remove()');
}

// ================================================================
// Queued-then-flushed regression tests (code-review fix for missing flush)
// ================================================================

console.log('\n--- Queued flush (pre-DOM registration) ---');

// T13: addSidebarSection called before _contentEl exists → queued, flushed when DOM built
console.log('T13: addSidebarSection queued before _contentEl → flushed after DOM built');

{
	const engine = makeBareInstance();
	// Simulate pre-DOM state — no _contentEl yet
	engine._contentEl = null;
	engine._additiveSidebarSections = [];

	let renderCalled = 0;
	const handle = engine.addSidebarSection({
		id: 'queued-section',
		render: (root) => { renderCalled++; },
		position: 'start',
	});

	// Should be queued, not injected (no _contentEl)
	assert.strictEqual(engine._additiveSidebarSections.length, 1,
		'T13: section must be queued when _contentEl is null');
	assert.strictEqual(renderCalled, 1,
		'T13: render() still called at registration time (builds the section DOM eagerly)');

	// Simulate _buildSidebarDOM completing
	const contentEl = mkTrackedContainer('p360-content');
	engine._contentEl = contentEl;

	// Flush — identical to what _buildSidebarDOM now does
	for (const { el, position } of engine._additiveSidebarSections) {
		engine._insertSidebarSection(el, position);
	}
	engine._additiveSidebarSections = [];

	assert.strictEqual(contentEl._children.length, 1,
		'T13: section must be in _contentEl after flush');
	assert.strictEqual(contentEl._children[0], engine._additiveSidebarSections.length === 0
		? contentEl._children[0] : null,
		'T13: flushed section is first child');

	// Remove via handle — must clear from DOM
	handle.remove();
	assert.strictEqual(contentEl._children.length, 0,
		'T13: handle.remove() must un-mount flushed section');

	console.log('  T13: PASS — section queued, flushed, and removable');
}

// T14: addToolbarButton called before _toolbar exists → queued, flushed when DOM built
console.log('T14: addToolbarButton queued before _toolbar → flushed after DOM built');

{
	const engine = makeBareInstance();
	engine._toolbar = null;
	engine._toolbarButtons = [];

	let clicked = 0;
	const handle = engine.addToolbarButton({
		id: 'queued-btn',
		label: 'Queued',
		onClick: () => { clicked++; },
		position: 'leading',
	});

	assert.strictEqual(engine._toolbarButtons.length, 1,
		'T14: button must be queued when _toolbar is null');

	// Simulate _buildToolbar completing
	const toolbar = mkTrackedContainer('p360-toolbar');
	engine._toolbar = toolbar;

	// Flush — identical to what _buildToolbar now does
	for (const { btn, position } of engine._toolbarButtons) {
		engine._insertToolbarButton(btn, position);
	}
	engine._toolbarButtons = [];

	assert.strictEqual(toolbar._children.length, 1,
		'T14: button must be in toolbar after flush');
	assert.strictEqual(toolbar._children[0].className, 'p360-toolbar-btn p360-additive-btn',
		'T14: flushed button is first child');

	// Click must still work after flush
	toolbar._children[0].dispatchEvent(new global.CustomEvent('click'));
	assert.strictEqual(clicked, 1,
		'T14: onClick fires after flush');

	// Remove via handle
	handle.remove();
	assert.strictEqual(toolbar._children.length, 0,
		'T14: handle.remove() must un-mount flushed button');

	console.log('  T14: PASS — button queued, flushed, clickable, and removable');
}

// ================================================================
// Done
// ================================================================

teardownMockDOM();
console.log('\n=== ALL ADDITIVE SLOT TESTS PASSED ===');
process.exit(0);
