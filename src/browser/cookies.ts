/**
 * Golden/wrath cookie clicking
 */

import { logAction } from '../core/formatting';
import type { Shimmer } from '../types';

/**
 * Click golden cookies (and optionally wrath cookies) if enabled
 */
export function clickGoldenCookies(
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
    }
  }
}
