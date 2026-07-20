import { test, expect } from '@playwright/test';
import { signInAsGuest } from './helpers/auth';
import { mockSpeech } from './helpers/mock-speech';
import { mockGeminiSuccess } from './helpers/mock-api';
import { mockGoogleGIS } from './helpers/mock-gis';

test.describe('Guest Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockGoogleGIS(page);
    await page.goto('/');
    await page.waitForFunction(() => typeof Auth !== 'undefined');
    await mockSpeech(page);
    await mockGeminiSuccess(page);
  });

  test('welcome screen visible on load', async ({ page }) => {
    await expect(page.locator('#welcomeScreen')).toBeVisible();
    await expect(page.locator('#mainApp')).toHaveClass(/hidden/);
    await expect(page.locator('#configOnboarding')).toHaveClass(/hidden/);
  });

  test('language selector defaults to English', async ({ page }) => {
    await expect(page.locator('#en')).toBeChecked();
    await expect(page.locator('#es')).not.toBeChecked();
  });

  test('guest sign-in shows config onboarding', async ({ page }) => {
    await signInAsGuest(page);
    await expect(page.locator('#configOnboarding')).toBeVisible();
    await expect(page.locator('#mainApp')).toHaveClass(/hidden/);
  });

  test('config warning shows for guest', async ({ page }) => {
    await signInAsGuest(page);
    const warning = page.locator('#configWarning');
    await expect(warning).toContainText('localStorage');
  });

  test('complete guest flow: sign-in -> config -> main app', async ({ page }) => {
    await signInAsGuest(page);

    await page.fill('#apiKey', 'test-api-key-12345');
    await page.fill('#geminiModel', 'gemini-3.5-flash');
    await page.click('.config-save-btn');

    await expect(page.locator('#configOnboarding')).toHaveClass(/hidden/);
    await expect(page.locator('#mainApp')).toBeVisible();
    await expect(page.locator('#mainApp')).toHaveClass(/main-app-visible/);
  });

  test('main app elements visible after config', async ({ page }) => {
    await signInAsGuest(page);
    await page.fill('#apiKey', 'test-api-key-12345');
    await page.click('.config-save-btn');

    await expect(page.locator('#avatar')).toBeVisible();
    await expect(page.locator('#textToSpeak')).toBeVisible();
    await expect(page.locator('#micButton')).toBeVisible();
    await expect(page.locator('#statusText')).toBeVisible();
  });

  test('no API key blocks chat after config save', async ({ page }) => {
    await signInAsGuest(page);
    // Pre-save face data and mock camera so onboarding is skipped
    await page.evaluate(async () => {
      await saveConfig(STORAGE_KEYS.face, {
        name: 'Alice',
        descriptors: Array.from({ length: 128 }, () => Math.random() * 2 - 1),
      });
    });
    await page.evaluate(() => {
      (Face as any).startCamera = async () => true;
      (Face as any).loadModels = async () => true;
      (Face as any).stopCamera = () => {};
      (Face as any).recognize = async () => ({ name: 'Alice', distance: 0.3 });
    });

    await page.click('.config-save-btn');

    await expect(page.locator('#mainApp')).toBeVisible();
    // Wait for face recognition to complete (1.5s delay + processing)
    await page.waitForTimeout(3000);

    // Face recognition completed but no API key — config onboarding re-shown.
    // Bypass it by hiding it and setting onboarding state to idle
    await page.evaluate(async () => {
      document.getElementById('configOnboarding')?.classList.add('hidden');
      const mod = await import('/js/state.js');
      mod.setOnboardingState('idle');
    });
    await page.waitForTimeout(200);

    await page.fill('#textToSpeak', 'hello');
    await page.press('#textToSpeak', 'Enter');
    await page.waitForTimeout(500);
    await expect(page.locator('#statusText')).toContainText(/config|key|api/i);
  });
});
