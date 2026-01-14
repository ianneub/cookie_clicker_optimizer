#!/usr/bin/env node

/**
 * Headless Algorithm Comparison Script
 *
 * Runs Cookie Clicker in a headless browser with time acceleration (~150x)
 * to compare algorithm efficiency with real game synergies.
 *
 * Usage:
 *   node scripts/headless-compare.js [options]
 *
 * Options:
 *   --time <seconds>     Simulated game duration (default: 3600)
 *   --speed <multiplier> Time acceleration (default: 150)
 *   --cookies <number>   Starting cookies (default: 0)
 *   --verbose            Show detailed progress
 *   --no-headless        Show browser window (for debugging)
 */

const { HeadlessBrowser } = require('../headless/HeadlessBrowser');
const { TimeManipulator } = require('../headless/TimeManipulator');
const { CookieClickerGame } = require('../headless/CookieClickerGame');
const { EFFICIENCY_WEIGHT } = require('../optimizer');

// Define algorithms to compare
// Note: Functions must be self-contained (no external references) because they're serialized to the browser
const ALGORITHMS = {
  FrozenCookies: {
    description: `${EFFICIENCY_WEIGHT} * (price/cps) + (price/deltaCps)`,
    fn: (price, deltaCps, cps) => {
      if (deltaCps <= 0 || cps <= 0) return Infinity;
      return 1.15 * (price / cps) + price / deltaCps;
    }
  },
  'Naive (Payback)': {
    description: 'price / deltaCps',
    fn: (price, deltaCps) => (deltaCps > 0 ? price / deltaCps : Infinity)
  },
  'Time-Weighted (1.5)': {
    description: '1.5 * (price/cps) + (price/deltaCps)',
    fn: (price, deltaCps, cps) => {
      if (deltaCps <= 0 || cps <= 0) return Infinity;
      return 1.5 * (price / cps) + price / deltaCps;
    }
  },
  'Balanced (2.0)': {
    description: '2.0 * (price/cps) + (price/deltaCps)',
    fn: (price, deltaCps, cps) => {
      if (deltaCps <= 0 || cps <= 0) return Infinity;
      return 2.0 * (price / cps) + price / deltaCps;
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
Headless Algorithm Comparison

Usage:
  node scripts/headless-compare.js [options]

Options:
  --time <seconds>     Simulated game duration (default: 3600)
  --speed <multiplier> Time acceleration (default: 150)
  --cookies <number>   Starting cookies (default: 0)
  --verbose            Show detailed progress
  --no-headless        Show browser window (for debugging)
  --help               Show this help message

Examples:
  node scripts/headless-compare.js --time 600 --speed 100
  node scripts/headless-compare.js --cookies 10000 --verbose
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
 * Run simulation for a single algorithm
 */
async function runAlgorithmSimulation(algorithmName, algorithmFn, options) {
  const { time: duration, speed, cookies: startingCookies, verbose, headless } = options;

  const browser = new HeadlessBrowser({ headless });
  const timeManip = new TimeManipulator({ targetSpeed: speed });

  try {
    await browser.launch();
    await browser.loadCookieClicker();

    const game = new CookieClickerGame(browser.getPage());

    // Set starting cookies if specified
    if (startingCookies > 0) {
      await browser.setCookies(startingCookies);
    }

    // Inject the algorithm
    await game.injectAlgorithm(algorithmFn);

    // Start time acceleration
    await timeManip.startAcceleration(browser.getPage(), speed);

    // Calculate real time to wait
    const realDurationMs = (duration / speed) * 1000;
    const startTime = Date.now();
    let purchaseCount = 0;
    let lastProgressUpdate = 0;

    if (verbose) {
      console.log(`  Starting ${algorithmName} (${formatTime(duration)} simulated in ~${formatTime(realDurationMs / 1000)} real)`);
    }

    // Main simulation loop
    while (Date.now() - startTime < realDurationMs) {
      // Find and execute best purchase
      const best = await game.findBestPurchase();

      if (best && best.affordable) {
        if (best.type === 'Building') {
          await game.purchaseBuilding(best.buildingName, best.quantity);
        } else if (best.type === 'Upgrade') {
          await game.purchaseUpgrade(best.upgradeName);
        }
        purchaseCount++;
      }

      // Progress update every 2 real seconds
      if (verbose && Date.now() - lastProgressUpdate > 2000) {
        const stats = await timeManip.getStats(browser.getPage());
        const state = await game.getState();
        console.log(
          `    ${formatTime(stats.virtualTime)} virtual | ${formatNumber(state.cookiesPs)} CPS | ${purchaseCount} purchases`
        );
        lastProgressUpdate = Date.now();
      }

      // Small delay to let game process
      await new Promise((r) => setTimeout(r, 30));
    }

    // Stop acceleration and get final state
    await timeManip.stopAcceleration(browser.getPage());
    const finalState = await game.getState();
    const timeStats = await timeManip.getStats(browser.getPage());

    return {
      algorithm: algorithmName,
      finalCps: finalState.cookiesPs,
      finalCookies: finalState.cookies,
      totalBuildings: finalState.totalBuildings,
      purchaseCount,
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
  console.log(' HEADLESS ALGORITHM COMPARISON (Real Game Synergies)');
  console.log('═'.repeat(70));
  console.log(`\n Starting conditions:`);
  console.log(`   Duration: ${formatTime(options.time)} (simulated)`);
  console.log(`   Speed: ${options.speed}x`);
  console.log(`   Starting cookies: ${formatNumber(options.cookies)}`);
  console.log(`   Real time (parallel): ~${formatTime(options.time / options.speed)}`);
  console.log();

  const algorithmNames = Object.keys(ALGORITHMS);

  console.log(`  Running ${algorithmNames.length} algorithms in parallel...`);

  // Run all simulations in parallel
  const promises = algorithmNames.map(async (name) => {
    try {
      const result = await runAlgorithmSimulation(name, ALGORITHMS[name].fn, options);
      console.log(`    ✓ ${name}: ${formatNumber(result.finalCps)} CPS`);
      return result;
    } catch (error) {
      console.log(`    ✗ ${name}: FAILED - ${error.message}`);
      return {
        algorithm: name,
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
  const colWidth = 18;
  const nameWidth = 20;
  console.log(
    '\n' +
      ' '.repeat(nameWidth) +
      validResults.map((r) => r.algorithm.substring(0, colWidth - 2).padStart(colWidth)).join('')
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

  // Purchases
  console.log(
    'Purchases Made'.padEnd(nameWidth) +
      validResults.map((r) => (r.purchaseCount || 0).toString().padStart(colWidth)).join('')
  );

  // Total Buildings
  console.log(
    'Total Buildings'.padEnd(nameWidth) +
      validResults.map((r) => (r.totalBuildings || 0).toString().padStart(colWidth)).join('')
  );

  // Effective Speed
  console.log(
    'Effective Speed'.padEnd(nameWidth) +
      validResults.map((r) => ((r.effectiveSpeed || 0).toFixed(1) + 'x').padStart(colWidth)).join('')
  );

  // Relative performance
  console.log('\n' + '─'.repeat(70));
  console.log(' RELATIVE PERFORMANCE (vs FrozenCookies)');
  console.log('─'.repeat(70) + '\n');

  const baseline = validResults.find((r) => r.algorithm === 'FrozenCookies');
  if (baseline) {
    console.log(
      'CPS Ratio'.padEnd(nameWidth) +
        validResults
          .map((r) => {
            const ratio = ((r.finalCps / baseline.finalCps) * 100).toFixed(1) + '%';
            return ratio.padStart(colWidth);
          })
          .join('')
    );
  }

  // Winner
  const winner = validResults.reduce((a, b) => (a.finalCps > b.finalCps ? a : b));
  console.log('\n' + '═'.repeat(70));
  console.log(` WINNER: ${winner.algorithm} with ${formatNumber(winner.finalCps)} CPS`);
  console.log('═'.repeat(70) + '\n');
}

// Run
const options = parseArgs();
runComparison(options).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
