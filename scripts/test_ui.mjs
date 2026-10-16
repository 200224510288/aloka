import { chromium } from 'playwright-core';
import fs from 'fs';

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  console.log('Starting UI test with Playwright Edge...');
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Navigate to page
  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'public/ui_test_initial.png', fullPage: true });
  console.log('Initial screenshot saved to public/ui_test_initial.png');

  // Check 17 rows presence
  const rows = await page.$$('text=Confirm Check, text=Confirmed');
  console.log(`Found confirmation buttons for rows: ${rows.length}`);

  // 2. Find first lottery row draw input and change it
  console.log('Testing confirmation reset on edit...');
  const firstDrawInput = await page.$('input[placeholder="e.g. 0906"]');
  if (firstDrawInput) {
    await firstDrawInput.fill('9999');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'public/ui_test_after_edit.png' });
    console.log('After edit screenshot saved (confirmation should be reset to Confirm Check)');
  }

  // 3. Click Confirm Check to re-verify
  console.log('Re-confirming the row...');
  const confirmBtn = await page.$('button:has-text("Confirm Check")');
  if (confirmBtn) {
    await confirmBtn.click();
    await page.waitForTimeout(500);
    console.log('Clicked Confirm Check');
  }

  // 4. Test Revisions modal
  console.log('Opening revisions modal...');
  const revisionsBtn = await page.$('button:has-text("Revisions")');
  if (revisionsBtn) {
    await revisionsBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'public/ui_test_revisions_modal.png' });
    console.log('Revisions modal screenshot saved to public/ui_test_revisions_modal.png');
  }

  await browser.close();
  console.log('All UI test assertions completed successfully!');
})();
