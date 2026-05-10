/**
 * Test: Event Emitter (on / off / emit)
 *
 * Tests the typed event emitter contract for Phong360MultiImage and
 * Phong360LibraryUI. Runs in Node.js with a minimal DOM mock.
 *
 * Part 1: Isolated unit tests — verify the emitter logic contract.
 * Part 2: Integration — load the actual source files and verify the
 *          methods exist and function on the real classes.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { setupMockDOM, teardownMockDOM } = require('./helpers/mock-dom');

// ---- Helpers ----

function emitterContract(name, factory) {
	console.log(`  [${name}] Testing emitter contract...`);

	// --- Registration order preserved ---
	{
		const e = factory();
		const calls = [];
		e.on('foo', (p) => calls.push('a:' + p));
		e.on('foo', (p) => calls.push('b:' + p));
		e.emit('foo', 'x');
		assert.deepStrictEqual(calls, ['a:x', 'b:x'], 'handlers fire in registration order');
	}

	// --- off removes handler ---
	{
		const e = factory();
		const calls = [];
		function h(p) { calls.push(p); }
		e.on('foo', h);
		e.emit('foo', 1);
		assert.deepStrictEqual(calls, [1], 'handler fires before removal');
		e.off('foo', h);
		e.emit('foo', 2);
		assert.deepStrictEqual(calls, [1], 'handler does not fire after off');
	}

	// --- on returns unsubscribe function ---
	{
		const e = factory();
		const calls = [];
		const unsub = e.on('foo', (p) => calls.push(p));
		e.emit('foo', 1);
		assert.deepStrictEqual(calls, [1], 'handler fires before unsubscribe');
		unsub();
		e.emit('foo', 2);
		assert.deepStrictEqual(calls, [1], 'handler does not fire after unsubscribe');
	}

	// --- unsubscribe is idempotent ---
	{
		const e = factory();
		const calls = [];
		const unsub = e.on('foo', (p) => calls.push(p));
		unsub();
		unsub();
		unsub();
		e.emit('foo', 1);
		assert.deepStrictEqual(calls, [], 'idempotent unsubscribe does not throw');
	}

	// --- off with non-existent handler is safe ---
	{
		const e = factory();
		assert.doesNotThrow(() => {
			e.off('nonexistent', () => {});
		}, 'off with unknown event does not throw');
		e.on('bar', () => {});
		assert.doesNotThrow(() => {
			e.off('bar', () => {});
		}, 'off with unknown handler does not throw');
	}

	// --- emit with no listeners does not throw ---
	{
		const e = factory();
		assert.doesNotThrow(() => {
			e.emit('nonexistent', { data: 1 });
		}, 'emit with no listeners does not throw');
	}

	// --- multiple listeners; one throwing does not block others ---
	{
		const e = factory();
		const calls = [];
		// temporarily suppress console.error for this test
		const origError = console.error;
		const errors = [];
		console.error = (...args) => errors.push(args);

		e.on('baz', (p) => calls.push('first:' + p));
		e.on('baz', () => { throw new Error('handler explosion'); });
		e.on('baz', (p) => calls.push('third:' + p));
		e.emit('baz', 'y');

		console.error = origError;

		assert.deepStrictEqual(calls, ['first:y', 'third:y'],
			'throwing handler does not block subsequent handlers');
		assert.ok(errors.length >= 1, 'error from throwing handler is logged');
	}

	// --- Multiple event types don't interfere ---
	{
		const e = factory();
		const fooCalls = [];
		const barCalls = [];
		e.on('foo', (p) => fooCalls.push(p));
		e.on('bar', (p) => barCalls.push(p));
		e.emit('foo', 1);
		e.emit('bar', 2);
		assert.deepStrictEqual(fooCalls, [1], 'foo handler only fires on foo');
		assert.deepStrictEqual(barCalls, [2], 'bar handler only fires on bar');
	}

	// --- Same handler registered twice fires twice ---
	{
		const e = factory();
		const calls = [];
		function h(p) { calls.push(p); }
		e.on('dup', h);
		e.on('dup', h);
		e.emit('dup', 'x');
		assert.deepStrictEqual(calls, ['x', 'x'], 'handler registered twice fires twice');
	}

	// --- off removes only one registration ---
	{
		const e = factory();
		const calls = [];
		function h(p) { calls.push(p); }
		e.on('dup', h);
		e.on('dup', h);
		e.off('dup', h);
		e.emit('dup', 'x');
		assert.deepStrictEqual(calls, ['x'], 'off removes one registration, other stays');
	}

	console.log(`  [${name}] PASS`);
}

// ---- Part 1: Isolated emitter contract tests ----

console.log('Part 1: Isolated emitter contract tests');

// Test 1a: Minimal impl (standalone verification of contract)
emitterContract('minimal-impl', () => {
	const listeners = new Map();
	return {
		on(event, handler) {
			if (!listeners.has(event)) listeners.set(event, []);
			listeners.get(event).push(handler);
			return () => {
				const handlers = listeners.get(event);
				if (handlers) {
					const idx = handlers.indexOf(handler);
					if (idx !== -1) handlers.splice(idx, 1);
				}
			};
		},
		off(event, handler) {
			const handlers = listeners.get(event);
			if (!handlers) return;
			const idx = handlers.indexOf(handler);
			if (idx !== -1) handlers.splice(idx, 1);
			if (handlers.length === 0) listeners.delete(event);
		},
		emit(event, payload) {
			const handlers = listeners.get(event);
			if (!handlers || handlers.length === 0) return;
			const copy = handlers.slice();
			for (const h of copy) {
				try { h(payload); }
				catch (e) { console.error(`Error in "${event}" handler:`, e); }
			}
		}
	};
});

console.log('Part 1: All isolated tests passed.\n');

// ---- Part 2: Integration — load actual source classes ----

console.log('Part 2: Integration tests (actual source files)');

setupMockDOM();

const viewerRoot = path.resolve(__dirname, '../..');

function loadSourceInto(relPath, sandbox) {
	const filePath = path.join(viewerRoot, relPath);
	const src = fs.readFileSync(filePath, 'utf-8');
	const script = new vm.Script(src, { filename: relPath });
	script.runInContext(sandbox);
}

// Create a sandbox seeded with our mocks. Use a fresh plain object
// (not `global`) so that class declarations are directly visible.
function createSandbox() {
	const box = {
		// Copy mock globals from the main global scope
		window: global.window,
		document: global.document,
		HTMLElement: global.HTMLElement,
		CustomEvent: global.CustomEvent,
		navigator: global.navigator,
		THREE: global.THREE,
		fetch: global.fetch,
		console: global.console,
		localStorage: global.localStorage,
		// Allow source to assign to window.*
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

const sandbox = createSandbox();

// Load multi-image.js (simpler; constructor only sets properties)
loadSourceInto('extensions/phong-360-multi-image.js', sandbox);

// class declarations in ES6+ don't create properties on the global object
// (like let/const). The source explicitly assigns to window.* though.
const Phong360MultiImage = sandbox.window.Phong360MultiImage;
assert.ok(Phong360MultiImage, 'Phong360MultiImage should be available via window.Phong360MultiImage');

// --- Test Phong360MultiImage ---
console.log('  [Phong360MultiImage] Verifying methods...');
{
	// Create a Phong360MultiImage instance. The constructor requires
	// { core: ... } — provide a minimal mock.
	const mockCore = {
		loadImage() {},
		config: { sensitivity: {} },
	};
	const mi = new Phong360MultiImage({ core: mockCore, images: [] });

	// Verify methods exist
	assert.strictEqual(typeof mi.on, 'function', 'mi.on should be a function');
	assert.strictEqual(typeof mi.off, 'function', 'mi.off should be a function');
	assert.strictEqual(typeof mi.emit, 'function', 'mi.emit should be a function');

	// Verify _listeners exists (cross-realm: vm Map !== host Map, use toString)
	assert.strictEqual(Object.prototype.toString.call(mi._listeners), '[object Map]',
		'mi._listeners should be a Map');

	// Quick smoke test
	const calls = [];
	const unsub = mi.on('test', (p) => calls.push(p));
	mi.emit('test', 42);
	assert.deepStrictEqual(calls, [42], 'Phong360MultiImage emit works');
	unsub();
	mi.emit('test', 99);
	assert.deepStrictEqual(calls, [42], 'Phong360MultiImage unsubscribe works');

	console.log('  [Phong360MultiImage] PASS');
}

// Run full contract test against Phong360MultiImage factory
emitterContract('Phong360MultiImage', () => {
	const mockCore = { loadImage() {}, config: { sensitivity: {} } };
	return new Phong360MultiImage({ core: mockCore, images: [] });
});

// --- Verify presence on Phong360LibraryUI via source inspection ---
// (can't instantiate — constructor calls init() which needs real THREE +
// container DOM, but we can check the class via the vm context)
{
	const src = fs.readFileSync(
		path.join(viewerRoot, 'extensions/phong-360-library-ui.js'),
		'utf-8'
	);

	// Verify the event emitter methods are defined in the source
	assert.ok(
		src.includes('on(event, handler)') || src.includes('on(event,handler)'),
		'Phong360LibraryUI should have on() method'
	);
	assert.ok(
		src.includes('off(event, handler)') || src.includes('off(event,handler)'),
		'Phong360LibraryUI should have off() method'
	);
	assert.ok(
		src.includes('emit(event') || src.includes('emit (event'),
		'Phong360LibraryUI should have emit() method'
	);
	assert.ok(
		src.includes('this._listeners = new Map()') ||
		src.includes('this._listeners=new Map()'),
		'Phong360LibraryUI should initialize _listeners Map'
	);

	console.log('  [Phong360LibraryUI] Source inspection PASS');
}

teardownMockDOM();

console.log('\nPart 2: All integration tests passed.\n');
console.log('=== ALL EVENT EMITTER TESTS PASSED ===');
