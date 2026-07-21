import { test as base } from '@playwright/test';

// Before each test, we clear axes lockouts in the backend
base.beforeEach(async ({ request }) => {
  // Try to call a custom test endpoint or we just use CLI before running playwright
  // But doing it via CLI in the test run script is easier.
});

export const test = base;
