'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Globe, 
  RefreshCw, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  Check, 
  Terminal, 
  Layers, 
  ArrowLeft, 
  Calendar, 
  AlertCircle,
  FileCheck,
  Zap,
  Sliders,
  DownloadCloud,
  Building,
  CheckCheck
} from 'lucide-react';
import { OfficialFetchResponse, OfficialFetchedLottery } from '@/lib/official-lottery-fetcher';

export default function OfficialResultsExperimentPage() {
  const router = useRouter();
  const [data, setData] = useState<OfficialFetchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<'all' | 'dlb' | 'nlb'>('all');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cards' | 'comparison' | 'inspector'>('cards');
  const [copiedJson, setCopiedJson] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch results
  const fetchResults = async (board = selectedBoard) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/official-results?board=${board}`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const json: OfficialFetchResponse = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to fetch official results');
      }
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while fetching from official lottery websites.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults('all');
  }, []);

  const handleBoardChange = (board: 'all' | 'dlb' | 'nlb') => {
    setSelectedBoard(board);
    fetchResults(board);
  };

  const handleCopyJson = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Convert draw date like "Sunday October 18, 2026" or "2026-Oct-18 Sunday" to YYYY-MM-DD
  const getIsoDate = (dateStr?: string | null): string => {
    if (!dateStr) return '2026-10-18';
    
    // Check if format is "2026-Oct-18" or "2026-10-18"
    const isoLike = dateStr.match(/(\d{4})-([A-Za-z]+|\d{2})-(\d{1,2})/);
    if (isoLike) {
      const y = isoLike[1];
      const mStr = isoLike[2].toLowerCase();
      const d = isoLike[3].padStart(2, '0');
      const monthMap: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      const m = monthMap[mStr.slice(0, 3)] || mStr.padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    const monthMap: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12'
    };
    const match = dateStr.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/i);
    if (match) {
      const month = monthMap[match[1].toLowerCase()] || '10';
      const day = match[2].padStart(2, '0');
      const year = match[3];
      return `${year}-${month}-${day}`;
    }
    return '2026-10-18';
  };

  const targetDateIso = getIsoDate(data?.drawDate);

  // Import into Daily Sheet
  const handleImportToEditor = async () => {
    if (!data || data.lotteries.length === 0) return;
    setIsImporting(true);
    try {
      // 1. Fetch current sheet for date
      const sheetRes = await fetch(`/api/sheet?date=${targetDateIso}`);
      let currentSheet = null;
      if (sheetRes.ok) {
        const sheetData = await sheetRes.json();
        currentSheet = sheetData.sheet;
      }

      if (!currentSheet) {
        throw new Error('Failed to load target sheet for date ' + targetDateIso);
      }

      // 2. Merge official lotteries into sheet
      let importCount = 0;
      const updatedLotteries = currentSheet.lotteries.map((existing: any) => {
        const officialMatch = data.lotteries.find(
          l => l.matchedLotteryId === existing.lotteryId
        );
        if (!officialMatch) return existing;

        importCount++;
        return {
          ...existing,
          drawNo: officialMatch.drawNo,
          letter: officialMatch.letter || existing.letter,
          zodiac: officialMatch.zodiacSi || existing.zodiac,
          numbers: officialMatch.numbers.length > 0 ? officialMatch.numbers : existing.numbers,
          bonusNumber: officialMatch.superNumber || existing.bonusNumber,
          isVerified: true,
          verificationNotes: `Verified from Official ${officialMatch.board} website on ${new Date().toLocaleTimeString()}`,
          isNoDraw: false,
        };
      });

      const updatedSheet = {
        ...currentSheet,
        lotteries: updatedLotteries,
        updatedAt: new Date().toISOString(),
      };

      // 3. Save sheet
      const saveRes = await fetch('/api/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: updatedSheet,
          summary: `Imported ${importCount} official lotteries directly from ${data.boards?.join(' & ') || 'official sites'}`,
        }),
      });

      if (!saveRes.ok) {
        throw new Error('Failed to save imported results to server');
      }

      // 4. Redirect to editor
      router.push(`/editor?date=${targetDateIso}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Import failed');
      setIsImporting(false);
    }
  };

  const filteredLotteries = data?.lotteries.filter(item => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.officialName.toLowerCase().includes(q) ||
      item.lotteryNameSi?.toLowerCase().includes(q) ||
      item.lotteryNameEn?.toLowerCase().includes(q) ||
      item.drawNo.includes(q) ||
      item.board.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/editor?date=${targetDateIso}`}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Return to Sheet Editor"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white font-extrabold shadow-md shadow-blue-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Official Lottery Fetcher Lab
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  NLB + DLB Scraper
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                <span>Official sources:</span>
                <a 
                  href="https://www.dlb.lk/result/2/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-sky-400 hover:underline inline-flex items-center gap-0.5 font-semibold"
                >
                  dlb.lk/result/2/
                  <ExternalLink className="w-3 h-3 inline" />
                </a>
                <span className="text-slate-600">•</span>
                <a 
                  href="https://www.nlb.lk/results" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-indigo-400 hover:underline inline-flex items-center gap-0.5 font-semibold"
                >
                  nlb.lk/results
                  <ExternalLink className="w-3 h-3 inline" />
                </a>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => fetchResults(selectedBoard)}
              disabled={isLoading}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Fetching Official...' : 'Fetch Live Results'}</span>
            </button>

            <button
              type="button"
              onClick={handleImportToEditor}
              disabled={isImporting || !data || data.lotteries.length === 0}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center gap-2 shadow-sm transition disabled:opacity-50"
              title={`Import ${data?.matchedCount || 0} official lotteries directly into sheet for ${targetDateIso}`}
            >
              <DownloadCloud className={`w-3.5 h-3.5 ${isImporting ? 'animate-bounce' : ''}`} />
              <span>{isImporting ? 'Importing...' : `Import All ${data?.matchedCount || 0} into Editor (${targetDateIso})`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero / Filter / Status Bar */}
      <div className="bg-slate-900 border-b border-slate-800/80 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Board Selector Filter */}
            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => handleBoardChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedBoard === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>All Boards (18 Lotteries)</span>
              </button>
              <button
                type="button"
                onClick={() => handleBoardChange('dlb')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedBoard === 'dlb'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-sky-400" />
                <span>DLB Official (9)</span>
              </button>
              <button
                type="button"
                onClick={() => handleBoardChange('nlb')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedBoard === 'nlb'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-indigo-400" />
                <span>NLB Official (9)</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>Draw Date:</span>
              <strong className="text-white font-bold">{data?.drawDate || 'Loading...'}</strong>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Matched Lotteries:</span>
              <strong className="text-emerald-400 font-bold">{data?.matchedCount || 0} / {data?.totalLotteries || 0}</strong>
            </div>

            {data?.handshakeDetails && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-800">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Response Time:</span>
                <strong className="text-slate-200">{data.handshakeDetails.responseTimeMs}ms</strong>
              </div>
            )}
          </div>

          {/* Search filter */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search lottery name, draw, or board..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 w-full md:w-64"
            />
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-slate-800 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
                activeTab === 'cards'
                  ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official Result Cards ({filteredLotteries.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
                activeTab === 'comparison'
                  ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sheet Mapping (18 Standard Rows)</span>
            </button>
            <button
              onClick={() => setActiveTab('inspector')}
              className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
                activeTab === 'inspector'
                  ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Mechanism & JSON Inspector</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyJson}
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-850 px-2.5 py-1 rounded-md border border-slate-700/60 transition"
          >
            {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedJson ? 'Copied JSON!' : 'Copy JSON'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">Failed to connect to official sources</div>
              <p className="text-xs text-red-300/90 mt-0.5">{error}</p>
              <button
                onClick={() => fetchResults(selectedBoard)}
                className="mt-2 text-xs font-bold px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded-md transition"
              >
                Retry Fetch
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Visual Result Cards */}
        {activeTab === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading && !data ? (
              Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-28 h-5 bg-slate-800 rounded"></div>
                    <div className="w-16 h-5 bg-slate-800 rounded"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-slate-800"></div>
                    <div className="w-10 h-10 rounded-full bg-slate-800"></div>
                    <div className="w-10 h-10 rounded-full bg-slate-800"></div>
                  </div>
                </div>
              ))
            ) : filteredLotteries.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-500 text-sm">
                No matching lottery results found.
              </div>
            ) : (
              filteredLotteries.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition flex flex-col justify-between gap-4 shadow-lg group hover:shadow-blue-900/10"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {item.logoUrl ? (
                          <img 
                            src={item.logoUrl} 
                            alt={item.officialName} 
                            className="w-8 h-8 object-contain rounded-md bg-white/5 p-0.5 border border-white/10"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : null}
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-extrabold text-base text-white tracking-tight">
                              {item.lotteryNameSi || item.officialName}
                            </h3>
                            <span className="text-[11px] text-slate-400 font-medium">
                              ({item.officialName})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Draw No: <strong className="text-white font-mono">{item.drawNo}</strong>
                          </div>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                        item.board === 'DLB'
                          ? 'bg-sky-950/80 border-sky-800 text-sky-300'
                          : 'bg-indigo-950/80 border-indigo-800 text-indigo-300'
                      }`}>
                        {item.board} Official
                      </span>
                    </div>

                    {/* Results Balls Display */}
                    <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                      {/* Letter Ball */}
                      {item.letter && (
                        <div 
                          className="w-9 h-9 rounded-full bg-gradient-to-b from-blue-500 to-blue-700 text-white font-extrabold text-sm flex items-center justify-center shadow-md shadow-blue-500/20 ring-2 ring-blue-400/40 shrink-0"
                          title={`Letter: ${item.letter}`}
                        >
                          {item.letter}
                        </div>
                      )}

                      {/* Zodiac Sign Badge */}
                      {(item.zodiacEn || item.zodiacSi) && (
                        <div 
                          className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-900/80 to-purple-900/80 border border-indigo-700 text-indigo-200 font-bold text-xs flex items-center gap-1.5 shadow-sm shrink-0"
                          title={`Zodiac: ${item.zodiacEn} (${item.zodiacSi || ''})`}
                        >
                          <span className="text-amber-300 text-sm">{item.zodiacSymbol || '♈'}</span>
                          <span>{item.zodiacSi || item.zodiacEn}</span>
                          <span className="text-[10px] text-indigo-300/80">({item.zodiacEn})</span>
                        </div>
                      )}

                      {/* Regular Number Balls (Authentic Yellow Balls) */}
                      {item.numbers.map((num, nIdx) => (
                        <div 
                          key={nIdx}
                          className="w-9 h-9 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-md shadow-amber-500/20 ring-1 ring-amber-200/60 shrink-0"
                        >
                          {num}
                        </div>
                      ))}

                      {/* Super / Special Number (Red / Boxed Ball) */}
                      {item.superNumber && (
                        <div 
                          className="w-9 h-9 rounded-full bg-gradient-to-b from-rose-500 to-red-700 text-white font-extrabold text-sm flex items-center justify-center shadow-md shadow-rose-600/30 ring-2 ring-rose-400/50 shrink-0"
                          title={`Special / Boxed Number: [${item.superNumber}]`}
                        >
                          [{item.superNumber}]
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Match Status */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Standard Row: </span>
                      <strong className="text-slate-200">
                        {item.matchedLotteryId ? item.matchedLotteryId : 'Unmapped'}
                      </strong>
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono">
                      {item.drawDate}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: System Mapping & Comparison */}
        {activeTab === 'comparison' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/80">
              <div>
                <h3 className="font-bold text-sm text-white">Daily Sheet Mapping Overview</h3>
                <p className="text-xs text-slate-400">
                  Showing how official NLB and DLB results connect to the 18 standard rows on the A4 landscape sheet.
                </p>
              </div>
              <button
                type="button"
                onClick={handleImportToEditor}
                disabled={isImporting || !data || data.lotteries.length === 0}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Import All {data?.matchedCount || 0} into Editor Sheet</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Board</th>
                    <th className="py-3 px-4">Official Lottery</th>
                    <th className="py-3 px-4">System ID</th>
                    <th className="py-3 px-4">Draw No</th>
                    <th className="py-3 px-4">Letter / Zodiac</th>
                    <th className="py-3 px-4">Winning Numbers</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  {filteredLotteries.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/50 transition">
                      <td className="py-3 px-4 text-slate-500 font-bold">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.board === 'DLB'
                            ? 'bg-sky-950 text-sky-400 border border-sky-800'
                            : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                        }`}>
                          {item.board}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-white">
                        {item.lotteryNameSi || item.officialName}
                        <span className="block text-[11px] text-slate-400 font-normal font-sans">
                          {item.officialName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-semibold text-[11px]">
                          {item.matchedLotteryId || 'unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-200">{item.drawNo}</td>
                      <td className="py-3 px-4">
                        {item.letter ? (
                          <span className="px-2 py-0.5 rounded bg-blue-900/60 border border-blue-700 text-blue-200 font-bold">
                            {item.letter}
                          </span>
                        ) : item.zodiacSi ? (
                          <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-700 text-purple-200 font-bold font-sans">
                            {item.zodiacSymbol} {item.zodiacSi} ({item.zodiacEn})
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.numbers.map((n, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                              {n}
                            </span>
                          ))}
                          {item.superNumber && (
                            <span className="px-1.5 py-0.5 rounded bg-red-900/80 border border-red-700 text-red-200 font-bold">
                              [{item.superNumber}]
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center gap-1 w-fit">
                          <CheckCheck className="w-3 h-3" />
                          Ready
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Mechanism & JSON Inspector */}
        {activeTab === 'inspector' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Handshake Details */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-sm text-white">Official Scraper Mechanisms</h3>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <div className="text-sky-400 font-bold">// DLB Endpoint (Development Lotteries Board)</div>
                  <div className="text-slate-300">GET https://www.dlb.lk/result/2/</div>
                  <div className="text-slate-400">Direct HTTP extraction (no cookies required, 9 lotteries)</div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <div className="text-indigo-400 font-bold">// NLB Endpoint (National Lotteries Board)</div>
                  <div className="text-slate-300">GET https://www.nlb.lk/results</div>
                  <div className="text-slate-400">2-step cookie handshake bypass (9 lotteries)</div>
                </div>

                <p>
                  Together, the combined scraper extracts all <strong>18 standard Sri Lankan lotteries</strong> concurrently in approximately <strong>{data?.handshakeDetails?.responseTimeMs || 0}ms</strong> directly from the respective government board servers.
                </p>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-400">
                  <span className="font-bold text-white block mb-1">Extraction Summary:</span>
                  <div>• Total Lotteries Found: <strong>{data?.totalLotteries || 0}</strong></div>
                  <div>• Successfully Matched to 18 Standard Rows: <strong>{data?.matchedCount || 0}</strong></div>
                  <div>• Active Boards: <strong>{data?.boards?.join(' + ') || 'NLB + DLB'}</strong></div>
                </div>
              </div>
            </div>

            {/* Raw JSON Data Viewer */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm text-white">Extracted JSON Payload</h3>
                  </div>
                  <button
                    onClick={handleCopyJson}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                  >
                    {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedJson ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <pre className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-emerald-400 border border-slate-800 h-96 overflow-auto">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/80 px-4 py-4 text-center text-xs text-slate-500">
        Sinhala Daily Lottery Result Sheet Generator • Official Data Fetcher Laboratory (NLB & DLB)
      </footer>
    </div>
  );
}
