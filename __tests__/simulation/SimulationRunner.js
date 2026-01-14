/**
 * Simulation Runner - Orchestrates game simulation with algorithm decisions
 */

const { BUILDING_ORDER } = require('./buildingData');

class SimulationRunner {
  /**
   * Create a simulation runner
   * @param {GameSimulator} simulator - The game simulator instance
   * @param {Function} algorithm - Efficiency calculation function (price, deltaCps, currentCps) => efficiency
   * @param {Object} options - Runner options
   * @param {number[]} options.buyAmounts - Quantities to evaluate (default [1, 10, 100])
   */
  constructor(simulator, algorithm, options = {}) {
    this.simulator = simulator;
    this.algorithm = algorithm;
    this.buyAmounts = options.buyAmounts || [1, 10, 100];
    this.purchaseLog = [];
    this.cpsHistory = [];
  }

  /**
   * Find the best purchase based on efficiency algorithm
   * @returns {Object|null} Best purchase candidate or null
   */
  findBestPurchase() {
    const candidates = [];
    const currentCps = this.simulator.calculateCps();

    // When CPS is 0 (bootstrap phase), use simple payback period as fallback
    const useBootstrapMode = currentCps <= 0;

    for (const name of BUILDING_ORDER) {
      for (const quantity of this.buyAmounts) {
        const price = this.simulator.getBuildingPrice(name, quantity);
        const deltaCps = this.simulator.simulateDeltaCps(name, quantity);

        // In bootstrap mode, use simple payback period; otherwise use the algorithm
        let efficiency;
        if (useBootstrapMode) {
          efficiency = deltaCps > 0 ? price / deltaCps : Infinity;
        } else {
          efficiency = this.algorithm(price, deltaCps, currentCps);
        }

        candidates.push({
          name: quantity > 1 ? `${name} x${quantity}` : name,
          buildingName: name,
          quantity,
          price,
          deltaCps,
          efficiency,
          affordable: this.simulator.cookies >= price
        });
      }
    }

    // Filter valid candidates and sort by efficiency (lower is better)
    const valid = candidates
      .filter(c => typeof c.efficiency === 'number' && isFinite(c.efficiency) && c.efficiency > 0)
      .sort((a, b) => a.efficiency - b.efficiency);

    return valid[0] || null;
  }

  /**
   * Execute a purchase and log it
   * @param {Object} item - Purchase candidate
   * @returns {boolean} True if purchase succeeded
   */
  executePurchase(item) {
    const success = this.simulator.purchase(item.buildingName, item.quantity);
    if (success) {
      this.purchaseLog.push({
        time: this.simulator.elapsedTime,
        item: item.name,
        price: item.price,
        deltaCps: item.deltaCps,
        efficiency: item.efficiency,
        cookies: this.simulator.cookies,
        cps: this.simulator.calculateCps()
      });
    }
    return success;
  }

  /**
   * Run simulation for specified duration
   * @param {number} totalSeconds - Total simulation time in seconds
   * @param {Object} options - Run options
   * @param {number} options.tickInterval - Time between ticks (default 0.1 seconds)
   * @param {number} options.maxPurchasesPerTick - Max purchases per tick (default 10)
   * @param {Function} options.onTick - Callback after each tick (time, cps, cookies)
   * @returns {Object} Simulation results
   */
  run(totalSeconds, options = {}) {
    const tickInterval = options.tickInterval || 0.1;
    const maxPurchasesPerTick = options.maxPurchasesPerTick || 10;
    const onTick = options.onTick;

    // Record initial state
    this.cpsHistory.push({
      time: 0,
      cps: this.simulator.calculateCps(),
      cookies: this.simulator.cookies
    });

    while (this.simulator.elapsedTime < totalSeconds) {
      // Try to make purchases (up to max per tick)
      let purchasesMade = 0;
      while (purchasesMade < maxPurchasesPerTick) {
        const best = this.findBestPurchase();
        if (best && best.affordable) {
          this.executePurchase(best);
          purchasesMade++;
        } else {
          break;
        }
      }

      // Advance time
      this.simulator.advanceTime(tickInterval);

      // Record CPS history periodically (every 10 seconds)
      if (Math.floor(this.simulator.elapsedTime) % 10 === 0 &&
          (this.cpsHistory.length === 0 ||
           this.cpsHistory[this.cpsHistory.length - 1].time < Math.floor(this.simulator.elapsedTime))) {
        this.cpsHistory.push({
          time: Math.floor(this.simulator.elapsedTime),
          cps: this.simulator.calculateCps(),
          cookies: this.simulator.cookies
        });
      }

      if (onTick) {
        onTick(this.simulator.elapsedTime, this.simulator.calculateCps(), this.simulator.cookies);
      }
    }

    return this.getResults();
  }

  /**
   * Get simulation results
   * @returns {Object} Results object
   */
  getResults() {
    return {
      finalCookies: this.simulator.cookies,
      finalCps: this.simulator.calculateCps(),
      totalTime: this.simulator.elapsedTime,
      purchaseCount: this.purchaseLog.length,
      totalBuildings: this.simulator.getTotalBuildings(),
      purchases: this.purchaseLog,
      cpsHistory: this.cpsHistory,
      state: this.simulator.getState()
    };
  }

  /**
   * Calculate time to reach a CPS milestone
   * @param {number} targetCps - Target CPS to reach
   * @param {number} maxTime - Maximum simulation time (default 1 hour)
   * @returns {number|null} Time to reach target, or null if not reached
   */
  timeToReachCps(targetCps, maxTime = 3600) {
    const tickInterval = 0.1;
    const maxPurchasesPerTick = 10;

    while (this.simulator.elapsedTime < maxTime) {
      if (this.simulator.calculateCps() >= targetCps) {
        return this.simulator.elapsedTime;
      }

      // Try purchases
      let purchasesMade = 0;
      while (purchasesMade < maxPurchasesPerTick) {
        const best = this.findBestPurchase();
        if (best && best.affordable) {
          this.executePurchase(best);
          purchasesMade++;
        } else {
          break;
        }
      }

      this.simulator.advanceTime(tickInterval);
    }

    return this.simulator.calculateCps() >= targetCps ? this.simulator.elapsedTime : null;
  }
}

/**
 * Factory function to create a simulation runner
 * @param {GameSimulator} simulator - Game simulator instance
 * @param {Function} algorithm - Efficiency algorithm
 * @param {Object} options - Options
 * @returns {SimulationRunner} New runner instance
 */
function createSimulationRunner(simulator, algorithm, options = {}) {
  return new SimulationRunner(simulator, algorithm, options);
}

module.exports = {
  SimulationRunner,
  createSimulationRunner
};
