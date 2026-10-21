'use client';

import React, { useState, useRef } from 'react';
import { 
  Award, 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  Sparkles, 
  Keyboard, 
  HelpCircle, 
  Wand2, 
  Check, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { DailySheet } from '@/types/lottery';
import { transliterateSinglish, hasEnglishLetters } from '@/lib/singlish';

interface FooterEditorProps {
  sheet: DailySheet;
  onChange: (updater: (prev: DailySheet) => DailySheet) => void;
}

const PRESET_FOOTER_SNIPPETS = [
  'ජයග්‍රාහී ලොතරැයි පත් අපෙන් ලබාගන්න',
  'ජය සම්පත රු. 50 000 ක් ඔස්මන් ද සිල්වා ගෙන්',
  'අද සම්පත රු. 50 000 ක් ඔස්මන් ද සිල්වා ගෙන්',
  'මහජන සම්පත/ කප්රුක රු. ලක්ෂ 01 02 ක් S.W.ඔස්මන් ද සිල්වා ගෙන්',
];

const SINGLISH_CHEAT_SHEET = [
  { eng: 'govi setha', sin: 'ගොවි සෙත', note: 'Lottery name' },
  { eng: 'ru. laksha 50', sin: 'රු. ලක්ෂ 50', note: 'Prize amount' },
  { eng: 'dekahamaarak', sin: 'දෙකහමාරක්', note: '2.5 lakhs' },
  { eng: 'osman de silva gen', sin: 'ඔස්මන් ද සිල්වා ගෙන්', note: 'Dealer winner source' },
  { eng: 'k (alone)', sin: 'ක්', note: 'Past tense particle (ක්)' },
  { eng: 'th / t', sin: 'ත / ට', note: 'Dental th (ත), Retroflex t (ට)' },
  { eng: 'd / D', sin: 'ද / ඩ', note: 'Dental d (ද), Retroflex D (ඩ)' },
  { eng: 'sh / Sh', sin: 'ශ / ෂ', note: 'Talavya sh (ශ), Murdhaja Sh (ෂ)' },
  { eng: 'n / N', sin: 'න / ණ', note: 'Danta n (න), Murdhaja N (ණ)' },
  { eng: 'l / L', sin: 'ල / ළ', note: 'Danta l (ල), Murdhaja L (ළ)' },
];

export const FooterEditor: React.FC<FooterEditorProps> = ({ sheet, onChange }) => {
  const currentText = sheet.footerAnnouncement || '';
  const charCount = currentText.length;
  const maxChars = 200;
  const isOverflow = charCount > maxChars;
  
  const [isSinglishEnabled, setIsSinglishEnabled] = useState<boolean>(true);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [justConverted, setJustConverted] = useState<boolean>(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const containsEnglish = hasEnglishLetters(currentText);

  const handleTextChange = (text: string) => {
    onChange((prev) => ({
      ...prev,
      footerAnnouncement: text,
      isFooterReviewed: false, // Editing resets reviewed confirmation!
    }));
  };

  // Convert on space, enter, or punctuation while typing in Singlish mode
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isSinglishEnabled) return;

    if (e.key === ' ' || e.key === 'Enter' || e.key === ',' || e.key === '.') {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = currentText.slice(0, cursorPos);
      const textAfterCursor = currentText.slice(cursorPos);

      // Match the English word token immediately before cursor
      const lastWordMatch = textBeforeCursor.match(/([a-zA-Z]+)$/);
      if (lastWordMatch) {
        e.preventDefault();
        const engWord = lastWordMatch[1];
        const sinhalaWord = transliterateSinglish(engWord);
        const delimiter = e.key === 'Enter' ? '\n' : e.key;
        
        const newBefore = textBeforeCursor.slice(0, textBeforeCursor.length - engWord.length) + sinhalaWord + delimiter;
        const newFullText = newBefore + textAfterCursor;

        handleTextChange(newFullText);

        // Maintain cursor position right after the delimiter
        setTimeout(() => {
          if (textareaRef.current) {
            const nextPos = newBefore.length;
            textareaRef.current.setSelectionRange(nextPos, nextPos);
          }
        }, 0);
      }
    }
  };

  // Auto-transliterate any remaining English on blur
  const handleBlur = () => {
    if (isSinglishEnabled && hasEnglishLetters(currentText)) {
      const converted = transliterateSinglish(currentText);
      if (converted !== currentText) {
        handleTextChange(converted);
        setJustConverted(true);
        setTimeout(() => setJustConverted(false), 2000);
      }
    }
  };

  // Manual 1-click convert
  const handleConvertAll = () => {
    const converted = transliterateSinglish(currentText);
    handleTextChange(converted);
    setJustConverted(true);
    setTimeout(() => setJustConverted(false), 2500);
  };

  const handleToggleReviewed = () => {
    // If there is unconverted English text, convert it first
    let finalAnnouncement = currentText;
    if (isSinglishEnabled && hasEnglishLetters(currentText)) {
      finalAnnouncement = transliterateSinglish(currentText);
    }

    onChange((prev) => ({
      ...prev,
      footerAnnouncement: finalAnnouncement,
      isFooterReviewed: !prev.isFooterReviewed,
    }));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-600 shrink-0" />
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
            Footer Prize Announcement (විකුණුම් ස්ථාන දිනුම් නිවේදන)
          </h3>
        </div>

        {/* Mode Toggles & Counter */}
        <div className="flex items-center gap-2">
          
          {/* Singlish Capability Toggle Switch */}
          <button
            type="button"
            onClick={() => setIsSinglishEnabled(!isSinglishEnabled)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
              isSinglishEnabled
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
            title="Toggle phonetic typing (Type English pronunciation to generate Sinhala letters)"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Singlish (Sinenglish): {isSinglishEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Guide toggle button */}
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="text-slate-500 hover:text-blue-600 p-1 rounded hover:bg-slate-100 transition"
            title="View Singlish phonetic typing guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Character count & overflow meter */}
          <span
            className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
              isOverflow ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
            }`}
          >
            {charCount}/{maxChars}
          </span>
        </div>
      </div>

      {/* Subtitle helper */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <p>
          Type phonetically in English (e.g. <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">govi setha ru. laksha 50 k osman de silva gen</span>) to auto-convert to Sinhala on Space.
        </p>

        {isOverflow && (
          <span className="text-[11px] text-red-600 font-bold flex items-center gap-1 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" /> Exceeds print boundary!
          </span>
        )}
      </div>

      {/* Collapsible Singlish Cheat Sheet */}
      {showGuide && (
        <div className="mb-3 p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
            <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-slate-700" />
              Singlish (Sinhala Phonetic) Typing Cheat Sheet:
            </span>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="text-slate-600 hover:text-slate-900 text-[11px] font-bold"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-[11px]">
            {SINGLISH_CHEAT_SHEET.map((item, idx) => (
              <div key={idx} className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="font-mono font-bold text-slate-800">{item.eng}</div>
                <div className="font-sinhala font-extrabold text-slate-900 text-sm">{item.sin}</div>
                <div className="text-[10px] text-slate-500">{item.note}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10.5px] text-slate-600 italic">
            Tip: Press Space, Enter, or comma to immediately convert typed words. Unfinished words auto-convert on blur.
          </p>
        </div>
      )}

      {/* Textarea Input Container */}
      <div className="relative mb-2.5">
        <textarea
          ref={textareaRef}
          rows={2}
          value={currentText}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="විශේෂ නිවේදනයක් ඇත්නම් මෙහි සටහන් කරන්න..."
          className={`w-full px-3.5 py-2.5 text-sm font-bold font-sinhala border rounded-xl outline-none transition-all shadow-inner ${
            isOverflow
              ? 'border-red-400 bg-red-50 focus:border-red-500'
              : 'border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
          }`}
        />

        {/* Floating Quick Convert Button if English letters detected */}
        {containsEnglish && (
          <div className="absolute right-2.5 bottom-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg border border-blue-200 shadow-sm animate-in fade-in-50">
            <span className="text-[11px] font-bold text-blue-800">English detected</span>
            <button
              type="button"
              onClick={handleConvertAll}
              className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Wand2 className="w-3 h-3" />
              <span>Convert to සිංහල</span>
            </button>
          </div>
        )}

        {justConverted && (
          <div className="absolute right-2.5 bottom-3 bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm animate-in fade-in-50">
            <Check className="w-3.5 h-3.5" />
            <span>Converted to සිංහල!</span>
          </div>
        )}
      </div>

      {/* Live Transliteration Preview when user is typing English */}
      {containsEnglish && isSinglishEnabled && (
        <div className="mb-2.5 px-3 py-1.5 bg-slate-100/90 rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Live Preview:</span>
            <span className="font-sinhala font-extrabold text-blue-900 truncate">
              {transliterateSinglish(currentText)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleConvertAll}
            className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline shrink-0 cursor-pointer"
          >
            Apply Converted
          </button>
        </div>
      )}

      {/* Preset snippets & review confirmation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
        
        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Reference Presets:
          </span>
          {PRESET_FOOTER_SNIPPETS.map((snippet, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleTextChange(snippet)}
              className="text-[11px] font-sinhala px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded border border-slate-200 transition truncate max-w-[200px]"
              title={snippet}
            >
              {snippet}
            </button>
          ))}
        </div>

        {/* Separate Reviewed Checkbox (Mandatory Requirement) */}
        <button
          type="button"
          onClick={handleToggleReviewed}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
            sheet.isFooterReviewed
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100/80'
              : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100/80'
          }`}
        >
          {sheet.isFooterReviewed ? (
            <CheckSquare className="w-4 h-4 text-emerald-600" />
          ) : (
            <Square className="w-4 h-4 text-amber-600" />
          )}
          <span>Reviewed & Confirmed Announcement</span>
        </button>

      </div>
    </div>
  );
};
