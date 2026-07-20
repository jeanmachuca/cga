import { test, expect } from '@playwright/test';
import { signInAsGuest } from './helpers/auth';
import { mockSpeech, saveFaceData, getSpokenTexts } from './helpers/mock-speech';
import { mockGeminiSuccess } from './helpers/mock-api';
import { mockGoogleGIS } from './helpers/mock-gis';
import { mockCamera, mockCameraNoFace } from './helpers/mock-camera';

test.describe('Face Recognition on Session Start', () => {
  test.beforeEach(async ({ page }) => {
    await mockGoogleGIS(page);
    await page.goto('/');
    await page.waitForFunction(() => typeof Auth !== 'undefined');
    await mockSpeech(page);
    await mockGeminiSuccess(page);
    await signInAsGuest(page);
  });

  test('recognized face greets user by name', async ({ page }) => {
    await saveFaceData(page, 'TestUser');
    await mockCamera(page);

    await page.fill('#apiKey', 'test-api-key');
    await page.click('.config-save-btn');
    await expect(page.locator('#mainApp')).toBeVisible();
    await page.waitForTimeout(2500);

    const spoken = await getSpokenTexts(page);
    const greeting = spoken.find(t => t.includes('TestUser'));
    expect(greeting).toBeTruthy();
  });

  test('unrecognized face shows unknown message', async ({ page }) => {
    await saveFaceData(page, 'Bob');
    await mockCameraNoFace(page);

    await page.fill('#apiKey', 'test-api-key');
    await page.click('.config-save-btn');
    await expect(page.locator('#mainApp')).toBeVisible();
    await page.waitForTimeout(2500);

    const spoken = await getSpokenTexts(page);
    const unknown = spoken.find(t => /unknown|not recognize|don't recognize/i.test(t));
    expect(unknown).toBeTruthy();
  });
});
