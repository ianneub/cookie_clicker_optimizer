/**
 * Game object wrappers for browser environment
 */

import type { Building, Upgrade } from '../types';

/**
 * Get total count of owned buildings
 */
export function getTotalBuildings(gameObjects: Record<string, Building>): number {
  let total = 0;
  for (const name in gameObjects) {
    if (Object.prototype.hasOwnProperty.call(gameObjects, name)) {
      const building = gameObjects[name];
      if (building) {
        total += building.amount;
      }
    }
  }
  return total;
}

// Upgrades that show a confirmation prompt after purchase
const PROMPT_UPGRADES = new Set(['One mind']);

/**
 * Click the first option button in the prompt (typically "Yes")
 * Cookie Clicker prompts use #promptOption0 for the first button
 */
function clickPromptYes(): void {
  const yesButton = document.getElementById('promptOption0') as HTMLElement | null;
  if (yesButton) {
    yesButton.click();
  }
}

/**
 * Execute a purchase for the given item
 */
export function executePurchaseItem(
  item: { name: string; type: string } | null,
  gameObjects: Record<string, Building>,
  gameUpgrades: Record<string, Upgrade>
): boolean {
  if (!item) return false;

  if (item.type === 'Building') {
    // Parse quantity from name (e.g., "Cursor x10" → building="Cursor", qty=10)
    const match = item.name.match(/^(.+) x(\d+)$/);
    if (match) {
      const buildingName = match[1];
      const quantityStr = match[2];
      if (buildingName && quantityStr) {
        const quantity = parseInt(quantityStr, 10);
        const building = gameObjects[buildingName];
        if (building) {
          building.buy(quantity);
          return true;
        }
      }
    } else {
      // Single building purchase (no " xN" suffix)
      const building = gameObjects[item.name];
      if (building) {
        building.buy(1);
        return true;
      }
    }
  } else if (item.type === 'Upgrade') {
    const upgrade = gameUpgrades[item.name];
    if (upgrade) {
      upgrade.buy();
      // Auto-confirm prompt for certain upgrades (e.g., One mind)
      if (PROMPT_UPGRADES.has(item.name)) {
        // Use setTimeout to allow the prompt to render before clicking
        setTimeout(clickPromptYes, 50);
      }
      return true;
    }
  }

  return false;
}

/**
 * Check if Cookie Monster data is ready
 */
export function isCMDataReady(
  cmData: { Objects1?: Record<string, { pp?: number }> } | undefined
): boolean {
  if (!cmData) return false;

  // CM uses Objects1/Objects10/Objects100 for buy 1/10/100
  if (!cmData.Objects1 || Object.keys(cmData.Objects1).length === 0) {
    return false;
  }

  // Check first building has valid PP (CM populates all buildings at once)
  const firstBuilding = Object.values(cmData.Objects1)[0];
  if (!firstBuilding) return false;
  return Number.isFinite(firstBuilding.pp);
}
