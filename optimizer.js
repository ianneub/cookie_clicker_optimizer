/**
 * Cookie Clicker Optimizer
 *
 * A bookmarklet that finds the most efficient purchase in Cookie Clicker
 * by leveraging Cookie Monster's payback period (PP) calculations.
 *
 * Usage: Run this script while playing Cookie Clicker at https://orteil.dashnet.org/cookieclicker/
 */

(function() {
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
   */
  function updateDisplay(best, bestAffordable, goldenUpgrades = []) {
    getDisplay();
    const content = document.getElementById('cc-opt-content');

    // Handle case where no valid best item and no golden upgrades
    if ((!best || typeof best.pp !== 'number') && goldenUpgrades.length === 0) {
      if (content) content.innerHTML = '<div class="cc-opt-item">Calculating...</div>';
      return;
    }

    let html = '';

    // Golden Cookie upgrades section (when Gold: ON and upgrades available)
    if (goldenUpgrades.length > 0) {
      const firstGolden = goldenUpgrades[0];
      html += `<div class="cc-opt-item cc-opt-golden-section">`;
      html += `<div class="cc-opt-label cc-opt-golden-label">Golden Priority</div>`;
      html += `<div class="cc-opt-name cc-opt-golden-name">${firstGolden.name}</div>`;
      html += `<div class="cc-opt-stats">`;
      html += formatNumber(firstGolden.price);
      if (firstGolden.affordable) {
        html += ` <span class="cc-opt-affordable">[BUY]</span>`;
      } else {
        html += ` <span class="cc-opt-saving">(need ${formatNumber(firstGolden.price - Game.cookies)})</span>`;
      }
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
   * Get total count of owned buildings
   */
  function getTotalBuildings() {
    let total = 0;
    for (const name in Game.Objects) {
      total += Game.Objects[name].amount;
    }
    return total;
  }

  /**
   * Get count of owned upgrades
   */
  function getOwnedUpgrades() {
    return Game.UpgradesOwned;
  }

  /**
   * Check if a purchase was made since last check
   */
  function checkForPurchase() {
    const currentBuildings = getTotalBuildings();
    const currentUpgrades = getOwnedUpgrades();

    const purchased = currentBuildings !== state.lastBuildingCount ||
                      currentUpgrades !== state.lastUpgradeCount;

    state.lastBuildingCount = currentBuildings;
    state.lastUpgradeCount = currentUpgrades;

    return purchased;
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
    state.lastBuildingCount = getTotalBuildings();
    state.lastUpgradeCount = getOwnedUpgrades();

    // Find Golden Cookie upgrades when Gold: ON
    const goldenUpgrades = findGoldenCookieUpgrades();

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
          candidates.push({
            name: name + (amount > 1 ? ' x' + amount : ''),
            type: 'Building',
            pp: building.pp,
            price: price,
            affordable: Game.cookies >= price
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
        candidates.push({
          name: name,
          type: 'Upgrade',
          pp: upgrade.pp,
          price: price,
          affordable: Game.cookies >= price
        });
      }
    }

    // Filter out items with invalid PP (null, undefined, NaN, Infinity)
    const validCandidates = candidates.filter(c =>
      typeof c.pp === 'number' && isFinite(c.pp) && c.pp > 0
    );

    if (validCandidates.length === 0) {
      updateDisplay({ name: 'No items available', pp: 0, price: 0, affordable: false }, null);
      return { best: null, bestAffordable: null };
    }

    // Sort by PP (lower is better)
    validCandidates.sort((a, b) => a.pp - b.pp);

    const best = validCandidates[0];
    const bestAffordable = validCandidates.find(c => c.affordable);

    // Update the on-screen display
    updateDisplay(best, bestAffordable, goldenUpgrades);

    // Auto-purchase logic
    if (state.autoPurchase) {
      // When Gold: ON, prioritize affordable Golden Cookie upgrades
      const affordableGolden = goldenUpgrades.find(u => u.affordable);
      if (state.autoGolden && affordableGolden) {
        affordableGolden.gameUpgrade.buy();
      } else if (best && best.affordable) {
        // Otherwise buy the best PP-based item
        executePurchase(best);
      }
    }

    return { best, bestAffordable, goldenUpgrades };
  }

  /**
   * Execute a purchase for the given item
   */
  function executePurchase(item) {
    if (!item) return false;

    if (item.type === 'Building') {
      // Parse quantity from name (e.g., "Cursor x10" → building="Cursor", qty=10)
      const match = item.name.match(/^(.+) x(\d+)$/);
      if (match) {
        const buildingName = match[1];
        const quantity = parseInt(match[2], 10);
        if (Game.Objects[buildingName]) {
          Game.Objects[buildingName].buy(quantity);
          return true;
        }
      } else {
        // Single building purchase (no " xN" suffix)
        if (Game.Objects[item.name]) {
          Game.Objects[item.name].buy(1);
          return true;
        }
      }
    } else if (item.type === 'Upgrade') {
      if (Game.Upgrades[item.name]) {
        Game.Upgrades[item.name].buy();
        return true;
      }
    }

    return false;
  }

  /**
   * Find available Golden Cookie upgrades in the store
   * Returns array sorted by price (cheapest first)
   */
  function findGoldenCookieUpgrades() {
    if (!state.autoGolden || typeof Game === 'undefined') return [];
    const available = [];
    for (const upgrade of Game.UpgradesInStore) {
      if (GOLDEN_COOKIE_UPGRADES.has(upgrade.name)) {
        available.push({
          name: upgrade.name,
          type: 'GoldenUpgrade',
          price: upgrade.getPrice(),
          affordable: Game.cookies >= upgrade.getPrice(),
          gameUpgrade: upgrade
        });
      }
    }
    return available.sort((a, b) => a.price - b.price);
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
          shimmer.pop();
        }
      }
    }
  }

  /**
   * Format large numbers in a readable way
   */
  function formatNumber(num) {
    if (num >= 1e15) return (num / 1e15).toFixed(2) + ' quadrillion';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + ' trillion';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + ' billion';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + ' million';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + ' thousand';
    return num.toFixed(0);
  }

  /**
   * Check if Cookie Monster data is ready (including PP values being calculated)
   */
  function isCMDataReady() {
    if (typeof CookieMonsterData === 'undefined') return false;

    // CM uses Objects1/Objects10/Objects100 for buy 1/10/100
    if (!CookieMonsterData.Objects1 || Object.keys(CookieMonsterData.Objects1).length === 0) {
      return false;
    }

    // Check that PP values are actually calculated (not just the structure existing)
    // Look for the first building and verify it has a valid pp value
    for (const name in CookieMonsterData.Objects1) {
      const building = CookieMonsterData.Objects1[name];
      if (building && typeof building.pp === 'number' && !isNaN(building.pp)) {
        return true;
      }
      // If pp exists but is not a valid number yet, CM is still initializing
      return false;
    }

    return false;
  }

  /**
   * Wait for Cookie Monster to fully initialize
   */
  function waitForCookieMonster(callback) {
    const startTime = Date.now();

    function check() {
      if (isCMDataReady()) {
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
    if (isCMDataReady()) {
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

})();
