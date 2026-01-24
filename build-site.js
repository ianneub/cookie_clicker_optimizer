import { join } from 'path';
import { existsSync, mkdirSync, readdirSync } from 'fs';

const __dirname = import.meta.dir;

const TEMPLATE = join(__dirname, 'site/index.html');
const BOOKMARKLET = join(__dirname, 'bookmarklet.txt');
const OUTPUT_DIR = join(__dirname, '_site');
const OUTPUT = join(OUTPUT_DIR, 'index.html');
const IMAGES_SRC = join(__dirname, 'images');
const IMAGES_DEST = join(OUTPUT_DIR, 'images');

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read files
const template = await Bun.file(TEMPLATE).text();
const bookmarklet = (await Bun.file(BOOKMARKLET).text()).trim();

// HTML-encode for use in href attribute (prevents browser from rendering embedded text)
const bookmarkletHref = bookmarklet
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;');

// Escape for use inside a JavaScript single-quoted string
const bookmarkletJS = bookmarklet
  .replace(/\\/g, '\\\\')
  .replace(/'/g, "\\'");

// Replace placeholders
// {{BOOKMARKLET}} - HTML-encoded for href attribute
// {{BOOKMARKLET_JS}} - escaped for JavaScript string
const html = template
  .replace(/\{\{BOOKMARKLET\}\}/g, bookmarkletHref)
  .replace(/\{\{BOOKMARKLET_JS\}\}/g, bookmarkletJS);

// Write output
await Bun.write(OUTPUT, html);
console.log('Site built: _site/index.html');

// Copy images directory if it exists
if (existsSync(IMAGES_SRC)) {
  if (!existsSync(IMAGES_DEST)) {
    mkdirSync(IMAGES_DEST, { recursive: true });
  }

  const files = readdirSync(IMAGES_SRC);
  for (const file of files) {
    const src = join(IMAGES_SRC, file);
    const dest = join(IMAGES_DEST, file);
    await Bun.write(dest, Bun.file(src));
    console.log(`Copied: images/${file}`);
  }
}

console.log('Site build complete!');
