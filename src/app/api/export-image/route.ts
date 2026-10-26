import { NextRequest, NextResponse } from 'next/server';
import { DailySheet } from '@/types/lottery';
import { generateSingleSlipImageBuffer } from '@/lib/image-generator';

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

    // 2. Check footer announcement length
    if (sheet.footerAnnouncement && sheet.footerAnnouncement.length > 250) {
      validationErrors.push('Footer announcement text exceeds maximum printable length (250 chars).');
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        blocked: true,
        errors: validationErrors,
        error: validationErrors[0]
      }, { status: 400 });
    }

    const printDensity = (body.printDensity === 'high' ? 'high' : 'eco') as 'eco' | 'high';
    const styleOptions = {
      ...(body.styleOptions || {}),
      printDensity: body.styleOptions?.printDensity || printDensity,
    };

    const imageBuffer = await generateSingleSlipImageBuffer(sheet, styleOptions);

    return new NextResponse(imageBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="Sinhala-Lottery-Slip-${sheet.date}.png"`,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'no-store, max-age=0',
      }
    });

  } catch (error: any) {
    console.error('Image export error:', error);
    const isServerless = error.message?.includes('SERVERLESS_BROWSER_UNAVAILABLE') || error.message?.includes('Executable doesn');
    return NextResponse.json({
      success: false,
      isServerless,
      error: error.message || 'Image export failed'
    }, { status: isServerless ? 503 : 500 });
  }
}
