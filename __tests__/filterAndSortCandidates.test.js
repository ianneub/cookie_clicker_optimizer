/**
 * Tests for filterAndSortCandidates function
 */

const optimizer = require('../optimizer');
const { filterAndSortCandidates } = optimizer;

describe('filterAndSortCandidates', () => {
  it('should filter out candidates with undefined PP', () => {
    const candidates = [
      { name: 'Valid', pp: 100, price: 1000 },
      { name: 'Undefined PP', pp: undefined, price: 500 }
    ];

    const result = filterAndSortCandidates(candidates);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid');
  });

  it('should filter out candidates with NaN PP', () => {
    const candidates = [
      { name: 'Valid', pp: 100, price: 1000 },
      { name: 'NaN PP', pp: NaN, price: 500 }
    ];

    const result = filterAndSortCandidates(candidates);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid');
  });

  it('should filter out candidates with Infinity PP', () => {
    const candidates = [
      { name: 'Valid', pp: 100, price: 1000 },
      { name: 'Infinity PP', pp: Infinity, price: 500 }
    ];

    const result = filterAndSortCandidates(candidates);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid');
  });

  it('should filter out candidates with zero PP', () => {
    const candidates = [
      { name: 'Valid', pp: 100, price: 1000 },
      { name: 'Zero PP', pp: 0, price: 500 }
    ];

    const result = filterAndSortCandidates(candidates);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid');
  });

  it('should filter out candidates with negative PP', () => {
    const candidates = [
      { name: 'Valid', pp: 100, price: 1000 },
      { name: 'Negative PP', pp: -100, price: 500 }
    ];

    const result = filterAndSortCandidates(candidates);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid');
  });

  it('should sort by PP ascending (lower is better)', () => {
    const candidates = [
      { name: 'High PP', pp: 500, price: 1000 },
      { name: 'Low PP', pp: 50, price: 2000 },
      { name: 'Medium PP', pp: 200, price: 1500 }
    ];

    const result = filterAndSortCandidates(candidates);

    expect(result[0].name).toBe('Low PP');
    expect(result[1].name).toBe('Medium PP');
    expect(result[2].name).toBe('High PP');
  });

  it('should return empty array when no valid candidates', () => {
    const candidates = [
      { name: 'Invalid', pp: undefined },
      { name: 'Also Invalid', pp: NaN }
    ];

    const result = filterAndSortCandidates(candidates);

    expect(result).toHaveLength(0);
  });

  it('should handle empty input', () => {
    expect(filterAndSortCandidates([])).toEqual([]);
  });

  it('should handle all invalid PP values', () => {
    const candidates = [
      { name: 'Undefined', pp: undefined },
      { name: 'NaN', pp: NaN },
      { name: 'Infinity', pp: Infinity },
      { name: 'Zero', pp: 0 },
      { name: 'Negative', pp: -50 }
    ];

    const result = filterAndSortCandidates(candidates);

    expect(result).toHaveLength(0);
  });

  it('should preserve all candidate properties', () => {
    const candidates = [
      { name: 'Test', pp: 100, price: 1000, type: 'Building', affordable: true }
    ];

    const result = filterAndSortCandidates(candidates);

    expect(result[0]).toEqual({
      name: 'Test',
      pp: 100,
      price: 1000,
      type: 'Building',
      affordable: true
    });
  });
});
