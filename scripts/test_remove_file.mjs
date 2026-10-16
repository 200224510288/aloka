import { chromium } from 'playwright-core';

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  console.log('Testing file removal feature...');
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Handle browser confirmation dialog automatically
  page.on('dialog', async (dialog) => {
    console.log(`Dialog message: "${dialog.message()}" -> Accepting`);
    await dialog.accept();
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // 1. Check if source tab and Remove File button are visible
  const removeBtn = await page.$('button:has-text("Remove File")');
  console.log('Found "Remove File" button in toolbar:', !!removeBtn);

  const tabCloseBtn = await page.$('button[title*="Remove file"]');
  console.log('Found tab close button:', !!tabCloseBtn);

  // Take screenshot with remove options visible
  await page.screenshot({ path: 'public/test_remove_option_visible.png' });
  console.log('Saved public/test_remove_option_visible.png');

  // 2. Click Remove File
  if (removeBtn) {
    console.log('Clicking "Remove File" button...');
    await removeBtn.click();
    await page.waitForTimeout(1000);

    // Verify empty dropzone appears
    const dropzone = await page.$('text=Upload Daily Result Source');
    console.log('Empty dropzone visible after removal:', !!dropzone);

    await page.screenshot({ path: 'public/test_after_removal.png' });
    console.log('Saved public/test_after_removal.png');
  }

  await browser.close();
  console.log('File removal test completed successfully!');
})();
