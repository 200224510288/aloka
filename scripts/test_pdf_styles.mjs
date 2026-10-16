import fs from 'fs';

async function testExportPdf() {
  const sheetData = JSON.parse(fs.readFileSync('./data/sheets/2026-10-15.json', 'utf-8'));
  
  // Make sure it's valid for export
  sheetData.isFooterReviewed = true;
  for (const l of sheetData.lotteries) {
    l.isCheckedAgainstSource = true;
  }

  const customStyleOptions = {
    rowHeightMm: 9.8,
    resultFontSizePt: 18.0,
    lotteryNameFontSizePt: 11.0,
    drawNoFontSizePt: 12.0,
    contentGapMm: 2.5,
    cellPaddingLeftMm: 2.2,
    footerFontSizePt: 10.5,
    metaFontSizePt: 14.0,
    printDensity: 'high'
  };

  console.log('Sending request to /api/export-pdf with custom style options...');
  const res = await fetch('http://localhost:3000/api/export-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sheet: sheetData,
      styleOptions: customStyleOptions
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Export failed:', res.status, err);
    process.exit(1);
  }

  const buffer = await res.arrayBuffer();
  console.log(`Success! PDF received, size: ${buffer.byteLength} bytes.`);
  fs.writeFileSync('./scripts/output_custom_test.pdf', Buffer.from(buffer));
  console.log('Saved output to ./scripts/output_custom_test.pdf');
}

testExportPdf().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
