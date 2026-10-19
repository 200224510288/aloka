'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  ExternalLink, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  CheckCheck,
  Globe
} from 'lucide-react';
import { OfficialLotteryMatchResult, OfficialVerificationSummary, LotteryResultItem } from '@/types/lottery';

interface OfficialVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: OfficialVerificationSummary | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onApplyOfficialFix?: (result: OfficialLotteryMatchResult) => void;
  onApplyAllOfficialFixes?: (officialSummary: OfficialVerificationSummary) => void;
}

export const OfficialVerificationModal: React.FC<OfficialVerificationModalProps> = ({
  isOpen,
  onClose,
  summary,
  isLoading,
  onRefresh,
  onApplyOfficialFix,
  onApplyAllOfficialFixes,
}) => {
  const [boardFilter, setBoardFilter] = useState<'all' | 'flagged' | 'nlb' | 'dlb'>('all');

  if (!isOpen) return null;

  const results = summary?.results || [];
  const filteredResults = results.filter(r => {
    if (boardFilter === 'flagged') return r.status === 'discrepancy' || r.discrepancies.length > 0;
    if (boardFilter === 'nlb') return r.board === 'NLB';
    if (boardFilter === 'dlb') return r.board === 'DLB';
    return true;
  });

  const discrepancyResults = results.filter(r => r.status === 'discrepancy' || r.discrepancies.length > 0);
  const hasDiscrepancies = discrepancyResults.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-linear-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Official Government Lottery Verification
                </h3>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  NLB (nlb.lk)
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                  DLB (dlb.lk)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct cross-reference against official government portals ground truth.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-slate-600 hover:text-blue-700 hover:bg-white rounded-lg border border-slate-200/80 transition shadow-2xs flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Re-fetch live results from NLB & DLB"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">Refresh Portals</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <div className="relative mb-4">
                <div className="w-14 h-14 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                  <Building2 className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                Fetching Official Government Results...
              </h4>
              <p className="text-xs text-slate-500 max-w-md">
                Connecting directly to National Lotteries Board (NLB) and Development Lotteries Board (DLB) portals.
              </p>
            </div>
          ) : !summary ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              No official results fetched yet. Click &ldquo;Refresh Portals&rdquo; to begin.
            </div>
          ) : (
            <>
              {/* Summary Banner Card */}
              <div 
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 ${
                  summary.discrepancyCount === 0
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50/80 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    summary.discrepancyCount === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {summary.discrepancyCount === 0 ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm sm:text-base">
                        {summary.discrepancyCount === 0
                          ? '100% Official Ground Truth Match'
                          : `${summary.discrepancyCount} Discrepanc${summary.discrepancyCount === 1 ? 'y' : 'ies'} Flagged against Official Results`}
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 border border-current/20">
                        {summary.matchedCount}/{summary.totalLotteries} Confirmed
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {summary.discrepancyCount === 0
                        ? 'All 18 daily lotteries match official NLB and DLB draw records perfectly.'
                        : 'Differences were detected between your sheet and official government publications.'}
                    </p>
                  </div>
                </div>

                {hasDiscrepancies && onApplyAllOfficialFixes && (
                  <button
                    type="button"
                    onClick={() => onApplyAllOfficialFixes(summary)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Apply All Official Values</span>
                  </button>
                )}
              </div>

              {/* Filter Tabs & Quick Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setBoardFilter('all')}
                    className={`px-3 py-1 font-bold rounded-md transition cursor-pointer ${
                      boardFilter === 'all' 
                        ? 'bg-white text-slate-900 shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({results.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoardFilter('flagged')}
                    className={`px-3 py-1 font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                      boardFilter === 'flagged' 
                        ? 'bg-white text-amber-800 shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Discrepancies</span>
                    {hasDiscrepancies && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                        {discrepancyResults.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoardFilter('nlb')}
                    className={`px-3 py-1 font-bold rounded-md transition cursor-pointer ${
                      boardFilter === 'nlb' 
                        ? 'bg-white text-blue-800 shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    NLB ({results.filter(r => r.board === 'NLB').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoardFilter('dlb')}
                    className={`px-3 py-1 font-bold rounded-md transition cursor-pointer ${
                      boardFilter === 'dlb' 
                        ? 'bg-white text-indigo-800 shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    DLB ({results.filter(r => r.board === 'DLB').length})
                  </button>
                </div>

                <Link
                  href="/official-results"
                  target="_blank"
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Open Official Results Hub</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* Comparison List */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                {filteredResults.map((item, idx) => {
                  const isMatch = item.status === 'match';
                  const offVals = item.officialValues;
                  const sheetVals = item.sheetValues;

                  return (
                    <div 
                      key={item.lotteryId}
                      className={`p-3.5 sm:p-4 transition ${
                        isMatch ? 'hover:bg-slate-50/60' : 'bg-amber-50/40 hover:bg-amber-50/70'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Title and Board */}
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
                                {item.board.toUpperCase()}
                              </span>
                            </div>
                            {item.discrepancies.length > 0 && (
                              <div className="text-[11px] font-bold text-amber-800 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{item.discrepancies.join(' • ')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Badge & Fix Action */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isMatch ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Official Match</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-1 rounded-lg">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Mismatch</span>
                              </span>
                              {onApplyOfficialFix && (
                                <button
                                  type="button"
                                  onClick={() => onApplyOfficialFix(item)}
                                  className="px-2.5 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition active:scale-95 shadow-2xs cursor-pointer"
                                  title="Replace sheet row values with official portal values"
                                >
                                  Apply Official
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Values Comparison Strip */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-xs">
                        {/* Sheet Values */}
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                            Sheet Values (Current)
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              Draw: <strong>{sheetVals?.drawNo || '—'}</strong>
                            </span>
                            {sheetVals?.letter && (
                              <span className="font-mono bg-blue-100 text-blue-900 font-bold px-1.5 py-0.5 rounded border border-blue-200">
                                {sheetVals.letter}
                              </span>
                            )}
                            {sheetVals?.zodiac && (
                              <span className="bg-purple-100 text-purple-900 font-bold px-1.5 py-0.5 rounded border border-purple-200">
                                {sheetVals.zodiac}
                              </span>
                            )}
                            {sheetVals?.numbers && sheetVals.numbers.length > 0 && (
                              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-800">
                                {sheetVals.numbers.join('  ')}
                              </span>
                            )}
                            {sheetVals?.bonusNumber && (
                              <span className="font-mono bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded border border-amber-300">
                                [{sheetVals.bonusNumber}]
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Official Values */}
                        <div className={`p-2.5 rounded-lg border ${
                          isMatch ? 'bg-slate-50 border-slate-200/80' : 'bg-blue-50/60 border-blue-200 text-blue-950'
                        }`}>
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 mb-1.5 flex items-center justify-between">
                            <span>Official Portal Results</span>
                            {offVals?.drawDate && <span className="font-normal text-slate-500">{offVals.drawDate}</span>}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              Draw: <strong>{offVals?.drawNo || '—'}</strong>
                            </span>
                            {offVals?.letter && (
                              <span className="font-mono bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded shadow-2xs">
                                {offVals.letter}
                              </span>
                            )}
                            {(offVals?.zodiacSi || offVals?.zodiacEn) && (
                              <span className="bg-purple-600 text-white font-bold px-1.5 py-0.5 rounded shadow-2xs">
                                {offVals.zodiacSi || offVals.zodiacEn}
                              </span>
                            )}
                            {offVals?.numbers && offVals.numbers.length > 0 && (
                              <span className="font-mono bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded shadow-2xs">
                                {offVals.numbers.join('  ')}
                              </span>
                            )}
                            {offVals?.superNumber && (
                              <span className="font-mono bg-red-600 text-white font-bold px-1.5 py-0.5 rounded shadow-2xs">
                                [{offVals.superNumber}]
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
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
            Live fetched from National Lotteries Board (NLB) &amp; Development Lotteries Board (DLB).
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
