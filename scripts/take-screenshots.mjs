import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:5173';
const api = process.env.SCREENSHOT_API_URL || 'http://127.0.0.1:3847/api/v1';

await mkdir('docs/screenshots', { recursive: true });

async function createLetter() {
  const created = await fetch(`${api}/letters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      salutation: 'My dearest',
      recipient: 'Maria',
      content: 'I wanted this letter to feel like something you would keep in a drawer and unfold on a quiet evening. So I left a little ceremony in it, and a little warmth too. ❤️',
      closing: 'Forever yours,',
      signature: 'A.',
      sealType: 'heart',
      sealColor: 'burgundy',
      crest: 'floral',
      customInitials: 'AM',
      letterDate: 'Thursday, July 9, 2026',
      bodyFont: 'eb-garamond',
      signatureFont: 'great-vibes',
      flowers: [
        { id: 'f1', flowerId: 'rose', x: 84, y: 18, size: 48, rotation: -16 },
        { id: 'f2', flowerId: 'white-blossom', x: 18, y: 72, size: 42, rotation: 14 },
      ],
      isPrivate: false,
    }),
  }).then((r) => r.json());

  if (!created.success) throw new Error(`Could not create screenshot letter: ${JSON.stringify(created)}`);
  return created.data.slug;
}

async function typeIntoEditor(page, text) {
  const editor = page.getByLabel('Letter content');
  await editor.click();
  await page.keyboard.type(text, { delay: 8 });
}

async function captureDesktop(slug) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'docs/screenshots/landing-desktop.png', fullPage: true });

  await page.goto(`${base}/#/compose`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await page.getByLabel('Recipient').fill('Maria');
  await typeIntoEditor(page, 'If this letter feels soft, that is because it was written with care. I wanted the page to look like it remembered flowers, candlelight, and someone waiting to be thought of.');
  await page.getByLabel('Signature').fill('A.');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/screenshots/compose-desktop.png', fullPage: true });

  await page.goto(`${base}/#/letter/${slug}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3400);
  await page.locator('svg[aria-label*="wax seal"]').click();
  await page.waitForTimeout(9500);
  await page.screenshot({ path: 'docs/screenshots/read-desktop.png', fullPage: true });

  await browser.close();
}

async function captureMobile(slug) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'docs/screenshots/landing-mobile.png', fullPage: true });

  await page.goto(`${base}/#/compose`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await page.getByLabel('Recipient').fill('Maria');
  await typeIntoEditor(page, 'Even on a small screen, a letter should still feel like a keepsake.');
  await page.getByLabel('Signature').fill('A.');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/screenshots/compose-mobile.png', fullPage: true });

  await page.goto(`${base}/#/letter/${slug}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3400);
  await page.locator('svg[aria-label*="wax seal"]').click();
  await page.waitForTimeout(9500);
  await page.screenshot({ path: 'docs/screenshots/read-mobile.png', fullPage: true });

  await browser.close();
}

const slug = await createLetter();
await captureDesktop(slug);
await captureMobile(slug);
