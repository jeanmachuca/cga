import { Page } from '@playwright/test';

export async function mockSpeech(page: Page) {
  await page.evaluate(() => {
    const spokenTexts: string[] = [];
    let onEndCallback: (() => void) | null = null;

    (window as any).__spokenTexts = spokenTexts;

    const synthStub = {
      speak: (utterance: any) => {
        spokenTexts.push(utterance.text);
        onEndCallback = utterance.onend || null;
        setTimeout(() => {
          if (utterance.onend) utterance.onend();
        }, 30);
      },
      cancel: () => {
        onEndCallback = null;
      },
      pause: () => {},
      resume: () => {},
      speaking: false,
      pending: false,
    };

    Object.defineProperty(window, 'speechSynthesis', {
      value: synthStub,
      writable: true,
    });

    class FakeRecognition extends EventTarget {
      continuous = false;
      interimResults = false;
      lang = 'en-US';
      onresult: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        setTimeout(() => {
          if (this.onresult) {
            this.onresult({
              results: [[{ transcript: (window as any).__recognitionTranscript || '', confidence: 0.9 }]],
            });
          }
          if (this.onend) this.onend();
        }, 50);
      }
      stop() {
        if (this.onend) this.onend();
      }
      abort() {}
    }

    (window as any).SpeechRecognition = FakeRecognition;
    (window as any).webkitSpeechRecognition = FakeRecognition;
  });
}

export async function setRecognitionTranscript(page: Page, text: string) {
  await page.evaluate((t) => {
    (window as any).__recognitionTranscript = t;
  }, text);
}

export async function getSpokenTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as any).__spokenTexts || []);
}

export async function saveFaceData(page: Page, name: string) {
  await page.evaluate(async (n) => {
    await saveConfig(STORAGE_KEYS.face, {
      name: n,
      descriptors: Array.from({ length: 128 }, () => Math.random() * 2 - 1),
    });
  }, name);
}

export async function clearSpokenTexts(page: Page) {
  await page.evaluate(() => {
    (window as any).__spokenTexts = [];
  });
}
