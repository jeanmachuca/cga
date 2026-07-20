import { test, expect } from '@playwright/test';
import { signInAsGoogle } from './helpers/auth';
import { mockSpeech } from './helpers/mock-speech';
import { mockGeminiSuccess, mockDriveVault } from './helpers/mock-api';
import { mockGoogleGIS } from './helpers/mock-gis';

test.describe('Google Auth Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockGoogleGIS(page);
    await page.goto('/');
    await page.waitForFunction(() => typeof Auth !== 'undefined');
    await mockSpeech(page);
    await mockGeminiSuccess(page);
  });

  test('Google sign-in shows user display', async ({ page }) => {
    await signInAsGoogle(page, 'Alice');
    await expect(page.locator('#userDisplay')).toContainText('Alice');
  });

  test('Google sign-in shows config onboarding', async ({ page }) => {
    await signInAsGoogle(page);
    await expect(page.locator('#configOnboarding')).toBeVisible();
  });

  test('config saved to Drive for Google user', async ({ page }) => {
    await signInAsGoogle(page);
    await mockDriveVault(page);

    await page.fill('#apiKey', 'drive-key');
    await page.click('.config-save-btn');
    await page.waitForTimeout(500);

    // Config saved successfully (no mention of Drive in status text)
    await expect(page.locator('#statusText')).toContainText('Configuration saved!');
    // Verify it was stored via the DriveVault mock
    const saved = await page.evaluate(async () => {
      const raw = localStorage.getItem(STORAGE_KEYS.apiKey);
      return { inLocalStorage: !!raw };
    });
    // If DriveVault succeeded, it should NOT be in localStorage
    expect(saved.inLocalStorage).toBe(false);
  });

  test('Drive unavailable falls back to localStorage', async ({ page }) => {
    await signInAsGoogle(page);

    await page.fill('#apiKey', 'fallback-key');
    await page.click('.config-save-btn');
    await page.waitForTimeout(500);

    await expect(page.locator('#mainApp')).toBeVisible();
    await expect(page.locator('#mainApp')).toHaveClass(/main-app-visible/);

    const saved = await page.evaluate(() => loadConfig(STORAGE_KEYS.apiKey));
    expect(saved).toBe('fallback-key');
  });
});
