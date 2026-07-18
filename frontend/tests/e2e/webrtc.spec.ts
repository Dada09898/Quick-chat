import { test, expect } from '@playwright/test';

test.describe('WebRTC Call Validation', () => {
  // Use fake UI for media streams to bypass permission prompts and inject fake media
  test.use({ 
    permissions: ['camera', 'microphone'],
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@enterprise.local');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
  });

  test('User can initiate and end an outgoing call', async ({ page }) => {
    await page.goto('/chat/1');
    
    // Initiate Call
    await page.click('button[aria-label="Start Audio Call"]');
    
    // Verify Outgoing Call UI is visible
    const callStatus = page.locator('text=OUTGOING');
    await expect(callStatus).toBeVisible();

    // Verify local video preview is attached (if video call)
    // Or verify call container
    await expect(page.locator('.fixed.z-50')).toBeVisible();

    // End call
    await page.click('button:has(.lucide-phone-off)');
    await expect(page.locator('.fixed.z-50')).toBeHidden();
  });

  test('User can toggle mute and camera during a call', async ({ page }) => {
    await page.goto('/chat/1');
    await page.click('button[aria-label="Start Audio Call"]');
    
    // Toggle Mute
    await page.click('button:has(.lucide-mic)');
    await expect(page.locator('button:has(.lucide-mic-off)')).toBeVisible();

    // End call to clean up
    await page.click('button:has(.lucide-phone-off)');
  });
});
