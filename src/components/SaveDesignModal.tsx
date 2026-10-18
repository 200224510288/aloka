'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, Sparkles, X, Check, Star, Sliders, Layers } from 'lucide-react';
import { PreviewStyleOptions, SavedCustomDesign } from '@/types/lottery';

interface SaveDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStyles: PreviewStyleOptions;
  onSave: (design: SavedCustomDesign) => void;
  existingDesigns: SavedCustomDesign[];
}

export default function SaveDesignModal({
  isOpen,
  onClose,
  currentStyles,
  onSave,
  existingDesigns
}: SaveDesignModalProps) {
  const [designName, setDesignName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDesignName(`My Custom Design ${existingDesigns.length + 1}`);
      setIsDefault(existingDesigns.length === 0);
      setError('');
    }
  }, [isOpen, existingDesigns.length]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = designName.trim();
    if (!trimmed) {
      setError('Please provide a name for this design');
      return;
    }

    const newDesign: SavedCustomDesign = {
      id: `custom_${Date.now()}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
      isDefault,
      options: { ...currentStyles },
    };

    onSave(newDesign);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <span>Save Custom Design</span>
                <span className="text-[11px] font-sinhala font-normal text-slate-400">(නිර්මාණය සුරකින්න)</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Save current layout & styling to reuse anytime in 1 click
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-700">
          
          {/* Design Name Input */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center justify-between">
              <span>Design Name (නිර්මාණයේ නම)</span>
              <span className="text-[10px] text-slate-400">Required</span>
            </label>
            <input
              type="text"
              value={designName}
              onChange={(e) => {
                setDesignName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. My Shop Standard / Front Board Large"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
              autoFocus
            />
            {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
          </div>

          {/* Current Settings Snapshot */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="font-bold text-slate-700 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>Snapshot of Settings to be Saved:</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600">
              <div>Top Free Space: <strong className="text-slate-900 font-mono">{currentStyles.topMarginMm ?? 6.0}mm</strong></div>
              <div>Row Height: <strong className="text-slate-900 font-mono">{currentStyles.rowHeightMm ?? 9.4}mm</strong></div>
              <div>Winning Digits: <strong className="text-slate-900 font-mono">{currentStyles.resultFontSizePt ?? 17.0}pt ({currentStyles.resultFontWeight ?? 700})</strong></div>
              <div>Lottery Name: <strong className="text-slate-900 font-mono">{currentStyles.lotteryNameFontSizePt ?? 10.5}pt ({currentStyles.lotteryNameFontWeight ?? 800})</strong></div>
              <div>Number Font: <strong className="text-slate-900">{currentStyles.resultFontFamily ?? 'Arial'}</strong></div>
              <div>Sinhala Font: <strong className="text-slate-900">{currentStyles.lotteryNameFontFamily ?? 'Noto Sans Sinhala'}</strong></div>
              <div>Bottom Style: <strong className="text-slate-900 capitalize">{currentStyles.bottomLayoutStyle ?? 'clean'}</strong></div>
              <div>Print Density: <strong className="text-slate-900 uppercase">{currentStyles.printDensity ?? 'eco'}</strong></div>
            </div>
          </div>

          {/* Set as Default Design Option */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
              <div>
                <div className="font-bold text-slate-800 text-xs">
                  Set as Default Design (පෙරනිමි නිර්මාණය)
                </div>
                <div className="text-[10px] text-slate-500 font-sinhala">
                  යෙදුම ආරම්භයේදීම මෙම සැකසුම ස්වයංක්‍රීයව පූරණය වේ (කාලය ඉතිරි වේ)
                </div>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save Design (සුරකින්න)</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
