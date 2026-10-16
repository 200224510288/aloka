'use client';

import React, { useState, useEffect } from 'react';
import { DailySheet, PreviewStyleOptions, SavedCustomDesign } from '@/types/lottery';
import { 
  STANDARD_LOTTERIES, 
  DEFAULT_STYLE_OPTIONS, 
  STYLE_PRESETS,
  SINHALA_FONT_OPTIONS,
  NUMBER_FONT_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  FontOption
} from '@/lib/constants';
import { ZODIAC_PATH_MAP, ZODIAC_IMAGE_MAP } from '@/lib/zodiac-icons';
import { 
  FileDown, 
  Printer, 
  ZoomIn, 
  ZoomOut, 
  Scissors, 
  Leaf, 
  Sliders, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Maximize2,
  Bookmark,
  Star,
  Trash2,
  Plus,
  Type,
  Bold
} from 'lucide-react';
import SaveDesignModal from './SaveDesignModal';

interface SheetPreviewProps {
  sheet: DailySheet;
  onExportPdf: (customStyles?: PreviewStyleOptions) => void;
  onRequestPrint?: (customStyles?: PreviewStyleOptions) => void;
  isExporting: boolean;
  canExport: boolean;
  printDensity?: 'eco' | 'high';
  onDensityChange?: (density: 'eco' | 'high') => void;
  currentStyles?: PreviewStyleOptions;
  onStylesChange?: (styles: PreviewStyleOptions) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SheetPreview: React.FC<SheetPreviewProps> = ({
  sheet,
  onExportPdf,
  onRequestPrint,
  isExporting,
  canExport,
  printDensity = 'eco',
  onDensityChange,
  currentStyles,
  onStylesChange,
  showToast,
}) => {
  const [scale, setScale] = useState<number>(0.46);
  const [showCutGuide, setShowCutGuide] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>('standard');
  const [savedDesigns, setSavedDesigns] = useState<SavedCustomDesign[]>([]);
  const [defaultDesignId, setDefaultDesignId] = useState<string | null>(null);
  const [activeCustomDesignId, setActiveCustomDesignId] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [customizerTab, setCustomizerTab] = useState<'all' | 'typography' | 'layout'>('all');

  // Internal styles state initialized with DEFAULT_STYLE_OPTIONS
  const [styles, setStyles] = useState<PreviewStyleOptions>({
    ...DEFAULT_STYLE_OPTIONS,
    printDensity,
    ...(currentStyles || {}),
  });

  const isHighDensity = (styles.printDensity || printDensity) === 'high';

  // Load custom designs & default design on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sinhala_lottery_custom_designs');
      if (stored) {
        const parsed: SavedCustomDesign[] = JSON.parse(stored);
        setSavedDesigns(parsed);

        const defId = localStorage.getItem('sinhala_lottery_default_design_id');
        if (defId) {
          setDefaultDesignId(defId);
          const defaultDesign = parsed.find(d => d.id === defId);
          if (defaultDesign) {
            setActiveCustomDesignId(defaultDesign.id);
            setActivePreset('custom');
            setStyles(prev => ({
              ...prev,
              ...defaultDesign.options
            }));
            onStylesChange?.(defaultDesign.options);
            return;
          }
        }
      }

      // Fallback: load persisted styles from localStorage if no default design
      const saved = localStorage.getItem('sinhala_lottery_preview_styles');
      if (saved) {
        const parsed = JSON.parse(saved);
        setStyles(prev => {
          const next = { ...prev, ...parsed };
          onStylesChange?.(next);
          return next;
        });
      }
    } catch (e) {
      console.error('Failed to load saved preview styles:', e);
    }
  }, [onStylesChange]);

  const handleSaveCustomDesign = (newDesign: SavedCustomDesign) => {
    const updated = [...savedDesigns.filter(d => d.id !== newDesign.id), newDesign];
    setSavedDesigns(updated);
    try {
      localStorage.setItem('sinhala_lottery_custom_designs', JSON.stringify(updated));
    } catch {}

    if (newDesign.isDefault) {
      setDefaultDesignId(newDesign.id);
      try {
        localStorage.setItem('sinhala_lottery_default_design_id', newDesign.id);
      } catch {}
    }

    setActiveCustomDesignId(newDesign.id);
    setActivePreset('custom');
    showToast?.(`✓ Custom design "${newDesign.name}" saved!`, 'success');
  };

  const applyCustomDesign = (design: SavedCustomDesign) => {
    setActiveCustomDesignId(design.id);
    setActivePreset('custom');
    setStyles(prev => {
      const next = { ...prev, ...design.options };
      try {
        localStorage.setItem('sinhala_lottery_preview_styles', JSON.stringify(next));
      } catch {}
      onStylesChange?.(next);
      return next;
    });
    if (design.options.printDensity) {
      onDensityChange?.(design.options.printDensity);
    }
    showToast?.(`✓ Loaded custom design: "${design.name}"`, 'info');
  };

  const toggleDefaultDesign = (designId: string) => {
    const isCurrentlyDefault = defaultDesignId === designId;
    const newDef = isCurrentlyDefault ? null : designId;
    setDefaultDesignId(newDef);
    try {
      if (newDef) {
        localStorage.setItem('sinhala_lottery_default_design_id', newDef);
        showToast?.('Set as default design for startup.', 'success');
      } else {
        localStorage.removeItem('sinhala_lottery_default_design_id');
        showToast?.('Removed default design setting.', 'info');
      }
    } catch {}
  };

  const deleteCustomDesign = (designId: string) => {
    const target = savedDesigns.find(d => d.id === designId);
    if (!target) return;
    if (confirm(`Delete saved design "${target.name}"?`)) {
      const updated = savedDesigns.filter(d => d.id !== designId);
      setSavedDesigns(updated);
      try {
        localStorage.setItem('sinhala_lottery_custom_designs', JSON.stringify(updated));
        if (defaultDesignId === designId) {
          localStorage.removeItem('sinhala_lottery_default_design_id');
          setDefaultDesignId(null);
        }
      } catch {}
      if (activeCustomDesignId === designId) {
        setActiveCustomDesignId(null);
      }
      showToast?.(`Deleted "${target.name}".`, 'info');
    }
  };

  // Keep printDensity synced with styles
  useEffect(() => {
    setStyles(prev => ({ ...prev, printDensity }));
  }, [printDensity]);

  const updateStyle = <K extends keyof PreviewStyleOptions>(key: K, value: PreviewStyleOptions[K]) => {
    setStyles(prev => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem('sinhala_lottery_preview_styles', JSON.stringify(next));
      } catch {}
      onStylesChange?.(next);
      return next;
    });
    setActivePreset('custom');
  };

  const applyPreset = (presetKey: string) => {
    const preset = STYLE_PRESETS[presetKey];
    if (!preset) return;
    setActivePreset(presetKey);
    setStyles(prev => {
      const next = { ...prev, ...preset.options, printDensity };
      try {
        localStorage.setItem('sinhala_lottery_preview_styles', JSON.stringify(next));
      } catch {}
      onStylesChange?.(next);
      return next;
    });
  };

  const resetStyles = () => {
    setActivePreset('standard');
    setStyles({ ...DEFAULT_STYLE_OPTIONS, printDensity });
    try {
      localStorage.setItem('sinhala_lottery_preview_styles', JSON.stringify(DEFAULT_STYLE_OPTIONS));
    } catch {}
    onStylesChange?.({ ...DEFAULT_STYLE_OPTIONS, printDensity });
  };

  const formattedDate = sheet.date.replace(/-/g, '.');

  // Resolved layout metrics with fallbacks
  const rowHeightMm = styles.rowHeightMm ?? DEFAULT_STYLE_OPTIONS.rowHeightMm;
  const lotteryNameFontSizePt = styles.lotteryNameFontSizePt ?? DEFAULT_STYLE_OPTIONS.lotteryNameFontSizePt;
  const drawNoFontSizePt = styles.drawNoFontSizePt ?? DEFAULT_STYLE_OPTIONS.drawNoFontSizePt;
  const resultFontSizePt = styles.resultFontSizePt ?? DEFAULT_STYLE_OPTIONS.resultFontSizePt;
  const footerFontSizePt = styles.footerFontSizePt ?? DEFAULT_STYLE_OPTIONS.footerFontSizePt;
  const metaFontSizePt = styles.metaFontSizePt ?? DEFAULT_STYLE_OPTIONS.metaFontSizePt;
  const dateFontSizePt = styles.dateFontSizePt ?? styles.metaFontSizePt ?? DEFAULT_STYLE_OPTIONS.dateFontSizePt;
  const dealerFontSizePt = styles.dealerFontSizePt ?? styles.metaFontSizePt ?? DEFAULT_STYLE_OPTIONS.dealerFontSizePt;
  const dateOffsetYMm = styles.dateOffsetYMm ?? DEFAULT_STYLE_OPTIONS.dateOffsetYMm;
  const dealerOffsetYMm = styles.dealerOffsetYMm ?? DEFAULT_STYLE_OPTIONS.dealerOffsetYMm;
  const bottomLayoutStyle = styles.bottomLayoutStyle ?? DEFAULT_STYLE_OPTIONS.bottomLayoutStyle;
  const contentGapMm = styles.contentGapMm ?? DEFAULT_STYLE_OPTIONS.contentGapMm;
  const cellPaddingLeftMm = styles.cellPaddingLeftMm ?? DEFAULT_STYLE_OPTIONS.cellPaddingLeftMm;
  const announcementOffsetYMm = styles.announcementOffsetYMm ?? DEFAULT_STYLE_OPTIONS.announcementOffsetYMm;
  const topMarginMm = styles.topMarginMm ?? DEFAULT_STYLE_OPTIONS.topMarginMm;

  // Font Types and Bold Weights with fallbacks
  const lotteryNameFontFamily = styles.lotteryNameFontFamily ?? DEFAULT_STYLE_OPTIONS.lotteryNameFontFamily;
  const lotteryNameFontWeight = styles.lotteryNameFontWeight ?? DEFAULT_STYLE_OPTIONS.lotteryNameFontWeight;

  const drawNoFontFamily = styles.drawNoFontFamily ?? DEFAULT_STYLE_OPTIONS.drawNoFontFamily;
  const drawNoFontWeight = styles.drawNoFontWeight ?? DEFAULT_STYLE_OPTIONS.drawNoFontWeight;

  const resultFontFamily = styles.resultFontFamily ?? DEFAULT_STYLE_OPTIONS.resultFontFamily;
  const resultFontWeight = styles.resultFontWeight ?? (isHighDensity ? 800 : DEFAULT_STYLE_OPTIONS.resultFontWeight);

  const letterFontFamily = styles.letterFontFamily ?? DEFAULT_STYLE_OPTIONS.letterFontFamily;
  const letterFontWeight = styles.letterFontWeight ?? (isHighDensity ? 900 : DEFAULT_STYLE_OPTIONS.letterFontWeight);

  const footerFontFamily = styles.footerFontFamily ?? DEFAULT_STYLE_OPTIONS.footerFontFamily;
  const footerFontWeight = styles.footerFontWeight ?? DEFAULT_STYLE_OPTIONS.footerFontWeight;

  const dateFontFamily = styles.dateFontFamily ?? DEFAULT_STYLE_OPTIONS.dateFontFamily;
  const dateFontWeight = styles.dateFontWeight ?? DEFAULT_STYLE_OPTIONS.dateFontWeight;

  const dealerFontFamily = styles.dealerFontFamily ?? DEFAULT_STYLE_OPTIONS.dealerFontFamily;
  const dealerFontWeight = styles.dealerFontWeight ?? DEFAULT_STYLE_OPTIONS.dealerFontWeight;

  // Helper: Apply whole-sheet Quick Boldness Preset
  const applyBoldnessPreset = (level: 'light' | 'standard' | 'heavy') => {
    let weights: Partial<PreviewStyleOptions> = {};
    if (level === 'light') {
      weights = {
        lotteryNameFontWeight: 600,
        drawNoFontWeight: 500,
        resultFontWeight: 600,
        letterFontWeight: 700,
        footerFontWeight: 500,
        dateFontWeight: 600,
        dealerFontWeight: 600,
      };
      showToast?.('Applied Light (400-600) boldness preset', 'info');
    } else if (level === 'standard') {
      weights = {
        lotteryNameFontWeight: 800,
        drawNoFontWeight: 700,
        resultFontWeight: 700,
        letterFontWeight: 800,
        footerFontWeight: 700,
        dateFontWeight: 800,
        dealerFontWeight: 800,
      };
      showToast?.('Applied Standard Bold (700-800) preset', 'info');
    } else if (level === 'heavy') {
      weights = {
        lotteryNameFontWeight: 900,
        drawNoFontWeight: 800,
        resultFontWeight: 900,
        letterFontWeight: 900,
        footerFontWeight: 800,
        dateFontWeight: 900,
        dealerFontWeight: 900,
      };
      showToast?.('Applied Maximum Ultra Bold (800-900) preset', 'info');
    }

    setStyles(prev => {
      const next = { ...prev, ...weights };
      try {
        localStorage.setItem('sinhala_lottery_preview_styles', JSON.stringify(next));
      } catch {}
      onStylesChange?.(next);
      return next;
    });
    setActivePreset('custom');
  };

  // Helper: Render interactive weight pills (400, 500, 600, 700, 800, 900)
  const renderWeightPills = (
    currentWeight: number | string | undefined,
    defaultWeight: number,
    onChange: (weight: number) => void
  ) => {
    const activeWeight = Number(currentWeight) || defaultWeight;
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {FONT_WEIGHT_OPTIONS.map((fw) => {
          const isSelected = activeWeight === fw.weight;
          return (
            <button
              key={fw.weight}
              type="button"
              onClick={() => onChange(fw.weight)}
              className={`px-1.5 py-0.5 text-[10px] rounded transition cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white font-bold shadow-2xs ring-1 ring-blue-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium'
              }`}
              style={{ fontWeight: fw.weight }}
              title={`${fw.weight} • ${fw.name} (${fw.sinhalaName})`}
            >
              {fw.label}
            </button>
          );
        })}
      </div>
    );
  };

  // Helper: Render font selector dropdown
  const renderFontSelect = (
    currentFont: string | undefined,
    defaultFont: string,
    options: FontOption[],
    onChange: (font: string) => void
  ) => {
    const val = currentFont || defaultFont;
    return (
      <select
        value={val}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  };

  // Check if anything deviates from standard
  const hasCustomChanges = 
    rowHeightMm !== DEFAULT_STYLE_OPTIONS.rowHeightMm ||
    resultFontSizePt !== DEFAULT_STYLE_OPTIONS.resultFontSizePt ||
    lotteryNameFontSizePt !== DEFAULT_STYLE_OPTIONS.lotteryNameFontSizePt ||
    drawNoFontSizePt !== DEFAULT_STYLE_OPTIONS.drawNoFontSizePt ||
    contentGapMm !== DEFAULT_STYLE_OPTIONS.contentGapMm ||
    cellPaddingLeftMm !== DEFAULT_STYLE_OPTIONS.cellPaddingLeftMm ||
    footerFontSizePt !== DEFAULT_STYLE_OPTIONS.footerFontSizePt ||
    dateFontSizePt !== DEFAULT_STYLE_OPTIONS.dateFontSizePt ||
    dealerFontSizePt !== DEFAULT_STYLE_OPTIONS.dealerFontSizePt ||
    dateOffsetYMm !== DEFAULT_STYLE_OPTIONS.dateOffsetYMm ||
    dealerOffsetYMm !== DEFAULT_STYLE_OPTIONS.dealerOffsetYMm ||
    bottomLayoutStyle !== DEFAULT_STYLE_OPTIONS.bottomLayoutStyle ||
    announcementOffsetYMm !== DEFAULT_STYLE_OPTIONS.announcementOffsetYMm ||
    topMarginMm !== DEFAULT_STYLE_OPTIONS.topMarginMm ||
    lotteryNameFontFamily !== DEFAULT_STYLE_OPTIONS.lotteryNameFontFamily ||
    lotteryNameFontWeight !== DEFAULT_STYLE_OPTIONS.lotteryNameFontWeight ||
    drawNoFontFamily !== DEFAULT_STYLE_OPTIONS.drawNoFontFamily ||
    drawNoFontWeight !== DEFAULT_STYLE_OPTIONS.drawNoFontWeight ||
    resultFontFamily !== DEFAULT_STYLE_OPTIONS.resultFontFamily ||
    resultFontWeight !== DEFAULT_STYLE_OPTIONS.resultFontWeight ||
    letterFontFamily !== DEFAULT_STYLE_OPTIONS.letterFontFamily ||
    letterFontWeight !== DEFAULT_STYLE_OPTIONS.letterFontWeight ||
    footerFontFamily !== DEFAULT_STYLE_OPTIONS.footerFontFamily ||
    footerFontWeight !== DEFAULT_STYLE_OPTIONS.footerFontWeight ||
    dateFontFamily !== DEFAULT_STYLE_OPTIONS.dateFontFamily ||
    dateFontWeight !== DEFAULT_STYLE_OPTIONS.dateFontWeight ||
    dealerFontFamily !== DEFAULT_STYLE_OPTIONS.dealerFontFamily ||
    dealerFontWeight !== DEFAULT_STYLE_OPTIONS.dealerFontWeight;

  // Renders one single copy of the sheet
  const renderSingleCopy = () => {
    return (
      <div 
        style={{ 
          width: '137.5mm', 
          height: `${Math.max(180, 205 - topMarginMm)}mm` 
        }}
        className="flex flex-col justify-between bg-white text-black select-none box-border"
      >
        
        {/* 18 Rows Table with rounded corners */}
        <div 
          style={{ width: '137.5mm' }}
          className={`rounded-[3.5mm] ${isHighDensity ? 'border-[1.5px]' : 'border-[1.2px]'} border-[#2b4c7e] overflow-hidden bg-white box-border`}
        >
          <table 
            style={{ width: '137.5mm', tableLayout: 'fixed' }}
            className="border-collapse"
          >
            <tbody>
              {STANDARD_LOTTERIES.map((def, rIdx) => {
                const item = sheet.lotteries.find(l => l.lotteryId === def.id) || {
                  lotteryId: def.id,
                  drawNo: '',
                  numbers: [],
                  isNoDraw: false,
                  isCheckedAgainstSource: false
                };

                let resultCell = null;

                if (item.isNoDraw) {
                  resultCell = (
                    <span className="text-[9.5pt] text-slate-500 italic font-semibold font-sinhala">
                      දිනුම් ඇදීමක් නොමැත {item.noDrawReason ? `(${item.noDrawReason})` : ''}
                    </span>
                  );
                } else {
                  const parts: React.ReactNode[] = [];

                  // Letter (e.g. D, O, Z, Y, etc.)
                  if (item.letter && !def.isTieredDigits) {
                    parts.push(
                      <span
                        key="letter"
                        style={{ 
                          fontSize: `${resultFontSizePt}pt`,
                          fontFamily: letterFontFamily,
                          fontWeight: letterFontWeight,
                        }}
                        className="min-w-[5.5mm] text-center inline-block leading-none text-black"
                      >
                        {item.letter}
                      </span>
                    );
                  }

                  // Zodiac (standard icon from zodiac folder + Sinhala name)
                  if (item.zodiac) {
                    const iconSrc = ZODIAC_PATH_MAP[item.zodiac] || ZODIAC_IMAGE_MAP[item.zodiac];
                    const zodiacFontSize = Math.max(9.5, resultFontSizePt - 5);
                    parts.push(
                      <span 
                        key="zodiac" 
                        style={{ 
                          fontSize: `${zodiacFontSize}pt`,
                          fontFamily: lotteryNameFontFamily,
                          fontWeight: lotteryNameFontWeight,
                        }}
                        className="inline-flex items-center gap-1.5 text-black leading-none"
                      >
                        {iconSrc && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={iconSrc} alt={item.zodiac} className="w-[5.4mm] h-[5.4mm] object-contain inline-block shrink-0" />
                        )}
                        <span>{item.zodiac}</span>
                      </span>
                    );
                  }

                  // Tiered digits (e.g. 32 / 432 / 2432 / O)
                  if (def.isTieredDigits) {
                    const nums = item.numbers || [];
                    const sepFontSize = Math.max(12, resultFontSizePt - 3);
                    parts.push(
                      <span key="tiered" className="inline-flex items-center leading-none">
                        {nums.map((n, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <span style={{ fontSize: `${sepFontSize}pt` }} className="text-slate-800 font-bold px-1">/</span>}
                            <span 
                              style={{ 
                                fontSize: `${resultFontSizePt}pt`,
                                fontFamily: resultFontFamily,
                                fontWeight: resultFontWeight,
                              }}
                              className="text-black"
                            >
                              {n}
                            </span>
                          </React.Fragment>
                        ))}
                        {item.letter && (
                          <>
                            <span style={{ fontSize: `${sepFontSize}pt` }} className="text-slate-800 font-bold px-1">/</span>
                            <span 
                              style={{ 
                                fontSize: `${resultFontSizePt}pt`,
                                fontFamily: letterFontFamily,
                                fontWeight: letterFontWeight,
                              }}
                              className="text-center text-black"
                            >
                              {item.letter}
                            </span>
                          </>
                        )}
                      </span>
                    );
                  } else {
                    // Regular numbers / digits (strictly limited to def.numberCount to prevent overflow)
                    const rawNums = item.numbers || [];
                    const nums = def.numberCount ? rawNums.slice(0, def.numberCount) : rawNums;
                    nums.forEach((n, idx) => {
                      if (def.hasBonusNumber && item.bonusNumber && n === item.bonusNumber) {
                        return;
                      }
                      const isBoxed = item.boxedIndex !== undefined && item.boxedIndex === idx;
                      parts.push(
                        <span
                          key={`num-${idx}`}
                          style={{ 
                            fontSize: `${resultFontSizePt}pt`,
                            fontFamily: resultFontFamily,
                            fontWeight: isBoxed ? Math.min(900, Number(resultFontWeight) + 100) : resultFontWeight,
                          }}
                          className={`leading-none inline-block text-black tracking-tight ${
                            isBoxed
                              ? `${isHighDensity ? 'border-[2px]' : 'border-[1.5px]'} border-black px-[1.5mm] py-[0.3mm] rounded-[1px]`
                              : ''
                          }`}
                        >
                          {n}
                        </span>
                      );
                    });
                  }

                  // Bonus number in parentheses e.g. (86597)
                  if (item.bonusNumber) {
                    const bonusFontSize = Math.max(10, resultFontSizePt - 4.5);
                    parts.push(
                      <span 
                        key="bonus" 
                        style={{ 
                          fontSize: `${bonusFontSize}pt`,
                          fontFamily: resultFontFamily,
                          fontWeight: resultFontWeight,
                        }}
                        className="text-black ml-1 leading-none shrink-0"
                      >
                        ({item.bonusNumber})
                      </span>
                    );
                  }

                  resultCell = (
                    <div 
                      style={{ gap: `${contentGapMm}mm` }}
                      className="flex items-center h-full overflow-hidden whitespace-nowrap"
                    >
                      {parts}
                    </div>
                  );
                }

                const isLastRow = rIdx === STANDARD_LOTTERIES.length - 1;

                return (
                  <tr 
                    key={def.id} 
                    style={{ height: `${rowHeightMm}mm` }}
                    className={`${!isLastRow ? 'border-b border-[#2b4c7e]' : ''}`}
                  >
                    <td 
                      style={{ 
                        fontSize: `${lotteryNameFontSizePt}pt`,
                        fontFamily: lotteryNameFontFamily,
                        fontWeight: lotteryNameFontWeight,
                      }}
                      className="w-[35.5mm] text-black pl-[1.5mm] border-r border-[#2b4c7e] whitespace-nowrap overflow-hidden tracking-tight"
                    >
                      {def.nameSi}
                    </td>
                    <td 
                      style={{ 
                        fontSize: `${drawNoFontSizePt}pt`,
                        fontFamily: drawNoFontFamily,
                        fontWeight: drawNoFontWeight,
                      }}
                      className="w-[13mm] text-center text-black border-r border-[#2b4c7e]"
                    >
                      {item.drawNo}
                    </td>
                    <td 
                      style={{ paddingLeft: `${cellPaddingLeftMm}mm`, paddingRight: '1.5mm' }}
                      className="w-[89mm] text-black overflow-hidden whitespace-nowrap"
                    >
                      {resultCell}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Announcement & Bottom Row with Date, Day, and Osman de Silva at Bottom Right Corner */}
        <div className="pt-1.5 flex flex-col gap-1">
          <div 
            style={{ 
              fontSize: `${footerFontSizePt}pt`,
              fontFamily: footerFontFamily,
              fontWeight: footerFontWeight,
              position: 'relative',
              top: `${announcementOffsetYMm}mm`,
            }}
            className="leading-tight min-h-[4.5mm] max-h-[9mm] overflow-hidden text-black transition-all"
          >
            {sheet.footerAnnouncement}
          </div>
          <div 
            className="flex justify-between items-center text-black pt-0.5"
          >
            <div 
              style={{ 
                fontSize: `${dateFontSizePt}pt`,
                fontWeight: dateFontWeight,
                position: 'relative',
                top: `${dateOffsetYMm}mm`
              }}
              className={`inline-flex items-center gap-3 transition-all ${
                bottomLayoutStyle === 'boxed'
                  ? 'border-[1.2px] border-[#2b4c7e] rounded-[2.5mm] px-[3mm] py-[0.5mm]'
                  : ''
              }`}
            >
              <span style={{ fontFamily: dateFontFamily, fontWeight: dateFontWeight }} className="tracking-wide">{formattedDate}</span>
              <span style={{ fontFamily: dealerFontFamily, fontWeight: dateFontWeight }}>{sheet.dayOfWeekSi}</span>
            </div>
            <div 
              style={{ 
                fontSize: `${dealerFontSizePt}pt`,
                fontFamily: dealerFontFamily,
                fontWeight: dealerFontWeight,
                position: 'relative',
                top: `${dealerOffsetYMm}mm`
              }}
              className={`inline-flex items-center text-right tracking-tight transition-all ${
                bottomLayoutStyle === 'boxed'
                  ? 'border-[1.2px] border-[#2b4c7e] rounded-[2.5mm] px-[3mm] py-[0.5mm]'
                  : ''
              }`}
            >
              {sheet.headerDealerName || 'S.W.ඔස්මන් ද සිල්වා'}
            </div>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      
      {/* Top Toolbar */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Printer className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-800">
            Print Preview — A4 Landscape (2 Identical Copies)
          </h2>
          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
            297 × 210 mm
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Custom Layout Controls Toggle Button */}
          <button
            type="button"
            onClick={() => setShowSettings(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-bold transition border cursor-pointer ${
              showSettings
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : hasCustomChanges
                ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
            title="Customize font sizes, row height, and padding"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Layout Controls (සැකසුම්)</span>
            {hasCustomChanges && (
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            )}
            {showSettings ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>

          {/* Ink-Saver Print Density Toggle */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => onDensityChange?.('eco')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                !isHighDensity
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Eco Ink-Saver (Semi-Bold 600) — Thinner strokes save ~30% toner and prevent ink bleeding"
            >
              <Leaf className="w-3 h-3 text-emerald-100" />
              <span>Eco (600)</span>
            </button>

            <button
              type="button"
              onClick={() => onDensityChange?.('high')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                isHighDensity
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Bold (800) — Heavy contrast for distant wall displays"
            >
              <span>Bold (800)</span>
            </button>
          </div>

          {/* Cutting guide toggle */}
          <button
            type="button"
            onClick={() => setShowCutGuide(v => !v)}
            className={`px-2 py-1 text-xs rounded border flex items-center gap-1 transition cursor-pointer ${
              showCutGuide ? 'bg-slate-200 text-slate-800 font-semibold' : 'text-slate-500 bg-white'
            }`}
            title="Toggle centre cut guide"
          >
            <Scissors className="w-3 h-3" />
            <span className="hidden sm:inline">Cut Guide</span>
          </button>

          {/* Scale controls */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs">
            <button
              onClick={() => setScale(s => Math.max(0.4, Number((s - 0.05).toFixed(2))))}
              className="p-1 hover:text-blue-600 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="font-mono text-[11px] min-w-[36px] text-center font-bold">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(1.2, Number((s + 0.05).toFixed(2))))}
              className="p-1 hover:text-blue-600 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Print Button */}
          <button
            type="button"
            onClick={() => onRequestPrint ? onRequestPrint(styles) : onExportPdf(styles)}
            className="px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 shadow-xs transition cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
            title="Open Print Dialog to select copies, printer, and print"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print (මුද්‍රණය)</span>
          </button>

          {/* PDF Download Button */}
          <button
            type="button"
            onClick={() => onExportPdf(styles)}
            disabled={!canExport || isExporting}
            className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 shadow-xs transition cursor-pointer ${
              canExport
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Layout Customizer Drawer */}
      {showSettings && (
        <div className="p-4 bg-slate-50/95 border-b border-slate-200 transition-all animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="max-w-5xl mx-auto space-y-4">
            
            {/* Quick Presets & Custom Saved Designs Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Presets:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {Object.entries(STYLE_PRESETS).map(([key, preset]) => {
                    const isSelected = activePreset === key && !activeCustomDesignId;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setActiveCustomDesignId(null);
                          applyPreset(key);
                        }}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                        title={preset.description}
                      >
                        {preset.label}
                      </button>
                    );
                  })}

                  {/* User's Saved Custom Designs */}
                  {savedDesigns.map((design) => {
                    const isSelected = activeCustomDesignId === design.id;
                    const isDefault = defaultDesignId === design.id;
                    return (
                      <div 
                        key={design.id}
                        className={`inline-flex items-center rounded-md border transition text-xs ${
                          isSelected 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white border-indigo-200 text-indigo-900 hover:bg-indigo-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => applyCustomDesign(design)}
                          className="px-2.5 py-1 font-bold flex items-center gap-1 cursor-pointer"
                          title={`Click to load custom design "${design.name}"`}
                        >
                          <Bookmark className={`w-3 h-3 ${isSelected ? 'text-amber-300' : 'text-indigo-600'}`} />
                          <span>{design.name}</span>
                          {isDefault && (
                            <span className="text-[9px] bg-amber-400 text-slate-900 px-1 rounded font-extrabold ml-0.5">
                              Default
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDefaultDesign(design.id);
                          }}
                          className={`p-1 hover:bg-black/10 transition cursor-pointer ${
                            isDefault 
                              ? 'text-amber-300' 
                              : isSelected 
                              ? 'text-white/60 hover:text-white' 
                              : 'text-slate-400 hover:text-amber-500'
                          }`}
                          title={isDefault ? 'Default design (auto-loads on startup)' : 'Set as default auto-load design'}
                        >
                          <Star className={`w-3 h-3 ${isDefault ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCustomDesign(design.id);
                          }}
                          className={`p-1 hover:bg-red-500 hover:text-white rounded-r-md transition cursor-pointer ${
                            isSelected ? 'text-white/60' : 'text-slate-400'
                          }`}
                          title="Delete this saved design"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Save Current Design Button */}
                  <button
                    type="button"
                    onClick={() => setIsSaveModalOpen(true)}
                    className="px-2.5 py-1 text-xs font-bold rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    title="Save current layout adjustments as a reusable preset"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Save Design (සුරකින්න)</span>
                  </button>
                </div>
              </div>

              {/* Reset to Default */}
              <button
                type="button"
                onClick={() => {
                  setActiveCustomDesignId(null);
                  resetStyles();
                }}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-red-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md transition cursor-pointer"
                title="Reset all font sizes and heights to standard wireframe default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset (යළි මුල් තත්වයට)</span>
              </button>
            </div>

            {/* Navigation Filter Tabs & Quick Boldness Presets Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 pb-1">
              {/* Filter Tabs */}
              <div className="inline-flex p-1 bg-slate-200/80 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCustomizerTab('all')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${
                    customizerTab === 'all'
                      ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>All Controls (සියල්ල)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomizerTab('typography')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                    customizerTab === 'typography'
                      ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Type className="w-3.5 h-3.5 text-blue-600" />
                  <span>Font Types & Boldness (අකුරු සහ තද බව)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomizerTab('layout')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                    customizerTab === 'layout'
                      ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-600" />
                  <span>Spacing & Margins (පරතර)</span>
                </button>
              </div>

              {/* Whole-Sheet Quick Boldness Presets */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 text-xs shadow-2xs">
                <span className="text-[11px] font-bold text-slate-600 pl-1.5 flex items-center gap-1">
                  <Bold className="w-3.5 h-3.5 text-blue-600" />
                  <span>Quick Boldness:</span>
                </span>
                <button
                  type="button"
                  onClick={() => applyBoldnessPreset('light')}
                  className="px-2 py-0.5 text-[11px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-700 transition cursor-pointer"
                  title="Apply Light (400-600) weight across all sheet text"
                >
                  Clean (500)
                </button>
                <button
                  type="button"
                  onClick={() => applyBoldnessPreset('standard')}
                  className="px-2 py-0.5 text-[11px] font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-blue-700 transition cursor-pointer"
                  title="Apply Standard Bold (700-800) across all sheet text"
                >
                  Standard Bold (700-800)
                </button>
                <button
                  type="button"
                  onClick={() => applyBoldnessPreset('heavy')}
                  className="px-2 py-0.5 text-[11px] font-black bg-slate-900 hover:bg-black text-white rounded transition cursor-pointer shadow-2xs"
                  title="Apply Maximum Ultra Black (800-900) across all sheet text"
                >
                  Ultra Black (900)
                </button>
              </div>
            </div>

            {/* Group 1: Table & Winning Digits (ලොතරැයි වගුව සහ දිනුම් අංක) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  <span>Table & Winning Digits (ලොතරැයි වගුව සහ දිනුම් අංක)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal lowercase">
                  fonts, bold weights & sizes
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                
                {/* 1. Result Numbers / Winning Digits Card */}
                {(customizerTab === 'all' || customizerTab === 'typography') && (
                  <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-2xs space-y-2 ring-1 ring-blue-50/50">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-800 flex items-center gap-1">
                        <span>Winning Digits</span>
                        <span className="text-slate-500 font-sinhala font-normal">(දිනුම් අංක)</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px]">
                          {resultFontSizePt.toFixed(1)} pt
                        </span>
                        <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                          w:{resultFontWeight}
                        </span>
                      </div>
                    </div>

                    {/* Font Type Selector */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Font Type (අකුරු වර්ගය)</span>
                      </div>
                      {renderFontSelect(styles.resultFontFamily, DEFAULT_STYLE_OPTIONS.resultFontFamily, NUMBER_FONT_OPTIONS, (val) => updateStyle('resultFontFamily', val))}
                    </div>

                    {/* Bold Weight Pills */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Bold Weight (තද බව)</span>
                        <span className="font-mono font-bold text-blue-700">{resultFontWeight}</span>
                      </div>
                      {renderWeightPills(styles.resultFontWeight, DEFAULT_STYLE_OPTIONS.resultFontWeight as number, (w) => updateStyle('resultFontWeight', w))}
                    </div>

                    {/* Size Slider */}
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Font Size (ප්‍රමාණය)</span>
                        <span>{resultFontSizePt.toFixed(1)} pt</span>
                      </div>
                      <input
                        type="range"
                        min="14.0"
                        max="19.5"
                        step="0.5"
                        value={resultFontSizePt}
                        onChange={(e) => updateStyle('resultFontSizePt', parseFloat(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    {/* Live Preview Tag */}
                    <div className="pt-1 border-t border-slate-100">
                      <div className="text-[10px] text-slate-400 mb-0.5">Live Preview:</div>
                      <div 
                        style={{ fontFamily: resultFontFamily, fontWeight: resultFontWeight }}
                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center text-sm text-slate-900 tracking-wider truncate"
                      >
                        05 47 50 55 60
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Result Letter (English Letter e.g. D, O, Z) Card */}
                {(customizerTab === 'all' || customizerTab === 'typography') && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-800 flex items-center gap-1">
                        <span>Result Letter</span>
                        <span className="text-slate-500 font-sinhala font-normal">(ඉංග්‍රීසි අකුර)</span>
                      </label>
                      <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                        w:{letterFontWeight}
                      </span>
                    </div>

                    {/* Font Type Selector */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Font Type (අකුරු වර්ගය)</span>
                      </div>
                      {renderFontSelect(styles.letterFontFamily, DEFAULT_STYLE_OPTIONS.letterFontFamily, NUMBER_FONT_OPTIONS, (val) => updateStyle('letterFontFamily', val))}
                    </div>

                    {/* Bold Weight Pills */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Bold Weight (තද බව)</span>
                        <span className="font-mono font-bold text-blue-700">{letterFontWeight}</span>
                      </div>
                      {renderWeightPills(styles.letterFontWeight, DEFAULT_STYLE_OPTIONS.letterFontWeight as number, (w) => updateStyle('letterFontWeight', w))}
                    </div>

                    {/* Live Preview Tag */}
                    <div className="pt-1 border-t border-slate-100">
                      <div className="text-[10px] text-slate-400 mb-0.5">Live Preview:</div>
                      <div 
                        style={{ fontFamily: letterFontFamily, fontWeight: letterFontWeight }}
                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center text-base text-slate-900 truncate"
                      >
                        D &bull; Z &bull; O &bull; Y
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Lottery Name Card */}
                {(customizerTab === 'all' || customizerTab === 'typography') && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-800 flex items-center gap-1">
                        <span>Lottery Name</span>
                        <span className="text-slate-500 font-sinhala font-normal">(ලොතරැයි නම)</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px]">
                          {lotteryNameFontSizePt.toFixed(1)} pt
                        </span>
                        <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                          w:{lotteryNameFontWeight}
                        </span>
                      </div>
                    </div>

                    {/* Font Type Selector */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Sinhala Font (අකුරු මෝස්තරය)</span>
                      </div>
                      {renderFontSelect(styles.lotteryNameFontFamily, DEFAULT_STYLE_OPTIONS.lotteryNameFontFamily, SINHALA_FONT_OPTIONS, (val) => updateStyle('lotteryNameFontFamily', val))}
                    </div>

                    {/* Bold Weight Pills */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Bold Weight (තද බව)</span>
                        <span className="font-mono font-bold text-blue-700">{lotteryNameFontWeight}</span>
                      </div>
                      {renderWeightPills(styles.lotteryNameFontWeight, DEFAULT_STYLE_OPTIONS.lotteryNameFontWeight as number, (w) => updateStyle('lotteryNameFontWeight', w))}
                    </div>

                    {/* Size Slider */}
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Font Size (ප්‍රමාණය)</span>
                        <span>{lotteryNameFontSizePt.toFixed(1)} pt</span>
                      </div>
                      <input
                        type="range"
                        min="9.0"
                        max="12.5"
                        step="0.5"
                        value={lotteryNameFontSizePt}
                        onChange={(e) => updateStyle('lotteryNameFontSizePt', parseFloat(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    {/* Live Preview Tag */}
                    <div className="pt-1 border-t border-slate-100">
                      <div className="text-[10px] text-slate-400 mb-0.5">Live Preview:</div>
                      <div 
                        style={{ fontFamily: lotteryNameFontFamily, fontWeight: lotteryNameFontWeight }}
                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center text-xs text-slate-900 truncate"
                      >
                        අද කෝටිපති • ගොවිසෙත
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Draw No Card */}
                {(customizerTab === 'all' || customizerTab === 'typography') && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-800 flex items-center gap-1">
                        <span>Draw Number</span>
                        <span className="text-slate-500 font-sinhala font-normal">(වාර අංකය)</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px]">
                          {drawNoFontSizePt.toFixed(1)} pt
                        </span>
                        <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                          w:{drawNoFontWeight}
                        </span>
                      </div>
                    </div>

                    {/* Font Type Selector */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Font Type (අකුරු වර්ගය)</span>
                      </div>
                      {renderFontSelect(styles.drawNoFontFamily, DEFAULT_STYLE_OPTIONS.drawNoFontFamily, NUMBER_FONT_OPTIONS, (val) => updateStyle('drawNoFontFamily', val))}
                    </div>

                    {/* Bold Weight Pills */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Bold Weight (තද බව)</span>
                        <span className="font-mono font-bold text-blue-700">{drawNoFontWeight}</span>
                      </div>
                      {renderWeightPills(styles.drawNoFontWeight, DEFAULT_STYLE_OPTIONS.drawNoFontWeight as number, (w) => updateStyle('drawNoFontWeight', w))}
                    </div>

                    {/* Size Slider */}
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Font Size (ප්‍රමාණය)</span>
                        <span>{drawNoFontSizePt.toFixed(1)} pt</span>
                      </div>
                      <input
                        type="range"
                        min="9.5"
                        max="13.5"
                        step="0.5"
                        value={drawNoFontSizePt}
                        onChange={(e) => updateStyle('drawNoFontSizePt', parseFloat(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    {/* Live Preview Tag */}
                    <div className="pt-1 border-t border-slate-100">
                      <div className="text-[10px] text-slate-400 mb-0.5">Live Preview:</div>
                      <div 
                        style={{ fontFamily: drawNoFontFamily, fontWeight: drawNoFontWeight }}
                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center text-xs text-slate-900 truncate"
                      >
                        0906 • 1234 • 432
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Row Height (පේළි උස) Card */}
                {(customizerTab === 'all' || customizerTab === 'layout') && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-slate-800">
                          Row Height <span className="text-slate-500 font-sinhala font-normal">(පේළි උස)</span>
                        </label>
                        <span className="font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px]">
                          {rowHeightMm.toFixed(1)} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min="8.5"
                        max="10.2"
                        step="0.1"
                        value={rowHeightMm}
                        onChange={(e) => updateStyle('rowHeightMm', parseFloat(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer mt-2"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>8.5mm (Compact)</span>
                      <span className="font-medium text-slate-500">18 × {rowHeightMm.toFixed(1)} = {(18 * rowHeightMm).toFixed(1)}mm</span>
                      <span>10.2mm (Spaced)</span>
                    </div>
                  </div>
                )}

                {/* 6. Left Padding (වම් පස ඉඩ) Card */}
                {(customizerTab === 'all' || customizerTab === 'layout') && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-slate-800">
                          Left Padding <span className="text-slate-500 font-sinhala font-normal">(වම් පස ඉඩ)</span>
                        </label>
                        <span className="font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px]">
                          {cellPaddingLeftMm.toFixed(1)} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="3.5"
                        step="0.2"
                        value={cellPaddingLeftMm}
                        onChange={(e) => updateStyle('cellPaddingLeftMm', parseFloat(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer mt-2"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>1.0mm</span>
                      <span className="font-medium text-slate-500">Result Indent</span>
                      <span>3.5mm</span>
                    </div>
                  </div>
                )}

                {/* 7. Numbers Gap (අංක අතර පරතරය) Card */}
                {(customizerTab === 'all' || customizerTab === 'layout') && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-slate-800">
                          Numbers Gap <span className="text-slate-500 font-sinhala font-normal">(අංක පරතරය)</span>
                        </label>
                        <span className="font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px]">
                          {contentGapMm.toFixed(1)} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="3.5"
                        step="0.2"
                        value={contentGapMm}
                        onChange={(e) => updateStyle('contentGapMm', parseFloat(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer mt-2"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>1.0mm (Tight)</span>
                      <span className="font-medium text-slate-500">Letter/Digits Gap</span>
                      <span>3.5mm (Wide)</span>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Group 2: Margins & Footer Announcement (පිටු පරතර සහ පහළ දැන්වීම්) */}
            <div className="space-y-1.5 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Margins & Prize Announcement (පිටු පරතර සහ පහළ දැන්වීම්)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal lowercase">
                  announcement fonts & page top
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                
                {/* 8. Top Free Space (ඉහළ හිස් ඉඩ) */}
                {(customizerTab === 'all' || customizerTab === 'layout') && (
                  <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs space-y-1.5 ring-1 ring-emerald-50">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-800 flex items-center gap-1">
                        <span>Top Free Space</span>
                        <span className="text-slate-500 font-sinhala font-normal">(ඉහළ හිස් ඉඩ)</span>
                      </label>
                      <span className="font-mono font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded text-[11px]">
                        {topMarginMm.toFixed(1)} mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="18.0"
                      step="0.5"
                      value={topMarginMm}
                      onChange={(e) => updateStyle('topMarginMm', parseFloat(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                      <button
                        type="button"
                        onClick={() => updateStyle('topMarginMm', Math.max(0, Number((topMarginMm - 1).toFixed(1))))}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-bold cursor-pointer"
                        title="Decrease top margin by 1mm (shift table UP)"
                      >
                        -1mm
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStyle('topMarginMm', 6)}
                        className="text-slate-400 hover:text-slate-600 underline cursor-pointer"
                      >
                        Default (6mm)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStyle('topMarginMm', Math.min(18, Number((topMarginMm + 1).toFixed(1))))}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-bold cursor-pointer"
                        title="Increase top margin by 1mm (shift table DOWN)"
                      >
                        +1mm
                      </button>
                    </div>
                  </div>
                )}

                {/* 9. Announcement Up / Down Position */}
                {(customizerTab === 'all' || customizerTab === 'layout') && (
                  <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-2xs space-y-1.5 ring-1 ring-blue-50">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-800 flex items-center gap-1">
                        <span>Announcement Y</span>
                        <span className="text-slate-500 font-sinhala font-normal">(දැන්වීම් ඉහළ/පහළ)</span>
                      </label>
                      <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                        announcementOffsetYMm === 0
                          ? 'bg-slate-100 text-slate-700'
                          : announcementOffsetYMm < 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {announcementOffsetYMm === 0
                          ? '0.0 mm (Default)'
                          : announcementOffsetYMm < 0
                          ? `↑ ${Math.abs(announcementOffsetYMm).toFixed(1)} mm (Up)`
                          : `↓ ${announcementOffsetYMm.toFixed(1)} mm (Down)`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-10.0"
                      max="8.0"
                      step="0.5"
                      value={announcementOffsetYMm}
                      onChange={(e) => updateStyle('announcementOffsetYMm', parseFloat(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                      <button
                        type="button"
                        onClick={() => updateStyle('announcementOffsetYMm', Math.max(-10, Number((announcementOffsetYMm - 1).toFixed(1))))}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-bold cursor-pointer"
                        title="Move announcement 1mm UP towards table"
                      >
                        ↑ Up
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStyle('announcementOffsetYMm', 0)}
                        className="text-slate-400 hover:text-slate-600 underline cursor-pointer"
                      >
                        Reset (0)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStyle('announcementOffsetYMm', Math.min(8, Number((announcementOffsetYMm + 1).toFixed(1))))}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-bold cursor-pointer"
                        title="Move announcement 1mm DOWN towards date"
                      >
                        ↓ Down
                      </button>
                    </div>
                  </div>
                )}

                {/* 10. Footer Announcement Font & Bold Weight Card */}
                {(customizerTab === 'all' || customizerTab === 'typography') && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-800 flex items-center gap-1">
                        <span>Prize Announcement</span>
                        <span className="text-slate-500 font-sinhala font-normal">(ත්‍යාග දැන්වීම)</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px]">
                          {footerFontSizePt.toFixed(1)} pt
                        </span>
                        <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                          w:{footerFontWeight}
                        </span>
                      </div>
                    </div>

                    {/* Font Type Selector */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Sinhala Font (අකුරු මෝස්තරය)</span>
                      </div>
                      {renderFontSelect(styles.footerFontFamily, DEFAULT_STYLE_OPTIONS.footerFontFamily, SINHALA_FONT_OPTIONS, (val) => updateStyle('footerFontFamily', val))}
                    </div>

                    {/* Bold Weight Pills */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Bold Weight (තද බව)</span>
                        <span className="font-mono font-bold text-blue-700">{footerFontWeight}</span>
                      </div>
                      {renderWeightPills(styles.footerFontWeight, DEFAULT_STYLE_OPTIONS.footerFontWeight as number, (w) => updateStyle('footerFontWeight', w))}
                    </div>

                    {/* Size Slider */}
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Font Size (ප්‍රමාණය)</span>
                        <span>{footerFontSizePt.toFixed(1)} pt</span>
                      </div>
                      <input
                        type="range"
                        min="8.5"
                        max="12.0"
                        step="0.5"
                        value={footerFontSizePt}
                        onChange={(e) => updateStyle('footerFontSizePt', parseFloat(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    {/* Live Preview Tag */}
                    <div className="pt-1 border-t border-slate-100">
                      <div className="text-[10px] text-slate-400 mb-0.5">Live Preview:</div>
                      <div 
                        style={{ fontFamily: footerFontFamily, fontWeight: footerFontWeight }}
                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 truncate"
                      >
                        {sheet.footerAnnouncement || 'ගොවි සෙත රු. ලක්ෂ දෙකහමාරක්...'}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Group 3: Date & Dealer Separate Designing (දිනය සහ වෙළඳ නාමය වෙන වෙනම නිර්මාණය) */}
            <div className="space-y-1.5 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                  <span>Date & Dealer Separate Designing (දිනය සහ වෙළඳ නාමය වෙන වෙනම නිර්මාණය)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal lowercase">
                  independent fonts, bold weights & positions
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                
                {/* 11. Date & Day Design Card */}
                <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-2xs space-y-2 ring-1 ring-indigo-50">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-800 flex items-center gap-1">
                      <span>Date & Day</span>
                      <span className="text-slate-500 font-sinhala font-normal">(දිනය සහ සතිය)</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded text-[11px]">
                        {dateFontSizePt.toFixed(1)} pt
                      </span>
                      <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                        w:{dateFontWeight}
                      </span>
                      {dateOffsetYMm !== 0 && (
                        <span className="font-mono font-semibold bg-amber-50 text-amber-700 px-1 py-0.5 rounded text-[10px]">
                          {dateOffsetYMm > 0 ? `+${dateOffsetYMm.toFixed(1)}` : dateOffsetYMm.toFixed(1)}mm
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Font Type Selector */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Date Font (අකුරු වර්ගය)</span>
                    </div>
                    {renderFontSelect(styles.dateFontFamily, DEFAULT_STYLE_OPTIONS.dateFontFamily, NUMBER_FONT_OPTIONS, (val) => updateStyle('dateFontFamily', val))}
                  </div>

                  {/* Bold Weight Pills */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Bold Weight (තද බව)</span>
                      <span className="font-mono font-bold text-indigo-700">{dateFontWeight}</span>
                    </div>
                    {renderWeightPills(styles.dateFontWeight, DEFAULT_STYLE_OPTIONS.dateFontWeight as number, (w) => updateStyle('dateFontWeight', w))}
                  </div>

                  {/* Size slider */}
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Size (අකුරු ප්‍රමාණය)</span>
                      <span>{dateFontSizePt.toFixed(1)} pt</span>
                    </div>
                    <input
                      type="range"
                      min="10.0"
                      max="16.5"
                      step="0.5"
                      value={dateFontSizePt}
                      onChange={(e) => updateStyle('dateFontSizePt', parseFloat(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  {/* Vertical Position stepper */}
                  <div className="pt-1 border-t border-slate-100 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Vertical Move (ඉහළ/පහළ)</span>
                      <span className="font-mono font-bold text-slate-700">
                        {dateOffsetYMm === 0 ? '0mm (Centered)' : `${dateOffsetYMm > 0 ? '+' : ''}${dateOffsetYMm.toFixed(1)}mm`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <button
                        type="button"
                        onClick={() => updateStyle('dateOffsetYMm', Math.max(-6, Number((dateOffsetYMm - 0.5).toFixed(1))))}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-bold cursor-pointer"
                        title="Move Date UP"
                      >
                        ↑ Up
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStyle('dateOffsetYMm', 0)}
                        className="text-slate-400 hover:text-slate-600 underline cursor-pointer"
                      >
                        Reset (0)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStyle('dateOffsetYMm', Math.min(6, Number((dateOffsetYMm + 0.5).toFixed(1))))}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-bold cursor-pointer"
                        title="Move Date DOWN"
                      >
                        ↓ Down
                      </button>
                    </div>
                  </div>

                  {/* Live Preview Tag */}
                  <div className="pt-1 border-t border-slate-100">
                    <div className="text-[10px] text-slate-400 mb-0.5">Live Preview:</div>
                    <div 
                      style={{ fontWeight: dateFontWeight }}
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 flex justify-between items-center truncate"
                    >
                      <span style={{ fontFamily: dateFontFamily }}>{formattedDate}</span>
                      <span style={{ fontFamily: dealerFontFamily }}>{sheet.dayOfWeekSi}</span>
                    </div>
                  </div>
                </div>

                {/* 12. Dealer Name Design Card */}
                <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-2xs space-y-2 ring-1 ring-indigo-50">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-800 flex items-center gap-1">
                      <span>Dealer Name</span>
                      <span className="text-slate-500 font-sinhala font-normal">(වෙළඳ නාමය)</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded text-[11px]">
                        {dealerFontSizePt.toFixed(1)} pt
                      </span>
                      <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                        w:{dealerFontWeight}
                      </span>
                      {dealerOffsetYMm !== 0 && (
                        <span className="font-mono font-semibold bg-amber-50 text-amber-700 px-1 py-0.5 rounded text-[10px]">
                          {dealerOffsetYMm > 0 ? `+${dealerOffsetYMm.toFixed(1)}` : dealerOffsetYMm.toFixed(1)}mm
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Font Type Selector */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Sinhala Font (අකුරු මෝස්තරය)</span>
                    </div>
                    {renderFontSelect(styles.dealerFontFamily, DEFAULT_STYLE_OPTIONS.dealerFontFamily, SINHALA_FONT_OPTIONS, (val) => updateStyle('dealerFontFamily', val))}
                  </div>

                  {/* Bold Weight Pills */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Bold Weight (තද බව)</span>
                      <span className="font-mono font-bold text-indigo-700">{dealerFontWeight}</span>
                    </div>
                    {renderWeightPills(styles.dealerFontWeight, DEFAULT_STYLE_OPTIONS.dealerFontWeight as number, (w) => updateStyle('dealerFontWeight', w))}
                  </div>

                  {/* Size slider */}
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Size (අකුරු ප්‍රමාණය)</span>
                      <span>{dealerFontSizePt.toFixed(1)} pt</span>
                    </div>
                    <input
                      type="range"
                      min="10.0"
                      max="16.5"
                      step="0.5"
                      value={dealerFontSizePt}
                      onChange={(e) => updateStyle('dealerFontSizePt', parseFloat(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  {/* Vertical Position stepper */}
                  <div className="pt-1 border-t border-slate-100 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Vertical Move (ඉහළ/පහළ)</span>
                      <span className="font-mono font-bold text-slate-700">
                        {dealerOffsetYMm === 0 ? '0mm (Centered)' : `${dealerOffsetYMm > 0 ? '+' : ''}${dealerOffsetYMm.toFixed(1)}mm`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <button
                        type="button"
                        onClick={() => updateStyle('dealerOffsetYMm', Math.max(-6, Number((dealerOffsetYMm - 0.5).toFixed(1))))}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-bold cursor-pointer"
                        title="Move Dealer UP"
                      >
                        ↑ Up
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStyle('dealerOffsetYMm', 0)}
                        className="text-slate-400 hover:text-slate-600 underline cursor-pointer"
                      >
                        Reset (0)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStyle('dealerOffsetYMm', Math.min(6, Number((dealerOffsetYMm + 0.5).toFixed(1))))}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-bold cursor-pointer"
                        title="Move Dealer DOWN"
                      >
                        ↓ Down
                      </button>
                    </div>
                  </div>

                  {/* Live Preview Tag */}
                  <div className="pt-1 border-t border-slate-100">
                    <div className="text-[10px] text-slate-400 mb-0.5">Live Preview:</div>
                    <div 
                      style={{ fontFamily: dealerFontFamily, fontWeight: dealerFontWeight }}
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 text-right truncate"
                    >
                      {sheet.headerDealerName || 'S.W.ඔස්මන් ද සිල්වා'}
                    </div>
                  </div>
                </div>

                {/* 13. Bottom Design Style (පහළ විලාසිතා ආකෘතිය) */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-800">
                        Bottom Style <span className="text-slate-500 font-sinhala font-normal">(විලාසිතාව)</span>
                      </label>
                      <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {bottomLayoutStyle === 'boxed' ? 'Boxed' : 'Clean'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Choose between clean plain text or official rounded border boxes.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => updateStyle('bottomLayoutStyle', 'clean')}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        bottomLayoutStyle === 'clean'
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold shadow-2xs'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="text-[11px] font-bold">Clean Text</div>
                      <div className="text-[9px] text-slate-500 font-sinhala">සාමාන්‍ය පිරිසිදු පෙළ</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStyle('bottomLayoutStyle', 'boxed')}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        bottomLayoutStyle === 'boxed'
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold shadow-2xs'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="text-[11px] font-bold">Boxed Pill</div>
                      <div className="text-[9px] text-slate-500 font-sinhala">රාමු සහිත පෙට්ටි</div>
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Main Preview Container with paper drop shadow */}
      <div className="flex-1 overflow-auto p-4 bg-slate-200/80 flex items-start justify-center">
        
        {/* Exact A4 Landscape Page Container (297mm x 210mm) scaled properly */}
        <div
          style={{
            width: `${297 * scale}mm`,
            height: `${210 * scale}mm`,
            position: 'relative',
          }}
          className="shadow-xl bg-white shrink-0 my-auto border border-slate-300 transition-all"
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: '297mm',
              height: '210mm',
            }}
            className="absolute top-0 left-0 bg-white"
          >
            {/* 297mm width x 210mm height Page Container */}
            <div 
              style={{ width: '297mm', height: '210mm' }}
              className="relative flex flex-row box-border bg-white overflow-hidden"
            >
              
              {/* Left Half (exactly 148.5mm wide, padding-top: topMarginMm) */}
              <div 
                style={{ 
                  width: '148.5mm', 
                  height: '210mm',
                  paddingTop: `${topMarginMm}mm`,
                  paddingBottom: '5mm',
                  boxSizing: 'border-box'
                }}
                className="flex flex-col items-center justify-start overflow-hidden transition-all"
              >
                {renderSingleCopy()}
              </div>

              {/* Centre Cutting Guide exactly on the 148.5mm center seam */}
              {showCutGuide && (
                <div 
                  style={{ left: '148.5mm', width: '20px', marginLeft: '-10px' }}
                  className="absolute top-[6mm] bottom-[6mm] flex flex-col justify-around items-center pointer-events-none z-10"
                >
                  {/* Vertical dashed line */}
                  <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 border-l border-dashed border-slate-400" />
                  
                  {/* Scissor markers with white backdrop */}
                  <span className="text-[10px] text-slate-500 bg-white p-0.5 rotate-90 z-20">✂</span>
                  <span className="text-[10px] text-slate-500 bg-white p-0.5 rotate-90 z-20">✂</span>
                  <span className="text-[10px] text-slate-500 bg-white p-0.5 rotate-90 z-20">✂</span>
                </div>
              )}

              {/* Right Half (exactly 148.5mm wide, padding-top: topMarginMm, 100% IDENTICAL) */}
              <div 
                style={{ 
                  width: '148.5mm', 
                  height: '210mm',
                  paddingTop: `${topMarginMm}mm`,
                  paddingBottom: '5mm',
                  boxSizing: 'border-box'
                }}
                className="flex flex-col items-center justify-start overflow-hidden transition-all"
              >
                {renderSingleCopy()}
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Footer bar */}
      <div className="p-2 px-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span>A4 Landscape • 2 Copies Side-by-Side</span>
          <span className="text-slate-300">•</span>
          <span className="font-mono text-slate-600">
            Top: {topMarginMm.toFixed(1)}mm | Row: {rowHeightMm.toFixed(1)}mm | Font: {resultFontSizePt.toFixed(1)}pt | Gap: {contentGapMm.toFixed(1)}mm | Announce Y: {announcementOffsetYMm > 0 ? `+${announcementOffsetYMm.toFixed(1)}` : announcementOffsetYMm.toFixed(1)}mm
          </span>
        </div>
        <span className="font-semibold text-emerald-700">Strict 1-Page Output Enforced</span>
      </div>

      {/* Save Custom Design Modal */}
      <SaveDesignModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        currentStyles={styles}
        onSave={handleSaveCustomDesign}
        existingDesigns={savedDesigns}
      />

    </div>
  );
};
