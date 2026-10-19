import { LotteryDefinition, LotteryResultItem, PreviewStyleOptions } from '@/types/lottery';
import { DEFAULT_STYLE_OPTIONS } from '@/lib/constants';

export interface RowSpacingResult {
  gapMm: number;
  maxSafeGapMm: number;
  isClamped: boolean;
  isExpanded: boolean;
  isShortRow: boolean;
  isCrowded: boolean;
  totalItemsWidthMm: number;
  usableWidthMm: number;
  gapCount: number;
}

export interface SheetSpacingSummary {
  rowSpacings: Record<string, RowSpacingResult>;
  clampedCount: number;
  clampedRows: { id: string; nameSi: string; maxSafeGapMm: number }[];
  expandedCount: number;
  expandedRows: { id: string; nameSi: string; gapMm: number }[];
}

/**
 * Accurately estimates width of an element in mm inside the 89mm result cell.
 */
export function estimateItemWidthMm(
  type: 'letter' | 'zodiac' | 'number' | 'boxed_number' | 'bonus' | 'tiered',
  text: string,
  resultFontSizePt: number,
  zodiacIconSizeMm: number
): number {
  switch (type) {
    case 'letter':
      // CSS min-width: 5.5mm; Arial/Sans capital letter width ~ 0.35 * fontSizePt
      return Math.max(5.5, resultFontSizePt * 0.35);

    case 'zodiac': {
      // Icon size + gap (1.8mm) + Sinhala text
      // Sinhala text fontSize = Math.max(9.5, resultFontSizePt - 5)
      const zodiacFontSizePt = Math.max(9.5, resultFontSizePt - 5);
      const textLen = text ? text.length : 4;
      // Sinhala conjunct characters are wider than Latin
      const textWidthMm = textLen * zodiacFontSizePt * 0.22;
      return zodiacIconSizeMm + 1.8 + textWidthMm;
    }

    case 'boxed_number': {
      // Boxed number e.g. [13], [24], [05]
      // Digit width + padding (2 * 1.5mm) + border (2 * 0.4mm)
      const numDigits = text ? text.length : 2;
      const digitWidthMm = numDigits * (resultFontSizePt * 0.20);
      return digitWidthMm + 3.8;
    }

    case 'number': {
      // Regular number or single digit e.g. 07, 16, 4 or 6
      const numDigits = text ? text.length : 2;
      return Math.max(2.8, numDigits * (resultFontSizePt * 0.18));
    }

    case 'bonus': {
      // Parenthesized bonus number e.g. (53613) or (131 / 673)
      // bonusFontSize = Math.max(10, resultFontSizePt - 4.5) + ml-1 (1.0mm)
      const bonusFontSizePt = Math.max(10, resultFontSizePt - 4.5);
      const charLen = text ? text.length + 2 : 7;
      return 1.0 + (charLen * bonusFontSizePt * 0.19);
    }

    case 'tiered': {
      // E.g. 46 / 246 / 0246 / X
      const charLen = text ? text.length : 18;
      return charLen * (resultFontSizePt * 0.16);
    }

    default:
      return 5.5;
  }
}

/**
 * Computes usable cell width, element widths, and the maximum safe gap before clipping the right border.
 */
export function computeRowMetrics(
  item: LotteryResultItem | undefined,
  def: LotteryDefinition,
  options: PreviewStyleOptions = {}
): {
  usableWidthMm: number;
  totalItemsWidthMm: number;
  gapCount: number;
  maxSafeGapMm: number;
  isShortRow: boolean;
  isCrowded: boolean;
} {
  const resultFontSizePt = options.resultFontSizePt ?? DEFAULT_STYLE_OPTIONS.resultFontSizePt;
  const zodiacIconSizeMm = options.zodiacIconSizeMm ?? DEFAULT_STYLE_OPTIONS.zodiacIconSizeMm;
  const cellPaddingLeftMm = options.cellPaddingLeftMm ?? DEFAULT_STYLE_OPTIONS.cellPaddingLeftMm;
  const showRowTick = options.showRowTick ?? DEFAULT_STYLE_OPTIONS.showRowTick;
  const rowTickPosition = options.rowTickPosition ?? DEFAULT_STYLE_OPTIONS.rowTickPosition;

  // Total cell width is 89.0mm
  // Deductions:
  // - cellPaddingLeftMm (default 2.0mm)
  // - cellPaddingRight (1.5mm)
  // - rightBorderBuffer (1.5mm safety clearance to guarantee 0 border touch/cut-off)
  // - tick mark if enabled:
  //   - 'right': tick mark + right padding = ~6.0mm
  //   - 'after_numbers': tick mark with margin-left 2mm = ~6.5mm
  const tickDeduction = showRowTick ? (rowTickPosition === 'right' ? 6.0 : 6.5) : 0;
  const usableWidthMm = Math.max(30.0, 89.0 - cellPaddingLeftMm - 1.5 - 1.5 - tickDeduction);

  if (!item || item.isNoDraw) {
    return {
      usableWidthMm,
      totalItemsWidthMm: 0,
      gapCount: 1,
      maxSafeGapMm: 20.0,
      isShortRow: false,
      isCrowded: false
    };
  }

  const items: { type: 'letter' | 'zodiac' | 'number' | 'boxed_number' | 'bonus' | 'tiered'; text: string; width: number }[] = [];

  // 1. Letter (if not tiered)
  if (item.letter && !def.isTieredDigits) {
    items.push({
      type: 'letter',
      text: item.letter,
      width: estimateItemWidthMm('letter', item.letter, resultFontSizePt, zodiacIconSizeMm)
    });
  }

  // 2. Zodiac (icon + Sinhala name)
  if (item.zodiac) {
    items.push({
      type: 'zodiac',
      text: item.zodiac,
      width: estimateItemWidthMm('zodiac', item.zodiac, resultFontSizePt, zodiacIconSizeMm)
    });
  }

  // 3. Tiered digits
  if (def.isTieredDigits) {
    let nums = item.numbers || [];
    if (nums.length === 9) {
      nums = [nums.slice(0, 2).join(''), nums.slice(2, 5).join(''), nums.slice(5, 9).join('')];
    } else if (nums.length === 4) {
      const d4 = nums.join('');
      nums = [d4.slice(2), d4.slice(1), d4];
    }
    const tieredStr = nums.join('/') + (item.letter ? `/${item.letter}` : '');
    items.push({
      type: 'tiered',
      text: tieredStr,
      width: estimateItemWidthMm('tiered', tieredStr, resultFontSizePt, zodiacIconSizeMm)
    });
  } else {
    // 4. Regular / Boxed numbers
    const rawNums = item.numbers || [];
    const nums = def.numberCount ? rawNums.slice(0, def.numberCount) : rawNums;
    nums.forEach((n, idx) => {
      // Exclude bonus number if it was duplicated in numbers
      if (def.hasBonusNumber && item.bonusNumber && n === item.bonusNumber) {
        return;
      }
      const isBoxed = item.boxedIndex !== undefined && item.boxedIndex === idx;
      items.push({
        type: isBoxed ? 'boxed_number' : 'number',
        text: n,
        width: estimateItemWidthMm(isBoxed ? 'boxed_number' : 'number', n, resultFontSizePt, zodiacIconSizeMm)
      });
    });
  }

  // 5. Bonus number in parentheses
  if (item.bonusNumber) {
    items.push({
      type: 'bonus',
      text: item.bonusNumber,
      width: estimateItemWidthMm('bonus', item.bonusNumber, resultFontSizePt, zodiacIconSizeMm)
    });
  }

  const totalItemsWidthMm = items.reduce((sum, it) => sum + it.width, 0);
  const gapCount = Math.max(1, items.length - 1);
  const remainingSpaceMm = usableWidthMm - totalItemsWidthMm;

  // Max safe gap so totalItemsWidth + (gapCount * gap) <= usableWidthMm
  const rawMaxSafeGapMm = remainingSpaceMm / gapCount;
  const maxSafeGapMm = Math.max(1.0, Math.round(rawMaxSafeGapMm * 10) / 10);

  // Short rows: <= 4 items OR totalItemsWidthMm <= 32.0mm
  const isShortRow = items.length <= 4 || totalItemsWidthMm <= 32.0;
  // Crowded rows: totalItemsWidthMm >= 45.0mm (e.g. Lagna Wasana, Dhana Sampatha, Shanida Wasana)
  const isCrowded = totalItemsWidthMm >= 45.0;

  return {
    usableWidthMm,
    totalItemsWidthMm: Math.round(totalItemsWidthMm * 10) / 10,
    gapCount,
    maxSafeGapMm,
    isShortRow,
    isCrowded
  };
}

/**
 * Calculates the exact safe gap for a single lottery row.
 */
export function calculateRowSpacing(
  lotteryId: string,
  item: LotteryResultItem | undefined,
  def: LotteryDefinition,
  options: PreviewStyleOptions = {}
): RowSpacingResult {
  const baseGap = options.contentGapMm ?? DEFAULT_STYLE_OPTIONS.contentGapMm;
  const safetyEnabled = options.enableSpacingSafetyLimit ?? true;
  const expandShortRows = options.expandShortRows ?? false;
  const shortRowsExtraGapMm = options.shortRowsExtraGapMm ?? 2.0;
  const customGap = options.customRowGaps?.[lotteryId];

  const metrics = computeRowMetrics(item, def, options);

  // Determine requested target gap
  let targetGap = customGap !== undefined ? customGap : baseGap;

  // If expandShortRows is active and this row has lots of empty space, apply extra spacing
  let isExpanded = false;
  if (expandShortRows && metrics.isShortRow) {
    targetGap = Math.max(targetGap, baseGap + shortRowsExtraGapMm);
    isExpanded = true;
  }

  // Safety Limit Guard: Clamp to maxSafeGapMm if enabled to prevent right border overflow/clipping
  let finalGapMm = targetGap;
  let isClamped = false;

  if (safetyEnabled) {
    if (finalGapMm > metrics.maxSafeGapMm) {
      finalGapMm = Math.max(1.0, metrics.maxSafeGapMm);
      isClamped = true;
      isExpanded = false; // Cannot expand if clamped to safe limit
    }
  }

  return {
    gapMm: Math.round(finalGapMm * 10) / 10,
    maxSafeGapMm: metrics.maxSafeGapMm,
    isClamped,
    isExpanded,
    isShortRow: metrics.isShortRow,
    isCrowded: metrics.isCrowded,
    totalItemsWidthMm: metrics.totalItemsWidthMm,
    usableWidthMm: metrics.usableWidthMm,
    gapCount: metrics.gapCount
  };
}

/**
 * Computes spacing results and summary for all 18 lotteries on a sheet.
 */
export function getAllRowsSpacing(
  lotteries: LotteryResultItem[],
  lotteriesDef: LotteryDefinition[],
  options: PreviewStyleOptions = {}
): SheetSpacingSummary {
  const rowSpacings: Record<string, RowSpacingResult> = {};
  const clampedRows: { id: string; nameSi: string; maxSafeGapMm: number }[] = [];
  const expandedRows: { id: string; nameSi: string; gapMm: number }[] = [];

  lotteriesDef.forEach((def) => {
    const item = lotteries.find(l => l.lotteryId === def.id);
    const spacing = calculateRowSpacing(def.id, item, def, options);
    rowSpacings[def.id] = spacing;

    if (spacing.isClamped) {
      clampedRows.push({ id: def.id, nameSi: def.nameSi, maxSafeGapMm: spacing.maxSafeGapMm });
    }
    if (spacing.isExpanded) {
      expandedRows.push({ id: def.id, nameSi: def.nameSi, gapMm: spacing.gapMm });
    }
  });

  return {
    rowSpacings,
    clampedCount: clampedRows.length,
    clampedRows,
    expandedCount: expandedRows.length,
    expandedRows
  };
}
