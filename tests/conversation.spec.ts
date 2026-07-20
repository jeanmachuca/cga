import { test, expect } from '@playwright/test';
import { signInAsGuest } from './helpers/auth';
import { mockSpeech, saveFaceData, getSpokenTexts } from './helpers/mock-speech';
import { mockGeminiSuccess, mockGeminiError } from './helpers/mock-api';
import { mockGoogleGIS } from './helpers/mock-gis';
import { mockCamera } from './helpers/mock-camera';

test.describe('Conversation Flow', () => {
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

  test('type and send message gets AI response', async ({ page }) => {
    await page.fill('#textToSpeak', 'What is 6 times 7?');
    await page.press('#textToSpeak', 'Enter');
    await page.waitForTimeout(1500);

    const spoken = await getSpokenTexts(page);
    const response = spoken.find(t => t.includes('42'));
    expect(response).toBeTruthy();
  });

  test('response appears in textarea', async ({ page }) => {
    await page.fill('#textToSpeak', 'Hello');
    await page.press('#textToSpeak', 'Enter');
    await page.waitForTimeout(1000);

    const areaValue = await page.inputValue('#textToSpeak');
    expect(areaValue).toContain('42');
  });

  test('API error shows error status', async ({ page }) => {
    await mockGeminiError(page);
    await page.fill('#textToSpeak', 'Hello');
    await page.press('#textToSpeak', 'Enter');
    await page.waitForTimeout(500);

    await expect(page.locator('#statusText')).toContainText(/error/i);
  });

  test('no API key blocks chat', async ({ page }) => {
    // Remove API key from both localStorage and the cached module config
    await page.evaluate(async () => {
      localRemove(STORAGE_KEYS.apiKey);
      const aiMod = await import('/js/ai.js');
      aiMod.getConfig().apiKey = '';
    });

    await page.fill('#textToSpeak', 'hello');
    await page.press('#textToSpeak', 'Enter');
    await page.waitForTimeout(500);
    await expect(page.locator('#statusText')).toContainText(/config|key|api/i);
  });
});
