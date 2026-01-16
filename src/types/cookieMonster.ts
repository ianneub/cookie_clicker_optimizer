/**
 * Cookie Monster addon API type definitions
 */

export interface CMBuildingData {
  pp: number;
}

export interface CMUpgradeData {
  pp: number;
}

export interface CMCache {
  Lucky: number;
}

export interface CookieMonsterData {
  Objects1: Record<string, CMBuildingData>;
  Objects10: Record<string, CMBuildingData>;
  Objects100: Record<string, CMBuildingData>;
  Upgrades: Record<string, CMUpgradeData>;
  Cache: CMCache;
}

declare global {
  var CookieMonsterData: CookieMonsterData;
}
