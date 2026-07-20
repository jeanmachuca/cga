import { Page } from '@playwright/test';

export function fakeJwt(payload: Record<string, string>): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const sig = btoa('fake-signature');
  return `${header}.${body}.${sig}`;
}

export async function signInAsGuest(page: Page) {
  await page.evaluate(() => {
    (Auth as any).guestSignIn();
  });
  await page.waitForFunction(() => typeof Auth !== 'undefined' && (Auth as any).isSignedIn());
}

export async function signInAsGoogle(page: Page, name = 'Test User') {
  const jwt = fakeJwt({
    sub: 'google_123456',
    name,
    email: 'test@gmail.com',
    picture: 'https://example.com/avatar.jpg',
  });
  await page.evaluate((cred) => {
    (Auth as any).signIn(cred);
  }, jwt);
  await page.waitForFunction(() => typeof Auth !== 'undefined' && (Auth as any).isSignedIn());
}

export async function signOut(page: Page) {
  await page.evaluate(() => (Auth as any).signOut());
}

export async function isSignedIn(page: Page): Promise<boolean> {
  return page.evaluate(() => (Auth as any).isSignedIn());
}
