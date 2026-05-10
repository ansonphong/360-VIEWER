/**
 * Minimal DOM mock for Node.js tests.
 *
 * Sets up enough browser globals that the viewer source files can be
 * loaded via vm.createContext without throwing ReferenceError.
 *
 * Usage (in test file):
 *   const { setupMockDOM, teardownMockDOM } = require('./helpers/mock-dom');
 *   setupMockDOM();
 *   // ... load source, run tests ...
 *   teardownMockDOM();
 */

'use strict';

const savedGlobals = {};

// ---- Internal mocks ----

function _mkStyle() {
	return {
		setProperty(name, value) { this['_' + name] = value; },
		getPropertyValue(name) { return this['_' + name] || ''; },
		removeProperty(name) { const v = this['_' + name]; delete this['_' + name]; return v || ''; },
	};
}

function _mkClassList() {
	return {
		_list: [],
		add(...names) { for (const n of names) { if (!this._list.includes(n)) this._list.push(n); } },
		remove(...names) { this._list = this._list.filter((c) => !names.includes(c)); },
		contains(name) { return this._list.includes(name); },
		toggle(name) {
			if (this._list.includes(name)) { this._list = this._list.filter((c) => c !== name); return false; }
			this._list.push(name); return true;
		},
		replace(oldClass, newClass) {
			const idx = this._list.indexOf(oldClass);
			if (idx !== -1) this._list[idx] = newClass;
		},
	};
}

function _mkElement(tag) {
	return {
		tagName: (tag || 'div').toUpperCase(),
		id: '',
		className: '',
		textContent: '',
		innerHTML: '',
		style: _mkStyle(),
		dataset: {},
		type: '',
		href: '',
		src: '',
		alt: '',
		title: '',
		disabled: false,
		checked: false,
		value: '',
		placeholder: '',
		clientWidth: 0,
		clientHeight: 0,
		_parent: null,
		_listeners: {},

		appendChild(child) { child._parent = this; return child; },
		removeChild(child) { child._parent = null; return child; },
		remove() { if (this._parent) this._parent.removeChild(this); },
		insertBefore(newChild, refChild) { newChild._parent = this; return newChild; },
		replaceChild(newChild, oldChild) { oldChild._parent = null; newChild._parent = this; return oldChild; },
		querySelector() { return null; },
		querySelectorAll() { return []; },
		closest() { return null; },
		contains(child) { return child === this; },
		getBoundingClientRect() { return { x: 0, y: 0, width: 1920, height: 1080, top: 0, left: 0, right: 0, bottom: 0 }; },
		focus() {},
		blur() {},
		click() {},
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
		setAttribute(name, value) { this[name] = value; },
		getAttribute(name) { return this[name] || null; },
		hasAttribute(name) { return name in this; },
		removeAttribute(name) { delete this[name]; },
		classList: _mkClassList(),
	};
}

function _mkBodyLike() {
	// body / head / documentElement — lightweight containers that hold children
	const el = _mkElement('body');
	el._children = [];
	el.appendChild = function(child) { child._parent = this; this._children.push(child); return child; };
	el.removeChild = function(child) {
		child._parent = null;
		const idx = this._children.indexOf(child);
		if (idx !== -1) this._children.splice(idx, 1);
		return child;
	};
	el.querySelector = function() { return null; };
	el.querySelectorAll = function() { return []; };
	return el;
}

function createMockDocument() {
	const doc = {
		querySelector() { return null; },
		querySelectorAll() { return []; },
		addEventListener() {},
		removeEventListener() {},
		createElement(tag) { return _mkElement(tag); },
		createElementNS(_ns, tag) { return _mkElement(tag); },
		createTextNode(text) { return { nodeType: 3, textContent: text }; },
		getElementById(id) {
			const el = _mkElement('div');
			el.id = id;
			return el;
		},
	};

	// Add body, head, documentElement (needed by library-ui constructor)
	doc.body = _mkBodyLike();
	doc.head = _mkBodyLike();
	doc.documentElement = _mkBodyLike();

	return doc;
}

// ---- Setup ----

function setupMockDOM() {
	// Save originals (skip navigator — it's a getter in Node 22+)
	savedGlobals.window = global.window;
	savedGlobals.document = global.document;
	savedGlobals.HTMLElement = global.HTMLElement;
	savedGlobals.CustomEvent = global.CustomEvent;
	savedGlobals.localStorage = global.localStorage;
	savedGlobals.fetch = global.fetch;
	savedGlobals.console = global.console;
	savedGlobals.THREE = global.THREE;
	savedGlobals.Phong360ViewerCore = global.Phong360ViewerCore;
	savedGlobals._navigatorSaved = false;

	const doc = createMockDocument();

	global.window = {
		devicePixelRatio: 1,
		innerWidth: 1920,
		innerHeight: 1080,
		location: { href: 'http://localhost/', search: '', hash: '', pathname: '/' },
		localStorage: {
			_store: {},
			getItem(k) { return this._store[k] || null; },
			setItem(k, v) { this._store[k] = String(v); },
			removeItem(k) { delete this._store[k]; },
		},
		navigator: {
			userAgent: 'node-test',
			language: 'en-US',
		},
		addEventListener() {},
		removeEventListener() {},
		dispatchEvent() {},
		requestAnimationFrame(fn) { return setTimeout(fn, 0); },
		cancelAnimationFrame(id) { clearTimeout(id); },
		matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {} }; },
		Phong360ViewerCore: null,
		Phong360MultiImage: null,
		Phong360LibraryUI: null,
		BaseRenderer: null,
		SlotRegistry: null,
		TemplateEngine: null,
	};

	global.document = doc;
	global.HTMLElement = class HTMLElement {};
	global.CustomEvent = class CustomEvent {
		constructor(type, opts = {}) {
			this.type = type;
			this.detail = opts.detail || null;
			this.bubbles = opts.bubbles || false;
			this.cancelable = opts.cancelable || false;
		}
	};

	// Node 22+ has navigator as a getter; use defineProperty to override
	const mockNav = global.window.navigator;
	try {
		Object.defineProperty(global, 'navigator', {
			value: mockNav,
			writable: true,
			configurable: true,
		});
		savedGlobals._navigatorSaved = true;
	} catch (_) {
		// Fallback: navigator may not be configurable — skip
	}

	global.fetch = async () => { throw new Error('fetch not mocked'); };

	// Minimal THREE mock (enough for class definitions that reference THREE globals)
	global.THREE = {
		Math: { RAD2DEG: 57.29577951308232, DEG2RAD: 0.017453292519943295 },
		Vector2: class Vector2 { constructor(x = 0, y = 0) { this.x = x; this.y = y; } },
		Vector3: class Vector3 { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } },
		Quaternion: class Quaternion {},
		Euler: class Euler {},
		Matrix4: class Matrix4 {},
		Raycaster: class Raycaster {},
		Spherical: class Spherical {},
		PerspectiveCamera: class PerspectiveCamera {},
		WebGLRenderer: class WebGLRenderer {
			constructor() { this.domElement = doc.createElement('canvas'); }
			setSize() {}
			setClearColor() {}
			setPixelRatio() {}
			clear() {}
		},
		Scene: class Scene {},
		SphereGeometry: class SphereGeometry {},
		MeshBasicMaterial: class MeshBasicMaterial {},
		Mesh: class Mesh {},
		TextureLoader: class TextureLoader {
			load(url, onLoad, onProgress, onError) { if (onError) onError(new Error('mock no load')); }
		},
		LinearFilter: 1006,
		NearestFilter: 1003,
		ClampToEdgeWrapping: 1001,
		RepeatWrapping: 1000,
		RGBAFormat: 1023,
		UnsignedByteType: 1009,
		DoubleSide: 2,
		Color: class Color { constructor(c) { this.c = c; } },
		PlaneGeometry: class PlaneGeometry {},
		OrthographicCamera: class OrthographicCamera {},
	};

	// Global localStorage alias
	global.localStorage = global.window.localStorage;

	// Preserve real console but silence expected warnings during tests
	global._realConsole = global.console;
	global.console = {
		log: (...args) => global._realConsole.log(...args),
		warn: (...args) => global._realConsole.warn(...args),
		error: (...args) => global._realConsole.error(...args),
		trace: (...args) => global._realConsole.trace(...args),
	};
}

function teardownMockDOM() {
	global.window = savedGlobals.window;
	global.document = savedGlobals.document;
	global.HTMLElement = savedGlobals.HTMLElement;
	global.CustomEvent = savedGlobals.CustomEvent;
	global.localStorage = savedGlobals.localStorage;
	global.fetch = savedGlobals.fetch;
	global.console = savedGlobals.console;
	global.THREE = savedGlobals.THREE;
	global.Phong360ViewerCore = savedGlobals.Phong360ViewerCore;
	// navigator is a getter in Node 22+ — skip restore
}

module.exports = { setupMockDOM, teardownMockDOM };
