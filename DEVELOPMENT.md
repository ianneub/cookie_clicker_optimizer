# Development Guide

## Project Structure

```
src/
├── types/           # TypeScript type definitions
│   ├── game.ts      # Cookie Clicker Game object types
│   ├── cookieMonster.ts  # Cookie Monster API types
│   └── index.ts     # Internal types (Candidate, Phase, etc.)
├── core/            # Pure functions (no browser dependencies)
│   ├── constants.ts # Configuration values
│   ├── formatting.ts    # Number formatting, logging
│   ├── phase.ts     # Game phase detection
│   ├── luckyBank.ts # Lucky bank calculations
│   ├── candidates.ts    # Filtering and sorting
│   └── wrinklers.ts # Wrinkler calculations
├── browser/         # Browser/Game object wrappers
│   ├── game.ts      # Building/upgrade access
│   ├── purchases.ts # Golden upgrade finder
│   ├── cookies.ts   # Golden cookie clicking
│   └── wrinklers.ts # Wrinkler stats/popping
├── ui/              # UI components
│   ├── styles.css   # Panel styles
│   ├── panel.ts     # Panel creation, dragging
│   ├── buttons.ts   # Toggle button handlers
│   └── display.ts   # Display updates
├── state.ts         # Global state management
├── main.ts          # Entry point
└── index.ts         # Exports for testing
```

## Commands

```bash
bun run build      # Build TypeScript + generate bookmarklet
bun run build:ts   # Build TypeScript only (outputs to dist/)
bun test           # Run tests
bun run test:watch # Run tests in watch mode
```

## Build Pipeline

```
src/**/*.ts + src/ui/styles.css
    ↓ esbuild (via build.ts)
dist/main.global.js + dist/main.global.js.map
    ↓ build-bookmarklet.js (terser minification)
bookmarklet.txt
```

## Debugging with Source Maps

The build generates source maps in `dist/`. To debug with original TypeScript:

### Option 1: Paste in Console (recommended)

Copy the contents of `dist/main.global.js` and paste directly into DevTools Console. This is the most reliable method and avoids issues with ad blockers.

### Option 2: Local Server

If you want source map support for stepping through TypeScript:

1. Disable any ad blockers (they often block localhost requests)

2. Start a local server:

   ```bash
   npx serve dist -p 3000 --cors
   ```

3. Run this in Cookie Clicker's console:

   ```javascript
   fetch('http://localhost:3000/main.global.js')
     .then(r => r.text())
     .then(code => eval(code));
   ```

Open DevTools Sources tab - you'll see the original `.ts` files and can set breakpoints.

### Troubleshooting

- **ERR_BLOCKED_BY_CLIENT**: Ad blocker is blocking the request. Disable it or use Option 1.
- **CORS errors**: Make sure you're using `--cors` flag with serve

## Game Console Commands

Useful commands for testing in the browser console:

### Cookies

```javascript
Game.cookies = 1e12;              // Set to 1 trillion cookies
Game.Earn(1e15);                  // Add 1 quadrillion cookies
Game.cookiesPs = 1e9;             // Set CpS to 1 billion (temporary, recalculates)
```

### Sugar Lumps

```javascript
Game.lumps = 100;                 // Set sugar lumps
Game.lumpT = Date.now() - 1e12;   // Make next lump ready to harvest
```

### Unlocks & Upgrades

```javascript
Game.Upgrades['Lucky day'].unlock();     // Unlock specific upgrade
Game.Upgrades['Lucky day'].buy();        // Buy specific upgrade
Game.RuinTheFun();                       // Unlock everything (ruins save)
```

### Buildings

```javascript
Game.Objects['Cursor'].buy(100);         // Buy 100 cursors
Game.Objects['Cursor'].amount = 500;     // Set cursor count directly
```

### Golden Cookies & Wrinklers

```javascript
Game.shimmerTypes.golden.time = 0;       // Spawn golden cookie
Game.elderWrath = 3;                     // Max grandmapocalypse (enables wrinklers)
```

## Testing

Tests use Bun's built-in test runner and are located in `src/__tests__/`. Run with:

```bash
bun test              # Run once
bun run test:watch    # Watch mode
bun run test:coverage # With coverage report
```

**Important:** Always run `bun test` before committing. Tests alone don't catch type errors because Bun strips types without validating them. Type errors can indicate bugs even when tests pass.

## Adding New Features

1. Add pure logic to `src/core/` (easily testable)
2. Add browser wrappers to `src/browser/` if needed
3. Add UI components to `src/ui/`
4. Export from the appropriate `index.ts`
5. Add tests in `src/__tests__/`
6. Run `bun run build` to generate the bookmarklet
