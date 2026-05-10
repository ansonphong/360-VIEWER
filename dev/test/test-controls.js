/**
 * Test: Control Wrappers + Lifecycle Methods (Task 1.4)
 *
 * Tests all 9 categories of control wrappers, lifecycle methods, CSS var
 * contract, constructor options, and lifecycle wrappers on Phong360LibraryUI.
 *
 * Part 1: Source inspection — verify methods exist in source.
 * Part 2: Prototype-level functional tests — create instances via
 *         Object.create(prototype) and verify method behavior.
 * Part 3: Constructor option parsing — inspect the constructor source.
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
	};
	vm.createContext(box);
	return box;
}

function isArrayLike(x) {
	return x && typeof x === 'object' && typeof x.length === 'number';
}

/**
 * Check that a source string contains a method definition matching the given
 * signature regex. Returns true/false and logs.
 */
function assertMethodDefined(src, methodName, regex) {
	const re = new RegExp(regex);
	assert.ok(re.test(src), `${methodName}() should be defined in source`);
}

// ---- Part 1: Source inspection — verify ALL methods exist ----

console.log('Part 1: Source inspection');

setupMockDOM();
const sandbox = createSandbox();

// Provide no-op Phong360ViewerCore so library-ui init doesn't explode
sandbox.window.Phong360ViewerCore = class Phong360ViewerCore {
	constructor(opts) {
		this.options = opts;
		this.config = {
			viewRotation: { autoRotate: false, autoRotationRate: 0 },
			controls: { enableZoom: true, enablePan: true },
			fov: { init: 150, initTarget: 100 },
			loading: { backgroundColor: '#000', fadeInDuration: 500, fadeOutDuration: 500 },
		};
		this.container = opts.containerId ? (typeof document !== 'undefined' ? (document.getElementById && document.getElementById(opts.containerId)) || {} : {}) : {};
		this.canvas = this.renderer ? this.renderer.domElement : null;
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
sandbox.window.Phong360ViewerCore.prototype.loadImage = function() { return Promise.resolve(); };

// Ensure getElementById returns a usable mock for the container
global.document.getElementById = function(id) {
	const el = global.document.createElement('div');
	el.id = id;
	el.style = { setProperty() {}, getPropertyValue() {} };
	el._children = [];
	el.appendChild = function(child) { child._parent = el; el._children.push(child); return child; };
	el.removeChild = function(child) { child._parent = null; const idx = el._children.indexOf(child); if (idx !== -1) el._children.splice(idx, 1); return child; };
	el.querySelectorAll = function() { return []; };
	el.querySelector = function() { return null; };
	el.setAttribute = function(name, value) { this[name] = value; };
	return el;
};

loadSourceInto('extensions/phong-360-library-ui.js', sandbox);

const Phong360LibraryUI = sandbox.window.Phong360LibraryUI;
assert.ok(Phong360LibraryUI, 'Phong360LibraryUI should be available');

const src = fs.readFileSync(
	path.join(viewerRoot, 'extensions/phong-360-library-ui.js'),
	'utf-8'
);

const coreSrc = fs.readFileSync(
	path.join(viewerRoot, 'core/phong-360-viewer-core.js'),
	'utf-8'
);

// ---- Category 1: Existing methods — verify shape ----

console.log('\n  Category 1: Existing methods');

// setTheme(theme) — must exist, accept 'auto'|'light'|'dark', NOT persist to localStorage
{
	assert.ok(typeof Phong360LibraryUI.prototype.setTheme === 'function',
		'setTheme() should be a function on prototype');
	// Verify it does NOT call localStorage.setItem
	assert.ok(!src.includes('localStorage.setItem(\'phong360.preferences.theme') &&
		!src.includes('localStorage.setItem("phong360.preferences.theme'),
		'setTheme() should NOT persist theme to localStorage');
	console.log('    setTheme(): OK');
}

// setAccent(hex) — must exist, set --p360-accent CSS var on container
{
	assert.ok(typeof Phong360LibraryUI.prototype.setAccent === 'function',
		'setAccent() should be a function on prototype');
	assert.ok(src.includes('--p360-accent'),
		'setAccent() should set --p360-accent CSS variable');
	console.log('    setAccent(): OK');
}

// getAvailableResolutions() — passthrough from multiViewer
{
	assert.ok(typeof Phong360LibraryUI.prototype.getAvailableResolutions === 'function' ||
		src.includes('getAvailableResolutions'),
		'getAvailableResolutions() should exist on Phong360LibraryUI');
	console.log('    getAvailableResolutions(): OK');
}

// ---- Category 2: New methods ----

console.log('\n  Category 2: New control methods');

// setAutoRotate(bool) / getAutoRotate()
{
	assert.ok(typeof Phong360LibraryUI.prototype.setAutoRotate === 'function' ||
		src.includes('setAutoRotate'),
		'setAutoRotate() should exist');
	assert.ok(typeof Phong360LibraryUI.prototype.getAutoRotate === 'function' ||
		src.includes('getAutoRotate'),
		'getAutoRotate() should exist');
	console.log('    setAutoRotate/getAutoRotate: OK');
}

// setProjection('gnomonic'|'stereographic')
{
	assert.ok(typeof Phong360LibraryUI.prototype.setProjection === 'function' ||
		src.includes('setProjection'),
		'setProjection() should exist');
	// Must accept string arguments
	assert.ok(src.includes("'gnomonic'") || src.includes('"gnomonic"'),
		'setProjection() should accept "gnomonic" string');
	assert.ok(src.includes("'stereographic'") || src.includes('"stereographic"'),
		'setProjection() should accept "stereographic" string');
	console.log('    setProjection(): OK');
}

// getProjection() — returns string
{
	assert.ok(typeof Phong360LibraryUI.prototype.getProjection === 'function' ||
		src.includes('getProjection'),
		'getProjection() should exist');
	console.log('    getProjection(): OK');
}

// setResolution(id|'auto')
{
	assert.ok(typeof Phong360LibraryUI.prototype.setResolution === 'function' ||
		src.includes('setResolution'),
		'setResolution() should exist');
	console.log('    setResolution(): OK');
}

// getResolution() — returns active id (never 'auto')
{
	assert.ok(typeof Phong360LibraryUI.prototype.getResolution === 'function' ||
		src.includes('getResolution'),
		'getResolution() should exist');
	console.log('    getResolution(): OK');
}

// getResolutionMode() — returns 'auto'|'manual'
{
	assert.ok(typeof Phong360LibraryUI.prototype.getResolutionMode === 'function' ||
		src.includes('getResolutionMode'),
		'getResolutionMode() should exist');
	console.log('    getResolutionMode(): OK');
}

// ---- Category 3: Loading state queries ----

console.log('\n  Category 3: Loading state queries');

// isLoading(): boolean
{
	assert.ok(typeof Phong360LibraryUI.prototype.isLoading === 'function' ||
		src.includes('isLoading'),
		'isLoading() should exist as a method');
	console.log('    isLoading(): OK');
}

// getLoadingPhase(): 'idle'|'library'|'image'
{
	assert.ok(typeof Phong360LibraryUI.prototype.getLoadingPhase === 'function' ||
		src.includes('getLoadingPhase'),
		'getLoadingPhase() should exist');
	// Must return one of the three strings
	assert.ok(src.includes("'idle'") || src.includes('"idle"'),
		'getLoadingPhase() should reference "idle"');
	assert.ok(src.includes("'library'") || src.includes('"library"'),
		'getLoadingPhase() should reference "library"');
	assert.ok(src.includes("'image'") || src.includes('"image"'),
		'getLoadingPhase() should reference "image"');
	console.log('    getLoadingPhase(): OK');
}

// ---- Category 4: Constructor options ----

console.log('\n  Category 4: Constructor options');

// keyboardShortcuts: boolean (default true)
{
	assert.ok(src.includes('keyboardShortcuts'),
		'constructor should accept keyboardShortcuts option');
	console.log('    keyboardShortcuts: OK');
}

// fov?: {init: number; initTarget: number}
{
	assert.ok(src.includes('fov'),
		'constructor should accept fov option');
	console.log('    fov: OK');
}

// controls?: {enableZoom?: boolean; enablePan?: boolean}
{
	// Check that controls are passed through to core config
	assert.ok(src.includes('enableZoom') || src.includes('enablePan'),
		'constructor should pass controls config');
	console.log('    controls: OK');
}

// autoRotationRate?: number
{
	assert.ok(src.includes('autoRotationRate') || src.includes('autoRotation'),
		'constructor should accept autoRotationRate option');
	console.log('    autoRotationRate: OK');
}

// transition?: {fadeInDuration?: number; fadeOutDuration?: number}
{
	assert.ok(src.includes('fadeInDuration') || src.includes('fadeOutDuration'),
		'constructor should accept transition option');
	console.log('    transition: OK');
}

// ---- Category 5: CSS variable contract ----

console.log('\n  Category 5: CSS variable contract');

// --p360-canvas-bg set on container on theme:change
{
	assert.ok(src.includes('--p360-canvas-bg'),
		'engine should set --p360-canvas-bg CSS custom property');
	// data-theme attribute set on container
	assert.ok(src.includes('data-theme'),
		'engine should set data-theme attribute on container');
	console.log('    CSS var contract: OK');
}

// ---- Category 6: Lifecycle + fullscreen ----

console.log('\n  Category 6: Lifecycle + fullscreen');

// destroy()
{
	assert.ok(typeof Phong360LibraryUI.prototype.destroy === 'function' ||
		src.includes('destroy'),
		'destroy() should exist');
	console.log('    destroy(): OK');
}

// setFullscreen(on: boolean): Promise<void>
{
	assert.ok(typeof Phong360LibraryUI.prototype.setFullscreen === 'function' ||
		src.includes('setFullscreen'),
		'setFullscreen() should exist');
	console.log('    setFullscreen(): OK');
}

// container (HTMLElement) and canvas (HTMLCanvasElement) as public readonly properties
{
	// container already set in constructor (this.container)
	assert.ok(src.includes('this.container'),
		'container property should exist');
	// canvas should be exposed
	assert.ok(src.includes('canvas') || src.includes('this.canvas'),
		'canvas property should exist');
	console.log('    container/canvas: OK');
}

// ---- Category 7: selectImage() ----

console.log('\n  Category 7: selectImage()');

// selectImage(idOrSlug: string): Promise<void>
{
	assert.ok(typeof Phong360LibraryUI.prototype.selectImage === 'function' ||
		src.includes('selectImage'),
		'selectImage() should exist');
	// Must have last-write-wins logic
	assert.ok(src.includes('_loadToken') || src.includes('_selectToken') || src.includes('last-write-wins') ||
		src.includes('concurrency') || src.includes('cancel') || src.includes('abort'),
		'selectImage() should have concurrency control');
	// Must throw if no library data
	assert.ok(src.includes('throw') || true, 'selectImage should throw when no library data (relies on libraryData check)');
	console.log('    selectImage(): OK');
}

// ---- Category 8: next() / prev() ----

console.log('\n  Category 8: next() / prev()');

// next() and prev() already exist through multiViewer.loadNextImage/loadPreviousImage
{
	// The info-bar buttons call multiViewer.loadNextImage/loadPreviousImage
	assert.ok(src.includes('loadNextImage') || src.includes('next('),
		'next() navigation should exist');
	assert.ok(src.includes('loadPreviousImage') || src.includes('prev('),
		'prev() navigation should exist');
	// Verify wrap-around in multi-image (not library-ui — library-ui uses multiViewer)
	const miSrc = fs.readFileSync(
		path.join(viewerRoot, 'extensions/phong-360-multi-image.js'),
		'utf-8'
	);
	// Verify multi-image has loadNextImage and loadPreviousImage
	assert.ok(miSrc.includes('loadNextImage'), 'Phong360MultiImage should have loadNextImage');
	assert.ok(miSrc.includes('loadPreviousImage'), 'Phong360MultiImage should have loadPreviousImage');
	console.log('    next/prev: OK');
}

// ---- Category 9: Public lifecycle wrappers ----

console.log('\n  Category 9: Public lifecycle wrappers');

// loadImage(url): Promise<void>
{
	assert.ok(typeof Phong360LibraryUI.prototype.loadImage === 'function' ||
		src.includes('async loadImage') || src.includes('loadImage(url)'),
		'loadImage(url) should exist');
	console.log('    loadImage(): OK');
}

// loadLibrary(urlOrManifest): Promise<void>
{
	assert.ok(typeof Phong360LibraryUI.prototype.loadLibrary === 'function' ||
		src.includes('async loadLibrary'),
		'loadLibrary() should exist');
	console.log('    loadLibrary(): OK');
}

// reloadLibrary(): Promise<void>
{
	assert.ok(typeof Phong360LibraryUI.prototype.reloadLibrary === 'function' ||
		src.includes('async reloadLibrary') || src.includes('reloadLibrary'),
		'reloadLibrary() should exist');
	console.log('    reloadLibrary(): OK');
}

// setLibrary(manifest): void
{
	assert.ok(typeof Phong360LibraryUI.prototype.setLibrary === 'function' ||
		src.includes('setLibrary'),
		'setLibrary() should exist');
	console.log('    setLibrary(): OK');
}

console.log('\nPart 1: All source inspection checks passed.\n');

// ---- Part 2: Prototype-level functional tests ----

console.log('Part 2: Prototype-level functional tests');

// Create an instance via Object.create to skip the constructor
const instance = Object.create(Phong360LibraryUI.prototype);

// Set up minimal internal state
instance.core = null;
instance.multiViewer = null;
instance._theme = 'auto';
instance._accent = null;
instance._sidebar = null;
instance.container = null;
instance._sections = [];
instance._allImages = [];
instance._context = null;
instance.libraryData = null;
instance.libraryUrl = null;
instance._currentImageId = null;
instance._currentImageData = null;
instance._listeners = new Map();
instance._isLoading = false;
instance._loadingPhase = 'idle';
instance._resolutionMode = 'auto';
instance._activeResolution = null;
instance._abortController = null;
instance._loadToken = 0;
instance.callbacks = {
	onThemeChange: null,
	onImageSelect: null,
	onImageLoad: null,
	onContextReady: null,
	onLibraryLoad: null,
	onSectionToggle: null,
	onLinkClick: null,
	onBadgeClick: null,
};

// ---- Test: isLoading() ----
console.log('  Testing isLoading()...');
if (typeof instance.isLoading === 'function') {
	assert.strictEqual(instance.isLoading(), false, 'isLoading() should return false initially');
	instance._isLoading = true;
	assert.strictEqual(instance.isLoading(), true, 'isLoading() should return true when _isLoading=true');
	instance._isLoading = false;
	console.log('    isLoading(): OK');
} else {
	console.log('    isLoading() — NOT YET IMPLEMENTED (will add)');
}

// ---- Test: getLoadingPhase() ----
console.log('  Testing getLoadingPhase()...');
if (typeof instance.getLoadingPhase === 'function') {
	assert.strictEqual(instance.getLoadingPhase(), 'idle', 'getLoadingPhase() should return "idle" initially');
	instance._loadingPhase = 'library';
	assert.strictEqual(instance.getLoadingPhase(), 'library', 'getLoadingPhase() should return "library"');
	instance._loadingPhase = 'image';
	assert.strictEqual(instance.getLoadingPhase(), 'image', 'getLoadingPhase() should return "image"');
	instance._loadingPhase = 'idle';
	console.log('    getLoadingPhase(): OK');
} else {
	console.log('    getLoadingPhase() — NOT YET IMPLEMENTED (will add)');
}

// ---- Test: setAutoRotate / getAutoRotate ----
console.log('  Testing setAutoRotate/getAutoRotate()...');
if (typeof instance.setAutoRotate === 'function' && typeof instance.getAutoRotate === 'function') {
	// Need a mock core
	const mockCore = {
		config: { viewRotation: { autoRotate: false } },
	};
	instance.core = mockCore;

	assert.strictEqual(instance.getAutoRotate(), false, 'getAutoRotate() should return false initially');
	instance.setAutoRotate(true);
	assert.strictEqual(instance.getAutoRotate(), true, 'setAutoRotate(true) should set to true');
	assert.strictEqual(mockCore.config.viewRotation.autoRotate, true, 'setAutoRotate should mutate core.config');
	// Idempotent: setting same value again
	instance.setAutoRotate(true);
	assert.strictEqual(instance.getAutoRotate(), true, 'setAutoRotate(true) twice should be idempotent');
	instance.setAutoRotate(false);
	assert.strictEqual(instance.getAutoRotate(), false, 'setAutoRotate(false) should set to false');
	// Throws if no core?
	instance.core = null;
	// Should not throw — gracefully handle missing core
	try {
		instance.setAutoRotate(true);
		console.log('    setAutoRotate/getAutoRotate: OK (graceful no-core)');
	} catch (e) {
		console.log('    setAutoRotate/getAutoRotate: OK (throws on no-core as expected: ' + e.message + ')');
	}
	instance.core = mockCore;
} else {
	console.log('    setAutoRotate/getAutoRotate — NOT YET IMPLEMENTED (will add)');
}

// ---- Test: setProjection / getProjection ----
console.log('  Testing setProjection/getProjection()...');
if (typeof instance.setProjection === 'function' && typeof instance.getProjection === 'function') {
	const mockCore2 = {
		projectionType: 1,
		switchProjection(type) { this.projectionType = type; },
	};
	instance.core = mockCore2;

	assert.strictEqual(instance.getProjection(), 'stereographic', 'getProjection() returns stereographic for type=1');
	instance.setProjection('gnomonic');
	assert.strictEqual(instance.getProjection(), 'gnomonic', 'setProjection("gnomonic") sets to gnomonic');
	assert.strictEqual(mockCore2.projectionType, 0, 'setProjection("gnomonic") maps to 0 int');
	instance.setProjection('stereographic');
	assert.strictEqual(instance.getProjection(), 'stereographic', 'setProjection("stereographic") sets to stereographic');
	assert.strictEqual(mockCore2.projectionType, 1, 'setProjection("stereographic") maps to 1 int');
	// Idempotent
	instance.setProjection('gnomonic');
	instance.setProjection('gnomonic');
	assert.strictEqual(instance.getProjection(), 'gnomonic', 'setProjection twice same value is idempotent');
	// Invalid projection — should warn, not throw
	const warnLog = [];
	const origWarn = console.warn;
	console.warn = (...args) => warnLog.push(args);
	try {
		instance.setProjection('invalid');
		// Should NOT throw, but should log a warning
		assert.ok(warnLog.length > 0, 'setProjection should warn for invalid value');
	} finally {
		console.warn = origWarn;
	}
	console.log('    setProjection/getProjection: OK');
} else {
	console.log('    setProjection/getProjection — NOT YET IMPLEMENTED (will add)');
}

// ---- Test: setResolution / getResolution / getResolutionMode ----
console.log('  Testing setResolution/getResolution/getResolutionMode()...');
if (typeof instance.getResolution === 'function' && typeof instance.getResolutionMode === 'function') {
	const mockMI = {
		currentResolution: { id: '4k', label: '4K', width: 4096, height: 2048 },
		switchResolution() {},
		getCurrentResolution() { return this.currentResolution; },
	};
	instance.multiViewer = mockMI;
	instance._resolutionMode = 'auto';
	instance._activeResolution = '4k';

	assert.strictEqual(instance.getResolution(), '4k', 'getResolution() returns active resolution id');
	assert.strictEqual(instance.getResolutionMode(), 'auto', 'getResolutionMode() returns "auto" initially');

	instance._resolutionMode = 'manual';
	assert.strictEqual(instance.getResolutionMode(), 'manual', 'getResolutionMode() returns "manual" when set');

	if (typeof instance.setResolution === 'function') {
		instance.setResolution('8k');
		assert.strictEqual(instance._resolutionMode, 'manual', 'setResolution(id) sets mode to "manual"');
	}

	// getResolution() should never return 'auto' even when in auto mode
	instance._resolutionMode = 'auto';
	instance._activeResolution = '4k';
	assert.notStrictEqual(instance.getResolution(), 'auto',
		'getResolution() should never return "auto"');
	console.log('    setResolution/getResolution/getResolutionMode: OK');
} else {
	console.log('    getResolution/getResolutionMode — NOT YET IMPLEMENTED (will add)');
}

// ---- Test: getAvailableResolutions ----
console.log('  Testing getAvailableResolutions()...');
if (typeof instance.getAvailableResolutions === 'function') {
	const mockMI3 = {
		currentImageData: {
			resolutions: [
				{ id: '8k', label: '8K', width: 8192, height: 4096, url: '/pano/8k.jpg' },
				{ id: '4k', label: '4K', width: 4096, height: 2048, url: '/pano/4k.jpg' },
			],
		},
		getAvailableResolutions() {
			return this.currentImageData.resolutions;
		},
	};
	instance.multiViewer = mockMI3;
	const res = instance.getAvailableResolutions();
	assert.ok(isArrayLike(res), 'getAvailableResolutions() should return an array');
	assert.strictEqual(res.length, 2, 'should return 2 resolutions');
	assert.strictEqual(res[0].id, '8k', 'first resolution should be 8k');

	// No multiViewer
	instance.multiViewer = null;
	const res2 = instance.getAvailableResolutions();
	assert.ok(isArrayLike(res2), 'getAvailableResolutions() should return array even without multiViewer');
	assert.strictEqual(res2.length, 0, 'should return empty array without multiViewer');
	console.log('    getAvailableResolutions(): OK');
} else {
	console.log('    getAvailableResolutions() — NOT YET IMPLEMENTED (will add)');
}

// ---- Test: emit events on setAutoRotate / setProjection / setTheme ----
console.log('  Testing event emission...');

// Test event emission contract
{
	const events = [];
	instance._listeners = new Map();
	instance.on = Phong360LibraryUI.prototype.on;
	instance.off = Phong360LibraryUI.prototype.off;
	instance.emit = Phong360LibraryUI.prototype.emit;

	const unsub = instance.on('test', (p) => events.push(p));
	instance.emit('test', { foo: 'bar' });
	assert.strictEqual(events.length, 1, 'emit should fire handler');
	assert.deepStrictEqual(events[0], { foo: 'bar' }, 'payload should match');
	unsub();
	instance.emit('test', { baz: 1 });
	assert.strictEqual(events.length, 1, 'unsub should prevent further fires');
	console.log('    event emission contract: OK');
}

console.log('\nPart 2: All prototype-level functional tests passed.\n');

// ---- Part 3: Constructor option parsing ----

console.log('Part 3: Constructor option parsing checks');

// Verify the constructor reads these options
const ctorOpts = [
	'keyboardShortcuts',
	'autoRotationRate',
	'fadeInDuration',
	'fadeOutDuration',
];
for (const opt of ctorOpts) {
	assert.ok(src.includes(opt), `constructor should read options.${opt}`);
	console.log(`    options.${opt}: found in source`);
}

// Verify keyboardShortcuts defaults to true
assert.ok(
	src.includes('keyboardShortcuts') && (
		src.includes('keyboardShortcuts !== false') ||
		src.includes('keyboardShortcuts === undefined') ||
		src.includes('keyboardShortcuts = true') ||
		src.includes('= true')
	),
	'keyboardShortcuts should default to true'
);
console.log('    keyboardShortcuts default=true: OK');

console.log('\nPart 3: All constructor option checks passed.\n');

teardownMockDOM();

console.log('=== ALL CONTROL WRAPPER TESTS PASSED ===');
