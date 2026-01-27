/**
 * Tests for shimmer clicking functions
 */

import { describe, it, expect, mock } from 'bun:test';
import { clickShimmers } from '../browser/cookies';
import type { Shimmer } from '../types';

// Helper to create mock shimmers
function createMockShimmer(type: string, wrath = 0): Shimmer & { popped: boolean } {
  return {
    type,
    wrath,
    popped: false,
    pop() {
      this.popped = true;
    },
  };
}

describe('clickShimmers', () => {
  describe('when autoGolden is disabled', () => {
    it('should not click any shimmers', () => {
      const golden = createMockShimmer('golden');
      const reindeer = createMockShimmer('reindeer');

      clickShimmers([golden, reindeer], false, false, () => 1000);

      expect(golden.popped).toBe(false);
      expect(reindeer.popped).toBe(false);
    });
  });

  describe('when autoGolden is enabled', () => {
    it('should click golden cookies', () => {
      const golden = createMockShimmer('golden', 0);

      clickShimmers([golden], true, false, () => 1000);

      expect(golden.popped).toBe(true);
    });

    it('should click reindeer', () => {
      const reindeer = createMockShimmer('reindeer');

      clickShimmers([reindeer], true, false, () => 1000);

      expect(reindeer.popped).toBe(true);
    });

    it('should click both golden cookies and reindeer', () => {
      const golden = createMockShimmer('golden', 0);
      const reindeer = createMockShimmer('reindeer');

      clickShimmers([golden, reindeer], true, false, () => 1000);

      expect(golden.popped).toBe(true);
      expect(reindeer.popped).toBe(true);
    });

    it('should not click wrath cookies when autoWrath is disabled', () => {
      const wrath = createMockShimmer('golden', 1);

      clickShimmers([wrath], true, false, () => 1000);

      expect(wrath.popped).toBe(false);
    });

    it('should click wrath cookies when autoWrath is enabled', () => {
      const wrath = createMockShimmer('golden', 1);

      clickShimmers([wrath], true, true, () => 1000);

      expect(wrath.popped).toBe(true);
    });

    it('should ignore unknown shimmer types', () => {
      const unknown = createMockShimmer('unknown');

      clickShimmers([unknown], true, true, () => 1000);

      expect(unknown.popped).toBe(false);
    });

    it('should handle empty shimmers array', () => {
      // Should not throw
      clickShimmers([], true, true, () => 1000);
    });

    it('should handle mixed shimmers correctly', () => {
      const golden = createMockShimmer('golden', 0);
      const wrath = createMockShimmer('golden', 1);
      const reindeer = createMockShimmer('reindeer');
      const unknown = createMockShimmer('corpse');

      clickShimmers([golden, wrath, reindeer, unknown], true, false, () => 1000);

      expect(golden.popped).toBe(true);
      expect(wrath.popped).toBe(false); // autoWrath is false
      expect(reindeer.popped).toBe(true);
      expect(unknown.popped).toBe(false);
    });
  });
});
