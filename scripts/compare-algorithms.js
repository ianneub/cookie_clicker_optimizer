#!/usr/bin/env node

/**
 * Algorithm Comparison Script
 * Compares different efficiency algorithms for Cookie Clicker optimization
 *
 * Usage:
 *   node scripts/compare-algorithms.js [options]
 *
 * Options:
 *   --time <seconds>     Simulation duration (default: 3600)
 *   --cookies <number>   Starting cookies (default: 1000)
 *   --buildings <json>   Initial buildings as JSON (default: none)
 *   --verbose            Show detailed purchase logs
 */

const { createGameSimulator } = require('../__tests__/simulation/GameSimulator');
const { createSimulationRunner } = require('../__tests__/simulation/SimulationRunner');
const { calculateEfficiency, EFFICIENCY_WEIGHT } = require('../optimizer');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    time: 3600,
    cookies: 1000,
    buildings: {},
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--time':
        options.time = parseInt(args[++i], 10);
        break;
      case '--cookies':
        options.cookies = parseFloat(args[++i]);
        break;
      case '--buildings':
        options.buildings = JSON.parse(args[++i]);
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        console.log(`
Algorithm Comparison Script

Usage:
  node scripts/compare-algorithms.js [options]

Options:
  --time <seconds>     Simulation duration (default: 3600)
  --cookies <number>   Starting cookies (default: 1000)
  --buildings <json>   Initial buildings as JSON, e.g. '{"Grandma":10}'
  --verbose            Show detailed purchase logs
  --help               Show this help message

Examples:
  node scripts/compare-algorithms.js --time 600 --cookies 10000
  node scripts/compare-algorithms.js --buildings '{"Cursor":50,"Grandma":25}'
`);
        process.exit(0);
    }
  }

  return options;
}

// Define algorithms to compare
const ALGORITHMS = {
  'FrozenCookies': {
    description: `1.15 * (price/cps) + (price/deltaCps)`,
    fn: calculateEfficiency
  },
  'Naive (Payback)': {
    description: 'price / deltaCps',
    fn: (price, deltaCps, _cps) => deltaCps > 0 ? price / deltaCps : Infinity
  },
  'CPS per Cost': {
    description: 'price / deltaCps (same as naive)',
    fn: (price, deltaCps, _cps) => deltaCps > 0 ? price / deltaCps : Infinity
  },
  'Time-Weighted (1.5)': {
    description: '1.5 * (price/cps) + (price/deltaCps)',
    fn: (price, deltaCps, cps) => {
      if (deltaCps <= 0 || cps <= 0) return Infinity;
      return 1.5 * (price / cps) + (price / deltaCps);
    }
  },
  'Time-Weighted (1.0)': {
    description: '1.0 * (price/cps) + (price/deltaCps)',
    fn: (price, deltaCps, cps) => {
      if (deltaCps <= 0 || cps <= 0) return Infinity;
      return 1.0 * (price / cps) + (price / deltaCps);
    }
  },
  'Balanced (2.0)': {
    description: '2.0 * (price/cps) + (price/deltaCps)',
    fn: (price, deltaCps, cps) => {
      if (deltaCps <= 0 || cps <= 0) return Infinity;
      return 2.0 * (price / cps) + (price / deltaCps);
    }
  }
};

// Format numbers nicely
function formatNumber(num) {
  if (num >= 1e15) return (num / 1e15).toFixed(2) + ' Q';
  if (num >= 1e12) return (num / 1e12).toFixed(2) + ' T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + ' B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + ' M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + ' K';
  return num.toFixed(2);
}

// Format time nicely
function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return 'N/A';
  if (seconds < 60) return seconds.toFixed(1) + 's';
  if (seconds < 3600) return (seconds / 60).toFixed(1) + 'm';
  return (seconds / 3600).toFixed(2) + 'h';
}

// Run simulation for a single algorithm
function runSimulation(algorithmName, algorithmFn, options) {
  const sim = createGameSimulator({
    startingCookies: options.cookies,
    initialBuildings: options.buildings
  });

  const runner = createSimulationRunner(sim, algorithmFn);

  // Track time to milestones
  const milestones = [10, 100, 1000, 10000, 100000];
  const milestoneResults = {};

  // Run with milestone tracking
  const startCps = sim.calculateCps();
  let lastMilestoneCheck = 0;

  const results = runner.run(options.time, {
    tickInterval: 0.1,
    onTick: (time, cps) => {
      // Check milestones every second
      if (time - lastMilestoneCheck >= 1) {
        for (const milestone of milestones) {
          if (!milestoneResults[milestone] && cps >= milestone) {
            milestoneResults[milestone] = time;
          }
        }
        lastMilestoneCheck = time;
      }
    }
  });

  // Final milestone check
  for (const milestone of milestones) {
    if (!milestoneResults[milestone] && results.finalCps >= milestone) {
      milestoneResults[milestone] = results.totalTime;
    }
  }

  return {
    name: algorithmName,
    finalCps: results.finalCps,
    finalCookies: results.finalCookies,
    purchases: results.purchaseCount,
    buildings: results.totalBuildings,
    milestones: milestoneResults,
    purchaseLog: results.purchases
  };
}

// Main comparison function
function compareAlgorithms(options) {
  console.log('\n' + '═'.repeat(70));
  console.log(' ALGORITHM COMPARISON');
  console.log('═'.repeat(70));
  console.log(`\n Starting conditions:`);
  console.log(`   Cookies: ${formatNumber(options.cookies)}`);
  console.log(`   Duration: ${formatTime(options.time)}`);
  if (Object.keys(options.buildings).length > 0) {
    console.log(`   Buildings: ${JSON.stringify(options.buildings)}`);
  }
  console.log();

  // Run all algorithms
  const results = [];
  const algorithmNames = Object.keys(ALGORITHMS);

  for (const name of algorithmNames) {
    process.stdout.write(`  Running ${name}...`);
    const result = runSimulation(name, ALGORITHMS[name].fn, options);
    results.push(result);
    console.log(' done');
  }

  // Find the best performer for highlighting
  const bestCps = Math.max(...results.map(r => r.finalCps));

  // Print results table
  console.log('\n' + '─'.repeat(70));
  console.log(' RESULTS');
  console.log('─'.repeat(70));

  // Header
  const colWidth = 18;
  const nameWidth = 20;
  console.log('\n' + ' '.repeat(nameWidth) + results.map(r =>
    r.name.substring(0, colWidth - 2).padStart(colWidth)
  ).join(''));
  console.log(' '.repeat(nameWidth) + '─'.repeat(colWidth).repeat(results.length));

  // Final CPS
  console.log('Final CPS'.padEnd(nameWidth) + results.map(r => {
    const str = formatNumber(r.finalCps);
    const marker = r.finalCps === bestCps ? ' *' : '';
    return (str + marker).padStart(colWidth);
  }).join(''));

  // Final Cookies
  console.log('Cookies Earned'.padEnd(nameWidth) + results.map(r =>
    formatNumber(r.finalCookies).padStart(colWidth)
  ).join(''));

  // Purchases
  console.log('Purchases Made'.padEnd(nameWidth) + results.map(r =>
    r.purchases.toString().padStart(colWidth)
  ).join(''));

  // Buildings
  console.log('Total Buildings'.padEnd(nameWidth) + results.map(r =>
    r.buildings.toString().padStart(colWidth)
  ).join(''));

  // Milestones
  console.log('\n' + '─'.repeat(70));
  console.log(' TIME TO CPS MILESTONES');
  console.log('─'.repeat(70) + '\n');

  const milestones = [10, 100, 1000, 10000, 100000];
  for (const milestone of milestones) {
    const label = `Time to ${formatNumber(milestone)} CPS`;
    console.log(label.padEnd(nameWidth) + results.map(r => {
      const time = r.milestones[milestone];
      return formatTime(time).padStart(colWidth);
    }).join(''));
  }

  // Performance comparison
  console.log('\n' + '─'.repeat(70));
  console.log(' RELATIVE PERFORMANCE (vs FrozenCookies)');
  console.log('─'.repeat(70) + '\n');

  const baseline = results.find(r => r.name === 'FrozenCookies');
  if (baseline) {
    console.log('CPS Ratio'.padEnd(nameWidth) + results.map(r => {
      const ratio = (r.finalCps / baseline.finalCps * 100).toFixed(1) + '%';
      return ratio.padStart(colWidth);
    }).join(''));
  }

  // Winner announcement
  const winner = results.reduce((a, b) => a.finalCps > b.finalCps ? a : b);
  console.log('\n' + '═'.repeat(70));
  console.log(` WINNER: ${winner.name} with ${formatNumber(winner.finalCps)} CPS`);
  console.log('═'.repeat(70) + '\n');

  // Verbose output
  if (options.verbose) {
    console.log('\n' + '─'.repeat(70));
    console.log(' PURCHASE LOGS (first 20 purchases each)');
    console.log('─'.repeat(70));

    for (const result of results) {
      console.log(`\n${result.name}:`);
      const purchases = result.purchaseLog.slice(0, 20);
      for (const p of purchases) {
        console.log(`  ${formatTime(p.time).padEnd(8)} ${p.item.padEnd(20)} ${formatNumber(p.cps)} CPS`);
      }
      if (result.purchaseLog.length > 20) {
        console.log(`  ... and ${result.purchaseLog.length - 20} more purchases`);
      }
    }
  }
}

// Run
const options = parseArgs();
compareAlgorithms(options);
