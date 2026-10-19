import { STANDARD_LOTTERIES, ZODIAC_SIGNS } from './constants';
import { LotteryResultItem, BoardType } from '@/types/lottery';

export interface OfficialFetchedLottery {
  officialName: string;
  matchedLotteryId: string | null;
  lotteryNameSi?: string;
  lotteryNameEn?: string;
  drawNo: string;
  drawDate: string;
  letter: string | null;
  zodiacEn: string | null;
  zodiacSi: string | null;
  zodiacSymbol: string | null;
  superNumber: string | null;
  numbers: string[];
  logoUrl: string | null;
  board: BoardType;
  rawBlockPreview?: string;
}

export interface OfficialFetchResponse {
  success: boolean;
  sourceUrl: string;
  fetchedAt: string;
  drawDate: string | null;
  totalLotteries: number;
  matchedCount: number;
  lotteries: OfficialFetchedLottery[];
  handshakeDetails?: {
    humanToken: string;
    responseTimeMs: number;
    htmlLength: number;
  };
  error?: string;
}

// Map English Zodiac names to Sinhala & Unicode Symbols
const ZODIAC_MAP: Record<string, { si: string; symbol: string }> = {
  ARIES: { si: 'මේෂ', symbol: '♈' },
  TAURUS: { si: 'වෘෂභ', symbol: '♉' },
  GEMINI: { si: 'මිථුන', symbol: '♊' },
  CANCER: { si: 'කටක', symbol: '♋' },
  LEO: { si: 'සිංහ', symbol: '♌' },
  VIRGO: { si: 'කන්‍යා', symbol: '♍' },
  LIBRA: { si: 'තුලා', symbol: '♎' },
  SCORPIO: { si: 'වෘශ්චික', symbol: '♏' },
  SAGITTARIUS: { si: 'ධනු', symbol: '♐' },
  CAPRICORN: { si: 'මකර', symbol: '♑' },
  AQUARIUS: { si: 'කුම්භ', symbol: '♒' },
  PISCES: { si: 'මීන', symbol: '♓' },
};

// Normalize names for fuzzy mapping
function normalizeName(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Fetch and extract live results directly from NLB official website (https://www.nlb.lk/results)
 * Handles dynamic cookie handshake ("human=...") automatically.
 */
export async function fetchNlbOfficialResults(): Promise<OfficialFetchResponse> {
  const startTime = Date.now();
  const targetUrl = 'https://www.nlb.lk/results';

  try {
    // Step 1: Initial request to obtain challenge cookie
    const res1 = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });

    if (!res1.ok) {
      throw new Error(`NLB initial request returned HTTP status ${res1.status}`);
    }

    const text1 = await res1.text();
    const tokenMatch = text1.match(/setCookie\('human',\s*'([^']+)'/i);

    if (!tokenMatch || !tokenMatch[1]) {
      throw new Error('Unable to extract session authorization token from NLB response');
    }

    const humanToken = tokenMatch[1];

    // Step 2: Request live results HTML with validated authorization cookie
    const res2 = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': targetUrl,
        'Cookie': `human=${humanToken}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });

    if (!res2.ok) {
      throw new Error(`NLB authenticated request failed with HTTP ${res2.status}`);
    }

    const html = await res2.text();
    const responseTimeMs = Date.now() - startTime;

    // Step 3: Parse lottery cards from HTML
    const blocks = html.split('<li class="lbox">').slice(1);
    const lotteries: OfficialFetchedLottery[] = [];
    let detectedDrawDate: string | null = null;

    for (const rawBlock of blocks) {
      const block = rawBlock.split('<div class="but">')[0];

      // Extract header: name, draw number, date
      const titleMatch = block.match(/<h4><span>(.*?)<\/span>\s*<span>(.*?)<\/span>\s*<span>(.*?)<\/span><\/h4>/i);
      if (!titleMatch) continue;

      const [_, rawName, rawDrawNo, rawDate] = titleMatch;
      const officialName = rawName.trim();
      const drawNo = rawDrawNo.trim();
      const drawDate = rawDate.trim();

      if (!detectedDrawDate) {
        detectedDrawDate = drawDate;
      }

      // Letter
      const letterMatch = block.match(/<li[^>]*title="Letter"[^>]*>([\s\S]*?)<\/li>/i);
      const letter = letterMatch ? letterMatch[1].trim() : null;

      // Zodiac
      const zodiacMatch = block.match(/<li[^>]*title="Zodiac"[^>]*>([\s\S]*?)<\/li>/i);
      const zodiacEn = zodiacMatch ? zodiacMatch[1].trim().toUpperCase() : null;
      const zodiacDetails = zodiacEn ? (ZODIAC_MAP[zodiacEn] || null) : null;

      // Super Number (Bonus)
      const superNumMatch = block.match(/<li[^>]*title="Super Number"[^>]*>([\s\S]*?)<\/li>/i);
      const superNumber = superNumMatch ? superNumMatch[1].trim() : null;

      // Winning Numbers
      const numberMatches = [...block.matchAll(/<li[^>]*title="Number[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)]
        .map(m => m[1].trim());

      // Logo URL
      const logoMatch = block.match(/data-src="([^"]+)"/i);
      const logoUrl = logoMatch ? `https://www.nlb.lk/${logoMatch[1]}` : null;

      // Map to internal system lottery ID
      const normalizedOfficial = normalizeName(officialName);
      const matchedDef = STANDARD_LOTTERIES.find(def => {
        const normEn = normalizeName(def.nameEn);
        const normId = normalizeName(def.id);
        if (normalizedOfficial === normEn || normalizedOfficial === normId) return true;
        return def.aliases.some(alias => normalizeName(alias) === normalizedOfficial);
      });

      lotteries.push({
        officialName,
        matchedLotteryId: matchedDef ? matchedDef.id : null,
        lotteryNameSi: matchedDef?.nameSi,
        lotteryNameEn: matchedDef?.nameEn,
        drawNo,
        drawDate,
        letter,
        zodiacEn,
        zodiacSi: zodiacDetails?.si || null,
        zodiacSymbol: zodiacDetails?.symbol || null,
        superNumber,
        numbers: numberMatches,
        logoUrl,
        board: matchedDef?.board || 'NLB',
        rawBlockPreview: block.slice(0, 300),
      });
    }

    return {
      success: true,
      sourceUrl: targetUrl,
      fetchedAt: new Date().toISOString(),
      drawDate: detectedDrawDate,
      totalLotteries: lotteries.length,
      matchedCount: lotteries.filter(l => !!l.matchedLotteryId).length,
      lotteries,
      handshakeDetails: {
        humanToken,
        responseTimeMs,
        htmlLength: html.length,
      },
    };
  } catch (error: any) {
    console.error('Error fetching NLB results:', error);
    return {
      success: false,
      sourceUrl: targetUrl,
      fetchedAt: new Date().toISOString(),
      drawDate: null,
      totalLotteries: 0,
      matchedCount: 0,
      lotteries: [],
      error: error.message || 'Unknown network or parsing error',
    };
  }
}

/**
 * Converts fetched official lotteries into standard LotteryResultItem rows for daily sheets
 */
export function convertOfficialToSheetRows(fetchedLotteries: OfficialFetchedLottery[]): Partial<LotteryResultItem>[] {
  return fetchedLotteries.map(item => {
    return {
      lotteryId: item.matchedLotteryId || item.officialName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      drawNo: item.drawNo,
      letter: item.letter || undefined,
      zodiac: item.zodiacSi || undefined,
      numbers: item.numbers,
      bonusNumber: item.superNumber || undefined,
      isNoDraw: false,
    };
  });
}
