'use client';

import React, { useState, useEffect } from 'react';
import { LabelFontSettings, DEFAULT_FONT_SETTINGS } from '@/types/agent';
import { X, Save, RotateCcw, Type, Minus, Plus, Square, ShieldCheck, Sliders } from 'lucide-react';

interface FontSettingsModalProps {
  isOpen: boolean;
  settings: LabelFontSettings;
  onClose: () => void;
  onSave: (newSettings: LabelFontSettings) => void;
  onPreviewChange?: (tempSettings: LabelFontSettings) => void;
}

export const FontSettingsModal: React.FC<FontSettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
  onPreviewChange,
}) => {
  const [current, setCurrent] = useState<LabelFontSettings>(settings);
  const [activeTab, setActiveTab] = useState<'margins' | 'fonts'>('margins');

  useEffect(() => {
    setCurrent({
      ...DEFAULT_FONT_SETTINGS,
      ...settings,
    });
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof LabelFontSettings>(
    key: K,
    val: number
  ) => {
    const updated = { ...current, [key]: val };
    setCurrent(updated);
    onPreviewChange?.(updated);
  };

  const applyFontPreset = (preset: {
    agentNameSize: number;
    agentDetailsSize: number;
    centerNoteSize: number;
    senderSize: number;
  }) => {
    const updated = {
      ...current,
      ...preset,
    };
    setCurrent(updated);
    onPreviewChange?.(updated);
  };

  const applyMarginPreset = (outerMarginMm: number, innerPaddingPx: number) => {
    const updated = {
      ...current,
      outerMarginMm,
      innerPaddingPx,
    };
    setCurrent(updated);
    onPreviewChange?.(updated);
  };

  const handleReset = () => {
    setCurrent(DEFAULT_FONT_SETTINGS);
    onPreviewChange?.(DEFAULT_FONT_SETTINGS);
  };

  const handleCancel = () => {
    // Revert live preview back to original saved settings
    onPreviewChange?.(settings);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(current);
    onClose();
  };

  const outerMargin = current.outerMarginMm !== undefined ? current.outerMarginMm : 4;
  const innerPadding = current.innerPaddingPx !== undefined ? current.innerPaddingPx : 16;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight font-sinhala">
                ලේබල් පෙනුම සහ මායිම් සැකසීම (Label Settings)
              </h3>
              <p className="text-xs text-slate-400 font-sinhala">
                අකුරු ප්‍රමාණයන් සහ මුද්‍රණයේදී මායිම් කැපීම වැළැක්වීමේ පරතරය
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('margins')}
            className={`pb-2.5 px-4 text-xs font-bold transition flex items-center gap-1.5 border-b-2 font-sinhala cursor-pointer ${
              activeTab === 'margins'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Square className="w-3.5 h-3.5 text-emerald-600" />
            <span>මායිම් සහ පරතරය (Margins & Padding)</span>
            {outerMargin > 2 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fonts')}
            className={`pb-2.5 px-4 text-xs font-bold transition flex items-center gap-1.5 border-b-2 font-sinhala cursor-pointer ${
              activeTab === 'fonts'
                ? 'border-blue-600 text-blue-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Type className="w-3.5 h-3.5 text-blue-600" />
            <span>අකුරු ප්‍රමාණය (Font Sizes)</span>
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">

          {/* TAB 1: MARGINS & PADDING (CROP PROTECTION) */}
          {activeTab === 'margins' && (
            <div className="space-y-5">
              
              {/* Helpful Crop Protection Explainer Alert */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-900 font-sinhala">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950">
                    මුද්‍රණයේදී මායිම් කැපී යාම (Cropping) වැළැක්වීම:
                  </p>
                  <p className="text-[11px] leading-relaxed text-emerald-800">
                    සාමාන්‍ය මුද්‍රණ යන්ත්‍රවල (Printers) කඩදාසියේ දාරයේ අවම වශයෙන් 3mm - 5mm පමණ මුද්‍රණය නොවන ප්‍රදේශයක් පවතී. කඩදාසි දාරයේ සිට පරතරය (Outer Margin) වැඩි කිරීමෙන් ලේබලයේ කළු මායිම කැපී යාම සම්පූර්ණයෙන්ම වළක්වා ගත හැක.
                  </p>
                </div>
              </div>

              {/* Quick Margin Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 font-sinhala">
                  මායිම් පෙර සැකසුම් (Margin Presets)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyMarginPreset(2, 14)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition text-center font-sinhala cursor-pointer ${
                      outerMargin === 2
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    තද (2mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarginPreset(4, 16)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition text-center font-sinhala cursor-pointer shadow-2xs ${
                      outerMargin === 4
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    සාමාන්‍ය (4mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarginPreset(6, 16)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition text-center font-sinhala cursor-pointer ${
                      outerMargin === 6
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    ආරක්ෂිත (6mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarginPreset(8, 16)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition text-center font-sinhala cursor-pointer ${
                      outerMargin === 8
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    විශාල (8mm)
                  </button>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Slider 1: Outer Border Margin from Cut Edge */}
              <div className="space-y-1.5 bg-slate-50/60 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 font-sinhala block">
                      1. කඩදාසි දාරයේ සිට කළු මායිමට පරතරය (Outer Margin)
                    </span>
                    <span className="text-[11px] text-slate-500 font-sinhala">
                      කඩදාසි කොන සහ කතුරෙන් කපන ඉරේ සිට කළු මායිමට ඇති දුර
                    </span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-700 font-mono bg-emerald-100/70 px-2.5 py-0.5 rounded border border-emerald-300">
                    {outerMargin}mm
                  </span>
                </div>
                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => updateSetting('outerMarginMm', Math.max(0, outerMargin - 0.5))}
                    className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center transition border border-slate-300 cursor-pointer shadow-2xs"
                    title="පරතරය 0.5mm කින් අඩු කරන්න"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={0.5}
                    value={outerMargin}
                    onChange={(e) => updateSetting('outerMarginMm', parseFloat(e.target.value))}
                    className="flex-1 accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => updateSetting('outerMarginMm', Math.min(12, outerMargin + 0.5))}
                    className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center transition border border-slate-300 cursor-pointer shadow-2xs"
                    title="පරතරය 0.5mm කින් වැඩි කරන්න"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {/* Visual Margin Representation */}
                <div className="mt-2 text-center py-2 px-3 bg-white rounded-lg border border-dashed border-slate-300">
                  <div 
                    className="mx-auto border border-black transition-all duration-150 flex items-center justify-center text-[10px] text-slate-600 font-sinhala bg-slate-50"
                    style={{
                      padding: `${Math.max(4, outerMargin * 2)}px 8px`,
                      margin: `${Math.max(2, outerMargin * 1.5)}px auto`,
                      maxWidth: '85%'
                    }}
                  >
                    <span>කළු මායිම (Paper Inset: {outerMargin}mm)</span>
                  </div>
                </div>
              </div>

              {/* Slider 2: Inner Border Padding */}
              <div className="space-y-1.5 bg-slate-50/60 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 font-sinhala block">
                      2. මායිම ඇතුළත පරතරය (Inner Content Padding)
                    </span>
                    <span className="text-[11px] text-slate-500 font-sinhala">
                      කළු මායිම් රේඛාවේ සිට ඇතුළත ඇති අකුරු වලට ඇති ඉඩ
                    </span>
                  </div>
                  <span className="text-sm font-extrabold text-blue-700 font-mono bg-blue-100/70 px-2.5 py-0.5 rounded border border-blue-300">
                    {innerPadding}px
                  </span>
                </div>
                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => updateSetting('innerPaddingPx', Math.max(8, innerPadding - 1))}
                    className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center transition border border-slate-300 cursor-pointer shadow-2xs"
                    title="1px කින් අඩු කරන්න"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min={8}
                    max={28}
                    step={1}
                    value={innerPadding}
                    onChange={(e) => updateSetting('innerPaddingPx', parseInt(e.target.value, 10))}
                    className="flex-1 accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => updateSetting('innerPaddingPx', Math.min(28, innerPadding + 1))}
                    className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center transition border border-slate-300 cursor-pointer shadow-2xs"
                    title="1px කින් වැඩි කරන්න"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: FONT SIZES */}
          {activeTab === 'fonts' && (
            <div className="space-y-5">
              
              {/* Quick Font Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 font-sinhala">
                  අකුරු පෙර සැකසුම් (Quick Font Presets)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      applyFontPreset({
                        agentNameSize: 22,
                        agentDetailsSize: 17,
                        centerNoteSize: 28,
                        senderSize: 11.5,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-xs font-medium text-slate-700 transition text-center font-sinhala cursor-pointer"
                  >
                    කුඩා (Small)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyFontPreset({
                        agentNameSize: 26,
                        agentDetailsSize: 20,
                        centerNoteSize: 34,
                        senderSize: 13,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-blue-500 bg-blue-50 text-xs font-bold text-blue-700 transition text-center font-sinhala cursor-pointer shadow-2xs"
                  >
                    සාමාන්‍ය (Normal)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyFontPreset({
                        agentNameSize: 29,
                        agentDetailsSize: 22,
                        centerNoteSize: 38,
                        senderSize: 14.5,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-xs font-medium text-slate-700 transition text-center font-sinhala cursor-pointer"
                  >
                    විශාල (Large)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyFontPreset({
                        agentNameSize: 33,
                        agentDetailsSize: 25,
                        centerNoteSize: 42,
                        senderSize: 16,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-xs font-medium text-slate-700 transition text-center font-sinhala cursor-pointer"
                  >
                    ඉතා විශාල
                  </button>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Slider 1: Agent Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 font-sinhala">
                    1. අලෙවි නියෝජිත නම (Agent Name)
                  </span>
                  <span className="text-xs font-bold text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {current.agentNameSize}px
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => updateSetting('agentNameSize', Math.max(18, current.agentNameSize - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition border border-slate-300 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min={18}
                    max={38}
                    step={1}
                    value={current.agentNameSize}
                    onChange={(e) => updateSetting('agentNameSize', parseInt(e.target.value, 10))}
                    className="flex-1 accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => updateSetting('agentNameSize', Math.min(38, current.agentNameSize + 1))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition border border-slate-300 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 flex items-baseline gap-2 overflow-hidden">
                  <span className="text-xs text-slate-400 font-sinhala shrink-0">පෙරදසුන:</span>
                  <span
                    className="text-black font-sinhala font-medium truncate"
                    style={{ fontSize: `${current.agentNameSize}px`, lineHeight: 1.2 }}
                  >
                    S. W. දිනේෂ් මහතා
                  </span>
                </div>
              </div>

              {/* Slider 2: Town & Phone */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 font-sinhala">
                    2. නගරය සහ දුරකථන අංකය (Town & Phone)
                  </span>
                  <span className="text-xs font-bold text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {current.agentDetailsSize}px
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => updateSetting('agentDetailsSize', Math.max(14, current.agentDetailsSize - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition border border-slate-300 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min={14}
                    max={28}
                    step={1}
                    value={current.agentDetailsSize}
                    onChange={(e) => updateSetting('agentDetailsSize', parseInt(e.target.value, 10))}
                    className="flex-1 accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => updateSetting('agentDetailsSize', Math.min(28, current.agentDetailsSize + 1))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition border border-slate-300 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 flex items-baseline gap-2 overflow-hidden">
                  <span className="text-xs text-slate-400 font-sinhala shrink-0">පෙරදසුන:</span>
                  <span
                    className="text-black font-sinhala font-normal truncate"
                    style={{ fontSize: `${current.agentDetailsSize}px`, lineHeight: 1.2 }}
                  >
                    නගරය: වත්තේගම | 0773002230
                  </span>
                </div>
              </div>

              {/* Slider 3: Delivery Note */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 font-sinhala">
                    3. මැද පාඨය (Delivery Note - &quot;ලබා දෙන්න.&quot;)
                  </span>
                  <span className="text-xs font-bold text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {current.centerNoteSize}px
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => updateSetting('centerNoteSize', Math.max(22, current.centerNoteSize - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition border border-slate-300 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min={22}
                    max={46}
                    step={1}
                    value={current.centerNoteSize}
                    onChange={(e) => updateSetting('centerNoteSize', parseInt(e.target.value, 10))}
                    className="flex-1 accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => updateSetting('centerNoteSize', Math.min(46, current.centerNoteSize + 1))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition border border-slate-300 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                  <span
                    className="text-black font-sinhala font-normal tracking-wide text-center"
                    style={{ fontSize: `${current.centerNoteSize}px`, lineHeight: 1.2 }}
                  >
                    ලබා දෙන්න.
                  </span>
                </div>
              </div>

              {/* Slider 4: Sender Details */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 font-sinhala">
                    4. යවන්නාගේ විස්තර (Sender Details)
                  </span>
                  <span className="text-xs font-bold text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {current.senderSize}px
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => updateSetting('senderSize', Math.max(10, current.senderSize - 0.5))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition border border-slate-300 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min={10}
                    max={18}
                    step={0.5}
                    value={current.senderSize}
                    onChange={(e) => updateSetting('senderSize', parseFloat(e.target.value))}
                    className="flex-1 accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => updateSetting('senderSize', Math.min(18, current.senderSize + 0.5))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition border border-slate-300 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 flex items-baseline gap-2 overflow-hidden">
                  <span className="text-xs text-slate-400 font-sinhala shrink-0">පෙරදසුන:</span>
                  <span
                    className="text-black font-sinhala truncate"
                    style={{ fontSize: `${current.senderSize}px`, lineHeight: 1.2 }}
                  >
                    S . W ඔස්මන් ද සිල්වා (081-2223306)
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition flex items-center gap-1.5 font-sinhala cursor-pointer border border-slate-200"
              title="නැවත මූලික සැකසුම් වෙත (Reset to default sizes and margins)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>යථා තත්වයට</span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-medium rounded-xl text-slate-600 hover:bg-slate-100 transition font-sinhala cursor-pointer"
              >
                අවලංගු කරන්න
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition flex items-center gap-2 font-sinhala cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>සුරකින්න (Save)</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
