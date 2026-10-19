'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, AlertTriangle, Building2, ArrowRight, ArrowLeft, Cloud, RefreshCw, Printer, Sliders, FileDown, Globe } from 'lucide-react';
import { DailySheet } from '@/types/lottery';
import { WorkflowStep } from './StepNavigation';
import { transliterateSinglish, hasEnglishLetters } from '@/lib/singlish';

interface HeaderProps {
  sheet: DailySheet;
  currentStep?: WorkflowStep;
  pageMode?: 'print' | 'editor';
  cloudStatus?: 'synced' | 'syncing' | 'offline' | 'permission_denied';
  onStepChange?: (step: WorkflowStep) => void;
  onDateChange: (newDate: string) => void;
  onUpdateSheet: (updater: (prev: DailySheet) => DailySheet) => void;
  onSave?: () => void;
  onExportPdf: () => void;
  onOpenHistory?: () => void;
  onLoadSample?: () => void;
  isSaving?: boolean;
  isExporting: boolean;
  exportBlockedErrors: string[];
  onPrint?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sheet,
  currentStep = 'verify',
  pageMode = 'editor',
  cloudStatus = 'synced',
  onStepChange,
  onDateChange,
  onUpdateSheet,
  onSave,
  onExportPdf,
  onOpenHistory,
  onLoadSample,
  isSaving = false,
  isExporting,
  exportBlockedErrors,
  onPrint,
}) => {
  const [isEditingDealer, setIsEditingDealer] = useState(false);
  const [dealerInput, setDealerInput] = useState(sheet.headerDealerName);

  const isReadyToExport = exportBlockedErrors.length === 0;

  const handleSaveDealer = () => {
    const trimmed = dealerInput.trim();
    const finalName = hasEnglishLetters(trimmed) ? transliterateSinglish(trimmed) : trimmed;
    onUpdateSheet(prev => ({
      ...prev,
      headerDealerName: finalName || 'S.W.ඔස්මන් ද සිල්වා'
    }));
    setIsEditingDealer(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-2">
        <div className="flex items-center justify-between gap-3">
          
          {/* Left: Brand Identity & Date */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-extrabold shadow-sm text-base">
                ජ
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                    ජය මාවත
                  </h1>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
                    {pageMode === 'print' ? 'Staff Print Portal (මුද්‍රණය)' : 'Daily Generator & Editor'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
                  {pageMode === 'print' 
                    ? 'Sinhala Daily Result Sheets • 1-Click Quick Print' 
                    : 'Sinhala Daily Result Sheets (A4 Landscape)'}
                </p>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden md:block" />

            {/* Quick Date Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1 px-2 hover:border-slate-300 transition-colors">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type="date"
                value={sheet.date}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              />
              <span className="text-[11px] font-black text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded font-sinhala shrink-0">
                {sheet.dayOfWeekSi}
              </span>
            </div>

            {/* Link to Official Results Hub */}
            <Link
              href="/official-results"
              className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-slate-700 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1 transition shadow-2xs"
              title="View live fetched results from NLB & DLB official portals"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>Official Results</span>
            </Link>
          </div>

          {/* Right: Dealer Info & Primary Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Dealer Agency Pill */}
            <div className="hidden 2xl:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {isEditingDealer ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={dealerInput}
                    onChange={(e) => setDealerInput(e.target.value)}
                    className="text-xs font-bold bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none font-sinhala"
                    placeholder="Dealer Name"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveDealer}
                    className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[11px] font-semibold hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDealerInput(sheet.headerDealerName);
                    setIsEditingDealer(true);
                  }}
                  className="font-bold text-slate-800 hover:text-blue-700 truncate max-w-[140px] font-sinhala"
                  title="Click to edit Dealer header name"
                >
                  {sheet.headerDealerName}
                </button>
              )}
            </div>

            {/* Cloud Auto-Sync Status */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                cloudStatus === 'syncing'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                  : cloudStatus === 'synced'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : cloudStatus === 'permission_denied'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title={
                cloudStatus === 'permission_denied'
                  ? 'Firebase Firestore permission denied: Set allow read, write in Firebase Console -> Firestore -> Rules'
                  : cloudStatus === 'synced'
                  ? 'Auto-synced to cloud (branch: result_generator_daily_sheets)'
                  : 'Offline / local cache'
              }
            >
              {cloudStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : cloudStatus === 'permission_denied' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <Cloud className={`w-3.5 h-3.5 ${cloudStatus === 'synced' ? 'text-emerald-600' : 'text-slate-400'}`} />
              )}
              <span>
                {cloudStatus === 'syncing'
                  ? 'Saving edits...'
                  : cloudStatus === 'synced'
                  ? 'Auto-Saved'
                  : cloudStatus === 'permission_denied'
                  ? 'Cloud: Rule Blocked'
                  : 'Local Cache'}
              </span>
            </div>

            {pageMode === 'print' ? (
              /* Staff Quick Print Mode Header Actions */
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onPrint}
                  className="px-4 py-2 text-xs font-black rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer bg-[#15803d] text-white hover:bg-[#166534] active:scale-95"
                  title="Open Print Dialog to select copies and print"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Sheet (මුද්‍රණය)</span>
                </button>

                <Link
                  href={`/editor?date=${sheet.date}`}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 flex items-center gap-1.5 transition shadow-2xs"
                  title="Open full editor to upload new source sheets or edit numbers"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Data Entry & Upload</span>
                  <span className="text-[11px] font-sinhala">(සංස්කරණය)</span>
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                </Link>
              </div>
            ) : (
              /* Editor Mode Header Actions */
              <>
                <Link
                  href={`/?date=${sheet.date}`}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 flex items-center gap-1.5 transition shadow-2xs mr-1"
                  title="Return to Staff Quick Print Portal"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Staff Print Portal</span>
                  <span className="text-[11px] font-sinhala">(මුද්‍රණ පුවරුව)</span>
                </Link>



                {currentStep === 'setup' && onStepChange && (
                  <button
                    type="button"
                    onClick={() => onStepChange('verify')}
                    className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-sm transition active:scale-[0.98]"
                  >
                    <span>Verify Results</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {currentStep === 'verify' && onStepChange && (
                  <button
                    type="button"
                    onClick={() => onStepChange('preview')}
                    className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-sm transition active:scale-[0.98]"
                  >
                    <span>Preview & Print</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {currentStep === 'preview' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onPrint}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                      title="Open Print Dialog to select copies and printer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Sheet (මුද්‍රණය)</span>
                    </button>

                    <div className="relative group">
                      <button
                        type="button"
                        onClick={onExportPdf}
                        disabled={!isReadyToExport || isExporting}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition ${
                          isReadyToExport
                            ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
                      </button>

                      {!isReadyToExport && (
                        <div className="hidden group-hover:block absolute right-0 top-full mt-1.5 w-72 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-2xl z-50">
                          <p className="font-bold text-amber-400 mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Export Blocked:
                          </p>
                          <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-300">
                            {exportBlockedErrors.map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
