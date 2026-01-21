/**
 * Constants for the Cookie Clicker Optimizer
 */

export const CM_URL = 'https://cookiemonsterteam.github.io/CookieMonster/dist/CookieMonster.js';
export const MAX_WAIT_TIME = 30000; // 30 seconds max wait for CM to load
export const POLL_INTERVAL = 500; // Check every 500ms
export const REFRESH_INTERVAL = 2000; // Auto-refresh every 2 seconds

// Phase thresholds for game progression (based on CpS)
export const PHASE_THRESHOLDS = {
  EARLY_TO_MID: 1_000_000, // 1M CpS
  MID_TO_LATE: 100_000_000, // 100M CpS
  LATE_TO_ENDGAME: 1_000_000_000, // 1B CpS
} as const;

// Average time for a wrinkler to respawn (seconds)
export const WRINKLER_RESPAWN_TIME = 110;

// Golden Cookie upgrades - benefits are random/probabilistic, no PP values
export const GOLDEN_COOKIE_UPGRADES = new Set([
  'Lucky day',
  'Serendipity',
  'Get lucky',
  'Golden goose egg',
  'Dragon fang',
  'Heavenly luck',
  'Lasting fortune',
  'Decisive fate',
  'Lucky digit',
  'Lucky number',
  'Lucky payout',
  'Green yeast digestives',
]);

// Toggle/repeatable upgrades - excluded from optimization
export const TOGGLE_UPGRADES = new Set([
  'Elder Pledge',
  'Elder Covenant',
  'Revoke Elder Covenant',
  'Golden switch [off]',
]);

// Grandmapocalypse Stage 2+ upgrades - excluded to keep Golden Cookies accessible
// "One mind" (Stage 1) is allowed as it provides wrinklers with only 33% wrath cookies
export const GRANDMAPOCALYPSE_STAGE2_UPGRADES = new Set([
  'Communal brainsweep',
  'Arcane sugar',
  'Elder Pact',
]);
