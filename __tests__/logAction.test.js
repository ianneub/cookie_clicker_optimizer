/**
 * Tests for logAction function
 */

const optimizer = require('../optimizer');
const { logAction } = optimizer;

describe('logAction', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-13T10:30:45.123Z'));
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.useRealTimers();
  });

  it('should log purchase action with all metrics', () => {
    logAction('PURCHASE', {
      item: 'Cursor x10',
      type: 'Building',
      price: 1234567,
      pp: 45.2,
      cookies_before: 5000000
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logCall = consoleSpy.mock.calls[0];
    expect(logCall[0]).toBe('[CCOptimizer]');

    const parsed = JSON.parse(logCall[1]);
    expect(parsed.action).toBe('PURCHASE');
    expect(parsed.item).toBe('Cursor x10');
    expect(parsed.type).toBe('Building');
    expect(parsed.price).toBe(1234567);
    expect(parsed.pp).toBe(45.2);
    expect(parsed.cookies_before).toBe(5000000);
  });

  it('should log golden click action', () => {
    logAction('GOLDEN_CLICK', {
      shimmer_type: 'golden',
      cookies_before: 1000000
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logCall = consoleSpy.mock.calls[0];
    const parsed = JSON.parse(logCall[1]);

    expect(parsed.action).toBe('GOLDEN_CLICK');
    expect(parsed.shimmer_type).toBe('golden');
    expect(parsed.cookies_before).toBe(1000000);
  });

  it('should log wrath cookie clicks', () => {
    logAction('GOLDEN_CLICK', {
      shimmer_type: 'wrath',
      cookies_before: 2000000
    });

    const logCall = consoleSpy.mock.calls[0];
    const parsed = JSON.parse(logCall[1]);

    expect(parsed.shimmer_type).toBe('wrath');
  });

  it('should include timestamp in ISO format', () => {
    logAction('PURCHASE', { item: 'Test' });

    const logCall = consoleSpy.mock.calls[0];
    const parsed = JSON.parse(logCall[1]);

    expect(parsed.timestamp).toBe('2026-01-13T10:30:45.123Z');
  });

  it('should log golden upgrade purchases', () => {
    logAction('PURCHASE', {
      item: 'Lucky day',
      type: 'GoldenUpgrade',
      price: 777777,
      cookies_before: 1000000
    });

    const logCall = consoleSpy.mock.calls[0];
    const parsed = JSON.parse(logCall[1]);

    expect(parsed.type).toBe('GoldenUpgrade');
    expect(parsed.item).toBe('Lucky day');
  });
});
