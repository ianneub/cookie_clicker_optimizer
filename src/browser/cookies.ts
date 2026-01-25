/**
 * Shimmer clicking (golden cookies, wrath cookies, reindeer)
 */

import { logAction } from '../core/formatting';
import type { Shimmer } from '../types';

/**
 * Click shimmers (golden cookies, wrath cookies, reindeer) if enabled
 */
export function clickShimmers(
  shimmers: Shimmer[],
  autoGolden: boolean,
  autoWrath: boolean,
  getCookies: () => number
): void {
  if (!autoGolden) return;

  for (const shimmer of shimmers) {
    if (shimmer.type === 'golden') {
      // Click if it's a regular golden cookie, or if it's wrath and autoWrath is enabled
      if (shimmer.wrath === 0 || autoWrath) {
        const shimmerType = shimmer.wrath === 0 ? 'golden' : 'wrath';
        const cookiesBefore = getCookies();
        shimmer.pop();
        logAction('GOLDEN_CLICK', {
          shimmer_type: shimmerType,
          cookies_before: cookiesBefore,
        });
      }
    } else if (shimmer.type === 'reindeer') {
      const cookiesBefore = getCookies();
      shimmer.pop();
      logAction('REINDEER_CLICK', {
        cookies_before: cookiesBefore,
      });
    }
  }
}
