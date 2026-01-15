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
    executePurchaseItem
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
      autoWrath: false      // Also click wrath cookies when autoGolden is enabled (disabled by default)
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
          <span>Optimizer</span>
          <div id="cc-opt-controls">
            <span id="cc-opt-auto">Auto: OFF</span>
            <span id="cc-opt-golden">Gold: OFF</span>
            <span id="cc-opt-wrath" style="display: none;">Wrath: OFF</span>
            <span id="cc-opt-close">x</span>
          </div>
        </div>
        <div id="cc-opt-lucky-bank" style="display: none;">
          <span class="cc-opt-lucky-label">Lucky Bank: </span>
          <span id="cc-opt-lucky-value">0</span>
        </div>
        <div id="cc-opt-content">Loading...</div>
      `;

      const style = document.createElement('style');
      style.textContent = `
        #cc-optimizer {
          position: fixed;
          top: 10px;
          left: 10px;
          background: rgba(0, 0, 0, 0.85);
          border: 2px solid #4a3000;
          border-radius: 8px;
          color: #fff;
          font-family: Arial, sans-serif;
          font-size: 12px;
          min-width: 200px;
          max-width: 280px;
          z-index: 99999999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        #cc-opt-header {
          background: linear-gradient(to bottom, #5a4020, #3a2810);
          padding: 6px 10px;
          font-weight: bold;
          color: #ffd700;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 6px 6px 0 0;
          cursor: move;
          gap: 12px;
        }
        #cc-opt-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        #cc-opt-auto {
          cursor: pointer;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          background: #333;
          color: #999;
        }
        #cc-opt-auto:hover {
          background: #444;
        }
        #cc-opt-auto.active {
          background: #2a5a2a;
          color: #90EE90;
        }
        #cc-opt-golden {
          cursor: pointer;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          background: #333;
          color: #999;
        }
        #cc-opt-golden:hover {
          background: #444;
        }
        #cc-opt-golden.active {
          background: #5a4a2a;
          color: #ffd700;
        }
        #cc-opt-wrath {
          cursor: pointer;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          background: #333;
          color: #999;
        }
        #cc-opt-wrath:hover {
          background: #444;
        }
        #cc-opt-wrath.active {
          background: #5a2a2a;
          color: #ff6666;
        }
        #cc-opt-close {
          cursor: pointer;
          color: #ff6666;
          font-size: 14px;
          padding: 0 4px;
        }
        #cc-opt-close:hover {
          color: #ff0000;
        }
        #cc-opt-content {
          padding: 8px 10px;
        }
        .cc-opt-item {
          margin-bottom: 6px;
          padding-bottom: 6px;
          border-bottom: 1px solid #333;
        }
        .cc-opt-item:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        .cc-opt-label {
          color: #aaa;
          font-size: 10px;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .cc-opt-name {
          color: #ffd700;
          font-weight: bold;
        }
        .cc-opt-stats {
          color: #ccc;
          font-size: 11px;
        }
        .cc-opt-affordable {
          color: #90EE90;
        }
        .cc-opt-saving {
          color: #ff9999;
        }
        .cc-opt-golden-section {
          background: linear-gradient(to right, rgba(255, 215, 0, 0.15), transparent);
          border-left: 3px solid #ffd700;
          padding-left: 7px;
          margin-left: -7px;
        }
        .cc-opt-golden-label {
          color: #ffd700 !important;
        }
        .cc-opt-golden-name {
          color: #ffec8b !important;
        }
        .cc-opt-golden-deferred {
          opacity: 0.6;
          border-left-color: #888;
          background: linear-gradient(to right, rgba(128, 128, 128, 0.1), transparent);
        }
        .cc-opt-golden-deferred .cc-opt-golden-label {
          color: #aaa !important;
        }
        .cc-opt-golden-deferred .cc-opt-golden-name {
          color: #ccc !important;
        }
        #cc-opt-lucky-bank {
          background: linear-gradient(to right, rgba(255, 215, 0, 0.1), transparent);
          padding: 4px 10px;
          border-bottom: 1px solid #333;
          font-size: 11px;
        }
        .cc-opt-lucky-label {
          color: #ffd700;
        }
        #cc-opt-lucky-value {
          color: #90EE90;
        }
        #cc-opt-lucky-value.below-threshold {
          color: #ff6666;
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
        btn.textContent = 'Auto: ON';
        btn.classList.add('active');
      } else {
        btn.textContent = 'Auto: OFF';
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
        btn.textContent = 'Gold: ON';
        btn.classList.add('active');
      } else {
        btn.textContent = 'Gold: OFF';
        btn.classList.remove('active');
      }
      // Show/hide wrath button based on golden state
      const wrathBtn = document.getElementById('cc-opt-wrath');
      if (wrathBtn) {
        wrathBtn.style.display = state.autoGolden ? 'inline' : 'none';
      }
    }

    /**
     * Update the wrath cookie button display
     */
    function updateWrathButton(btn) {
      if (!btn) btn = document.getElementById('cc-opt-wrath');
      if (!btn) return;
      if (state.autoWrath) {
        btn.textContent = 'Wrath: ON';
        btn.classList.add('active');
      } else {
        btn.textContent = 'Wrath: OFF';
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

      bankEl.style.display = 'block';
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
          html += `<div class="cc-opt-item">`;
          html += `<div class="cc-opt-saving">Need ${formatNumber(best.price - Game.cookies)} more</div>`;
          html += `</div>`;
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
        if (gameUpgrade && Game.UpgradesInStore.includes(gameUpgrade) && upgrade.pp !== undefined) {
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
        }
      }

      return { best, bestAffordable, goldenUpgrades };
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
