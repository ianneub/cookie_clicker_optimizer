/**
 * Cookie Clicker Optimizer
 *
 * A bookmarklet that finds the most efficient purchase in Cookie Clicker
 * by leveraging Cookie Monster's payback period (PP) calculations.
 *
 * Usage: Run this script while playing Cookie Clicker at https://orteil.dashnet.org/cookieclicker/
 */

(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node/CommonJS - export for testing
    // Call factory() to get the inner function, then call that with no arg to get exports
    module.exports = factory()();
  } else {
    // Browser - execute immediately with window context
    factory()(root);
  }
}(typeof window !== 'undefined' ? window : this, function() {
  'use strict';

  const CM_URL = 'https://cookiemonsterteam.github.io/CookieMonster/dist/CookieMonster.js';
  const MAX_WAIT_TIME = 30000; // 30 seconds max wait for CM to load
  const POLL_INTERVAL = 500;  // Check every 500ms
  const REFRESH_INTERVAL = 2000; // Auto-refresh every 2 seconds

  // Golden Cookie upgrades - these don't have PP values since benefits are random/probabilistic
  // When Gold: ON, these are prioritized for purchase
  const GOLDEN_COOKIE_UPGRADES = new Set([
    'Lucky day',           // GC appear 2x often, last 2x longer
    'Serendipity',         // GC appear 2x often, last 2x longer
    'Get lucky',           // GC effects last 2x longer
    'Golden goose egg',    // GC appear 5% more often
    'Dragon fang',         // +3% golden cookie gains
    'Heavenly luck',       // GC appear 5% more often (prestige)
    'Lasting fortune',     // GC effects last 10% longer (prestige)
    'Decisive fate',       // GC last 5% longer on screen (prestige)
    'Lucky digit',         // Multi-effect (prestige)
    'Lucky number',        // Multi-effect (prestige)
    'Lucky payout',        // Multi-effect (prestige)
    'Green yeast digestives'  // Multi-effect
  ]);

  // Toggle/repeatable upgrades - excluded from optimization (not production upgrades)
  const TOGGLE_UPGRADES = new Set([
    'Elder Pledge',           // Pauses Grandmapocalypse 30-60 min, repeatable
    'Elder Covenant',         // Permanent -5% CpS, stops Grandmapocalypse
    'Revoke Elder Covenant'   // Undoes Elder Covenant
  ]);

  // ===== PURE FUNCTIONS (easily testable, no external dependencies) =====

  /**
   * Format large numbers in a readable way
   * @param {number} num - The number to format
   * @returns {string} Formatted number string
   */
  function formatNumber(num) {
    if (num >= 1e15) return (num / 1e15).toFixed(2) + ' quadrillion';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + ' trillion';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + ' billion';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + ' million';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + ' thousand';
    return num.toFixed(0);
  }

  function logAction(action, data) {
    const timestamp = new Date().toISOString();
    console.log('[CCOptimizer]', JSON.stringify({ timestamp, action, ...data }));
  }

  /**
   * Filter out invalid candidates and sort by PP (lower is better)
   * @param {Array} candidates - Array of candidate objects with pp property
   * @returns {Array} Filtered and sorted candidates
   */
  function filterAndSortCandidates(candidates) {
    return candidates
      .filter(c => typeof c.pp === 'number' && isFinite(c.pp) && c.pp > 0)
      .sort((a, b) => a.pp - b.pp);
  }

  /**
   * Check if an upgrade is a golden cookie upgrade
   * @param {string} upgradeName - Name of the upgrade
   * @returns {boolean} True if it's a golden cookie upgrade
   */
  function isGoldenCookieUpgrade(upgradeName) {
    return GOLDEN_COOKIE_UPGRADES.has(upgradeName);
  }

  /**
   * Check if an upgrade is a toggle/repeatable upgrade (excluded from optimization)
   * @param {string} upgradeName - Name of the upgrade
   * @returns {boolean} True if it's a toggle upgrade
   */
  function isToggleUpgrade(upgradeName) {
    return TOGGLE_UPGRADES.has(upgradeName);
  }

  /**
   * Get the base Lucky bank threshold from Cookie Monster's cache (unscaled)
   * Uses 6000x CpS - the bank needed for max Lucky reward (without Frenzy)
   * @param {Object} cmCache - CookieMonsterData.Cache object
   * @param {number} cps - Current CpS as fallback
   * @returns {number} Base Lucky bank threshold (before phase scaling)
   */
  function getBaseLuckyBank(cmCache, cps) {
    if (cmCache && typeof cmCache.Lucky === 'number' && cmCache.Lucky > 0) {
      return cmCache.Lucky;
    }
    return 6000 * cps;
  }

  /**
   * Get the phase-scaled Lucky bank threshold
   * In early game, returns 0 (no protection). Scales up through mid game.
   * @param {Object} cmCache - CookieMonsterData.Cache object
   * @param {number} cps - Current CpS
   * @returns {Object} { scaled: number, base: number, phaseProgress: number, phaseName: string }
   */
  function getLuckyBank(cmCache, cps) {
    const base = getBaseLuckyBank(cmCache, cps);
    const phaseProgress = calculatePhaseProgress(cps);
    const scaled = getScaledLuckyBank(base, phaseProgress);
    return {
      scaled,
      base,
      phaseProgress,
      phaseName: getPhaseName(phaseProgress)
    };
  }

  /**
   * Check if a purchase would drop cookies below the Lucky bank threshold
   * @param {number} currentCookies - Current cookie count
   * @param {number} price - Price of the item
   * @param {number} luckyBank - Lucky bank threshold
   * @returns {boolean} True if purchase keeps cookies at or above bank threshold
   */
  function canAffordWithLuckyBank(currentCookies, price, luckyBank) {
    return currentCookies - price >= luckyBank;
  }

  // ===== PHASE DETECTION FUNCTIONS =====

  // Phase thresholds for game progression (based on CpS)
  const PHASE_THRESHOLDS = {
    EARLY_TO_MID: 1000000,      // 1M CpS
    MID_TO_LATE: 100000000,     // 100M CpS
    LATE_TO_ENDGAME: 1000000000 // 1B CpS
  };

  /**
   * Smoothstep interpolation function for smooth transitions
   * Returns 0 when x <= edge0, 1 when x >= edge1, smooth curve between
   * @param {number} x - Input value
   * @param {number} edge0 - Lower edge
   * @param {number} edge1 - Upper edge
   * @returns {number} Interpolated value between 0 and 1
   */
  function smoothstep(x, edge0, edge1) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Calculate game phase progress from 0.0 (very early) to 1.0 (endgame)
   * Uses logarithmic scale for smooth progression through exponential CpS growth
   * @param {number} cps - Current cookies per second
   * @returns {number} Phase progress from 0 to 1
   */
  function calculatePhaseProgress(cps) {
    if (cps <= 0) return 0;

    const EARLY_THRESHOLD = PHASE_THRESHOLDS.EARLY_TO_MID;     // 100K CpS
    const LATE_THRESHOLD = PHASE_THRESHOLDS.MID_TO_LATE;       // 10M CpS
    const ENDGAME_THRESHOLD = PHASE_THRESHOLDS.LATE_TO_ENDGAME; // 1B CpS

    if (cps <= EARLY_THRESHOLD) {
      // Early game: 0.0 to 0.33
      return (Math.log10(cps) / Math.log10(EARLY_THRESHOLD)) * 0.33;
    } else if (cps <= LATE_THRESHOLD) {
      // Mid game: 0.33 to 0.66
      const midProgress = (Math.log10(cps) - Math.log10(EARLY_THRESHOLD)) /
                          (Math.log10(LATE_THRESHOLD) - Math.log10(EARLY_THRESHOLD));
      return 0.33 + (midProgress * 0.33);
    } else {
      // Late/Endgame: 0.66 to 1.0 (caps at endgame threshold)
      const lateProgress = Math.min(1,
        (Math.log10(cps) - Math.log10(LATE_THRESHOLD)) /
        (Math.log10(ENDGAME_THRESHOLD) - Math.log10(LATE_THRESHOLD)));
      return 0.66 + (lateProgress * 0.34);
    }
  }

  /**
   * Get human-readable phase name
   * @param {number} phaseProgress - Phase progress from 0 to 1
   * @returns {string} Phase name: "Early", "Mid", "Late", or "Endgame"
   */
  function getPhaseName(phaseProgress) {
    if (phaseProgress < 0.33) return 'Early';
    if (phaseProgress < 0.66) return 'Mid';
    if (phaseProgress < 0.9) return 'Late';
    return 'Endgame';
  }

  /**
   * Calculate scaled Lucky bank based on game phase
   * Early game has no protection, scales up through mid game, full protection in late game
   * @param {number} baseLuckyBank - Base Lucky bank from Cookie Monster or fallback
   * @param {number} phaseProgress - Game phase progress (0-1)
   * @returns {number} Scaled Lucky bank threshold
   */
  function getScaledLuckyBank(baseLuckyBank, phaseProgress) {
    // Scale starts at 0% for progress < 0.25, reaches 100% at progress >= 0.75
    const scale = smoothstep(phaseProgress, 0.25, 0.75);
    return Math.floor(baseLuckyBank * scale);
  }

  /**
   * Get maximum hours willing to save for golden upgrades based on phase
   * Early game: 0.5 hours max (focus on CpS growth)
   * Mid game: scales from 0.5 to 4 hours
   * Late game: scales from 4 to 12 hours (golden combos are major income)
   * @param {number} phaseProgress - Game phase progress (0-1)
   * @returns {number} Maximum hours to save for golden upgrades
   */
  function getMaxGoldenSaveHours(phaseProgress) {
    if (phaseProgress < 0.33) {
      return 0.5;  // Early game: 30 minutes max
    } else if (phaseProgress < 0.66) {
      // Mid game: scale from 0.5 to 4 hours
      const t = (phaseProgress - 0.33) / 0.33;
      return 0.5 + (t * 3.5);
    } else {
      // Late game: scale from 4 to 12 hours
      const t = (phaseProgress - 0.66) / 0.34;
      return 4 + (t * 8);
    }
  }

  /**
   * Evaluate if a golden upgrade should be prioritized based on game phase
   * @param {number} phaseProgress - Game phase progress (0-1)
   * @param {number} price - Upgrade price
   * @param {number} currentCpS - Current cookies per second
   * @returns {Object} { shouldPrioritize: boolean, reason: string, hoursToAfford: number }
   */
  function evaluateGoldenUpgradePriority(phaseProgress, price, currentCpS) {
    if (currentCpS <= 0) {
      return {
        shouldPrioritize: false,
        reason: 'No CpS',
        hoursToAfford: Infinity
      };
    }

    const hoursToAfford = price / (currentCpS * 3600);
    const maxHours = getMaxGoldenSaveHours(phaseProgress);

    if (hoursToAfford > maxHours) {
      return {
        shouldPrioritize: false,
        reason: `${hoursToAfford.toFixed(1)}h > ${maxHours.toFixed(1)}h limit`,
        hoursToAfford
      };
    }

    return {
      shouldPrioritize: true,
      reason: `${hoursToAfford.toFixed(1)}h affordable`,
      hoursToAfford
    };
  }

  // ===== WRINKLER FUNCTIONS =====

  // Average time for a wrinkler to respawn (seconds)
  // Based on spawn probability mechanics during Elder Pact
  const WRINKLER_RESPAWN_TIME = 110;

  /**
   * Get the wrinkler pop multiplier based on upgrades owned
   * Base: 1.1x (10% gain), +5% from Wrinklerspawn, +5% from Sacrilegious Corruption
   * @param {boolean} hasWrinklerspawn - Whether Wrinklerspawn upgrade is owned
   * @param {boolean} hasSacrilegious - Whether Sacrilegious Corruption upgrade is owned
   * @returns {number} Multiplier for popped cookies (1.1 to 1.2155)
   */
  function getWrinklerMultiplier(hasWrinklerspawn, hasSacrilegious) {
    let multiplier = 1.1;
    if (hasWrinklerspawn) multiplier *= 1.05;
    if (hasSacrilegious) multiplier *= 1.05;
    return multiplier;
  }

  /**
   * Calculate total pop reward for non-shiny wrinklers
   * @param {Array} wrinklers - Array of wrinkler objects with {sucked, type, phase}
   * @param {number} multiplier - Pop multiplier from getWrinklerMultiplier
   * @returns {number} Total cookies gained from popping all normal wrinklers
   */
  function calculateNormalWrinklerReward(wrinklers, multiplier) {
    let total = 0;
    for (const w of wrinklers) {
      // Only count active wrinklers (phase 2) that are not shiny (type 0)
      if (w.phase === 2 && w.type === 0 && w.sucked > 0) {
        total += w.sucked * multiplier;
      }
    }
    return total;
  }

  /**
   * Check if popping wrinklers enables a purchase faster than waiting
   * Factors in the opportunity cost of wrinklers being gone during respawn
   * @param {number} popReward - Cookies gained from popping
   * @param {number} itemPrice - Price of the item to buy
   * @param {number} currentCookies - Current cookie count
   * @param {number} cps - Current cookies per second
   * @param {number} wrinklerCount - Number of wrinklers being popped
   * @returns {Object} { shouldPop: boolean, reason: string }
   */
  function shouldPopForPurchase(popReward, itemPrice, currentCookies, cps, wrinklerCount) {
    // If we can already afford it, no need to pop
    if (currentCookies >= itemPrice) {
      return { shouldPop: false, reason: 'Already affordable' };
    }

    // If popping doesn't help us afford it, don't pop
    if (currentCookies + popReward < itemPrice) {
      return { shouldPop: false, reason: 'Pop reward insufficient' };
    }

    // Calculate time to afford without popping
    const needed = itemPrice - currentCookies;
    const timeWithoutPop = needed / cps;

    // Calculate opportunity cost: wrinklers won't be earning during respawn
    // With N wrinklers, effective CpS multiplier is roughly 1 + 0.05*N*N*1.1
    // But for simplicity, we estimate lost production during respawn
    const respawnTime = WRINKLER_RESPAWN_TIME * wrinklerCount;
    const lostProduction = cps * 0.5 * respawnTime; // Rough estimate of lost wrinkler gains

    // If we can afford immediately after pop and save significant time, do it
    // Only pop if we save more than the respawn time
    if (timeWithoutPop > respawnTime) {
      return { shouldPop: true, reason: `Saves ${Math.floor(timeWithoutPop - respawnTime)}s` };
    }

    return { shouldPop: false, reason: 'Respawn cost too high' };
  }

  // ===== FUNCTIONS WITH SIMPLE DEPENDENCIES (need mocking for tests) =====

  /**
   * Get total count of owned buildings
   * @param {Object} gameObjects - Game.Objects object
   * @returns {number} Total building count
   */
  function getTotalBuildings(gameObjects) {
    let total = 0;
    for (const name in gameObjects) {
      total += gameObjects[name].amount;
    }
    return total;
  }

  /**
   * Check if a purchase was made since last check
   * @param {Object} state - State object with lastBuildingCount and lastUpgradeCount
   * @param {number} currentBuildings - Current building count
   * @param {number} currentUpgrades - Current upgrade count
   * @returns {Object} { purchased: boolean, newState: Object }
   */
  function checkForPurchaseState(state, currentBuildings, currentUpgrades) {
    const purchased = currentBuildings !== state.lastBuildingCount ||
                      currentUpgrades !== state.lastUpgradeCount;
    return {
      purchased,
      newState: {
        ...state,
        lastBuildingCount: currentBuildings,
        lastUpgradeCount: currentUpgrades
      }
    };
  }

  /**
   * Check if Cookie Monster data is ready
   * @param {Object} cmData - CookieMonsterData object
   * @returns {boolean} True if CM data is ready
   */
  function isCMDataReady(cmData) {
    if (!cmData) return false;

    // CM uses Objects1/Objects10/Objects100 for buy 1/10/100
    if (!cmData.Objects1 || Object.keys(cmData.Objects1).length === 0) {
      return false;
    }

    // Check that PP values are actually calculated (not just the structure existing)
    // Look for the first building and verify it has a valid pp value
    for (const name in cmData.Objects1) {
      const building = cmData.Objects1[name];
      if (building && typeof building.pp === 'number' && !isNaN(building.pp)) {
        return true;
      }
      // If pp exists but is not a valid number yet, CM is still initializing
      return false;
    }

    return false;
  }

  /**
   * Find golden cookie upgrades in store with phase-aware priority
   * @param {Array} upgradesInStore - Array of upgrade objects in store
   * @param {number} currentCookies - Current cookie count
   * @param {number} currentCpS - Current cookies per second
   * @param {number} phaseProgress - Game phase progress (0-1)
   * @returns {Array} Array of golden upgrade objects sorted by priority then price
   */
  function findGoldenUpgradesInStore(upgradesInStore, currentCookies, currentCpS, phaseProgress) {
    const available = [];
    for (const upgrade of upgradesInStore) {
      if (GOLDEN_COOKIE_UPGRADES.has(upgrade.name)) {
        const price = upgrade.getPrice();
        const evaluation = evaluateGoldenUpgradePriority(phaseProgress, price, currentCpS);
        available.push({
          name: upgrade.name,
          type: 'GoldenUpgrade',
          price: price,
          affordable: currentCookies >= price,
          prioritized: evaluation.shouldPrioritize,
          deferReason: evaluation.reason,
          hoursToAfford: evaluation.hoursToAfford,
          gameUpgrade: upgrade
        });
      }
    }
    // Sort: prioritized first, then by price
    return available.sort((a, b) => {
      if (a.prioritized !== b.prioritized) {
        return a.prioritized ? -1 : 1;
      }
      return a.price - b.price;
    });
  }

  /**
   * Execute a purchase for the given item
   * @param {Object} item - Item to purchase
   * @param {Object} gameObjects - Game.Objects
   * @param {Object} gameUpgrades - Game.Upgrades
   * @returns {boolean} True if purchase was successful
   */
  function executePurchaseItem(item, gameObjects, gameUpgrades) {
    if (!item) return false;

    if (item.type === 'Building') {
      // Parse quantity from name (e.g., "Cursor x10" → building="Cursor", qty=10)
      const match = item.name.match(/^(.+) x(\d+)$/);
      if (match) {
        const buildingName = match[1];
        const quantity = parseInt(match[2], 10);
        if (gameObjects[buildingName]) {
          gameObjects[buildingName].buy(quantity);
          return true;
        }
      } else {
        // Single building purchase (no " xN" suffix)
        if (gameObjects[item.name]) {
          gameObjects[item.name].buy(1);
          return true;
        }
      }
    } else if (item.type === 'Upgrade') {
      if (gameUpgrades[item.name]) {
        gameUpgrades[item.name].buy();
        return true;
      }
    }

    return false;
  }

  // ===== EXPORTS FOR TESTING =====
  const testExports = {
    // Constants
    GOLDEN_COOKIE_UPGRADES,
    CM_URL,
    MAX_WAIT_TIME,
    POLL_INTERVAL,
    REFRESH_INTERVAL,
    PHASE_THRESHOLDS,

    // Pure functions
    formatNumber,
    logAction,
    filterAndSortCandidates,
    isGoldenCookieUpgrade,
    isToggleUpgrade,
    getBaseLuckyBank,
    getLuckyBank,
    canAffordWithLuckyBank,

    // Phase detection functions
    smoothstep,
    calculatePhaseProgress,
    getPhaseName,
    getScaledLuckyBank,
    getMaxGoldenSaveHours,
    evaluateGoldenUpgradePriority,

    // Functions with dependencies
    getTotalBuildings,
    checkForPurchaseState,
    isCMDataReady,
    findGoldenUpgradesInStore,
    executePurchaseItem,

    // Wrinkler functions
    WRINKLER_RESPAWN_TIME,
    getWrinklerMultiplier,
    calculateNormalWrinklerReward,
    shouldPopForPurchase
  };

  // ===== BROWSER-ONLY INITIALIZATION =====
  return function(global) {
    // If no global provided, we're in Node/test mode - return exports
    if (!global) return testExports;

    // Browser mode - run the full optimizer
    const window = global;

    // Use global state so multiple bookmarklet clicks can access the same data
    window.CCOptimizer = window.CCOptimizer || {
      lastBuildingCount: 0,
      lastUpgradeCount: 0,
      refreshTimer: null,
      isRunning: false,
      displayElement: null,
      autoPurchase: false,  // Auto-buy best item when affordable (disabled by default)
      autoGolden: false,    // Auto-click golden cookies (disabled by default)
      autoWrath: false,     // Also click wrath cookies when autoGolden is enabled (disabled by default)
      autoWrinklers: false  // Auto-pop wrinklers when it enables a purchase (disabled by default)
    };

    const state = window.CCOptimizer;

    /**
     * Create or get the display element
     */
    function getDisplay() {
      if (state.displayElement && document.body.contains(state.displayElement)) {
        return state.displayElement;
      }

      state.displayElement = document.createElement('div');
      state.displayElement.id = 'cc-optimizer';
      state.displayElement.innerHTML = `
        <div id="cc-opt-header">
          <div class="cc-opt-title">
            <span class="cc-opt-cookie-icon">&#127850;</span>
            <span>Optimizer</span>
          </div>
          <button id="cc-opt-close" aria-label="Close">&times;</button>
        </div>
        <div id="cc-opt-toggles">
          <button id="cc-opt-auto" class="cc-opt-toggle" data-label="Auto">OFF</button>
          <button id="cc-opt-golden" class="cc-opt-toggle" data-label="Gold">OFF</button>
          <button id="cc-opt-wrath" class="cc-opt-toggle" data-label="Wrath" style="display: none;">OFF</button>
          <button id="cc-opt-wrinkler" class="cc-opt-toggle" data-label="Wrnk" style="display: none;">OFF</button>
        </div>
        <div id="cc-opt-lucky-bank" style="display: none;">
          <div class="cc-opt-bank-icon">&#9733;</div>
          <div class="cc-opt-bank-content">
            <span class="cc-opt-bank-label">Lucky Bank</span>
            <span id="cc-opt-lucky-value">0</span>
          </div>
        </div>
        <div id="cc-opt-wrinklers" style="display: none;">
          <div class="cc-opt-wrinkler-icon">&#128027;</div>
          <div class="cc-opt-wrinkler-content">
            <div class="cc-opt-wrinkler-row">
              <span class="cc-opt-wrinkler-label">Wrinklers</span>
              <span id="cc-opt-wrinkler-count">0/10</span>
            </div>
            <div class="cc-opt-wrinkler-row cc-opt-wrinkler-reward-row">
              <span>Pop Reward</span>
              <span id="cc-opt-wrinkler-reward">0</span>
            </div>
          </div>
          <div id="cc-opt-wrinkler-action" style="display: none;"></div>
        </div>
        <div id="cc-opt-content">Loading...</div>
      `;

      const style = document.createElement('style');
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=DM+Sans:wght@400;500;700&display=swap');

        #cc-optimizer {
          --cc-bg-dark: #1a1210;
          --cc-bg-card: #2a201a;
          --cc-bg-hover: #3a2a20;
          --cc-border: #4a3828;
          --cc-border-light: #5a4838;
          --cc-gold: #f4b942;
          --cc-gold-dim: #c4993a;
          --cc-cream: #f5e6d3;
          --cc-cream-dim: #bfaa94;
          --cc-green: #7dcea0;
          --cc-red: #e57373;
          --cc-purple: #b39ddb;
          --cc-text: #e8ddd0;
          --cc-text-dim: #9a8b7a;

          position: fixed;
          top: 10px;
          left: 10px;
          background: var(--cc-bg-dark);
          border: 1px solid var(--cc-border);
          border-radius: 12px;
          color: var(--cc-text);
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          width: 260px;
          z-index: 99999999;
          box-shadow:
            0 4px 24px rgba(0,0,0,0.5),
            0 0 0 1px rgba(244,185,66,0.1),
            inset 0 1px 0 rgba(255,255,255,0.03);
          overflow: hidden;
        }

        #cc-opt-header {
          background: linear-gradient(135deg, var(--cc-bg-card) 0%, var(--cc-bg-dark) 100%);
          padding: 10px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--cc-border);
          cursor: move;
        }

        .cc-opt-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cc-opt-cookie-icon {
          font-size: 18px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }

        .cc-opt-title span:last-child {
          font-family: 'Caveat', cursive;
          font-size: 20px;
          font-weight: 600;
          color: var(--cc-gold);
          letter-spacing: 0.5px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        #cc-opt-close {
          width: 24px;
          height: 24px;
          border: none;
          background: var(--cc-bg-hover);
          color: var(--cc-text-dim);
          border-radius: 6px;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        #cc-opt-close:hover {
          background: var(--cc-red);
          color: white;
          transform: scale(1.05);
        }

        #cc-opt-toggles {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(54px, 1fr));
          gap: 6px;
          padding: 10px 12px;
          background: var(--cc-bg-card);
          border-bottom: 1px solid var(--cc-border);
        }

        .cc-opt-toggle {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 6px 4px;
          border: 1px solid var(--cc-border);
          background: var(--cc-bg-dark);
          color: var(--cc-text-dim);
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.15s ease;
        }

        .cc-opt-toggle::before {
          content: attr(data-label);
          font-size: 9px;
          color: var(--cc-text-dim);
          opacity: 0.7;
        }

        .cc-opt-toggle:hover {
          background: var(--cc-bg-hover);
          border-color: var(--cc-border-light);
        }

        .cc-opt-toggle.active {
          background: linear-gradient(135deg, rgba(125,206,160,0.15) 0%, rgba(125,206,160,0.05) 100%);
          border-color: var(--cc-green);
          color: var(--cc-green);
          box-shadow: 0 0 12px rgba(125,206,160,0.2);
        }

        #cc-opt-golden.active {
          background: linear-gradient(135deg, rgba(244,185,66,0.15) 0%, rgba(244,185,66,0.05) 100%);
          border-color: var(--cc-gold);
          color: var(--cc-gold);
          box-shadow: 0 0 12px rgba(244,185,66,0.2);
        }

        #cc-opt-wrath.active {
          background: linear-gradient(135deg, rgba(229,115,115,0.15) 0%, rgba(229,115,115,0.05) 100%);
          border-color: var(--cc-red);
          color: var(--cc-red);
          box-shadow: 0 0 12px rgba(229,115,115,0.2);
        }

        #cc-opt-wrinkler.active {
          background: linear-gradient(135deg, rgba(179,157,219,0.15) 0%, rgba(179,157,219,0.05) 100%);
          border-color: var(--cc-purple);
          color: var(--cc-purple);
          box-shadow: 0 0 12px rgba(179,157,219,0.2);
        }

        #cc-opt-lucky-bank {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: linear-gradient(90deg, rgba(244,185,66,0.08) 0%, transparent 100%);
          border-bottom: 1px solid var(--cc-border);
        }

        .cc-opt-bank-icon {
          font-size: 16px;
          color: var(--cc-gold);
          opacity: 0.8;
        }

        .cc-opt-bank-content {
          display: flex;
          flex-direction: column;
          gap: 1px;
          flex: 1;
          min-width: 0;
        }

        .cc-opt-bank-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--cc-gold-dim);
        }

        #cc-opt-lucky-value {
          font-size: 11px;
          color: var(--cc-green);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        #cc-opt-lucky-value.below-threshold {
          color: var(--cc-red);
        }

        #cc-opt-wrinklers {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 8px 12px;
          background: linear-gradient(90deg, rgba(179,157,219,0.08) 0%, transparent 100%);
          border-bottom: 1px solid var(--cc-border);
        }

        .cc-opt-wrinkler-icon {
          font-size: 14px;
          opacity: 0.8;
          margin-top: 2px;
        }

        .cc-opt-wrinkler-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .cc-opt-wrinkler-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cc-opt-wrinkler-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--cc-purple);
        }

        #cc-opt-wrinkler-count {
          font-size: 12px;
          color: var(--cc-purple);
          font-weight: 500;
        }

        .cc-opt-wrinkler-reward-row {
          font-size: 10px;
          color: var(--cc-text-dim);
        }

        #cc-opt-wrinkler-reward {
          color: var(--cc-green);
          font-weight: 500;
        }

        #cc-opt-wrinkler-action {
          width: 100%;
          margin-top: 4px;
          padding-top: 4px;
          border-top: 1px dashed var(--cc-border);
          font-size: 10px;
          color: var(--cc-purple);
          font-style: italic;
        }

        .cc-opt-shiny {
          color: var(--cc-gold) !important;
        }

        #cc-opt-content {
          padding: 12px;
          padding-bottom: 14px;
        }

        .cc-opt-item {
          padding: 10px 10px 12px 10px;
          margin-bottom: 10px;
          background: var(--cc-bg-card);
          border: 1px solid var(--cc-border);
          border-radius: 8px;
          transition: all 0.15s ease;
        }

        .cc-opt-item:last-child {
          margin-bottom: 0;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--cc-border-light);
        }

        .cc-opt-item:hover {
          border-color: var(--cc-border-light);
          background: var(--cc-bg-hover);
        }

        .cc-opt-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--cc-text-dim);
          margin-bottom: 4px;
          display: block;
        }

        .cc-opt-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--cc-cream);
          margin-bottom: 4px;
          display: block;
        }

        .cc-opt-stats {
          font-size: 11px;
          color: var(--cc-text-dim);
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          padding-bottom: 2px;
        }

        .cc-opt-affordable {
          color: var(--cc-green) !important;
          font-weight: 600;
        }

        .cc-opt-saving {
          color: var(--cc-red);
        }

        .cc-opt-golden-section {
          background: linear-gradient(135deg, rgba(244,185,66,0.1) 0%, rgba(244,185,66,0.02) 100%);
          border-color: var(--cc-gold-dim);
          position: relative;
          overflow: hidden;
        }

        .cc-opt-golden-section::before {
          content: '\\2605';
          position: absolute;
          top: 8px;
          right: 10px;
          font-size: 12px;
          color: var(--cc-gold);
          opacity: 0.4;
        }

        .cc-opt-golden-label {
          color: var(--cc-gold-dim) !important;
        }

        .cc-opt-golden-name {
          color: var(--cc-gold) !important;
        }

        .cc-opt-golden-deferred {
          opacity: 0.5;
          border-color: var(--cc-border);
          background: var(--cc-bg-card);
        }

        .cc-opt-golden-deferred::before {
          opacity: 0.2;
        }

        .cc-opt-golden-deferred .cc-opt-golden-label {
          color: var(--cc-text-dim) !important;
        }

        .cc-opt-golden-deferred .cc-opt-golden-name {
          color: var(--cc-cream-dim) !important;
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(state.displayElement);

      // Close button
      document.getElementById('cc-opt-close').onclick = () => {
        stopAutoRefresh();
      };

      // Auto-purchase toggle button
      const autoBtn = document.getElementById('cc-opt-auto');
      updateAutoButton(autoBtn);
      autoBtn.onclick = (e) => {
        e.stopPropagation();
        state.autoPurchase = !state.autoPurchase;
        updateAutoButton(autoBtn);
      };

      // Golden cookie toggle button
      const goldenBtn = document.getElementById('cc-opt-golden');
      updateGoldenButton(goldenBtn);
      goldenBtn.onclick = (e) => {
        e.stopPropagation();
        state.autoGolden = !state.autoGolden;
        updateGoldenButton(goldenBtn);
      };

      // Wrath cookie toggle button
      const wrathBtn = document.getElementById('cc-opt-wrath');
      updateWrathButton(wrathBtn);
      wrathBtn.onclick = (e) => {
        e.stopPropagation();
        state.autoWrath = !state.autoWrath;
        updateWrathButton(wrathBtn);
      };

      // Wrinkler toggle button
      const wrinklerBtn = document.getElementById('cc-opt-wrinkler');
      updateWrinklerButton(wrinklerBtn);
      wrinklerBtn.onclick = (e) => {
        e.stopPropagation();
        state.autoWrinklers = !state.autoWrinklers;
        updateWrinklerButton(wrinklerBtn);
      };

      // Make draggable
      makeDraggable(state.displayElement, document.getElementById('cc-opt-header'));

      return state.displayElement;
    }

    /**
     * Update the auto-purchase button display
     */
    function updateAutoButton(btn) {
      if (!btn) btn = document.getElementById('cc-opt-auto');
      if (!btn) return;
      if (state.autoPurchase) {
        btn.textContent = 'ON';
        btn.classList.add('active');
      } else {
        btn.textContent = 'OFF';
        btn.classList.remove('active');
      }
    }

    /**
     * Update the golden cookie button display
     */
    function updateGoldenButton(btn) {
      if (!btn) btn = document.getElementById('cc-opt-golden');
      if (!btn) return;
      if (state.autoGolden) {
        btn.textContent = 'ON';
        btn.classList.add('active');
      } else {
        btn.textContent = 'OFF';
        btn.classList.remove('active');
      }
      // Show/hide wrath button based on golden state
      const wrathBtn = document.getElementById('cc-opt-wrath');
      if (wrathBtn) {
        wrathBtn.style.display = state.autoGolden ? 'flex' : 'none';
      }
    }

    /**
     * Update the wrath cookie button display
     */
    function updateWrathButton(btn) {
      if (!btn) btn = document.getElementById('cc-opt-wrath');
      if (!btn) return;
      if (state.autoWrath) {
        btn.textContent = 'ON';
        btn.classList.add('active');
      } else {
        btn.textContent = 'OFF';
        btn.classList.remove('active');
      }
    }

    /**
     * Update the wrinkler button display
     */
    function updateWrinklerButton(btn) {
      if (!btn) btn = document.getElementById('cc-opt-wrinkler');
      if (!btn) return;
      if (state.autoWrinklers) {
        btn.textContent = 'ON';
        btn.classList.add('active');
      } else {
        btn.textContent = 'OFF';
        btn.classList.remove('active');
      }
    }

    /**
     * Update the Lucky bank display in the UI
     * @param {Object|number} luckyBankInfo - Lucky bank info object or 0 to hide
     * @param {number} currentCookies - Current cookie count
     */
    function updateLuckyBankDisplay(luckyBankInfo, currentCookies) {
      const bankEl = document.getElementById('cc-opt-lucky-bank');
      const valueEl = document.getElementById('cc-opt-lucky-value');

      if (!bankEl || !valueEl) return;

      // Handle hide case (luckyBankInfo === 0)
      if (luckyBankInfo === 0 || !state.autoGolden) {
        bankEl.style.display = 'none';
        return;
      }

      bankEl.style.display = 'flex';
      const { scaled, base, phaseName } = luckyBankInfo;
      const scalePercent = base > 0 ? Math.round((scaled / base) * 100) : 0;

      // Build display text with phase info
      let displayText = '';
      if (scaled === 0) {
        displayText = `${phaseName} phase (0% bank)`;
        valueEl.classList.remove('below-threshold');
      } else if (currentCookies < scaled) {
        displayText = `${formatNumber(scaled)} (need ${formatNumber(scaled - currentCookies)}) [${phaseName} ${scalePercent}%]`;
        valueEl.classList.add('below-threshold');
      } else {
        displayText = `${formatNumber(scaled)} (+${formatNumber(currentCookies - scaled)}) [${phaseName} ${scalePercent}%]`;
        valueEl.classList.remove('below-threshold');
      }

      valueEl.textContent = displayText;
    }

    /**
     * Make an element draggable
     */
    function makeDraggable(element, handle) {
      let offsetX, offsetY, isDragging = false;

      handle.onmousedown = (e) => {
        isDragging = true;
        offsetX = e.clientX - element.offsetLeft;
        offsetY = e.clientY - element.offsetTop;
        e.preventDefault();
      };

      document.onmousemove = (e) => {
        if (!isDragging) return;
        element.style.left = (e.clientX - offsetX) + 'px';
        element.style.top = (e.clientY - offsetY) + 'px';
      };

      document.onmouseup = () => {
        isDragging = false;
      };
    }

    /**
     * Update the display with current best purchase
     * @param {Object} best - Best overall item by PP
     * @param {Object} bestAffordable - Best affordable item by PP
     * @param {Array} goldenUpgrades - Available golden cookie upgrades
     * @param {number} luckyBankScaled - Scaled Lucky bank threshold (0 if Gold: OFF)
     */
    function updateDisplay(best, bestAffordable, goldenUpgrades = [], luckyBankScaled = 0) {
      getDisplay();
      const content = document.getElementById('cc-opt-content');

      // Handle case where no valid best item and no golden upgrades
      if ((!best || typeof best.pp !== 'number') && goldenUpgrades.length === 0) {
        if (content) content.innerHTML = '<div class="cc-opt-item">Calculating...</div>';
        return;
      }

      let html = '';

      // Golden Cookie upgrades section (when Gold: ON and upgrades available)
      // Only show prioritized upgrades prominently; deferred ones are shown differently
      const prioritizedGolden = goldenUpgrades.filter(u => u.prioritized);
      const deferredGolden = goldenUpgrades.filter(u => !u.prioritized);

      if (prioritizedGolden.length > 0) {
        const firstGolden = prioritizedGolden[0];
        // Recalculate affordability with Lucky bank protection
        const isAffordable = canAffordWithLuckyBank(Game.cookies, firstGolden.price, luckyBankScaled);
        html += `<div class="cc-opt-item cc-opt-golden-section">`;
        html += `<div class="cc-opt-label cc-opt-golden-label">Golden Priority</div>`;
        html += `<div class="cc-opt-name cc-opt-golden-name">${firstGolden.name}</div>`;
        html += `<div class="cc-opt-stats">`;
        html += formatNumber(firstGolden.price);
        if (isAffordable) {
          html += ` <span class="cc-opt-affordable">[BUY]</span>`;
        } else {
          // Show how much more needed (price + luckyBankScaled - current cookies)
          const needed = (firstGolden.price + luckyBankScaled) - Game.cookies;
          html += ` <span class="cc-opt-saving">(need ${formatNumber(needed)})</span>`;
        }
        html += `</div></div>`;
      }

      // Show deferred golden upgrades (dimmed)
      if (deferredGolden.length > 0) {
        const firstDeferred = deferredGolden[0];
        html += `<div class="cc-opt-item cc-opt-golden-section cc-opt-golden-deferred">`;
        html += `<div class="cc-opt-label cc-opt-golden-label">Golden (Deferred)</div>`;
        html += `<div class="cc-opt-name cc-opt-golden-name">${firstDeferred.name}</div>`;
        html += `<div class="cc-opt-stats">`;
        html += `${formatNumber(firstDeferred.price)} <span class="cc-opt-saving">(${firstDeferred.deferReason})</span>`;
        html += `</div></div>`;
      }

      // Best overall (only show if we have valid PP data)
      if (best && typeof best.pp === 'number') {
        html += `<div class="cc-opt-item">`;
        html += `<div class="cc-opt-label">Best Overall</div>`;
        html += `<div class="cc-opt-name">${best.name}</div>`;
        html += `<div class="cc-opt-stats">`;
        html += `PP: ${best.pp.toFixed(1)} · ${formatNumber(best.price)}`;
        if (best.affordable) {
          html += ` <span class="cc-opt-affordable">[BUY]</span>`;
        }
        html += `</div></div>`;

        // Best affordable (if different)
        if (bestAffordable && bestAffordable !== best && typeof bestAffordable.pp === 'number') {
          html += `<div class="cc-opt-item">`;
          html += `<div class="cc-opt-label">Best Affordable</div>`;
          html += `<div class="cc-opt-name cc-opt-affordable">${bestAffordable.name}</div>`;
          html += `<div class="cc-opt-stats">`;
          html += `PP: ${bestAffordable.pp.toFixed(1)} · ${formatNumber(bestAffordable.price)}`;
          html += `</div></div>`;
        } else if (!best.affordable && goldenUpgrades.length === 0) {
          // Only show "need more" if no golden section already shown
          const needed = best.price - Game.cookies;
          if (needed > 0) {
            html += `<div class="cc-opt-item">`;
            html += `<div class="cc-opt-saving">Need ${formatNumber(needed)} more</div>`;
            html += `</div>`;
          }
        }
      }

      content.innerHTML = html;
    }

    /**
     * Get total count of owned buildings (browser wrapper)
     */
    function getBrowserTotalBuildings() {
      return getTotalBuildings(Game.Objects);
    }

    /**
     * Get count of owned upgrades
     */
    function getOwnedUpgrades() {
      return Game.UpgradesOwned;
    }

    /**
     * Check if a purchase was made since last check (browser wrapper)
     */
    function checkForPurchase() {
      const currentBuildings = getBrowserTotalBuildings();
      const currentUpgrades = getOwnedUpgrades();

      const purchased = currentBuildings !== state.lastBuildingCount ||
                        currentUpgrades !== state.lastUpgradeCount;

      state.lastBuildingCount = currentBuildings;
      state.lastUpgradeCount = currentUpgrades;

      return purchased;
    }

    /**
     * Get unbuffed CpS (without Frenzy/buff multipliers)
     * Falls back to regular cookiesPs if unbuffedCps not available
     */
    function getUnbuffedCps() {
      if (typeof Game.unbuffedCps === 'number' && Game.unbuffedCps > 0) {
        return Game.unbuffedCps;
      }
      return Game.cookiesPs;
    }

    /**
     * Get current wrinkler statistics from Game
     * @returns {Object|null} Wrinkler stats or null if not in Grandmapocalypse
     */
    function getWrinklerStats() {
      if (typeof Game === 'undefined' || !Game.wrinklers) return null;

      // Check if Grandmapocalypse is active (elderWrath > 0)
      if (Game.elderWrath === 0) return null;

      const wrinklers = Game.wrinklers;
      let normalCount = 0;
      let shinyCount = 0;
      let totalSucked = 0;

      for (const w of wrinklers) {
        if (w.phase === 2) { // Active wrinkler
          if (w.type === 1) {
            shinyCount++;
          } else {
            normalCount++;
          }
          totalSucked += w.sucked;
        }
      }

      // Get wrinkler upgrades
      const hasWrinklerspawn = Game.Has('Wrinklerspawn');
      const hasSacrilegious = Game.Has('Sacrilegious corruption');
      const multiplier = getWrinklerMultiplier(hasWrinklerspawn, hasSacrilegious);

      // Calculate pop reward for normal wrinklers only
      const popReward = calculateNormalWrinklerReward(wrinklers, multiplier);

      // Get max wrinklers (10 base + Elder Spice + Dragon Guts)
      const max = Game.getWrinklersMax ? Game.getWrinklersMax() : 10;

      return {
        count: normalCount + shinyCount,
        max,
        normalCount,
        shinyCount,
        totalSucked,
        popReward,
        multiplier
      };
    }

    /**
     * Pop all normal wrinklers (preserves shiny)
     * @returns {number} Number of wrinklers popped
     */
    function popNormalWrinklers() {
      if (typeof Game === 'undefined' || !Game.wrinklers) return 0;

      let popped = 0;
      for (const w of Game.wrinklers) {
        // Only pop active normal wrinklers (phase 2, type 0)
        if (w.phase === 2 && w.type === 0) {
          w.hp = 0; // Setting hp to 0 pops the wrinkler
          popped++;
        }
      }
      return popped;
    }

    /**
     * Update the wrinkler display section
     * @param {Object|null} stats - Wrinkler stats from getWrinklerStats
     * @param {string|null} actionText - Optional action recommendation text
     */
    function updateWrinklerDisplay(stats, actionText = null) {
      const sectionEl = document.getElementById('cc-opt-wrinklers');
      const countEl = document.getElementById('cc-opt-wrinkler-count');
      const rewardEl = document.getElementById('cc-opt-wrinkler-reward');
      const actionEl = document.getElementById('cc-opt-wrinkler-action');
      const wrinklerBtn = document.getElementById('cc-opt-wrinkler');

      if (!sectionEl) return;

      // Hide section and button if no wrinklers active
      if (!stats || stats.count === 0) {
        sectionEl.style.display = 'none';
        if (wrinklerBtn) wrinklerBtn.style.display = 'none';
        return;
      }

      // Show section and button
      sectionEl.style.display = 'flex';
      if (wrinklerBtn) wrinklerBtn.style.display = 'flex';

      // Update count (with shiny indicator)
      let countText = `${stats.count}/${stats.max}`;
      if (stats.shinyCount > 0) {
        countText += ` <span class="cc-opt-shiny">(${stats.shinyCount} shiny)</span>`;
      }
      if (countEl) countEl.innerHTML = countText;

      // Update reward
      if (rewardEl) rewardEl.textContent = formatNumber(stats.popReward);

      // Update action text
      if (actionEl) {
        if (actionText) {
          actionEl.style.display = 'block';
          actionEl.textContent = actionText;
        } else {
          actionEl.style.display = 'none';
        }
      }
    }

    /**
     * Find available Golden Cookie upgrades in the store (browser wrapper)
     * @param {Object|null} luckyBankInfo - Lucky bank info with phaseProgress, or null
     */
    function findGoldenCookieUpgrades(luckyBankInfo) {
      if (!state.autoGolden || typeof Game === 'undefined') return [];
      const phaseProgress = luckyBankInfo ? luckyBankInfo.phaseProgress : 0;
      // Use unbuffed CpS for hours-to-afford calculation (not affected by Frenzy)
      return findGoldenUpgradesInStore(Game.UpgradesInStore, Game.cookies, getUnbuffedCps(), phaseProgress);
    }

    /**
     * Execute a purchase for the given item (browser wrapper)
     */
    function executePurchase(item) {
      return executePurchaseItem(item, Game.Objects, Game.Upgrades);
    }

    /**
     * Main optimizer function - finds and displays the best purchase
     */
    function findBestPurchase() {
      // Verify we're in Cookie Clicker
      if (typeof Game === 'undefined') {
        console.error('[Optimizer] Game object not found. Are you on the Cookie Clicker page?');
        return;
      }

      // Verify Cookie Monster data is available
      if (typeof CookieMonsterData === 'undefined') {
        console.error('[Optimizer] CookieMonsterData not found. Cookie Monster may not be fully loaded.');
        return;
      }

      // Update tracking state
      state.lastBuildingCount = getBrowserTotalBuildings();
      state.lastUpgradeCount = getOwnedUpgrades();

      // Calculate Lucky bank threshold when Gold: ON
      // Use unbuffed CpS for phase detection (not affected by Frenzy)
      let luckyBankInfo = null;
      let luckyBankScaled = 0;
      if (state.autoGolden) {
        luckyBankInfo = getLuckyBank(CookieMonsterData.Cache, getUnbuffedCps());
        luckyBankScaled = luckyBankInfo.scaled;
        updateLuckyBankDisplay(luckyBankInfo, Game.cookies);
      } else {
        // Hide Lucky bank display when Gold: OFF
        updateLuckyBankDisplay(0, 0);
      }

      // Find Golden Cookie upgrades when Gold: ON (with phase-aware priority)
      const goldenUpgrades = findGoldenCookieUpgrades(luckyBankInfo);

      // Get wrinkler stats and update display
      const wrinklerStats = getWrinklerStats();
      let wrinklerActionText = null;

      const candidates = [];

      // Collect building PP values (Objects1 = buy 1, Objects10 = buy 10, Objects100 = buy 100)
      // We'll check all three and find the best option for each building
      const buyAmounts = [
        { key: 'Objects1', amount: 1 },
        { key: 'Objects10', amount: 10 },
        { key: 'Objects100', amount: 100 }
      ];

      for (const { key, amount } of buyAmounts) {
        const objects = CookieMonsterData[key];
        if (!objects) continue;

        for (const name in objects) {
          const building = objects[name];
          const gameBuilding = Game.Objects[name];

          if (gameBuilding && !gameBuilding.locked && building.pp !== undefined) {
            // Calculate price for buying this amount
            const price = gameBuilding.getSumPrice(amount);
            // When Gold: ON, only mark affordable if it keeps us above Lucky bank threshold
            const isAffordable = state.autoGolden
              ? canAffordWithLuckyBank(Game.cookies, price, luckyBankScaled)
              : Game.cookies >= price;
            candidates.push({
              name: name + (amount > 1 ? ' x' + amount : ''),
              type: 'Building',
              pp: building.pp,
              price: price,
              affordable: isAffordable
            });
          }
        }
      }

      // Collect upgrade PP values
      for (const name in CookieMonsterData.Upgrades) {
        const upgrade = CookieMonsterData.Upgrades[name];
        const gameUpgrade = Game.Upgrades[name];

        // Only consider upgrades that are in the store (available for purchase)
        // Exclude toggle upgrades (Elder Pledge, etc.) - not production upgrades
        if (gameUpgrade && Game.UpgradesInStore.includes(gameUpgrade) && upgrade.pp !== undefined && !isToggleUpgrade(name)) {
          const price = gameUpgrade.getPrice();
          // When Gold: ON, only mark affordable if it keeps us above Lucky bank threshold
          const isAffordable = state.autoGolden
            ? canAffordWithLuckyBank(Game.cookies, price, luckyBankScaled)
            : Game.cookies >= price;
          candidates.push({
            name: name,
            type: 'Upgrade',
            pp: upgrade.pp,
            price: price,
            affordable: isAffordable
          });
        }
      }

      // Filter and sort candidates
      const validCandidates = filterAndSortCandidates(candidates);

      if (validCandidates.length === 0) {
        updateDisplay({ name: 'No items available', pp: 0, price: 0, affordable: false }, null);
        return { best: null, bestAffordable: null };
      }

      const best = validCandidates[0];
      const bestAffordable = validCandidates.find(c => c.affordable);

      // Check if popping wrinklers would help buy the best item
      if (wrinklerStats && wrinklerStats.normalCount > 0 && best && !best.affordable) {
        const popResult = shouldPopForPurchase(
          wrinklerStats.popReward,
          best.price,
          Game.cookies,
          getUnbuffedCps(),
          wrinklerStats.normalCount
        );
        if (popResult.shouldPop) {
          wrinklerActionText = `Pop for ${best.name}? (${popResult.reason})`;
        }
      }

      // Update wrinkler display
      updateWrinklerDisplay(wrinklerStats, wrinklerActionText);

      // Update the on-screen display
      updateDisplay(best, bestAffordable, goldenUpgrades, luckyBankScaled);

      // Auto-purchase logic
      if (state.autoPurchase) {
        // When Gold: ON, prioritize affordable AND prioritized Golden Cookie upgrades
        const affordablePrioritizedGolden = goldenUpgrades.find(u =>
          u.prioritized && canAffordWithLuckyBank(Game.cookies, u.price, luckyBankScaled)
        );
        const hasPendingPrioritizedGolden = goldenUpgrades.some(u => u.prioritized);

        if (state.autoGolden && affordablePrioritizedGolden) {
          // Buy the golden upgrade now
          const cookiesBefore = Game.cookies;
          affordablePrioritizedGolden.gameUpgrade.buy();
          logAction('PURCHASE', {
            item: affordablePrioritizedGolden.name,
            type: 'GoldenUpgrade',
            price: affordablePrioritizedGolden.price,
            cookies_before: cookiesBefore
          });
        } else if (state.autoGolden && hasPendingPrioritizedGolden) {
          // Save up for the prioritized golden upgrade - don't buy anything else
          // (no purchase made this cycle)
        } else if (best && best.affordable) {
          // No prioritized golden upgrades pending - buy the best PP-based item
          const cookiesBefore = Game.cookies;
          executePurchase(best);
          logAction('PURCHASE', {
            item: best.name,
            type: best.type,
            price: best.price,
            pp: best.pp,
            cookies_before: cookiesBefore
          });
        } else if (state.autoWrinklers && wrinklerStats && wrinklerStats.normalCount > 0 && best && !best.affordable) {
          // Auto-pop wrinklers if it enables buying the best item
          const popResult = shouldPopForPurchase(
            wrinklerStats.popReward,
            best.price,
            Game.cookies,
            getUnbuffedCps(),
            wrinklerStats.normalCount
          );
          if (popResult.shouldPop) {
            const cookiesBefore = Game.cookies;
            const popped = popNormalWrinklers();
            logAction('WRINKLER_POP', {
              count: popped,
              reward: wrinklerStats.popReward,
              target_item: best.name,
              reason: popResult.reason,
              cookies_before: cookiesBefore
            });
          }
        }
      }

      return { best, bestAffordable, goldenUpgrades, wrinklerStats };
    }

    /**
     * Click golden cookies (and optionally wrath cookies) if enabled
     */
    function clickGoldenCookies() {
      if (!state.autoGolden || typeof Game === 'undefined' || !Game.shimmers) return;

      for (const shimmer of Game.shimmers) {
        if (shimmer.type === 'golden') {
          // Click if it's a regular golden cookie, or if it's wrath and autoWrath is enabled
          if (shimmer.wrath === 0 || state.autoWrath) {
            const shimmerType = shimmer.wrath === 0 ? 'golden' : 'wrath';
            const cookiesBefore = Game.cookies;
            shimmer.pop();
            logAction('GOLDEN_CLICK', {
              shimmer_type: shimmerType,
              cookies_before: cookiesBefore
            });
          }
        }
      }
    }

    /**
     * Check if Cookie Monster data is ready (browser wrapper)
     */
    function checkCMDataReady() {
      return isCMDataReady(typeof CookieMonsterData !== 'undefined' ? CookieMonsterData : undefined);
    }

    /**
     * Wait for Cookie Monster to fully initialize
     */
    function waitForCookieMonster(callback) {
      const startTime = Date.now();

      function check() {
        if (checkCMDataReady()) {
          callback();
        } else if (Date.now() - startTime > MAX_WAIT_TIME) {
          console.error('[Optimizer] Timeout waiting for Cookie Monster. Try refreshing the page.');
        } else {
          setTimeout(check, POLL_INTERVAL);
        }
      }

      check();
    }

    /**
     * Load Cookie Monster if not already loaded
     */
    function ensureCookieMonster(callback) {
      // Already loaded and ready?
      if (checkCMDataReady()) {
        callback();
        return;
      }

      // Check if CM is loading but not ready yet
      if (typeof CookieMonsterData !== 'undefined' ||
          (typeof Game !== 'undefined' && Game.mods && Game.mods['Cookie Monster'])) {
        console.log('[Optimizer] Waiting for Cookie Monster to initialize...');
        waitForCookieMonster(callback);
        return;
      }

      // Need to load Cookie Monster
      console.log('[Optimizer] Loading Cookie Monster...');

      if (typeof Game !== 'undefined' && typeof Game.LoadMod === 'function') {
        Game.LoadMod(CM_URL);
        waitForCookieMonster(callback);
      } else {
        console.error('[Optimizer] Cannot load Cookie Monster. Game.LoadMod not available.');
      }
    }

    /**
     * Start the auto-refresh loop
     */
    function startAutoRefresh() {
      if (state.isRunning) {
        // Already running - stop it
        stopAutoRefresh();
        return;
      }

      state.isRunning = true;

      // Run immediately
      findBestPurchase();

      // Set up purchase detection (check more frequently)
      let lastCheck = Date.now();

      state.refreshTimer = setInterval(() => {
        const now = Date.now();
        const timeSinceLastCheck = now - lastCheck;

        // Always check for golden cookies (runs every 200ms for responsiveness)
        clickGoldenCookies();

        // Check for purchases every 200ms
        if (checkForPurchase()) {
          findBestPurchase();
          lastCheck = now;
        }
        // Also refresh every REFRESH_INTERVAL regardless
        else if (timeSinceLastCheck >= REFRESH_INTERVAL) {
          findBestPurchase();
          lastCheck = now;
        }
      }, 200);
    }

    /**
     * Stop the auto-refresh loop
     */
    function stopAutoRefresh() {
      if (state.refreshTimer) {
        clearInterval(state.refreshTimer);
        state.refreshTimer = null;
      }
      state.isRunning = false;
      // Remove the display
      if (state.displayElement && document.body.contains(state.displayElement)) {
        state.displayElement.remove();
      }
    }

    // Expose stop function globally so user can stop it
    window.CCOptimizerStop = stopAutoRefresh;

    // Check if already running (bookmarklet clicked again) - toggle behavior
    if (state.isRunning) {
      stopAutoRefresh();
    } else {
      // Start the optimizer
      ensureCookieMonster(startAutoRefresh);
    }
  };
}));
