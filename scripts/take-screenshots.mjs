import { chromium } from 'playwright';

const base = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:5173';
const api = process.env.SCREENSHOT_API_URL || 'http://127.0.0.1:3001/api/v1';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();

async function settle(ms = 1000) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(ms);
}

await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
await settle(1600);
await page.screenshot({ path: 'docs/screenshots/landing.png', fullPage: true });

await page.goto(`${base}/#/compose`, { waitUntil: 'domcontentloaded' });
await settle(800);
await page.getByLabel('Recipient').fill('Eleanor');
await page.getByLabel('Letter content').fill('Every moment apart feels like a century. I wrote this note on parchment so it would feel less temporary than a message on a screen. May it arrive with a little ceremony and a little wonder.');
await page.getByLabel('Signature').fill('William');
await page.waitForTimeout(500);
await page.screenshot({ path: 'docs/screenshots/compose.png', fullPage: true });

const created = await fetch(`${api}/letters`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    salutation: 'Dear',
    recipient: 'Eleanor',
    content: 'Every moment apart feels like a century. I wrote this note on parchment so it would feel less temporary than a message on a screen.',
    closing: 'Sincerely,',
    signature: 'William',
    sealType: 'rose',
    sealColor: 'burgundy',
    crest: 'floral',
    customInitials: 'WE',
    bodyFont: 'eb-garamond',
    signatureFont: 'great-vibes',
    flowers: [],
    isPrivate: false
  })
}).then(r => r.json());

if (!created.success) throw new Error(`Could not create screenshot letter: ${JSON.stringify(created)}`);

await page.goto(`${base}/#/letter/${created.data.slug}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3900);
await page.screenshot({ path: 'docs/screenshots/delivery.png', fullPage: true });

await browser.close();
