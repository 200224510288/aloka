'use client';

import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Check, 
  Wand2, 
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Layers,
  ArrowRight,
  Zap,
  Landmark,
  RefreshCw,
  Info,
  CheckCheck
} from 'lucide-react';
import { 
  AiVerificationReport, 
  AiLotteryAuditResult, 
  OfficialLotteryMatchResult, 
  OfficialVerificationSummary,
  LotteryResultItem 
} from '@/types/lottery';

interface AiVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AiVerificationReport | null;
  isLoading: boolean;
  onApplyAllFixes: (report: AiVerificationReport) => void;
  onApplySingleFix: (result: AiLotteryAuditResult) => void;
  onApplyOfficialFix?: (result: OfficialLotteryMatchResult) => void;
  onApplyAllOfficialFixes?: (officialSummary: OfficialVerificationSummary) => void;
  onConfirmAllVerified: () => void;
  onRefreshOfficial?: () => Promise<void>;
  isRefreshingOfficial?: boolean;
}

export const AiVerificationModal: React.FC<AiVerificationModalProps> = ({
  isOpen,
  onClose,
  report,
  isLoading,
  onApplyAllFixes,
  onApplySingleFix,
  onApplyOfficialFix,
  onApplyAllOfficialFixes,
  onConfirmAllVerified,
  onRefreshOfficial,
  isRefreshingOfficial = false,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'flagged' | 'official'>('all');

  if (!isOpen) return null;

  const officialSummary = report?.officialVerification;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-linear-to-r from-blue-50 via-indigo-50/40 to-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Dual Verification: AI & Official Government Audit
                </h3>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>GPT-4o</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Landmark className="w-3 h-3 text-sky-600" />
                  <span>NLB &amp; DLB Live</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Two-tier validation: Cross-checking against raw dealer upload and live Sri Lankan lottery boards.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-indigo-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                Running Dual AI &amp; Government Verification...
              </h4>
              <p className="text-xs text-slate-500 max-w-md">
                1. AI is inspecting winning numbers, draw numbers, letters, and zodiacs against the uploaded document.<br />
                2. System is cross-checking live official results from NLB (nlb.lk) and DLB (dlb.lk).
              </p>
            </div>
          ) : !report ? (
            <div className="py-14 text-center text-slate-500 text-xs">
              No audit report generated yet. Click &ldquo;Run AI 2nd Verification&rdquo; to begin.
            </div>
          ) : (
            <>
              {/* Dual Summary Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                
                {/* Card 1: AI Document Audit */}
                <div 
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                    report.mismatchCount === 0
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/70 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      report.mismatchCount === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base">
                          {report.mismatchCount === 0 ? 'AI Document: 100% Match' : `AI: ${report.mismatchCount} Discrepanc${report.mismatchCount === 1 ? 'y' : 'ies'}`}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 border border-current/20">
                          {report.verifiedCount}/{report.totalLotteries} Verified
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {report.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-current/10">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Source: Dealer Uploaded File
                    </span>
                    {report.mismatchCount > 0 && (
                      <button
                        type="button"
                        onClick={() => onApplyAllFixes(report)}
                        className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Apply AI Fixes ({report.mismatchCount})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Card 2: Official Government Ground Truth */}
                <div 
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                    !officialSummary
                      ? 'bg-slate-50 border-slate-200 text-slate-700'
                      : officialSummary.discrepancyCount === 0
                      ? 'bg-sky-50/70 border-sky-200 text-sky-950'
                      : 'bg-orange-50/70 border-orange-200 text-orange-950'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      !officialSummary 
                        ? 'bg-slate-100 text-slate-600'
                        : officialSummary.discrepancyCount === 0 
                        ? 'bg-sky-100 text-sky-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base">
                          {!officialSummary
                            ? 'Official Gov: Ready to Check'
                            : officialSummary.discrepancyCount === 0
                            ? 'Official Gov: 100% Match'
                            : `Official Gov: ${officialSummary.discrepancyCount} Discrepanc${officialSummary.discrepancyCount === 1 ? 'y' : 'ies'}`}
                        </span>
                        {officialSummary && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 border border-current/20">
                            {officialSummary.matchedCount}/{officialSummary.totalLotteries} Matched
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {officialSummary?.summary || 'Direct live results from NLB (nlb.lk) and DLB (dlb.lk).'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-current/10">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">
                        Live Portals: NLB &amp; DLB
                      </span>
                      {onRefreshOfficial && (
                        <button
                          type="button"
                          onClick={() => onRefreshOfficial()}
                          disabled={isRefreshingOfficial}
                          className="p-1 text-slate-400 hover:text-sky-600 rounded transition cursor-pointer"
                          title="Refresh official government results live"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingOfficial ? 'animate-spin text-sky-600' : ''}`} />
                        </button>
                      )}
                    </div>

                    {officialSummary && officialSummary.discrepancyCount > 0 && onApplyAllOfficialFixes && (
                      <button
                        type="button"
                        onClick={() => onApplyAllOfficialFixes(officialSummary)}
                        className="px-3 py-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <Landmark className="w-3.5 h-3.5" />
                        <span>Apply Official Fixes ({officialSummary.discrepancyCount})</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Date & Metadata Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                <div className="flex items-center gap-3 flex-wrap">
                  {report.dateCheck && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-500">Date Check:</span>
                      <span>Sheet: <strong>{report.dateCheck.sheetDate}</strong></span>
                      {report.dateCheck.detectedDateInSource && (
                        <span>| Source: <strong>{report.dateCheck.detectedDateInSource}</strong></span>
                      )}
                      {report.dateCheck.isDateMatch ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-0.5 ml-1">
                          <Check className="w-3.5 h-3.5" /> Match
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold flex items-center gap-0.5 ml-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Mismatch
                        </span>
                      )}
                    </div>
                  )}

                  {officialSummary?.drawDate && (
                    <div className="flex items-center gap-1.5 text-slate-500 border-l border-slate-300 pl-3">
                      <span>Official Portal Date: <strong>{officialSummary.drawDate}</strong></span>
                    </div>
                  )}
                </div>

                {report.tokenUsage && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold">
                      <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                      {report.tokenUsage.totalTokens.toLocaleString()} tokens (~${report.tokenUsage.estimatedCostUsd.toFixed(4)})
                    </span>
                    <a
                      href="https://platform.openai.com/settings/organization/billing/overview"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 underline flex items-center gap-0.5 ml-1"
                    >
                      <span>OpenAI Balance</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* View Filters & List Controls */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterTab('all')}
                    className={`px-3 py-1 font-bold rounded-md transition cursor-pointer ${
                      filterTab === 'all' 
                        ? 'bg-white text-slate-900 shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All 18 Lotteries
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('flagged')}
                    className={`px-3 py-1 font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                      filterTab === 'flagged' 
                        ? 'bg-white text-amber-800 shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Flagged Mismatches</span>
                    {(report.mismatchCount > 0 || (officialSummary?.discrepancyCount || 0) > 0) && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                        {report.mismatchCount + (officialSummary?.discrepancyCount || 0)}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('official')}
                    className={`px-3 py-1 font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                      filterTab === 'official' 
                        ? 'bg-white text-sky-800 shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Landmark className="w-3 h-3 text-sky-600" />
                    <span>Official Portal View</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onConfirmAllVerified}
                    className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Confirm All Verified</span>
                  </button>
                </div>
              </div>

              {/* Rows Comparison List */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                {report.results
                  .filter(res => {
                    if (filterTab === 'all') return true;
                    const officialItem = officialSummary?.results.find(o => o.lotteryId === res.lotteryId);
                    const isAiMismatch = res.status === 'mismatch';
                    const isOfficialMismatch = officialItem?.status === 'discrepancy';
                    if (filterTab === 'flagged') {
                      return isAiMismatch || isOfficialMismatch;
                    }
                    if (filterTab === 'official') {
                      return !!officialItem;
                    }
                    return true;
                  })
                  .map((res, idx) => {
                    const isAiMismatch = res.status === 'mismatch';
                    const isAiVerified = res.status === 'verified';
                    const hasAiFix = res.suggestedFix && Object.keys(res.suggestedFix).length > 0;

                    const officialItem = officialSummary?.results.find(o => o.lotteryId === res.lotteryId);
                    const isOfficialMatch = officialItem?.status === 'match';
                    const isOfficialDiscrepancy = officialItem?.status === 'discrepancy';
                    const hasOfficialFix = officialItem?.suggestedFix && Object.keys(officialItem.suggestedFix).length > 0;

                    const hasAnyDiscrepancy = isAiMismatch || isOfficialDiscrepancy;

                    return (
                      <div 
                        key={res.lotteryId}
                        className={`p-3 sm:p-4 flex flex-col gap-2.5 transition ${
                          hasAnyDiscrepancy 
                            ? 'bg-amber-50/30 hover:bg-amber-50/50' 
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        {/* Top row: Name, Board, Badges & 1-click actions */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center shrink-0 bg-slate-100 text-slate-700">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-900 text-sm sm:text-base font-sinhala">
                              {res.nameSi}
                            </span>
                            <span 
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                                res.board === 'DLB' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {res.board}
                            </span>
                            <span className="text-xs text-slate-400 hidden sm:inline">
                              {res.nameEn}
                            </span>
                          </div>

                          {/* Dual Badges & Actions */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* AI Badge */}
                            {isAiVerified ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                <span>AI Verified</span>
                              </span>
                            ) : isAiMismatch ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>AI Mismatch</span>
                                </span>
                                {hasAiFix && (
                                  <button
                                    type="button"
                                    onClick={() => onApplySingleFix(res)}
                                    className="px-2 py-0.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded shadow-2xs transition flex items-center gap-1 cursor-pointer"
                                    title="Apply AI values extracted from document"
                                  >
                                    <Wand2 className="w-3 h-3" />
                                    <span>Fix from AI</span>
                                  </button>
                                )}
                              </div>
                            ) : null}

                            {/* Official Portal Badge */}
                            {officialItem ? (
                              isOfficialMatch ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                                  <Landmark className="w-3 h-3 text-sky-600" />
                                  <span>Official Match</span>
                                </span>
                              ) : isOfficialDiscrepancy ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-800 bg-orange-50 border border-orange-300 px-2 py-0.5 rounded-full">
                                    <AlertTriangle className="w-3 h-3 text-orange-600" />
                                    <span>Gov Diff</span>
                                  </span>
                                  {hasOfficialFix && onApplyOfficialFix && (
                                    <button
                                      type="button"
                                      onClick={() => onApplyOfficialFix(officialItem)}
                                      className="px-2 py-0.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded shadow-2xs transition flex items-center gap-1 cursor-pointer"
                                      title="Apply ground-truth values from live official government portal"
                                    >
                                      <Landmark className="w-3 h-3" />
                                      <span>Apply Gov Result</span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                  Not Found on Gov Site
                                </span>
                              )
                            ) : null}
                          </div>
                        </div>

                        {/* Comparison Rows */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 font-mono">
                          
                          {/* 1. Sheet Extracted */}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-black text-slate-400 font-sans uppercase">
                              Sheet Extracted:
                            </span>
                            <span className="font-bold text-slate-800 truncate">
                              {res.extracted.drawNo && `[Draw: ${res.extracted.drawNo}] `}
                              {res.extracted.letter && `[${res.extracted.letter}] `}
                              {res.extracted.zodiac && `[${res.extracted.zodiac}] `}
                              {res.extracted.numbers.join(' ')}
                              {res.extracted.bonusNumber && ` + (${res.extracted.bonusNumber})`}
                            </span>
                          </div>

                          {/* 2. AI Document Audit */}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-black text-indigo-500 font-sans uppercase flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>AI Document Source:</span>
                            </span>
                            <span className="text-slate-700 truncate">
                              {res.verifiedInSource ? (
                                <>
                                  {res.verifiedInSource.drawNo && `[Draw: ${res.verifiedInSource.drawNo}] `}
                                  {res.verifiedInSource.letter && `[${res.verifiedInSource.letter}] `}
                                  {res.verifiedInSource.zodiac && `[${res.verifiedInSource.zodiac}] `}
                                  {res.verifiedInSource.numbers.join(' ')}
                                  {res.verifiedInSource.bonusNumber && ` + (${res.verifiedInSource.bonusNumber})`}
                                </>
                              ) : (
                                <span className="text-slate-400 italic">Matched raw text</span>
                              )}
                            </span>
                          </div>

                          {/* 3. Official Government Portal */}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-black text-sky-600 font-sans uppercase flex items-center gap-1">
                              <Landmark className="w-2.5 h-2.5" />
                              <span>Live Gov Result ({res.board}):</span>
                            </span>
                            <span className="text-slate-700 truncate">
                              {officialItem?.officialValues ? (
                                <>
                                  {officialItem.officialValues.drawNo && `[Draw: ${officialItem.officialValues.drawNo}] `}
                                  {officialItem.officialValues.letter && `[${officialItem.officialValues.letter}] `}
                                  {officialItem.officialValues.zodiacSi && `[${officialItem.officialValues.zodiacSi}] `}
                                  {officialItem.officialValues.numbers.join(' ')}
                                  {officialItem.officialValues.superNumber && ` + (${officialItem.officialValues.superNumber})`}
                                </>
                              ) : (
                                <span className="text-slate-400 italic">No live record</span>
                              )}
                            </span>
                          </div>

                        </div>

                        {/* Discrepancy Warnings (if any) */}
                        {((res.discrepancies && res.discrepancies.length > 0) || 
                          (officialItem?.discrepancies && officialItem.discrepancies.length > 0)) && (
                          <div className="flex flex-col gap-1 text-[11px] pt-0.5">
                            {res.discrepancies && res.discrepancies.length > 0 && (
                              <div className="text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded font-medium flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>AI File Audit: {res.discrepancies.join(' | ')}</span>
                              </div>
                            )}

                            {officialItem?.discrepancies && officialItem.discrepancies.length > 0 && (
                              <div className="text-orange-800 bg-orange-100/70 px-2.5 py-1 rounded font-medium flex items-center gap-1.5">
                                <Landmark className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                                <span>Official Gov Audit: {officialItem.discrepancies.join(' | ')}</span>
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Dual verification cross-references against dealer PDF and official NLB/DLB ground truth.</span>
            <span className="sm:hidden">Dual verified with NLB &amp; DLB.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onConfirmAllVerified}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Confirm &amp; Apply All Verified</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
