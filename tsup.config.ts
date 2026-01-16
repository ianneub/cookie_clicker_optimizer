import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['iife'],
  globalName: 'CCOptimizer',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  minify: false, // We'll minify in build-bookmarklet.js for consistency
  bundle: true,
  target: 'es2020',
  platform: 'browser',
  noExternal: [/.*/], // Bundle everything
  esbuildOptions(options) {
    options.legalComments = 'none';
  },
  // Handle CSS imports
  loader: {
    '.css': 'text',
  },
});
