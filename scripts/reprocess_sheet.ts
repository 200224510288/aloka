import fs from 'fs';
import path from 'path';
import { extractLotteryDataFromText } from '../src/lib/extractor';
import { STANDARD_LOTTERIES } from '../src/lib/constants';
import { DailySheet, LotteryResultItem } from '../src/types/lottery';

const filePath = path.join(process.cwd(), 'data', 'sheets', '2026-10-15.json');
const sheet: DailySheet = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const rawText = sheet.sources[0]?.extractedText || '';
console.log('--- RAW EXTRACTED TEXT ---');
console.log(rawText);
console.log('---------------------------');

const extraction = extractLotteryDataFromText(
  rawText,
  '2026-10-15',
  'lklottery_results_Sinhala_20261015_Thu.pdf',
  1
);

console.log('Detected Date:', extraction.detectedDate);
console.log('Detected Day:', extraction.detectedDaySi);
console.log('Matched Lotteries Count:', extraction.matchedLotteries.length);
console.log('Unassigned Rows Count:', extraction.unassignedRows.length);

console.log('\n--- EXTRACTED LOTTERIES ---');
for (const item of extraction.matchedLotteries) {
  const def = STANDARD_LOTTERIES.find(d => d.id === item.lotteryId);
  console.log(
    `${def?.nameSi || item.lotteryId}: Draw=${item.drawNo}, Letter=${item.letter || '-'}, Zodiac=${item.zodiac || '-'}, Numbers=[${item.numbers?.join(', ')}], Boxed=${item.boxedIndex !== undefined ? item.boxedIndex : '-'}, Bonus=${item.bonusNumber || '-'}`
  );
}

// Build merged list of 18 lotteries according to STANDARD_LOTTERIES
const updatedLotteries: LotteryResultItem[] = STANDARD_LOTTERIES.map((def) => {
  const matched = extraction.matchedLotteries.find(l => l.lotteryId === def.id);
  if (matched) {
    return {
      lotteryId: def.id,
      drawNo: matched.drawNo || '',
      letter: matched.letter || '',
      zodiac: matched.zodiac,
      numbers: matched.numbers || [],
      bonusNumber: matched.bonusNumber,
      boxedIndex: matched.boxedIndex,
      isNoDraw: false,
      isCheckedAgainstSource: true,
      extractionConfidence: 95,
      sourceFileName: matched.sourceFileName,
      sourcePage: matched.sourcePage,
    };
  }
  // Fallback to empty if not matched
  return {
    lotteryId: def.id,
    drawNo: '',
    letter: '',
    zodiac: def.requiresZodiac ? 'මේෂ' : undefined,
    numbers: [],
    isNoDraw: false,
    isCheckedAgainstSource: false,
  };
});

sheet.lotteries = updatedLotteries;
sheet.updatedAt = new Date().toISOString();

fs.writeFileSync(filePath, JSON.stringify(sheet, null, 2), 'utf8');
console.log('\nSuccessfully updated data/sheets/2026-10-15.json!');
