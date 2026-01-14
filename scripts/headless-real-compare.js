#!/usr/bin/env node

/**
 * Headless Real Tool Comparison Script
 *
 * Runs Cookie Clicker with the REAL auto-buy implementations:
 * - Our Optimizer (Auto: ON) - loads Cookie Monster automatically
 * - Frozen Cookies (autoBuy: ON)
 *
 * Usage:
 *   node scripts/headless-real-compare.js [options]
 *
 * Options:
 *   --time <seconds>     Simulated game duration (default: 3600)
 *   --speed <multiplier> Time acceleration (default: 150)
 *   --cookies <number>   Starting cookies (default: 1000)
 *   --verbose            Show detailed progress
 *   --no-headless        Show browser window (for debugging)
 */

const path = require('path');
const fs = require('fs');
const https = require('https');
const { HeadlessBrowser } = require('../headless/HeadlessBrowser');
const { TimeManipulator } = require('../headless/TimeManipulator');

// URLs for the real tools
const FROZEN_COOKIES_URL = 'https://icehawk78.github.io/FrozenCookies/frozen_cookies.js';
const COOKIE_MONSTER_URL = 'https://cookiemonsterteam.github.io/CookieMonster/dist/CookieMonster.js';

// Path to our optimizer
const OPTIMIZER_PATH = path.resolve(__dirname, '..', 'optimizer.js');

// Cache for fetched scripts
const scriptCache = {};

/**
 * Fetch a script from URL and return its content
 */
function fetchScript(url) {
  if (scriptCache[url]) {
    return Promise.resolve(scriptCache[url]);
  }

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          scriptCache[url] = data;
          resolve(data);
        });
      })
      .on('error', reject);
  });
}

// Tools to compare
const TOOLS = {
  'Our Optimizer': {
    description: 'Cookie Monster PP + FrozenCookies efficiency formula',
    setup: async (page) => {
      // First, inject Cookie Monster directly (avoids CORS issues with file:// URLs)
      const cmScript = await fetchScript(COOKIE_MONSTER_URL);
      await page.evaluate((code) => {
        eval(code);
      }, cmScript);

      // Wait for Cookie Monster to initialize
      await page.waitForFunction(
        () =>
          typeof CookieMonsterData !== 'undefined' &&
          CookieMonsterData.Objects1 &&
          Object.keys(CookieMonsterData.Objects1).length > 0,
        { timeout: 60000 }
      );

      // Now load our optimizer.js (it will detect CM is already loaded)
      const optimizerCode = fs.readFileSync(OPTIMIZER_PATH, 'utf8');
      await page.evaluate((code) => {
        eval(code);
      }, optimizerCode);

      // Give it a moment to initialize
      await new Promise((r) => setTimeout(r, 500));

      // Enable auto-purchase
      await page.evaluate(() => {
        window.CCOptimizer.autoPurchase = true;
        window.CCOptimizer.autoGolden = false;
      });
    }
  },
  'Frozen Cookies (w=1.15)': {
    description: 'FC formula: 1.15 * (price/cps) + (price/deltaCps)',
    setup: async (page) => {
      // Inject a minimal autobuy using the real FC formula
      // FC uses efficiencyWeight=1.15 by default
      await page.evaluate(() => {
        window.FCAutoBuy = {
          enabled: true,
          efficiencyWeight: 1.15,
          interval: null,

          calculateEfficiency(price, deltaCps, currentCps) {
            if (deltaCps <= 0 || currentCps <= 0) return Infinity;
            return this.efficiencyWeight * (price / currentCps) + price / deltaCps;
          },

          findBestPurchase() {
            const candidates = [];
            const currentCps = Game.cookiesPs;

            // Buildings at 1x, 10x, 100x
            for (const name in Game.Objects) {
              const b = Game.Objects[name];
              if (b.locked) continue;

              for (const qty of [1, 10, 100]) {
                const price = b.getSumPrice(qty);
                const origAmt = b.amount;
                b.amount += qty;
                Game.CalculateGains();
                const deltaCps = Game.cookiesPs - currentCps;
                b.amount = origAmt;
                Game.CalculateGains();

                candidates.push({
                  type: 'building',
                  name,
                  qty,
                  price,
                  deltaCps,
                  efficiency: this.calculateEfficiency(price, deltaCps, currentCps),
                  affordable: Game.cookies >= price
                });
              }
            }

            // Upgrades
            for (const upgrade of Game.UpgradesInStore) {
              const price = upgrade.getPrice();
              const origBought = upgrade.bought;
              upgrade.bought = 1;
              Game.CalculateGains();
              const deltaCps = Game.cookiesPs - currentCps;
              upgrade.bought = origBought;
              Game.CalculateGains();

              candidates.push({
                type: 'upgrade',
                name: upgrade.name,
                price,
                deltaCps,
                efficiency: this.calculateEfficiency(price, deltaCps, currentCps),
                affordable: Game.cookies >= price
              });
            }

            return candidates
              .filter((c) => isFinite(c.efficiency) && c.efficiency > 0)
              .sort((a, b) => a.efficiency - b.efficiency)[0];
          },

          tick() {
            if (!this.enabled) return;
            const best = this.findBestPurchase();
            if (best && best.affordable) {
              if (best.type === 'building') {
                Game.Objects[best.name].buy(best.qty);
              } else {
                Game.Upgrades[best.name].buy();
              }
            }
          },

          start() {
            this.interval = setInterval(() => this.tick(), 200);
          }
        };

        window.FCAutoBuy.start();
      });
    }
  }
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    time: 3600,
    speed: 150,
    cookies: 15, // Minimum needed to buy first Cursor and bootstrap CPS
    verbose: false,
    headless: true
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--time':
        options.time = parseInt(args[++i], 10);
        break;
      case '--speed':
        options.speed = parseInt(args[++i], 10);
        break;
      case '--cookies':
        options.cookies = parseFloat(args[++i]);
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--no-headless':
        options.headless = false;
        break;
      case '--help':
        console.log(`
Headless Real Tool Comparison

Compares the REAL auto-buy implementations:
- Our Optimizer (Auto: ON with Cookie Monster)
- Frozen Cookies (autoBuy enabled)

Usage:
  node scripts/headless-real-compare.js [options]

Options:
  --time <seconds>     Simulated game duration (default: 3600)
  --speed <multiplier> Time acceleration (default: 150)
  --cookies <number>   Starting cookies (default: 1000)
  --verbose            Show detailed progress
  --no-headless        Show browser window (for debugging)
  --help               Show this help message

Examples:
  node scripts/headless-real-compare.js --time 1800 --speed 100
  node scripts/headless-real-compare.js --cookies 10000 --verbose
`);
        process.exit(0);
    }
  }

  return options;
}

// Format numbers nicely
function formatNumber(num) {
  if (num >= 1e15) return (num / 1e15).toFixed(2) + ' Q';
  if (num >= 1e12) return (num / 1e12).toFixed(2) + ' T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + ' B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + ' M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + ' K';
  return num.toFixed(2);
}

// Format time
function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return 'N/A';
  if (seconds < 60) return seconds.toFixed(1) + 's';
  if (seconds < 3600) return (seconds / 60).toFixed(1) + 'm';
  return (seconds / 3600).toFixed(2) + 'h';
}

/**
 * Run simulation for a single tool
 */
async function runToolSimulation(toolName, toolConfig, options) {
  const { time: duration, speed, cookies: startingCookies, verbose, headless } = options;

  const browser = new HeadlessBrowser({ headless });
  const timeManip = new TimeManipulator({ targetSpeed: speed });

  try {
    await browser.launch();
    await browser.loadCookieClicker();

    const page = browser.getPage();

    // Set starting cookies
    if (startingCookies > 0) {
      await browser.setCookies(startingCookies);
    }

    // Bootstrap: Buy one Cursor to get initial CPS (needed for efficiency calculations)
    // Both our optimizer and Frozen Cookies need non-zero CPS to work properly
    await page.evaluate(() => {
      if (Game.cookiesPs === 0 && Game.cookies >= 15) {
        Game.Objects['Cursor'].buy(1);
      }
    });

    // Setup the tool (load and configure)
    if (verbose) {
      console.log(`    Loading ${toolName}...`);
    }
    await toolConfig.setup(page);

    // Start time acceleration
    await timeManip.startAcceleration(page, speed);

    // Calculate estimated real time (for display only)
    const realDurationMs = (duration / speed) * 1000;
    let lastProgressUpdate = 0;

    if (verbose) {
      console.log(
        `    Running ${toolName} (${formatTime(duration)} simulated in ~${formatTime(realDurationMs / 1000)} real)`
      );
    }

    // Let the tool run automatically until TARGET VIRTUAL TIME is reached
    // This ensures fair comparison regardless of tool overhead
    const targetVirtualTime = duration; // in seconds
    let currentVirtualTime = 0;

    while (currentVirtualTime < targetVirtualTime) {
      // Progress update every 5 real seconds
      if (verbose && Date.now() - lastProgressUpdate > 5000) {
        const stats = await timeManip.getStats(page);
        const state = await page.evaluate(() => ({
          cps: Game.cookiesPs,
          cookies: Game.cookies,
          buildings: Object.values(Game.Objects).reduce((sum, b) => sum + b.amount, 0)
        }));
        console.log(
          `      ${formatTime(stats.virtualTime)} virtual | ${formatNumber(state.cps)} CPS | ${state.buildings} buildings`
        );
        lastProgressUpdate = Date.now();
      }

      // Small delay to let tools process
      await new Promise((r) => setTimeout(r, 100));

      // Check current virtual time
      currentVirtualTime = await timeManip.getVirtualElapsedTime(page);
    }

    // Stop acceleration and get final state
    await timeManip.stopAcceleration(page);
    const finalState = await page.evaluate(() => {
      const buildings = {};
      let totalBuildings = 0;
      for (const name in Game.Objects) {
        buildings[name] = Game.Objects[name].amount;
        totalBuildings += Game.Objects[name].amount;
      }
      return {
        cookies: Game.cookies,
        cookiesPs: Game.cookiesPs,
        cookiesEarned: Game.cookiesEarned,
        totalBuildings,
        buildings,
        upgradesOwned: Game.UpgradesOwned
      };
    });
    const timeStats = await timeManip.getStats(page);

    return {
      tool: toolName,
      finalCps: finalState.cookiesPs,
      finalCookies: finalState.cookies,
      cookiesEarned: finalState.cookiesEarned,
      totalBuildings: finalState.totalBuildings,
      upgradesOwned: finalState.upgradesOwned,
      virtualTime: timeStats.virtualTime,
      realTime: timeStats.realTime,
      effectiveSpeed: timeStats.effectiveSpeed,
      buildings: finalState.buildings
    };
  } finally {
    await browser.close();
  }
}

/**
 * Main comparison function
 */
async function runComparison(options) {
  console.log('\n' + '═'.repeat(70));
  console.log(' REAL TOOL COMPARISON (Cookie Monster vs Frozen Cookies)');
  console.log('═'.repeat(70));
  console.log(`\n Starting conditions:`);
  console.log(`   Duration: ${formatTime(options.time)} (simulated)`);
  console.log(`   Speed: ${options.speed}x`);
  console.log(`   Starting cookies: ${formatNumber(options.cookies)}`);
  console.log(`   Real time (parallel): ~${formatTime(options.time / options.speed)}`);
  console.log();

  const toolNames = Object.keys(TOOLS);

  console.log(`  Running ${toolNames.length} tools in parallel...`);

  // Run all simulations in parallel with staggered starts to avoid resource contention
  const promises = toolNames.map(async (name, index) => {
    // Small delay between browser launches
    await new Promise((r) => setTimeout(r, index * 500));
    try {
      const result = await runToolSimulation(name, TOOLS[name], options);
      console.log(`    ✓ ${name}: ${formatNumber(result.finalCps)} CPS`);
      return result;
    } catch (error) {
      console.log(`    ✗ ${name}: FAILED - ${error.message}`);
      if (options.verbose) {
        console.log(`      Stack: ${error.stack}`);
      }
      return {
        tool: name,
        finalCps: 0,
        error: error.message
      };
    }
  });

  const results = await Promise.all(promises);

  // Print results
  printResults(results, options);
}

/**
 * Print comparison results table
 */
function printResults(results, options) {
  const validResults = results.filter((r) => !r.error);
  if (validResults.length === 0) {
    console.log('\nNo successful simulations to compare.');
    return;
  }

  const bestCps = Math.max(...validResults.map((r) => r.finalCps));

  console.log('\n' + '─'.repeat(70));
  console.log(' RESULTS');
  console.log('─'.repeat(70));

  // Header
  const colWidth = 22;
  const nameWidth = 20;
  console.log(
    '\n' + ' '.repeat(nameWidth) + validResults.map((r) => r.tool.substring(0, colWidth - 2).padStart(colWidth)).join('')
  );
  console.log(' '.repeat(nameWidth) + '─'.repeat(colWidth).repeat(validResults.length));

  // Final CPS
  console.log(
    'Final CPS'.padEnd(nameWidth) +
      validResults
        .map((r) => {
          const str = formatNumber(r.finalCps);
          const marker = r.finalCps === bestCps ? ' *' : '';
          return (str + marker).padStart(colWidth);
        })
        .join('')
  );

  // Total Buildings
  console.log(
    'Total Buildings'.padEnd(nameWidth) +
      validResults.map((r) => (r.totalBuildings || 0).toString().padStart(colWidth)).join('')
  );

  // Upgrades Owned
  console.log(
    'Upgrades Owned'.padEnd(nameWidth) +
      validResults.map((r) => (r.upgradesOwned || 0).toString().padStart(colWidth)).join('')
  );

  // Cookies Earned
  console.log(
    'Cookies Earned'.padEnd(nameWidth) +
      validResults.map((r) => formatNumber(r.cookiesEarned || 0).padStart(colWidth)).join('')
  );

  // Effective Speed
  console.log(
    'Effective Speed'.padEnd(nameWidth) +
      validResults.map((r) => ((r.effectiveSpeed || 0).toFixed(1) + 'x').padStart(colWidth)).join('')
  );

  // Relative performance
  console.log('\n' + '─'.repeat(70));
  console.log(' RELATIVE PERFORMANCE');
  console.log('─'.repeat(70) + '\n');

  const ourOptimizer = validResults.find((r) => r.tool === 'Our Optimizer');
  if (ourOptimizer && ourOptimizer.finalCps > 0) {
    console.log(
      'CPS vs Our Optimizer'.padEnd(nameWidth) +
        validResults
          .map((r) => {
            const ratio = ((r.finalCps / ourOptimizer.finalCps) * 100).toFixed(1) + '%';
            return ratio.padStart(colWidth);
          })
          .join('')
    );
  }

  // Winner
  const winner = validResults.reduce((a, b) => (a.finalCps > b.finalCps ? a : b));
  console.log('\n' + '═'.repeat(70));
  console.log(` WINNER: ${winner.tool} with ${formatNumber(winner.finalCps)} CPS`);

  // Show description
  const winnerConfig = TOOLS[winner.tool];
  if (winnerConfig) {
    console.log(` Formula: ${winnerConfig.description}`);
  }
  console.log('═'.repeat(70) + '\n');

  // Building breakdown if verbose
  if (options.verbose && validResults.length > 0) {
    console.log('Building Breakdown:');
    const buildingNames = Object.keys(validResults[0].buildings || {});
    for (const building of buildingNames) {
      const counts = validResults.map((r) => (r.buildings?.[building] || 0).toString().padStart(colWidth));
      console.log(`  ${building.padEnd(nameWidth - 2)}${counts.join('')}`);
    }
  }
}

// Run
const options = parseArgs();
runComparison(options).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
