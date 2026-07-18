import { test, expect } from '@playwright/test';

test.describe('PWA Validation', () => {
  test('Service worker successfully registers', async ({ page }) => {
    await page.goto('/');
    
    const swStatus = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    });
    
    expect(swStatus).toBe(true);
  });

  test('Manifest is available', async ({ page, request }) => {
    await page.goto('/');
    const manifestUrl = await page.getAttribute('link[rel="manifest"]', 'href');
    expect(manifestUrl).not.toBeNull();
    
    if (manifestUrl) {
      const response = await request.get(manifestUrl);
      expect(response.status()).toBe(200);
      const json = await response.json();
      expect(json.name).toBe('DualConnect');
    }
  });
});
