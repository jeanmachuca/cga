import { test, expect } from '@playwright/test';
import { mockSpeech } from './helpers/mock-speech';
import { mockGeminiSuccess } from './helpers/mock-api';
import { mockGoogleGIS } from './helpers/mock-gis';

test.describe('Theme and Language', () => {
  test.beforeEach(async ({ page }) => {
    await mockGoogleGIS(page);
    await page.goto('/');
    await page.waitForFunction(() => typeof Auth !== 'undefined');
    await mockSpeech(page);
    await mockGeminiSuccess(page);
  });

  test('theme toggle adds dark-mode class', async ({ page }) => {
    await page.click('.theme-toggle');
    await expect(page.locator('body')).toHaveClass(/dark-mode/);
  });

  test('theme toggle removes dark-mode class', async ({ page }) => {
    await page.click('.theme-toggle');
    await expect(page.locator('body')).toHaveClass(/dark-mode/);
    await page.click('.theme-toggle');
    await expect(page.locator('body')).not.toHaveClass(/dark-mode/);
  });

  test('language switch to Spanish updates placeholder', async ({ page }) => {
    await page.click('label[for="es"]');
    const placeholder = await page.getAttribute('#textToSpeak', 'placeholder');
    expect(placeholder).toContain('Escribe');
  });

  test('language switch back to English restores placeholder', async ({ page }) => {
    await page.click('label[for="es"]');
    await page.click('label[for="en"]');
    const placeholder = await page.getAttribute('#textToSpeak', 'placeholder');
    expect(placeholder).toContain('Type');
  });

  test('ES radio checked after switch', async ({ page }) => {
    await page.click('label[for="es"]');
    await expect(page.locator('#es')).toBeChecked();
    await expect(page.locator('#en')).not.toBeChecked();
  });
});
