# Cookie Clicker Optimizer

[![Tests](https://github.com/ianneub/cookie_clicker_optimizer/actions/workflows/deploy.yml/badge.svg)](https://github.com/ianneub/cookie_clicker_optimizer/actions/workflows/deploy.yml)

A bookmarklet that displays the most efficient purchase in Cookie Clicker using a floating on-screen panel. Leverages [Cookie Monster](https://github.com/CookieMonsterTeam/CookieMonster)'s payback period calculations.

## How It Works

The optimizer uses Cookie Monster's **Payback Period (PP)** metric to rank all available purchases. PP accounts for:
- Time to afford the item (if you don't have enough cookies yet)
- Time for the purchase to pay for itself through increased CPS
- Achievement synergies and other bonuses

**Lower PP = Better purchase**

```mermaid
flowchart TD
    A[Start Optimizer] --> B{Cookie Monster loaded?}
    B -->|No| C[Load Cookie Monster]
    C --> D[Wait for initialization]
    D --> B
    B -->|Yes| E[Start refresh loop]
    E --> F[Every 200ms]
    F --> G[Click golden/wrath cookies if enabled]
    G --> H{Purchase detected?}
    H -->|Yes| I[Find best purchase]
    H -->|No| J{2 seconds elapsed?}
    J -->|Yes| I
    J -->|No| F
    I --> K[Update display]
    K --> L{Auto-purchase enabled?}
    L -->|No| F
    L -->|Yes| M{Gold ON & golden upgrade affordable?}
    M -->|Yes| N[Buy golden upgrade]
    M -->|No| O{Best item affordable?}
    O -->|Yes| P[Buy best item]
    O -->|No| F
    N --> F
    P --> F
```

## Installation

### Quick Install (Recommended)

Visit the **[Installation Page](https://ianneub.github.io/cookie_clicker_optimizer/)** and drag the bookmarklet to your bookmarks bar.

### Manual Installation

1. Copy the entire contents of `bookmarklet.txt`
2. In your browser, create a new bookmark
3. Name it something like "CC Optimizer"
4. Paste the copied text as the bookmark URL
5. Save the bookmark

### Browser Console

1. Open Cookie Clicker in your browser
2. Open Developer Tools (F12 or Ctrl+Shift+I)
3. Go to the Console tab
4. Copy and paste the contents of `optimizer.js`
5. Press Enter

## Usage

1. Open [Cookie Clicker](https://orteil.dashnet.org/cookieclicker/)
2. Click your bookmarklet to start the optimizer
3. A floating panel appears in the top-left corner

The first time you run it, Cookie Monster will be automatically loaded if not already present (this may take a few seconds).

### Controls

- **Auto: OFF/ON** - Toggle automatic purchasing of the best item when affordable
- **Gold: OFF/ON** - Toggle automatic clicking of golden cookies
- **Wrath: OFF/ON** - Toggle automatic clicking of wrath cookies (only visible when Gold is ON)
- **Click bookmarklet again** - Toggle off (stops and removes panel)
- **Drag the header** - Move the panel anywhere on screen
- **Click X** - Close the panel
- **`CCOptimizerStop()`** - Stop from console

## Features

### Auto-Purchase Mode

Click the **Auto: OFF** button in the panel header to enable automatic purchasing. When enabled:

- The optimizer will automatically buy the **best overall** item as soon as you can afford it
- Purchases happen instantly with no delay
- Toggle off at any time by clicking the button again (shows **Auto: ON** when active)
- Disabled by default - you must explicitly enable it

### Golden Cookie Mode

Click the **Gold: OFF** button to enable golden cookie features. When enabled:

- **Auto-click**: Golden cookies are clicked instantly when they appear (checks every 200ms)
- **Upgrade prioritization**: A "Golden Priority" section appears showing upgrades that reduce golden cookie spawn time (Lucky day, Serendipity, Get lucky, etc.)
- **Lucky Bank Protection**: See below for details
- When combined with **Auto: ON**, golden cookie upgrades are purchased first when affordable
- A **Wrath: OFF** toggle appears to optionally include wrath cookies (red cookies during Grandmapocalypse)
- Both toggles are disabled by default
- Test with `new Game.shimmer('golden')` in the browser console to spawn a golden cookie

### Lucky Bank Protection

When **Gold: ON**, the optimizer protects a "Lucky bank" of cookies to maximize rewards from Lucky + Frenzy golden cookie combos:

- **Lucky Bank threshold**: Displayed below the header (42,000 × base CpS)
- **Protected purchases**: Items are only marked affordable if buying them keeps your cookies above the threshold
- **Visual indicator**: Shows green when above threshold (+surplus), red when below (need X more)
- **Auto-purchase respects bank**: When Auto: ON, purchases won't drop you below the threshold

**Why 42,000× CpS?** The Lucky golden cookie effect gives you `min(15% of bank, 900 × CpS)`. During a Frenzy (7× CpS), to get the maximum reward (6,300 × base CpS), you need 42,000 × base CpS banked. This ensures you always get the full benefit from Lucky + Frenzy combos, which are a major source of cookies in mid-to-late game.

### Auto-Refresh
The optimizer automatically updates:
- Every **2 seconds**
- **Immediately** after any purchase (building or upgrade)

### On-Screen Display
A compact floating panel shows:
- **Golden Priority** - Golden cookie upgrades when Gold: ON (no PP value since benefits are random)
- **Best Overall** - The most efficient purchase (lowest PP)
- **Best Affordable** - What you can buy right now (if different)
- **[BUY]** indicator when you can afford an item
- Cookies needed if you're saving up

### Example Display

![Optimizer Panel](images/optimizer-panel.png)

## Files

- `optimizer.js` - Full source code with comments
- `bookmarklet.txt` - Minified version for bookmark installation (generated)
- `build-bookmarklet.js` - Build script
- `README.md` - This file

## Development

To modify the optimizer:

1. Edit `optimizer.js`
2. Run `npm run build` to regenerate the bookmarklet
3. Copy the new `bookmarklet.txt` contents to your bookmark

```bash
npm install     # Install dependencies (first time only)
npm run build   # Build the bookmarklet
```

## Dependencies

This tool automatically loads [Cookie Monster](https://github.com/CookieMonsterTeam/CookieMonster) to handle the complex efficiency calculations. Cookie Monster also provides useful tooltip overlays showing PP values directly in the game UI.

## Credits

- [Cookie Monster](https://github.com/CookieMonsterTeam/CookieMonster) - The addon that powers the PP calculations
- [Cookie Clicker](https://orteil.dashnet.org/cookieclicker/) by Orteil
