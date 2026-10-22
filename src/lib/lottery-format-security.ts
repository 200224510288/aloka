import { LotteryDefinition, LotteryResultItem, DailySheet } from '@/types/lottery';
import { STANDARD_LOTTERIES, ZODIAC_SIGNS, DAYS_OF_WEEK_SI, INITIAL_HEADER_GREETING, INITIAL_DEALER_NAME, INITIAL_FOOTER_ANNOUNCEMENT } from '@/lib/constants';
import { OfficialFetchedLottery } from '@/lib/official-lottery-fetcher';

/**
 * Normalizes Sinhala Zodiac signs to match canonical names
 */
export function normalizeZodiacName(val?: string | null): string | undefined {
  if (!val) return undefined;
  const clean = val.replace(/[\s\t\r\n\u0000]/g, '').trim();
  if (!clean) return undefined;
  if (clean.includes('කන්‍යා') || clean.includes('කනා') || clean.includes('කන') || clean.toLowerCase().includes('virgo')) {
    return 'කන්‍යා';
  }
  const match = ZODIAC_SIGNS.find(z => z.si === clean || z.en.toLowerCase() === clean.toLowerCase());
  return match ? match.si : clean;
}

/**
 * Normalizes English Letter to a single uppercase character
 */
export function normalizeLetter(val?: string | null): string | undefined {
  if (!val) return undefined;
  const clean = val.replace(/[^A-Za-z]/g, '').trim().toUpperCase();
  return clean ? clean.charAt(0) : undefined;
}

/**
 * Normalizes clean digits string
 */
export function cleanDigitsOnly(val?: string | null): string {
  if (!val) return '';
  return val.replace(/\D/g, '').trim();
}

/**
 * PER-LOTTERY FORMAT SECURITY & OVERLAP PREVENTION
 * 
 * Enforces strict per-lottery rules:
 * 1. Kapruka: Exactly 5 numbers (index 0 is boxed special number). NEVER has a bonusNumber in parens.
 * 2. Mega Power: Exactly 5 numbers (index 0 is boxed special number). NEVER has a bonusNumber in parens.
 * 3. Vasi: Exactly 3 numbers (index 2 is boxed special number). NEVER has a bonusNumber in parens.
 * 4. Bonus lotteries (Shanida Wasana, Super Ball, Lagna Wasana): Exactly 4 numbers + 1 bonusNumber in parens.
 *    Strictly prevents overlapping/duplication of the bonus number inside the numbers array!
 * 5. Tiered lotteries (Ada Sampatha, Jaya Sampatha): Exactly 3 tiered numbers (2-digit, 3-digit, 4-digit).
 * 6. Digit streams (Mahajana Sampatha, Dhana Sampatha = 6 digits; Ayubo, NLB Jaya = 4 digits).
 * 7. Non-bonus lotteries: bonusNumber is strictly wiped/undefined to prevent extra numbers at the end.
 * 8. Letter & Zodiac guards: Letters stripped if not required; Zodiac stripped if not required.
 */
export function secureFormatLotteryItem(
  rawItem: Partial<LotteryResultItem> & { superNumber?: string },
  def: LotteryDefinition
): LotteryResultItem {
  const drawNo = (rawItem.drawNo || '').trim();
  const letter = def.requiresLetter ? normalizeLetter(rawItem.letter) : undefined;
  const zodiac = def.requiresZodiac ? normalizeZodiacName(rawItem.zodiac) : undefined;

  let rawNumbers = Array.isArray(rawItem.numbers) ? [...rawItem.numbers].map(n => String(n).trim()) : [];
  // Filter out completely blank entries unless required for placeholders
  const validNumbers = rawNumbers.filter(n => n !== '');
  const candidateSuper = rawItem.superNumber || (def.hasBonusNumber ? undefined : rawItem.bonusNumber);

  let numbers: string[] = [];
  let bonusNumber: string | undefined = undefined;
  let boxedIndex: number | undefined = undefined;

  // 1. KAPRUKA: 5 numbers total (boxedIndex = 0). NEVER a bonus number.
  if (def.id === 'kapruka') {
    boxedIndex = 0;
    bonusNumber = undefined; // Kapruka MUST NOT have bonusNumber!

    if (candidateSuper && validNumbers.length === 4) {
      // e.g. regular [25, 40, 52, 60] + super 15 -> [15, 25, 40, 52, 60]
      numbers = [candidateSuper.trim(), ...validNumbers];
    } else if (validNumbers.length >= 5) {
      // If 5 numbers given, ensure boxedIndex is 0
      numbers = validNumbers.slice(0, 5);
    } else if (candidateSuper && !validNumbers.includes(candidateSuper)) {
      numbers = [candidateSuper.trim(), ...validNumbers];
    } else {
      numbers = validNumbers;
    }
    // Pad to 5 if empty
    while (numbers.length < 5 && numbers.length > 0 && numbers.length < 5) {
      numbers.push('');
    }
    if (numbers.length > 5) {
      numbers = numbers.slice(0, 5);
    }
  }

  // 2. MEGA POWER: 5 numbers total (boxedIndex = 0). NEVER a bonus number.
  else if (def.id === 'mega_power') {
    boxedIndex = 0;
    bonusNumber = undefined; // Mega Power MUST NOT have bonusNumber!

    if (candidateSuper && validNumbers.length === 4) {
      // e.g. regular [12, 25, 38, 57] + super 04 -> [04, 12, 25, 38, 57]
      numbers = [candidateSuper.trim(), ...validNumbers];
    } else if (validNumbers.length >= 5) {
      numbers = validNumbers.slice(0, 5);
    } else if (candidateSuper && !validNumbers.includes(candidateSuper)) {
      numbers = [candidateSuper.trim(), ...validNumbers];
    } else {
      numbers = validNumbers;
    }
    if (numbers.length > 5) {
      numbers = numbers.slice(0, 5);
    }
  }

  // 3. VASI: 3 numbers total (2 regular + 1 boxed special at index 2). NEVER a bonus number.
  else if (def.id === 'vasi') {
    boxedIndex = 2;
    bonusNumber = undefined; // Vasi MUST NOT have bonusNumber!

    if (candidateSuper && validNumbers.length === 2) {
      // e.g. regular [22, 80] + super 11 -> [22, 80, 11]
      numbers = [validNumbers[0], validNumbers[1], candidateSuper.trim()];
    } else if (validNumbers.length >= 3) {
      numbers = validNumbers.slice(0, 3);
    } else if (candidateSuper && !validNumbers.includes(candidateSuper)) {
      numbers = [...validNumbers, candidateSuper.trim()];
    } else {
      numbers = validNumbers;
    }
    if (numbers.length > 3) {
      numbers = numbers.slice(0, 3);
    }
  }

  // 4. LOTTERIES WITH BONUS NUMBER (Shanida Wasana, Super Ball, Lagna Wasana, Dhana Sampatha)
  else if (def.hasBonusNumber) {
    boxedIndex = undefined;
    const rawBonus = (rawItem.bonusNumber || rawItem.superNumber || '').trim();
    if (rawBonus.includes('/')) {
      const slashParts = rawBonus.split('/').map(p => p.replace(/\D/g, '').trim()).filter(Boolean);
      if (slashParts.length >= 2) {
        bonusNumber = `${slashParts[0]} / ${slashParts[1]}`;
      } else {
        const cleanBonus = cleanDigitsOnly(rawBonus);
        bonusNumber = cleanBonus ? cleanBonus : undefined;
      }
    } else {
      const cleanBonus = cleanDigitsOnly(rawBonus);
      bonusNumber = cleanBonus ? cleanBonus : undefined;
    }

    // SECURITY: Prevent overlap! Strip bonus number from regular numbers array if accidentally included
    if (bonusNumber) {
      if (bonusNumber.includes('/')) {
        const slashTokens = bonusNumber.split('/').map(t => t.trim());
        numbers = validNumbers.filter(n => !slashTokens.includes(cleanDigitsOnly(n)));
      } else {
        numbers = validNumbers.filter(n => cleanDigitsOnly(n) !== bonusNumber);
      }
    } else {
      numbers = validNumbers;
    }

    if (numbers.length > def.numberCount) {
      // If still overflowing and the last token matches bonus format, promote to bonusNumber if missing
      if (!bonusNumber && numbers.length === def.numberCount + 1) {
        bonusNumber = cleanDigitsOnly(numbers[numbers.length - 1]);
        numbers = numbers.slice(0, def.numberCount);
      } else {
        numbers = numbers.slice(0, def.numberCount);
      }
    }
  }

  // 5. TIERED DIGIT LOTTERIES (Ada Sampatha, Jaya Sampatha)
  else if (def.isTieredDigits || def.fieldType === 'tiered_digits_letter') {
    boxedIndex = undefined;
    bonusNumber = undefined;

    if (validNumbers.length === 9) {
      // Raw 9 single digits expanded to [2-digit, 3-digit, 4-digit]
      numbers = [
        validNumbers.slice(0, 2).join(''),
        validNumbers.slice(2, 5).join(''),
        validNumbers.slice(5, 9).join(''),
      ];
    } else if (validNumbers.length === 4) {
      const d4 = validNumbers.join('');
      numbers = [d4.slice(2), d4.slice(1), d4];
    } else if (validNumbers.length === 3) {
      numbers = validNumbers;
    } else {
      numbers = validNumbers.slice(0, 3);
    }
  }

  // 6. ALL OTHER STANDARD LOTTERIES (Strictly enforce def.numberCount, NO bonus number)
  else {
    boxedIndex = def.hasBoxedNumber ? (def.boxedNumberIndex ?? 0) : undefined;
    bonusNumber = undefined; // Strictly no bonus number for non-bonus lotteries!
    numbers = def.numberCount ? validNumbers.slice(0, def.numberCount) : validNumbers;
  }

  return {
    lotteryId: def.id,
    drawNo,
    letter,
    zodiac,
    numbers,
    bonusNumber,
    boxedIndex,
    isNoDraw: !!rawItem.isNoDraw,
    noDrawReason: rawItem.noDrawReason,
    isCheckedAgainstSource: rawItem.isCheckedAgainstSource ?? true,
    checkedAt: rawItem.checkedAt,
    sourceFileId: rawItem.sourceFileId,
    sourceFileName: rawItem.sourceFileName,
    sourcePage: rawItem.sourcePage,
    extractionConfidence: rawItem.extractionConfidence,
    extractionNotes: rawItem.extractionNotes,
    aiVerified: rawItem.aiVerified,
    officialVerified: rawItem.officialVerified,
    officialDiscrepancy: rawItem.officialDiscrepancy,
    officialDrawNo: rawItem.officialDrawNo,
    officialMatchedAt: rawItem.officialMatchedAt,
  };
}

/**
 * Audits a LotteryResultItem against its LotteryDefinition to catch formatting bugs and overlaps
 */
export function auditLotteryFormatSecurity(
  item: LotteryResultItem,
  def: LotteryDefinition
): {
  isValid: boolean;
  issues: string[];
  sanitized: LotteryResultItem;
} {
  const issues: string[] = [];
  const sanitized = secureFormatLotteryItem(item, def);

  // Check 1: Unexpected bonusNumber on lottery that does not have one
  if (!def.hasBonusNumber && item.bonusNumber && item.bonusNumber.trim() !== '') {
    issues.push(`Overlapping/Unexpected bonus number: "${item.bonusNumber}" is not allowed on ${def.nameEn} (${def.id}). Automatically stripped.`);
  }

  // Check 2: Bonus number duplicated inside numbers array
  if (def.hasBonusNumber && item.bonusNumber) {
    if (!item.bonusNumber.includes('/')) {
      const cleanBonus = cleanDigitsOnly(item.bonusNumber);
      if (item.numbers.some(n => cleanDigitsOnly(n) === cleanBonus)) {
        issues.push(`Duplicate bonus number overlap: "${item.bonusNumber}" appeared both in numbers and bonusNumber. Cleaned.`);
      }
    }
  }

  // Check 3: Number count mismatch
  if (def.numberCount && item.numbers.length > def.numberCount) {
    issues.push(`Number overflow: has ${item.numbers.length} numbers, maximum expected is ${def.numberCount}. Sliced.`);
  }

  // Check 4: Kapruka / Mega Power boxed index verification
  if ((def.id === 'kapruka' || def.id === 'mega_power') && item.numbers.length === 5) {
    if (item.boxedIndex !== 0) {
      issues.push(`Boxed index corrected to 0 for ${def.nameEn}.`);
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    sanitized,
  };
}

/**
 * BUILDS A 100% COMPLETE DAILY SHEET DIRECTLY FROM OFFICIAL GOVERNMENT RESULTS (NLB & DLB)
 * 
 * This is the PRIMARY way to generate or populate a sheet without requiring LKlottery raw sheets.
 */
export function buildSheetFromOfficialData(
  targetDate: string,
  officialLotteries: OfficialFetchedLottery[],
  existingSheet?: DailySheet | null
): DailySheet {
  const d = new Date(targetDate);
  const dayIdx = isNaN(d.getDay()) ? 1 : d.getDay();
  const dayName = DAYS_OF_WEEK_SI[dayIdx] || 'සඳුදා';

  const baseSheet: DailySheet = existingSheet ? { ...existingSheet } : {
    date: targetDate,
    dayOfWeekSi: dayName,
    headerGreeting: INITIAL_HEADER_GREETING,
    headerDealerName: INITIAL_DEALER_NAME,
    footerAnnouncement: INITIAL_FOOTER_ANNOUNCEMENT,
    isFooterReviewed: true,
    sources: [],
    lotteries: [],
    updatedAt: new Date().toISOString(),
  };

  const existingLotteries = baseSheet.lotteries || [];

  const builtLotteries: LotteryResultItem[] = STANDARD_LOTTERIES.map((def) => {
    const existing = existingLotteries.find(l => l.lotteryId === def.id);

    // Find official match
    const official = officialLotteries.find(o => o.matchedLotteryId === def.id) ||
      officialLotteries.find(o => {
        const normO = o.officialName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normDef = def.nameEn.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normO === normDef || def.aliases.some(a => a.toLowerCase().replace(/[^a-z0-9]/g, '') === normO);
      });

    if (official) {
      // Secure format from live official portal
      return secureFormatLotteryItem({
        lotteryId: def.id,
        drawNo: official.drawNo,
        letter: official.letter || undefined,
        zodiac: official.zodiacSi || official.zodiacEn || undefined,
        numbers: official.numbers,
        superNumber: official.superNumber || undefined,
        bonusNumber: def.hasBonusNumber ? (official.superNumber || undefined) : undefined,
        isNoDraw: false,
        isCheckedAgainstSource: true,
        officialVerified: true,
        officialDiscrepancy: undefined,
        officialDrawNo: official.drawNo,
        officialMatchedAt: new Date().toISOString(),
        extractionConfidence: 100,
        sourceFileName: `Official ${official.board} Portal (${official.board === 'DLB' ? 'dlb.lk' : 'nlb.lk'})`,
      }, def);
    }

    // If existing item has data, sanitize it with format security
    if (existing) {
      return secureFormatLotteryItem(existing, def);
    }

    // Otherwise create default empty placeholder
    return secureFormatLotteryItem({
      lotteryId: def.id,
      drawNo: '',
      numbers: def.isTieredDigits ? ['', '', ''] : Array(def.numberCount).fill(''),
      isNoDraw: false,
      isCheckedAgainstSource: false,
    }, def);
  });

  return {
    ...baseSheet,
    date: targetDate,
    dayOfWeekSi: dayName,
    lotteries: builtLotteries,
    updatedAt: new Date().toISOString(),
  };
}
