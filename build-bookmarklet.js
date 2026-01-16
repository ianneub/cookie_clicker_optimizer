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

// Use TypeScript bundled output if available, otherwise fall back to optimizer.js
const DIST_FILE = path.join(__dirname, 'dist', 'main.global.js');
const LEGACY_FILE = path.join(__dirname, 'optimizer.js');
const INPUT_FILE = fs.existsSync(DIST_FILE) ? DIST_FILE : LEGACY_FILE;
const OUTPUT_FILE = path.join(__dirname, 'bookmarklet.txt');

/**
 * Minify CSS by removing unnecessary whitespace
 * @param {string} css - CSS string
 * @returns {string} Minified CSS
 */
function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove comments
    .replace(/\s+/g, ' ')               // Collapse whitespace
    .replace(/\s*([{}:;,>+~])\s*/g, '$1') // Remove space around punctuation
    .replace(/;}/g, '}')                // Remove trailing semicolons
    .trim();
}

/**
 * Minify HTML by removing unnecessary whitespace
 * @param {string} html - HTML string
 * @returns {string} Minified HTML
 */
function minifyHTML(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')    // Remove comments
    .replace(/>\s+</g, '><')            // Remove whitespace between tags
    .replace(/\s+/g, ' ')               // Collapse whitespace
    .trim();
}

/**
 * Minify template literals containing CSS or HTML
 * @param {string} source - JavaScript source code
 * @returns {string} Source with minified template literals
 */
function minifyTemplateLiterals(source) {
  // Match template literals that look like CSS (contain { and })
  // or HTML (contain < and >)
  return source.replace(/`([^`]+)`/g, (_, content) => {
    // Skip if it contains ${} interpolation that might break
    if (content.includes('${') && (content.includes('<') || content.includes('{'))) {
      // For mixed content, just collapse whitespace carefully
      const minified = content
        .replace(/\n\s*/g, ' ')         // Replace newlines and leading spaces with single space
        .replace(/\s{2,}/g, ' ')        // Collapse multiple spaces
        .trim();
      return '`' + minified + '`';
    }

    // Pure CSS (has { but no <)
    if (content.includes('{') && !content.includes('<')) {
      return '`' + minifyCSS(content) + '`';
    }

    // Pure HTML (has < but minimal {)
    if (content.includes('<') && !content.includes('{')) {
      return '`' + minifyHTML(content) + '`';
    }

    // Mixed or unclear - just collapse whitespace
    const minified = content
      .replace(/\n\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return '`' + minified + '`';
  });
}

async function buildBookmarklet() {
  // Read the source file
  let source;
  try {
    source = fs.readFileSync(INPUT_FILE, 'utf8');
  } catch (err) {
    console.error(`Error reading ${INPUT_FILE}:`, err.message);
    process.exit(1);
  }

  // Pre-process: minify CSS and HTML inside template literals
  source = minifyTemplateLiterals(source);

  // Minify using terser with aggressive but safe compression
  let minified;
  try {
    const result = await minify(source, {
      compress: {
        dead_code: true,
        drop_console: false,
        drop_debugger: true,
        passes: 2,              // More passes for better optimization
        collapse_vars: true,    // Collapse single-use variables
        reduce_vars: true,      // Evaluate constant expressions
        inline: true,           // Inline simple functions
        join_vars: true,        // Join consecutive var statements
        sequences: true,        // Use comma operator
        conditionals: true,     // Optimize if statements
        evaluate: true,         // Evaluate constant expressions
        hoist_funs: true,       // Hoist function declarations
        hoist_vars: false,      // Don't hoist var (can break code)
        keep_fargs: false,      // Remove unused function args
        keep_fnames: false,     // Don't keep function names
        toplevel: true          // Compress top-level scope
      },
      mangle: {
        toplevel: true,         // Mangle top-level names
        properties: false       // Don't mangle properties (breaks Game.* access)
      },
      format: {
        comments: false,
        ecma: 2020,             // Use modern JS syntax
        wrap_iife: true         // Wrap in IIFE for safety
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
