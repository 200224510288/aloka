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

    // 2. Check footer announcement length overflow
    if (sheet.footerAnnouncement && sheet.footerAnnouncement.length > 250) {
      validationErrors.push('Footer announcement text exceeds maximum printable length (250 chars). Please shorten to avoid page overflow.');
    }

    // Only block if critical date or structural issue exists
    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        blocked: true,
        errors: validationErrors,
        error: validationErrors[0]
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
    const isServerless = error.message?.includes('SERVERLESS_BROWSER_UNAVAILABLE') || error.message?.includes('Executable doesn');
    return NextResponse.json({
      success: false,
      isServerless,
      error: isServerless
        ? "Direct PDF download requires a local browser engine. Please click 'Print Sheet' (මුද්‍රණය) -> 'Save as PDF' for instant 1-click A4 export."
        : error.message
    }, { status: isServerless ? 503 : 500 });
  }
}
