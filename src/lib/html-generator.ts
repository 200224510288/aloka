import { DailySheet, PreviewStyleOptions } from '@/types/lottery';
import { STANDARD_LOTTERIES, DEFAULT_STYLE_OPTIONS } from './constants';
import { ZODIAC_IMAGE_MAP } from './zodiac-icons';
import { calculateRowSpacing } from './row-spacing';

/**
 * Escapes HTML characters safely for print injection
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Shared validation logic for print generation
 */
export function validateSheetForPrint(sheet: DailySheet): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!sheet || !sheet.lotteries) {
    return { isValid: false, errors: ['Invalid sheet payload'] };
  }

  // 1. Check Date
  if (!sheet.date || !/^\d{4}-\d{2}-\d{2}$/.test(sheet.date)) {
    errors.push('Valid result date is required (YYYY-MM-DD).');
  }

  // 2. Check footer announcement length overflow
  if (sheet.footerAnnouncement && sheet.footerAnnouncement.length > 250) {
    errors.push('Footer announcement text exceeds maximum printable length (250 chars). Please shorten to avoid page overflow.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Renders HTML for a single half-sheet (137.5mm x ~195mm)
 */
export function renderSingleSheet(sheet: DailySheet, isHighDensity = false, options: PreviewStyleOptions = {}): string {
  const showRowTick = options.showRowTick ?? DEFAULT_STYLE_OPTIONS.showRowTick;
  const rowTickPosition = options.rowTickPosition ?? DEFAULT_STYLE_OPTIONS.rowTickPosition;

  const rowsHtml = STANDARD_LOTTERIES.map((def) => {
    const item = sheet.lotteries.find(l => l.lotteryId === def.id) || {
      lotteryId: def.id,
      drawNo: '',
      numbers: [],
      isNoDraw: false,
      isCheckedAgainstSource: false
    };

    let resultCellHtml = '';

    if (item.isNoDraw) {
      resultCellHtml = `<span class="no-draw-tag">දිනුම් ඇදීමක් නොමැත ${item.noDrawReason ? `(${escapeHtml(item.noDrawReason)})` : ''}</span>`;
    } else {
      const rowSpacing = calculateRowSpacing(def.id, item, def, options);
      const rowGapMm = rowSpacing.gapMm;
      const parts: string[] = [];

      // Letter (e.g. D, O, Z, Y, etc.) - for tiered digits, letter is at the end
      if (item.letter && !def.isTieredDigits) {
        parts.push(`<span class="result-letter">${escapeHtml(item.letter)}</span>`);
      }

      // Zodiac standard icon & name (e.g. [Icon] කන්‍යා)
      if (item.zodiac) {
        const iconSrc = ZODIAC_IMAGE_MAP[item.zodiac] || '';
        const imgTag = iconSrc ? `<img src="${iconSrc}" class="zodiac-icon-img" alt="${escapeHtml(item.zodiac)}" />` : '';
        parts.push(`<span class="result-zodiac">${imgTag} <span>${escapeHtml(item.zodiac)}</span></span>`);
      }

      // Tiered digits (e.g. 32 / 432 / 2432 / O)
      if (def.isTieredDigits) {
        let nums = item.numbers || [];
        if (nums.length === 9) {
          nums = [
            nums.slice(0, 2).join(''),
            nums.slice(2, 5).join(''),
            nums.slice(5, 9).join(''),
          ];
        } else if (nums.length === 4) {
          const d4 = nums.join('');
          nums = [d4.slice(2), d4.slice(1), d4];
        }
        const tieredHtml = nums.map(n => `<span class="number-item">${escapeHtml(n)}</span>`).join('<span class="tiered-sep">/</span>');
        parts.push(tieredHtml);
        if (item.letter) {
          parts.push(`<span class="tiered-sep">/</span><span class="result-letter">${escapeHtml(item.letter)}</span>`);
        }
      } else {
        // Individual numbers or digits (defensively sliced to def.numberCount)
        const rawNums = item.numbers || [];
        const nums = def.numberCount ? rawNums.slice(0, def.numberCount) : rawNums;
        const numSpans = nums
          .filter(n => !(def.hasBonusNumber && item.bonusNumber && n === item.bonusNumber))
          .map((n, idx) => {
            const isBoxed = item.boxedIndex !== undefined && item.boxedIndex === idx;
            const cls = isBoxed ? 'number-item boxed-number' : 'number-item';
            return `<span class="${cls}">${escapeHtml(n)}</span>`;
          });
        parts.push(...numSpans);
      }

      // Bonus number in parentheses e.g. (86597) - STRICTLY only for lotteries that define hasBonusNumber!
      if (def.hasBonusNumber && item.bonusNumber && item.bonusNumber.trim() !== '') {
        parts.push(`<span class="bonus-number">(${escapeHtml(item.bonusNumber.trim())})</span>`);
      }

      if (showRowTick && rowTickPosition === 'right') {
        resultCellHtml = `
          <div class="result-content">
            <div class="result-numbers-wrapper" style="gap: ${rowGapMm}mm;">${parts.join('')}</div>
            <span class="row-tick-mark">✓</span>
          </div>
        `;
      } else if (showRowTick && rowTickPosition === 'after_numbers') {
        resultCellHtml = `
          <div class="result-content">
            <div class="result-numbers-wrapper" style="gap: ${rowGapMm}mm;">${parts.join('')}<span class="row-tick-mark" style="margin-left: 2mm;">✓</span></div>
          </div>
        `;
      } else {
        resultCellHtml = `<div class="result-content"><div class="result-numbers-wrapper" style="gap: ${rowGapMm}mm;">${parts.join('')}</div></div>`;
      }
    }

    return `
      <tr class="table-row">
        <td class="col-name">${escapeHtml(def.nameSi)}</td>
        <td class="col-draw">${escapeHtml(item.drawNo)}</td>
        <td class="col-result">${resultCellHtml}</td>
      </tr>
    `;
  }).join('');

  const formattedDate = (sheet.date || '').replace(/-/g, '.');

  return `
    <div class="table-container">
      <table class="lottery-table">
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>

    <div class="sheet-footer">
      <div class="footer-announcement">${escapeHtml(sheet.footerAnnouncement || '')}</div>
      <div class="footer-meta">
        <div class="meta-left">
          <span class="date-text">${escapeHtml(formattedDate)}</span>
          <span class="day-text">${escapeHtml(sheet.dayOfWeekSi || '')}</span>
        </div>
        <div class="footer-dealer">
          ${escapeHtml(sheet.headerDealerName || 'S.W.ඔස්මන් ද සිල්වා')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates the complete A4 Landscape Print Document HTML with 2 identical side-by-side copies
 * Pure function: works seamlessly on Client (in-browser iframe) AND Serverless/Node.
 */
export function generatePrintHtml(
  sheet: DailySheet,
  options: PreviewStyleOptions = {},
  copies: number = 1
): string {
  const merged: Required<Omit<PreviewStyleOptions, 'printDensity' | 'customRowGaps'>> & { printDensity: 'eco' | 'high'; customRowGaps?: Record<string, number> } = {
    ...DEFAULT_STYLE_OPTIONS,
    ...options,
    printDensity: options.printDensity || 'eco',
  };
  const isHighDensity = merged.printDensity === 'high';
  const rowHeightMm = merged.rowHeightMm ?? DEFAULT_STYLE_OPTIONS.rowHeightMm;
  const lotteryNameFontSizePt = merged.lotteryNameFontSizePt ?? DEFAULT_STYLE_OPTIONS.lotteryNameFontSizePt;
  const drawNoFontSizePt = merged.drawNoFontSizePt ?? DEFAULT_STYLE_OPTIONS.drawNoFontSizePt;
  const resultFontSizePt = merged.resultFontSizePt ?? DEFAULT_STYLE_OPTIONS.resultFontSizePt;
  const footerFontSizePt = merged.footerFontSizePt ?? DEFAULT_STYLE_OPTIONS.footerFontSizePt;
  const metaFontSizePt = merged.metaFontSizePt ?? DEFAULT_STYLE_OPTIONS.metaFontSizePt;
  const dateFontSizePt = merged.dateFontSizePt ?? metaFontSizePt;
  const dealerFontSizePt = merged.dealerFontSizePt ?? metaFontSizePt;
  const dateOffsetYMm = merged.dateOffsetYMm ?? 0.0;
  const dealerOffsetYMm = merged.dealerOffsetYMm ?? 0.0;
  const bottomLayoutStyle = merged.bottomLayoutStyle ?? 'clean';
  const contentGapMm = merged.contentGapMm ?? DEFAULT_STYLE_OPTIONS.contentGapMm;
  const cellPaddingLeftMm = merged.cellPaddingLeftMm ?? DEFAULT_STYLE_OPTIONS.cellPaddingLeftMm;
  const announcementOffsetYMm = merged.announcementOffsetYMm ?? DEFAULT_STYLE_OPTIONS.announcementOffsetYMm;
  const topMarginMm = merged.topMarginMm ?? DEFAULT_STYLE_OPTIONS.topMarginMm;
  const zodiacIconSizeMm = merged.zodiacIconSizeMm ?? DEFAULT_STYLE_OPTIONS.zodiacIconSizeMm;
  const showRowTick = merged.showRowTick ?? DEFAULT_STYLE_OPTIONS.showRowTick;
  const rowTickPosition = merged.rowTickPosition ?? DEFAULT_STYLE_OPTIONS.rowTickPosition;
  const rowTickColor = merged.rowTickColor ?? DEFAULT_STYLE_OPTIONS.rowTickColor;

  // Font Types and Bold Weights
  const lotteryNameFontFamily = merged.lotteryNameFontFamily ?? DEFAULT_STYLE_OPTIONS.lotteryNameFontFamily;
  const lotteryNameFontWeight = merged.lotteryNameFontWeight ?? DEFAULT_STYLE_OPTIONS.lotteryNameFontWeight;

  const drawNoFontFamily = merged.drawNoFontFamily ?? DEFAULT_STYLE_OPTIONS.drawNoFontFamily;
  const drawNoFontWeight = merged.drawNoFontWeight ?? DEFAULT_STYLE_OPTIONS.drawNoFontWeight;

  const resultFontFamily = merged.resultFontFamily ?? DEFAULT_STYLE_OPTIONS.resultFontFamily;
  const resultFontWeight = merged.resultFontWeight ?? (isHighDensity ? 800 : DEFAULT_STYLE_OPTIONS.resultFontWeight);

  const letterFontFamily = merged.letterFontFamily ?? DEFAULT_STYLE_OPTIONS.letterFontFamily;
  const letterFontWeight = merged.letterFontWeight ?? (isHighDensity ? 900 : DEFAULT_STYLE_OPTIONS.letterFontWeight);

  const footerFontFamily = merged.footerFontFamily ?? DEFAULT_STYLE_OPTIONS.footerFontFamily;
  const footerFontWeight = merged.footerFontWeight ?? DEFAULT_STYLE_OPTIONS.footerFontWeight;

  const dateFontFamily = merged.dateFontFamily ?? DEFAULT_STYLE_OPTIONS.dateFontFamily;
  const dateFontWeight = merged.dateFontWeight ?? DEFAULT_STYLE_OPTIONS.dateFontWeight;

  const dealerFontFamily = merged.dealerFontFamily ?? DEFAULT_STYLE_OPTIONS.dealerFontFamily;
  const dealerFontWeight = merged.dealerFontWeight ?? DEFAULT_STYLE_OPTIONS.dealerFontWeight;

  // Render single sheet content with merged options
  const singleSheetHtml = renderSingleSheet(sheet, isHighDensity, merged);

  return `<!DOCTYPE html>
<html lang="si">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sinhala Lottery Results - ${sheet.date}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+Sinhala:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/fonts/fonts.css">
  <style>
    @font-face {
      font-family: 'Inter';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url(/fonts/font_0.woff2) format('truetype');
    }
    @font-face {
      font-family: 'Inter';
      font-style: normal;
      font-weight: 600;
      font-display: swap;
      src: url(/fonts/font_2.woff2) format('truetype');
    }
    @font-face {
      font-family: 'Inter';
      font-style: normal;
      font-weight: 700;
      font-display: swap;
      src: url(/fonts/font_3.woff2) format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url(/fonts/font_4.woff2) format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 600;
      font-display: swap;
      src: url(/fonts/font_5.woff2) format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 700;
      font-display: swap;
      src: url(/fonts/font_6.woff2) format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Sinhala';
      font-style: normal;
      font-weight: 800;
      font-display: swap;
      src: url(/fonts/font_7.woff2) format('truetype');
    }

    @page {
      size: A4 landscape;
      margin: 0;
    }

    @media print {
      @page {
        size: A4 landscape;
        margin: 0;
      }
      html, body {
        width: 297mm !important;
        height: 210mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .print-page {
        width: 297mm !important;
        height: 210mm !important;
        margin: 0 auto !important;
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: 'Noto Sans Sinhala', 'Iskoola Pota', 'Nirmala UI', sans-serif;
    }

    .print-page {
      width: 297mm;
      height: 210mm;
      overflow: hidden;
      position: relative;
      page-break-after: always;
      break-after: page;
    }

    .print-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    /* Container holding 2 identical sheets side by side */
    .print-container {
      display: flex;
      flex-direction: row;
      width: 297mm;
      height: 210mm;
      margin: 0;
      padding: 0;
      position: relative;
      box-sizing: border-box;
    }

    .half-page {
      width: 148.5mm;
      height: 210mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      box-sizing: border-box;
      padding-top: ${topMarginMm}mm;
      padding-bottom: 5mm;
    }

    /* Centre cut line */
    .cut-line {
      position: absolute;
      left: 148.5mm;
      top: 6mm;
      bottom: 6mm;
      width: 20px;
      margin-left: -10px;
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      align-items: center;
      pointer-events: none;
      z-index: 10;
    }

    .cut-line::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 0;
      border-left: 1px dashed #777777;
      transform: translateX(-50%);
    }

    .cut-icon {
      font-size: 11px;
      color: #555555;
      background: #ffffff;
      padding: 2px;
      transform: rotate(90deg);
      z-index: 2;
    }

    /* Each copy occupies exactly 137.5mm width centered in its 148.5mm half */
    .sheet-copy {
      width: 137.5mm;
      height: ${Math.max(180, 205 - topMarginMm)}mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
    }

    /* Compact Table with sleek rounded corners */
    .table-container {
      width: 137.5mm;
      border: ${isHighDensity ? '1.5px' : '1.2px'} solid #2b4c7e;
      border-radius: 3.5mm;
      overflow: hidden;
      background-color: #ffffff;
    }

    .lottery-table {
      width: 100%;
      border-collapse: collapse;
      border: none;
      table-layout: fixed;
    }

    .lottery-table th,
    .lottery-table td {
      border: none;
      border-bottom: ${isHighDensity ? '1px' : '0.9px'} solid #2b4c7e;
      border-right: ${isHighDensity ? '1px' : '0.9px'} solid #2b4c7e;
      padding: 0;
      vertical-align: middle;
    }

    .lottery-table tr:last-child td {
      border-bottom: none;
    }

    .lottery-table tr td:last-child {
      border-right: none;
    }

    .col-name {
      width: 35.5mm;
      font-size: ${lotteryNameFontSizePt}pt;
      font-family: ${lotteryNameFontFamily};
      font-weight: ${lotteryNameFontWeight};
      color: #000000;
      padding-left: 1.5mm !important;
      white-space: nowrap;
      overflow: hidden;
      letter-spacing: -0.2px;
    }

    .col-draw {
      width: 13mm;
      font-size: ${drawNoFontSizePt}pt;
      font-family: ${drawNoFontFamily};
      font-weight: ${drawNoFontWeight};
      text-align: center;
      color: #000000;
    }

    .col-result {
      width: 89mm;
      font-size: ${resultFontSizePt}pt;
      font-family: ${resultFontFamily};
      font-weight: ${resultFontWeight};
      color: #000000;
      padding-left: ${cellPaddingLeftMm}mm !important;
      padding-right: 1.5mm !important;
      letter-spacing: 0.3px;
      overflow: hidden;
      white-space: nowrap;
    }

    .table-row {
      height: ${rowHeightMm}mm;
    }

    .result-content {
      display: flex;
      align-items: center;
      height: 100%;
      overflow: hidden;
      white-space: nowrap;
      width: 100%;
      ${showRowTick && rowTickPosition === 'right' ? 'justify-content: space-between;' : ''}
    }

    .result-numbers-wrapper {
      display: flex;
      align-items: center;
      gap: ${contentGapMm}mm;
      height: 100%;
      overflow: hidden;
      white-space: nowrap;
    }

    .row-tick-mark {
      font-size: ${Math.max(10, resultFontSizePt - 4)}pt;
      font-weight: 900;
      color: ${rowTickColor};
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      padding-right: 1.5mm;
      flex-shrink: 0;
      user-select: none;
    }

    .result-letter {
      font-size: ${resultFontSizePt}pt;
      font-weight: ${letterFontWeight};
      font-family: ${letterFontFamily};
      min-width: 5.5mm;
      text-align: center;
      line-height: 1;
      color: #000000;
    }

    .result-zodiac {
      display: inline-flex;
      align-items: center;
      gap: 1.8mm;
      font-size: ${Math.max(10, resultFontSizePt - 5)}pt;
      font-family: ${lotteryNameFontFamily};
      font-weight: ${lotteryNameFontWeight};
      line-height: 1;
      color: #000000;
    }

    .zodiac-icon-img {
      width: ${zodiacIconSizeMm}mm;
      height: ${zodiacIconSizeMm}mm;
      object-fit: contain;
      vertical-align: middle;
      display: inline-block;
      flex-shrink: 0;
    }

    .number-item {
      font-size: ${resultFontSizePt}pt;
      font-family: ${resultFontFamily};
      font-weight: ${resultFontWeight};
      color: #000000;
      line-height: 1;
      display: inline-block;
      letter-spacing: 0.2px;
    }

    .boxed-number {
      border: ${isHighDensity ? '2px' : '1.5px'} solid #000000;
      padding: 0.3mm 1.5mm;
      border-radius: 1px;
      font-family: ${resultFontFamily};
      font-weight: ${Math.min(900, Number(resultFontWeight) + 100)};
      line-height: 1;
    }

    .tiered-sep {
      font-size: 14pt;
      color: #222222;
      font-weight: 700;
      padding: 0 1mm;
      line-height: 1;
    }

    .bonus-number {
      font-size: 12.5pt;
      font-weight: ${resultFontWeight};
      font-family: ${resultFontFamily};
      color: #000000;
      margin-left: 1mm;
      line-height: 1;
      flex-shrink: 0;
    }

    .no-draw-tag {
      font-size: 9.5pt;
      color: #555555;
      font-style: italic;
      font-weight: 600;
    }

    /* Footer Announcement & Date */
    .sheet-footer {
      padding-top: 1.5mm;
      padding-left: 3.5mm;
      padding-right: 3.5mm;
      display: flex;
      flex-direction: column;
      gap: 1.2mm;
    }

    .footer-announcement {
      font-size: ${footerFontSizePt}pt;
      font-family: ${footerFontFamily};
      font-weight: ${footerFontWeight};
      line-height: 1.2;
      color: #000000;
      min-height: 4.5mm;
      max-height: 9mm;
      overflow: hidden;
      white-space: normal;
      position: relative;
      top: ${announcementOffsetYMm}mm;
    }

    .footer-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #000000;
      padding-top: 0.5mm;
    }

    .meta-left {
      display: inline-flex;
      align-items: center;
      gap: 3mm;
      font-size: ${dateFontSizePt}pt;
      font-weight: ${dateFontWeight};
      color: #000000;
      position: relative;
      top: ${dateOffsetYMm}mm;
      ${bottomLayoutStyle === 'boxed' ? 'border: 1.2px solid #2b4c7e; border-radius: 2.5mm; padding: 0.5mm 3mm;' : ''}
    }

    .footer-dealer {
      display: inline-flex;
      align-items: center;
      font-size: ${dealerFontSizePt}pt;
      font-family: ${dealerFontFamily};
      font-weight: ${dealerFontWeight};
      color: #000000;
      letter-spacing: -0.2px;
      text-align: right;
      position: relative;
      top: ${dealerOffsetYMm}mm;
      ${bottomLayoutStyle === 'boxed' ? 'border: 1.2px solid #2b4c7e; border-radius: 2.5mm; padding: 0.5mm 3mm;' : ''}
    }

    .date-text {
      font-family: ${dateFontFamily};
      font-weight: ${dateFontWeight};
      letter-spacing: 0.5px;
    }

    .day-text {
      font-family: ${dealerFontFamily};
      font-weight: ${dateFontWeight};
    }
  </style>
</head>
<body>
  ${Array.from({ length: Math.max(1, copies) }).map(() => `
    <div class="print-page">
      <div class="print-container">
        <div class="half-page">
          <div class="sheet-copy">
            ${singleSheetHtml}
          </div>
        </div>

        <div class="cut-line">
          <span class="cut-icon">✂</span>
          <span class="cut-icon">✂</span>
          <span class="cut-icon">✂</span>
        </div>

        <div class="half-page">
          <div class="sheet-copy">
            ${singleSheetHtml}
          </div>
        </div>
      </div>
    </div>
  `).join('')}
</body>
</html>`;
}
