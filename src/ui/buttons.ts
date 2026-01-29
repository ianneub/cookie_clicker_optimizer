/**
 * Toggle button handlers
 */

import { updateToggleButton } from './panel';

/**
 * Update the auto-purchase button display
 */
export function updateAutoButton(isActive: boolean): void {
  updateToggleButton(document.getElementById('cc-opt-auto'), isActive);
}

/**
 * Update the golden cookie button display and show/hide wrath button
 */
export function updateGoldenButton(isActive: boolean): void {
  updateToggleButton(document.getElementById('cc-opt-golden'), isActive);

  // Show/hide wrath button based on golden state
  const wrathBtn = document.getElementById('cc-opt-wrath');
  if (wrathBtn) {
    wrathBtn.style.display = isActive ? 'flex' : 'none';
  }
}

/**
 * Update the wrath cookie button display
 */
export function updateWrathButton(isActive: boolean): void {
  updateToggleButton(document.getElementById('cc-opt-wrath'), isActive);
}

/**
 * Update the wrinkler button display
 */
export function updateWrinklerButton(isActive: boolean): void {
  updateToggleButton(document.getElementById('cc-opt-wrinkler'), isActive);
}

/**
 * Update the dragon button display
 */
export function updateDragonButton(isActive: boolean): void {
  updateToggleButton(document.getElementById('cc-opt-dragon-btn'), isActive);
}
