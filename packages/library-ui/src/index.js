/**
 * @phong/360-library-ui
 *
 * Batteries-included sidebar, toolbar, info-bar, and theming for
 * 360-degree panorama experiences. Depends on @phong/360-engine.
 *
 * Re-exports Phong360LibraryUI from the main source file.
 *
 * @version 5.0.0-rc.1
 * @license MIT
 */

// The main library-ui source is in library-ui.js (loaded as a side-effect).
// For now, this index re-exports by referencing the global registered in library-ui.js.
// Once Task 6.2 adds TypeScript entry points, this will switch to proper ESM re-export.

if (typeof window !== 'undefined' && window.Phong360LibraryUI) {
	// Already registered globally by library-ui.js script tag
} else {
	// In Node/ESM context, load the full module
	require('./library-ui.js');
}

const Phong360LibraryUI =
	(typeof window !== 'undefined' && window.Phong360LibraryUI) ||
	{};

module.exports = Phong360LibraryUI;
module.exports.default = Phong360LibraryUI;
