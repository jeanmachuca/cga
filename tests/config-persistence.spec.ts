import { test, expect } from '@playwright/test';
import { signInAsGuest } from './helpers/auth';
import { mockSpeech } from './helpers/mock-speech';
import { mockGeminiSuccess } from './helpers/mock-api';
import { mockGoogleGIS } from './helpers/mock-gis';

test.describe('Config Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await mockGoogleGIS(page);
    await page.goto('/');
    await page.waitForFunction(() => typeof Auth !== 'undefined');
    await mockSpeech(page);
    await mockGeminiSuccess(page);
  });

  test('guest: config persists in localStorage after reload', async ({ page }) => {
    await signInAsGuest(page);

    await page.fill('#apiKey', 'persisted-key');
    await page.fill('#geminiModel', 'gemini-2.0-flash');
    await page.click('.config-save-btn');
    await expect(page.locator('#mainApp')).toBeVisible();

    await page.reload();
    await page.waitForFunction(() => typeof Auth !== 'undefined');

    const apiKey = await page.evaluate(() => {
      return loadConfig(STORAGE_KEYS.apiKey);
    });
    expect(apiKey).toBe('persisted-key');
  });

  test('guest: session persists after reload', async ({ page }) => {
    await signInAsGuest(page);
    await expect(page.locator('#userDisplay')).toContainText('Guest');

    await page.reload();
    await page.waitForFunction(() => typeof Auth !== 'undefined' && (Auth as any).isSignedIn());

    const signedIn = await page.evaluate(() => (Auth as any).isSignedIn());
    expect(signedIn).toBe(true);
  });

  test('language persists after reload', async ({ page }) => {
    await page.click('label[for="es"]');
    await expect(page.locator('#es')).toBeChecked();

    await page.reload();
    await page.waitForFunction(() => typeof Auth !== 'undefined');

    await expect(page.locator('#es')).toBeChecked();
  });

  test('dark mode persists after reload', async ({ page }) => {
    await page.click('.theme-toggle');
    await expect(page.locator('body')).toHaveClass(/dark-mode/);

    await page.reload();
    await page.waitForFunction(() => typeof Auth !== 'undefined');

    await expect(page.locator('body')).toHaveClass(/dark-mode/);
  });

  test('cleanConfig wipes everything', async ({ page }) => {
    await signInAsGuest(page);

    await page.fill('#apiKey', 'to-be-cleared');
    await page.click('.config-save-btn');
    await expect(page.locator('#mainApp')).toBeVisible();

    await page.evaluate(() => cleanConfig());

    await page.reload();
    await page.waitForFunction(() => typeof Auth !== 'undefined');

    const session = await page.evaluate(() => {
      return loadConfig(STORAGE_KEYS.session);
    });
    expect(session).toBeNull();
  });
});
