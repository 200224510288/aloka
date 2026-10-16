import fs from 'fs';
import { execSync } from 'child_process';

(async () => {
  console.log('Testing /api/export-pdf generation...');
  
  // 1. Fetch sheet for 2026-10-15
  const resSheet = await fetch('http://localhost:3000/api/sheet?date=2026-10-15');
  const sheetData = await resSheet.json();
  console.log('Loaded sheet for date:', sheetData.sheet?.date);

  sheetData.sheet.isFooterReviewed = true;
  // 2. Post to /api/export-pdf
  const resPdf = await fetch('http://localhost:3000/api/export-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet: sheetData.sheet })
  });

  if (!resPdf.ok) {
    const err = await resPdf.json();
    console.error('PDF export failed:', err);
    process.exit(1);
  }

  const pdfBuffer = Buffer.from(await resPdf.arrayBuffer());
  fs.writeFileSync('public/test_exported_results.pdf', pdfBuffer);
  console.log(`Saved public/test_exported_results.pdf (${pdfBuffer.length} bytes)`);

  // Convert PDF to image using pdftoppm to verify
  try {
    execSync('pdftoppm -png -r 150 -f 1 -l 1 "public/test_exported_results.pdf" "public/test_exported_results_page"');
    console.log('Converted PDF page 1 to image: public/test_exported_results_page-1.png');
  } catch (e) {
    console.error('pdftoppm failed:', e);
  }
})();
