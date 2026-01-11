# Cookie Clicker Optimizer

A bookmarklet that tells you the most efficient purchase in Cookie Clicker by leveraging [Cookie Monster](https://github.com/CookieMonsterTeam/CookieMonster)'s payback period calculations.

## How It Works

The optimizer uses Cookie Monster's **Payback Period (PP)** metric to rank all available purchases. PP accounts for:
- Time to afford the item (if you don't have enough cookies yet)
- Time for the purchase to pay for itself through increased CPS
- Achievement synergies and other bonuses

**Lower PP = Better purchase**

## Installation

### Option 1: Bookmarklet (Recommended)

1. Copy the entire contents of `bookmarklet.txt`
2. In your browser, create a new bookmark
3. Name it something like "CC Optimizer"
4. Paste the copied text as the bookmark URL
5. Save the bookmark

### Option 2: Browser Console

1. Open Cookie Clicker in your browser
2. Open Developer Tools (F12 or Ctrl+Shift+I)
3. Go to the Console tab
4. Copy and paste the contents of `optimizer.js`
5. Press Enter

## Usage

1. Open [Cookie Clicker](https://orteil.dashnet.org/cookieclicker/)
2. Click your bookmarklet (or run the console script)
3. Check the browser console (F12 > Console) for results

The first time you run it, Cookie Monster will be automatically loaded if not already present (this may take a few seconds).

## Output

The optimizer displays:
- **Best Overall Purchase**: The item with the lowest PP
- **Best Affordable Purchase**: The best item you can buy right now (if different)
- **Top 5 by Efficiency**: Quick reference of your best options

Example output:
```
Cookie Clicker Optimizer
Best Overall Purchase:
  Wizard tower (Building)
  PP: 234.56 | Cost: 1.23 billion
  Save for this

Best Affordable Purchase:
  Farm (Building)
  PP: 345.67 | Cost: 50.00 million
  CAN BUY NOW
```

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
