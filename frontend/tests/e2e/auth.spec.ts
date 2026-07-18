import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('User can register a new account', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[type="email"]', 'test@enterprise.local');
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    // Expect redirection to login or direct login to dashboard
    await expect(page).toHaveURL(/.*(login|chat)/);
  });

  test('User can login and restore session', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@enterprise.local');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Conversations')).toBeVisible();

    // Reload page to test session restore
    await page.reload();
    await expect(page.locator('text=Conversations')).toBeVisible();
  });

  test('User can logout', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@enterprise.local');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Conversations')).toBeVisible();
    
    await page.click('button[aria-label="Profile"]');
    await page.click('button:has-text("Logout")');
    
    await expect(page).toHaveURL(/.*login/);
  });
});
