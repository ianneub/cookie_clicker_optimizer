/**
 * HeadlessBrowser - Manages Playwright browser lifecycle for Cookie Clicker
 *
 * Supports both local (vendor/cookieclicker) and remote URLs
 */

const { chromium } = require('playwright');
const path = require('path');

// Default to local mirror to avoid Cloudflare issues
const LOCAL_COOKIE_CLICKER_PATH = path.resolve(__dirname, '..', 'vendor', 'cookieclicker', 'index.html');
const REMOTE_COOKIE_CLICKER_URL = 'https://orteil.dashnet.org/cookieclicker/';

class HeadlessBrowser {
  /**
   * Create a headless browser instance
   * @param {Object} options - Configuration options
   * @param {boolean} options.headless - Run in headless mode (default: true)
   * @param {number} options.timeout - Page load timeout in ms (default: 60000)
   * @param {boolean} options.blockMedia - Block images/audio for speed (default: true)
   * @param {boolean} options.useLocal - Use local mirror instead of remote (default: true)
   * @param {string} options.url - Custom URL to load (overrides useLocal)
   */
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    // Don't block media by default - UI needs images to render properly
    this.options = {
      headless: options.headless !== false,
      timeout: options.timeout || 60000,
      blockMedia: options.blockMedia === true, // Only block if explicitly true
      useLocal: options.useLocal !== false,
      url: options.url || null,
      ...options
    };
  }

  /**
   * Launch the browser
   * @returns {Promise<HeadlessBrowser>} this instance for chaining
   */
  async launch() {
    this.browser = await chromium.launch({
      headless: this.options.headless
    });

    this.page = await this.browser.newPage();

    // Block unnecessary resources for faster loading
    if (this.options.blockMedia) {
      await this.page.route('**/*.{png,jpg,jpeg,gif,svg,mp3,ogg,wav}', route => {
        route.abort();
      });
    }

    return this;
  }

  /**
   * Load Cookie Clicker and wait for game to be ready
   * @returns {Promise<HeadlessBrowser>} this instance for chaining
   */
  async loadCookieClicker() {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    // Determine URL to load
    let url;
    if (this.options.url) {
      url = this.options.url;
    } else if (this.options.useLocal) {
      url = `file://${LOCAL_COOKIE_CLICKER_PATH}`;
    } else {
      url = REMOTE_COOKIE_CLICKER_URL;
    }

    console.log(`Loading Cookie Clicker from ${this.options.useLocal ? 'local mirror' : 'remote'}...`);
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: this.options.timeout
    });

    // Wait for language selector to appear
    console.log('Waiting for language selection...');
    await this.page.waitForFunction(
      () => document.getElementById('langSelect-EN') !== null,
      { timeout: this.options.timeout }
    );

    // Select English language
    console.log('Selecting English language...');
    await this.page.click('#langSelect-EN');

    // Wait for Game object to be fully initialized after language selection
    console.log('Waiting for game to initialize...');
    await this.page.waitForFunction(
      () => typeof Game !== 'undefined' && Game.ready && Game.Objects && Object.keys(Game.Objects).length > 0,
      { timeout: this.options.timeout }
    );

    // Dismiss any additional popups/consent dialogs
    await this.page.evaluate(() => {
      // Close any prompts
      if (typeof Game !== 'undefined' && Game.ClosePrompt) Game.ClosePrompt();
    });

    // Wait a moment for game to fully stabilize
    await new Promise(r => setTimeout(r, 1000));

    console.log('Cookie Clicker loaded successfully');
    return this;
  }

  /**
   * Set starting cookies for the game
   * @param {number} cookies - Number of cookies to set
   */
  async setCookies(cookies) {
    await this.page.evaluate((c) => {
      Game.cookies = c;
      Game.cookiesEarned = c;
    }, cookies);
  }

  /**
   * Get the Playwright page instance for direct interaction
   * @returns {Page} Playwright page
   */
  getPage() {
    return this.page;
  }

  /**
   * Close the browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

module.exports = { HeadlessBrowser };
