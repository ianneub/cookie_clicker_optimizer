/**
 * CookieClickerGame - Clean API for interacting with Cookie Clicker game state
 *
 * Provides methods to read game state, simulate purchases, and execute purchases
 * using the real game engine (including synergies via Game.CalculateGains())
 */

class CookieClickerGame {
  /**
   * Create a game interaction layer
   * @param {Page} page - Playwright page instance with Cookie Clicker loaded
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Get current game state with all relevant metrics
   * @returns {Promise<Object>} Game state object
   */
  async getState() {
    return await this.page.evaluate(() => {
      const state = {
        cookies: Game.cookies,
        cookiesPs: Game.cookiesPs,
        cookiesEarned: Game.cookiesEarned,
        buildings: {},
        totalBuildings: 0,
        upgrades: {
          owned: Game.UpgradesOwned,
          inStoreCount: Game.UpgradesInStore.length
        },
        achievements: Game.AchievementsOwned
      };

      // Collect building data
      for (const name in Game.Objects) {
        const b = Game.Objects[name];
        state.buildings[name] = {
          amount: b.amount,
          price: b.price,
          totalCps: b.storedTotalCps || 0
        };
        state.totalBuildings += b.amount;
      }

      return state;
    });
  }

  /**
   * Get current CPS (calls Game.CalculateGains for accuracy)
   * @returns {Promise<number>} Current cookies per second
   */
  async getCps() {
    return await this.page.evaluate(() => {
      Game.CalculateGains();
      return Game.cookiesPs;
    });
  }

  /**
   * Simulate purchasing a building and return delta CPS
   * Uses Game.CalculateGains() for full synergy accuracy
   *
   * @param {string} buildingName - Name of the building
   * @param {number} quantity - Number to simulate buying (default: 1)
   * @returns {Promise<number>} CPS change from the purchase
   */
  async simulateBuildingDeltaCps(buildingName, quantity = 1) {
    return await this.page.evaluate(
      ({ name, qty }) => {
        const building = Game.Objects[name];
        if (!building) return 0;

        const originalCps = Game.cookiesPs;
        const originalAmount = building.amount;

        try {
          building.amount += qty;
          Game.CalculateGains();
          return Game.cookiesPs - originalCps;
        } finally {
          building.amount = originalAmount;
          Game.CalculateGains();
        }
      },
      { name: buildingName, qty: quantity }
    );
  }

  /**
   * Simulate purchasing an upgrade and return delta CPS
   * @param {string} upgradeName - Name of the upgrade
   * @returns {Promise<number>} CPS change from the purchase
   */
  async simulateUpgradeDeltaCps(upgradeName) {
    return await this.page.evaluate((name) => {
      const upgrade = Game.Upgrades[name];
      if (!upgrade || upgrade.bought) return 0;

      const originalCps = Game.cookiesPs;
      const originalBought = upgrade.bought;

      try {
        upgrade.bought = 1;
        Game.CalculateGains();
        return Game.cookiesPs - originalCps;
      } finally {
        upgrade.bought = originalBought;
        Game.CalculateGains();
      }
    }, upgradeName);
  }

  /**
   * Get building price for bulk purchase
   * @param {string} buildingName - Name of the building
   * @param {number} quantity - Number to buy
   * @returns {Promise<number>} Total price
   */
  async getBuildingPrice(buildingName, quantity = 1) {
    return await this.page.evaluate(
      ({ name, qty }) => {
        const building = Game.Objects[name];
        return building ? building.getSumPrice(qty) : Infinity;
      },
      { name: buildingName, qty: quantity }
    );
  }

  /**
   * Purchase a building
   * @param {string} buildingName - Name of the building
   * @param {number} quantity - Number to buy (default: 1)
   * @returns {Promise<boolean>} True if purchase succeeded
   */
  async purchaseBuilding(buildingName, quantity = 1) {
    return await this.page.evaluate(
      ({ name, qty }) => {
        const building = Game.Objects[name];
        if (!building) return false;

        const price = building.getSumPrice(qty);
        if (Game.cookies >= price) {
          building.buy(qty);
          return true;
        }
        return false;
      },
      { name: buildingName, qty: quantity }
    );
  }

  /**
   * Purchase an upgrade
   * @param {string} upgradeName - Name of the upgrade
   * @returns {Promise<boolean>} True if purchase succeeded
   */
  async purchaseUpgrade(upgradeName) {
    return await this.page.evaluate((name) => {
      const upgrade = Game.Upgrades[name];
      if (!upgrade || upgrade.bought) return false;

      const price = upgrade.getPrice();
      if (Game.cookies >= price) {
        upgrade.buy();
        return true;
      }
      return false;
    }, upgradeName);
  }

  /**
   * Inject an algorithm function into the page context
   * @param {Function} algorithmFn - Efficiency function (price, deltaCps, currentCps) => efficiency
   */
  async injectAlgorithm(algorithmFn) {
    const fnString = algorithmFn.toString();
    await this.page.evaluate((fn) => {
      window.__injectedAlgorithm = eval(`(${fn})`);
    }, fnString);
  }

  /**
   * Find the best purchase using the injected algorithm
   * Evaluates all buildings (1x, 10x, 100x) and available upgrades
   *
   * @returns {Promise<Object|null>} Best purchase candidate or null
   */
  async findBestPurchase() {
    return await this.page.evaluate(() => {
      if (!window.__injectedAlgorithm) {
        throw new Error('No algorithm injected. Call injectAlgorithm() first.');
      }

      const candidates = [];
      const currentCps = Game.cookiesPs;
      const algorithm = window.__injectedAlgorithm;

      // Evaluate buildings at 1x, 10x, 100x
      for (const name in Game.Objects) {
        const building = Game.Objects[name];
        if (building.locked) continue;

        for (const qty of [1, 10, 100]) {
          const price = building.getSumPrice(qty);

          // Simulate delta CPS
          const originalAmount = building.amount;
          building.amount += qty;
          Game.CalculateGains();
          const deltaCps = Game.cookiesPs - currentCps;
          building.amount = originalAmount;
          Game.CalculateGains();

          // Calculate efficiency (handle bootstrap case when CPS is 0)
          let efficiency;
          if (currentCps <= 0) {
            efficiency = deltaCps > 0 ? price / deltaCps : Infinity;
          } else {
            efficiency = algorithm(price, deltaCps, currentCps);
          }

          candidates.push({
            name: qty > 1 ? `${name} x${qty}` : name,
            type: 'Building',
            buildingName: name,
            quantity: qty,
            price,
            deltaCps,
            efficiency,
            affordable: Game.cookies >= price
          });
        }
      }

      // Evaluate available upgrades
      for (const upgrade of Game.UpgradesInStore) {
        const price = upgrade.getPrice();

        // Simulate upgrade purchase
        const originalBought = upgrade.bought;
        upgrade.bought = 1;
        Game.CalculateGains();
        const deltaCps = Game.cookiesPs - currentCps;
        upgrade.bought = originalBought;
        Game.CalculateGains();

        let efficiency;
        if (currentCps <= 0) {
          efficiency = deltaCps > 0 ? price / deltaCps : Infinity;
        } else {
          efficiency = algorithm(price, deltaCps, currentCps);
        }

        candidates.push({
          name: upgrade.name,
          type: 'Upgrade',
          upgradeName: upgrade.name,
          price,
          deltaCps,
          efficiency,
          affordable: Game.cookies >= price
        });
      }

      // Filter valid candidates and sort by efficiency (lower is better)
      const valid = candidates
        .filter(
          (c) =>
            typeof c.efficiency === 'number' &&
            isFinite(c.efficiency) &&
            c.efficiency > 0
        )
        .sort((a, b) => a.efficiency - b.efficiency);

      return valid[0] || null;
    });
  }

  /**
   * Click the big cookie
   * @param {number} times - Number of clicks (default: 1)
   */
  async clickCookie(times = 1) {
    for (let i = 0; i < times; i++) {
      await this.page.evaluate(() => Game.ClickCookie());
    }
  }

  /**
   * Get list of available buildings (unlocked)
   * @returns {Promise<string[]>} Array of building names
   */
  async getAvailableBuildings() {
    return await this.page.evaluate(() => {
      return Object.keys(Game.Objects).filter((name) => !Game.Objects[name].locked);
    });
  }
}

module.exports = { CookieClickerGame };
