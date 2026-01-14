/**
 * TimeManipulator - Accelerates Cookie Clicker time using lag compensation exploit
 *
 * Cookie Clicker has lag compensation that runs catch-up logic when frames are slow.
 * By manipulating Date.now() and Game.accumulatedDelay, we can achieve ~150x speed.
 */

class TimeManipulator {
  /**
   * Create a time manipulator
   * @param {Object} options - Configuration options
   * @param {number} options.targetSpeed - Target speed multiplier (default: 150)
   */
  constructor(options = {}) {
    this.targetSpeed = options.targetSpeed || 150;
    this.isAccelerating = false;
  }

  /**
   * Start time acceleration on the page
   * Exploits lag compensation to achieve high-speed simulation
   *
   * @param {Page} page - Playwright page instance
   * @param {number} targetSpeed - Speed multiplier (default: uses constructor value)
   */
  async startAcceleration(page, targetSpeed = this.targetSpeed) {
    this.targetSpeed = targetSpeed;

    await page.evaluate((speed) => {
      // Store original functions for potential restoration
      window.__timeManipulator = {
        originalDateNow: Date.now,
        originalPerfNow: performance.now.bind(performance),
        originalLoop: Game.Loop,
        virtualOffset: 0,
        speed: speed,
        startRealTime: Date.now(),
        isActive: true
      };

      const tm = window.__timeManipulator;

      // Override Date.now to return accelerated time
      Date.now = function () {
        if (!tm.isActive) return tm.originalDateNow();
        return tm.originalDateNow() + tm.virtualOffset;
      };

      // Override performance.now for consistency
      performance.now = function () {
        if (!tm.isActive) return tm.originalPerfNow();
        return tm.originalPerfNow() + tm.virtualOffset;
      };

      // Wrap Game.Loop to inject accelerated time each frame
      // Game catches up when accumulatedDelay > 0, capped at 5000ms (5 seconds / 150 frames)
      // To achieve speed-x, we inject delay that causes ~speed extra Logic() calls per frame
      // Max safe value is ~4999ms to avoid timeout warnings
      const catchupMs = Math.min(4999, (1000 / 30) * (speed - 1));

      Game.Loop = function () {
        if (!tm.isActive) {
          tm.originalLoop.call(Game);
          return;
        }

        // Track how much virtual time passes
        // Each catchup iteration is 1000/30ms = 33.33ms
        // With catchupMs delay, we get (catchupMs / 33.33) + 1 iterations per frame
        const iterationsPerFrame = 1 + Math.floor(catchupMs / (1000 / 30));
        const virtualMsPerFrame = iterationsPerFrame * (1000 / 30);

        // Inject positive accumulated delay to trigger lag compensation catchup
        // The game will run Game.Logic() multiple times until delay is consumed
        Game.accumulatedDelay = catchupMs;

        // Advance virtual time tracking
        tm.virtualOffset += virtualMsPerFrame;

        // Call original loop (which will run catchup logic)
        tm.originalLoop.call(Game);
      };

      console.log(`[TimeManipulator] Acceleration started at ${speed}x`);
    }, targetSpeed);

    this.isAccelerating = true;
  }

  /**
   * Stop time acceleration and restore normal game speed
   * @param {Page} page - Playwright page instance
   */
  async stopAcceleration(page) {
    await page.evaluate(() => {
      const tm = window.__timeManipulator;
      if (!tm) return;

      tm.isActive = false;

      // Restore original functions
      Date.now = tm.originalDateNow;
      performance.now = tm.originalPerfNow;
      Game.Loop = tm.originalLoop;
      Game.accumulatedDelay = 0;

      console.log('[TimeManipulator] Acceleration stopped');
    });

    this.isAccelerating = false;
  }

  /**
   * Get current virtual elapsed time in seconds
   * @param {Page} page - Playwright page instance
   * @returns {Promise<number>} Virtual elapsed time in seconds
   */
  async getVirtualElapsedTime(page) {
    return await page.evaluate(() => {
      const tm = window.__timeManipulator;
      if (!tm) return 0;
      return tm.virtualOffset / 1000;
    });
  }

  /**
   * Get acceleration stats
   * @param {Page} page - Playwright page instance
   * @returns {Promise<Object>} Stats object with realTime, virtualTime, effectiveSpeed
   */
  async getStats(page) {
    return await page.evaluate(() => {
      const tm = window.__timeManipulator;
      if (!tm) return { realTime: 0, virtualTime: 0, effectiveSpeed: 0 };

      const realElapsed = (tm.originalDateNow() - tm.startRealTime) / 1000;
      const virtualElapsed = tm.virtualOffset / 1000;

      return {
        realTime: realElapsed,
        virtualTime: virtualElapsed,
        effectiveSpeed: realElapsed > 0 ? virtualElapsed / realElapsed : 0
      };
    });
  }
}

module.exports = { TimeManipulator };
