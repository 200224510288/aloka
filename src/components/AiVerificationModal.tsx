'use client';

import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Check, 
  Wand2, 
  FileText,
  Zap,
  Info,
  CheckCheck
} from 'lucide-react';
import { 
  AiVerificationReport, 
  AiLotteryAuditResult 
} from '@/types/lottery';

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
  const [filterTab, setFilterTab] = useState<'all' | 'flagged'>('all');

  if (!isOpen) return null;

  const results = report?.results || [];
  const flaggedResults = results.filter(r => r.status === 'mismatch' || (r.discrepancies && r.discrepancies.length > 0));
  const displayedResults = filterTab === 'flagged' ? flaggedResults : results;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  AI Document Second Verification
                </h3>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  <span>OpenAI GPT-4o</span>
                </span>
                {report?.tokenUsage && (
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full hidden sm:inline">
                    {report.tokenUsage.totalTokens.toLocaleString()} tokens (~${report.tokenUsage.estimatedCostUsd.toFixed(4)})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Auditing extracted numbers, letters, and zodiacs against your uploaded raw dealer PDF / image.
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
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <div className="relative mb-4">
                <div className="w-14 h-14 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-purple-600">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                Auditing Document with OpenAI GPT-4o...
              </h4>
              <p className="text-xs text-slate-500 max-w-md">
                Comparing winning numbers, draw numbers, letters, and zodiac signs against your uploaded dealer document.
              </p>
            </div>
          ) : !report ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              No audit report generated yet. Click &ldquo;AI Verify&rdquo; to begin.
            </div>
          ) : (
            <>
              {/* Summary Banner Card */}
              <div 
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 ${
                  report.mismatchCount === 0
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/80 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    report.mismatchCount === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {report.mismatchCount === 0 ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm sm:text-base">
                        {report.mismatchCount === 0
                          ? '100% Match with Raw Source Document'
                          : `${report.mismatchCount} Discrepanc${report.mismatchCount === 1 ? 'y' : 'ies'} Flagged by AI`}
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 border border-current/20">
                        {report.verifiedCount}/{report.totalLotteries} Verified
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {report.summary}
                    </p>
                  </div>
                </div>

                {report.mismatchCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onApplyAllFixes(report)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Apply All AI Fixes ({report.mismatchCount})</span>
                  </button>
                )}
              </div>

              {/* View Filters & Controls */}
              <div className="flex items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterTab('all')}
                    className={`px-3 py-1 font-bold rounded-md transition cursor-pointer ${
                      filterTab === 'all' 
                        ? 'bg-white text-slate-900 shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({results.length})
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
                    {flaggedResults.length > 0 && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                        {flaggedResults.length}
                      </span>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onConfirmAllVerified}
                  className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Confirm All Verified</span>
                </button>
              </div>

              {/* Comparison List */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                {displayedResults.map((item, idx) => {
                  const isVerified = item.status === 'verified';
                  const ext = item.extracted;

                  return (
                    <div 
                      key={item.lotteryId}
                      className={`p-3.5 sm:p-4 transition ${
                        isVerified ? 'hover:bg-slate-50/60' : 'bg-amber-50/40 hover:bg-amber-50/70'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Title & Board */}
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">
                                {item.nameSi}
                              </span>
                              <span className="text-xs text-slate-500">
                                ({item.nameEn})
                              </span>
                              <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                item.board === 'NLB' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {item.board}
                              </span>
                            </div>
                            {item.discrepancies && item.discrepancies.length > 0 && (
                              <div className="text-[11px] font-bold text-amber-800 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{item.discrepancies.join(' • ')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Badge & Fix Action */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>AI Verified</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-1 rounded-lg">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span>AI Discrepancy</span>
                              </span>
                              {item.suggestedFix && (
                                <button
                                  type="button"
                                  onClick={() => onApplySingleFix(item)}
                                  className="px-2.5 py-1 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-lg transition active:scale-95 shadow-2xs cursor-pointer flex items-center gap-1"
                                  title="Apply AI detected correction from source document"
                                >
                                  <Wand2 className="w-3 h-3" />
                                  <span>Apply AI Fix</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Source Comparison Strip */}
                      {ext && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs">
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                              <FileText className="w-3 h-3 text-purple-600" />
                              <span>Detected in Source Document:</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                Draw: <strong>{ext.drawNo || '—'}</strong>
                              </span>
                              {ext.letter && (
                                <span className="font-mono bg-blue-100 text-blue-900 font-bold px-1.5 py-0.5 rounded border border-blue-200">
                                  {ext.letter}
                                </span>
                              )}
                              {ext.zodiac && (
                                <span className="bg-purple-100 text-purple-900 font-bold px-1.5 py-0.5 rounded border border-purple-200">
                                  {ext.zodiac}
                                </span>
                              )}
                              {ext.numbers && ext.numbers.length > 0 && (
                                <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-slate-900">
                                  {ext.numbers.join('  ')}
                                </span>
                              )}
                              {ext.bonusNumber && (
                                <span className="font-mono bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded border border-amber-300">
                                  [{ext.bonusNumber}]
                                </span>
                              )}
                              {ext.isNoDraw && (
                                <span className="bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                                  No Draw
                                </span>
                              )}
                            </div>
                          </div>
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
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            AI Document Audit cross-references data against your uploaded paper source.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
