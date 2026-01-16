/**
 * Tests for candidate functions
 */

import { describe, it, expect } from 'vitest';
import { filterAndSortCandidates, isGoldenCookieUpgrade, isGrandmapocalypseUpgrade, isToggleUpgrade } from '../core/candidates';
import type { Candidate } from '../types';

describe('filterAndSortCandidates', () => {
  it('should filter out candidates with undefined PP', () => {
    const candidates = [
      { name: 'Valid', pp: 100, price: 1000, type: 'Building', affordable: true },
      { name: 'Undefined PP', pp: undefined as unknown as number, price: 500, type: 'Building', affordable: true },
    ] as Candidate[];

    const result = filterAndSortCandidates(candidates);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Valid');
  });

  it('should filter out candidates with NaN PP', () => {
    const candidates = [
      { name: 'Valid', pp: 100, price: 1000, type: 'Building', affordable: true },
      { name: 'NaN PP', pp: NaN, price: 500, type: 'Building', affordable: true },
    ] as Candidate[];

    const result = filterAndSortCandidates(candidates);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Valid');
  });

  it('should filter out candidates with Infinity PP', () => {
    const candidates = [
      { name: 'Valid', pp: 100, price: 1000, type: 'Building', affordable: true },
      { name: 'Infinity PP', pp: Infinity, price: 500, type: 'Building', affordable: true },
    ] as Candidate[];

    const result = filterAndSortCandidates(candidates);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Valid');
  });

  it('should filter out candidates with zero PP', () => {
    const candidates = [
      { name: 'Valid', pp: 100, price: 1000, type: 'Building', affordable: true },
      { name: 'Zero PP', pp: 0, price: 500, type: 'Building', affordable: true },
    ] as Candidate[];

    const result = filterAndSortCandidates(candidates);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Valid');
  });

  it('should sort by PP ascending (lower is better)', () => {
    const candidates = [
      { name: 'High PP', pp: 500, price: 1000, type: 'Building', affordable: true },
      { name: 'Low PP', pp: 50, price: 2000, type: 'Building', affordable: true },
      { name: 'Medium PP', pp: 200, price: 1500, type: 'Building', affordable: true },
    ] as Candidate[];

    const result = filterAndSortCandidates(candidates);

    expect(result[0]?.name).toBe('Low PP');
    expect(result[1]?.name).toBe('Medium PP');
    expect(result[2]?.name).toBe('High PP');
  });

  it('should return empty array when no valid candidates', () => {
    const candidates = [
      { name: 'Invalid', pp: undefined as unknown as number, price: 100, type: 'Building', affordable: true },
    ] as Candidate[];

    const result = filterAndSortCandidates(candidates);

    expect(result).toHaveLength(0);
  });

  it('should handle empty input', () => {
    expect(filterAndSortCandidates([])).toEqual([]);
  });
});

describe('isGoldenCookieUpgrade', () => {
  it('should return true for known golden upgrades', () => {
    expect(isGoldenCookieUpgrade('Lucky day')).toBe(true);
    expect(isGoldenCookieUpgrade('Serendipity')).toBe(true);
    expect(isGoldenCookieUpgrade('Get lucky')).toBe(true);
  });

  it('should return false for non-golden upgrades', () => {
    expect(isGoldenCookieUpgrade('Reinforced index finger')).toBe(false);
    expect(isGoldenCookieUpgrade('Random upgrade')).toBe(false);
  });
});

describe('isToggleUpgrade', () => {
  it('should return true for toggle upgrades', () => {
    expect(isToggleUpgrade('Elder Pledge')).toBe(true);
    expect(isToggleUpgrade('Elder Covenant')).toBe(true);
    expect(isToggleUpgrade('Revoke Elder Covenant')).toBe(true);
  });

  it('should return false for non-toggle upgrades', () => {
    expect(isToggleUpgrade('Lucky day')).toBe(false);
    expect(isToggleUpgrade('Cursor')).toBe(false);
  });
});

describe('isGrandmapocalypseUpgrade', () => {
  it('should return true for grandmapocalypse research upgrades', () => {
    expect(isGrandmapocalypseUpgrade('One mind')).toBe(true);
    expect(isGrandmapocalypseUpgrade('Communal brainsweep')).toBe(true);
    expect(isGrandmapocalypseUpgrade('Arcane sugar')).toBe(true);
    expect(isGrandmapocalypseUpgrade('Elder Pact')).toBe(true);
  });

  it('should return false for other upgrades', () => {
    expect(isGrandmapocalypseUpgrade('Lucky day')).toBe(false);
    expect(isGrandmapocalypseUpgrade('Elder Pledge')).toBe(false);
    expect(isGrandmapocalypseUpgrade('Cursor')).toBe(false);
  });
});
