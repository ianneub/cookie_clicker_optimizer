/**
 * Cookie Clicker Optimizer
 *
 * A bookmarklet that finds the most efficient purchase in Cookie Clicker
 * by leveraging Cookie Monster's payback period (PP) calculations.
 *
 * Usage: Run this script while playing Cookie Clicker at https://orteil.dashnet.org/cookieclicker/
 */

// Re-export everything for testing
export * from './core';
export * from './browser';
export * from './types';
export { getState, createDefaultState } from './state';

// Main entry point
export { run } from './main';
