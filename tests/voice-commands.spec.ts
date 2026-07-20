import { test, expect } from '@playwright/test';
import { signInAsGuest } from './helpers/auth';
import { mockSpeech, saveFaceData } from './helpers/mock-speech';
import { mockGeminiSuccess } from './helpers/mock-api';
import { mockGoogleGIS } from './helpers/mock-gis';
import { mockCamera } from './helpers/mock-camera';

test.describe('Voice Commands', () => {
  test.beforeEach(async ({ page }) => {
    await mockGoogleGIS(page);
    await page.goto('/');
    await page.waitForFunction(() => typeof Auth !== 'undefined');
    await mockSpeech(page);
    await mockGeminiSuccess(page);
    await signInAsGuest(page);

    await saveFaceData(page, 'Alice');
    await mockCamera(page);

    await page.fill('#apiKey', 'test-api-key');
    await page.click('.config-save-btn');
    await expect(page.locator('#mainApp')).toBeVisible();
    await page.waitForTimeout(500);
  });

  test('stop command stops speech', async ({ page }) => {
    await page.fill('#textToSpeak', 'stop');
    await page.press('#textToSpeak', 'Enter');
    await page.waitForTimeout(200);

    const spoken = await page.evaluate(() => (window as any).__spokenTexts || []);
    const aiSent = spoken.some((t: string) => /response|42/i.test(t));
    expect(aiSent).toBeFalsy();
  });

  test('clear command clears textarea', async ({ page }) => {
    // Send some text first so there's something to clear
    await page.fill('#textToSpeak', 'hello');
    await page.press('#textToSpeak', 'Enter');
    await page.waitForTimeout(300);

    // Now clear
    await page.fill('#textToSpeak', 'clear');
    await page.press('#textToSpeak', 'Enter');
    await page.waitForTimeout(200);

    const areaValue = await page.inputValue('#textToSpeak');
    expect(areaValue).toBe('');
  });

  test('non-command text passes through to AI', async ({ page }) => {
    await page.fill('#textToSpeak', 'What is the weather?');
    await page.press('#textToSpeak', 'Enter');
    await page.waitForTimeout(1500);

    const spoken = await page.evaluate(() => (window as any).__spokenTexts || []);
    const response = spoken.find(t => t.includes('42'));
    expect(response).toBeTruthy();
  });
});
