# Claude Code Instructions

## Project Overview

This is a Cookie Clicker optimizer bookmarklet that uses Cookie Monster's payback period calculations to recommend the most efficient purchase.

## Build Process

After modifying `optimizer.js`, regenerate the bookmarklet by running:

```bash
npm run build
```

This uses `build-bookmarklet.js` which:

1. Reads `optimizer.js`
2. Minifies it using terser
3. Prepends `javascript:` prefix
4. Writes output to `bookmarklet.txt`

## File Structure

- `optimizer.js` - Main source code (edit this file)
- `bookmarklet.txt` - Generated minified bookmarklet (do not edit directly)
- `build-bookmarklet.js` - Build script using terser
- `README.md` - User documentation

## Documentation

Always update `README.md` when making changes that affect user-facing functionality, such as:
- Adding new features or controls
- Changing existing behavior
- Modifying the UI

### Mermaid Diagrams

GitHub supports Mermaid diagrams in markdown. Use them to visualize flows and architecture:

````markdown
```mermaid
flowchart TD
    A[Start] --> B[Process]
    B --> C[End]
```
````

See [Mermaid documentation](https://mermaid.js.org/intro/) for syntax.

## Dependencies

- Cookie Monster addon is loaded automatically at runtime via `Game.LoadMod()`
- terser (dev dependency) for minification

## Key APIs Used

### Cookie Clicker Game Object

- `Game.cookies` - Current cookie count
- `Game.cookiesPs` - Cookies per second
- `Game.Objects[name]` - Building data
- `Game.Upgrades[name]` - Upgrade data
- `Game.UpgradesInStore` - Available upgrades
- `Game.LoadMod(url)` - Load external mod

### Cookie Monster Data

- `CookieMonsterData.Objects1[name].pp` - Building PP for buying 1
- `CookieMonsterData.Objects10[name].pp` - Building PP for buying 10
- `CookieMonsterData.Objects100[name].pp` - Building PP for buying 100
- `CookieMonsterData.Upgrades[name].pp` - Upgrade payback period
- `CookieMonsterData.Cache` - Internal cache data
