import { Page } from '@playwright/test';

export async function mockCamera(page: Page) {
  await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#4a90d9';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(40, 45, 8, 0, Math.PI * 2);
    ctx.arc(88, 45, 8, 0, Math.PI * 2);
    ctx.fill();

    const stream = canvas.captureStream(1);

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: async () => stream,
      },
      writable: true,
    });

    const fakeDescriptor = Array.from({ length: 128 }, () => Math.random() * 2 - 1);

    (Face as any).startCamera = async () => true;
    (Face as any).loadModels = async () => true;
    (Face as any).stopCamera = () => {};
    (Face as any).detectFace = async () => ({
      descriptor: { toArray: () => fakeDescriptor, data: new Float32Array(fakeDescriptor) },
    });
    (Face as any).captureSnapshot = async () => fakeDescriptor;
    (Face as any).recognize = async () => ({ name: 'TestUser', distance: 0.3 });
    (Face as any).getStoredDescriptors = () => ({
      name: 'TestUser',
      descriptors: [fakeDescriptor, fakeDescriptor, fakeDescriptor],
    });
    (Face as any).setStoredDescriptors = () => {};
  });
}

export async function mockCameraFail(page: Page) {
  await page.evaluate(() => {
    (Face as any).startCamera = async () => false;
    (Face as any).loadModels = async () => false;
  });
}

export async function mockCameraNoFace(page: Page) {
  await page.evaluate(() => {
    (Face as any).startCamera = async () => true;
    (Face as any).loadModels = async () => true;
    (Face as any).detectFace = async () => null;
    (Face as any).captureSnapshot = async () => null;
  });
}
