/**
 * @phong/360-engine — esbuild build script
 *
 * Produces:
 *   dist/engine.esm.js          — ESM, external: three
 *   dist/engine.umd.js          — peer-dep UMD (expects window.THREE)
 *   dist/engine.standalone.umd.js — standalone UMD (bundles Three.js)
 *   dist/engine.css             — copied from src/engine.css
 *   dist/engine.d.ts            — emitted by tsc --emitDeclarationOnly
 */

import * as esbuild from 'esbuild';
import { copyFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';

const external = ['three'];

// ---------------------------------------------------------------------------
// ESM
// ---------------------------------------------------------------------------
await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/engine.esm.js',
  external,
  target: 'es2020',
  minify: false,
});

// ---------------------------------------------------------------------------
// Peer-dep UMD (expects window.THREE)
// ---------------------------------------------------------------------------
await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'iife',
  globalName: 'Phong360Engine',
  outfile: 'dist/engine.umd.js',
  external,
  target: 'es2020',
  minify: false,
  footer: {
    js: 'window.Phong360Engine = Phong360Engine;',
  },
});

// ---------------------------------------------------------------------------
// Standalone UMD (bundles Three.js for zero-dep <script> consumers)
// ---------------------------------------------------------------------------
await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'iife',
  globalName: 'Phong360Engine',
  outfile: 'dist/engine.standalone.umd.js',
  target: 'es2020',
  minify: false,
  footer: {
    js: 'window.Phong360Engine = Phong360Engine;',
  },
});

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
copyFileSync('src/engine.css', 'dist/engine.css');

// ---------------------------------------------------------------------------
// TypeScript declarations
// ---------------------------------------------------------------------------
execSync('npx tsc -p tsconfig.json', { stdio: 'inherit' });
renameSync('dist/index.d.ts', 'dist/engine.d.ts');

console.log('Engine build complete');
