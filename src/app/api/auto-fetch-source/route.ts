import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { fetchAndExtractLkLotteryPdf, getLkLotteryCatalog } from '@/lib/lklottery-fetcher';
import { SourceDocument } from '@/types/lottery';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date')?.trim();
    const mode = searchParams.get('mode')?.trim();

    // Catalog check mode: returns available dates without downloading heavy PDF
    if (mode === 'catalog' || mode === 'check') {
      const catalog = await getLkLotteryCatalog();
      const availableDates = catalog.map(c => c.date);
      const isAvailable = date ? availableDates.includes(date) : false;
      return NextResponse.json({
        success: true,
        isAvailable,
        requestedDate: date,
        latestDate: availableDates[0] || null,
        recentDates: availableDates.slice(0, 10),
      });
    }

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'A valid date (YYYY-MM-DD) is required to fetch lottery source.' },
        { status: 400 }
      );
    }

    return await handleFetchSource(date);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to auto-fetch source PDF' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const date = (body.date || searchParams.get('date'))?.trim();

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'A valid date (YYYY-MM-DD) is required to fetch lottery source.' },
        { status: 400 }
      );
    }

    return await handleFetchSource(date);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to auto-fetch source PDF' },
      { status: 500 }
    );
  }
}

async function handleFetchSource(date: string) {
  const result = await fetchAndExtractLkLotteryPdf(date);

  if (!result.success || !result.buffer) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || `Could not find or download daily lottery sheet for ${date}`,
        date,
        availableDates: result.availableDates,
        latestDate: result.latestDate,
      },
      { status: 404 }
    );
  }

  const fileId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const sanitizedName = (result.fileName || `lklottery_${date}.pdf`).replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileBuffer = result.buffer;

  // Base64 Data URL for instant, zero-dependency browser display
  const base64Data = fileBuffer.toString('base64');
  const dataUrl = `data:application/pdf;base64,${base64Data}`;

  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  let relativeWebPath: string | null = null;

  if (!isServerless) {
    try {
      const pubDir = path.join(process.cwd(), 'public', 'uploads', date);
      if (!fs.existsSync(pubDir)) {
        fs.mkdirSync(pubDir, { recursive: true });
      }
      const pubFilePath = path.join(pubDir, `${fileId}_${sanitizedName}`);
      fs.writeFileSync(pubFilePath, fileBuffer);
      relativeWebPath = `/uploads/${date}/${fileId}_${sanitizedName}`;
    } catch (saveErr) {
      console.warn('Could not write to local uploads dir:', saveErr);
    }
  }

  const displayPath = (isServerless ? dataUrl : relativeWebPath) || dataUrl;

  const sourceDoc: SourceDocument = {
    id: fileId,
    fileName: sanitizedName,
    fileType: 'pdf',
    filePath: displayPath,
    fileSize: fileBuffer.byteLength,
    uploadedAt: new Date().toISOString(),
    pageCount: 1,
    totalFilePages: result.totalFilePages || 1,
    extractedText: result.text || '',
    detectedDate: result.extraction?.detectedDate,
    status: 'extracted',
  };

  // Save metadata to Cloud Firestore (sanitized to avoid 1MB limit and blob URLs)
  try {
    const { saveSourceDocToCloud } = await import('@/lib/cloud-service');
    const cloudDoc: SourceDocument = {
      ...sourceDoc,
      filePath: (sourceDoc.filePath.startsWith('blob:') || sourceDoc.filePath.length > 50000)
        ? '[Stored in Browser Session]'
        : sourceDoc.filePath,
      previewImageUrl: undefined,
    };
    await saveSourceDocToCloud(cloudDoc, date, {
      detectedDate: result.extraction?.detectedDate,
      matchedCount: result.extraction?.matchedLotteries?.length || 0,
      autoFetchedFrom: result.pdfUrl,
    });
  } catch (cloudErr) {
    console.warn('Cloud Firestore sync note:', cloudErr);
  }

  return NextResponse.json({
    success: true,
    date,
    sourceDoc,
    dataUrl,
    extraction: result.extraction,
    matchedCount: result.extraction?.matchedLotteries?.length || 0,
    pdfUrl: result.pdfUrl,
    availableDates: result.availableDates,
    latestDate: result.latestDate,
  });
}
