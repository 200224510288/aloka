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
  Minus,
  Type,
  Bold,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  Ruler,
  MoveVertical,
  Check,
  ShieldCheck,
  Expand
} from 'lucide-react';
import SaveDesignModal from './SaveDesignModal';
import { calculateRowSpacing, getAllRowsSpacing } from '@/lib/row-spacing';

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
  hideLayoutControls?: boolean;
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
  hideLayoutControls = false,
}) => {
  const [scale, setScale] = useState<number>(hideLayoutControls ? 0.82 : 0.46);
  const [showCutGuide, setShowCutGuide] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(!hideLayoutControls);
  const [activePreset, setActivePreset] = useState<string>('standard');
  const [savedDesigns, setSavedDesigns] = useState<SavedCustomDesign[]>([]);
  const [defaultDesignId, setDefaultDesignId] = useState<string | null>(null);
  const [activeCustomDesignId, setActiveCustomDesignId] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [customizerTab, setCustomizerTab] = useState<'presets' | 'typography' | 'spacing'>('presets');

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
    } catch { }

    if (newDesign.isDefault) {
      setDefaultDesignId(newDesign.id);
      try {
        localStorage.setItem('sinhala_lottery_default_design_id', newDesign.id);
      } catch { }
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
      } catch { }
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
    } catch { }
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
      } catch { }
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
      } catch { }
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
      } catch { }
      onStylesChange?.(next);
      return next;
    });
  };

  const resetStyles = () => {
    setActivePreset('standard');
    setStyles({ ...DEFAULT_STYLE_OPTIONS, printDensity });
    try {
      localStorage.setItem('sinhala_lottery_preview_styles', JSON.stringify(DEFAULT_STYLE_OPTIONS));
    } catch { }
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
  const zodiacIconSizeMm = styles.zodiacIconSizeMm ?? DEFAULT_STYLE_OPTIONS.zodiacIconSizeMm;
  const showRowTick = styles.showRowTick ?? DEFAULT_STYLE_OPTIONS.showRowTick;
  const rowTickPosition = styles.rowTickPosition ?? DEFAULT_STYLE_OPTIONS.rowTickPosition;
  const rowTickColor = styles.rowTickColor ?? DEFAULT_STYLE_OPTIONS.rowTickColor;
  const enableSpacingSafetyLimit = styles.enableSpacingSafetyLimit ?? DEFAULT_STYLE_OPTIONS.enableSpacingSafetyLimit;
  const expandShortRows = styles.expandShortRows ?? DEFAULT_STYLE_OPTIONS.expandShortRows;
  const shortRowsExtraGapMm = styles.shortRowsExtraGapMm ?? DEFAULT_STYLE_OPTIONS.shortRowsExtraGapMm;

  // Real-time calculation of safe row gaps for all 18 lotteries
  const spacingSummary = getAllRowsSpacing(sheet.lotteries, STANDARD_LOTTERIES, styles);

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
      } catch { }
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
              className={`px-1.5 py-0.5 text-[10px] rounded transition cursor-pointer ${isSelected
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

  // Helper: Render slider with precise - / + stepper buttons for reduced cognitive friction
  const renderSliderWithStepper = (
    label: string,
    sinhalaLabel: string,
    value: number,
    unit: string,
    min: number,
    max: number,
    step: number,
    onChange: (val: number) => void,
    defaultValue?: number
  ) => {
    const handleStep = (delta: number) => {
      const next = Math.min(max, Math.max(min, Number((value + delta).toFixed(2))));
      onChange(next);
    };

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
            <span>{label}</span>
            <span className="text-slate-500 font-sinhala font-normal">({sinhalaLabel})</span>
          </label>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
              {value.toFixed(1)} {unit}
            </span>
            {defaultValue !== undefined && value !== defaultValue && (
              <button
                type="button"
                onClick={() => onChange(defaultValue)}
                className="text-[10px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                title={`Reset to default (${defaultValue}${unit})`}
              >
                Reset
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleStep(-step)}
            disabled={value <= min}
            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 font-bold text-xs flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-300"
            title={`Decrease by ${step}${unit}`}
          >
            -
          </button>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="flex-1 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <button
            type="button"
            onClick={() => handleStep(step)}
            disabled={value >= max}
            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 font-bold text-xs flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-300"
            title={`Increase by ${step}${unit}`}
          >
            +
          </button>
        </div>
      </div>
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
    dealerFontWeight !== DEFAULT_STYLE_OPTIONS.dealerFontWeight ||
    enableSpacingSafetyLimit !== DEFAULT_STYLE_OPTIONS.enableSpacingSafetyLimit ||
    expandShortRows !== DEFAULT_STYLE_OPTIONS.expandShortRows ||
    shortRowsExtraGapMm !== DEFAULT_STYLE_OPTIONS.shortRowsExtraGapMm;

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

                const rowSpacing = spacingSummary.rowSpacings[def.id] || calculateRowSpacing(def.id, item, def, styles);
                const rowGapMm = rowSpacing.gapMm;

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
                          <img
                            src={iconSrc}
                            alt={item.zodiac}
                            style={{ width: `${zodiacIconSizeMm}mm`, height: `${zodiacIconSizeMm}mm` }}
                            className="object-contain inline-block shrink-0"
                          />
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
                          className={`leading-none inline-block text-black ${isBoxed
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
                      className={`flex items-center h-full overflow-hidden whitespace-nowrap w-full ${showRowTick && rowTickPosition === 'right' ? 'justify-between' : ''
                        }`}
                    >
                      <div
                        style={{ gap: `${rowGapMm}mm` }}
                        className="flex items-center h-full overflow-hidden whitespace-nowrap"
                        title={
                          rowSpacing.isClamped
                            ? `🛡️ Safe border guard active: Clamped to ${rowGapMm}mm to prevent border overlap`
                            : rowSpacing.isExpanded
                              ? `✨ Expanded short row: ${rowGapMm}mm spacing`
                              : undefined
                        }
                      >
                        {parts}
                      </div>

                      {showRowTick && (
                        <span
                          style={{
                            fontSize: `${Math.max(10, resultFontSizePt - 4)}pt`,
                            color: rowTickColor || '#000000',
                          }}
                          className={`font-black leading-none shrink-0 select-none ${rowTickPosition === 'right' ? 'pr-1.5' : 'pl-2'
                            }`}
                          title="Verified row (සත්‍යාපිත ටික් ලකුණ)"
                        >
                          ✓
                        </span>
                      )}
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
              className={`inline-flex items-center gap-3 transition-all ${bottomLayoutStyle === 'boxed'
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
              className={`inline-flex items-center text-right tracking-tight transition-all ${bottomLayoutStyle === 'boxed'
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
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2">
          {/* Custom Layout Controls Toggle Button (Hidden in Staff Quick Print Mode) */}
          {!hideLayoutControls && (
            <>
              <button
                type="button"
                onClick={() => setShowSettings(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-bold transition border cursor-pointer ${showSettings
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : hasCustomChanges
                      ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                title={showSettings ? 'Hide layout controls sidebar' : 'Show layout controls sidebar'}
              >
                {showSettings ? (
                  <PanelLeftClose className="w-3.5 h-3.5" />
                ) : (
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                )}
                <span>{showSettings ? 'Hide Controls' : 'Layout Controls (සැකසුම්)'}</span>
                {hasCustomChanges && !showSettings && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                )}
              </button>

              <div className="h-4 w-px bg-slate-300 hidden sm:block" />
            </>
          )}

          <div className="flex items-center gap-1.5">
            <Printer className="w-4 h-4 text-blue-600 hidden sm:block" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-800">
              Print Preview — A4 Landscape
            </h2>
            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded hidden md:inline">
              2 Copies • 297 × 210 mm
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Ink-Saver Print Density Toggle */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => onDensityChange?.('eco')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${!isHighDensity
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
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${isHighDensity
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
            className={`px-2 py-1 text-xs rounded border flex items-center gap-1 transition cursor-pointer ${showCutGuide ? 'bg-slate-200 text-slate-800 font-semibold' : 'text-slate-500 bg-white'
              }`}
            title="Toggle centre cut guide"
          >
            <Scissors className="w-3 h-3" />
            <span className="hidden sm:inline">Cut Guide</span>
          </button>

          {/* Scale controls */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs">
            <button
              onClick={() => setScale(s => Math.max(0.35, Number((s - 0.05).toFixed(2))))}
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
            className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 shadow-xs transition cursor-pointer ${canExport
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* 2-Column Split Workspace: Left Controls Sidebar + Right Live Preview */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-[620px]">

        {/* Left Side: Layout Controls Sidebar (Hidden in Staff Quick Print Mode) */}
        {!hideLayoutControls && showSettings && (
          <aside className="w-full lg:w-[410px] xl:w-[440px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50 flex flex-col z-10 overflow-hidden shadow-xs">

            {/* Sidebar Header */}
            <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-extrabold text-slate-800">Layout Controls (සැකසුම්)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                  {activeCustomDesignId ? (savedDesigns.find(d => d.id === activeCustomDesignId)?.name || 'Custom') : activePreset}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCustomDesignId(null);
                    resetStyles();
                  }}
                  className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                  title="Reset all settings to default"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                  title="Collapse layout controls panel"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3 Focused Segmented Tabs */}
            <div className="p-2 bg-slate-100 border-b border-slate-200">
              <div className="grid grid-cols-3 gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCustomizerTab('presets')}
                  className={`py-1.5 px-2 rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${customizerTab === 'presets'
                      ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Presets</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomizerTab('typography')}
                  className={`py-1.5 px-2 rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${customizerTab === 'typography'
                      ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <Type className="w-3.5 h-3.5 text-blue-600" />
                  <span>Fonts</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomizerTab('spacing')}
                  className={`py-1.5 px-2 rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${customizerTab === 'spacing'
                      ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <Ruler className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Spacing</span>
                </button>
              </div>
            </div>

            {/* Scrollable Tab Content with Reduced Cognitive Load */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 max-h-[calc(100vh-320px)] lg:max-h-[720px]">

              {/* TAB 1: PRESETS & SAVED */}
              {customizerTab === 'presets' && (
                <div className="space-y-3 animate-in fade-in duration-100">
                  {/* Preset Buttons Grid */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Ready-Made Presets (මෝස්තර)</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 pt-1">
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
                            className={`p-2 rounded-lg border text-left transition cursor-pointer flex items-center justify-between ${isSelected
                                ? 'bg-blue-50/70 border-blue-500 text-blue-900 ring-1 ring-blue-500 shadow-2xs'
                                : 'bg-slate-50/60 hover:bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                          >
                            <div>
                              <div className="text-xs font-bold flex items-center gap-1.5">
                                <span>{preset.label}</span>
                                {isSelected && (
                                  <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-bold">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">{preset.description}</div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Whole-Sheet Quick Boldness */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Bold className="w-3.5 h-3.5 text-blue-600" />
                        <span>Whole-Sheet Boldness (තද බව)</span>
                      </span>
                      <span className="text-[10px] text-slate-400">1-click format</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => applyBoldnessPreset('light')}
                        className="p-2 text-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer text-slate-700"
                        title="Clean 500 weight across all sheet text"
                      >
                        <div className="text-xs font-medium">Clean (500)</div>
                        <div className="text-[9px] text-slate-400">පිරිසිදු අර්ධ තද</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyBoldnessPreset('standard')}
                        className="p-2 text-center rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-100 transition cursor-pointer text-blue-800 font-bold"
                        title="Standard Bold 700-800 across all sheet text"
                      >
                        <div className="text-xs font-bold">Standard (700)</div>
                        <div className="text-[9px] text-blue-500">සම්මත තද</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyBoldnessPreset('heavy')}
                        className="p-2 text-center rounded-lg border border-slate-800 bg-slate-900 hover:bg-black transition cursor-pointer text-white font-black"
                        title="Ultra Black 900 across all sheet text"
                      >
                        <div className="text-xs font-black">Ultra (900)</div>
                        <div className="text-[9px] text-slate-300">අතිශය තද</div>
                      </button>
                    </div>
                  </div>

                  {/* User's Saved Designs */}
                  <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                        <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Saved Designs (සුරකින ලද)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsSaveModalOpen(true)}
                        className="px-2 py-0.5 text-[11px] font-bold rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 flex items-center gap-1 transition cursor-pointer"
                        title="Save current layout as a custom preset"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Save Current</span>
                      </button>
                    </div>

                    {savedDesigns.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic py-1">
                        No custom presets saved yet. Adjust any setting and click &quot;Save Current&quot; to save your favorite layout.
                      </p>
                    ) : (
                      <div className="space-y-1.5 pt-1">
                        {savedDesigns.map((design) => {
                          const isSelected = activeCustomDesignId === design.id;
                          const isDefault = defaultDesignId === design.id;
                          return (
                            <div
                              key={design.id}
                              className={`flex items-center justify-between p-1.5 rounded-lg border transition text-xs ${isSelected
                                  ? 'bg-indigo-50/70 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500'
                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                                }`}
                            >
                              <button
                                type="button"
                                onClick={() => applyCustomDesign(design)}
                                className="flex-1 text-left font-bold flex items-center gap-1.5 cursor-pointer truncate"
                              >
                                <Bookmark className={`w-3 h-3 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                                <span className="truncate">{design.name}</span>
                                {isDefault && (
                                  <span className="text-[9px] bg-amber-400 text-slate-900 px-1 rounded font-extrabold shrink-0">
                                    Default
                                  </span>
                                )}
                              </button>

                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => toggleDefaultDesign(design.id)}
                                  className={`p-1 hover:bg-slate-200 rounded transition cursor-pointer ${isDefault ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
                                    }`}
                                  title={isDefault ? 'Default design on startup' : 'Set as default on startup'}
                                >
                                  <Star className={`w-3.5 h-3.5 ${isDefault ? 'fill-amber-400 text-amber-500' : ''}`} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteCustomDesign(design.id)}
                                  className="p-1 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                                  title="Delete design"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: TYPOGRAPHY & WEIGHTS */}
              {customizerTab === 'typography' && (
                <div className="space-y-3 animate-in fade-in duration-100">
                  {/* Quick Boldness Toolbar */}
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Bold className="w-3.5 h-3.5 text-blue-600" />
                      <span>Quick Bold:</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => applyBoldnessPreset('light')}
                        className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium transition cursor-pointer"
                      >
                        500
                      </button>
                      <button
                        type="button"
                        onClick={() => applyBoldnessPreset('standard')}
                        className="px-2 py-0.5 text-[10px] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-blue-700 font-bold transition cursor-pointer"
                      >
                        700
                      </button>
                      <button
                        type="button"
                        onClick={() => applyBoldnessPreset('heavy')}
                        className="px-2 py-0.5 text-[10px] bg-slate-900 hover:bg-black rounded text-white font-black transition cursor-pointer"
                      >
                        900
                      </button>
                    </div>
                  </div>

                  {/* 1. Winning Digits */}
                  <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-2xs space-y-2 ring-1 ring-blue-50/50">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-xs text-slate-800 flex items-center gap-1">
                        <span>Winning Digits</span>
                        <span className="text-slate-500 font-sinhala font-normal">(දිනුම් අංක)</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                          {resultFontSizePt.toFixed(1)} pt
                        </span>
                        <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                          w:{resultFontWeight}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-medium">Font Family</span>
                      {renderFontSelect(styles.resultFontFamily, DEFAULT_STYLE_OPTIONS.resultFontFamily, NUMBER_FONT_OPTIONS, (val) => updateStyle('resultFontFamily', val))}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>Bold Weight (තද බව)</span>
                        <span className="font-mono font-bold text-blue-700">{resultFontWeight}</span>
                      </div>
                      {renderWeightPills(styles.resultFontWeight, DEFAULT_STYLE_OPTIONS.resultFontWeight as number, (w) => updateStyle('resultFontWeight', w))}
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      {renderSliderWithStepper(
                        'Font Size',
                        'ප්‍රමාණය',
                        resultFontSizePt,
                        'pt',
                        14.0,
                        19.5,
                        0.5,
                        (val) => updateStyle('resultFontSizePt', val),
                        DEFAULT_STYLE_OPTIONS.resultFontSizePt
                      )}
                    </div>
                  </div>

                  {/* 2. English Letter */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-xs text-slate-800 flex items-center gap-1">
                        <span>Result Letter</span>
                        <span className="text-slate-500 font-sinhala font-normal">(ඉංග්‍රීසි අකුර)</span>
                      </label>
                      <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                        w:{letterFontWeight}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-medium">Font Family</span>
                      {renderFontSelect(styles.letterFontFamily, DEFAULT_STYLE_OPTIONS.letterFontFamily, NUMBER_FONT_OPTIONS, (val) => updateStyle('letterFontFamily', val))}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>Bold Weight (තද බව)</span>
                        <span className="font-mono font-bold text-blue-700">{letterFontWeight}</span>
                      </div>
                      {renderWeightPills(styles.letterFontWeight, DEFAULT_STYLE_OPTIONS.letterFontWeight as number, (w) => updateStyle('letterFontWeight', w))}
                    </div>
                  </div>

                  {/* 3. Zodiac Sign & Icon Size */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-xs text-slate-800 flex items-center gap-1">
                        <span>Zodiac Icon Size</span>
                        <span className="text-slate-500 font-sinhala font-normal">(ලග්න අයිකන ප්‍රමාණය)</span>
                      </label>
                      <span className="font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                        {zodiacIconSizeMm.toFixed(1)} mm
                      </span>
                    </div>

                    <div className="pt-1">
                      {renderSliderWithStepper(
                        'Icon Size',
                        'අයිකන ප්‍රමාණය',
                        zodiacIconSizeMm,
                        'mm',
                        3.0,
                        8.5,
                        0.2,
                        (val) => updateStyle('zodiacIconSizeMm', val),
                        DEFAULT_STYLE_OPTIONS.zodiacIconSizeMm
                      )}
                      <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                        <span>3.0mm (කුඩා)</span>
                        <span className="text-slate-600 font-medium">Default: 5.4mm</span>
                        <span>8.5mm (විශාල)</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Lottery Name */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-xs text-slate-800 flex items-center gap-1">
                        <span>Lottery Name</span>
                        <span className="text-slate-500 font-sinhala font-normal">(ලොතරැයි නම)</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                          {lotteryNameFontSizePt.toFixed(1)} pt
                        </span>
                        <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                          w:{lotteryNameFontWeight}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-medium">Sinhala Font (අකුරු මෝස්තරය)</span>
                      {renderFontSelect(styles.lotteryNameFontFamily, DEFAULT_STYLE_OPTIONS.lotteryNameFontFamily, SINHALA_FONT_OPTIONS, (val) => updateStyle('lotteryNameFontFamily', val))}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>Bold Weight (තද බව)</span>
                        <span className="font-mono font-bold text-blue-700">{lotteryNameFontWeight}</span>
                      </div>
                      {renderWeightPills(styles.lotteryNameFontWeight, DEFAULT_STYLE_OPTIONS.lotteryNameFontWeight as number, (w) => updateStyle('lotteryNameFontWeight', w))}
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      {renderSliderWithStepper(
                        'Font Size',
                        'ප්‍රමාණය',
                        lotteryNameFontSizePt,
                        'pt',
                        9.0,
                        12.5,
                        0.5,
                        (val) => updateStyle('lotteryNameFontSizePt', val),
                        DEFAULT_STYLE_OPTIONS.lotteryNameFontSizePt
                      )}
                    </div>
                  </div>

                  {/* 5. Draw Number */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-xs text-slate-800 flex items-center gap-1">
                        <span>Draw Number</span>
                        <span className="text-slate-500 font-sinhala font-normal">(වාර අංකය)</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                          {drawNoFontSizePt.toFixed(1)} pt
                        </span>
                        <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                          w:{drawNoFontWeight}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-medium">Font Family</span>
                      {renderFontSelect(styles.drawNoFontFamily, DEFAULT_STYLE_OPTIONS.drawNoFontFamily, NUMBER_FONT_OPTIONS, (val) => updateStyle('drawNoFontFamily', val))}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>Bold Weight (තද බව)</span>
                        <span className="font-mono font-bold text-blue-700">{drawNoFontWeight}</span>
                      </div>
                      {renderWeightPills(styles.drawNoFontWeight, DEFAULT_STYLE_OPTIONS.drawNoFontWeight as number, (w) => updateStyle('drawNoFontWeight', w))}
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      {renderSliderWithStepper(
                        'Font Size',
                        'ප්‍රමාණය',
                        drawNoFontSizePt,
                        'pt',
                        9.5,
                        13.5,
                        0.5,
                        (val) => updateStyle('drawNoFontSizePt', val),
                        DEFAULT_STYLE_OPTIONS.drawNoFontSizePt
                      )}
                    </div>
                  </div>

                  {/* 6. Prize Announcement */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-xs text-slate-800 flex items-center gap-1">
                        <span>Prize Announcement</span>
                        <span className="text-slate-500 font-sinhala font-normal">(ත්‍යාග දැන්වීම)</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                          {footerFontSizePt.toFixed(1)} pt
                        </span>
                        <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                          w:{footerFontWeight}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-medium">Sinhala Font (අකුරු මෝස්තරය)</span>
                      {renderFontSelect(styles.footerFontFamily, DEFAULT_STYLE_OPTIONS.footerFontFamily, SINHALA_FONT_OPTIONS, (val) => updateStyle('footerFontFamily', val))}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>Bold Weight (තද බව)</span>
                        <span className="font-mono font-bold text-blue-700">{footerFontWeight}</span>
                      </div>
                      {renderWeightPills(styles.footerFontWeight, DEFAULT_STYLE_OPTIONS.footerFontWeight as number, (w) => updateStyle('footerFontWeight', w))}
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      {renderSliderWithStepper(
                        'Font Size',
                        'ප්‍රමාණය',
                        footerFontSizePt,
                        'pt',
                        8.5,
                        12.0,
                        0.5,
                        (val) => updateStyle('footerFontSizePt', val),
                        DEFAULT_STYLE_OPTIONS.footerFontSizePt
                      )}
                    </div>
                  </div>

                  {/* 7. Date & Dealer Typography */}
                  <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-2xs space-y-3">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <span>Date & Dealer (දිනය සහ වෙළඳ නාමය)</span>
                    </span>

                    {/* Date Sub-section */}
                    <div className="space-y-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                        <span>Date & Day (දිනය)</span>
                        <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {dateFontSizePt.toFixed(1)} pt • w:{dateFontWeight}
                        </span>
                      </div>
                      {renderFontSelect(styles.dateFontFamily, DEFAULT_STYLE_OPTIONS.dateFontFamily, NUMBER_FONT_OPTIONS, (val) => updateStyle('dateFontFamily', val))}
                      {renderWeightPills(styles.dateFontWeight, DEFAULT_STYLE_OPTIONS.dateFontWeight as number, (w) => updateStyle('dateFontWeight', w))}
                      {renderSliderWithStepper(
                        'Date Size',
                        'ප්‍රමාණය',
                        dateFontSizePt,
                        'pt',
                        10.0,
                        16.5,
                        0.5,
                        (val) => updateStyle('dateFontSizePt', val),
                        DEFAULT_STYLE_OPTIONS.dateFontSizePt
                      )}
                    </div>

                    {/* Dealer Sub-section */}
                    <div className="space-y-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                        <span>Dealer Name (වෙළඳ නාමය)</span>
                        <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {dealerFontSizePt.toFixed(1)} pt • w:{dealerFontWeight}
                        </span>
                      </div>
                      {renderFontSelect(styles.dealerFontFamily, DEFAULT_STYLE_OPTIONS.dealerFontFamily, SINHALA_FONT_OPTIONS, (val) => updateStyle('dealerFontFamily', val))}
                      {renderWeightPills(styles.dealerFontWeight, DEFAULT_STYLE_OPTIONS.dealerFontWeight as number, (w) => updateStyle('dealerFontWeight', w))}
                      {renderSliderWithStepper(
                        'Dealer Size',
                        'ප්‍රමාණය',
                        dealerFontSizePt,
                        'pt',
                        10.0,
                        16.5,
                        0.5,
                        (val) => updateStyle('dealerFontSizePt', val),
                        DEFAULT_STYLE_OPTIONS.dealerFontSizePt
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SPACING & LAYOUT */}
              {customizerTab === 'spacing' && (
                <div className="space-y-3 animate-in fade-in duration-100">
                  {/* Table & Margin Dimensions */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Table Dimensions (පිටු සැකසුම)</span>
                    </span>

                    {/* Top Free Space Margin */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-800">
                          Top Free Space <span className="text-slate-500 font-sinhala font-normal">(ඉහළ හිස් ඉඩ)</span>
                        </label>
                        <span className="font-mono text-[11px] font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded">
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
                        className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                      />
                      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                        <button
                          type="button"
                          onClick={() => updateStyle('topMarginMm', Math.max(0, Number((topMarginMm - 1).toFixed(1))))}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-bold cursor-pointer"
                        >
                          -1 mm
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
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-bold cursor-pointer"
                        >
                          +1 mm
                        </button>
                      </div>
                    </div>

                    {/* Row Height */}
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      {renderSliderWithStepper(
                        'Row Height',
                        'පේළි උස',
                        rowHeightMm,
                        'mm',
                        8.5,
                        10.2,
                        0.1,
                        (val) => updateStyle('rowHeightMm', val),
                        DEFAULT_STYLE_OPTIONS.rowHeightMm
                      )}
                      <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                        <span>8.5mm (Tight)</span>
                        <span className="font-medium text-slate-600">18 × {rowHeightMm.toFixed(1)} = {(18 * rowHeightMm).toFixed(1)}mm table</span>
                        <span>10.2mm (Tall)</span>
                      </div>
                    </div>
                  </div>

                  {/* Cell Spacing & Padding */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <MoveVertical className="w-3.5 h-3.5 text-blue-600" />
                      <span>Cell Spacing & Padding (පරතර)</span>
                    </span>

                    {/* Left Cell Padding */}
                    {renderSliderWithStepper(
                      'Left Padding',
                      'වම් පස ඉඩ',
                      cellPaddingLeftMm,
                      'mm',
                      1.0,
                      3.5,
                      0.2,
                      (val) => updateStyle('cellPaddingLeftMm', val),
                      DEFAULT_STYLE_OPTIONS.cellPaddingLeftMm
                    )}

                    {/* Numbers Spacing */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      {renderSliderWithStepper(
                        'Numbers Spacing',
                        'අංක පරතරය',
                        contentGapMm,
                        'mm',
                        1.0,
                        8.0,
                        0.2,
                        (val) => updateStyle('contentGapMm', val),
                        DEFAULT_STYLE_OPTIONS.contentGapMm
                      )}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                        <button
                          type="button"
                          onClick={() => updateStyle('contentGapMm', 2.2)}
                          className={`hover:text-blue-600 underline cursor-pointer ${contentGapMm === 2.2 ? 'text-blue-700 font-bold' : ''}`}
                        >
                          Standard (2.2mm)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStyle('contentGapMm', 4.0)}
                          className={`hover:text-blue-600 underline cursor-pointer ${contentGapMm === 4.0 ? 'text-blue-700 font-bold' : ''}`}
                        >
                          Medium (4.0mm)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStyle('contentGapMm', 6.0)}
                          className={`hover:text-blue-600 underline cursor-pointer ${contentGapMm === 6.0 ? 'text-blue-700 font-bold' : ''}`}
                        >
                          Wide (6.0mm)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Border Safety Guard */}
                  <div className={`p-3 rounded-lg border transition ${enableSpacingSafetyLimit
                      ? 'bg-blue-50/70 border-blue-200'
                      : 'bg-white border-slate-200 shadow-2xs'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className={`w-4 h-4 ${enableSpacingSafetyLimit ? 'text-blue-600' : 'text-slate-400'}`} />
                        <div>
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            Border Safety Guard
                            <span className="text-[10px] font-normal text-slate-500 font-sinhala">(සීමා ආරක්‍ෂාව)</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateStyle('enableSpacingSafetyLimit', !enableSpacingSafetyLimit)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1 ${enableSpacingSafetyLimit
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300'
                          }`}
                      >
                        <span>{enableSpacingSafetyLimit ? '✓ Active' : 'Off'}</span>
                      </button>
                    </div>

                    <p className="text-[10.5px] text-slate-600 mt-1 leading-relaxed">
                      Prevents crowded rows (e.g. <b>ලග්න වාසනා</b>, <b>ධන සම්පත</b>) from crossing or clipping the right border when numbers spacing is increased.
                    </p>

                    {/* Real-time indicator showing which rows are clamped */}
                    {enableSpacingSafetyLimit && spacingSummary.clampedCount > 0 ? (
                      <div className="mt-2 p-2 bg-amber-50/90 border border-amber-200 rounded text-[11px] text-amber-900 flex items-start gap-1.5 animate-in fade-in duration-150">
                        <span className="font-bold shrink-0">🛡️ Auto-Clamped:</span>
                        <div className="space-y-0.5">
                          {spacingSummary.clampedRows.map(r => (
                            <div key={r.id} className="flex items-center gap-1">
                              <span className="font-semibold text-amber-950 font-sinhala">{r.nameSi}</span>
                              <span className="text-[10px] text-amber-700">(safely clamped to {r.maxSafeGapMm}mm)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : enableSpacingSafetyLimit ? (
                      <div className="mt-1.5 text-[10px] text-blue-700/80 flex items-center gap-1 font-medium">
                        <span>✓ All rows comfortably inside border boundaries.</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Expand Short Rows */}
                  <div className={`p-3 rounded-lg border transition space-y-2 ${expandShortRows
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-white border-slate-200 shadow-2xs'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Expand className={`w-4 h-4 ${expandShortRows ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <div>
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            Expand Short Rows
                            <span className="text-[10px] font-normal text-slate-500 font-sinhala">(කෙටි පේළි පුළුල් කිරීම)</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateStyle('expandShortRows', !expandShortRows)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1 ${expandShortRows
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300'
                          }`}
                      >
                        <span>{expandShortRows ? '✓ Enabled' : 'Off'}</span>
                      </button>
                    </div>

                    <p className="text-[10.5px] text-slate-600 leading-relaxed">
                      Expands rows with fewer items (e.g. <b>සසිරි</b>, <b>ආයුබෝ</b>, <b>NLB ජය</b>, <b>සුබ දවසක්</b>, <b>වාසි</b>) across the cell while keeping crowded rows safely contained.
                    </p>

                    {expandShortRows && (
                      <div className="pt-2 border-t border-emerald-200/70 space-y-2 animate-in fade-in duration-100">
                        {renderSliderWithStepper(
                          'Short Rows Extra Spacing',
                          'කෙටි පේළි අමතර පරතරය',
                          shortRowsExtraGapMm,
                          'mm',
                          0.5,
                          5.0,
                          0.2,
                          (val) => updateStyle('shortRowsExtraGapMm', val),
                          DEFAULT_STYLE_OPTIONS.shortRowsExtraGapMm
                        )}
                        <div className="flex justify-between items-center text-[10px] text-emerald-700 pt-0.5">
                          <button
                            type="button"
                            onClick={() => updateStyle('shortRowsExtraGapMm', 1.0)}
                            className={`hover:underline cursor-pointer ${shortRowsExtraGapMm === 1.0 ? 'font-bold underline' : ''}`}
                          >
                            Subtle (+1.0mm)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStyle('shortRowsExtraGapMm', 2.0)}
                            className={`hover:underline cursor-pointer ${shortRowsExtraGapMm === 2.0 ? 'font-bold underline' : ''}`}
                          >
                            Balanced (+2.0mm)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStyle('shortRowsExtraGapMm', 3.5)}
                            className={`hover:underline cursor-pointer ${shortRowsExtraGapMm === 3.5 ? 'font-bold underline' : ''}`}
                          >
                            Wide (+3.5mm)
                          </button>
                        </div>

                        {spacingSummary.expandedCount > 0 && (
                          <div className="text-[10px] text-emerald-800 bg-white/80 p-2 rounded border border-emerald-200 leading-snug">
                            ✨ <b>{spacingSummary.expandedCount} Short rows expanded:</b>{' '}
                            {spacingSummary.expandedRows.map(r => `${r.nameSi} (${r.gapMm}mm)`).join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row Verification Tick Mark */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        <label className="text-xs font-bold text-slate-800">
                          Row Tick Mark <span className="text-slate-500 font-sinhala font-normal">(පේළි ටික් ලකුණ ✓)</span>
                        </label>
                      </div>

                      {/* On/Off Toggle Button */}
                      <button
                        type="button"
                        onClick={() => updateStyle('showRowTick', !showRowTick)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${showRowTick
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300'
                          }`}
                      >
                        <span>{showRowTick ? '✓ Shown' : 'Off'}</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Print official verification tick mark <span className="font-bold text-black font-sans">✓</span> on each row to certify confirmed results.
                    </p>

                    {showRowTick && (
                      <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-100">
                        {/* Tick Position Selector */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 font-medium">Tick Position (ස්ථානය)</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateStyle('rowTickPosition', 'right')}
                              className={`p-1.5 text-xs rounded-md border text-center transition cursor-pointer font-bold ${rowTickPosition === 'right'
                                  ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                                }`}
                            >
                              Right Edge (දකුණේ)
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStyle('rowTickPosition', 'after_numbers')}
                              className={`p-1.5 text-xs rounded-md border text-center transition cursor-pointer font-bold ${rowTickPosition === 'after_numbers'
                                  ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                                }`}
                            >
                              After Numbers (අසල)
                            </button>
                          </div>
                        </div>

                        {/* Tick Color Selector */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 font-medium">Tick Color (වර්ණය)</span>
                          <div className="flex items-center gap-1.5">
                            {[
                              { label: 'Black (කළු)', color: '#000000', bg: 'bg-black' },
                              { label: 'Green (කොළ)', color: '#15803d', bg: 'bg-emerald-600' },
                              { label: 'Blue (නිල්)', color: '#1e3a8a', bg: 'bg-blue-800' },
                            ].map((c) => {
                              const isSelected = (rowTickColor || '#000000') === c.color;
                              return (
                                <button
                                  key={c.color}
                                  type="button"
                                  onClick={() => updateStyle('rowTickColor', c.color)}
                                  className={`flex-1 py-1 px-1.5 text-[10px] rounded-md border flex items-center justify-center gap-1 transition cursor-pointer font-bold ${isSelected
                                      ? 'border-slate-800 bg-slate-50 text-slate-900 ring-1 ring-slate-800'
                                      : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                                    }`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${c.bg} shrink-0`} />
                                  <span>{c.label.split(' ')[0]}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vertical Fine Positioning Offsets */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Vertical Offsets (ඉහළ/පහළ ස්ථානගත කිරීම)</span>
                    </span>

                    {/* Announcement Offset */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>Announcement Y (දැන්වීම)</span>
                        <span className="font-mono text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                          {announcementOffsetYMm === 0 ? '0mm' : `${announcementOffsetYMm > 0 ? '+' : ''}${announcementOffsetYMm.toFixed(1)}mm`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                        <button
                          type="button"
                          onClick={() => updateStyle('announcementOffsetYMm', Math.max(-10, Number((announcementOffsetYMm - 1).toFixed(1))))}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-bold cursor-pointer"
                        >
                          ↑ Up (-1mm)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStyle('announcementOffsetYMm', 0)}
                          className="text-slate-400 hover:text-slate-600 underline cursor-pointer"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStyle('announcementOffsetYMm', Math.min(8, Number((announcementOffsetYMm + 1).toFixed(1))))}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-bold cursor-pointer"
                        >
                          ↓ Down (+1mm)
                        </button>
                      </div>
                    </div>

                    {/* Date Offset */}
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>Date Y Offset (දිනය)</span>
                        <span className="font-mono text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                          {dateOffsetYMm === 0 ? '0mm' : `${dateOffsetYMm > 0 ? '+' : ''}${dateOffsetYMm.toFixed(1)}mm`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                        <button
                          type="button"
                          onClick={() => updateStyle('dateOffsetYMm', Math.max(-6, Number((dateOffsetYMm - 0.5).toFixed(1))))}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-bold cursor-pointer"
                        >
                          ↑ Up (-0.5)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStyle('dateOffsetYMm', 0)}
                          className="text-slate-400 hover:text-slate-600 underline cursor-pointer"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStyle('dateOffsetYMm', Math.min(6, Number((dateOffsetYMm + 0.5).toFixed(1))))}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-bold cursor-pointer"
                        >
                          ↓ Down (+0.5)
                        </button>
                      </div>
                    </div>

                    {/* Dealer Offset */}
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>Dealer Y Offset (වෙළඳ නාමය)</span>
                        <span className="font-mono text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                          {dealerOffsetYMm === 0 ? '0mm' : `${dealerOffsetYMm > 0 ? '+' : ''}${dealerOffsetYMm.toFixed(1)}mm`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                        <button
                          type="button"
                          onClick={() => updateStyle('dealerOffsetYMm', Math.max(-6, Number((dealerOffsetYMm - 0.5).toFixed(1))))}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-bold cursor-pointer"
                        >
                          ↑ Up (-0.5)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStyle('dealerOffsetYMm', 0)}
                          className="text-slate-400 hover:text-slate-600 underline cursor-pointer"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStyle('dealerOffsetYMm', Math.min(6, Number((dealerOffsetYMm + 0.5).toFixed(1))))}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-bold cursor-pointer"
                        >
                          ↓ Down (+0.5)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Layout Style */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-xs text-slate-800">
                        Bottom Style <span className="text-slate-500 font-sinhala font-normal">(විලාසිතාව)</span>
                      </label>
                      <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {bottomLayoutStyle === 'boxed' ? 'Boxed' : 'Clean'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => updateStyle('bottomLayoutStyle', 'clean')}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${bottomLayoutStyle === 'clean'
                            ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-bold shadow-2xs ring-1 ring-blue-500'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                          }`}
                      >
                        <div className="text-xs font-bold">Clean Text</div>
                        <div className="text-[9px] text-slate-500 font-sinhala">සාමාන්‍ය පිරිසිදු පෙළ</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateStyle('bottomLayoutStyle', 'boxed')}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${bottomLayoutStyle === 'boxed'
                            ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-bold shadow-2xs ring-1 ring-indigo-500'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                          }`}
                      >
                        <div className="text-xs font-bold">Boxed Pill</div>
                        <div className="text-[9px] text-slate-500 font-sinhala">රාමු සහිත පෙට්ටි</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Sidebar Sticky Footer (Quick Actions) */}
            <div className="p-2.5 px-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveCustomDesignId(null);
                  resetStyles();
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-lg transition flex items-center gap-1 cursor-pointer"
                title="Reset all settings to default"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSaveModalOpen(true)}
                className="flex-1 px-3 py-1.5 text-xs font-extrabold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-[0.98]"
                title="Save current layout as a custom preset"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Save Design (සුරකින්න)</span>
              </button>
            </div>

          </aside>
        )}

        {/* Right Side: Live A4 Landscape Sheet Preview */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-200/90 flex flex-col items-center justify-start min-h-[550px] relative">

          {/* Exact A4 Landscape Page Container (297mm x 210mm) scaled properly */}
          <div
            style={{
              width: `${297 * scale}mm`,
              height: `${210 * scale}mm`,
              position: 'relative',
            }}
            className="shadow-2xl bg-white shrink-0 my-auto border border-slate-300 transition-all rounded-xs"
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

      </div>

      {/* Footer bar */}
      <div className="p-2 px-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <span>A4 Landscape • 2 Copies Side-by-Side</span>
          <span className="text-slate-300">•</span>
          <span className="font-mono text-slate-600">
            Top: {topMarginMm.toFixed(1)}mm | Row: {rowHeightMm.toFixed(1)}mm | Font: {resultFontSizePt.toFixed(1)}pt | Gap: {contentGapMm.toFixed(1)}mm{enableSpacingSafetyLimit ? ' | 🛡️ Guard Active' : ''}{expandShortRows ? ' | ✨ Short Expanded' : ''} | Announce Y: {announcementOffsetYMm > 0 ? `+${announcementOffsetYMm.toFixed(1)}` : announcementOffsetYMm.toFixed(1)}mm
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
