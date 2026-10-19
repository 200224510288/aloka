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
  boards?: BoardType[];
  handshakeDetails?: {
    humanToken?: string;
    responseTimeMs: number;
    htmlLength: number;
    notes?: string;
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

// Map DLB image file names to Zodiac names
const ZODIAC_DLB_MAP: Record<string, { si: string; en: string; symbol: string }> = {
  mesha: { si: 'මේෂ', en: 'Aries', symbol: '♈' },
  vrushabha: { si: 'වෘෂභ', en: 'Taurus', symbol: '♉' },
  vrushaba: { si: 'වෘෂභ', en: 'Taurus', symbol: '♉' },
  mithuna: { si: 'මිථුන', en: 'Gemini', symbol: '♊' },
  kataka: { si: 'කටක', en: 'Cancer', symbol: '♋' },
  sinha: { si: 'සිංහ', en: 'Leo', symbol: '♌' },
  kanya: { si: 'කන්‍යා', en: 'Virgo', symbol: '♍' },
  thula: { si: 'තුලා', en: 'Libra', symbol: '♎' },
  vrushchika: { si: 'වෘශ්චික', en: 'Scorpio', symbol: '♏' },
  vrushika: { si: 'වෘශ්චික', en: 'Scorpio', symbol: '♏' },
  dhanu: { si: 'ධනු', en: 'Sagittarius', symbol: '♐' },
  makara: { si: 'මකර', en: 'Capricorn', symbol: '♑' },
  kumbha: { si: 'කුම්භ', en: 'Aquarius', symbol: '♒' },
  meena: { si: 'මීන', en: 'Pisces', symbol: '♓' },
  meen: { si: 'මීන', en: 'Pisces', symbol: '♓' },
};

// Normalize names for fuzzy mapping
function normalizeName(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Match a lottery name against STANDARD_LOTTERIES
 */
function findMatchingLottery(officialName: string, boardHint: BoardType) {
  const normalizedOfficial = normalizeName(officialName);
  return STANDARD_LOTTERIES.find(def => {
    const normEn = normalizeName(def.nameEn);
    const normId = normalizeName(def.id);
    if (normalizedOfficial === normEn || normalizedOfficial === normId) return true;
    return def.aliases.some(alias => normalizeName(alias) === normalizedOfficial);
  });
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

      const matchedDef = findMatchingLottery(officialName, 'NLB');

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
        board: 'NLB',
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
      boards: ['NLB'],
      handshakeDetails: {
        humanToken,
        responseTimeMs,
        htmlLength: html.length,
        notes: '2-step cookie handshake completed',
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
      error: error.message || 'Unknown network or parsing error on NLB',
    };
  }
}

/**
 * Fetch and extract live results directly from DLB official website (https://www.dlb.lk/result/2/)
 */
export async function fetchDlbOfficialResults(): Promise<OfficialFetchResponse> {
  const startTime = Date.now();
  const targetUrl = 'https://www.dlb.lk/result/2/';

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      throw new Error(`DLB request returned HTTP status ${res.status}`);
    }

    const html = await res.text();
    const responseTimeMs = Date.now() - startTime;

    // Parse DLB lottery blocks by splitting on '<h3 class="lot_m_re_date">'
    const parts = html.split('<h3 class="lot_m_re_date">');
    const lotteries: OfficialFetchedLottery[] = [];
    let detectedDrawDate: string | null = null;

    for (let i = 1; i < parts.length; i++) {
      const prevPart = parts[i - 1];
      const currPart = parts[i];

      // Extract official lottery name from previous <h2>
      const nameMatch = [...prevPart.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].pop();
      if (!nameMatch) continue;
      const officialName = nameMatch[1].replace(/<[^>]+>/g, '').trim();

      // Extract draw number and date
      const dateMatch = currPart.match(/^\s*Draw Number\s*-\s*(\d+)\s*\|\s*([^<]+)/i);
      const drawNo = dateMatch ? dateMatch[1].trim() : '';
      const drawDate = dateMatch ? dateMatch[2].trim() : '';

      if (!detectedDrawDate && drawDate) {
        detectedDrawDate = drawDate;
      }

      // Extract results container
      const ulMatch = currPart.match(/<ul class="result_detail_result">([\s\S]*?)<\/ul>/i);
      const ulContent = ulMatch ? ulMatch[1] : '';

      // Letter
      const letterMatch = ulContent.match(/<h6 class="eng_letter">([\s\S]*?)<\/h6>/i);
      const letter = letterMatch ? letterMatch[1].trim() : null;

      // Zodiac image (e.g. 1483600185mithuna.png)
      const zodiacImgMatch = ulContent.match(/front_img\/[0-9]*([a-zA-Z]+)\.png/i);
      const zodiacKey = zodiacImgMatch ? zodiacImgMatch[1].toLowerCase() : null;
      const zodiacDetails = zodiacKey ? (ZODIAC_DLB_MAP[zodiacKey] || null) : null;

      // Numbers
      const numbers = [...ulContent.matchAll(/<h6[^>]*class="[^"]*number_circle[^"]*"[^>]*>([\s\S]*?)<\/h6>/gi)]
        .map(m => m[1].trim());

      // Special number / bonus identification for specific lotteries
      let superNumber: string | null = null;
      let regularNumbers = [...numbers];

      // For Kapruka: 5 numbers total, 1 special boxed
      // For Waasi: 3 numbers total (last is boxed)
      if (officialName.toLowerCase().includes('waasi') && regularNumbers.length === 3) {
        superNumber = regularNumbers[2];
        regularNumbers = [regularNumbers[0], regularNumbers[1]];
      } else if (officialName.toLowerCase().includes('kapruka') && regularNumbers.length === 5) {
        // Kapruka special is typically displayed with distinct style or as 5th
        superNumber = regularNumbers[4];
        regularNumbers = regularNumbers.slice(0, 4);
      }

      const matchedDef = findMatchingLottery(officialName, 'DLB');

      lotteries.push({
        officialName,
        matchedLotteryId: matchedDef ? matchedDef.id : null,
        lotteryNameSi: matchedDef?.nameSi,
        lotteryNameEn: matchedDef?.nameEn,
        drawNo,
        drawDate,
        letter,
        zodiacEn: zodiacDetails?.en || null,
        zodiacSi: zodiacDetails?.si || null,
        zodiacSymbol: zodiacDetails?.symbol || null,
        superNumber,
        numbers: regularNumbers,
        logoUrl: null,
        board: 'DLB',
        rawBlockPreview: ulContent.replace(/\s+/g, ' ').slice(0, 250),
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
      boards: ['DLB'],
      handshakeDetails: {
        responseTimeMs,
        htmlLength: html.length,
        notes: 'Direct HTTP extraction from dlb.lk/result/2/',
      },
    };
  } catch (error: any) {
    console.error('Error fetching DLB results:', error);
    return {
      success: false,
      sourceUrl: targetUrl,
      fetchedAt: new Date().toISOString(),
      drawDate: null,
      totalLotteries: 0,
      matchedCount: 0,
      lotteries: [],
      error: error.message || 'Unknown network or parsing error on DLB',
    };
  }
}

/**
 * Fetch both NLB and DLB concurrently to provide 100% full coverage (18 lotteries)
 */
export async function fetchAllOfficialResults(): Promise<OfficialFetchResponse> {
  const startTime = Date.now();
  const [nlbResult, dlbResult] = await Promise.allSettled([
    fetchNlbOfficialResults(),
    fetchDlbOfficialResults(),
  ]);

  const nlb = nlbResult.status === 'fulfilled' ? nlbResult.value : null;
  const dlb = dlbResult.status === 'fulfilled' ? dlbResult.value : null;

  const combinedLotteries: OfficialFetchedLottery[] = [];
  if (nlb?.lotteries) combinedLotteries.push(...nlb.lotteries);
  if (dlb?.lotteries) combinedLotteries.push(...dlb.lotteries);

  const matchedCount = combinedLotteries.filter(l => !!l.matchedLotteryId).length;
  const drawDate = nlb?.drawDate || dlb?.drawDate || null;

  return {
    success: combinedLotteries.length > 0,
    sourceUrl: 'https://www.nlb.lk/results & https://www.dlb.lk/result/2/',
    fetchedAt: new Date().toISOString(),
    drawDate,
    totalLotteries: combinedLotteries.length,
    matchedCount,
    lotteries: combinedLotteries,
    boards: ['NLB', 'DLB'],
    handshakeDetails: {
      responseTimeMs: Date.now() - startTime,
      htmlLength: (nlb?.handshakeDetails?.htmlLength || 0) + (dlb?.handshakeDetails?.htmlLength || 0),
      notes: `Combined NLB (${nlb?.lotteries.length || 0}) and DLB (${dlb?.lotteries.length || 0})`,
    },
  };
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
