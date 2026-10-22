import { NextRequest, NextResponse } from 'next/server';
import { 
  fetchNlbOfficialResults, 
  fetchDlbOfficialResults, 
  fetchAllOfficialResults, 
  convertOfficialToSheetRows,
  compareSheetWithOfficial
} from '@/lib/official-lottery-fetcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function getOfficialResultsByBoard(board?: string | null, targetDate?: string | null) {
  if (board === 'dlb') {
    return await fetchDlbOfficialResults(targetDate || undefined);
  } else if (board === 'nlb') {
    return await fetchNlbOfficialResults(targetDate || undefined);
  }
  // default: all (NLB + DLB combined 18 lotteries)
  return await fetchAllOfficialResults(targetDate || undefined);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const board = searchParams.get('board')?.toLowerCase();
    const date = searchParams.get('date');

    const data = await getOfficialResultsByBoard(board, date);
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
    const { searchParams } = new URL(req.url);
    const board = body.board || searchParams.get('board')?.toLowerCase();
    const date = body.date || searchParams.get('date');

    const data = await getOfficialResultsByBoard(board, date);

    if (!data.success) {
      return NextResponse.json(data, { status: 502 });
    }

    const sheetRows = convertOfficialToSheetRows(data.lotteries);
    const comparison = Array.isArray(body.lotteries) 
      ? compareSheetWithOfficial(body.lotteries, data.lotteries)
      : undefined;

    return NextResponse.json({
      ...data,
      convertedSheetRows: sheetRows,
      comparison,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process official results' },
      { status: 500 }
    );
  }
}
