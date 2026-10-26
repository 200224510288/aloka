'use client';

import React, { useState, useEffect } from 'react';
import { LabelFontSettings, DEFAULT_FONT_SETTINGS } from '@/types/agent';
import { X, Save, RotateCcw, Type, Minus, Plus } from 'lucide-react';

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

  useEffect(() => {
    setCurrent(settings);
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

  const applyPreset = (preset: {
    agentNameSize: number;
    agentDetailsSize: number;
    centerNoteSize: number;
    senderSize: number;
  }) => {
    setCurrent(preset);
    onPreviewChange?.(preset);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight font-sinhala">
                අකුරු ප්‍රමාණය සැකසීම (Font Size Settings)
              </h3>
              <p className="text-xs text-slate-400 font-sinhala">
                පාර්සල් ලේබලයේ එක් එක් කොටස් සඳහා අකුරු ප්‍රමාණය සකසා සුරකින්න
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 font-sinhala">
              පෙර සැකසුම් (Quick Presets)
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() =>
                  applyPreset({
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
                onClick={() => applyPreset(DEFAULT_FONT_SETTINGS)}
                className="px-2.5 py-1.5 rounded-lg border border-blue-500 bg-blue-50 text-xs font-bold text-blue-700 transition text-center font-sinhala cursor-pointer shadow-2xs"
              >
                සාමාන්‍ය (Normal)
              </button>
              <button
                type="button"
                onClick={() =>
                  applyPreset({
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
                  applyPreset({
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
            {/* Live sample snippet */}
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
            {/* Live sample snippet */}
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

          {/* Slider 3: Delivery Note (ලබා දෙන්න.) */}
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
            {/* Live sample snippet */}
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
            {/* Live sample snippet */}
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

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition flex items-center gap-1.5 font-sinhala cursor-pointer border border-slate-200"
              title="නැවත මූලික සැකසුම් වෙත (Reset to default font sizes)"
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
