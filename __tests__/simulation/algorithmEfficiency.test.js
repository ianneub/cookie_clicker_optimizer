/**
 * Algorithm Efficiency Tests
 * Tests the optimizer algorithm using game state simulation
 */

const { createGameSimulator } = require('./GameSimulator');
const { createSimulationRunner } = require('./SimulationRunner');
const { calculateEfficiency, EFFICIENCY_WEIGHT } = require('../../optimizer');

describe('Game Simulator', () => {
  describe('Basic Mechanics', () => {
    it('should start with 0 CPS when no buildings owned', () => {
      const sim = createGameSimulator();
      expect(sim.calculateCps()).toBe(0);
    });

    it('should calculate CPS based on building amounts', () => {
      const sim = createGameSimulator({
        initialBuildings: { 'Cursor': 10, 'Grandma': 5 }
      });
      // Cursor: 0.1 CPS each, Grandma: 1 CPS each
      expect(sim.calculateCps()).toBe(10 * 0.1 + 5 * 1);
    });

    it('should apply global multiplier to CPS', () => {
      const sim = createGameSimulator({
        initialBuildings: { 'Grandma': 10 },
        globalMultiplier: 2
      });
      expect(sim.calculateCps()).toBe(10 * 1 * 2);
    });

    it('should calculate building prices using geometric formula', () => {
      const sim = createGameSimulator({ startingCookies: 100 });
      // First Cursor costs 15
      expect(sim.getBuildingPrice('Cursor', 1)).toBe(15);

      // After buying one, next should be 15 * 1.15
      sim.purchase('Cursor', 1);
      expect(sim.getBuildingPrice('Cursor', 1)).toBe(Math.ceil(15 * 1.15));
    });

    it('should calculate bulk purchase prices correctly', () => {
      const sim = createGameSimulator();
      // Buy 10 Cursors: sum of 15 * 1.15^i for i = 0 to 9
      const price10 = sim.getBuildingPrice('Cursor', 10);
      let expected = 0;
      for (let i = 0; i < 10; i++) {
        expected += Math.ceil(15 * Math.pow(1.15, i));
      }
      expect(price10).toBe(expected);
    });

    it('should accumulate cookies over time', () => {
      const sim = createGameSimulator({
        initialBuildings: { 'Grandma': 10 }
      });
      sim.advanceTime(100);
      expect(sim.cookies).toBe(10 * 1 * 100);
      expect(sim.elapsedTime).toBe(100);
    });

    it('should execute purchases when affordable', () => {
      const sim = createGameSimulator({ startingCookies: 100 });
      expect(sim.purchase('Cursor', 1)).toBe(true);
      expect(sim.buildings['Cursor'].amount).toBe(1);
      expect(sim.cookies).toBe(100 - 15);
    });

    it('should reject purchases when not affordable', () => {
      const sim = createGameSimulator({ startingCookies: 10 });
      expect(sim.purchase('Cursor', 1)).toBe(false);
      expect(sim.buildings['Cursor'].amount).toBe(0);
      expect(sim.cookies).toBe(10);
    });

    it('should simulate delta CPS correctly', () => {
      const sim = createGameSimulator();
      const deltaCps = sim.simulateDeltaCps('Grandma', 1);
      expect(deltaCps).toBe(1); // Grandma gives 1 CPS
      // Should not have actually purchased
      expect(sim.buildings['Grandma'].amount).toBe(0);
    });
  });
});

describe('Simulation Runner', () => {
  describe('Purchase Decision Making', () => {
    it('should find best purchase based on efficiency', () => {
      const sim = createGameSimulator({ startingCookies: 1000 });
      const runner = createSimulationRunner(sim, calculateEfficiency);
      const best = runner.findBestPurchase();

      expect(best).not.toBeNull();
      expect(best.efficiency).toBeGreaterThan(0);
      expect(best.affordable).toBe(true);
    });

    it('should execute purchases and log them', () => {
      const sim = createGameSimulator({ startingCookies: 1000 });
      const runner = createSimulationRunner(sim, calculateEfficiency);
      const best = runner.findBestPurchase();

      expect(runner.executePurchase(best)).toBe(true);
      expect(runner.purchaseLog.length).toBe(1);
      expect(runner.purchaseLog[0].item).toBe(best.name);
    });
  });

  describe('Simulation Runs', () => {
    it('should run simulation and accumulate CPS', () => {
      const sim = createGameSimulator({ startingCookies: 1000 });
      const runner = createSimulationRunner(sim, calculateEfficiency);
      const results = runner.run(60); // 1 minute

      expect(results.finalCps).toBeGreaterThan(0);
      expect(results.purchaseCount).toBeGreaterThan(0);
      expect(results.totalTime).toBeGreaterThanOrEqual(60);
    });

    it('should grow CPS over time', () => {
      const sim = createGameSimulator({ startingCookies: 10000 });
      const runner = createSimulationRunner(sim, calculateEfficiency);
      const results = runner.run(300); // 5 minutes

      // CPS should have grown significantly
      expect(results.finalCps).toBeGreaterThan(10);
    });
  });
});

describe('Algorithm Efficiency Comparison', () => {
  // FrozenCookies algorithm: 1.15 * (price/cps) + (price/deltaCps)
  const frozenCookiesAlgorithm = calculateEfficiency;

  // Naive algorithm: just price / deltaCps (simple payback period)
  const naiveAlgorithm = (price, deltaCps, _currentCps) => {
    if (deltaCps <= 0) return Infinity;
    return price / deltaCps;
  };

  // Pure cost efficiency: deltaCps / price (higher is better, so invert)
  const costEfficiencyAlgorithm = (price, deltaCps, _currentCps) => {
    if (deltaCps <= 0) return Infinity;
    return price / deltaCps; // Same as naive for comparison
  };

  describe('Early Game (1 minute simulation)', () => {
    it('should make reasonable early game decisions', () => {
      const sim = createGameSimulator({ startingCookies: 100 });
      const runner = createSimulationRunner(sim, frozenCookiesAlgorithm);
      const results = runner.run(60);

      // Should have bought some buildings
      expect(results.purchaseCount).toBeGreaterThan(0);
      // Should have positive CPS
      expect(results.finalCps).toBeGreaterThan(0);
    });

    it('should prioritize affordable buildings early', () => {
      const sim = createGameSimulator({ startingCookies: 200 });
      const runner = createSimulationRunner(sim, frozenCookiesAlgorithm);
      runner.run(30);

      // Early purchases should be cheap buildings
      const earlyPurchases = runner.purchaseLog.slice(0, 5);
      const cheapBuildingPurchases = earlyPurchases.filter(p =>
        p.item.includes('Cursor') || p.item.includes('Grandma')
      );
      expect(cheapBuildingPurchases.length).toBeGreaterThan(0);
    });
  });

  describe('Mid Game (5 minute simulation)', () => {
    it('should progress to higher tier buildings', () => {
      const sim = createGameSimulator({ startingCookies: 100000 });
      const runner = createSimulationRunner(sim, frozenCookiesAlgorithm);
      const results = runner.run(300);

      // Should have significant CPS growth
      expect(results.finalCps).toBeGreaterThan(100);

      // Should have bought some mid-tier buildings
      const state = results.state;
      const hasMidTier = state.buildings['Farm'] > 0 ||
                         state.buildings['Mine'] > 0 ||
                         state.buildings['Factory'] > 0;
      expect(hasMidTier).toBe(true);
    });
  });

  describe('Algorithm Comparison', () => {
    it('FrozenCookies should perform comparably to naive approach', () => {
      // Run both algorithms from same starting point
      const sim1 = createGameSimulator({ startingCookies: 10000 });
      const sim2 = createGameSimulator({ startingCookies: 10000 });

      const fcRunner = createSimulationRunner(sim1, frozenCookiesAlgorithm);
      const naiveRunner = createSimulationRunner(sim2, naiveAlgorithm);

      const fcResults = fcRunner.run(300);
      const naiveResults = naiveRunner.run(300);

      // FrozenCookies should be at least 80% as effective (simplified model)
      expect(fcResults.finalCps).toBeGreaterThanOrEqual(naiveResults.finalCps * 0.8);
    });

    it('should produce consistent results from same starting conditions', () => {
      const sim1 = createGameSimulator({ startingCookies: 5000 });
      const sim2 = createGameSimulator({ startingCookies: 5000 });

      const runner1 = createSimulationRunner(sim1, frozenCookiesAlgorithm);
      const runner2 = createSimulationRunner(sim2, frozenCookiesAlgorithm);

      const results1 = runner1.run(120);
      const results2 = runner2.run(120);

      // Should be deterministic
      expect(results1.finalCps).toBe(results2.finalCps);
      expect(results1.purchaseCount).toBe(results2.purchaseCount);
    });
  });

  describe('Bulk Purchase Evaluation', () => {
    it('should evaluate bulk purchases and choose based on efficiency', () => {
      // The FrozenCookies algorithm evaluates x1, x10, x100 for each building
      // In a simplified model without synergies/discounts, x1 is usually optimal
      // because bulk purchases don't provide proportionally better returns
      //
      // This test verifies the algorithm correctly evaluates all options
      const sim = createGameSimulator({
        startingCookies: 100000000,
        initialBuildings: { 'Grandma': 100 }
      });
      const runner = createSimulationRunner(sim, frozenCookiesAlgorithm);
      runner.run(60);

      // Should have made purchases
      expect(runner.purchaseLog.length).toBeGreaterThan(0);

      // Verify x1 purchases dominate (expected in simplified model)
      const singlePurchases = runner.purchaseLog.filter(p =>
        !p.item.includes('x10') && !p.item.includes('x100')
      );
      // Most purchases should be x1 in simplified model
      expect(singlePurchases.length).toBeGreaterThan(runner.purchaseLog.length * 0.5);
    });

    it('should prefer x1 when cookies are limited', () => {
      const sim = createGameSimulator({ startingCookies: 500 });
      const runner = createSimulationRunner(sim, frozenCookiesAlgorithm);
      runner.run(60);

      // Early purchases should mostly be x1
      const earlyPurchases = runner.purchaseLog.slice(0, 10);
      const singlePurchases = earlyPurchases.filter(p =>
        !p.item.includes('x10') && !p.item.includes('x100')
      );
      expect(singlePurchases.length).toBeGreaterThan(earlyPurchases.length / 2);
    });
  });
});

describe('CPS Milestones', () => {
  it('should reach 10 CPS from fresh start', () => {
    // Start with enough cookies to buy initial buildings
    const sim = createGameSimulator({ startingCookies: 1000 });
    const runner = createSimulationRunner(sim, calculateEfficiency);
    const time = runner.timeToReachCps(10, 600);

    expect(time).not.toBeNull();
    expect(time).toBeLessThan(600);
  });

  it('should reach 100 CPS with starting cookies', () => {
    const sim = createGameSimulator({ startingCookies: 10000 });
    const runner = createSimulationRunner(sim, calculateEfficiency);
    const time = runner.timeToReachCps(100, 600);

    expect(time).not.toBeNull();
    expect(time).toBeLessThan(600);
  });

  it('should reach 1000 CPS with larger starting cookies', () => {
    const sim = createGameSimulator({ startingCookies: 500000 });
    const runner = createSimulationRunner(sim, calculateEfficiency);
    const time = runner.timeToReachCps(1000, 600);

    expect(time).not.toBeNull();
    expect(time).toBeLessThan(600);
  });
});
