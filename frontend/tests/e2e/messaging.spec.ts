import { test, expect } from '@playwright/test';

test.describe('Messaging', () => {
  test.beforeEach(async ({ page }) => {
    // Standard mock login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@enterprise.local');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Conversations')).toBeVisible();
  });

  test('User can create a new conversation and send a message', async ({ page }) => {
    await page.click('button:has-text("New Chat")');
    await page.fill('input[placeholder="Search users..."]', 'alice');
    await page.click('text=Alice'); // Mock user click
    
    await page.fill('input[placeholder="Type a message..."]', 'Hello Playwright');
    await page.click('button[aria-label="Send"]');
    
    await expect(page.locator('text=Hello Playwright')).toBeVisible();
  });

  test('User can see read receipts and presence', async ({ page }) => {
    // Assuming UI renders double ticks or "Read" status
    await page.goto('/chat/1'); // Mock conversation ID
    
    // Send a message
    await page.fill('input[placeholder="Type a message..."]', 'Check receipt');
    await page.click('button[aria-label="Send"]');
    
    // Since it's an E2E test, we'd normally verify the DOM element representing the receipt ticks
    const receipt = page.locator('.message-receipt');
    await expect(receipt).toBeVisible();
    
    // Verify online presence indicator in the header
    const presence = page.locator('.presence-indicator');
    await expect(presence).toHaveClass(/online/);
  });
});
