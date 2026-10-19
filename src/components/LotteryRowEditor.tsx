'use client';

import React, { useState } from 'react';
import { AlertCircle, Ban, Undo, Sparkles, Landmark } from 'lucide-react';
import { LotteryDefinition, LotteryResultItem } from '@/types/lottery';
import { ZODIAC_SIGNS } from '@/lib/constants';
import { ZODIAC_PATH_MAP } from '@/lib/zodiac-icons';

interface LotteryRowEditorProps {
  definition: LotteryDefinition;
  item: LotteryResultItem;
  onChange: (updated: LotteryResultItem) => void;
  index: number;
}

export const LotteryRowEditor: React.FC<LotteryRowEditorProps> = ({
  definition,
  item,
  onChange,
  index,
}) => {
  const [showNoDrawModal, setShowNoDrawModal] = useState(false);
  const [noDrawReasonInput, setNoDrawReasonInput] = useState(item.noDrawReason || '');

  const updateField = (fieldUpdates: Partial<LotteryResultItem>) => {
    onChange({
      ...item,
      ...fieldUpdates,
    });
  };

  const handleSetNoDraw = (isNoDraw: boolean, reason = '') => {
    onChange({
      ...item,
      isNoDraw,
      noDrawReason: reason,
      isCheckedAgainstSource: true, // Marking no-draw counts as reviewed
      checkedAt: new Date().toISOString(),
    });
    setShowNoDrawModal(false);
  };

  const handleNumberChange = (numIndex: number, val: string) => {
    const current = [...(item.numbers || [])];
    if (definition.fieldType === 'letter_and_digits' && val.length > 1) {
      const cleanDigits = val.replace(/\D/g, '').split('');
      if (cleanDigits.length > 1) {
        for (let k = 0; k < definition.numberCount && (numIndex + k) < definition.numberCount; k++) {
          if (cleanDigits[k] !== undefined) {
            current[numIndex + k] = cleanDigits[k];
          }
        }
        updateField({ numbers: current });
        return;
      }
    }
    current[numIndex] = val;
    updateField({ numbers: current });
  };

  const handleBoxedToggle = (numIndex: number) => {
    const newBoxed = item.boxedIndex === numIndex ? undefined : numIndex;
    updateField({ boxedIndex: newBoxed });
  };

  const isNoDraw = item.isNoDraw;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        isNoDraw
          ? 'bg-slate-50 border-slate-200 opacity-75'
          : 'bg-white border-slate-200 shadow-2xs hover:border-blue-300'
      }`}
    >
      <div className="p-3 sm:p-3.5 flex flex-col gap-2.5">
        
        {/* Header Row: Index, Name, Board, Status & Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <span className="w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 bg-slate-100 text-slate-700">
              {index + 1}
            </span>

            <span className="font-extrabold text-slate-900 text-sm sm:text-base font-sinhala tracking-wide truncate">
              {definition.nameSi}
            </span>

            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
                definition.board === 'DLB'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {definition.board}
            </span>

            {item.aiVerified && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0" title="AI audited & verified against source document">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>AI Verified</span>
              </span>
            )}

            {item.officialVerified && (
              <span className="text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-300 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0" title="Matched official government live results (NLB / DLB)">
                <Landmark className="w-3 h-3 text-sky-600" />
                <span>Official Match</span>
              </span>
            )}

            {item.aiDiscrepancy && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0" title={item.aiDiscrepancy}>
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <span className="max-w-[140px] truncate">{item.aiDiscrepancy}</span>
              </span>
            )}

            {item.officialDiscrepancy && (
              <span className="text-[10px] font-bold text-orange-800 bg-orange-50 border border-orange-300 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0" title={item.officialDiscrepancy}>
                <AlertCircle className="w-3 h-3 text-orange-600" />
                <span className="max-w-[140px] truncate">Gov: {item.officialDiscrepancy}</span>
              </span>
            )}

            <span className="text-[11px] text-slate-400 hidden md:inline truncate">
              ({definition.nameEn})
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isNoDraw ? (
              <button
                type="button"
                onClick={() => setShowNoDrawModal(true)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Mark as No Draw / Excluded"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSetNoDraw(false)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center gap-1 text-xs font-semibold"
                title="Restore lottery draw"
              >
                <Undo className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Restore</span>
              </button>
            )}
          </div>
        </div>

        {/* Interactive Inputs */}
        {isNoDraw ? (
          <div className="flex items-center gap-2 text-xs text-slate-600 italic py-2 px-3 bg-slate-100/70 rounded-lg border border-slate-200">
            <Ban className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Marked as &ldquo;No Draw&rdquo;: <strong className="text-slate-800 font-semibold">{item.noDrawReason || 'No Draw Scheduled'}</strong></span>
          </div>
        ) : (
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-2.5 sm:p-3 flex flex-col gap-2.5">
            
            {/* Draw Number & Letter / Zodiac Row */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                
                {/* Draw Number Input */}
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Draw:
                  </label>
                  <input
                    type="text"
                    value={item.drawNo || ''}
                    onChange={(e) => updateField({ drawNo: e.target.value })}
                    placeholder="e.g. 0906"
                    className="w-24 h-9 px-2 text-sm font-mono font-black border-2 border-slate-300 rounded-lg bg-white focus:border-blue-600 outline-none text-center shadow-2xs transition"
                  />
                </div>

                {/* English Letter */}
                {(definition.requiresLetter || item.letter) && !definition.isTieredDigits && (
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      Letter:
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={item.letter || ''}
                      onChange={(e) => updateField({ letter: e.target.value.toUpperCase() })}
                      placeholder="A"
                      className="w-12 h-9 px-1 text-base font-black font-sans border-2 border-slate-300 rounded-lg bg-white focus:border-blue-600 outline-none text-center uppercase shadow-2xs transition"
                    />
                  </div>
                )}

                {/* Zodiac Selector */}
                {definition.requiresZodiac && (
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      Zodiac:
                    </label>
                    {item.zodiac && ZODIAC_PATH_MAP[item.zodiac] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ZODIAC_PATH_MAP[item.zodiac]}
                        alt={item.zodiac}
                        className="w-7 h-7 object-contain inline-block bg-white border border-slate-300 rounded-md p-0.5 shadow-2xs shrink-0"
                      />
                    ) : (
                      <span className="w-7 h-7 inline-flex items-center justify-center bg-amber-50 border border-amber-300 rounded-md text-amber-700 font-bold text-xs shrink-0" title="Zodiac not selected">
                        ?
                      </span>
                    )}
                    <select
                      value={item.zodiac || ''}
                      onChange={(e) => updateField({ zodiac: e.target.value || undefined })}
                      className={`h-9 px-2 text-xs font-bold font-sinhala border-2 rounded-lg bg-white focus:border-blue-600 outline-none shadow-2xs transition cursor-pointer ${!item.zodiac ? 'border-amber-400 bg-amber-50/50 text-amber-900' : 'border-slate-300'}`}
                    >
                      <option value="">-- තෝරන්න (Select) --</option>
                      {ZODIAC_SIGNS.map((z) => (
                        <option key={z.si} value={z.si}>
                          {z.si} ({z.en})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Source attribution pill */}
              {item.sourceFileName && (
                <span className="text-[10px] text-slate-600 font-medium bg-slate-200/60 px-2 py-0.5 rounded-md truncate max-w-[150px]" title={`Source: ${item.sourceFileName} p.${item.sourcePage || 1}`}>
                  📄 {item.sourceFileName}
                </span>
              )}
            </div>

            {/* Winning Numbers Area (Large, High Visibility) */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-200/70 flex-wrap">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider shrink-0">
                Winning Digits:
              </span>

              {definition.isTieredDigits ? (
                /* Tiered Digits: 2-digit / 3-digit / 4-digit / Letter */
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <input
                    type="text"
                    value={item.numbers?.[0] || ''}
                    onChange={(e) => handleNumberChange(0, e.target.value)}
                    placeholder="2-dig"
                    className="w-16 h-10 px-1 text-lg font-mono font-black border-2 border-slate-300 rounded-lg bg-white text-center focus:border-blue-600 outline-none shadow-2xs transition"
                  />
                  <span className="text-slate-400 font-black text-lg">/</span>
                  <input
                    type="text"
                    value={item.numbers?.[1] || ''}
                    onChange={(e) => handleNumberChange(1, e.target.value)}
                    placeholder="3-dig"
                    className="w-20 h-10 px-1 text-lg font-mono font-black border-2 border-slate-300 rounded-lg bg-white text-center focus:border-blue-600 outline-none shadow-2xs transition"
                  />
                  <span className="text-slate-400 font-black text-lg">/</span>
                  <input
                    type="text"
                    value={item.numbers?.[2] || ''}
                    onChange={(e) => handleNumberChange(2, e.target.value)}
                    placeholder="4-dig"
                    className="w-24 h-10 px-1 text-lg font-mono font-black border-2 border-slate-300 rounded-lg bg-white text-center focus:border-blue-600 outline-none shadow-2xs transition"
                  />
                  <span className="text-slate-400 font-black text-lg">/</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={item.letter || ''}
                    onChange={(e) => updateField({ letter: e.target.value.toUpperCase() })}
                    placeholder="Let"
                    className="w-14 h-10 px-1 text-lg font-black font-sans border-2 border-slate-300 rounded-lg bg-white text-center uppercase focus:border-blue-600 outline-none shadow-2xs transition"
                  />
                </div>
              ) : (
                /* Regular Numbers / Digits */
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {Array.from({ length: definition.numberCount }).map((_, idx) => {
                    const val = item.numbers?.[idx] || '';
                    const isBoxed = item.boxedIndex === idx;
                    const isSingleDigit = definition.fieldType === 'letter_and_digits';

                    return (
                      <div key={idx} className="relative inline-flex flex-col items-center gap-1">
                        <input
                          type="text"
                          maxLength={isSingleDigit ? 1 : 2}
                          value={val}
                          onChange={(e) => handleNumberChange(idx, e.target.value)}
                          placeholder={isSingleDigit ? '0' : '00'}
                          className={`h-10 px-1 text-lg font-mono font-black text-center rounded-lg border-2 transition shadow-2xs ${
                            isSingleDigit ? 'w-11' : (definition.numberCount > 4 ? 'w-12' : 'w-14')
                          } ${
                            isBoxed
                              ? 'border-slate-900 bg-amber-100 ring-2 ring-slate-900 font-black text-slate-950'
                              : 'border-slate-300 bg-white focus:border-blue-600 outline-none text-slate-900'
                          }`}
                        />
                        {definition.hasBoxedNumber && (
                          <button
                            type="button"
                            onClick={() => handleBoxedToggle(idx)}
                            title={isBoxed ? 'Unbox number' : 'Box number'}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wide transition ${
                              isBoxed ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            {isBoxed ? '[BOX]' : 'BOX'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bonus Number if applicable */}
              {definition.hasBonusNumber && (
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className="text-lg font-bold text-purple-600">(</span>
                  <input
                    type="text"
                    value={item.bonusNumber || ''}
                    onChange={(e) => updateField({ bonusNumber: e.target.value })}
                    placeholder="Bonus"
                    className="w-24 h-10 px-2 text-base font-mono font-black text-center border-2 border-purple-400 rounded-lg bg-purple-50 text-purple-950 focus:border-purple-600 outline-none shadow-2xs transition"
                  />
                  <span className="text-lg font-bold text-purple-600">)</span>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* No Draw Reason Modal */}
      {showNoDrawModal && (
        <div className="p-3 bg-red-50 border-t border-red-200 rounded-b-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1">
            <span className="font-bold text-red-900">Reason:</span>
            <input
              type="text"
              value={noDrawReasonInput}
              onChange={(e) => setNoDrawReasonInput(e.target.value)}
              placeholder="e.g. Public Holiday, Sunday, Cancelled"
              className="flex-1 px-2.5 py-1 border border-red-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleSetNoDraw(true, noDrawReasonInput || 'No draw scheduled')}
              className="px-3 py-1 bg-red-600 text-white font-bold rounded-lg text-xs hover:bg-red-700 transition"
            >
              Set No Draw
            </button>
            <button
              type="button"
              onClick={() => setShowNoDrawModal(false)}
              className="px-2.5 py-1 text-slate-600 hover:bg-red-100 rounded-lg text-xs transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
