/**
 * Dragon browser functions
 */

import { getAuraName, getAuraIndex, DRAGON_LEVEL_AURAS, DRAGON_LEVEL_DUAL } from '../core/dragon';
import type { DragonState, DragonConfig, Building, Buff } from '../types';

export interface DragonGameContext {
  dragonLevel: number;
  dragonAura: number;
  dragonAura2: number;
  SetDragonAura: (aura: number, slot: number) => void;
  ConfirmPrompt: () => void;
  buffs: Record<string, Buff>;
  Objects: Record<string, Building>;
  Has: (name: string) => boolean;
  hasAura: (name: string) => boolean;
}

/**
 * Get current dragon state from Game
 * Returns null if dragon is not unlocked (level < 5)
 */
export function getDragonState(game: DragonGameContext | null): DragonState | null {
  if (!game || game.dragonLevel < DRAGON_LEVEL_AURAS) {
    return null;
  }

  return {
    level: game.dragonLevel,
    currentAura1: getAuraName(game.dragonAura),
    currentAura2: getAuraName(game.dragonAura2),
    hasDualAuras: game.dragonLevel >= DRAGON_LEVEL_DUAL,
  };
}

/**
 * Switch dragon auras
 * Returns true if switch was executed
 */
export function switchAuras(game: DragonGameContext, config: DragonConfig): boolean {
  if (game.dragonLevel < DRAGON_LEVEL_AURAS) {
    return false;
  }

  const aura1Index = getAuraIndex(config.aura1);
  const aura2Index = getAuraIndex(config.aura2);

  // Switch primary aura (SetDragonAura sets up the selection, ConfirmPrompt confirms it)
  game.SetDragonAura(aura1Index, 0);
  game.ConfirmPrompt();

  // Switch secondary aura if dual auras available
  if (game.dragonLevel >= DRAGON_LEVEL_DUAL) {
    game.SetDragonAura(aura2Index, 1);
    game.ConfirmPrompt();
  }

  return true;
}

/**
 * Check if Frenzy buff is active with sufficient time remaining
 * Frenzy must have >5 seconds remaining to be worth switching auras
 */
export function hasActiveFrenzy(game: DragonGameContext): boolean {
  if (!game.buffs) return false;

  const frenzy = game.buffs['frenzy'] || game.buffs['Frenzy'];
  if (!frenzy) return false;

  // Game stores time in frames (30fps), so 5 seconds = 150 frames
  // But some versions store in ms. Check both patterns.
  // If time > 1000, assume ms; otherwise assume frames
  const timeRemaining = frenzy.time;
  if (timeRemaining > 1000) {
    return timeRemaining > 5000; // ms
  }
  return timeRemaining > 150; // frames (5 seconds * 30fps)
}

/**
 * Get the count of the highest tier building owned
 * Used as safeguard to prevent draining buildings from aura switches
 */
export function getHighestTierBuildingCount(game: DragonGameContext): number {
  const buildingOrder = [
    'Cursor',
    'Grandma',
    'Farm',
    'Mine',
    'Factory',
    'Bank',
    'Temple',
    'Wizard tower',
    'Shipment',
    'Alchemy lab',
    'Portal',
    'Time machine',
    'Antimatter condenser',
    'Prism',
    'Chancemaker',
    'Fractal engine',
    'Javascript console',
    'Idleverse',
    'Cortex baker',
    'You',
  ];

  // Find highest tier with at least 1 building
  for (let i = buildingOrder.length - 1; i >= 0; i--) {
    const name = buildingOrder[i];
    if (!name) continue;
    const building = game.Objects[name];
    if (building && building.amount > 0) {
      return building.amount;
    }
  }

  return 0;
}

/**
 * Get total building count across all types
 */
export function getTotalBuildingCount(game: DragonGameContext): number {
  let total = 0;
  for (const key in game.Objects) {
    const building = game.Objects[key];
    if (building) {
      total += building.amount || 0;
    }
  }
  return total;
}
