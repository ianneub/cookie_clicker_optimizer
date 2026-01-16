/**
 * Main optimizer logic and entry point
 */

import styles from './ui/styles.css?inline';
import { CM_URL, MAX_WAIT_TIME, POLL_INTERVAL, REFRESH_INTERVAL } from './core/constants';
import { logAction } from './core/formatting';
import { getLuckyBank, canAffordWithLuckyBank } from './core/luckyBank';
import { filterAndSortCandidates, isToggleUpgrade } from './core/candidates';
import { shouldPopForPurchase } from './core/wrinklers';
import {
  getTotalBuildings,
  executePurchaseItem,
  isCMDataReady,
} from './browser/game';
import { findGoldenUpgradesInStore } from './browser/purchases';
import { clickGoldenCookies } from './browser/cookies';
import { getWrinklerStats, popNormalWrinklers } from './browser/wrinklers';
import { getDisplay, cleanupPanel } from './ui/panel';
import {
  updateAutoButton,
  updateGoldenButton,
  updateWrathButton,
  updateWrinklerButton,
} from './ui/buttons';
import { updateLuckyBankDisplay, updateWrinklerDisplay, updateDisplay } from './ui/display';
import { getState } from './state';
import type { Candidate, OptimizerState } from './types';

/**
 * Get unbuffed CpS (without Frenzy/buff multipliers)
 */
function getUnbuffedCps(): number {
  if (typeof Game.unbuffedCps === 'number' && Game.unbuffedCps > 0) {
    return Game.unbuffedCps;
  }
  return Game.cookiesPs;
}

/**
 * Check for purchase (browser wrapper)
 */
function checkForPurchase(state: OptimizerState): boolean {
  const currentBuildings = getTotalBuildings(Game.Objects);
  const currentUpgrades = Game.UpgradesOwned;

  const purchased =
    currentBuildings !== state.lastBuildingCount || currentUpgrades !== state.lastUpgradeCount;

  state.lastBuildingCount = currentBuildings;
  state.lastUpgradeCount = currentUpgrades;

  return purchased;
}

/**
 * Check if Cookie Monster data is ready (browser wrapper)
 */
function checkCMDataReady(): boolean {
  return isCMDataReady(typeof CookieMonsterData !== 'undefined' ? CookieMonsterData : undefined);
}

/**
 * Wait for Cookie Monster to fully initialize
 */
function waitForCookieMonster(callback: () => void): void {
  const startTime = Date.now();

  function check(): void {
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
function ensureCookieMonster(callback: () => void): void {
  if (checkCMDataReady()) {
    callback();
    return;
  }

  if (
    typeof CookieMonsterData !== 'undefined' ||
    (typeof Game !== 'undefined' && Game.mods && Game.mods['Cookie Monster'])
  ) {
    console.log('[Optimizer] Waiting for Cookie Monster to initialize...');
    waitForCookieMonster(callback);
    return;
  }

  console.log('[Optimizer] Loading Cookie Monster...');

  if (typeof Game !== 'undefined' && typeof Game.LoadMod === 'function') {
    Game.LoadMod(CM_URL);
    waitForCookieMonster(callback);
  } else {
    console.error('[Optimizer] Cannot load Cookie Monster. Game.LoadMod not available.');
  }
}

/**
 * Main optimizer function - finds and displays the best purchase
 */
function findBestPurchase(state: OptimizerState): void {
  if (typeof Game === 'undefined') {
    console.error('[Optimizer] Game object not found. Are you on the Cookie Clicker page?');
    return;
  }

  if (typeof CookieMonsterData === 'undefined') {
    console.error('[Optimizer] CookieMonsterData not found. Cookie Monster may not be fully loaded.');
    return;
  }

  state.lastBuildingCount = getTotalBuildings(Game.Objects);
  state.lastUpgradeCount = Game.UpgradesOwned;

  // Calculate Lucky bank threshold when Gold: ON
  let luckyBankInfo = null;
  let luckyBankScaled = 0;
  if (state.autoGolden) {
    luckyBankInfo = getLuckyBank(CookieMonsterData.Cache, getUnbuffedCps());
    luckyBankScaled = luckyBankInfo.scaled;
    updateLuckyBankDisplay(luckyBankInfo, Game.cookies, state.autoGolden);
  } else {
    updateLuckyBankDisplay(0, 0, state.autoGolden);
  }

  // Find Golden Cookie upgrades when Gold: ON
  const goldenUpgrades = state.autoGolden
    ? findGoldenUpgradesInStore(
        Game.UpgradesInStore,
        Game.cookies,
        getUnbuffedCps(),
        luckyBankInfo?.phaseProgress ?? 0
      )
    : [];

  // Get wrinkler stats
  const wrinklerStats = getWrinklerStats({
    wrinklers: Game.wrinklers,
    elderWrath: Game.elderWrath,
    has: Game.Has.bind(Game),
    getWrinklersMax: Game.getWrinklersMax?.bind(Game),
  });
  let wrinklerActionText: string | null = null;

  const candidates: Candidate[] = [];

  // Collect building PP values
  const buyAmounts = [
    { key: 'Objects1' as const, amount: 1 },
    { key: 'Objects10' as const, amount: 10 },
    { key: 'Objects100' as const, amount: 100 },
  ];

  for (const { key, amount } of buyAmounts) {
    const objects = CookieMonsterData[key];
    if (!objects) continue;

    for (const name in objects) {
      if (!Object.prototype.hasOwnProperty.call(objects, name)) continue;
      const building = objects[name];
      const gameBuilding = Game.Objects[name];

      if (building && gameBuilding && !gameBuilding.locked && building.pp !== undefined) {
        const price = gameBuilding.getSumPrice(amount);
        const isAffordable = state.autoGolden
          ? canAffordWithLuckyBank(Game.cookies, price, luckyBankScaled)
          : Game.cookies >= price;
        candidates.push({
          name: name + (amount > 1 ? ' x' + amount : ''),
          type: 'Building',
          pp: building.pp,
          price: price,
          affordable: isAffordable,
        });
      }
    }
  }

  // Collect upgrade PP values
  for (const name in CookieMonsterData.Upgrades) {
    if (!Object.prototype.hasOwnProperty.call(CookieMonsterData.Upgrades, name)) continue;
    const upgrade = CookieMonsterData.Upgrades[name];
    const gameUpgrade = Game.Upgrades[name];

    if (
      upgrade &&
      gameUpgrade &&
      Game.UpgradesInStore.includes(gameUpgrade) &&
      upgrade.pp !== undefined &&
      !isToggleUpgrade(name)
    ) {
      const price = gameUpgrade.getPrice();
      const isAffordable = state.autoGolden
        ? canAffordWithLuckyBank(Game.cookies, price, luckyBankScaled)
        : Game.cookies >= price;
      candidates.push({
        name: name,
        type: 'Upgrade',
        pp: upgrade.pp,
        price: price,
        affordable: isAffordable,
      });
    }
  }

  // Filter and sort candidates
  const validCandidates = filterAndSortCandidates(candidates);

  if (validCandidates.length === 0) {
    updateDisplay(
      { name: 'No items available', pp: 0, price: 0, affordable: false, type: 'Building' },
      null,
      goldenUpgrades,
      luckyBankScaled,
      Game.cookies
    );
    return;
  }

  // We know validCandidates has at least one element due to the early return above
  const best = validCandidates[0]!;
  const bestAffordable = validCandidates.find((c) => c.affordable) ?? null;

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

  updateWrinklerDisplay(wrinklerStats, wrinklerActionText);
  updateDisplay(best, bestAffordable, goldenUpgrades, luckyBankScaled, Game.cookies);

  // Auto-purchase logic
  if (state.autoPurchase) {
    const affordablePrioritizedGolden = goldenUpgrades.find(
      (u) => u.prioritized && canAffordWithLuckyBank(Game.cookies, u.price, luckyBankScaled)
    );
    const hasPendingPrioritizedGolden = goldenUpgrades.some((u) => u.prioritized);

    if (state.autoGolden && affordablePrioritizedGolden) {
      const cookiesBefore = Game.cookies;
      affordablePrioritizedGolden.gameUpgrade.buy();
      logAction('PURCHASE', {
        item: affordablePrioritizedGolden.name,
        type: 'GoldenUpgrade',
        price: affordablePrioritizedGolden.price,
        cookies_before: cookiesBefore,
      });
    } else if (state.autoGolden && hasPendingPrioritizedGolden) {
      // Save up for the prioritized golden upgrade
    } else if (best && best.affordable) {
      const cookiesBefore = Game.cookies;
      executePurchaseItem(best, Game.Objects, Game.Upgrades);
      logAction('PURCHASE', {
        item: best.name,
        type: best.type,
        price: best.price,
        pp: best.pp,
        cookies_before: cookiesBefore,
      });
    } else if (
      state.autoWrinklers &&
      wrinklerStats &&
      wrinklerStats.normalCount > 0 &&
      best &&
      !best.affordable
    ) {
      const popResult = shouldPopForPurchase(
        wrinklerStats.popReward,
        best.price,
        Game.cookies,
        getUnbuffedCps(),
        wrinklerStats.normalCount
      );
      if (popResult.shouldPop) {
        const cookiesBefore = Game.cookies;
        const popped = popNormalWrinklers(Game.wrinklers);
        logAction('WRINKLER_POP', {
          count: popped,
          reward: wrinklerStats.popReward,
          target_item: best.name,
          reason: popResult.reason,
          cookies_before: cookiesBefore,
        });
      }
    }
  }
}

/**
 * Handle toggle button clicks
 */
function handleToggle(state: OptimizerState, key: keyof OptimizerState): void {
  if (key === 'autoPurchase') {
    state.autoPurchase = !state.autoPurchase;
    updateAutoButton(state.autoPurchase);
  } else if (key === 'autoGolden') {
    state.autoGolden = !state.autoGolden;
    updateGoldenButton(state.autoGolden);
  } else if (key === 'autoWrath') {
    state.autoWrath = !state.autoWrath;
    updateWrathButton(state.autoWrath);
  } else if (key === 'autoWrinklers') {
    state.autoWrinklers = !state.autoWrinklers;
    updateWrinklerButton(state.autoWrinklers);
  }
}

/**
 * Stop the auto-refresh loop
 */
function stopAutoRefresh(state: OptimizerState): void {
  if (state.refreshTimer) {
    clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }
  state.isRunning = false;
  if (state.displayElement && document.body.contains(state.displayElement)) {
    state.displayElement.remove();
  }
  cleanupPanel();
}

/**
 * Start the auto-refresh loop
 */
function startAutoRefresh(state: OptimizerState): void {
  if (state.isRunning) {
    stopAutoRefresh(state);
    return;
  }

  state.isRunning = true;

  // Initialize UI
  getDisplay(
    state,
    styles,
    () => stopAutoRefresh(state),
    (key) => handleToggle(state, key)
  );

  // Run immediately
  findBestPurchase(state);

  // Set up refresh loop
  let lastCheck = Date.now();

  state.refreshTimer = setInterval(() => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheck;

    // Always check for golden cookies (runs every 200ms)
    clickGoldenCookies(Game.shimmers, state.autoGolden, state.autoWrath, () => Game.cookies);

    // Check for purchases every 200ms
    if (checkForPurchase(state)) {
      findBestPurchase(state);
      lastCheck = now;
    } else if (timeSinceLastCheck >= REFRESH_INTERVAL) {
      findBestPurchase(state);
      lastCheck = now;
    }
  }, 200);
}

/**
 * Main entry point for browser execution
 */
export function run(): void {
  if (typeof window === 'undefined') {
    console.error('[Optimizer] This script must run in a browser environment.');
    return;
  }

  const state = getState();

  // Expose stop function globally
  window.CCOptimizerStop = () => stopAutoRefresh(state);

  // Toggle behavior if already running
  if (state.isRunning) {
    stopAutoRefresh(state);
  } else {
    ensureCookieMonster(() => startAutoRefresh(state));
  }
}

// Auto-run when loaded in browser
if (typeof window !== 'undefined') {
  run();
}
