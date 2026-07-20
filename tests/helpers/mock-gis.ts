import { Page } from '@playwright/test';

export async function mockGoogleGIS(page: Page) {
  await page.route('https://accounts.google.com/gsi/client', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.google = window.google || {};
        window.google.accounts = window.google.accounts || {};
        window.google.accounts.id = {
          initialize: function() {},
          renderButton: function() {},
          disableAutoSelect: function() {},
        };
        window.google.accounts.oauth2 = {
          initTokenClient: function() {
            return { requestAccessToken: function() {} };
          },
        };
      `,
    });
  });
}
