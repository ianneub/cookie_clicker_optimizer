/**
 * Tests for formatting functions
 */

import { describe, it, expect, spyOn } from 'bun:test';
import { formatNumber, logAction } from '../core/formatting';

describe('formatNumber', () => {
  describe('small numbers (< 1000)', () => {
    it('should format 0 as "0"', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should format 100 as "100"', () => {
      expect(formatNumber(100)).toBe('100');
    });

    it('should format 999 as "999"', () => {
      expect(formatNumber(999)).toBe('999');
    });

    it('should round decimals', () => {
      expect(formatNumber(123.456)).toBe('123');
    });
  });

  describe('thousands (1e3 - 1e6)', () => {
    it('should format 1000 as "1.00 thousand"', () => {
      expect(formatNumber(1000)).toBe('1.00 thousand');
    });

    it('should format 1500 as "1.50 thousand"', () => {
      expect(formatNumber(1500)).toBe('1.50 thousand');
    });
  });

  describe('millions (1e6 - 1e9)', () => {
    it('should format 1000000 as "1.00 million"', () => {
      expect(formatNumber(1000000)).toBe('1.00 million');
    });
  });

  describe('billions (1e9 - 1e12)', () => {
    it('should format 1e9 as "1.00 billion"', () => {
      expect(formatNumber(1e9)).toBe('1.00 billion');
    });
  });

  describe('trillions (1e12 - 1e15)', () => {
    it('should format 1e12 as "1.00 trillion"', () => {
      expect(formatNumber(1e12)).toBe('1.00 trillion');
    });
  });

  describe('quadrillions (1e15 - 1e18)', () => {
    it('should format 1e15 as "1.00 quadrillion"', () => {
      expect(formatNumber(1e15)).toBe('1.00 quadrillion');
    });
  });

  describe('quintillions (1e18 - 1e21)', () => {
    it('should format 1e18 as "1.00 quintillion"', () => {
      expect(formatNumber(1e18)).toBe('1.00 quintillion');
    });
  });

  describe('sextillions (1e21 - 1e24)', () => {
    it('should format 1e21 as "1.00 sextillion"', () => {
      expect(formatNumber(1e21)).toBe('1.00 sextillion');
    });
  });

  describe('septillions (1e24 - 1e27)', () => {
    it('should format 1e24 as "1.00 septillion"', () => {
      expect(formatNumber(1e24)).toBe('1.00 septillion');
    });
  });

  describe('octillions (1e27 - 1e30)', () => {
    it('should format 1e27 as "1.00 octillion"', () => {
      expect(formatNumber(1e27)).toBe('1.00 octillion');
    });
  });

  describe('nonillions (>= 1e30)', () => {
    it('should format 1e30 as "1.00 nonillion"', () => {
      expect(formatNumber(1e30)).toBe('1.00 nonillion');
    });
  });
});

describe('logAction', () => {
  it('should log with timestamp and action', () => {
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

    logAction('TEST', { value: 123 });

    expect(consoleSpy).toHaveBeenCalled();
    const loggedString = consoleSpy.mock.calls[0]?.[1] as string;
    const parsed = JSON.parse(loggedString);

    expect(parsed.action).toBe('TEST');
    expect(parsed.value).toBe(123);
    expect(parsed.timestamp).toBeDefined();

    consoleSpy.mockRestore();
  });
});
