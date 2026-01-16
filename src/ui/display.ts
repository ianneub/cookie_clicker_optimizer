/**
 * Display update functions
 */

import { formatNumber } from '../core/formatting';
import { canAffordWithLuckyBank } from '../core/luckyBank';
import type { Candidate, GoldenUpgrade, LuckyBankInfo, WrinklerStats } from '../types';

/**
 * Update the Lucky bank display in the UI
 */
export function updateLuckyBankDisplay(
  luckyBankInfo: LuckyBankInfo | 0,
  currentCookies: number,
  autoGolden: boolean
): void {
  const bankEl = document.getElementById('cc-opt-lucky-bank');
  if (!bankEl) return;

  // Handle hide case
  if (luckyBankInfo === 0 || !autoGolden) {
    bankEl.style.display = 'none';
    return;
  }

  bankEl.style.display = 'flex';
  const { scaled, base, phaseName } = luckyBankInfo;
  const scalePercent = base > 0 ? Math.round((scaled / base) * 100) : 0;

  const contentEl = bankEl.querySelector('.cc-opt-bank-content');
  if (!contentEl) return;

  const phaseText = `${phaseName} ${scalePercent}%`;
  let thresholdText = '';
  let diffText = '';
  let isBelow = false;

  if (scaled === 0) {
    thresholdText = '0 (disabled)';
    diffText = '';
  } else {
    thresholdText = formatNumber(scaled);
    if (currentCookies < scaled) {
      diffText = `Need ${formatNumber(scaled - currentCookies)}`;
      isBelow = true;
    } else {
      diffText = `+${formatNumber(currentCookies - scaled)}`;
    }
  }

  contentEl.innerHTML = `
    <div class="cc-opt-bank-header">
      <span class="cc-opt-bank-label">Lucky Bank</span>
      <span class="cc-opt-bank-phase">${phaseText}</span>
    </div>
    <div class="cc-opt-bank-values">
      <span class="cc-opt-bank-threshold">${thresholdText}</span>
      <span class="cc-opt-bank-diff${isBelow ? ' below-threshold' : ''}">${diffText}</span>
    </div>
  `;
}

/**
 * Update the wrinkler display section
 */
export function updateWrinklerDisplay(
  stats: WrinklerStats | null,
  actionText: string | null = null
): void {
  const sectionEl = document.getElementById('cc-opt-wrinklers');
  const countEl = document.getElementById('cc-opt-wrinkler-count');
  const rewardEl = document.getElementById('cc-opt-wrinkler-reward');
  const actionEl = document.getElementById('cc-opt-wrinkler-action');
  const wrinklerBtn = document.getElementById('cc-opt-wrinkler');

  if (!sectionEl) return;

  // Hide section and button if no wrinklers active
  if (!stats || stats.count === 0) {
    sectionEl.style.display = 'none';
    if (wrinklerBtn) wrinklerBtn.style.display = 'none';
    return;
  }

  // Show section and button
  sectionEl.style.display = 'flex';
  if (wrinklerBtn) wrinklerBtn.style.display = 'flex';

  // Update count (with shiny indicator)
  let countText = `${stats.count}/${stats.max}`;
  if (stats.shinyCount > 0) {
    countText += ` <span class="cc-opt-shiny">(${stats.shinyCount} shiny)</span>`;
  }
  if (countEl) countEl.innerHTML = countText;

  // Update reward
  if (rewardEl) rewardEl.textContent = formatNumber(stats.popReward);

  // Update action text
  if (actionEl) {
    if (actionText) {
      actionEl.style.display = 'block';
      actionEl.textContent = actionText;
    } else {
      actionEl.style.display = 'none';
    }
  }
}

/**
 * Update the display with current best purchase
 */
export function updateDisplay(
  best: Candidate | null,
  bestAffordable: Candidate | null | undefined,
  goldenUpgrades: GoldenUpgrade[] = [],
  luckyBankScaled: number = 0,
  currentCookies: number
): void {
  const content = document.getElementById('cc-opt-content');
  if (!content) return;

  // Handle case where no valid best item and no golden upgrades
  if ((!best || typeof best.pp !== 'number') && goldenUpgrades.length === 0) {
    content.innerHTML = '<div class="cc-opt-item">Calculating...</div>';
    return;
  }

  let html = '';

  // Golden Cookie upgrades section
  const prioritizedGolden = goldenUpgrades.filter((u) => u.prioritized);
  const deferredGolden = goldenUpgrades.filter((u) => !u.prioritized);

  const firstGolden = prioritizedGolden[0];
  if (firstGolden) {
    const isAffordable = canAffordWithLuckyBank(currentCookies, firstGolden.price, luckyBankScaled);
    html += `<div class="cc-opt-item cc-opt-golden-section">`;
    html += `<div class="cc-opt-label cc-opt-golden-label">Golden Priority</div>`;
    html += `<div class="cc-opt-name cc-opt-golden-name">${firstGolden.name}</div>`;
    html += `<div class="cc-opt-stats">`;
    html += formatNumber(firstGolden.price);
    if (isAffordable) {
      html += ` <span class="cc-opt-affordable">[BUY]</span>`;
    } else {
      const needed = firstGolden.price + luckyBankScaled - currentCookies;
      html += ` <span class="cc-opt-saving">(need ${formatNumber(needed)})</span>`;
    }
    html += `</div></div>`;
  }

  // Show deferred golden upgrades (dimmed)
  const firstDeferred = deferredGolden[0];
  if (firstDeferred) {
    html += `<div class="cc-opt-item cc-opt-golden-section cc-opt-golden-deferred">`;
    html += `<div class="cc-opt-label cc-opt-golden-label">Golden (Deferred)</div>`;
    html += `<div class="cc-opt-name cc-opt-golden-name">${firstDeferred.name}</div>`;
    html += `<div class="cc-opt-stats">`;
    html += `${formatNumber(firstDeferred.price)} <span class="cc-opt-saving">(${firstDeferred.deferReason})</span>`;
    html += `</div></div>`;
  }

  // Best overall
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
      const needed = best.price - currentCookies;
      if (needed > 0) {
        html += `<div class="cc-opt-item">`;
        html += `<div class="cc-opt-saving">Need ${formatNumber(needed)} more</div>`;
        html += `</div>`;
      }
    }
  }

  content.innerHTML = html;
}
