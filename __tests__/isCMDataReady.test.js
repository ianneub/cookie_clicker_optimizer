/**
 * Tests for isCMDataReady function
 */

const optimizer = require('../optimizer');
const { isCMDataReady } = optimizer;
const { createCookieMonsterDataMock } = require('./mocks/cookieMonster');

describe('isCMDataReady', () => {
  it('should return false when cmData is undefined', () => {
    expect(isCMDataReady(undefined)).toBe(false);
  });

  it('should return false when cmData is null', () => {
    expect(isCMDataReady(null)).toBe(false);
  });

  it('should return false when Objects1 is missing', () => {
    const cmData = { Upgrades: {} };
    expect(isCMDataReady(cmData)).toBe(false);
  });

  it('should return false when Objects1 is empty', () => {
    const cmData = { Objects1: {}, Upgrades: {} };
    expect(isCMDataReady(cmData)).toBe(false);
  });

  it('should return false when PP values are undefined', () => {
    const cmData = {
      Objects1: {
        'Cursor': { pp: undefined }
      }
    };
    expect(isCMDataReady(cmData)).toBe(false);
  });

  it('should return false when PP is NaN', () => {
    const cmData = {
      Objects1: {
        'Cursor': { pp: NaN }
      }
    };
    expect(isCMDataReady(cmData)).toBe(false);
  });

  it('should return true when PP values are valid numbers', () => {
    const cmData = createCookieMonsterDataMock();
    expect(isCMDataReady(cmData)).toBe(true);
  });

  it('should return true with a single valid building', () => {
    const cmData = {
      Objects1: {
        'Cursor': { pp: 100.5 }
      }
    };
    expect(isCMDataReady(cmData)).toBe(true);
  });

  it('should return true for zero PP', () => {
    const cmData = {
      Objects1: {
        'Cursor': { pp: 0 }
      }
    };
    // Zero is a valid number
    expect(isCMDataReady(cmData)).toBe(true);
  });

  it('should return true for negative PP', () => {
    const cmData = {
      Objects1: {
        'Cursor': { pp: -100 }
      }
    };
    // Negative is a valid number (though unusual)
    expect(isCMDataReady(cmData)).toBe(true);
  });

  it('should return false when building object exists but has no pp property', () => {
    const cmData = {
      Objects1: {
        'Cursor': { name: 'Cursor' }
      }
    };
    expect(isCMDataReady(cmData)).toBe(false);
  });
});
