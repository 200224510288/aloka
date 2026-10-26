import fs from 'fs';
import { DailySheet, PreviewStyleOptions } from '@/types/lottery';
import { generateSingleSlipHtml } from './html-generator';

export { generateSingleSlipHtml };

function getBrowserExecutablePath(): string | undefined {
  if (process.platform === 'win32') {
    const possiblePaths = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) return p;
    }
    return 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  }

  // Linux / Serverless environments (Vercel, AWS Lambda)
  const linuxPaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  for (const p of linuxPaths) {
    if (fs.existsSync(/*turbopackIgnore: true*/ p)) return p;
  }
  return undefined;
}

/**
 * Generates a high-definition PNG image buffer for a single Half-A4 (A5) lottery result slip.
 * Crystal clear text, numbers, and zodiac icons without compression artifacts.
 */
export async function generateSingleSlipImageBuffer(
  sheet: DailySheet,
  options: PreviewStyleOptions = {}
): Promise<Buffer> {
  const browserPath = getBrowserExecutablePath();
  if (!browserPath) {
    throw new Error('SERVERLESS_BROWSER_UNAVAILABLE: Headless browser is not installed in this environment.');
  }

  const { chromium } = await import('playwright-core');
  const html = generateSingleSlipHtml(sheet, options);

  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=medium',
      '--force-device-scale-factor=2.5',
    ]
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 561, height: 794 }, // 148.5mm x 210mm in standard 96 DPI CSS pixels
      deviceScaleFactor: 2.5 // Yields high-resolution ~1402 x 1985 px image
    });

    await page.setContent(html, { waitUntil: 'networkidle' });

    // Ensure slip is visible and take pixel-accurate screenshot
    const slipLocator = page.locator('.slip-page');
    const imageBuffer = await slipLocator.screenshot({
      type: 'png',
      omitBackground: false,
    });

    return imageBuffer;
  } finally {
    await browser.close();
  }
}
