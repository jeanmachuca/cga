import { Page, Route } from '@playwright/test';

export async function mockGeminiSuccess(page: Page, responseText = '42 is the answer to everything.') {
  await page.route('**/generativelanguage.googleapis.com/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [{
          content: {
            parts: [{ text: responseText }],
            role: 'model',
          },
        }],
      }),
    });
  });
}

export async function mockGeminiError(page: Page, status = 500) {
  await page.route('**/generativelanguage.googleapis.com/**', async (route: Route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'Internal error', code: status } }),
    });
  });
}

export async function mockDriveVault(page: Page) {
  await page.evaluate(() => {
    (Auth as any).isTokenValid = () => true;

    (DriveVault as any).testConnection = async () => true;
    (DriveVault as any).isAvailable = () => true;

    const store: Record<string, any> = {};

    (DriveVault as any).getFile = async (type: string) => {
      return store[type] || null;
    };

    (DriveVault as any).saveFile = async (type: string, data: any) => {
      store[type] = JSON.parse(JSON.stringify(data));
    };

    (DriveVault as any).clearCache = () => {};
  });
}

export async function mockDriveVaultUnavailable(page: Page) {
  await page.evaluate(() => {
    (DriveVault as any).testConnection = async () => false;
    (DriveVault as any).isAvailable = () => false;
  });
}
