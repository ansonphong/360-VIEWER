/**
 * @phong/360-library-ui — esbuild build script
 *
 * Produces:
 *   dist/library-ui.esm.js          — ESM, external: three, @phong/360-engine
 *   dist/library-ui.umd.js          — peer-dep UMD (expects window.THREE,
 *                                      window.Phong360Engine)
 *   dist/library-ui.standalone.umd.js — standalone UMD (bundles engine, but
 *                                        Three.js is still external — engine
 *                                        API contract treats it as peer-dep)
 *   dist/library-ui.css             — copied from styles/library-ui.css
 *   dist/library-ui.d.ts            — emitted by tsc --emitDeclarationOnly
 */

import * as esbuild from 'esbuild';
import { copyFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';

const external = ['three', '@phong/360-engine'];

// ---------------------------------------------------------------------------
// ESM
// ---------------------------------------------------------------------------
await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/library-ui.esm.js',
  external,
  target: 'es2020',
  minify: false,
});

// ---------------------------------------------------------------------------
// Peer-dep UMD (expects window.THREE + window.Phong360Engine)
// ---------------------------------------------------------------------------
await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'iife',
  globalName: 'Phong360LibraryUI',
  outfile: 'dist/library-ui.umd.js',
  external,
  target: 'es2020',
  minify: false,
  footer: {
    js: 'window.Phong360LibraryUI = Phong360LibraryUI;',
  },
});

// ---------------------------------------------------------------------------
// Standalone UMD (bundles engine + Three.js for zero-dep <script> consumers)
// ---------------------------------------------------------------------------
await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'iife',
  globalName: 'Phong360LibraryUI',
  outfile: 'dist/library-ui.standalone.umd.js',
  external: [],  // bundle everything
  target: 'es2020',
  minify: false,
  footer: {
    js: 'window.Phong360LibraryUI = Phong360LibraryUI;',
  },
});

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
copyFileSync('styles/library-ui.css', 'dist/library-ui.css');

// ---------------------------------------------------------------------------
// TypeScript declarations
// ---------------------------------------------------------------------------
execSync('npx tsc -p tsconfig.json', { stdio: 'inherit' });
renameSync('dist/index.d.ts', 'dist/library-ui.d.ts');

console.log('Library-UI build complete');
