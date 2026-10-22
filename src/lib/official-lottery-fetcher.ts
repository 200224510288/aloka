import { STANDARD_LOTTERIES, ZODIAC_SIGNS } from './constants';
import { ZODIAC_PATH_MAP } from './zodiac-icons';
import { LotteryResultItem, BoardType, OfficialLotteryMatchResult, OfficialVerificationSummary } from '@/types/lottery';
import { secureFormatLotteryItem } from './lottery-format-security';
import { extractSpecialNumberFromDlbImage } from './dlb-special-extractor';


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
  zodiacImgUrl?: string | null;
  zodiacIconPath?: string | null;
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

export interface ZodiacMatchInfo {
  si: string;
  en: string;
  symbol: string;
  iconPath?: string;
}

export const ALL_ZODIAC_DEFINITIONS: ZodiacMatchInfo[] = [
  { si: 'මේෂ', en: 'Aries', symbol: '♈', iconPath: '/zodiac_standard/mesha.png' },
  { si: 'වෘෂභ', en: 'Taurus', symbol: '♉', iconPath: '/zodiac_standard/vrushabha.png' },
  { si: 'මිථුන', en: 'Gemini', symbol: '♊', iconPath: '/zodiac_standard/mithuna.png' },
  { si: 'කටක', en: 'Cancer', symbol: '♋', iconPath: '/zodiac_standard/kataka.png' },
  { si: 'සිංහ', en: 'Leo', symbol: '♌', iconPath: '/zodiac_standard/sinha.png' },
  { si: 'කන්‍යා', en: 'Virgo', symbol: '♍', iconPath: '/zodiac_standard/kanya.png' },
  { si: 'තුලා', en: 'Libra', symbol: '♎', iconPath: '/zodiac_standard/thula.png' },
  { si: 'වෘශ්චික', en: 'Scorpio', symbol: '♏', iconPath: '/zodiac_standard/vruschika.png' },
  { si: 'ධනු', en: 'Sagittarius', symbol: '♐', iconPath: '/zodiac_standard/dhanu.png' },
  { si: 'මකර', en: 'Capricorn', symbol: '♑', iconPath: '/zodiac_standard/makara.png' },
  { si: 'කුම්භ', en: 'Aquarius', symbol: '♒', iconPath: '/zodiac_standard/kumbha.png' },
  { si: 'මීන', en: 'Pisces', symbol: '♓', iconPath: '/zodiac_standard/meena.png' },
];

// Comprehensive keyword mapping covering English, Sinhala, phonetic spellings, and DLB image filenames
export const ZODIAC_KEYWORD_MAP: Record<string, ZodiacMatchInfo> = {
  // Aries
  'aries': ALL_ZODIAC_DEFINITIONS[0],
  'mesha': ALL_ZODIAC_DEFINITIONS[0],
  'mesa': ALL_ZODIAC_DEFINITIONS[0],
  'mesham': ALL_ZODIAC_DEFINITIONS[0],
  'මේෂ': ALL_ZODIAC_DEFINITIONS[0],

  // Taurus (DLB uses wushaba, wushabha, vrushaba, rushaba, etc.)
  'taurus': ALL_ZODIAC_DEFINITIONS[1],
  'wushaba': ALL_ZODIAC_DEFINITIONS[1],
  'wushabha': ALL_ZODIAC_DEFINITIONS[1],
  'vrushaba': ALL_ZODIAC_DEFINITIONS[1],
  'vrushabha': ALL_ZODIAC_DEFINITIONS[1],
  'rushaba': ALL_ZODIAC_DEFINITIONS[1],
  'rushabha': ALL_ZODIAC_DEFINITIONS[1],
  'vrishaba': ALL_ZODIAC_DEFINITIONS[1],
  'vrishabha': ALL_ZODIAC_DEFINITIONS[1],
  'rishaba': ALL_ZODIAC_DEFINITIONS[1],
  'rishabha': ALL_ZODIAC_DEFINITIONS[1],
  'wishaba': ALL_ZODIAC_DEFINITIONS[1],
  'වෘෂභ': ALL_ZODIAC_DEFINITIONS[1],

  // Gemini
  'gemini': ALL_ZODIAC_DEFINITIONS[2],
  'mithuna': ALL_ZODIAC_DEFINITIONS[2],
  'mithunam': ALL_ZODIAC_DEFINITIONS[2],
  'mituna': ALL_ZODIAC_DEFINITIONS[2],
  'mitunam': ALL_ZODIAC_DEFINITIONS[2],
  'මිථුන': ALL_ZODIAC_DEFINITIONS[2],

  // Cancer
  'cancer': ALL_ZODIAC_DEFINITIONS[3],
  'kataka': ALL_ZODIAC_DEFINITIONS[3],
  'katakam': ALL_ZODIAC_DEFINITIONS[3],
  'karkataka': ALL_ZODIAC_DEFINITIONS[3],
  'කටක': ALL_ZODIAC_DEFINITIONS[3],

  // Leo
  'leo': ALL_ZODIAC_DEFINITIONS[4],
  'sinha': ALL_ZODIAC_DEFINITIONS[4],
  'singha': ALL_ZODIAC_DEFINITIONS[4],
  'simha': ALL_ZODIAC_DEFINITIONS[4],
  'sinham': ALL_ZODIAC_DEFINITIONS[4],
  'සිංහ': ALL_ZODIAC_DEFINITIONS[4],

  // Virgo
  'virgo': ALL_ZODIAC_DEFINITIONS[5],
  'kanya': ALL_ZODIAC_DEFINITIONS[5],
  'kanyawa': ALL_ZODIAC_DEFINITIONS[5],
  'kanyaa': ALL_ZODIAC_DEFINITIONS[5],
  'කන්‍යා': ALL_ZODIAC_DEFINITIONS[5],
  'කනා': ALL_ZODIAC_DEFINITIONS[5],
  'කන': ALL_ZODIAC_DEFINITIONS[5],

  // Libra
  'libra': ALL_ZODIAC_DEFINITIONS[6],
  'thula': ALL_ZODIAC_DEFINITIONS[6],
  'thulam': ALL_ZODIAC_DEFINITIONS[6],
  'tula': ALL_ZODIAC_DEFINITIONS[6],
  'tulam': ALL_ZODIAC_DEFINITIONS[6],
  'තුලා': ALL_ZODIAC_DEFINITIONS[6],

  // Scorpio
  'scorpio': ALL_ZODIAC_DEFINITIONS[7],
  'scorpian': ALL_ZODIAC_DEFINITIONS[7],
  'vrushchika': ALL_ZODIAC_DEFINITIONS[7],
  'vrushika': ALL_ZODIAC_DEFINITIONS[7],
  'wruchika': ALL_ZODIAC_DEFINITIONS[7],
  'wrichika': ALL_ZODIAC_DEFINITIONS[7],
  'wrischika': ALL_ZODIAC_DEFINITIONS[7],
  'wrisika': ALL_ZODIAC_DEFINITIONS[7],
  'vrishchika': ALL_ZODIAC_DEFINITIONS[7],
  'vrishika': ALL_ZODIAC_DEFINITIONS[7],
  'වෘශ්චික': ALL_ZODIAC_DEFINITIONS[7],

  // Sagittarius
  'sagittarius': ALL_ZODIAC_DEFINITIONS[8],
  'dhanu': ALL_ZODIAC_DEFINITIONS[8],
  'dhanus': ALL_ZODIAC_DEFINITIONS[8],
  'ධනු': ALL_ZODIAC_DEFINITIONS[8],

  // Capricorn
  'capricorn': ALL_ZODIAC_DEFINITIONS[9],
  'makara': ALL_ZODIAC_DEFINITIONS[9],
  'makaram': ALL_ZODIAC_DEFINITIONS[9],
  'මකර': ALL_ZODIAC_DEFINITIONS[9],

  // Aquarius
  'aquarius': ALL_ZODIAC_DEFINITIONS[10],
  'kumbha': ALL_ZODIAC_DEFINITIONS[10],
  'kumbham': ALL_ZODIAC_DEFINITIONS[10],
  'kumba': ALL_ZODIAC_DEFINITIONS[10],
  'කුම්භ': ALL_ZODIAC_DEFINITIONS[10],

  // Pisces
  'pisces': ALL_ZODIAC_DEFINITIONS[11],
  'meena': ALL_ZODIAC_DEFINITIONS[11],
  'meen': ALL_ZODIAC_DEFINITIONS[11],
  'meenam': ALL_ZODIAC_DEFINITIONS[11],
  'mina': ALL_ZODIAC_DEFINITIONS[11],
  'මීන': ALL_ZODIAC_DEFINITIONS[11],
};

/**
 * Robust identification of Zodiac sign from image filenames, URLs, English/Sinhala names
 */
export function identifyZodiac(rawText?: string | null): ZodiacMatchInfo | null {
  if (!rawText) return null;
  const clean = rawText.toLowerCase().replace(/[^a-z0-9\u0D80-\u0DFF]/g, '');
  if (!clean) return null;
  if (ZODIAC_KEYWORD_MAP[clean]) {
    return ZODIAC_KEYWORD_MAP[clean];
  }
  const sortedKeys = Object.keys(ZODIAC_KEYWORD_MAP).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    if (clean.includes(k.toLowerCase())) {
      return ZODIAC_KEYWORD_MAP[k];
    }
  }
  return null;
}

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

      const matchedDef = findMatchingLottery(officialName, 'NLB');
      const isZodiacLottery = matchedDef?.requiresZodiac || officialName.toLowerCase().includes('suba');

      // Zodiac (only for lotteries that feature a Zodiac sign, e.g. Suba Dawasak)
      let zodiacDetails: ZodiacMatchInfo | null = null;
      let zodiacEn: string | null = null;
      if (isZodiacLottery) {
        const zodiacMatch = block.match(/<li[^>]*title="Zodiac"[^>]*>([\s\S]*?)<\/li>/i);
        const rawZodiac = zodiacMatch ? zodiacMatch[1].trim() : null;
        zodiacDetails = rawZodiac ? identifyZodiac(rawZodiac) : null;
        zodiacEn = zodiacDetails?.en || (rawZodiac ? rawZodiac.toUpperCase() : null);
      }

      // Super Number (Bonus)
      const superNumMatch = block.match(/<li[^>]*title="Super Number"[^>]*>([\s\S]*?)<\/li>/i);
      const superNumber = superNumMatch ? superNumMatch[1].trim() : null;

      // Winning Numbers
      const rawNumberMatches = [...block.matchAll(/<li[^>]*title="Number[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)]
        .map(m => m[1].trim());

      // For tiered lotteries (e.g. Ada Sampatha), each row on official site is 1 number:
      // Row 1 (2 balls) -> e.g. "55"
      // Row 2 (3 balls) -> e.g. "855"
      // Row 3 (4 balls) -> e.g. "4855"
      let finalNumbers = rawNumberMatches;
      if (matchedDef?.isTieredDigits || matchedDef?.fieldType === 'tiered_digits_letter') {
        if (rawNumberMatches.length === 9) {
          finalNumbers = [
            rawNumberMatches.slice(0, 2).join(''),
            rawNumberMatches.slice(2, 5).join(''),
            rawNumberMatches.slice(5, 9).join(''),
          ];
        } else if (rawNumberMatches.length === 4) {
          const d4 = rawNumberMatches.join('');
          finalNumbers = [d4.slice(2), d4.slice(1), d4];
        }
      }

      // Logo URL
      const logoMatch = block.match(/data-src="([^"]+)"/i);
      const logoUrl = logoMatch ? `https://www.nlb.lk/${logoMatch[1]}` : null;

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
        zodiacImgUrl: null,
        zodiacIconPath: zodiacDetails?.iconPath || (zodiacDetails?.si ? ZODIAC_PATH_MAP[zodiacDetails.si] : null),
        superNumber,
        numbers: finalNumbers,
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

      const matchedDef = findMatchingLottery(officialName, 'DLB');
      const isZodiacLottery = matchedDef?.requiresZodiac || officialName.toLowerCase().includes('lagna');

      // Extract Zodiac Image & Details only for lotteries that feature a Zodiac sign (Lagna Wasana)
      let zodiacDetails: ZodiacMatchInfo | null = null;
      let zodiacImgUrl: string | null = null;

      if (isZodiacLottery) {
        // 1. Scan <img> tags in currPart and ulContent
        const imgMatches = [...currPart.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
        for (const m of imgMatches) {
          const src = m[1];
          const match = identifyZodiac(src);
          if (match) {
            zodiacDetails = match;
            zodiacImgUrl = src.startsWith('http') ? src : `https://www.dlb.lk/${src.replace(/^\//, '')}`;
            break;
          }
        }

        // 2. Fallback: check text in ulContent
        if (!zodiacDetails) {
          const textMatch = identifyZodiac(ulContent);
          if (textMatch) {
            zodiacDetails = textMatch;
          }
        }
      }

      // Numbers
      const numbers = [...ulContent.matchAll(/<h6[^>]*class="[^"]*number_circle[^"]*"[^>]*>([\s\S]*?)<\/h6>/gi)]
        .map(m => m[1].trim());

      // Special number / bonus identification for specific lotteries
      let superNumber: string | null = null;
      let regularNumbers = [...numbers];

      // 1. Check for modal special draw image (Lagna Wasana, Shanida, Super Ball, Supiri Dhana Sampatha)
      const specialImgMatch = currPart.match(/<img[^>]+src=["']([^"']*SPECIAL_DRAW[^"']*)["']/i);
      
      if (specialImgMatch && matchedDef?.id) {
        const rawSrc = specialImgMatch[1];
        const specialImgUrl = rawSrc.startsWith('http') ? rawSrc : `https://www.dlb.lk/${rawSrc.replace(/^\//, '')}`;
        try {
          const extractedBonus = await extractSpecialNumberFromDlbImage(specialImgUrl, matchedDef.id);
          if (extractedBonus) {
            superNumber = extractedBonus;
          }
        } catch (e) {
          console.warn(`[DLB Fetcher] Special OCR failed for ${officialName}:`, e);
        }
      }

      // 2. For Kapruka: 5 numbers total, 1 special boxed
      // For Waasi: 3 numbers total (last is boxed)
      if (officialName.toLowerCase().includes('waasi') && regularNumbers.length === 3) {
        superNumber = regularNumbers[2];
        regularNumbers = [regularNumbers[0], regularNumbers[1]];
      } else if (officialName.toLowerCase().includes('kapruka') && regularNumbers.length === 5) {
        // Kapruka special is typically displayed with distinct style or as 5th
        superNumber = regularNumbers[4];
        regularNumbers = regularNumbers.slice(0, 4);
      }

      // For tiered lotteries (e.g. Jaya Sampatha), 1 row = 1 number:
      // If DLB gives 4 individual digits "0", "5", "1", "3", expand into the 3 tiers:
      // Tier 1 (2 digits) -> "13"
      // Tier 2 (3 digits) -> "513"
      // Tier 3 (4 digits) -> "0513"
      if (matchedDef?.isTieredDigits || matchedDef?.fieldType === 'tiered_digits_letter') {
        if (regularNumbers.length === 4) {
          const d4 = regularNumbers.join('');
          regularNumbers = [d4.slice(2), d4.slice(1), d4];
        } else if (regularNumbers.length === 9) {
          regularNumbers = [
            regularNumbers.slice(0, 2).join(''),
            regularNumbers.slice(2, 5).join(''),
            regularNumbers.slice(5, 9).join(''),
          ];
        }
      }

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
        zodiacImgUrl: zodiacImgUrl || null,
        zodiacIconPath: zodiacDetails?.iconPath || (zodiacDetails?.si ? ZODIAC_PATH_MAP[zodiacDetails.si] : null),
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
 * with full security validation and overlap prevention.
 */
export function convertOfficialToSheetRows(fetchedLotteries: OfficialFetchedLottery[]): LotteryResultItem[] {
  return fetchedLotteries.map(item => {
    const matchedDef = STANDARD_LOTTERIES.find(d => d.id === item.matchedLotteryId) ||
      findMatchingLottery(item.officialName, item.board);

    if (matchedDef) {
      return secureFormatLotteryItem({
        lotteryId: matchedDef.id,
        drawNo: item.drawNo,
        letter: item.letter || undefined,
        zodiac: item.zodiacSi || item.zodiacEn || undefined,
        numbers: item.numbers,
        superNumber: item.superNumber || undefined,
        bonusNumber: matchedDef.hasBonusNumber ? (item.superNumber || undefined) : undefined,
        isNoDraw: false,
        isCheckedAgainstSource: true,
        officialVerified: true,
        officialDrawNo: item.drawNo,
        officialMatchedAt: new Date().toISOString(),
      }, matchedDef);
    }

    return {
      lotteryId: item.matchedLotteryId || item.officialName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      drawNo: item.drawNo,
      letter: item.letter || undefined,
      zodiac: item.zodiacSi || undefined,
      numbers: item.numbers,
      bonusNumber: undefined,
      isNoDraw: false,
      isCheckedAgainstSource: true,
      officialVerified: true,
      officialDrawNo: item.drawNo,
    } as LotteryResultItem;
  });
}


/**
 * Normalizes Sinhala Zodiac signs to match canonical names
 */
function normalizeZodiacSi(val?: string | null): string {
  if (!val) return '';
  const clean = val.replace(/[\s\t\r\n\u0000]/g, '').trim();
  if (clean.includes('කන්‍යා') || clean.includes('කනා') || clean.includes('කන') || clean.toLowerCase().includes('virgo')) {
    return 'කන්‍යා';
  }
  const match = ZODIAC_SIGNS.find(z => z.si === clean || z.en.toLowerCase() === clean.toLowerCase());
  return match ? match.si : clean;
}

/**
 * Compares an array of daily sheet lotteries against live official government lotteries from NLB & DLB
 */
export function compareSheetWithOfficial(
  sheetLotteries: LotteryResultItem[],
  officialLotteries: OfficialFetchedLottery[]
): OfficialVerificationSummary {
  const results: OfficialLotteryMatchResult[] = [];
  let matchedCount = 0;
  let discrepancyCount = 0;
  let notFoundCount = 0;

  for (const def of STANDARD_LOTTERIES) {
    const sheetItem = sheetLotteries.find(l => l.lotteryId === def.id) || {
      lotteryId: def.id,
      drawNo: '',
      numbers: [],
      isNoDraw: false,
      isCheckedAgainstSource: false,
    };

    const officialItem = officialLotteries.find(o => o.matchedLotteryId === def.id)
      || officialLotteries.find(o => {
        const normO = normalizeName(o.officialName);
        return normO === normalizeName(def.nameEn) || def.aliases.some(a => normalizeName(a) === normO);
      });

    if (!officialItem) {
      notFoundCount++;
      results.push({
        lotteryId: def.id,
        nameSi: def.nameSi,
        nameEn: def.nameEn,
        board: def.board,
        officialFound: false,
        status: 'not_found',
        drawNoMatch: false,
        numbersMatch: false,
        letterMatch: false,
        zodiacMatch: false,
        bonusMatch: false,
        sheetValues: {
          drawNo: sheetItem.drawNo || '',
          letter: sheetItem.letter,
          zodiac: sheetItem.zodiac,
          numbers: sheetItem.numbers || [],
          bonusNumber: sheetItem.bonusNumber,
          isNoDraw: !!sheetItem.isNoDraw,
        },
        discrepancies: ['Not found in live results from official government portal for this date'],
      });
      continue;
    }

    const discrepancies: string[] = [];
    let drawNoMatch = true;
    let letterMatch = true;
    let zodiacMatch = true;
    let numbersMatch = true;
    let bonusMatch = true;

    // 1. Draw Number check (tolerant of leading zeroes e.g. 0906 vs 906, 0007 vs 7)
    const normSheetDraw = (sheetItem.drawNo || '').replace(/\D/g, '').replace(/^0+/, '') || '0';
    const normOfficialDraw = (officialItem.drawNo || '').replace(/\D/g, '').replace(/^0+/, '') || '0';
    if (normSheetDraw !== normOfficialDraw) {
      drawNoMatch = false;
      discrepancies.push(`Draw No: Sheet has "${sheetItem.drawNo}", Official has "${officialItem.drawNo}"`);
    }

    // 2. Letter check
    if (def.requiresLetter) {
      const sheetLetter = (sheetItem.letter || '').trim().toUpperCase();
      const officialLetter = (officialItem.letter || '').trim().toUpperCase();
      if (sheetLetter !== officialLetter) {
        letterMatch = false;
        discrepancies.push(`Letter: Sheet has "${sheetItem.letter || ''}", Official has "${officialItem.letter || ''}"`);
      }
    }

    // 3. Zodiac check
    if (def.requiresZodiac) {
      const normSheetZodiac = normalizeZodiacSi(sheetItem.zodiac);
      const normOfficialZodiac = normalizeZodiacSi(officialItem.zodiacSi || officialItem.zodiacEn);
      if (normSheetZodiac !== normOfficialZodiac) {
        zodiacMatch = false;
        discrepancies.push(`Zodiac: Sheet has "${sheetItem.zodiac || ''}", Official has "${officialItem.zodiacSi || officialItem.zodiacEn || ''}"`);
      }
    }

    // 4. Numbers check
    const sheetNums = sheetItem.numbers || [];
    const officialNums = officialItem.numbers || [];

    if (def.isTieredDigits) {
      // Ada Sampatha / Jaya Sampatha
      // "one row mean 1 number" -> e.g. ["55", "855", "4855"]
      const normalizeTiered = (arr: string[]): string[] => {
        if (arr.length === 9) {
          return [arr.slice(0, 2).join(''), arr.slice(2, 5).join(''), arr.slice(5, 9).join('')];
        }
        if (arr.length === 4) {
          const d4 = arr.join('');
          return [d4.slice(2), d4.slice(1), d4];
        }
        return arr;
      };

      const normS = normalizeTiered(sheetNums);
      const normO = normalizeTiered(officialNums);

      if (normS.join('/') !== normO.join('/')) {
        numbersMatch = false;
        discrepancies.push(`Tiered digits mismatch: Sheet has [${normS.join(' / ')}], Official has [${normO.join(' / ')}]`);
      }
    } else if (def.fieldType === 'letter_and_digits') {
      // Single-digit stream (e.g. Mahajana Sampatha 6 digits, Ayubo 4 digits, NLB Jaya 4 digits, Dhana Sampatha 6 digits)
      const sheetDigits = sheetNums.join('').replace(/\D/g, '');
      const officialDigits = officialNums.join('').replace(/\D/g, '');
      if (sheetDigits !== officialDigits) {
        numbersMatch = false;
        discrepancies.push(`Digits mismatch: Sheet has "${sheetDigits}", Official has "${officialDigits}"`);
      }
    } else if (def.id === 'mega_power' || def.id === 'kapruka' || def.id === 'vasi') {
      // Lotteries with a special boxed/super ball that may be stored in numbers or bonusNumber
      const toUniqueSortedInts = (nums: string[], bonus?: string | null) => {
        const set = new Set<number>();
        for (const n of nums) {
          const val = parseInt(n, 10);
          if (!isNaN(val)) set.add(val);
        }
        if (bonus) {
          const val = parseInt(bonus, 10);
          if (!isNaN(val)) set.add(val);
        }
        return Array.from(set).sort((a, b) => a - b);
      };

      const normS = toUniqueSortedInts(sheetNums, sheetItem.bonusNumber);
      const normO = toUniqueSortedInts(officialNums, officialItem.superNumber);

      if (normS.length !== normO.length || !normS.every((val, i) => val === normO[i])) {
        numbersMatch = false;
        discrepancies.push(`Numbers mismatch: Sheet has [${normS.join(', ')}], Official has [${normO.join(', ')}]`);
      }
    } else {
      // Standard regular 4 numbers or 3 numbers (Sasiri, Suba Dawasak)
      const normS = sheetNums.map(n => parseInt(n, 10)).filter(n => !isNaN(n));
      const normO = officialNums.map(n => parseInt(n, 10)).filter(n => !isNaN(n));
      if (normS.length !== normO.length || !normS.every((val, i) => val === normO[i])) {
        numbersMatch = false;
        discrepancies.push(`Numbers mismatch: Sheet has [${sheetNums.join(', ')}], Official has [${officialNums.join(', ')}]`);
      }
    }

    // 5. Bonus Number check (Shanida Wasana, Super Ball, Lagna Wasana, Dhana Sampatha)
    if (def.hasBonusNumber && def.id !== 'mega_power' && def.id !== 'kapruka') {
      if (officialItem.superNumber) {
        const cleanSheetBonus = (sheetItem.bonusNumber || '').replace(/[^\d/]/g, '').trim();
        const cleanOfficialBonus = (officialItem.superNumber || '').replace(/[^\d/]/g, '').trim();
        if (cleanSheetBonus && cleanOfficialBonus && cleanSheetBonus !== cleanOfficialBonus) {
          bonusMatch = false;
          discrepancies.push(`Bonus No: Sheet has "${sheetItem.bonusNumber}", Official has "${officialItem.superNumber}"`);
        }
      }
    }

    const isMatch = drawNoMatch && letterMatch && zodiacMatch && numbersMatch && bonusMatch;

    if (isMatch) {
      matchedCount++;
    } else {
      discrepancyCount++;
    }

    // Prepare suggested fix from official government result with strict security formatting
    let suggestedFix: Partial<LotteryResultItem> | undefined;
    if (!isMatch) {
      suggestedFix = secureFormatLotteryItem({
        lotteryId: def.id,
        drawNo: officialItem.drawNo || sheetItem.drawNo,
        letter: officialItem.letter || sheetItem.letter,
        zodiac: officialItem.zodiacSi || officialItem.zodiacEn || sheetItem.zodiac,
        numbers: officialNums,
        superNumber: officialItem.superNumber || undefined,
        bonusNumber: def.hasBonusNumber ? (officialItem.superNumber || sheetItem.bonusNumber) : undefined,
        isNoDraw: false,
        isCheckedAgainstSource: true,
        officialVerified: true,
        officialDrawNo: officialItem.drawNo,
        officialMatchedAt: new Date().toISOString(),
      }, def);
    }


    results.push({
      lotteryId: def.id,
      nameSi: def.nameSi,
      nameEn: def.nameEn,
      board: def.board,
      officialFound: true,
      status: isMatch ? 'match' : 'discrepancy',
      drawNoMatch,
      numbersMatch,
      letterMatch,
      zodiacMatch,
      bonusMatch,
      sheetValues: {
        drawNo: sheetItem.drawNo || '',
        letter: sheetItem.letter,
        zodiac: sheetItem.zodiac,
        numbers: sheetItem.numbers || [],
        bonusNumber: sheetItem.bonusNumber,
        isNoDraw: !!sheetItem.isNoDraw,
      },
      officialValues: {
        officialName: officialItem.officialName,
        drawNo: officialItem.drawNo,
        drawDate: officialItem.drawDate,
        letter: officialItem.letter,
        zodiacEn: officialItem.zodiacEn,
        zodiacSi: officialItem.zodiacSi,
        zodiacSymbol: officialItem.zodiacSymbol,
        zodiacImgUrl: officialItem.zodiacImgUrl,
        zodiacIconPath: officialItem.zodiacIconPath,
        numbers: officialItem.numbers,
        superNumber: officialItem.superNumber,
        board: officialItem.board,
      },
      discrepancies,
      suggestedFix,
    });
  }

  const overallStatus = discrepancyCount === 0 && notFoundCount === 0 
    ? 'all_matched' 
    : discrepancyCount > 0 
    ? 'discrepancies_found' 
    : 'partial_found';

  const summary = discrepancyCount === 0 
    ? `All ${matchedCount} lotteries 100% matched with official government portals (NLB & DLB Ground Truth).`
    : `${discrepancyCount} discrepancy found between uploaded sheet and live official government results.`;

  return {
    timestamp: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    drawDate: officialLotteries[0]?.drawDate || null,
    totalLotteries: results.length,
    matchedCount,
    discrepancyCount,
    notFoundCount,
    overallStatus,
    summary,
    results,
  };
}

/**
 * Convenience function to fetch official results live and run full verification against sheet
 */
export async function verifySheetAgainstOfficialLive(sheetLotteries: LotteryResultItem[]): Promise<OfficialVerificationSummary> {
  const officialRes = await fetchAllOfficialResults();
  return compareSheetWithOfficial(sheetLotteries, officialRes.lotteries);
}

