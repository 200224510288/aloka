export type BoardType = 'DLB' | 'NLB' | 'OTHER';

export type LotteryFieldType = 
  | 'letter_and_numbers'     // e.g. D 40 52 60 70
  | 'tiered_digits_letter'   // e.g. 32 / 432 / 2432 / O
  | 'zodiac_and_numbers'     // e.g. [Icon] කන්‍යා 34 36 42 62
  | 'letter_boxed_numbers'   // e.g. Z [39] 05 47 50 55
  | 'letter_and_digits'      // e.g. O 8 0 2 4 3 2 (6 or 4 individual digits)
  | 'numbers_only'           // e.g. 17 18 43
  | 'letter_numbers_bonus'   // e.g. U 18 27 29 80 (86597)
  | 'letter_numbers_special';// e.g. F 29 84 [09]

export interface LotteryDefinition {
  id: string;
  nameSi: string;
  nameEn: string;
  board: BoardType;
  fieldType: LotteryFieldType;
  aliases: string[];
  defaultOrder: number;
  // Field requirements
  requiresLetter: boolean;
  requiresZodiac: boolean;
  numberCount: number; // e.g. 4 numbers, or 6 digits, or 3 numbers
  hasBonusNumber?: boolean; // e.g. (86597)
  hasBoxedNumber?: boolean;
  boxedNumberIndex?: number; // 0-based index or special
  isTieredDigits?: boolean; // 2-digit / 3-digit / 4-digit / Letter
  digitCounts?: number[]; // for tiered: [2, 3, 4]
}

export interface LotteryResultItem {
  lotteryId: string;
  drawNo: string; // MUST be string to preserve leading zeros like '0906', '05'
  letter?: string; // English letter e.g. 'D', 'O', 'Z'
  zodiac?: string; // Sinhala zodiac e.g. 'කන්‍යා', 'කටක', 'මේෂ'
  numbers: string[]; // Strings preserving leading zeros e.g. ['05', '47', '50', '55']
  bonusNumber?: string; // e.g. '86597'
  boxedIndex?: number; // which number or special position is boxed
  isNoDraw: boolean; // marked as no draw
  noDrawReason?: string; // e.g. 'Holiday', 'No Monday Draw'
  
  // Verification and Source tracking
  isCheckedAgainstSource: boolean; // MUST be manually confirmed
  checkedAt?: string; // timestamp
  sourceFileId?: string;
  sourceFileName?: string;
  sourcePage?: number;
  extractionConfidence?: number; // 0 to 100
  extractionNotes?: string[];
  hasConflict?: boolean;
  conflictDetails?: string;

  // AI Second Verification
  aiVerified?: boolean;
  aiDiscrepancy?: string;
  aiConfidence?: number;

  // Official Government Live Verification (NLB / DLB)
  officialVerified?: boolean;
  officialDiscrepancy?: string;
  officialDrawNo?: string;
  officialMatchedAt?: string;
}

export interface SourceDocument {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'jpg' | 'jpeg' | 'png';
  filePath: string;
  fileSize: number;
  uploadedAt: string;
  pageCount: number;
  totalFilePages?: number;
  previewImageUrl?: string;
  extractedText?: string;
  detectedDate?: string;
  status: 'uploaded' | 'processing' | 'extracted' | 'error';
  errorMessage?: string;
}

export interface DailySheet {
  date: string; // YYYY-MM-DD
  dayOfWeekSi: string; // e.g. 'සඳුදා'
  headerGreeting: string; // e.g. 'ඔබට සුබ දවසක් !'
  headerDealerName: string; // e.g. 'S.W.ඔස්මන් ද සිල්වා'
  footerAnnouncement: string; // e.g. 'ගොවි සෙත රු. ලක්ෂ දෙකහමාරක් ක් ඔස්මන් ද සිල්වා ගෙන්'
  isFooterReviewed: boolean;
  lotteries: LotteryResultItem[];
  sources: SourceDocument[];
  updatedAt: string;
  lastRevisionId?: string;
}

export interface RevisionRecord {
  id: string;
  sheetDate: string;
  timestamp: string;
  summary: string;
  changedFields: string[];
  snapshot: DailySheet;
}

export interface UnassignedExtractedRow {
  id: string;
  rawText: string;
  detectedDrawNo?: string;
  detectedNumbers: string[];
  detectedLetter?: string;
  sourceFileName: string;
  sourcePage: number;
}

export interface PreviewStyleOptions {
  printDensity?: 'eco' | 'high';
  rowHeightMm?: number; // default: 9.4mm
  lotteryNameFontSizePt?: number; // default: 10.5pt
  drawNoFontSizePt?: number; // default: 11.5pt
  resultFontSizePt?: number; // default: 17.0pt
  footerFontSizePt?: number; // default: 10.0pt
  metaFontSizePt?: number; // legacy fallback: 13.5pt
  dateFontSizePt?: number; // default: 13.5pt (independent Date & Day font size)
  dealerFontSizePt?: number; // default: 13.5pt (independent Dealer Name font size)
  dateOffsetYMm?: number; // default: 0.0mm (move Date & Day up/down)
  dealerOffsetYMm?: number; // default: 0.0mm (move Dealer Name up/down)
  bottomLayoutStyle?: 'clean' | 'boxed'; // default: 'clean' (clean inline vs rounded bordered boxes)
  contentGapMm?: number; // default: 2.2mm
  cellPaddingLeftMm?: number; // default: 2.0mm
  announcementOffsetYMm?: number; // default: 0.0mm (move announcement up/down)
  topMarginMm?: number; // default: 6.0mm (top free space above table)
  zodiacIconSizeMm?: number; // default: 5.4mm (range: 3.0mm - 8.5mm)
  showRowTick?: boolean; // default: false (option to put a verification tick mark ✓ on each row)
  rowTickPosition?: 'right' | 'after_numbers'; // default: 'right' (aligned at right edge vs after numbers)
  rowTickColor?: string; // default: '#000000' (black, green, etc.)

  // Spacing Safety & Auto-Expansion Limits
  enableSpacingSafetyLimit?: boolean; // default: true (prevents numbers from crossing or clipping the right border)
  expandShortRows?: boolean; // default: false (option to expand short rows that have plenty of space)
  shortRowsExtraGapMm?: number; // default: 2.0mm (extra spacing for short rows like Sasiri, Ayubo, Suba Dawasak)
  customRowGaps?: Record<string, number>; // optional per-lottery custom spacing overrides

  // Font Types (Family)
  lotteryNameFontFamily?: string;
  drawNoFontFamily?: string;
  resultFontFamily?: string;
  letterFontFamily?: string;
  footerFontFamily?: string;
  dateFontFamily?: string;
  dealerFontFamily?: string;

  // Bold Weights (400, 500, 600, 700, 800, 900)
  lotteryNameFontWeight?: number | string;
  drawNoFontWeight?: number | string;
  resultFontWeight?: number | string;
  letterFontWeight?: number | string;
  footerFontWeight?: number | string;
  dateFontWeight?: number | string;
  dealerFontWeight?: number | string;
}

export interface SavedCustomDesign {
  id: string;
  name: string;
  createdAt: string;
  isDefault?: boolean;
  options: PreviewStyleOptions;
}

export interface PrintSettings {
  copies: number;
  preferredPrinter?: string;
  printDensity: 'eco' | 'high';
  isDefaultSavingMode?: boolean;
}

export interface AiLotteryAuditResult {
  lotteryId: string;
  nameSi: string;
  nameEn: string;
  board: BoardType;
  status: 'verified' | 'mismatch' | 'missing_in_source' | 'unverified';
  confidence: number;
  extracted: {
    drawNo: string;
    letter?: string;
    zodiac?: string;
    numbers: string[];
    bonusNumber?: string;
    isNoDraw?: boolean;
  };
  verifiedInSource?: {
    drawNo: string;
    letter?: string;
    zodiac?: string;
    numbers: string[];
    bonusNumber?: string;
  };
  discrepancies?: string[];
  suggestedFix?: Partial<LotteryResultItem>;
  notes?: string;
}

export interface AiVerificationReport {
  timestamp: string;
  model: string;
  totalLotteries: number;
  verifiedCount: number;
  mismatchCount: number;
  missingCount: number;
  dateCheck: {
    sheetDate: string;
    detectedDateInSource?: string;
    isDateMatch: boolean;
  };
  footerAnnouncementCheck?: {
    current: string;
    detectedInSource?: string;
  };
  overallStatus: 'perfect_match' | 'discrepancies_found' | 'inconclusive';
  summary: string;
  results: AiLotteryAuditResult[];
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    remainingTokensPerMinute?: string | null;
    limitTokensPerMinute?: string | null;
  };
  officialVerification?: OfficialVerificationSummary;
}

export interface OfficialLotteryMatchResult {
  lotteryId: string;
  nameSi: string;
  nameEn: string;
  board: BoardType;
  officialFound: boolean;
  status: 'match' | 'discrepancy' | 'not_found' | 'unverified';
  drawNoMatch: boolean;
  numbersMatch: boolean;
  letterMatch: boolean;
  zodiacMatch: boolean;
  bonusMatch: boolean;
  sheetValues: {
    drawNo: string;
    letter?: string;
    zodiac?: string;
    numbers: string[];
    bonusNumber?: string;
    isNoDraw?: boolean;
  };
  officialValues?: {
    officialName: string;
    drawNo: string;
    drawDate: string;
    letter?: string | null;
    zodiacEn?: string | null;
    zodiacSi?: string | null;
    numbers: string[];
    superNumber?: string | null;
    board: BoardType;
  };
  discrepancies: string[];
  suggestedFix?: Partial<LotteryResultItem>;
}

export interface OfficialVerificationSummary {
  timestamp: string;
  fetchedAt: string;
  drawDate?: string | null;
  totalLotteries: number;
  matchedCount: number;
  discrepancyCount: number;
  notFoundCount: number;
  overallStatus: 'all_matched' | 'discrepancies_found' | 'partial_found';
  summary: string;
  results: OfficialLotteryMatchResult[];
}




