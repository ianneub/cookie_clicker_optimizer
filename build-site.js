const fs = require('fs');
const path = require('path');

const TEMPLATE = path.join(__dirname, 'site/index.html');
const BOOKMARKLET = path.join(__dirname, 'bookmarklet.txt');
const OUTPUT_DIR = path.join(__dirname, '_site');
const OUTPUT = path.join(OUTPUT_DIR, 'index.html');
const IMAGES_SRC = path.join(__dirname, 'images');
const IMAGES_DEST = path.join(OUTPUT_DIR, 'images');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read files
const template = fs.readFileSync(TEMPLATE, 'utf8');
const bookmarklet = fs.readFileSync(BOOKMARKLET, 'utf8').trim();

// Replace placeholder
const html = template.replace(/\{\{BOOKMARKLET\}\}/g, bookmarklet);

// Write output
fs.writeFileSync(OUTPUT, html);
console.log('Site built: _site/index.html');

// Copy images directory if it exists
if (fs.existsSync(IMAGES_SRC)) {
  if (!fs.existsSync(IMAGES_DEST)) {
    fs.mkdirSync(IMAGES_DEST, { recursive: true });
  }

  const files = fs.readdirSync(IMAGES_SRC);
  for (const file of files) {
    const src = path.join(IMAGES_SRC, file);
    const dest = path.join(IMAGES_DEST, file);
    fs.copyFileSync(src, dest);
    console.log(`Copied: images/${file}`);
  }
}

console.log('Site build complete!');
