'use client';

import React, { useState, useEffect } from 'react';
import { AgentRecord } from '@/types/agent';
import { X, Save, User, Globe } from 'lucide-react';
import { transliterateSinglish, hasEnglishLetters, smartTransliterateName } from '@/lib/singlish';

interface AgentModalProps {
  isOpen: boolean;
  agent: AgentRecord | null;
  onClose: () => void;
  onSave: (agent: Partial<AgentRecord>) => void;
}

export const AgentModal: React.FC<AgentModalProps> = ({
  isOpen,
  agent,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [town, setTown] = useState('');
  const [phone, setPhone] = useState('');
  // F5 typing mode: false = Sinhala transliteration mode, true = English (for initials like S. W. / K. G.)
  const [isEnglishMode, setIsEnglishMode] = useState(false);

  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const townInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (agent) {
      setName(agent.name || '');
      setTown(agent.town || '');
      setPhone(agent.phone || '');
    } else {
      setName('');
      setTown('');
      setPhone('');
    }
    setIsEnglishMode(false);
  }, [agent, isOpen]);

  // Handle F5 key globally when modal is open to toggle English / Sinhala mode without reloading page
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalF5 = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        setIsEnglishMode((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalF5);
    return () => window.removeEventListener('keydown', handleGlobalF5);
  }, [isOpen]);

  const handleFieldKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: 'name' | 'town'
  ) => {
    if (e.key === 'F5') {
      e.preventDefault();
      e.stopPropagation();
      setIsEnglishMode((prev) => !prev);
      return;
    }

    // In Sinhala mode, convert last Singlish word when user hits Space
    if (!isEnglishMode && e.key === ' ') {
      const inputEl = field === 'name' ? nameInputRef.current : townInputRef.current;
      if (!inputEl) return;
      const val = field === 'name' ? name : town;
      const cursorPos = inputEl.selectionStart ?? val.length;
      const textBefore = val.slice(0, cursorPos);
      const textAfter = val.slice(cursorPos);

      // Match English letters right before the cursor
      const match = textBefore.match(/([a-zA-Z]+)$/);
      if (match) {
        const engWord = match[1];
        // If it's a single uppercase letter (like 'S' or 'W') in name, treat as potential initial and don't mangle
        const isSingleUpperInitial = field === 'name' && /^[A-Z]$/.test(engWord);
        if (!isSingleUpperInitial) {
          e.preventDefault();
          const converted = transliterateSinglish(engWord);
          const newBefore = textBefore.slice(0, textBefore.length - engWord.length) + converted + ' ';
          const newFull = newBefore + textAfter;
          if (field === 'name') {
            setName(newFull);
          } else {
            setTown(newFull);
          }
          setTimeout(() => {
            if (inputEl) {
              const nextPos = newBefore.length;
              inputEl.setSelectionRange(nextPos, nextPos);
            }
          }, 0);
        }
      }
    }
  };

  const handleNameBlur = () => {
    if (!isEnglishMode && hasEnglishLetters(name)) {
      setName(smartTransliterateName(name));
    }
  };

  const handleTownBlur = () => {
    if (!isEnglishMode && hasEnglishLetters(town)) {
      setTown(transliterateSinglish(town));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // In English mode, keep name exactly as typed (e.g. English initials)
    // In Sinhala mode, smart-transliterate: preserve English initials (S. W.) and transliterate Sinhala part
    const finalName = isEnglishMode
      ? name.trim()
      : (hasEnglishLetters(name.trim()) ? smartTransliterateName(name.trim()) : name.trim());

    const finalTown = isEnglishMode
      ? town.trim()
      : (hasEnglishLetters(town.trim()) ? transliterateSinglish(town.trim()) : town.trim());

    onSave({
      name: finalName,
      town: finalTown,
      phone: phone.trim(),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header - Sinhala Only */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight font-sinhala">
                {agent ? 'අලෙවි නියෝජිත සංස්කරණය' : 'නව අලෙවි නියෝජිතයෙකු ඇතුළත් කිරීම'}
              </h3>
              <p className="text-xs text-slate-400 font-sinhala">
                {agent ? 'නියෝජිත තොරතුරු සංස්කරණය කරන්න' : 'පාර්සල් ලේබලය සඳහා තොරතුරු ඇතුළත් කරන්න'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Sinhala Only */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Agent Name with F5 Language Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-sinhala">
                අලෙවි නියෝජිත නම <span className="text-red-500">*</span>
              </label>

              {/* F5 Key Toggle Button */}
              <button
                type="button"
                onClick={() => setIsEnglishMode(!isEnglishMode)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer font-sinhala ${
                  isEnglishMode
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
                title="F5 යතුර ඔබන්න හෝ ක්ලික් කරන්න (Toggle English / Sinhala)"
              >
                <Globe className="w-3 h-3" />
                <span>{isEnglishMode ? 'English' : 'සිංහල'}</span>
                <kbd className="px-1 py-0.2 bg-white rounded border border-slate-300 text-[10px] font-mono shadow-2xs font-normal">
                  F5
                </kbd>
              </button>
            </div>

            <input
              ref={nameInputRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => handleFieldKeyDown(e, 'name')}
              onBlur={handleNameBlur}
              placeholder={isEnglishMode ? 'උදා: S. W. / K. G.' : 'උදා: S. W. දිනේෂ් මහතා'}
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border transition font-sinhala ${
                isEnglishMode
                  ? 'border-amber-400 bg-amber-50/20 focus:ring-2 focus:ring-amber-500 focus:outline-hidden'
                  : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden'
              }`}
              autoFocus
            />

            {/* F5 Helper Hint */}
            <p className="text-[11px] text-slate-500 font-sinhala mt-1 flex items-center flex-wrap gap-1">
              <span>ඉංග්‍රීසි මුලකුරු (උදා: S. W.) සඳහා</span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-300 font-mono text-[10px] shadow-2xs font-bold">
                F5
              </kbd>
              <span>ඔබන්න. සිංහල නම සඳහා නැවත</span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-300 font-mono text-[10px] shadow-2xs font-bold">
                F5
              </kbd>
              <span>ඔබන්න.</span>
            </p>

            {/* Live Preview Underneath Input Field */}
            {name.trim() && (
              <div
                className={`mt-1.5 px-3 py-1.5 rounded-lg border text-xs font-sinhala flex items-center justify-between transition ${
                  isEnglishMode
                    ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                    : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-medium shrink-0 opacity-80">
                    {isEnglishMode ? 'English මාදිලිය:' : 'සිංහල පෙරදසුන:'}
                  </span>
                  <span className="font-bold text-sm truncate font-sinhala">
                    {isEnglishMode ? name : smartTransliterateName(name)}
                  </span>
                </div>

                {!isEnglishMode && hasEnglishLetters(name) && (
                  <button
                    type="button"
                    onClick={() => setName(smartTransliterateName(name))}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-300 shadow-2xs hover:bg-emerald-100 transition shrink-0"
                    title="මෙම සිංහල නම යොදන්න"
                  >
                    යොදන්න ↵
                  </button>
                )}

                {isEnglishMode && (
                  <span className="text-[10px] text-amber-800 bg-white px-1.5 py-0.5 rounded border border-amber-200 shrink-0 font-mono">
                    F5 සිංහලට
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Town / Destination */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-sinhala">
              නගරය / ප්‍රදේශය <span className="text-red-500">*</span>
            </label>
            <input
              ref={townInputRef}
              type="text"
              required
              value={town}
              onChange={(e) => setTown(e.target.value)}
              onKeyDown={(e) => handleFieldKeyDown(e, 'town')}
              onBlur={handleTownBlur}
              placeholder="උදා: වත්තේගම"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sinhala"
            />
            {town.trim() && (
              <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-sinhala flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] text-emerald-700 font-medium shrink-0">සිංහල වචනය:</span>
                  <span className="font-bold text-sm text-emerald-950 font-sinhala truncate">
                    {hasEnglishLetters(town) ? transliterateSinglish(town) : town}
                  </span>
                </div>
                {hasEnglishLetters(town) && (
                  <button
                    type="button"
                    onClick={() => setTown(transliterateSinglish(town))}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-300 shadow-2xs hover:bg-emerald-100 transition shrink-0"
                    title="මෙම සිංහල වචනය යොදන්න"
                  >
                    යොදන්න ↵
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 font-sinhala">
              දුරකථන අංකය <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="උදා: 0773002230"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Buttons - Sinhala Only */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl text-slate-600 hover:bg-slate-100 transition font-sinhala"
            >
              අවලංගු කරන්න
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition flex items-center gap-2 font-sinhala"
            >
              <Save className="w-4 h-4" />
              <span>{agent ? 'යාවත්කාලීන කරන්න' : 'සුරකින්න'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
