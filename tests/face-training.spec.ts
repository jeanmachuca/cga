import { test, expect } from '@playwright/test';
import { signInAsGuest } from './helpers/auth';
import { mockSpeech, getSpokenTexts } from './helpers/mock-speech';
import { mockGeminiSuccess } from './helpers/mock-api';
import { mockGoogleGIS } from './helpers/mock-gis';

test.describe('Face Training', () => {
  test.beforeEach(async ({ page }) => {
    await mockGoogleGIS(page);
    await page.goto('/');
    await page.waitForFunction(() => typeof Auth !== 'undefined');
    await mockSpeech(page);
    await mockGeminiSuccess(page);
    await signInAsGuest(page);
  });

  test('onboarding greeting spoken when no face data', async ({ page }) => {
    await page.fill('#apiKey', 'test-api-key');
    await page.click('.config-save-btn');
    await expect(page.locator('#mainApp')).toBeVisible();
    await page.waitForTimeout(500);

    const spoken = await page.evaluate(() => (window as any).__spokenTexts || []);
    const hasGreeting = spoken.some((t: string) => /hello|hi|greet|welcome|cogn/i.test(t));
    expect(hasGreeting).toBeTruthy();
  });

  test('name capture advances to camera question', async ({ page }) => {
    await page.fill('#apiKey', 'test-api-key');
    await page.click('.config-save-btn');
    await expect(page.locator('#mainApp')).toBeVisible();
    await page.waitForTimeout(500);

    // Respond to name prompt
    await page.fill('#textToSpeak', 'Alice');
    await page.press('#textToSpeak', 'Enter');
    await page.waitForTimeout(300);

    const spoken = await page.evaluate(() => (window as any).__spokenTexts || []);
    const hasCameraQ = spoken.some((t: string) => /camera|recogni|photo/i.test(t));
    expect(hasCameraQ).toBeTruthy();
  });

  test('camera denied continues gracefully', async ({ page }) => {
    // Start onboarding
    await page.fill('#apiKey', 'test-api-key');
    await page.click('.config-save-btn');
    await expect(page.locator('#mainApp')).toBeVisible();
    await page.waitForTimeout(300);

    // Say name to advance to camera question
    await page.fill('#textToSpeak', 'Alice');
    await page.press('#textToSpeak', 'Enter');
    await page.waitForTimeout(300);

    // Refuse camera
    await page.fill('#textToSpeak', 'no');
    await page.press('#textToSpeak', 'Enter');
    await page.waitForTimeout(300);

    const spoken = await page.evaluate(() => (window as any).__spokenTexts || []);
    const hasGraceful = spoken.some((t: string) => /no problem|continue|without/i.test(t));
    expect(hasGraceful).toBeTruthy();
  });
});
