'use client';

import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Copy, 
  AlertTriangle, 
  X, 
  FileDown, 
  AlertCircle
} from 'lucide-react';
import { DailySheet, PreviewStyleOptions, PrintSettings } from '@/types/lottery';
import { generatePrintHtml, validateSheetForPrint } from '@/lib/html-generator';

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
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Load saved default print settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PRINT_SETTINGS);
      if (saved) {
        const parsed: Partial<PrintSettings> = JSON.parse(saved);
        if (parsed.copies) setCopies(Math.max(1, Math.min(50, parsed.copies)));
      }
    } catch {}
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle direct in-browser printing (Instant, client-rendered with zero network latency)
  const handlePrint = async () => {
    if (!isReadyToExport) {
      showToast?.('Please resolve all pending verifications before printing.', 'error');
      return;
    }

    setIsPrinting(true);

    try {
      // 1. Auto-save copies preference for next time
      try {
        localStorage.setItem(LOCAL_STORAGE_PRINT_SETTINGS, JSON.stringify({ copies }));
      } catch {}

      // 2. Validate sheet rules
      const validation = validateSheetForPrint(sheet);
      if (!validation.isValid) {
        showToast?.(validation.errors[0] || 'Please complete all validations before printing.', 'error');
        setIsPrinting(false);
        return;
      }

      // 3. Generate Print HTML instantly on client
      const activeStyleOptions: PreviewStyleOptions = {
        ...styleOptions,
        printDensity: styleOptions.printDensity || 'eco',
      };
      const html = generatePrintHtml(sheet, activeStyleOptions, copies);

      // 4. Inject into hidden iframe and trigger native print dialog
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
        } catch (e: any) {
          console.error('Print trigger error:', e);
          showToast?.('Print dialog could not open automatically: ' + (e?.message || 'Unknown error'), 'error');
        }
      }, 350);

    } catch (err: any) {
      console.error('Print error:', err);
      showToast?.(`Print error: ${err.message || err}`, 'error');
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        
        {/* Solid Professional Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Print Lottery Result Sheets</span>
                <span className="text-[11px] font-sinhala font-normal text-slate-300">(ප්‍රතිඵල මුද්‍රණය)</span>
              </h2>
              <p className="text-xs text-slate-400">
                A4 Landscape • 2 Slips per Sheet • High-Speed Direct Printing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-700">

          {/* Validation Banner if blocked */}
          {exportBlockedErrors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <div className="flex items-start gap-2 text-red-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div>Required fields missing before printing:</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-red-700 mt-1">
                    {exportBlockedErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Number of Copies */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <label className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Copy className="w-4 h-4 text-slate-700" />
                  <span>Number of Copies</span>
                  <span className="text-slate-500 font-sinhala font-normal text-xs">(පිටපත් ගණන)</span>
                </label>
                <p className="text-[11px] text-slate-600">
                  How many A4 sheets to print for daily distribution.
                </p>
              </div>

              {/* Stepper control */}
              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCopies(c => Math.max(1, c - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 flex items-center justify-center text-base cursor-pointer transition active:scale-95"
                >
                  -
                </button>
                <span className="font-mono font-bold text-slate-900 text-base min-w-[36px] text-center">
                  {copies}
                </span>
                <button
                  type="button"
                  onClick={() => setCopies(c => Math.min(50, c + 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 flex items-center justify-center text-base cursor-pointer transition active:scale-95"
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
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {val} {val === 1 ? 'Sheet' : 'Sheets'} ({val * 2} Slips)
                </button>
              ))}
            </div>

            {/* Total slips calculated badge */}
            <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-between text-xs text-slate-800 font-medium">
              <span className="flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 text-slate-600" />
                <span className="font-semibold">Yield calculation:</span>
              </span>
              <span className="font-bold font-sinhala text-slate-900">
                {copies} A4 පිටුවක් = පාරිභෝගික පත්‍රිකා <span className="font-black text-slate-950 font-mono text-sm underline decoration-slate-400">{copies * 2}</span> ක් (Slip Cuts)
              </span>
            </div>
          </div>

          {/* Essential Printer Settings Guidance */}
          <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-1.5 text-xs text-slate-800">
            <div className="font-bold flex items-center gap-1.5 text-slate-900">
              <AlertCircle className="w-4 h-4 text-slate-700 shrink-0" />
              <span>Printer Settings (කොළය කැපීම වැළැක්වීමට මුද්‍රණ සැකසුම්):</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-tight">
              In your system/browser print window (Print dialog), please ensure:
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block">1. Paper Size:</span>
                <span className="text-slate-900 font-extrabold font-mono">A4</span> (not Letter)
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block">2. Margins:</span>
                <span className="text-slate-900 font-extrabold">None / 0</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block">3. Scale:</span>
                <span className="text-slate-900 font-extrabold">100%</span> (Actual size)
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-300 flex flex-wrap items-center justify-between gap-2">
          {/* Secondary PDF export fallback */}
          {onExportPdf && (
            <button
              type="button"
              onClick={() => onExportPdf(styleOptions)}
              disabled={!isReadyToExport || isPrinting}
              className="text-xs text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 transition cursor-pointer"
              title="Download offline PDF file instead of direct printing"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-600" />
              <span>Download PDF Instead</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isPrinting}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel (අවලංගු කරන්න)
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!isReadyToExport || isPrinting}
              className={`px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer ${
                isReadyToExport && !isPrinting
                  ? 'bg-[#15803d] hover:bg-[#166534] text-white active:scale-98'
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
