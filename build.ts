/**
 * Build script using esbuild directly (no tsup/Node.js dependency)
 *
 * Usage: bun build.ts
 * Output: dist/main.global.js
 */

import * as esbuild from 'esbuild';
import { existsSync, mkdirSync } from 'fs';

// Ensure dist directory exists
if (!existsSync('dist')) {
  mkdirSync('dist');
}

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'CCOptimizer',
  target: 'es2020',
  platform: 'browser',
  outfile: 'dist/main.global.js',
  sourcemap: true,
  minify: false, // Handled by terser in build-bookmarklet.js
  external: [],
  loader: { '.css': 'text' },
  legalComments: 'none',
});

console.log('Build complete: dist/main.global.js');
