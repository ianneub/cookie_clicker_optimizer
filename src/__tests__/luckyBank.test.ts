/**
 * Tests for Lucky bank functions
 */

import { describe, it, expect } from 'bun:test';
import { getLuckyBank, canAffordWithLuckyBank } from '../core/luckyBank';
import {
  LUCKY_BANK_CPS_CAP_MULTIPLIER,
  LUCKY_BANK_PRICE_MULTIPLIER,
  PHASE_THRESHOLDS,
} from '../core/constants';

const MID_GAME_CPS = PHASE_THRESHOLDS.EARLY_TO_MID; // 1M CpS
const EARLY_GAME_CPS = 1000; // 1K CpS

describe('getLuckyBank', () => {
  it('should return price times multiplier in mid+ game', () => {
    expect(getLuckyBank(1000, MID_GAME_CPS)).toBe(1000 * LUCKY_BANK_PRICE_MULTIPLIER);
    expect(getLuckyBank(1_000_000, MID_GAME_CPS)).toBe(1_000_000 * LUCKY_BANK_PRICE_MULTIPLIER);
  });

  it('should return 0 in early game (< 1M CpS)', () => {
    expect(getLuckyBank(1000, EARLY_GAME_CPS)).toBe(0);
    expect(getLuckyBank(1_000_000, 0)).toBe(0);
  });

  it('should return 0 for undefined price', () => {
    expect(getLuckyBank(undefined, MID_GAME_CPS)).toBe(0);
  });

  it('should return 0 for zero price', () => {
    expect(getLuckyBank(0, MID_GAME_CPS)).toBe(0);
  });

  it('should return 0 for negative price', () => {
    expect(getLuckyBank(-100, MID_GAME_CPS)).toBe(0);
  });

  it('should floor the result', () => {
    expect(getLuckyBank(333, MID_GAME_CPS)).toBe(Math.floor(333 * LUCKY_BANK_PRICE_MULTIPLIER));
  });

  it('should use 3x price when below 6000x CpS cap', () => {
    // Price: 1M, CpS: 1M → 3x price = 3M, 6000x CpS = 6B → use 3M
    const price = 1_000_000;
    const cps = MID_GAME_CPS;
    const expected = price * LUCKY_BANK_PRICE_MULTIPLIER;
    expect(getLuckyBank(price, cps)).toBe(expected);
  });

  it('should cap at 6000x CpS when 3x price exceeds it', () => {
    // Price: 10B, CpS: 1M → 3x price = 30B, 6000x CpS = 6B → use 6B
    const price = 10_000_000_000;
    const cps = MID_GAME_CPS;
    const expected = cps * LUCKY_BANK_CPS_CAP_MULTIPLIER;
    expect(getLuckyBank(price, cps)).toBe(expected);
  });
});

describe('canAffordWithLuckyBank', () => {
  it('should return true when purchase leaves cookies above bank', () => {
    expect(canAffordWithLuckyBank(1000, 500, 400)).toBe(true);
  });

  it('should return true when purchase leaves cookies exactly at bank', () => {
    expect(canAffordWithLuckyBank(1000, 500, 500)).toBe(true);
  });

  it('should return false when purchase would drop below bank', () => {
    expect(canAffordWithLuckyBank(1000, 600, 500)).toBe(false);
  });

  it('should work with 0 bank threshold', () => {
    expect(canAffordWithLuckyBank(100, 100, 0)).toBe(true);
    expect(canAffordWithLuckyBank(100, 150, 0)).toBe(false);
  });
});

describe('per-item affordability', () => {
  // Tests for the bug where all items used the same lucky bank based on best item price
  // Instead, each item should use its own price for lucky bank calculation

  it('cheap items should be affordable when expensive items are not', () => {
    const cookies = 100_000_000; // 100M cookies
    const cps = MID_GAME_CPS; // 1M CpS

    // Expensive item: 50M price → 150M lucky bank → need 200M total → NOT affordable
    const expensivePrice = 50_000_000;
    const expensiveLuckyBank = getLuckyBank(expensivePrice, cps);
    expect(expensiveLuckyBank).toBe(expensivePrice * LUCKY_BANK_PRICE_MULTIPLIER); // 150M
    expect(canAffordWithLuckyBank(cookies, expensivePrice, expensiveLuckyBank)).toBe(false);

    // Cheap item: 10M price → 30M lucky bank → need 40M total → AFFORDABLE with 100M
    const cheapPrice = 10_000_000;
    const cheapLuckyBank = getLuckyBank(cheapPrice, cps);
    expect(cheapLuckyBank).toBe(cheapPrice * LUCKY_BANK_PRICE_MULTIPLIER); // 30M
    expect(canAffordWithLuckyBank(cookies, cheapPrice, cheapLuckyBank)).toBe(true);
  });

  it('BUG: using shared lucky bank incorrectly marks cheap items unaffordable', () => {
    const cookies = 100_000_000; // 100M cookies
    const cps = MID_GAME_CPS;

    // This demonstrates the bug: using expensive item's lucky bank for cheap item
    const expensivePrice = 50_000_000;
    const sharedLuckyBank = getLuckyBank(expensivePrice, cps); // 150M (wrong for cheap item)

    const cheapPrice = 10_000_000;
    // With shared lucky bank, cheap item is wrongly marked unaffordable
    // 100M - 10M = 90M remaining, but 90M < 150M bank → false (WRONG!)
    expect(canAffordWithLuckyBank(cookies, cheapPrice, sharedLuckyBank)).toBe(false);

    // With per-item lucky bank, cheap item is correctly affordable
    const perItemLuckyBank = getLuckyBank(cheapPrice, cps); // 30M (correct)
    // 100M - 10M = 90M remaining, and 90M >= 30M bank → true (CORRECT!)
    expect(canAffordWithLuckyBank(cookies, cheapPrice, perItemLuckyBank)).toBe(true);
  });

  it('should handle late game scenario with high values', () => {
    // Late game scenario where best item is very expensive
    const cookies = 400_000_000_000; // 400B cookies
    const cps = 10_000_000_000; // 10B CpS

    // Best item - expensive: 200B price → 600B lucky bank → need 800B total
    // With 400B cookies, NOT affordable
    const bestPrice = 200_000_000_000;
    const bestLuckyBank = getLuckyBank(bestPrice, cps);
    expect(canAffordWithLuckyBank(cookies, bestPrice, bestLuckyBank)).toBe(false);

    // Cheaper item: 50B price → 150B lucky bank → need 200B total
    // With 400B cookies, AFFORDABLE
    const cheaperPrice = 50_000_000_000;
    const cheaperLuckyBank = getLuckyBank(cheaperPrice, cps);
    expect(canAffordWithLuckyBank(cookies, cheaperPrice, cheaperLuckyBank)).toBe(true);
  });
});
