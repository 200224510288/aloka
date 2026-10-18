import { NextRequest, NextResponse } from 'next/server';
import { DailySheet } from '@/types/lottery';
import { generatePrintHtml, validateSheetForPrint } from '@/lib/html-generator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sheet: DailySheet = body.sheet;
    const copies = Math.max(1, Math.min(50, Number(body.copies) || 1));

    if (!sheet || !sheet.lotteries) {
      return NextResponse.json({ success: false, error: 'Invalid sheet payload' }, { status: 400 });
    }

    const { isValid, errors } = validateSheetForPrint(sheet);

    // If any validation errors exist, BLOCK printing!
    if (!isValid) {
      return NextResponse.json({
        success: false,
        blocked: true,
        errors,
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
