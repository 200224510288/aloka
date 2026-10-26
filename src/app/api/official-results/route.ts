import { NextRequest, NextResponse } from 'next/server';
import { 
  fetchNlbOfficialResults, 
  fetchDlbOfficialResults, 
  fetchAllOfficialResults, 
  convertOfficialToSheetRows,
  compareSheetWithOfficial
} from '@/lib/official-lottery-fetcher';
import { ocrDiagnosticInfo } from '@/lib/dlb-special-extractor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface CacheEntry {
  data: any;
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

async function getOfficialResultsByBoard(board?: string | null, targetDate?: string | null, forceRefresh = false) {
  const normBoard = board?.toLowerCase() || 'all';
  const normDate = targetDate?.trim() || 'latest';
  const cacheKey = `${normBoard}:${normDate}`;

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.data?.success) {
      return cached.data;
    }
  }

  let result;
  if (normBoard === 'dlb') {
    result = await fetchDlbOfficialResults(targetDate || undefined);
  } else if (normBoard === 'nlb') {
    result = await fetchNlbOfficialResults(targetDate || undefined);
  } else {
    // default: all (NLB + DLB combined 18 lotteries)
    result = await fetchAllOfficialResults(targetDate || undefined);
  }

  if (result.success) {
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
  }

  return result;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const board = searchParams.get('board')?.toLowerCase();
    const date = searchParams.get('date');
    const refresh = searchParams.get('refresh') === 'true' || searchParams.get('force') === 'true';

    const data = await getOfficialResultsByBoard(board, date, refresh);
    if (searchParams.get('debug') === 'true') {
      return NextResponse.json({
        ...data,
        ocrDiagnostic: ocrDiagnosticInfo,
      });
    }
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
    const refresh = body.refresh === true || searchParams.get('refresh') === 'true' || searchParams.get('force') === 'true';

    const data = await getOfficialResultsByBoard(board, date, refresh);

    // If no lotteries could be fetched at all
    if (!data.success && (!data.lotteries || data.lotteries.length === 0)) {
      return NextResponse.json(data, { status: 200 });
    }

    const sheetRows = convertOfficialToSheetRows(data.lotteries || []);
    const comparison = Array.isArray(body.lotteries) 
      ? compareSheetWithOfficial(body.lotteries, data.lotteries || [])
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
