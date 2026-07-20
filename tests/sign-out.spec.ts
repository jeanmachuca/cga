import { test, expect } from '@playwright/test';
import { signInAsGuest, signInAsGoogle } from './helpers/auth';
import { mockSpeech } from './helpers/mock-speech';
import { mockGeminiSuccess } from './helpers/mock-api';
import { mockGoogleGIS } from './helpers/mock-gis';
import { mockDriveVault } from './helpers/mock-api';

test.describe('Sign Out', () => {
  test.beforeEach(async ({ page }) => {
    await mockGoogleGIS(page);
    await page.goto('/');
    await page.waitForFunction(() => typeof Auth !== 'undefined');
    await mockSpeech(page);
    await mockGeminiSuccess(page);
  });

  test('sign out clears user display', async ({ page }) => {
    await signInAsGuest(page);
    await expect(page.locator('#userDisplay')).toContainText('Guest');

    await page.evaluate(() => Auth.signOut());
    await page.waitForFunction(() => !(Auth as any).isSignedIn());

    await expect(page.locator('#userDisplay')).toHaveText('');
  });

  test('sign out shows auth buttons again', async ({ page }) => {
    await signInAsGuest(page);
    await page.evaluate(() => Auth.signOut());
    await page.waitForFunction(() => !(Auth as any).isSignedIn());

    // Guest button should be rendered again
    await expect(page.locator('.auth-guest-btn')).toBeVisible();
  });

  test('sign out clears config from localStorage', async ({ page }) => {
    await signInAsGuest(page);
    await page.fill('#apiKey', 'key-to-clear');
    await page.click('.config-save-btn');
    await expect(page.locator('#mainApp')).toBeVisible();

    await page.evaluate(() => Auth.signOut());
    await page.waitForFunction(() => !(Auth as any).isSignedIn());

    const session = await page.evaluate(() => loadConfig(STORAGE_KEYS.session));
    expect(session).toBeNull();
  });

  test('sign out clears DriveVault cache', async ({ page }) => {
    await signInAsGoogle(page);
    await mockDriveVault(page);

    await page.evaluate(() => Auth.signOut());
    await page.waitForFunction(() => !(Auth as any).isSignedIn());

    const cleared = await page.evaluate(() => loadConfig(STORAGE_KEYS.driveSession));
    expect(cleared).toBeNull();
  });

  test('after sign out, main app hidden', async ({ page }) => {
    await signInAsGuest(page);
    await page.fill('#apiKey', 'some-key');
    await page.click('.config-save-btn');
    await expect(page.locator('#mainApp')).toBeVisible();

    await page.evaluate(() => Auth.signOut());
    await page.waitForFunction(() => !(Auth as any).isSignedIn());

    await expect(page.locator('#mainApp')).toHaveClass(/hidden/);
    // Welcome screen should show again
    await expect(page.locator('#welcomeScreen')).toBeVisible();
  });
});
