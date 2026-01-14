/**
 * Tests for calculateEfficiency and filterAndSortByEfficiency functions
 */

const optimizer = require('../optimizer');
const { calculateEfficiency, filterAndSortByEfficiency, EFFICIENCY_WEIGHT } = optimizer;

describe('calculateEfficiency', () => {
  it('should return Infinity when deltaCps is 0', () => {
    expect(calculateEfficiency(1000, 0, 100)).toBe(Infinity);
  });

  it('should return Infinity when deltaCps is negative', () => {
    expect(calculateEfficiency(1000, -10, 100)).toBe(Infinity);
  });

  it('should return Infinity when currentCps is 0', () => {
    expect(calculateEfficiency(1000, 10, 0)).toBe(Infinity);
  });

  it('should return Infinity when currentCps is negative', () => {
    expect(calculateEfficiency(1000, 10, -100)).toBe(Infinity);
  });

  it('should calculate correct efficiency with valid inputs', () => {
    // price=1000, deltaCps=10, currentCps=100
    // Formula: 1.15 * (1000/100) + (1000/10) = 1.15 * 10 + 100 = 11.5 + 100 = 111.5
    const result = calculateEfficiency(1000, 10, 100);
    expect(result).toBeCloseTo(111.5);
  });

  it('should use EFFICIENCY_WEIGHT constant (1.15)', () => {
    expect(EFFICIENCY_WEIGHT).toBe(1.15);
  });

  it('should prefer items with higher deltaCps (lower efficiency value)', () => {
    const eff1 = calculateEfficiency(1000, 10, 100);  // Lower deltaCps
    const eff2 = calculateEfficiency(1000, 20, 100);  // Higher deltaCps
    expect(eff2).toBeLessThan(eff1); // Lower efficiency value is better
  });

  it('should prefer cheaper items (lower efficiency value)', () => {
    const eff1 = calculateEfficiency(2000, 10, 100); // More expensive
    const eff2 = calculateEfficiency(1000, 10, 100); // Cheaper
    expect(eff2).toBeLessThan(eff1); // Lower efficiency value is better
  });

  it('should work with very large numbers', () => {
    const result = calculateEfficiency(1e15, 1e12, 1e10);
    expect(isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
  });

  it('should work with very small numbers', () => {
    const result = calculateEfficiency(0.001, 0.0001, 0.01);
    expect(isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
  });
});

describe('filterAndSortByEfficiency', () => {
  it('should filter out candidates with undefined efficiency', () => {
    const candidates = [
      { name: 'Valid', efficiency: 100, price: 1000 },
      { name: 'Undefined', efficiency: undefined, price: 500 }
    ];

    const result = filterAndSortByEfficiency(candidates);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid');
  });

  it('should filter out candidates with NaN efficiency', () => {
    const candidates = [
      { name: 'Valid', efficiency: 100, price: 1000 },
      { name: 'NaN', efficiency: NaN, price: 500 }
    ];

    const result = filterAndSortByEfficiency(candidates);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid');
  });

  it('should filter out candidates with Infinity efficiency', () => {
    const candidates = [
      { name: 'Valid', efficiency: 100, price: 1000 },
      { name: 'Infinity', efficiency: Infinity, price: 500 }
    ];

    const result = filterAndSortByEfficiency(candidates);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid');
  });

  it('should filter out candidates with zero efficiency', () => {
    const candidates = [
      { name: 'Valid', efficiency: 100, price: 1000 },
      { name: 'Zero', efficiency: 0, price: 500 }
    ];

    const result = filterAndSortByEfficiency(candidates);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid');
  });

  it('should filter out candidates with negative efficiency', () => {
    const candidates = [
      { name: 'Valid', efficiency: 100, price: 1000 },
      { name: 'Negative', efficiency: -100, price: 500 }
    ];

    const result = filterAndSortByEfficiency(candidates);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid');
  });

  it('should sort by efficiency ascending (lower is better)', () => {
    const candidates = [
      { name: 'High', efficiency: 500, price: 1000 },
      { name: 'Low', efficiency: 50, price: 2000 },
      { name: 'Medium', efficiency: 200, price: 1500 }
    ];

    const result = filterAndSortByEfficiency(candidates);

    expect(result[0].name).toBe('Low');
    expect(result[1].name).toBe('Medium');
    expect(result[2].name).toBe('High');
  });

  it('should return empty array when no valid candidates', () => {
    const candidates = [
      { name: 'Invalid', efficiency: undefined },
      { name: 'Also Invalid', efficiency: NaN }
    ];

    const result = filterAndSortByEfficiency(candidates);

    expect(result).toHaveLength(0);
  });

  it('should handle empty input', () => {
    expect(filterAndSortByEfficiency([])).toEqual([]);
  });

  it('should preserve all candidate properties', () => {
    const candidates = [
      { name: 'Test', efficiency: 100, price: 1000, type: 'Building', deltaCps: 10, affordable: true }
    ];

    const result = filterAndSortByEfficiency(candidates);

    expect(result[0]).toEqual({
      name: 'Test',
      efficiency: 100,
      price: 1000,
      type: 'Building',
      deltaCps: 10,
      affordable: true
    });
  });
});
