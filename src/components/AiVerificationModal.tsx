'use client';

import React from 'react';
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
  Zap
} from 'lucide-react';
import { AiVerificationReport, AiLotteryAuditResult, LotteryResultItem } from '@/types/lottery';

interface AiVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AiVerificationReport | null;
  isLoading: boolean;
  onApplyAllFixes: (report: AiVerificationReport) => void;
  onApplySingleFix: (result: AiLotteryAuditResult) => void;
  onConfirmAllVerified: () => void;
}

export const AiVerificationModal: React.FC<AiVerificationModalProps> = ({
  isOpen,
  onClose,
  report,
  isLoading,
  onApplyAllFixes,
  onApplySingleFix,
  onConfirmAllVerified,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-linear-to-r from-blue-50 via-indigo-50/50 to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  AI Second Verification Audit
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  OpenAI GPT-4o
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Independent AI verification cross-referencing raw source document against extracted lotteries.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-4" />
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                Auditing Raw File Against Extracted Results...
              </h4>
              <p className="text-xs text-slate-500 max-w-sm">
                OpenAI is scanning winning numbers, draw numbers, letters, and zodiac signs row-by-row.
              </p>
            </div>
          ) : !report ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No audit report generated yet. Click &ldquo;Run AI 2nd Verification&rdquo; to begin.
            </div>
          ) : (
            <>
              {/* Overall Summary Card */}
              <div 
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  report.mismatchCount === 0
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/70 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  {report.mismatchCount === 0 ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm sm:text-base">
                        {report.mismatchCount === 0 
                          ? '100% Verified Match!' 
                          : `${report.mismatchCount} Discrepanc${report.mismatchCount === 1 ? 'y' : 'ies'} Detected`}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/80 border border-current/20">
                        {report.verifiedCount} of {report.totalLotteries} Verified
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {report.summary}
                    </p>
                  </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {report.mismatchCount > 0 && (
                    <button
                      type="button"
                      onClick={() => onApplyAllFixes(report)}
                      className="px-3.5 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Apply All AI Fixes ({report.mismatchCount})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onConfirmAllVerified}
                    className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 transition active:scale-95"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Confirm All as Verified</span>
                  </button>
                </div>
              </div>

              {/* Date Check Pill */}
              {report.dateCheck && (
                <div className="flex items-center justify-between text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Date Verification:</span>
                    <span>Sheet Date: <strong>{report.dateCheck.sheetDate}</strong></span>
                    {report.dateCheck.detectedDateInSource && (
                      <span>| Source Date: <strong>{report.dateCheck.detectedDateInSource}</strong></span>
                    )}
                  </div>
                  {report.dateCheck.isDateMatch ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Matches Source
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Date Mismatch
                    </span>
                  )}
                </div>
              )}

              {/* Token Usage & Quota Info */}
              {report.tokenUsage && (
                <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 bg-slate-100/80 border border-slate-200/90 rounded-lg text-xs text-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 font-bold text-indigo-700">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      AI Tokens:
                    </span>
                    <span>
                      <strong>{report.tokenUsage.totalTokens.toLocaleString()}</strong> tokens used
                      <span className="text-slate-500 text-[11px] ml-1">
                        ({report.tokenUsage.promptTokens.toLocaleString()} in / {report.tokenUsage.completionTokens.toLocaleString()} out)
                      </span>
                    </span>
                    <span className="text-slate-300 hidden sm:inline">•</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[11px]">
                      Cost: ~${report.tokenUsage.estimatedCostUsd.toFixed(4)} USD
                    </span>
                    {report.tokenUsage.remainingTokensPerMinute && (
                      <>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="text-slate-600 text-[11px]">
                          Minute quota left: <strong>{Number(report.tokenUsage.remainingTokensPerMinute).toLocaleString()}</strong> TPM
                        </span>
                      </>
                    )}
                  </div>
                  <a
                    href="https://platform.openai.com/settings/organization/billing/overview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 underline text-[11px] shrink-0"
                    title="View your OpenAI account balance and add funds"
                  >
                    <span>Check OpenAI Account Balance</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Rows Comparison List */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                  Row-by-Row Comparison (18 Standard Lotteries)
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {report.results.map((res, idx) => {
                    const isMismatch = res.status === 'mismatch';
                    const isVerified = res.status === 'verified';
                    const hasFix = res.suggestedFix && Object.keys(res.suggestedFix).length > 0;

                    return (
                      <div 
                        key={res.lotteryId}
                        className={`p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                          isMismatch 
                            ? 'bg-amber-50/40 hover:bg-amber-50/70' 
                            : 'hover:bg-slate-50/70'
                        }`}
                      >
                        {/* Left: Lottery identity and status */}
                        <div className="flex items-start sm:items-center gap-2.5 min-w-[220px]">
                          <span className="w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center shrink-0 bg-slate-100 text-slate-700">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-sm font-sinhala">
                                {res.nameSi}
                              </span>
                              <span 
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                  res.board === 'DLB' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {res.board}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {res.nameEn}
                            </span>
                          </div>
                        </div>

                        {/* Middle: Extracted vs Source comparison */}
                        <div className="flex-1 flex flex-col gap-1 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 uppercase w-16 shrink-0">
                              Extracted:
                            </span>
                            <span className="font-mono font-bold text-slate-800">
                              {res.extracted.drawNo && `[Draw: ${res.extracted.drawNo}] `}
                              {res.extracted.letter && `[${res.extracted.letter}] `}
                              {res.extracted.zodiac && `[${res.extracted.zodiac}] `}
                              {res.extracted.numbers.join(' ')}
                              {res.extracted.bonusNumber && ` + (${res.extracted.bonusNumber})`}
                            </span>
                          </div>

                          {res.verifiedInSource && (
                            <div className="flex items-center gap-2 flex-wrap text-slate-600">
                              <span className="text-[10px] font-bold text-indigo-500 uppercase w-16 shrink-0">
                                AI Source:
                              </span>
                              <span className="font-mono text-slate-700">
                                {res.verifiedInSource.drawNo && `[Draw: ${res.verifiedInSource.drawNo}] `}
                                {res.verifiedInSource.letter && `[${res.verifiedInSource.letter}] `}
                                {res.verifiedInSource.zodiac && `[${res.verifiedInSource.zodiac}] `}
                                {res.verifiedInSource.numbers.join(' ')}
                                {res.verifiedInSource.bonusNumber && ` + (${res.verifiedInSource.bonusNumber})`}
                              </span>
                            </div>
                          )}

                          {/* Discrepancy Alert details */}
                          {res.discrepancies && res.discrepancies.length > 0 && (
                            <div className="text-[11px] text-amber-800 font-medium bg-amber-100/70 px-2 py-0.5 rounded mt-0.5 inline-block">
                              ⚠️ {res.discrepancies.join(' | ')}
                            </div>
                          )}
                        </div>

                        {/* Right: Status badge & 1-Click Fix action */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                              <Check className="w-3.5 h-3.5" />
                              <span>Verified</span>
                            </span>
                          ) : isMismatch ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Mismatch</span>
                              </span>

                              {hasFix && (
                                <button
                                  type="button"
                                  onClick={() => onApplySingleFix(res)}
                                  className="px-2.5 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-md shadow-2xs transition flex items-center gap-1"
                                  title="Apply AI corrected values for this lottery"
                                >
                                  <Wand2 className="w-3 h-3" />
                                  <span>Fix</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                              Unverified
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>AI verification acts as an automated second pair of eyes against the raw file.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
