/**
 * Global state management for the optimizer
 */

import type { OptimizerState } from './types';

declare global {
  interface Window {
    CCOptimizer: OptimizerState;
  }
}

/**
 * Get or create the global optimizer state
 */
export function getState(): OptimizerState {
  if (typeof window === 'undefined') {
    // Node.js environment - return default state
    return createDefaultState();
  }

  window.CCOptimizer = window.CCOptimizer || createDefaultState();
  return window.CCOptimizer;
}

/**
 * Create the default state object
 */
export function createDefaultState(): OptimizerState {
  return {
    lastBuildingCount: 0,
    lastUpgradeCount: 0,
    refreshTimer: null,
    isRunning: false,
    displayElement: null,
    autoPurchase: false,
    autoGolden: false,
    autoWrath: false,
    autoWrinklers: false,
    autoDragon: false,
    lastDragonSwitch: 0,
    heavenlyUpgradeBreakdown: null,
    stop: () => {},
  };
}
