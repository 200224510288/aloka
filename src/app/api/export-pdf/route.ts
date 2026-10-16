import { NextRequest, NextResponse } from 'next/server';
import { DailySheet } from '@/types/lottery';
import { STANDARD_LOTTERIES } from '@/lib/constants';
import { generatePdfBuffer } from '@/lib/pdf-generator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sheet: DailySheet = body.sheet;

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
      validationErrors.push('Footer prize announcement must be reviewed and confirmed before export.');
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

      // Must have required numbers filled
      if (def.isTieredDigits) {
        // Must have 3 parts
        const nums = item.numbers || [];
        if (!nums[0] || !nums[1] || !nums[2]) {
          validationErrors.push(`${def.nameSi}: All 3 tiered winning numbers must be entered.`);
        }
      } else {
        const nums = item.numbers || [];
        if (nums.length < def.numberCount || nums.slice(0, def.numberCount).some(n => !n || n.trim().length === 0)) {
          validationErrors.push(`${def.nameSi}: Requires ${def.numberCount} winning numbers/digits.`);
        }
      }

      // Must have bonus number if required
      if (def.hasBonusNumber && (!item.bonusNumber || item.bonusNumber.trim().length === 0)) {
        validationErrors.push(`${def.nameSi}: Bonus number is missing.`);
      }

      // Check conflicts
      if (item.hasConflict) {
        validationErrors.push(`${def.nameSi}: Unresolved source conflict detected.`);
      }
    }

    // 4. Check footer announcement length overflow
    if (sheet.footerAnnouncement && sheet.footerAnnouncement.length > 250) {
      validationErrors.push('Footer announcement text exceeds maximum printable length (250 chars). Please shorten to avoid page overflow.');
    }

    // If any validation errors exist, BLOCK export!
    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        blocked: true,
        errors: validationErrors,
        error: 'Export blocked: Resolve all pending reviews and required fields before downloading.'
      }, { status: 400 });
    }

    // Generate PDF buffer with custom style options
    const printDensity = (body.printDensity === 'high' ? 'high' : 'eco') as 'eco' | 'high';
    const styleOptions = {
      ...(body.styleOptions || {}),
      printDensity: body.styleOptions?.printDensity || printDensity,
    };
    const copies = Math.max(1, Math.min(50, Number(body.copies) || 1));
    const pdfBuffer = await generatePdfBuffer(sheet, styleOptions, copies);

    // Return binary PDF stream
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Sinhala-Lottery-Sheet-${sheet.date}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      }
    });

  } catch (error: any) {
    console.error('PDF export error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
