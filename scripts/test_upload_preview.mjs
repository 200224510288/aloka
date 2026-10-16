import { chromium } from 'playwright-core';
import path from 'path';

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  console.log('Testing upload and source document preview...');
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 950 });

  page.on('dialog', async (d) => {
    await d.accept();
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // 1. Locate file input and upload a test file
  const fileInput = await page.$('input[type="file"]');
  if (!fileInput) {
    console.error('File input not found');
    process.exit(1);
  }

  const testPdfPath = path.resolve('public/samples/result_sheet_wireframe.pdf');
  console.log('Uploading test PDF:', testPdfPath);
  await fileInput.setInputFiles(testPdfPath);

  // Wait for upload and extraction to finish
  console.log('Waiting for extraction response...');
  await page.waitForTimeout(4000);

  // 2. Check if preview element is rendered
  const previewImg = await page.$('img[alt*="Source document preview"]');
  const pdfIframe = await page.$('iframe[title="Source PDF Document"]');
  console.log('Found rendered preview <img>:', !!previewImg);
  console.log('Found fallback PDF <iframe>:', !!pdfIframe);

  if (previewImg) {
    const src = await previewImg.getAttribute('src');
    console.log('Preview image src:', src);
  }

  // 3. Take screenshot of the uploaded state
  await page.screenshot({ path: 'public/test_upload_preview_result.png' });
  console.log('Saved screenshot to public/test_upload_preview_result.png');

  // 4. Reload page to verify persistence
  console.log('Reloading page to verify persistence...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const previewAfterReload = await page.$('img[alt*="Source document preview"], iframe[title="Source PDF Document"]');
  console.log('Preview remains visible after page reload:', !!previewAfterReload);

  await page.screenshot({ path: 'public/test_upload_preview_after_reload.png' });
  console.log('Saved screenshot to public/test_upload_preview_after_reload.png');

  await browser.close();
  console.log('Test completed successfully!');
})();
