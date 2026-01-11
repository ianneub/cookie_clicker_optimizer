#!/usr/bin/env node

/**
 * Build script that converts optimizer.js into a minified bookmarklet
 *
 * Usage: node build-bookmarklet.js
 * Output: bookmarklet.txt
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const INPUT_FILE = path.join(__dirname, 'optimizer.js');
const OUTPUT_FILE = path.join(__dirname, 'bookmarklet.txt');

async function buildBookmarklet() {
  // Read the source file
  let source;
  try {
    source = fs.readFileSync(INPUT_FILE, 'utf8');
  } catch (err) {
    console.error(`Error reading ${INPUT_FILE}:`, err.message);
    process.exit(1);
  }

  // Minify using terser
  let minified;
  try {
    const result = await minify(source, {
      compress: {
        dead_code: true,
        drop_console: false,
        drop_debugger: true,
        passes: 2
      },
      mangle: {
        toplevel: false
      },
      format: {
        comments: false
      }
    });
    minified = result.code;
  } catch (err) {
    console.error('Minification error:', err.message);
    process.exit(1);
  }

  // Wrap as bookmarklet
  const bookmarklet = 'javascript:' + minified;

  // Write output
  try {
    fs.writeFileSync(OUTPUT_FILE, bookmarklet);
    console.log(`Bookmarklet written to ${OUTPUT_FILE}`);
    console.log(`Original size: ${source.length} characters`);
    console.log(`Minified size: ${bookmarklet.length} characters`);
    console.log(`Compression: ${((1 - bookmarklet.length / source.length) * 100).toFixed(1)}%`);
  } catch (err) {
    console.error(`Error writing ${OUTPUT_FILE}:`, err.message);
    process.exit(1);
  }
}

buildBookmarklet();
