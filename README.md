# Cookie Clicker Optimizer

<div align="center">

[![Tests](https://github.com/ianneub/cookie_clicker_optimizer/actions/workflows/deploy.yml/badge.svg)](https://github.com/ianneub/cookie_clicker_optimizer/actions/workflows/deploy.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

**Stop guessing. Start optimizing.**

A bookmarklet that displays the most efficient purchase in Cookie Clicker using [Cookie Monster](https://github.com/CookieMonsterTeam/CookieMonster)'s payback period calculations.

<h3>Quick Install</h3>

**[Get the Bookmarklet](https://ianneub.github.io/cookie_clicker_optimizer/)**

</div>

---

## TL;DR

**The Problem**: Cookie Clicker has dozens of buildings and upgrades. Manually calculating which purchase gives the best return is tedious and error-prone.

**The Solution**: This bookmarklet analyzes all available purchases and tells you exactly what to buy next, with optional auto-purchasing.

### Why Use This?

| Feature | What It Does |
|---------|--------------|
| **Best Purchase Display** | Shows the optimal item based on Payback Period (lower = better) |
| **Auto-Purchase** | Automatically buys the best item when you can afford it |
| **Golden Cookie Handling** | Auto-clicks golden/wrath cookies, prioritizes golden upgrades |
| **Lucky Bank Protection** | Reserves cookies (3× best item price, capped at 6000× CpS) |
| **Wrinkler Management** | Tracks wrinkler rewards, suggests when to pop for faster progress |
| **Ascension Timing** | Shows prestige gain %, turns green with "Ascend!" at 100%+ |

---

## Quick Start

1. Open [Cookie Clicker](https://orteil.dashnet.org/cookieclicker/)
2. Click your bookmarklet
3. A floating panel appears showing your best purchase

![Optimizer Panel](images/optimizer-panel.png)

---

## How It Works

The optimizer uses Cookie Monster's **Payback Period (PP)** metric to rank purchases:

- **Time to afford** the item (if you don't have enough cookies)
- **Time to pay for itself** through increased CpS
- **Synergies** from achievements and bonuses

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

---

## Installation

### Quick Install (Recommended)

Visit the **[Installation Page](https://ianneub.github.io/cookie_clicker_optimizer/)** and drag the bookmarklet to your bookmarks bar.

### Manual Installation

1. Copy the entire contents of `bookmarklet.txt`
2. Create a new bookmark in your browser
3. Name it "CC Optimizer"
4. Paste the copied text as the bookmark URL

### Browser Console

```javascript
// Copy contents of dist/main.global.js and paste into DevTools Console (F12)
```

---

## Controls

| Control | Action |
|---------|--------|
| **Auto: OFF/ON** | Toggle automatic purchasing |
| **Gold: OFF/ON** | Toggle golden cookie auto-clicking |
| **Wrath: OFF/ON** | Include wrath cookies (visible when Gold ON) |
| **Wrnk: OFF/ON** | Auto-pop wrinklers when beneficial (visible during Grandmapocalypse) |
| **Drgn: OFF/ON** | Auto-switch dragon auras (visible when dragon level 5+) |
| **Drag header** | Move panel anywhere |
| **Click X** | Close panel |
| **Click bookmarklet again** | Toggle off |
| **`CCOptimizerStop()`** | Stop from console |

---

## Features

### Auto-Purchase Mode

When enabled, automatically buys the best PP item as soon as affordable. Disabled by default.

### Golden Cookie Mode

When **Gold: ON**:
- Auto-clicks golden cookies instantly
- Auto-clicks reindeer during Christmas season
- Shows "Golden Priority" section for spawn-rate upgrades
- Prioritizes golden upgrades when combined with Auto
- **Wrath** toggle appears for red cookies

Test with: `new Game.shimmer('golden')` or `new Game.shimmer('reindeer')` in console

### Lucky Bank Protection

Reserves cookies for max Lucky + Frenzy rewards:

- **3× best item price** - ensures you can buy after Lucky
- **Capped at 6000× CpS** - prevents excessive hoarding
- **Disabled below 1M CpS** - Lucky not significant early game

**Example:** Best item 1T, CpS 100M → Bank = min(3T, 600B) = 600B

### Wrinkler Management

During Grandmapocalypse:
- Shows wrinkler count and pop reward
- Highlights shiny wrinklers (3.3× reward, never auto-popped)
- Suggests when popping enables faster purchases

### Grandmapocalypse Handling

The optimizer **recommends "One mind"** to trigger Stage 1 Grandmapocalypse, which provides:

- **Wrinklers** (6× passive CpS multiplier)
- **67% Golden Cookies** (only 33% Wrath Cookies)

This is the optimal balance for active players who click golden cookies.

The optimizer **blocks Stage 2+ upgrades** to prevent further progression:

- Communal brainsweep
- Arcane sugar
- Elder Pact

These would increase Wrath Cookie rate to 66-100%, disrupting golden cookie combos. If you want full Grandmapocalypse, purchase these manually.

### Dragon Aura Management

When **Drgn: ON** (visible after dragon level 5):

- Displays current aura(s) and dragon level
- Shows recommended auras based on game phase
- Auto-switches during Frenzy combos (Dragon's Fortune + Epoch Manipulator)
- Respects 60-second cooldown between non-Frenzy switches (each switch costs one building)
- Won't switch if highest-tier building count is below 2

**Recommended Auras by Phase:**

| Phase | Primary Aura | Secondary Aura |
| ----- | ------------ | -------------- |
| Early/Mid | Elder Battalion | Radiant Appetite |
| Late (10+ kittens) | Breath of Milk | Radiant Appetite |
| Endgame (15k+ buildings) | Elder Battalion | Breath of Milk |
| During Frenzy | Dragon's Fortune | Epoch Manipulator |

Dual auras require dragon level 21+.

### Ascension Timing

Once you've ascended at least once, the panel shows:

- **Prestige**: Your current prestige level
- **Gain**: Prestige you'd receive if you ascended now, with percentage increase

When the percentage reaches **100% or higher** (doubling your prestige), the label changes to **"Ascend!"** in green, indicating a good time to reset.

This follows the common strategy of ascending when you can at least double your prestige, maximizing heavenly chip efficiency.

### Golden Switch Exclusion

The optimizer **never recommends** the Golden Switch. While it provides +50% passive CpS, it completely disables golden cookies. For active/semi-active play, golden cookie combos (Lucky + Frenzy) provide more value than the passive boost.

### Other Excluded Upgrades

The optimizer also excludes:

- **Shimmering veil** - Toggle upgrade, costs sugar lumps
- **Season switchers** - Repeatable with escalating costs (Festive/Ghostly/etc biscuits)

---

## Comparison

| Feature | This Optimizer | Cookie Monster Only | Manual Play |
|---------|---------------|---------------------|-------------|
| Best purchase recommendation | ✅ Floating panel | ⚠️ Hover tooltips | ❌ Mental math |
| Auto-purchasing | ✅ One click | ❌ Manual | ❌ Manual |
| Golden cookie handling | ✅ Auto-click + prioritize | ⚠️ Notifications only | ❌ Watch constantly |
| Lucky bank management | ✅ Auto (3× price, 6000× CpS cap) | ⚠️ Manual tracking | ❌ Guesswork |
| Wrinkler optimization | ✅ Pop suggestions | ⚠️ Shows reward only | ❌ Guesswork |
| Setup time | ✅ ~5 seconds | ⚠️ ~30 seconds | N/A |

---

## Development

```bash
bun install          # Install dependencies (first time)
bun run build        # Build TypeScript + generate bookmarklet
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed project structure and workflows.

### Key Files

| Path | Purpose |
|------|---------|
| `src/` | TypeScript source code |
| `dist/main.global.js` | Bundled JavaScript |
| `bookmarklet.txt` | Generated minified bookmarklet |

---

## Troubleshooting

### Panel not appearing

```bash
# Check browser console for errors (F12 → Console)
# Ensure you're on orteil.dashnet.org/cookieclicker/
```

### Cookie Monster timeout

If you see "Timeout waiting for Cookie Monster":
1. Refresh the Cookie Clicker page
2. Wait for game to fully load
3. Click bookmarklet again

### Auto-purchase not buying

- Check if **Auto: ON** is enabled (green)
- If **Gold: ON**, it may be saving for a golden upgrade
- Check Lucky Bank status - may be protecting cookie reserve

---

## FAQ

### Is this cheating?

That's up to you. This tool automates decisions but doesn't hack the game. It uses the same calculations Cookie Monster provides - just with automation.

### Why Cookie Monster?

Cookie Monster has years of refinement on its PP calculations, accounting for synergies, achievements, and edge cases. Why reinvent the wheel?

### Can I use without auto-purchase?

Yes! By default, auto-purchase is OFF. The panel just shows recommendations - you decide when to buy.

### Does it work on Steam version?

No, this is for the [web version](https://orteil.dashnet.org/cookieclicker/) only.

---

## Credits

- [Cookie Monster](https://github.com/CookieMonsterTeam/CookieMonster) - Powers the PP calculations
- [Cookie Clicker](https://orteil.dashnet.org/cookieclicker/) by Orteil
