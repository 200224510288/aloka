import fs from 'fs';
import { DailySheet, PreviewStyleOptions } from '@/types/lottery';
import { generatePrintHtml } from './html-generator';

export { generatePrintHtml };

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

export async function generatePdfBuffer(
  sheet: DailySheet,
  options: PreviewStyleOptions = {},
  copies: number = 1
): Promise<Buffer> {
  const browserPath = getBrowserExecutablePath();
  if (!browserPath) {
    throw new Error('SERVERLESS_BROWSER_UNAVAILABLE: Headless browser is not installed in this serverless environment.');
  }

  const { chromium } = await import('playwright-core');
  const html = generatePrintHtml(sheet, options, copies);

  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=medium']
  });

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1123, height: 794 });
    await page.setContent(html, { waitUntil: 'networkidle' });

    // Generate PDF strictly 297mm x 210mm
    const pdfBuffer = await page.pdf({
      width: '297mm',
      height: '210mm',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
      ...(copies > 1 ? {} : { pageRanges: '1' }),
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
