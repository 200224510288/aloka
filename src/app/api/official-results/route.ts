import { NextRequest, NextResponse } from 'next/server';
import { fetchNlbOfficialResults, convertOfficialToSheetRows } from '@/lib/official-lottery-fetcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const data = await fetchNlbOfficialResults();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch official results' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = await fetchNlbOfficialResults();

    if (!data.success) {
      return NextResponse.json(data, { status: 502 });
    }

    const sheetRows = convertOfficialToSheetRows(data.lotteries);

    return NextResponse.json({
      ...data,
      convertedSheetRows: sheetRows,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process official results' },
      { status: 500 }
    );
  }
}
