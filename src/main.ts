/**
 * Main optimizer logic and entry point
 */

import styles from './ui/styles.css?inline';
import { CM_URL, MAX_WAIT_TIME, POLL_INTERVAL, REFRESH_INTERVAL } from './core/constants';
import { logAction } from './core/formatting';
import { getLuckyBank, canAffordWithLuckyBank } from './core/luckyBank';
import { calculatePhaseProgress } from './core/phase';
import { filterAndSortCandidates } from './core/candidates';
import { shouldPopForPurchase } from './core/wrinklers';
import {
  getRecommendedAuras,
  shouldSwitchAuras,
  countKittenUpgrades,
  isAuraUnlocked,
} from './core/dragon';
import type { DragonAura } from './types';
import {
  getTotalBuildings,
  executePurchaseItem,
  isCMDataReady,
} from './browser/game';
import { collectUpgradeCandidates, findGoldenUpgradesInStore } from './browser/purchases';
import { clickShimmers } from './browser/cookies';
import { getWrinklerStats, popNormalWrinklers } from './browser/wrinklers';
import {
  getDragonState,
  switchAuras,
  hasActiveFrenzy,
  getHighestTierBuildingCount,
  getTotalBuildingCount,
} from './browser/dragon';
import { getDisplay, cleanupPanel } from './ui/panel';
import {
  updateAutoButton,
  updateGoldenButton,
  updateWrathButton,
  updateWrinklerButton,
  updateDragonButton,
} from './ui/buttons';
import { updateLuckyBankDisplay, updateWrinklerDisplay, updateDisplay, updateDragonDisplay, updateAscensionDisplay } from './ui/display';
import { getAscensionStats } from './browser/ascension';
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
 * Ensure the dragon menu is open for dragon operations
 */
function ensureDragonMenuOpen(): void {
  if (Game.specialTab !== 'dragon') {
    Game.specialTab = 'dragon';
    Game.ToggleSpecialMenu?.(1);
  }
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

  // Cache unbuffed CpS for use throughout this function
  const unbuffedCps = getUnbuffedCps();

  // Get phase progress for golden upgrade evaluation
  const phaseProgress = calculatePhaseProgress(unbuffedCps);

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
        candidates.push({
          name: name + (amount > 1 ? ' x' + amount : ''),
          type: 'Building',
          pp: building.pp,
          price: price,
          affordable: false, // Will be set after lucky bank calculation
        });
      }
    }
  }

  // Collect upgrade PP values (without lucky bank for now)
  const upgradeCandidates = collectUpgradeCandidates(
    CookieMonsterData.Upgrades,
    Game.Upgrades,
    Game.UpgradesInStore,
    Game.cookies,
    0, // No lucky bank yet
    false // Don't apply lucky bank yet
  );
  candidates.push(...upgradeCandidates);

  // Filter and sort candidates
  const validCandidates = filterAndSortCandidates(candidates);

  // Calculate Lucky bank based on best item price (disabled in early game)
  const bestPrice = validCandidates[0]?.price;
  const luckyBankScaled = state.autoGolden ? getLuckyBank(bestPrice, unbuffedCps) : 0;

  // Update affordability based on per-item lucky bank
  for (const c of validCandidates) {
    if (state.autoGolden) {
      const itemLuckyBank = getLuckyBank(c.price, unbuffedCps);
      c.affordable = canAffordWithLuckyBank(Game.cookies, c.price, itemLuckyBank);
    } else {
      c.affordable = Game.cookies >= c.price;
    }
  }

  // Update lucky bank display
  updateLuckyBankDisplay(luckyBankScaled, Game.cookies, state.autoGolden);

  // Find Golden Cookie upgrades when Gold: ON
  const goldenUpgrades = state.autoGolden
    ? findGoldenUpgradesInStore(
        Game.UpgradesInStore,
        Game.cookies,
        getUnbuffedCps(),
        phaseProgress
      )
    : [];

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

  // Ascension stats display
  const ascensionStats = getAscensionStats({
    prestige: Game.prestige,
    cookiesReset: Game.cookiesReset,
    cookiesEarned: Game.cookiesEarned,
    heavenlyChips: Game.heavenlyChips,
    HowMuchPrestige: Game.HowMuchPrestige.bind(Game),
    Upgrades: Game.Upgrades,
  });
  updateAscensionDisplay(ascensionStats);

  // Dragon aura automation
  const dragonGameContext = {
    dragonLevel: Game.dragonLevel,
    dragonAura: Game.dragonAura,
    dragonAura2: Game.dragonAura2,
    SetDragonAura: Game.SetDragonAura.bind(Game),
    ConfirmPrompt: Game.ConfirmPrompt?.bind(Game) ?? (() => {}),
    buffs: Game.buffs,
    Objects: Game.Objects,
    Has: Game.Has.bind(Game),
    hasAura: Game.hasAura.bind(Game),
  };

  // Check if dragon egg is purchased before any dragon automation
  const hasDragonEgg = Game.Has('A crumbly egg');

  // Auto-train dragon (runs at all levels, including 0-4 before auras unlock)
  if (state.autoDragon && hasDragonEgg) {
    const maxLevel = Game.dragonLevels.length - 1;
    const currentLevel = Game.dragonLevels[Game.dragonLevel];
    if (Game.dragonLevel < maxLevel && currentLevel?.cost()) {
      // Open dragon menu before training - UpgradeDragon() expects it open
      ensureDragonMenuOpen();
      const fromLevel = Game.dragonLevel;
      Game.UpgradeDragon();
      logAction('DRAGON_TRAIN', {
        fromLevel,
        toLevel: Game.dragonLevel,
        name: Game.dragonLevels[Game.dragonLevel]?.name ?? 'Max',
      });
    }
  }

  const dragonState = hasDragonEgg ? getDragonState(dragonGameContext) : null;
  let recommendedDragonConfig = null;

  if (dragonState) {
    const isFrenzyActive = hasActiveFrenzy(dragonGameContext);
    const kittenCount = countKittenUpgrades(Game.Has.bind(Game));
    const totalBuildings = getTotalBuildingCount(dragonGameContext);

    recommendedDragonConfig = getRecommendedAuras({
      phaseProgress,
      kittenCount,
      totalBuildings,
      hasActiveFrenzy: isFrenzyActive,
    });

    // Auto-switch auras if enabled
    if (state.autoDragon) {
      const currentConfig = {
        aura1: dragonState.currentAura1,
        aura2: dragonState.currentAura2,
      };
      const highestTierCount = getHighestTierBuildingCount(dragonGameContext);

      const switchDecision = shouldSwitchAuras(
        currentConfig,
        recommendedDragonConfig,
        state.lastDragonSwitch,
        isFrenzyActive,
        highestTierCount,
        (auraName) => isAuraUnlocked(auraName as DragonAura, Game.dragonLevel)
      );

      if (switchDecision.shouldSwitch) {
        switchAuras(dragonGameContext, recommendedDragonConfig);
        state.lastDragonSwitch = Date.now();
        logAction('DRAGON_SWITCH', {
          from: `${currentConfig.aura1} + ${currentConfig.aura2}`,
          to: `${recommendedDragonConfig.aura1} + ${recommendedDragonConfig.aura2}`,
          reason: switchDecision.reason,
        });
      }
    }
  }

  updateDragonDisplay(dragonState, recommendedDragonConfig);
  updateDisplay(best, bestAffordable, goldenUpgrades, luckyBankScaled, Game.cookies);

  // Auto-purchase logic
  if (state.autoPurchase) {
    const affordablePrioritizedGolden = goldenUpgrades.find((u) => {
      if (!u.prioritized) return false;
      const itemLuckyBank = getLuckyBank(u.price, unbuffedCps);
      return canAffordWithLuckyBank(Game.cookies, u.price, itemLuckyBank);
    });
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
      // Batch purchase: buy multiple items per tick while affordable
      const MAX_BATCH = 10;
      for (let i = 0; i < MAX_BATCH; i++) {
        // Find best affordable item from current candidates using per-item lucky bank
        const affordable = validCandidates.find((c) => {
          if (state.autoGolden) {
            const itemLuckyBank = getLuckyBank(c.price, unbuffedCps);
            return canAffordWithLuckyBank(Game.cookies, c.price, itemLuckyBank);
          }
          return Game.cookies >= c.price;
        });
        if (!affordable) break;

        const cookiesBefore = Game.cookies;
        const purchased = executePurchaseItem(affordable, Game.Objects, Game.Upgrades);
        if (!purchased) break;

        logAction('PURCHASE', {
          item: affordable.name,
          type: affordable.type,
          price: affordable.price,
          pp: affordable.pp,
          cookies_before: cookiesBefore,
          batch_index: i,
        });
      }
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
  } else if (key === 'autoDragon') {
    state.autoDragon = !state.autoDragon;
    updateDragonButton(state.autoDragon);
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

    // Always check for shimmers: golden cookies, wrath cookies, reindeer (runs every 200ms)
    const shimmerClicked = clickShimmers(
      Game.shimmers,
      state.autoGolden,
      state.autoWrath,
      () => Game.cookies
    );

    // Recalc immediately if shimmer clicked (golden cookie burst), purchase detected, or time elapsed
    if (shimmerClicked || checkForPurchase(state) || timeSinceLastCheck >= REFRESH_INTERVAL) {
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
