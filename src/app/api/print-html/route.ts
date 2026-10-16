import { NextRequest, NextResponse } from 'next/server';
import { DailySheet } from '@/types/lottery';
import { STANDARD_LOTTERIES } from '@/lib/constants';
import { generatePrintHtml } from '@/lib/pdf-generator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sheet: DailySheet = body.sheet;
    const copies = Math.max(1, Math.min(50, Number(body.copies) || 1));

    if (!sheet || !sheet.lotteries) {
      return NextResponse.json({ success: false, error: 'Invalid sheet payload' }, { status: 400 });
    }

    const validationErrors: string[] = [];

    // 1. Check Date
    if (!sheet.date || !/^\d{4}-\d{2}-\d{2}$/.test(sheet.date)) {
      validationErrors.push('Valid result date is required (YYYY-MM-DD).');
    }

    // 2. Check Footer announcement review confirmation
    if (!sheet.isFooterReviewed) {
      validationErrors.push('Footer prize announcement must be reviewed and confirmed before printing.');
    }

    // 3. Check each lottery item
    for (const def of STANDARD_LOTTERIES) {
      const item = sheet.lotteries.find(l => l.lotteryId === def.id);

      if (!item) {
        validationErrors.push(`Missing lottery row for: ${def.nameSi}`);
        continue;
      }

      // If marked No Draw, ensure reason exists
      if (item.isNoDraw) {
        if (!item.noDrawReason || item.noDrawReason.trim().length === 0) {
          validationErrors.push(`${def.nameSi} is marked 'No draw', but no reason was provided.`);
        }
        continue;
      }

      // Must be checked against source
      if (!item.isCheckedAgainstSource) {
        validationErrors.push(`${def.nameSi}: Not yet confirmed as 'Checked against source'.`);
      }

      // Must have Draw Number
      if (!item.drawNo || item.drawNo.trim().length === 0) {
        validationErrors.push(`${def.nameSi}: Draw number is missing.`);
      }

      // Must have English Letter if required
      if (def.requiresLetter && (!item.letter || item.letter.trim().length === 0)) {
        validationErrors.push(`${def.nameSi}: English letter is required.`);
      }

      // Must have Zodiac if required
      if (def.requiresZodiac && (!item.zodiac || item.zodiac.trim().length === 0)) {
        validationErrors.push(`${def.nameSi}: Zodiac sign is required.`);
      }

      // Check numbers count
      const expectedCount = def.numberCount || 0;
      const actualCount = (item.numbers || []).length;
      if (actualCount < expectedCount) {
        validationErrors.push(`${def.nameSi}: Expected ${expectedCount} numbers, but found only ${actualCount}.`);
      }

      // Bonus number check if required
      if (def.hasBonusNumber && (!item.bonusNumber || item.bonusNumber.trim().length === 0)) {
        validationErrors.push(`${def.nameSi}: Bonus number is missing.`);
      }

      // Check conflicts
      if (item.hasConflict) {
        validationErrors.push(`${def.nameSi}: Unresolved source conflict detected.`);
      }
    }

    // If any validation errors exist, BLOCK printing!
    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        blocked: true,
        errors: validationErrors,
        error: 'Print blocked: Complete and confirm all lotteries before printing.'
      }, { status: 400 });
    }

    // Generate Print HTML
    const printDensity = (body.printDensity === 'high' ? 'high' : 'eco') as 'eco' | 'high';
    const styleOptions = {
      ...(body.styleOptions || {}),
      printDensity: body.styleOptions?.printDensity || printDensity,
    };
    const html = generatePrintHtml(sheet, styleOptions, copies);

    return NextResponse.json({
      success: true,
      html,
      copies
    });
  } catch (error: any) {
    console.error('Error generating print HTML:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
