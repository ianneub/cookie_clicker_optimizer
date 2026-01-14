/**
 * Game Simulator - Core simulation engine for Cookie Clicker
 * Provides a simplified model for testing algorithm efficiency
 */

const { BUILDINGS, BUILDING_ORDER } = require('./buildingData');

class GameSimulator {
  /**
   * Create a new game simulator
   * @param {Object} config - Configuration options
   * @param {number} config.startingCookies - Initial cookie count
   * @param {number} config.globalMultiplier - Global CPS multiplier (default 1)
   * @param {Object} config.initialBuildings - Initial building amounts { name: amount }
   */
  constructor(config = {}) {
    this.cookies = config.startingCookies || 0;
    this.globalMultiplier = config.globalMultiplier || 1;
    this.elapsedTime = 0;

    // Initialize buildings with amounts
    this.buildings = {};
    for (const name of BUILDING_ORDER) {
      const data = BUILDINGS[name];
      this.buildings[name] = {
        baseCps: data.baseCps,
        basePrice: data.basePrice,
        amount: (config.initialBuildings && config.initialBuildings[name]) || 0
      };
    }
  }

  /**
   * Calculate current CPS (simplified - no synergies)
   * @returns {number} Current cookies per second
   */
  calculateCps() {
    let total = 0;
    for (const name in this.buildings) {
      const b = this.buildings[name];
      total += b.baseCps * b.amount;
    }
    return total * this.globalMultiplier;
  }

  /**
   * Get price for purchasing buildings using Cookie Clicker's geometric formula
   * @param {string} name - Building name
   * @param {number} quantity - Number to purchase (default 1)
   * @returns {number} Total price
   */
  getBuildingPrice(name, quantity = 1) {
    const b = this.buildings[name];
    if (!b) return Infinity;

    let total = 0;
    for (let i = 0; i < quantity; i++) {
      total += Math.ceil(b.basePrice * Math.pow(1.15, b.amount + i));
    }
    return total;
  }

  /**
   * Simulate delta CPS from purchasing buildings
   * @param {string} name - Building name
   * @param {number} quantity - Number to simulate buying
   * @returns {number} CPS change from purchase
   */
  simulateDeltaCps(name, quantity = 1) {
    const b = this.buildings[name];
    if (!b) return 0;

    const beforeCps = this.calculateCps();

    // Temporarily add buildings
    b.amount += quantity;
    const afterCps = this.calculateCps();

    // Revert
    b.amount -= quantity;

    return afterCps - beforeCps;
  }

  /**
   * Advance simulation time and accumulate cookies
   * @param {number} seconds - Time to advance
   */
  advanceTime(seconds) {
    const cps = this.calculateCps();
    this.cookies += cps * seconds;
    this.elapsedTime += seconds;
  }

  /**
   * Execute a building purchase
   * @param {string} name - Building name
   * @param {number} quantity - Number to purchase
   * @returns {boolean} True if purchase succeeded
   */
  purchase(name, quantity = 1) {
    const price = this.getBuildingPrice(name, quantity);
    if (this.cookies >= price) {
      this.cookies -= price;
      this.buildings[name].amount += quantity;
      return true;
    }
    return false;
  }

  /**
   * Check if a purchase is affordable
   * @param {string} name - Building name
   * @param {number} quantity - Number to check
   * @returns {boolean} True if affordable
   */
  canAfford(name, quantity = 1) {
    return this.cookies >= this.getBuildingPrice(name, quantity);
  }

  /**
   * Get a snapshot of current state
   * @returns {Object} Current state snapshot
   */
  getState() {
    const buildingAmounts = {};
    for (const name in this.buildings) {
      buildingAmounts[name] = this.buildings[name].amount;
    }
    return {
      cookies: this.cookies,
      cps: this.calculateCps(),
      elapsedTime: this.elapsedTime,
      buildings: buildingAmounts
    };
  }

  /**
   * Get total building count
   * @returns {number} Total buildings owned
   */
  getTotalBuildings() {
    let total = 0;
    for (const name in this.buildings) {
      total += this.buildings[name].amount;
    }
    return total;
  }
}

/**
 * Factory function to create a fresh game simulator
 * @param {Object} config - Configuration options
 * @returns {GameSimulator} New simulator instance
 */
function createGameSimulator(config = {}) {
  return new GameSimulator(config);
}

module.exports = {
  GameSimulator,
  createGameSimulator
};
