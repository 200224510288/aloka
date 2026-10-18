import { STANDARD_LOTTERIES, ZODIAC_SIGNS } from './constants';
import { LotteryDefinition, LotteryResultItem, UnassignedExtractedRow } from '@/types/lottery';

// Legacy font mapping table for common Sinhala lottery names (Type 2 wireframe format)
const LEGACY_FONT_MAP: Record<string, string> = {
  'wo fldaám;s': 'ada_kotipathi',
  'wo fldaá': 'ada_kotipathi',
  'wo iïm;': 'ada_sampatha',
  'Ok kssOdkh': 'dhana_nidhanaya',
  'Ok ks Odkh': 'dhana_nidhanaya',
  'Ok kss': 'dhana_nidhanaya',
  'y`oyk': 'handahana',
  'yoyk': 'handahana',
  'f.dúfi;': 'govisetha',
  'f.dවි fi;': 'govisetha',
  'f.dවිfi;': 'govisetha',
  'ch iïm;': 'jaya_sampatha',
  'lmarel': 'kapruka',
  ',.ak jdikd': 'lagna_wasana',
  'uyckiïm;': 'mahajana_sampatha',
  'uyck iïm;': 'mahajana_sampatha',
  'fu.d mj¾': 'mega_power',
  'NLB ch': 'nlb_jaya',
  'NLB ch ': 'nlb_jaya',
  'iisß': 'sasiri',
  'ii sß': 'sasiri',
  'Yksod jdikd': 'shanida_wasana',
  'Yk sod jdikd': 'shanida_wasana',
  'iqn ojila': 'suba_dawasak',
  'iqm¾fnda,a': 'super_ball',
  'Ok iïm;': 'dhana_sampatha',
  'jdis': 'vasi',
  'wdfnda': 'ayubo',
  'wdfndjka': 'ayubo',
};

// Legacy zodiac strings
const LEGACY_ZODIAC_MAP: Record<string, string> = {
  'fïI': 'මේෂ',
  'fම්I': 'මේෂ',
  'jDoN': 'වෘෂභ',
  'ñhqk': 'මිථුන',
  'lgl': 'කටක',
  'isxy': 'සිංහ',
  'lkHd': 'කන්‍යා',
  ';=,d': 'තුලා',
  'jDoaÑl': 'වෘශ්චික',
  'Okq': 'ධනු',
  'mlr': 'මකර',
  'l=ïN': 'කුම්භ',
  'mSk': 'මීන',
};

export interface ExtractionResult {
  detectedDate?: string;
  detectedDaySi?: string;
  detectedFooterAnnouncement?: string;
  matchedLotteries: Partial<LotteryResultItem>[];
  unassignedRows: UnassignedExtractedRow[];
  dateMismatchWarning?: string;
  rawText: string;
}

/**
 * Cleans OCR artifacts and broken Sinhala syllables from PDF streams
 */
export function cleanSinhalaText(str: string): string {
  if (!str) return '';
  return str
    // Strip null characters, zero-width characters, and replacement chars from PDF OCR streams
    .replace(/[\u0000\uFFFD\uFEFF\u200B-\u200D]/g, '')
    // Fix broken anusvara / vowel signs separated by space from their base letter
    .replace(/([\u0D80-\u0DFF])\s+([ංඃ්ා-ෞ])/g, '$1$2')
    .replace(/([ෙ-ෛ])\s+([\u0D80-\u0DFF])/g, '$1$2')
    // Fix specific common Sinhala OCR splits
    .replace(/සි\s+ංහ/g, 'සිංහ')
    .replace(/නි\s+ධානය/g, 'නිධානය')
    .replace(/ප්‍රති\s+ඵල/g, 'ප්‍රතිඵල')
    .replace(/බ්‍ර\s+හස්/g, 'බ්‍රහස්')
    .replace(/කප්\s+රුක/g, 'කප්රුක')
    .replace(/සු\s+බ/g, 'සුබ')
    .replace(/සු\s+පර්/g, 'සුපර්')
    .replace(/සු\s+පිරි/g, 'සුපිරි')
    .replace(/ධන\s+ස\./g, 'ධන ස.')
    // Zodiac OCR and broken ligature fixes
    .replace(/වෘ\s*(?:[ශෂස]්?)?\s*චි[ක]?/g, 'වෘශ්චික')
    .replace(/වෘ\s*චික/g, 'වෘශ්චික')
    .replace(/තු\s+ලා/g, 'තුලා')
    .replace(/වෘ\s+ෂභ/g, 'වෘෂභ')
    .replace(/මි\s+ථුන/g, 'මිථුන')
    .replace(/කන්\s+යා/g, 'කන්‍යා')
    .replace(/ක\s+ටක/g, 'කටක')
    .replace(/ම\s+කර/g, 'මකර')
    .replace(/කුම්\s+භ/g, 'කුම්භ')
    .replace(/මී\s+න/g, 'මීන')
    .replace(/ධ\s+නු/g, 'ධනු');
}

/**
 * Robustly detects any of the 12 Sinhala zodiac signs even with broken ligatures,
 * missing glyphs, null bytes, spaced letters, or legacy font representations.
 */
export function detectZodiacInText(text: string): string | undefined {
  if (!text) return undefined;

  // Clean null bytes, replacement characters, zero-width characters
  const clean = text
    .replace(/[\u0000\uFFFD\uFEFF\u200B-\u200D]/g, '')
    .trim();

  // 1. Scorpio (වෘශ්චික): Matches 'වෘශ්චික', 'වෘ චික', 'වෘචික', 'වෘ ශ්චික', 'වෘෂ්චික', 'වෘස්චික', 'jDoaÑl', 'scorpio'
  if (/(?:වෘ\s*(?:[ශෂස]්?)?\s*චි[ක]?|jDoaÑl|scorpio)/i.test(clean)) {
    return 'වෘශ්චික';
  }

  // 2. Libra (තුලා): Matches 'තුලා', 'තු ලා', 'තුල', 'තු ල', ';=,d', 'libra'
  if (/(?:තු\s*ල[ා]?|;=,d|libra)/i.test(clean)) {
    return 'තුලා';
  }

  // 3. Taurus (වෘෂභ): Matches 'වෘෂභ', 'වෘ ෂභ', 'වෘශභ', 'වෘෂබ', 'jDoN', 'taurus' - MUST require [භබ]
  if (/(?:වෘ\s*[ෂශ]\s*[භබ]|jDoN|taurus)/i.test(clean)) {
    return 'වෘෂභ';
  }

  // 4. Virgo (කන්‍යා): Matches 'කන්‍යා', 'කන්යා', 'ක න්‍යා', 'කන් යා', 'lkHd', 'virgo'
  if (/(?:ක\s*(?:න\s*්|න්)\s*[\u200D]?\s*ය[ා]?|lkHd|virgo)/i.test(clean)) {
    return 'කන්‍යා';
  }

  // 5. Cancer (කටක): Matches 'කටක', 'ක ටක', 'කට ක', 'lgl', 'cancer'
  if (/(?:ක\s*ට\s*ක|lgl|cancer)/i.test(clean)) {
    return 'කටක';
  }

  // 6. Leo (සිංහ): Matches 'සිංහ', 'සි ංහ', 'සිහ', 'isxy', 'leo'
  if (/(?:සි\s*ං?\s*හ|isxy|leo)/i.test(clean)) {
    return 'සිංහ';
  }

  // 7. Aries (මේෂ): Matches 'මේෂ', 'ෙම්ෂ', 'ෙමෂ', 'මෙෂ', 'මේෂ', 'fïI', 'fම්I', 'aries'
  if (/(?:(?:ෙ\s*ම|ම\s*[ේ්ෙ]|f\s*ï)\s*[්]?\s*ෂ|fïI|fම්I|aries)/i.test(clean)) {
    return 'මේෂ';
  }

  // 8. Gemini (මිථුන): Matches 'මිථුන', 'මි ථුන', 'මිතුන', 'මිථු', 'ñhqk', 'gemini'
  if (/(?:මි\s*[ථත]\s*[ුූ]?\s*න?|ñhqk|gemini)/i.test(clean)) {
    return 'මිථුන';
  }

  // 9. Sagittarius (ධනු): Matches 'ධනු', 'ධ නු', 'දනු', 'Okq', 'sagittarius' - MUST require [ුූ] to avoid 'ධන'
  if (/(?:[ධද]\s*න[ුූ]|Okq|sagittarius)/i.test(clean)) {
    return 'ධනු';
  }

  // 10. Capricorn (මකර): Matches 'මකර', 'ම කර', 'mlr', 'capricorn'
  if (/(?:ම\s*ක\s*ර|mlr|capricorn)/i.test(clean)) {
    return 'මකර';
  }

  // 11. Aquarius (කුම්භ): Matches 'කුම්භ', 'කු ම්භ', 'කුම්බ', 'l=ïN', 'aquarius'
  if (/(?:කු\s*(?:ම\s*්\s*)?[භබ]|l=ïN|aquarius)/i.test(clean)) {
    return 'කුම්භ';
  }

  // 12. Pisces (මීන): Matches 'මීන', 'මී න', 'මින', 'mSk', 'pisces'
  if (/(?:[මීමි]\s*න|mSk|pisces)/i.test(clean)) {
    return 'මීන';
  }

  return undefined;
}

/**
 * Normalizes text to separate fused characters, e.g. Sinhala letters attached to digits:
 * 'වෘෂභ06' -> 'වෘෂභ 06', '1583/ D' -> '1583 / D'
 */
export function normalizeTextLine(line: string): string {
  return cleanSinhalaText(line)
    .replace(/([\u0D80-\u0DFFa-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([\u0D80-\u0DFFa-zA-Z])/g, '$1 $2')
    .replace(/(\d)\s*\/\s*/g, '$1 / ')
    .replace(/\/\s*([A-Za-z0-9])/g, '/ $1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Preprocesses raw OCR lines to re-assemble multi-line splits in lottery titles
 * (e.g. "සු" on line i and "බ දවසක්" on line i+1)
 */
export function preprocessExtractedLines(rawText: string): string[] {
  const rawLines = rawText
    .split(/\r?\n/)
    .map(l => cleanSinhalaText(l.trim()))
    .filter(l => l.length > 0);

  const lines: string[] = [];
  let i = 0;
  while (i < rawLines.length) {
    const curr = rawLines[i];
    const next = rawLines[i + 1];

    // Strip document title line e.g. "ලොතරැයි ප්‍රතිඵල"
    if (curr.includes('ෙලාතරැයි ප්‍රතිඵල') || curr.includes('ලොතරැයි ප්‍රතිඵල')) {
      const stripped = curr.replace(/.*(ෙලාතරැයි|ලොතරැයි)\s*ප්‍රතිඵල\s*/, '').trim();
      if (stripped.length > 0) lines.push(stripped);
      i++;
      continue;
    }

    // Merge short dangling prefix words (e.g. "සු", "සුපිරි") that have no numbers
    if (next && !/\d/.test(curr) && (curr === 'සු' || curr === 'සුපිරි' || curr.length <= 4)) {
      lines.push(cleanSinhalaText(`${curr} ${next}`));
      i += 2;
      continue;
    }

    // If curr + next matches a lottery name where curr alone does not
    if (next && !/\d/.test(curr) && !/\d{2,}/.test(next)) {
      const combined = cleanSinhalaText(`${curr} ${next}`);
      if (findLotteryIdInText(combined) && !findLotteryIdInText(curr)) {
        lines.push(combined);
        i += 2;
        continue;
      }
    }

    lines.push(curr);
    i++;
  }

  return lines;
}

/**
 * Checks if a string contains any alias matching a lottery definition
 */
export function findLotteryIdInText(text: string): string | undefined {
  // Check legacy font map first
  for (const [legacyKey, lotId] of Object.entries(LEGACY_FONT_MAP)) {
    if (text.includes(legacyKey)) return lotId;
  }
  // Check standard and Type 1 aliases
  const clean = text.toLowerCase();
  const spaceless = clean.replace(/[\s\t\.\-]/g, '');

  for (const def of STANDARD_LOTTERIES) {
    for (const alias of def.aliases) {
      const aClean = alias.toLowerCase();
      const aSpaceless = aClean.replace(/[\s\t\.\-]/g, '');
      if (clean.includes(aClean) || (aSpaceless.length >= 3 && spaceless.includes(aSpaceless))) {
        return def.id;
      }
    }
  }
  return undefined;
}

export function extractLotteryDataFromText(
  fullText: string,
  targetDate: string,
  fileName: string,
  pageNumber = 1
): ExtractionResult {
  const lines = preprocessExtractedLines(fullText);

  const matchedLotteries: Partial<LotteryResultItem>[] = [];
  const unassignedRows: UnassignedExtractedRow[] = [];
  let detectedDate: string | undefined;
  let detectedDaySi: string | undefined;
  let detectedFooterAnnouncement: string | undefined;

  // 1. Detect Date in the text (supports YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD, YYYY'MM'DD)
  const dateRegex = /\b(20\d{2})[.\/'\u2019-](0[1-9]|1[0-2])[.\/'\u2019-](0[1-9]|[12]\d|3[01])\b/;
  const dateMatch = fullText.match(dateRegex);
  if (dateMatch) {
    detectedDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }

  // 2. Detect Day of Week in Sinhala (supports standard, legacy FM, and Type 1 kombuva forms)
  if (fullText.includes('සඳුදා') || fullText.includes('i`දුod') || fullText.includes('i`ද\u0dd4od')) detectedDaySi = 'සඳුදා';
  else if (fullText.includes('අඟහරුවාදා') || fullText.includes('wx.yrejdod')) detectedDaySi = 'අඟහරුවාදා';
  else if (fullText.includes('බදාදා') || fullText.includes('nodod')) detectedDaySi = 'බදාදා';
  else if (fullText.includes('බ්‍රහස්පතින්දා') || fullText.includes('n%yiam;skaod')) detectedDaySi = 'බ්‍රහස්පතින්දා';
  else if (fullText.includes('සිකුරාදා') || fullText.includes('islqrdod')) detectedDaySi = 'සිකුරාදා';
  else if (fullText.includes('සෙනසුරාදා') || fullText.includes('ෙසනසුරාදා') || fullText.includes('fikiqrdod')) detectedDaySi = 'සෙනසුරාදා';
  else if (fullText.includes('ඉරිදා') || fullText.includes('bßod')) detectedDaySi = 'ඉරිදා';

  // 3. Process lines with lookahead chunking to support BOTH:
  //    - Type 1 (2-column stacked layout: Name on line i, results on lines i+1 / i+2)
  //    - Type 2 (3-column single-line layout: Name, Draw, Results all on line i)
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check if line looks like footer announcement
    if ((line.includes('රු.') || line.includes('re\'') || line.includes('ලක්ෂ') || line.includes(',laI')) && 
        (line.includes('ද සිල්වා') || line.includes('is,ajd') || line.includes('ගෙන්') || line.includes('f.ka'))) {
      if (!detectedFooterAnnouncement) {
        detectedFooterAnnouncement = line
          .replace(/re'/g, 'රු.')
          .replace(/,laI/g, 'ලක්ෂ')
          .replace(/folyudrula/g, 'දෙකහමාරක්')
          .replace(/Tiauka o is,ajd f\.ka/g, 'ඔස්මන් ද සිල්වා ගෙන්')
          .replace(/Tiaauka o is,ajd f\.ka/g, 'ඔස්මන් ද සිල්වා ගෙන්')
          .replace(/f\.dවි fi;/g, 'ගොවි සෙත');
      }
      i++;
      continue;
    }

    const matchedId = findLotteryIdInText(line);

    if (matchedId) {
      let combinedLine = line;
      let nextIdx = i + 1;
      const initialDigits = line.match(/\b\d+\b/g) || [];
      const def = STANDARD_LOTTERIES.find(d => d.id === matchedId);

      // If line alone doesn't have enough numbers (Type 1 multi-line format), look ahead
      if (initialDigits.length < 2) {
        while (nextIdx < lines.length) {
          const nextLine = lines[nextIdx];
          // Stop lookahead if next line is date or footer disclaimer
          if (nextLine.match(/\b20\d{2}[.\/'\u2019-]/) || nextLine.includes('©') || nextLine.includes('මණ්ඩල')) {
            break;
          }
          // Stop lookahead if next line starts another lottery definition
          if (findLotteryIdInText(nextLine)) {
            break;
          }
          combinedLine += ' ' + nextLine;
          nextIdx++;

          const currentDigits = combinedLine.match(/\b\d+\b/g) || [];
          if (currentDigits.length >= 2) {
            // For zodiac lotteries, ensure zodiac sign was also captured
            if (def?.requiresZodiac) {
              const hasZodiac = !!detectZodiacInText(combinedLine);
              if (!hasZodiac && nextIdx < lines.length && !findLotteryIdInText(lines[nextIdx])) {
                combinedLine += ' ' + lines[nextIdx];
                nextIdx++;
              }
            }
            break;
          }
        }
      }

      const parsed = parseLotteryLine(combinedLine, matchedId, fileName, pageNumber);
      if (parsed) {
        matchedLotteries.push(parsed);
        i = nextIdx;
        continue;
      }
    }

    // If line was not claimed and has multiple numbers, preserve as candidate unassigned row
    const digitTokens = line.match(/\b\d{1,5}\b/g);
    if (digitTokens && digitTokens.length >= 3 && !line.match(/\b20\d{2}[.\/'\u2019-]/) && !line.includes('©')) {
      unassignedRows.push({
        id: `unassigned_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        rawText: line,
        detectedNumbers: digitTokens,
        detectedDrawNo: digitTokens[0],
        sourceFileName: fileName,
        sourcePage: pageNumber
      });
    }

    i++;
  }

  // Check for date mismatch
  let dateMismatchWarning: string | undefined;
  if (detectedDate && targetDate && detectedDate !== targetDate) {
    dateMismatchWarning = `Uploaded file date (${detectedDate}) does not match current sheet date (${targetDate})!`;
  }

  return {
    detectedDate,
    detectedDaySi,
    detectedFooterAnnouncement,
    matchedLotteries,
    unassignedRows,
    dateMismatchWarning,
    rawText: fullText
  };
}

/**
 * Unpacks fused numbers extracted from PDF files where spaces between numbers were not preserved.
 * - For 'letter_and_digits' (e.g. Mahajana Sampatha, NLB Jaya, Ayubo, Dhana Sampatha):
 *   Splits fused tokens into individual single digits (e.g. '8299' -> ['8', '2', '9', '9'], '925934' -> ['9', '2', '5', '9', '3', '4']).
 * - For standard 2-digit lotteries:
 *   Splits even-length tokens of length >= 4 into 2-digit pairs (e.g. '15214364' -> ['15', '21', '43', '64'], '1416252756' -> ['14', '16', '25', '27', '56']).
 */
export function unpackNumberTokens(tokens: string[], def: LotteryDefinition): string[] {
  const result: string[] = [];

  for (const token of tokens) {
    if (def.fieldType === 'letter_and_digits') {
      if (token.length > 1 && /^\d+$/.test(token)) {
        result.push(...token.split(''));
      } else {
        result.push(token);
      }
    } else {
      if (token.length >= 4 && token.length % 2 === 0 && /^\d+$/.test(token)) {
        for (let j = 0; j < token.length; j += 2) {
          result.push(token.slice(j, j + 2));
        }
      } else {
        result.push(token);
      }
    }
  }

  return result;
}

export function parseLotteryLine(
  line: string,
  lotteryId: string,
  fileName: string,
  pageNumber: number
): Partial<LotteryResultItem> | null {
  const def = STANDARD_LOTTERIES.find(d => d.id === lotteryId);
  if (!def) return null;

  const normalized = normalizeTextLine(line);

  // 1. Extract English letter (usually single uppercase letter like D, O, Z, Y, N, etc.)
  // Strip board names 'NLB' and 'DLB' so they don't get misidentified as winning letters
  let letter: string | undefined;
  const lineForLetter = normalized.replace(/\b(NLB|DLB)\b/gi, ' ');
  const letterMatches = lineForLetter.match(/(?:\s|^)([A-Z])(?:\s|$)/g);
  if (letterMatches) {
    const letters = letterMatches.map(m => m.trim());
    if (letters.length > 0) {
      letter = letters[letters.length - 1];
    }
  }

  // 2. Extract Zodiac sign if lottery requires zodiac
  let zodiac: string | undefined;
  if (def.requiresZodiac) {
    zodiac = detectZodiacInText(normalized) || detectZodiacInText(line);
  }

  // 3. Extract bonus number in parentheses e.g. (86597)
  let bonusNumber: string | undefined;
  const bonusMatch = normalized.match(/\((\d{4,6})\)/);
  if (bonusMatch) {
    bonusNumber = bonusMatch[1];
  }

  // 4. Extract tiered numbers if applicable (e.g. 83 / 583 / 1583 / D or 32 / 432 / 2432 / O)
  if (def.isTieredDigits) {
    const tieredParts = normalized.split('/');
    if (tieredParts.length >= 3) {
      const p1Match = tieredParts[0].match(/\b\d{2,4}\b/g);
      const p2Match = tieredParts[1].match(/\b\d{3}\b/);
      const p3Match = tieredParts[2].match(/\b\d{4}\b/);
      const letPart = tieredParts[tieredParts.length - 1].match(/[A-Z]/);

      let drawNo = '';
      let p1 = '';
      if (p1Match) {
        if (p1Match.length >= 2) {
          drawNo = p1Match[0];
          p1 = p1Match[p1Match.length - 1];
        } else {
          p1 = p1Match[0];
        }
      }

      return {
        lotteryId,
        drawNo: drawNo || '',
        letter: letPart ? letPart[0] : (letter || ''),
        numbers: [p1, p2Match ? p2Match[0] : '', p3Match ? p3Match[0] : ''],
        isCheckedAgainstSource: true,
        sourceFileName: fileName,
        sourcePage: pageNumber,
        extractionConfidence: 98
      };
    }
  }

  // 5. Extract all digit tokens preserving leading zeros
  const digitTokens = normalized.match(/\b\d+\b/g) || [];
  if (digitTokens.length === 0) return null;

  const firstToken = digitTokens[0];
  if (!firstToken) return null;

  let drawNo = firstToken;
  let rawNumbers = digitTokens.slice(1);

  // Special slash bonus for Dhana Sampatha e.g. 593 / 784 or 5 9 3 / 7 8 4
  let isDhanaSampathaSlashBonus = false;
  let dhanaSampathaWinningDigits: string[] = [];

  if (def.id === 'dhana_sampatha' && normalized.includes('/')) {
    const slashIdx = normalized.indexOf('/');
    const beforeSlash = normalized.substring(0, slashIdx);
    const afterSlash = normalized.substring(slashIdx + 1);

    const beforeDigits = beforeSlash.match(/\b\d+\b/g) || [];
    const afterDigits = afterSlash.match(/\b\d+\b/g) || [];

    if (beforeDigits.length >= 4 && afterDigits.length >= 1) {
      isDhanaSampathaSlashBonus = true;
      drawNo = beforeDigits[0] || '';
      const afterBonusStr = afterDigits.join('');
      const beforeBonusStr = beforeDigits.slice(-3).join('');
      bonusNumber = `${beforeBonusStr} / ${afterBonusStr}`;
      dhanaSampathaWinningDigits = beforeDigits.slice(1, -3);
    }
  }

  // Handle legacy reverse order ONLY for legacy font where draw number is 3-4 digits at the end
  const lastToken = digitTokens[digitTokens.length - 1];
  const isLegacyFontLine = Object.keys(LEGACY_FONT_MAP).some(k => line.includes(k));
  if (isLegacyFontLine && digitTokens.length > 1 && firstToken.length <= 2 && lastToken && lastToken.length >= 3 && lastToken.length <= 4) {
    drawNo = lastToken;
    rawNumbers = digitTokens.slice(0, -1);
  }

  // Handle bonus numbers: either from parens or candidate bonus for lotteries that require a bonus
  if (bonusNumber && !isDhanaSampathaSlashBonus) {
    rawNumbers = rawNumbers.filter(n => n !== bonusNumber);
  } else if (def.hasBonusNumber && rawNumbers.length > 1 && !bonusNumber) {
    const candidateBonus = rawNumbers[rawNumbers.length - 1];
    if (candidateBonus && candidateBonus.length >= 4 && candidateBonus.length <= 6) {
      bonusNumber = candidateBonus;
      rawNumbers = rawNumbers.slice(0, -1);
    } else {
      // Check for spaced single-digit tokens at tail e.g. ['1', '9', '5', '2', '0']
      let tailCount = 0;
      for (let j = rawNumbers.length - 1; j >= 0; j--) {
        if (rawNumbers[j].length === 1) tailCount++;
        else break;
      }
      if (tailCount >= 4 && tailCount <= 6) {
        const tailTokens = rawNumbers.slice(rawNumbers.length - tailCount);
        bonusNumber = tailTokens.join('');
        rawNumbers = rawNumbers.slice(0, rawNumbers.length - tailCount);
      }
    }
  }

  // Unpack fused numbers (e.g. '15214364' -> ['15', '21', '43', '64'], '8299' -> ['8', '2', '9', '9'])
  let numbers = isDhanaSampathaSlashBonus
    ? dhanaSampathaWinningDigits
    : unpackNumberTokens(rawNumbers, def);

  // If bonus number was still in numbers array (in case it wasn't filtered), remove it
  if (bonusNumber && !isDhanaSampathaSlashBonus) {
    numbers = numbers.filter(n => n !== bonusNumber);
  }

  // Defensively ensure numbers list never exceeds definition numberCount
  if (def.numberCount && numbers.length > def.numberCount) {
    numbers = numbers.slice(0, def.numberCount);
  }

  // Handle boxed indices for Kapruka (index 0), Mega Power (index 0), Vasi (last index)
  let boxedIndex: number | undefined;
  if (def.id === 'kapruka' || def.id === 'mega_power') {
    boxedIndex = 0; // First number is boxed/circled e.g. (14), [16]
  } else if (def.id === 'vasi') {
    boxedIndex = numbers.length - 1; // Last number is boxed/circled e.g. (11), [09]
  }

  return {
    lotteryId,
    drawNo: drawNo || '',
    letter: letter || '',
    zodiac,
    numbers,
    bonusNumber,
    boxedIndex,
    isNoDraw: false,
    isCheckedAgainstSource: true,
    sourceFileName: fileName,
    sourcePage: pageNumber,
    extractionConfidence: 95
  };
}
