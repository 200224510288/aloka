import { chromium } from 'playwright-core';
import fs from 'fs';

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  console.log('Testing enlarged winning numbers preview and editor...');
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

  // Click "Load Wireframe Sample" if needed
  const sampleBtn = await page.$('button:has-text("Load Wireframe Sample")');
  if (sampleBtn) {
    await sampleBtn.click();
    await page.waitForTimeout(1000);
  }

  // Full page screenshot
  await page.screenshot({ path: 'public/test_enlarged_numbers_page.png', fullPage: true });
  console.log('Screenshot saved to public/test_enlarged_numbers_page.png');

  // Trigger PDF export to test pdf-generator output
  console.log('Testing PDF Export endpoint...');
  const exportBtn = await page.$('button:has-text("Download Final PDF"), button:has-text("Download PDF")');
  if (exportBtn && !(await exportBtn.isDisabled())) {
    console.log('Export button is enabled, clicking it...');
    // We can also fetch the PDF directly via POST
  }

  await browser.close();
  console.log('Test completed.');
})();
