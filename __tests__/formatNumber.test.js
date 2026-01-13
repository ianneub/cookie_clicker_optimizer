/**
 * Tests for formatNumber function
 */

const optimizer = require('../optimizer');
const { formatNumber } = optimizer;

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

    it('should format 12345 as "12.35 thousand"', () => {
      expect(formatNumber(12345)).toBe('12.35 thousand');
    });

    it('should format 999999 as "1000.00 thousand"', () => {
      expect(formatNumber(999999)).toBe('1000.00 thousand');
    });
  });

  describe('millions (1e6 - 1e9)', () => {
    it('should format 1000000 as "1.00 million"', () => {
      expect(formatNumber(1000000)).toBe('1.00 million');
    });

    it('should format 1500000 as "1.50 million"', () => {
      expect(formatNumber(1500000)).toBe('1.50 million');
    });

    it('should format 777777777 as "777.78 million"', () => {
      expect(formatNumber(777777777)).toBe('777.78 million');
    });
  });

  describe('billions (1e9 - 1e12)', () => {
    it('should format 1e9 as "1.00 billion"', () => {
      expect(formatNumber(1e9)).toBe('1.00 billion');
    });

    it('should format 5.5e9 as "5.50 billion"', () => {
      expect(formatNumber(5.5e9)).toBe('5.50 billion');
    });
  });

  describe('trillions (1e12 - 1e15)', () => {
    it('should format 1e12 as "1.00 trillion"', () => {
      expect(formatNumber(1e12)).toBe('1.00 trillion');
    });

    it('should format 7.89e12 as "7.89 trillion"', () => {
      expect(formatNumber(7.89e12)).toBe('7.89 trillion');
    });
  });

  describe('quadrillions (>= 1e15)', () => {
    it('should format 1e15 as "1.00 quadrillion"', () => {
      expect(formatNumber(1e15)).toBe('1.00 quadrillion');
    });

    it('should format 1e18 as "1000.00 quadrillion"', () => {
      expect(formatNumber(1e18)).toBe('1000.00 quadrillion');
    });
  });

  describe('boundary cases', () => {
    it('should handle exactly at boundaries', () => {
      expect(formatNumber(1e3)).toBe('1.00 thousand');
      expect(formatNumber(1e6)).toBe('1.00 million');
      expect(formatNumber(1e9)).toBe('1.00 billion');
      expect(formatNumber(1e12)).toBe('1.00 trillion');
      expect(formatNumber(1e15)).toBe('1.00 quadrillion');
    });
  });
});
