'use client';

import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Copy, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Leaf, 
  FileDown, 
  Sparkles, 
  Clock,
  ShieldCheck,
  Zap,
  AlertCircle
} from 'lucide-react';
import { DailySheet, PreviewStyleOptions, PrintSettings } from '@/types/lottery';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: DailySheet;
  styleOptions: PreviewStyleOptions;
  isReadyToExport: boolean;
  pendingCount: number;
  exportBlockedErrors: string[];
  onVerifyAll?: () => void;
  onExportPdf?: (styles?: PreviewStyleOptions) => Promise<void>;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const LOCAL_STORAGE_PRINT_SETTINGS = 'sinhala_lottery_print_settings';

export default function PrintModal({
  isOpen,
  onClose,
  sheet,
  styleOptions,
  isReadyToExport,
  pendingCount,
  exportBlockedErrors,
  onVerifyAll,
  onExportPdf,
  showToast,
}: PrintModalProps) {
  const [copies, setCopies] = useState<number>(1);
  const [printerNote, setPrinterNote] = useState<string>('');
  const [printDensity, setPrintDensity] = useState<'eco' | 'high'>('eco');
  const [isDefaultSavingMode, setIsDefaultSavingMode] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Load saved default print settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PRINT_SETTINGS);
      if (saved) {
        const parsed: PrintSettings = JSON.parse(saved);
        if (parsed.copies) setCopies(Math.max(1, Math.min(50, parsed.copies)));
        if (parsed.preferredPrinter) setPrinterNote(parsed.preferredPrinter);
        if (parsed.printDensity) setPrintDensity(parsed.printDensity);
        if (parsed.isDefaultSavingMode !== undefined) setIsDefaultSavingMode(parsed.isDefaultSavingMode);
      } else {
        setPrintDensity(styleOptions.printDensity || 'eco');
      }
    } catch {}
  }, [isOpen, styleOptions.printDensity]);

  if (!isOpen) return null;

  // Handle direct in-browser printing
  const handlePrint = async () => {
    if (!isReadyToExport) {
      showToast?.('Please resolve all pending verifications before printing.', 'error');
      return;
    }

    setIsPrinting(true);

    try {
      // 1. Save default print settings if enabled
      if (isDefaultSavingMode) {
        const settingsToSave: PrintSettings = {
          copies,
          preferredPrinter: printerNote.trim(),
          printDensity,
          isDefaultSavingMode: true,
        };
        localStorage.setItem(LOCAL_STORAGE_PRINT_SETTINGS, JSON.stringify(settingsToSave));
      }

      // 2. Request print HTML from backend
      const res = await fetch('/api/print-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet,
          copies,
          printDensity,
          styleOptions: {
            ...styleOptions,
            printDensity,
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        showToast?.(errorData.error || 'Failed to prepare print document', 'error');
        setIsPrinting(false);
        return;
      }

      const { html } = await res.json();

      // 3. Inject into hidden iframe and trigger native print dialog
      let printFrame = document.getElementById('lottery-direct-print-frame') as HTMLIFrameElement;
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'lottery-direct-print-frame';
        printFrame.style.position = 'fixed';
        printFrame.style.left = '-9999px';
        printFrame.style.top = '-9999px';
        printFrame.style.width = '297mm';
        printFrame.style.height = '210mm';
        printFrame.style.border = '0';
        printFrame.style.visibility = 'hidden';
        printFrame.style.zIndex = '-9999';
        document.body.appendChild(printFrame);
      }

      const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (!frameDoc) {
        throw new Error('Unable to access print frame document');
      }

      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();

      // Wait briefly for CSS and webfonts to settle before calling print
      setTimeout(() => {
        setIsPrinting(false);
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          showToast?.(`Print dialog launched for ${copies} sheet(s) (${copies * 2} slips)!`, 'success');
          onClose();
        } catch (e) {
          console.error('Print trigger error:', e);
          showToast?.('Print dialog could not open automatically. You can download PDF instead.', 'error');
        }
      }, 450);

    } catch (err: any) {
      console.error('Print error:', err);
      showToast?.(`Print error: ${err.message || err}`, 'error');
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-200">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Print Lottery Result Sheets</span>
                <span className="text-[11px] font-sinhala font-normal text-blue-200">(ප්‍රතිඵල මුද්‍රණය)</span>
              </h2>
              <p className="text-xs text-blue-200/80">
                A4 Landscape • 2 Slips per Sheet • High-Speed Direct Printing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-700">

          {/* Validation Banner if blocked */}
          {!isReadyToExport && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-start gap-2 text-amber-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div>Verification required before printing:</div>
                  <div className="font-normal text-[11px] text-amber-700 mt-0.5">
                    {pendingCount > 0 && `${pendingCount} lottery row(s) pending verification. `}
                    {!sheet.isFooterReviewed && 'Footer prize announcement must be confirmed.'}
                  </div>
                </div>
              </div>
              {onVerifyAll && (
                <button
                  type="button"
                  onClick={onVerifyAll}
                  className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>1-Click Confirm All & Enable Printing (සියල්ල තහවුරු කරන්න)</span>
                </button>
              )}
            </div>
          )}

          {/* 1. Number of Copies */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex justify-between items-center">
              <div>
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Copy className="w-4 h-4 text-blue-600" />
                  <span>Number of Copies</span>
                  <span className="text-slate-500 font-sinhala font-normal text-xs">(පිටපත් ගණන)</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  How many A4 sheets to print for daily distribution.
                </p>
              </div>

              {/* Stepper control */}
              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCopies(c => Math.max(1, c - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-base cursor-pointer transition active:scale-95"
                >
                  -
                </button>
                <span className="font-mono font-bold text-slate-900 text-base min-w-[36px] text-center">
                  {copies}
                </span>
                <button
                  type="button"
                  onClick={() => setCopies(c => Math.min(50, c + 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-base cursor-pointer transition active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[1, 2, 3, 5, 10].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCopies(val)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    copies === val
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {val} {val === 1 ? 'Sheet' : 'Sheets'} ({val * 2} Slips)
                </button>
              ))}
            </div>

            {/* Total slips calculated badge */}
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900 font-semibold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Yield calculation:</span>
              </span>
              <span className="font-bold font-sinhala">
                {copies} A4 පිටුවක් = පාරිභෝගික පත්‍රිකා <span className="underline decoration-blue-500 font-extrabold text-blue-700 font-mono text-sm">{copies * 2}</span> ක් (Slip Cuts)
              </span>
            </div>
          </div>

          {/* 2. Select Printer Profile / Note */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Select Destination Printer</span>
              <span className="text-slate-500 font-sinhala font-normal text-xs">(මුද්‍රණ යන්ත්‍රය)</span>
            </label>
            <p className="text-[11px] text-slate-500">
              When you click <strong>Print Now</strong>, your system print dialog will display all connected printers (e.g. Epson, Canon, HP).
            </p>
            <input
              type="text"
              value={printerNote}
              onChange={(e) => setPrinterNote(e.target.value)}
              placeholder="e.g. Epson EcoTank L3110 / HP LaserJet Pro (Optional label note)"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* 3. Print Density & Toner Saver */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Leaf className="w-4 h-4 text-emerald-600" />
                <span>Print Density & Ink Saver</span>
                <span className="text-slate-500 font-sinhala font-normal text-xs">(තීන්ත ඉතිරි කිරීම)</span>
              </label>
              <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                {printDensity === 'eco' ? 'Eco 600' : 'Bold 800'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPrintDensity('eco')}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                  printDensity === 'eco'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1">
                  <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Eco Ink-Saver (600)</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-sinhala">
                  තීන්ත ~30%ක් ඉතිරි වේ, වේගවත් වියලීම
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrintDensity('high')}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                  printDensity === 'high'
                    ? 'border-slate-800 bg-slate-900 text-white font-bold shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold">
                  Bold Contrast (800)
                </div>
                <div className={`text-[10px] mt-0.5 font-sinhala ${printDensity === 'high' ? 'text-slate-300' : 'text-slate-500'}`}>
                  පැහැදිලි තද අකුරු (දුර තබා බැලීමට)
                </div>
              </button>
            </div>
          </div>

          {/* 4. Default Saving Mode to Save Time */}
          <div className="p-3 bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-200/80 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <div className="font-bold text-slate-800 text-xs">
                  Default Saving Mode (කාලය ඉතිරි කර ගැනීමේ සැකසුම)
                </div>
                <div className="text-[11px] text-slate-500">
                  Save {copies} copy/copies & {printDensity} mode as default for next time.
                </div>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isDefaultSavingMode}
                onChange={(e) => setIsDefaultSavingMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* 5. Essential Printer Settings Guidance */}
          <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl space-y-1.5 text-xs text-amber-950">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Printer Settings (කොළය කැපීම වැළැක්වීමට මුද්‍රණ සැකසුම්):</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-tight">
              In your system/browser print window (Print dialog), please ensure:
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                <span className="font-bold text-slate-900 block">1. Paper Size:</span>
                <span className="text-emerald-700 font-extrabold font-mono">A4</span> (not Letter)
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                <span className="font-bold text-slate-900 block">2. Margins:</span>
                <span className="text-emerald-700 font-extrabold">None / 0</span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                <span className="font-bold text-slate-900 block">3. Scale:</span>
                <span className="text-emerald-700 font-extrabold">100%</span> (Actual size)
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {/* Secondary PDF export fallback */}
          {onExportPdf && (
            <button
              type="button"
              onClick={() => onExportPdf({ ...styleOptions, printDensity })}
              disabled={!isReadyToExport || isPrinting}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 transition cursor-pointer"
              title="Download offline PDF file instead of direct printing"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Download PDF Instead</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isPrinting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel (අවලංගු කරන්න)
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!isReadyToExport || isPrinting}
              className={`px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer ${
                isReadyToExport && !isPrinting
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Preparing Print...' : `Print Now (${copies} ${copies === 1 ? 'Sheet' : 'Sheets'})`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
