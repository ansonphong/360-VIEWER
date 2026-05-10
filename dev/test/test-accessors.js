/**
 * Test: Manifest Accessors (getContext / getSections / getImages / getLibraryData / getCurrentImage)
 *
 * Tests that Phong360LibraryUI exposes read-only accessors returning
 * defensive copies of manifest data. Runs in Node.js with a minimal DOM mock.
 *
 * Part 1: Source inspection — verify methods exist on prototype.
 * Part 2: Functional tests — load source, create instance, call methods.
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

// Cross-realm array check: vm sandbox arrays fail Array.isArray() in the
// host realm. Use length-based checks instead of deepStrictEqual for arrays.
function isArrayLike(x) {
	return x && typeof x === 'object' && typeof x.length === 'number';
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

// ---- Fixture: minimal library.json v4 manifest ----

function createFixture() {
	return {
		version: 4,
		context: {
			scope: 'profile',
			profile: { username: 'testuser', displayName: 'Test User' },
			theme: { default: 'auto', accent: '#e13e13' },
		},
		sections: [
			{
				id: 'sec-1',
				title: 'Panoramas',
				template: 'grid',
				collapsible: true,
				collapsed: false,
				badge: { label: '3', color: '#ff0000' },
				images: [
					{
						id: 'img-1',
						shortId: 'abc123',
						slug: 'sunset-panorama',
						title: 'Sunset Panorama',
						thumbnail: 'https://example.com/thumb/abc123.jpg',
						resolutions: [
							{ id: '8k', label: '8K', width: 8192, height: 4096, url: 'https://example.com/pano/abc123-8k.jpg' },
							{ id: '4k', label: '4K', width: 4096, height: 2048, url: 'https://example.com/pano/abc123-4k.jpg' },
						],
						badges: [{ label: 'New', color: '#00ff00' }],
						tags: ['sunset', 'nature'],
						model: { name: 'SDXL', arch: 'sdxl', version: '1.0' },
						creator: { username: 'creator1', displayName: 'Creator One', avatarUrl: 'https://example.com/av/1.png' },
						reactionCount: 5,
						viewCount: 100,
					},
					{
						id: 'img-2',
						slug: 'mountain-view',
						title: 'Mountain View',
						thumbnail: 'https://example.com/thumb/def456.jpg',
						resolutions: [
							{ id: '8k', label: '8K', width: 8192, height: 4096, url: 'https://example.com/pano/def456-8k.jpg' },
						],
					},
				],
			},
			{
				id: 'sec-2',
				title: 'Architecture',
				template: 'teaser',
				collapsible: false,
				collapsed: false,
				images: [
					{
						id: 'img-3',
						slug: 'modern-house',
						title: 'Modern House',
						thumbnail: 'https://example.com/thumb/ghi789.jpg',
						resolutions: [
							{ id: '4k', label: '4K', width: 4096, height: 2048, url: 'https://example.com/pano/ghi789-4k.jpg' },
						],
					},
				],
			},
		],
		facets: {
			model: [{ id: 'sdxl', label: 'SDXL', count: 2 }],
		},
	};
}

// ---- Part 1: Source inspection — verify methods exist ----

console.log('Part 1: Source inspection');

{
	const src = fs.readFileSync(
		path.join(viewerRoot, 'extensions/phong-360-library-ui.js'),
		'utf-8'
	);

	const methods = ['getContext', 'getSections', 'getImages', 'getLibraryData', 'getCurrentImage'];
	for (const m of methods) {
		// Match method definition pattern: methodName() with optional whitespace.
		// Avoids matching incidental references like canvas.getContext('2d').
		const re = new RegExp(m + '\\s*\\(\\s*\\)', 'g');
		assert.ok(re.test(src), `Phong360LibraryUI source should contain ${m}() method`);
		console.log(`  [${m}] found in source`);
	}

	console.log('Part 1: All source inspection checks passed.\n');
}

// ---- Part 2: Functional tests ----

console.log('Part 2: Functional tests');

setupMockDOM();

const sandbox = createSandbox();

// Provide no-op constructors so library-ui's _initCore doesn't explode.
// The constructor will set this.core and this.multiViewer to undefined
// (or skip creating them), and _buildSidebarDOM/_setupLazyLoading
// use the mock DOM which is now fully populated.
sandbox.window.Phong360ViewerCore = class Phong360ViewerCore {
	constructor(opts) {
		this.options = opts;
		this.config = { sensitivity: {} };
	}
};

loadSourceInto('extensions/phong-360-library-ui.js', sandbox);

const Phong360LibraryUI = sandbox.window.Phong360LibraryUI;
assert.ok(Phong360LibraryUI, 'Phong360LibraryUI should be available via window.Phong360LibraryUI');

// Verify methods exist on prototype
console.log('  Verifying methods on prototype...');
const methods = ['getContext', 'getSections', 'getImages', 'getLibraryData', 'getCurrentImage'];
for (const m of methods) {
	assert.strictEqual(typeof Phong360LibraryUI.prototype[m], 'function',
		`Phong360LibraryUI.prototype.${m} should be a function`);
	console.log(`    ${m}: OK`);
}

// Create instance via Object.create(prototype) to skip constructor
const instance = Object.create(Phong360LibraryUI.prototype);

// Set up internal state matching the engine's internal fields
instance._context = null;
instance._sections = [];
instance._allImages = [];
instance._currentImageData = null;
instance._currentImageId = null;
instance.libraryData = null;

// --- Test: no library loaded ---

console.log('  Testing with no library loaded...');
assert.strictEqual(instance.getContext(), null,
	'getContext() should return null when no library loaded');

let arr = instance.getSections();
assert.ok(isArrayLike(arr), 'getSections() should return array when no library loaded');
assert.strictEqual(arr.length, 0, 'getSections() should return empty array when no library loaded');

arr = instance.getImages();
assert.ok(isArrayLike(arr), 'getImages() should return array when no library loaded');
assert.strictEqual(arr.length, 0, 'getImages() should return empty array when no library loaded');

assert.strictEqual(instance.getLibraryData(), null,
	'getLibraryData() should return null when no library loaded');
assert.strictEqual(instance.getCurrentImage(), null,
	'getCurrentImage() should return null when no library loaded');
console.log('    No-library state: OK');

// --- Load fixture and test shape ---

console.log('  Loading fixture...');
const fixture = createFixture();

// Simulate what _processLibraryData does
instance.libraryData = fixture;
instance._context = fixture.context;
instance._sections = fixture.sections;
instance._allImages = [];
for (const section of fixture.sections) {
	if (section.images) instance._allImages.push(...section.images);
}
instance._currentImageData = fixture.sections[0].images[0];
instance._currentImageId = fixture.sections[0].images[0].id;

// --- Test: getContext() ---

console.log('  Testing getContext()...');
const ctx = instance.getContext();
assert.ok(ctx !== null, 'getContext() should return context object');
assert.strictEqual(ctx.scope, 'profile', 'ctx.scope should be "profile"');
assert.strictEqual(ctx.profile.username, 'testuser', 'ctx.profile.username should be "testuser"');
// Verify defensive copy
ctx.scope = 'mutated';
assert.strictEqual(instance._context.scope, 'profile',
	'mutating getContext() return value should not mutate engine state');
console.log('    getContext(): OK');

// --- Test: getSections() ---

console.log('  Testing getSections()...');
const sections = instance.getSections();
assert.ok(isArrayLike(sections), 'getSections() should return an array');
assert.strictEqual(sections.length, 2, 'should return 2 sections');
assert.strictEqual(sections[0].id, 'sec-1', 'first section id should be sec-1');
assert.strictEqual(sections[0].title, 'Panoramas', 'first section title');
assert.strictEqual(sections[0].images.length, 2, 'first section has 2 images');
// Verify defensive copy
sections.pop();
assert.strictEqual(instance._sections.length, 2,
	'mutating getSections() return value should not mutate engine state');
assert.strictEqual(sections.length, 1, 'pop worked on copy only');
console.log('    getSections(): OK');

// --- Test: getImages() ---

console.log('  Testing getImages()...');
const images = instance.getImages();
assert.ok(isArrayLike(images), 'getImages() should return an array');
assert.strictEqual(images.length, 3, 'should return 3 images total (2 + 1)');
assert.strictEqual(images[0].id, 'img-1', 'first image id should be img-1');
assert.strictEqual(images[2].id, 'img-3', 'third image id should be img-3');
// Verify defensive copy
images.shift();
assert.strictEqual(instance._allImages.length, 3,
	'mutating getImages() return value should not mutate engine state');
console.log('    getImages(): OK');

// --- Test: getLibraryData() ---

console.log('  Testing getLibraryData()...');
const lib = instance.getLibraryData();
assert.ok(lib !== null, 'getLibraryData() should return manifest');
assert.strictEqual(lib.version, 4, 'should have version 4');
assert.strictEqual(lib.context.scope, 'profile', 'should have context');
assert.strictEqual(lib.sections.length, 2, 'should have 2 sections');
// Verify defensive copy: mutate a nested field
lib.sections[0].title = 'Mutated Title';
assert.strictEqual(instance.libraryData.sections[0].title, 'Panoramas',
	'mutating getLibraryData() return value should not mutate engine state');
console.log('    getLibraryData(): OK');

// --- Test: getCurrentImage() ---

console.log('  Testing getCurrentImage()...');
const curImg = instance.getCurrentImage();
assert.ok(curImg !== null, 'getCurrentImage() should return current image');
assert.strictEqual(curImg.id, 'img-1', 'should be img-1');
assert.strictEqual(curImg.title, 'Sunset Panorama', 'should have correct title');
// Verify defensive copy (shallow: mutating return won't alias the engine field)
curImg.id = 'mutated-id';
assert.strictEqual(instance._currentImageData.id, 'img-1',
	'mutating getCurrentImage() return value should not mutate engine state');
console.log('    getCurrentImage(): OK');

// --- Edge case: currentImage is null ---

console.log('  Testing getCurrentImage() with null current...');
instance._currentImageData = null;
instance._currentImageId = null;
assert.strictEqual(instance.getCurrentImage(), null,
	'getCurrentImage() should return null when no current image');
console.log('    null current: OK');

teardownMockDOM();

console.log('\nPart 2: All functional tests passed.\n');
console.log('=== ALL ACCESSOR TESTS PASSED ===');
