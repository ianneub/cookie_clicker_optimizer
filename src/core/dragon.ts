/**
 * Dragon aura recommendation and switching logic
 */

import type { DragonAura, DragonConfig, SwitchDecision } from '../types';

/** Aura index to name mapping (from Game.dragonAuras) */
export const DRAGON_AURAS: Record<number, DragonAura> = {
  0: 'No aura',
  1: 'Breath of Milk',
  2: 'Dragon Cursor',
  3: 'Elder Battalion',
  4: 'Reaper of Fields',
  5: 'Earth Shatterer',
  6: 'Master of the Armory',
  7: 'Fierce Hoarder',
  8: 'Dragon God',
  9: 'Arcane Aura',
  10: 'Dragonflight',
  11: 'Ancestral Metamorphosis',
  12: 'Unholy Dominion',
  13: 'Epoch Manipulator',
  14: 'Mind Over Matter',
  15: 'Radiant Appetite',
  16: "Dragon's Fortune",
  17: "Dragon's Curve",
  18: 'Reality Bending',
  19: 'Dragon Orbs',
  20: 'Supreme Intellect',
  21: 'Dragon Guts',
};

/** Aura name to index mapping */
export const AURA_INDICES: Record<DragonAura, number> = {
  'No aura': 0,
  'Breath of Milk': 1,
  'Dragon Cursor': 2,
  'Elder Battalion': 3,
  'Reaper of Fields': 4,
  'Earth Shatterer': 5,
  'Master of the Armory': 6,
  'Fierce Hoarder': 7,
  'Dragon God': 8,
  'Arcane Aura': 9,
  Dragonflight: 10,
  'Ancestral Metamorphosis': 11,
  'Unholy Dominion': 12,
  'Epoch Manipulator': 13,
  'Mind Over Matter': 14,
  'Radiant Appetite': 15,
  "Dragon's Fortune": 16,
  "Dragon's Curve": 17,
  'Reality Bending': 18,
  'Dragon Orbs': 19,
  'Supreme Intellect': 20,
  'Dragon Guts': 21,
};

/** Minimum dragon level to access auras */
export const DRAGON_LEVEL_AURAS = 5;

/** Dragon level required for dual auras */
export const DRAGON_LEVEL_DUAL = 21;

/** Cooldown between non-Frenzy aura switches (ms) */
export const AURA_SWITCH_COOLDOWN = 60000;

/** Minimum building count to allow switching (protects against draining buildings) */
export const MIN_BUILDING_COUNT_FOR_SWITCH = 2;

/** Kitten upgrades to count for Breath of Milk scaling */
const KITTEN_UPGRADES = [
  'Kitten helpers',
  'Kitten workers',
  'Kitten engineers',
  'Kitten overseers',
  'Kitten managers',
  'Kitten accountants',
  'Kitten specialists',
  'Kitten experts',
  'Kitten consultants',
  'Kitten assistants to the regional manager',
  'Kitten marketeers',
  'Kitten analysts',
  'Kitten executives',
  'Kitten admins',
  'Kitten angels',
  'Kitten wages',
  'Pet the dragon',
  'Dragon scale',
  'Dragon claw',
  'Dragon fang',
  'Dragon teddy bear',
];

export interface AuraRecommendationConfig {
  phaseProgress: number;
  kittenCount: number;
  totalBuildings: number;
  hasActiveFrenzy: boolean;
}

/**
 * Get recommended aura configuration based on game state
 */
export function getRecommendedAuras(config: AuraRecommendationConfig): DragonConfig {
  const { phaseProgress, kittenCount, totalBuildings, hasActiveFrenzy } = config;

  // During Frenzy: Dragon's Fortune + Epoch Manipulator
  if (hasActiveFrenzy) {
    return { aura1: "Dragon's Fortune", aura2: 'Epoch Manipulator' };
  }

  // Endgame (15k+ buildings): Elder Battalion + Breath of Milk
  if (totalBuildings >= 15000) {
    return { aura1: 'Elder Battalion', aura2: 'Breath of Milk' };
  }

  // Late game (>0.66 progress, 10+ kittens): Breath of Milk + Radiant Appetite
  if (phaseProgress >= 0.66 && kittenCount >= 10) {
    return { aura1: 'Breath of Milk', aura2: 'Radiant Appetite' };
  }

  // Early/Mid game: Elder Battalion + Radiant Appetite
  return { aura1: 'Elder Battalion', aura2: 'Radiant Appetite' };
}

/**
 * Determine if auras should be switched
 */
export function shouldSwitchAuras(
  current: DragonConfig,
  recommended: DragonConfig,
  lastSwitchTime: number,
  hasActiveFrenzy: boolean,
  highestTierBuildingCount: number
): SwitchDecision {
  // Already optimal
  if (current.aura1 === recommended.aura1 && current.aura2 === recommended.aura2) {
    return { shouldSwitch: false, reason: 'Already optimal' };
  }

  // Building safeguard
  if (highestTierBuildingCount < MIN_BUILDING_COUNT_FOR_SWITCH) {
    return { shouldSwitch: false, reason: `Need ${MIN_BUILDING_COUNT_FOR_SWITCH}+ top buildings` };
  }

  // Frenzy bypasses cooldown (time-sensitive)
  if (hasActiveFrenzy) {
    return { shouldSwitch: true, reason: 'Frenzy active' };
  }

  // Non-Frenzy: respect cooldown
  const now = Date.now();
  if (now - lastSwitchTime < AURA_SWITCH_COOLDOWN) {
    const remaining = Math.ceil((AURA_SWITCH_COOLDOWN - (now - lastSwitchTime)) / 1000);
    return { shouldSwitch: false, reason: `Cooldown: ${remaining}s` };
  }

  return { shouldSwitch: true, reason: 'Phase transition' };
}

/**
 * Count owned kitten upgrades (for Breath of Milk scaling)
 */
export function countKittenUpgrades(has: (name: string) => boolean): number {
  return KITTEN_UPGRADES.filter(has).length;
}

/**
 * Get aura name from index
 */
export function getAuraName(index: number): DragonAura {
  return DRAGON_AURAS[index] ?? 'No aura';
}

/**
 * Get aura index from name
 */
export function getAuraIndex(name: DragonAura): number {
  return AURA_INDICES[name] ?? 0;
}
