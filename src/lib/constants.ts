import { LotteryDefinition, DailySheet, PreviewStyleOptions } from '@/types/lottery';

export const DEFAULT_STYLE_OPTIONS: Required<Omit<PreviewStyleOptions, 'printDensity' | 'customRowGaps'>> & { printDensity: 'eco' | 'high'; customRowGaps?: Record<string, number> } = {
  printDensity: 'eco',
  rowHeightMm: 9.4,
  lotteryNameFontSizePt: 10.5,
  drawNoFontSizePt: 11.5,
  resultFontSizePt: 17.0,
  footerFontSizePt: 10.0,
  metaFontSizePt: 13.5,
  dateFontSizePt: 13.5,
  dealerFontSizePt: 13.5,
  dateOffsetYMm: 0.0,
  dealerOffsetYMm: 0.0,
  bottomLayoutStyle: 'clean',
  contentGapMm: 2.2,
  cellPaddingLeftMm: 2.0,
  announcementOffsetYMm: 0.0,
  topMarginMm: 6.0,
  zodiacIconSizeMm: 5.4,
  showRowTick: false,
  rowTickPosition: 'right',
  rowTickColor: '#000000',
  enableSpacingSafetyLimit: true,
  expandShortRows: false,
  shortRowsExtraGapMm: 2.0,
  customRowGaps: {},

  // Default Font Families
  lotteryNameFontFamily: "'Noto Sans Sinhala', 'Iskoola Pota', 'Nirmala UI', sans-serif",
  drawNoFontFamily: "'Consolas', 'Courier New', monospace",
  resultFontFamily: "Arial, sans-serif",
  letterFontFamily: "Arial, sans-serif",
  footerFontFamily: "'Noto Sans Sinhala', 'Iskoola Pota', 'Nirmala UI', sans-serif",
  dateFontFamily: "Arial, sans-serif",
  dealerFontFamily: "'Noto Sans Sinhala', 'Iskoola Pota', 'Nirmala UI', sans-serif",

  // Default Font Weights (Bold Weight)
  lotteryNameFontWeight: 800,
  drawNoFontWeight: 700,
  resultFontWeight: 700,
  letterFontWeight: 800,
  footerFontWeight: 700,
  dateFontWeight: 800,
  dealerFontWeight: 800,
};

export interface FontOption {
  id: string;
  label: string;
  value: string;
}

export const SINHALA_FONT_OPTIONS: FontOption[] = [
  { id: 'noto_sans', label: 'Noto Sans Sinhala (පෙරනිමි)', value: "'Noto Sans Sinhala', 'Iskoola Pota', 'Nirmala UI', sans-serif" },
  { id: 'iskoola_pota', label: 'Iskoola Pota (ඉස්කෝල පොත)', value: "'Iskoola Pota', 'Noto Sans Sinhala', 'Nirmala UI', sans-serif" },
  { id: 'nirmala_ui', label: 'Nirmala UI (නිර්මලා UI)', value: "'Nirmala UI', 'Noto Sans Sinhala', 'Iskoola Pota', sans-serif" },
  { id: 'inter_sinhala', label: 'Inter + Sinhala (නවීන)', value: "'Inter', 'Noto Sans Sinhala', sans-serif" },
  { id: 'arial_sinhala', label: 'Arial + Sinhala (ඒරියල්)', value: "Arial, 'Noto Sans Sinhala', sans-serif" },
  { id: 'system_sinhala', label: 'System UI (පද්ධති)', value: "system-ui, 'Noto Sans Sinhala', sans-serif" },
];

export const NUMBER_FONT_OPTIONS: FontOption[] = [
  { id: 'arial', label: 'Arial (Standard Clean)', value: "Arial, sans-serif" },
  { id: 'inter', label: 'Inter (Modern Sans)', value: "'Inter', sans-serif" },
  { id: 'consolas', label: 'Consolas (Monospace)', value: "'Consolas', 'Courier New', monospace" },
  { id: 'courier', label: 'Courier New (Typewriter)', value: "'Courier New', monospace" },
  { id: 'segoe_ui', label: 'Segoe UI (Windows Clean)', value: "'Segoe UI', sans-serif" },
  { id: 'trebuchet', label: 'Trebuchet MS (Humanist)', value: "'Trebuchet MS', sans-serif" },
  { id: 'impact', label: 'Impact (Heavy Poster)', value: "Impact, sans-serif" },
  { id: 'times', label: 'Times New Roman (Serif)', value: "'Times New Roman', serif" },
];

export const FONT_WEIGHT_OPTIONS = [
  { weight: 400, label: '400', name: 'Regular', sinhalaName: 'සාමාන්‍ය' },
  { weight: 500, label: '500', name: 'Medium', sinhalaName: 'මධ්‍යම' },
  { weight: 600, label: '600', name: 'Semi-Bold', sinhalaName: 'අර්ධ තද' },
  { weight: 700, label: '700', name: 'Bold', sinhalaName: 'තද' },
  { weight: 800, label: '800', name: 'Extra-Bold', sinhalaName: 'ඉතා තද' },
  { weight: 900, label: '900', name: 'Black', sinhalaName: 'අතිශය තද' },
];

export const STYLE_PRESETS: Record<string, { label: string; description: string; options: Partial<PreviewStyleOptions> }> = {
  standard: {
    label: 'Standard (සම්මත)',
    description: 'Balanced wireframe standard layout',
    options: {
      rowHeightMm: 9.4,
      lotteryNameFontSizePt: 10.5,
      drawNoFontSizePt: 11.5,
      resultFontSizePt: 17.0,
      footerFontSizePt: 10.0,
      metaFontSizePt: 13.5,
      dateFontSizePt: 13.5,
      dealerFontSizePt: 13.5,
      dateOffsetYMm: 0.0,
      dealerOffsetYMm: 0.0,
      bottomLayoutStyle: 'clean',
      contentGapMm: 2.2,
      cellPaddingLeftMm: 2.0,
      announcementOffsetYMm: 0.0,
      topMarginMm: 6.0,
      zodiacIconSizeMm: 5.4,
      showRowTick: false,
      rowTickPosition: 'right',
      rowTickColor: '#000000',
      enableSpacingSafetyLimit: true,
      expandShortRows: false,
      shortRowsExtraGapMm: 2.0,
      lotteryNameFontFamily: "'Noto Sans Sinhala', 'Iskoola Pota', 'Nirmala UI', sans-serif",
      drawNoFontFamily: "'Consolas', 'Courier New', monospace",
      resultFontFamily: "Arial, sans-serif",
      letterFontFamily: "Arial, sans-serif",
      footerFontFamily: "'Noto Sans Sinhala', 'Iskoola Pota', 'Nirmala UI', sans-serif",
      dateFontFamily: "Arial, sans-serif",
      dealerFontFamily: "'Noto Sans Sinhala', 'Iskoola Pota', 'Nirmala UI', sans-serif",
      lotteryNameFontWeight: 800,
      drawNoFontWeight: 700,
      resultFontWeight: 700,
      letterFontWeight: 800,
      footerFontWeight: 700,
      dateFontWeight: 800,
      dealerFontWeight: 800,
    }
  },
  compact: {
    label: 'Compact (සංයුක්ත)',
    description: 'Reduced heights and tighter spacing',
    options: {
      rowHeightMm: 8.8,
      lotteryNameFontSizePt: 9.5,
      drawNoFontSizePt: 10.5,
      resultFontSizePt: 15.5,
      footerFontSizePt: 9.5,
      metaFontSizePt: 12.5,
      dateFontSizePt: 12.5,
      dealerFontSizePt: 12.5,
      dateOffsetYMm: 0.0,
      dealerOffsetYMm: 0.0,
      bottomLayoutStyle: 'clean',
      contentGapMm: 1.8,
      cellPaddingLeftMm: 1.5,
      announcementOffsetYMm: 0.0,
      topMarginMm: 5.0,
      zodiacIconSizeMm: 4.8,
      showRowTick: false,
      rowTickPosition: 'right',
      rowTickColor: '#000000',
      enableSpacingSafetyLimit: true,
      expandShortRows: false,
      shortRowsExtraGapMm: 1.5,
      lotteryNameFontWeight: 700,
      drawNoFontWeight: 600,
      resultFontWeight: 600,
      letterFontWeight: 700,
      footerFontWeight: 600,
      dateFontWeight: 700,
      dealerFontWeight: 700,
    }
  },
  large: {
    label: 'Large & Bold (පැහැදිලි)',
    description: 'Maximized font sizes for clarity',
    options: {
      rowHeightMm: 9.8,
      lotteryNameFontSizePt: 11.0,
      drawNoFontSizePt: 12.0,
      resultFontSizePt: 18.0,
      footerFontSizePt: 10.5,
      metaFontSizePt: 14.0,
      dateFontSizePt: 14.0,
      dealerFontSizePt: 14.0,
      dateOffsetYMm: 0.0,
      dealerOffsetYMm: 0.0,
      bottomLayoutStyle: 'clean',
      contentGapMm: 2.5,
      cellPaddingLeftMm: 2.2,
      announcementOffsetYMm: 0.0,
      topMarginMm: 5.0,
      zodiacIconSizeMm: 6.0,
      showRowTick: false,
      rowTickPosition: 'right',
      rowTickColor: '#000000',
      enableSpacingSafetyLimit: true,
      expandShortRows: false,
      shortRowsExtraGapMm: 2.0,
      lotteryNameFontWeight: 900,
      drawNoFontWeight: 800,
      resultFontWeight: 800,
      letterFontWeight: 900,
      footerFontWeight: 800,
      dateFontWeight: 900,
      dealerFontWeight: 900,
    }
  }
};

export const ZODIAC_SIGNS = [
  { si: 'මේෂ', en: 'Aries', symbol: '♈' },
  { si: 'වෘෂභ', en: 'Taurus', symbol: '♉' },
  { si: 'මිථුන', en: 'Gemini', symbol: '♊' },
  { si: 'කටක', en: 'Cancer', symbol: '♋' },
  { si: 'සිංහ', en: 'Leo', symbol: '♌' },
  { si: 'කන්‍යා', en: 'Virgo', symbol: '♍' },
  { si: 'තුලා', en: 'Libra', symbol: '♎' },
  { si: 'වෘශ්චික', en: 'Scorpio', symbol: '♏' },
  { si: 'ධනු', en: 'Sagittarius', symbol: '♐' },
  { si: 'මකර', en: 'Capricorn', symbol: '♑' },
  { si: 'කුම්භ', en: 'Aquarius', symbol: '♒' },
  { si: 'මීන', en: 'Pisces', symbol: '♓' },
] as const;

export const DAYS_OF_WEEK_SI = [
  'ඉරිදා',       // Sunday (0)
  'සඳුදා',       // Monday (1)
  'අඟහරුවාදා',  // Tuesday (2)
  'බදාදා',       // Wednesday (3)
  'බ්‍රහස්පතින්දා',// Thursday (4)
  'සිකුරාදා',     // Friday (5)
  'සෙනසුරාදා',   // Saturday (6)
];

export const STANDARD_LOTTERIES: LotteryDefinition[] = [
  {
    id: 'ada_kotipathi',
    nameSi: 'අද කෝටිපති',
    nameEn: 'Ada Kotipathi',
    board: 'DLB',
    fieldType: 'letter_and_numbers',
    defaultOrder: 1,
    requiresLetter: true,
    requiresZodiac: false,
    numberCount: 4,
    aliases: [
      'අද කෝටිපති', 'අදකෝටිපති', 'අද ෙකා්ටිපති', 'අද ෙකා්ටි', 'අද කොටිපති', 'ෙකා්ටිපති',
      'wo fldaám;s', 'wo fldaá', 
      'ada kotipathi', 'adakotipathi', 'ada koteepathi', 'kotipathi'
    ]
  },
  {
    id: 'ada_sampatha',
    nameSi: 'අද සම්පත',
    nameEn: 'Ada Sampatha',
    board: 'NLB',
    fieldType: 'tiered_digits_letter',
    defaultOrder: 2,
    requiresLetter: true,
    requiresZodiac: false,
    numberCount: 3,
    isTieredDigits: true,
    digitCounts: [2, 3, 4], // e.g. 32 / 432 / 2432 / O
    aliases: [
      'අද සම්පත', 'අදසම්පත', 'wo iïm;', 'wo iï', 
      'ada sampatha', 'adasampatha', 'ada sampath'
    ]
  },
  {
    id: 'ayubo',
    nameSi: 'ආයුබෝ',
    nameEn: 'Ayubo',
    board: 'NLB',
    fieldType: 'letter_and_digits',
    defaultOrder: 3,
    requiresLetter: true,
    requiresZodiac: false,
    numberCount: 4, // 4 individual digits: e.g. 8 2 9 9
    aliases: [
      'ආයුබෝ', 'ආයුබෝවන්', 'ආයුෙබා්', 'ආයුෙබා්වන්', 'ආයුබෝ', 'ආයුබො',
      'wdfnda', 'wdfndjka',
      'ayubo', 'ayobo', 'ayubowan'
    ]
  },
  {
    id: 'dhana_nidhanaya',
    nameSi: 'ධන නිධානය',
    nameEn: 'Dhana Nidhanaya',
    board: 'DLB',
    fieldType: 'letter_and_numbers',
    defaultOrder: 4,
    requiresLetter: true,
    requiresZodiac: false,
    numberCount: 4,
    aliases: [
      'ධන නිධානය', 'ධනනිධානය', 'ධන නි ධානය', 'නි ධානය', 'නිධානය', 'Ok kssOdkh', 'Ok ks Odkh', 'Ok kss', 
      'dhana nidhanaya', 'dhananidhanaya', 'dhana nidana', 'nidhanaya'
    ]
  },
  {
    id: 'govisetha',
    nameSi: 'ගොවිසෙත',
    nameEn: 'Govisetha',
    board: 'NLB',
    fieldType: 'letter_and_numbers',
    defaultOrder: 5,
    requiresLetter: true,
    requiresZodiac: false,
    numberCount: 4,
    aliases: [
      'ගොවිසෙත', 'ගොවි සෙත', 'ෙගාවිෙසත', 'ෙගාවි ෙසත', 'ගොවි', 'ෙගාවි',
      'f.dúfi;', 'f.dවි fi;', 'f.dú', 
      'govisetha', 'govi setha', 'govisetha nlb'
    ]
  },
  {
    id: 'handahana',
    nameSi: 'හඳහන',
    nameEn: 'Handahana',
    board: 'DLB',
    fieldType: 'zodiac_and_numbers',
    defaultOrder: 6,
    requiresLetter: false,
    requiresZodiac: true,
    numberCount: 4,
    aliases: [
      'හඳහන', 'හදහන', 'හඳ හන', 'y`oyk', 'yoyk', 
      'handahana', 'hadahana', 'handahana dlb'
    ]
  },
  {
    id: 'jaya_sampatha',
    nameSi: 'ජය සම්පත',
    nameEn: 'Jaya Sampatha',
    board: 'DLB',
    fieldType: 'tiered_digits_letter',
    defaultOrder: 7,
    requiresLetter: true,
    requiresZodiac: false,
    numberCount: 3,
    isTieredDigits: true,
    digitCounts: [2, 3, 4], // e.g. 49 / 649 / 0649 / Q
    aliases: [
      'ජය සම්පත', 'ජයසම්පත', 'ch iïm;', 'ch iï', 
      'jaya sampatha', 'jayasampatha', 'jaya sampath'
    ]
  },
  {
    id: 'kapruka',
    nameSi: 'කප්රුක',
    nameEn: 'Kapruka',
    board: 'DLB',
    fieldType: 'letter_boxed_numbers',
    defaultOrder: 8,
    requiresLetter: true,
    requiresZodiac: false,
    numberCount: 5, // 1 boxed + 4 regular = 5 numbers
    hasBoxedNumber: true,
    boxedNumberIndex: 0, // first number after letter is boxed
    aliases: [
      'කප්රුක', 'කප් රුක', 'lmarel', 'lma', 
      'kapruka', 'kap ruka', 'kapruka dlb'
    ]
  },
  {
    id: 'lagna_wasana',
    nameSi: 'ලග්න වාසනා',
    nameEn: 'Lagna Wasana',
    board: 'NLB',
    fieldType: 'zodiac_and_numbers',
    defaultOrder: 9,
    requiresLetter: false,
    requiresZodiac: true,
    numberCount: 4,
    hasBonusNumber: true,
    aliases: [
      'ලග්න වාසනා', 'ලග්නවාසනා', 'ලග්න වාසනාව', 'ලග්නවාසනාව', 'ලග්න',
      ',.ak jdikd', ',.ak', 
      'lagna wasana', 'lagnawasana', 'lagna vasana'
    ]
  },
  {
    id: 'mahajana_sampatha',
    nameSi: 'මහජන සම්පත',
    nameEn: 'Mahajana Sampatha',
    board: 'NLB',
    fieldType: 'letter_and_digits',
    defaultOrder: 10,
    requiresLetter: true,
    requiresZodiac: false,
    numberCount: 6, // 6 individual digits: e.g. 8 0 2 4 3 2
    aliases: [
      'මහජන සම්පත', 'මහජනසම්පත', 'මහජන', 'uyckiïm;', 'uyck iïm;', 'uyck', 
      'mahajana sampatha', 'mahajanasampatha', 'mahajana'
    ]
  },
  {
    id: 'mega_power',
    nameSi: 'මෙගා පවර්',
    nameEn: 'Mega Power',
    board: 'NLB',
    fieldType: 'letter_boxed_numbers',
    defaultOrder: 11,
    requiresLetter: true,
    requiresZodiac: false,
    numberCount: 5, // 1 boxed + 4 regular = 5 numbers
    hasBoxedNumber: true,
    boxedNumberIndex: 0, // special boxed number e.g. [21]
    aliases: [
      'මෙගා පවර්', 'මෙගාපවර්', 'ෙමගා පවර්', 'ෙමගාපවර්',
      'fu.d mj¾', 'fu.d', 
      'mega power', 'megapower'
    ]
  },
  {
    id: 'nlb_jaya',
    nameSi: 'NLB ජය',
    nameEn: 'NLB Jaya',
    board: 'NLB',
    fieldType: 'letter_and_digits',
    defaultOrder: 12,
    requiresLetter: true,
    requiresZodiac: false,
    numberCount: 4, // 4 individual digits: e.g. 0 8 9 0
    aliases: [
      'NLB ජය', 'nlb ජය', 'NLB ch', 'nlb ch', 
      'nlb jaya', 'jaya nlb'
    ]
  },
  {
    id: 'sasiri',
    nameSi: 'සසිරි',
    nameEn: 'Sasiri',
    board: 'DLB',
    fieldType: 'numbers_only',
    defaultOrder: 13,
    requiresLetter: false,
    requiresZodiac: false,
    numberCount: 3, // 3 numbers: e.g. 17 18 43
    aliases: [
      'සසිරි', 'iisß', 'ii sß', 
      'sasiri', 'sasiree'
    ]
  },
  {
    id: 'shanida_wasana',
    nameSi: 'ශනිදා වාසනා',
    nameEn: 'Shanida Wasana',
    board: 'NLB',
    fieldType: 'letter_numbers_bonus',
    defaultOrder: 14,
    requiresLetter: true,
    requiresZodiac: false,
    numberCount: 4,
    hasBonusNumber: true, // bonus number in parens e.g. (86597)
    aliases: [
      'ශනිදා වාසනා', 'ශනිදාවාසනා', 'ශනිදා වාසනාව', 'ශනිදාවාසනාව', 'ශනිදා',
      'Yksod jdikd', 'Yk sod jdikd', 'Yksod', 
      'shanida wasana', 'shanidawasana', 'shanida'
    ]
  },
  {
    id: 'suba_dawasak',
    nameSi: 'සුබ දවසක්',
    nameEn: 'Suba Dawasak',
    board: 'DLB',
    fieldType: 'zodiac_and_numbers',
    defaultOrder: 15,
    requiresLetter: false,
    requiresZodiac: true,
    numberCount: 3, // 3 numbers: e.g. 10 26 30
    aliases: [
      'සුබ දවසක්', 'සුබදවසක්', 'සුබ දවස', 'සුබදවස', 'බ දවසක්', 'බදවසක්', 'දවසක්', 'iqn ojila', 'iqn', 
      'suba dawasak', 'subadawasak', 'suba'
    ]
  },
  {
    id: 'super_ball',
    nameSi: 'සුපර්බෝල්',
    nameEn: 'Super Ball',
    board: 'DLB',
    fieldType: 'letter_numbers_bonus',
    defaultOrder: 16,
    requiresLetter: true,
    requiresZodiac: false,
    numberCount: 4,
    hasBonusNumber: true, // bonus number in parens e.g. (85244)
    aliases: [
      'සුපර්බෝල්', 'සුපර් බෝල්', 'සුපර් ෙබා්ල්', 'සුපර් ෙබෝල්', 'සුපර්ෙබා්ල්', 'පර් ෙබා්ල්', 'පර් ෙබෝල්', 'පර් බෝල්', 'පර්ෙබා්ල්', 'පර්බෝල්',
      'iqm¾fnda,a', 'iqm¾', 
      'super ball', 'superball', 'super bol'
    ]
  },
  {
    id: 'dhana_sampatha',
    nameSi: 'ධන සම්පත',
    nameEn: 'Dhana Sampatha',
    board: 'DLB',
    fieldType: 'letter_and_digits',
    defaultOrder: 17,
    requiresLetter: true,
    requiresZodiac: false,
    numberCount: 6, // 6 individual digits: e.g. 2 6 0 6 4 9
    aliases: [
      'ධන සම්පත', 'ධනසම්පත', 'සුපිරි ධන ස.', 'සුපිරි ධන ස', 'සුපිරි ධන', 'සුපිරි ධන සම්පත', 'සුපිරි ධනසම්පත', 'ධන ස.', 'ධන ස',
      'Ok iïm;', 'Ok iï', 
      'dhana sampatha', 'dhanasampatha', 'supiri dhana'
    ]
  },
  {
    id: 'vasi',
    nameSi: 'වාසි',
    nameEn: 'Vasi',
    board: 'DLB',
    fieldType: 'letter_numbers_special',
    defaultOrder: 18,
    requiresLetter: true,
    requiresZodiac: false,
    numberCount: 3, // 2 regular numbers + 1 boxed special e.g. F 29 84 [09]
    hasBoxedNumber: true,
    aliases: [
      'වාසි', 'වාසී', 'jdis', 'වාසි වාසනා', 
      'vasi', 'vaasi', 'vasi wasana'
    ]
  }
];

export const INITIAL_HEADER_GREETING = 'ඔබට සුබ දවසක් !';
export const INITIAL_DEALER_NAME = 'S.W.ඔස්මන් ද සිල්වා';
export const INITIAL_FOOTER_ANNOUNCEMENT = 'ගොවි සෙත රු. ලක්ෂ දෙකහමාරක් ක් ඔස්මන් ද සිල්වා ගෙන්';

// Reference Sample Data strictly from the attached wireframe (2026.10.05 Monday)
// Clearly labelled as SAMPLE DATA only
export const SAMPLE_WIREFRAME_SHEET: DailySheet = {
  date: '2026-10-05',
  dayOfWeekSi: 'සඳුදා',
  headerGreeting: 'ඔබට සුබ දවසක් !',
  headerDealerName: 'S.W.ඔස්මන් ද සිල්වා',
  footerAnnouncement: 'ගොවි සෙත රු. ලක්ෂ දෙකහමාරක් ක් ඔස්මන් ද සිල්වා ගෙන්',
  isFooterReviewed: true,
  sources: [
    {
      id: 'sample_wireframe_doc',
      fileName: 'result sheet wireframe.pdf',
      fileType: 'pdf',
      filePath: '/samples/result_sheet_wireframe.pdf',
      fileSize: 279658,
      uploadedAt: '2026-10-05T10:00:00Z',
      pageCount: 1, // Only Page 1 is considered
      status: 'extracted',
    }
  ],
  updatedAt: '2026-10-05T10:30:00Z',
  lotteries: [
    {
      lotteryId: 'ada_kotipathi',
      drawNo: '3131',
      letter: 'D',
      numbers: ['40', '52', '60', '70'],
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 99
    },
    {
      lotteryId: 'ada_sampatha',
      drawNo: '0906', // leading zero
      letter: 'O',
      numbers: ['32', '432', '2432'], // tiered
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 98
    },
    {
      lotteryId: 'ayubo',
      drawNo: '4',
      letter: 'A',
      numbers: ['8', '2', '9', '9'],
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 99
    },
    {
      lotteryId: 'dhana_nidhanaya',
      drawNo: '2361',
      letter: 'I',
      numbers: ['13', '66', '67', '68'],
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 99
    },
    {
      lotteryId: 'handahana',
      drawNo: '1640',
      zodiac: 'කන්‍යා',
      numbers: ['34', '36', '42', '62'],
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 95
    },
    {
      lotteryId: 'govisetha',
      drawNo: '4573',
      letter: 'Y',
      numbers: ['41', '43', '45', '73'],
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 99
    },
    {
      lotteryId: 'jaya_sampatha',
      drawNo: '0513', // leading zero
      letter: 'Q',
      numbers: ['49', '649', '0649'], // tiered, leading zero
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 98
    },
    {
      lotteryId: 'kapruka',
      drawNo: '2481',
      letter: 'Z',
      boxedIndex: 0,
      numbers: ['39', '05', '47', '50', '55'], // '39' is boxed, '05' leading zero
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 97
    },
    {
      lotteryId: 'lagna_wasana',
      drawNo: '5017',
      zodiac: 'කටක',
      numbers: ['37', '48', '49', '53'],
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 95
    },
    {
      lotteryId: 'mahajana_sampatha',
      drawNo: '6331',
      letter: 'O',
      numbers: ['8', '0', '2', '4', '3', '2'],
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 99
    },
    {
      lotteryId: 'mega_power',
      drawNo: '2679',
      letter: 'W',
      boxedIndex: 0,
      numbers: ['21', '05', '25', '40', '60'], // '21' boxed, '05' leading zero
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 97
    },
    {
      lotteryId: 'nlb_jaya',
      drawNo: '0599', // leading zero
      letter: 'U',
      numbers: ['0', '8', '9', '0'],
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 99
    },
    {
      lotteryId: 'sasiri',
      drawNo: '1135',
      numbers: ['17', '18', '43'],
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 99
    },
    {
      lotteryId: 'shanida_wasana',
      drawNo: '5466',
      letter: 'U',
      numbers: ['18', '27', '29', '80'],
      bonusNumber: '86597',
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 98
    },
    {
      lotteryId: 'suba_dawasak',
      drawNo: '447',
      zodiac: 'මේෂ',
      numbers: ['10', '26', '30'],
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 96
    },
    {
      lotteryId: 'super_ball',
      drawNo: '3305',
      letter: 'Q',
      numbers: ['06', '24', '45', '63'], // leading zero '06'
      bonusNumber: '85244',
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 98
    },
    {
      lotteryId: 'dhana_sampatha',
      drawNo: '1039',
      letter: 'Q',
      numbers: ['2', '6', '0', '6', '4', '9'],
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 99
    },
    {
      lotteryId: 'vasi',
      drawNo: '05', // leading zero
      letter: 'F',
      numbers: ['29', '84', '09'], // '09' is boxed (last number)
      boxedIndex: 2,
      isNoDraw: false,
      isCheckedAgainstSource: true,
      sourceFileName: 'result sheet wireframe.pdf',
      sourcePage: 1,
      extractionConfidence: 96
    }
  ]
};

export function createEmptySheet(dateStr: string): DailySheet {
  const d = new Date(dateStr);
  const dayIdx = isNaN(d.getDay()) ? 1 : d.getDay();
  const dayName = DAYS_OF_WEEK_SI[dayIdx] || 'සඳුදා';

  return {
    date: dateStr,
    dayOfWeekSi: dayName,
    headerGreeting: INITIAL_HEADER_GREETING,
    headerDealerName: INITIAL_DEALER_NAME,
    footerAnnouncement: INITIAL_FOOTER_ANNOUNCEMENT,
    isFooterReviewed: false,
    sources: [],
    updatedAt: new Date().toISOString(),
    lotteries: STANDARD_LOTTERIES.map((def) => ({
      lotteryId: def.id,
      drawNo: '',
      letter: '',
      zodiac: undefined,
      numbers: def.isTieredDigits 
        ? ['', '', ''] 
        : Array(def.numberCount).fill(''),
      bonusNumber: def.hasBonusNumber ? '' : undefined,
      boxedIndex: def.hasBoxedNumber ? (def.boxedNumberIndex ?? 0) : undefined,
      isNoDraw: false,
      isCheckedAgainstSource: false,
      extractionConfidence: undefined,
      sourceFileName: undefined,
      sourcePage: undefined,
    }))
  };
}
