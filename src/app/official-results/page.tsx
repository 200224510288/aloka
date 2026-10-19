'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Globe, 
  RefreshCw, 
  CheckCircle2, 
  ArrowLeft, 
  Copy, 
  Check, 
  Terminal, 
  Layers, 
  Calendar, 
  Search,
  Building,
  CheckCheck,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Info,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { OfficialFetchResponse, OfficialFetchedLottery } from '@/lib/official-lottery-fetcher';

export default function OfficialResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<OfficialFetchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<'all' | 'dlb' | 'nlb'>('all');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cards' | 'table' | 'inspector'>('cards');
  const [copiedJson, setCopiedJson] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch results from the API
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
    const parts = dateStr.split(/[\s,]+/);
    let foundMonth = '10';
    let foundDay = '18';
    let foundYear = '2026';
    for (const p of parts) {
      const low = p.toLowerCase();
      if (monthMap[low]) foundMonth = monthMap[low];
      else if (/^\d{1,2}$/.test(p) && parseInt(p) <= 31) foundDay = p.padStart(2, '0');
      else if (/^\d{4}$/.test(p)) foundYear = p;
    }
    return `${foundYear}-${foundMonth}-${foundDay}`;
  };

  const targetDateIso = getIsoDate(data?.drawDate);

  // Filter lotteries by board and search query
  const filteredLotteries = useMemo(() => {
    if (!data?.lotteries) return [];
    return data.lotteries.filter(item => {
      const matchesSearch = !searchTerm.trim() || 
        item.officialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.lotteryNameSi && item.lotteryNameSi.includes(searchTerm)) ||
        (item.lotteryNameEn && item.lotteryNameEn.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.matchedLotteryId && item.matchedLotteryId.includes(searchTerm.toLowerCase())) ||
        item.drawNo.includes(searchTerm);

      return matchesSearch;
    });
  }, [data, searchTerm]);

  const nlbCount = data?.lotteries.filter(l => l.board === 'NLB').length || 0;
  const dlbCount = data?.lotteries.filter(l => l.board === 'DLB').length || 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              href={`/editor?date=${targetDateIso}`}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200/80"
              title="Return to Sheet Editor"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-sm shadow-blue-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5 text-blue-100" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Official Government Lottery Results
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <span>National Lotteries Board (nlb.lk) &amp; Development Lotteries Board (dlb.lk)</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchResults(selectedBoard)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 active:scale-95 text-slate-700 hover:text-slate-900 flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Fetching...' : 'Refresh Live'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyJson}
              disabled={!data}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
              title="Copy JSON Payload"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedJson ? 'Copied' : 'JSON'}</span>
            </button>

            <Link
              href={`/editor?date=${targetDateIso}`}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center gap-1.5 shadow-sm transition"
            >
              <span>Back to Editor</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Stats & Info Banner */}
      <section className="bg-gradient-to-b from-white to-slate-50/70 border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Metric 1 */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Fetched</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 font-mono">{data?.totalLotteries || 0}</span>
                <span className="text-xs font-bold text-slate-400">/ 18 standard</span>
              </div>
            </div>

            {/* Metric 2: NLB */}
            <div className="bg-white rounded-xl p-3.5 border border-indigo-100 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">NLB Official</span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-950 font-mono">{nlbCount}</span>
                <span className="text-xs font-medium text-indigo-600">nlb.lk results</span>
              </div>
            </div>

            {/* Metric 3: DLB */}
            <div className="bg-white rounded-xl p-3.5 border border-sky-100 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">DLB Official</span>
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-sky-950 font-mono">{dlbCount}</span>
                <span className="text-xs font-medium text-sky-600">dlb.lk/result/2</span>
              </div>
            </div>

            {/* Metric 4: Date */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Official Draw Date</span>
              <div className="mt-1 flex items-center gap-1.5 text-slate-800 font-bold text-sm truncate">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">{data?.drawDate || 'Loading...'}</span>
              </div>
            </div>
          </div>

          {/* Controls Bar: Filter + Search + View Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            {/* Board Selector Tabs */}
            <div className="inline-flex rounded-xl bg-slate-200/80 p-1 border border-slate-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleBoardChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedBoard === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>All Boards ({data?.totalLotteries || 18})</span>
              </button>
              <button
                type="button"
                onClick={() => handleBoardChange('nlb')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedBoard === 'nlb'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-indigo-600" />
                <span>NLB ({nlbCount})</span>
              </button>
              <button
                type="button"
                onClick={() => handleBoardChange('dlb')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedBoard === 'dlb'
                    ? 'bg-white text-sky-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-sky-600" />
                <span>DLB ({dlbCount})</span>
              </button>
            </div>

            {/* Search Input & View Switch */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by name or draw..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs font-sans transition"
                />
              </div>

              {/* View Switch */}
              <div className="inline-flex rounded-xl bg-slate-200/80 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('cards')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Card View"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden md:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('table')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Mapping Table View"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden md:inline">Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('inspector')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'inspector' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Handshake Inspector View"
                >
                  <Terminal className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden md:inline">JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <Info className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Fetch Error</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-800">Fetching live results from Government Portals...</h3>
            <p className="text-xs text-slate-500 mt-1">
              Establishing authenticated session handshake with nlb.lk and dlb.lk
            </p>
          </div>
        )}

        {/* Tab 1: Professional Light Visual Cards */}
        {!isLoading && activeTab === 'cards' && (
          <div>
            {filteredLotteries.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No lotteries found matching &quot;{searchTerm}&quot;</p>
                <p className="text-xs text-slate-500 mt-1">Try clearing the search filter or switching board tabs.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredLotteries.map((item, idx) => {
                  const isNlb = item.board === 'NLB';
                  const isTiered = item.matchedLotteryId === 'ada_sampatha' || item.matchedLotteryId === 'jaya_sampatha';

                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-300 p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                    >
                      {/* Card Header */}
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {item.logoUrl ? (
                              <img
                                src={item.logoUrl}
                                alt={item.officialName}
                                className="w-10 h-10 object-contain rounded-lg border border-slate-100 bg-slate-50 p-0.5 shrink-0"
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                                isNlb
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                  : 'bg-sky-50 border-sky-200 text-sky-700'
                              }`}>
                                {item.board}
                              </div>
                            )}

                            <div>
                              <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition leading-tight">
                                {item.lotteryNameSi || item.officialName}
                              </h3>
                              <span className="text-xs text-slate-500 font-medium block">
                                {item.officialName}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                            isNlb
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              : 'bg-sky-50 border-sky-200 text-sky-700'
                          }`}>
                            {item.board} Official
                          </span>
                        </div>

                        {/* Meta: Draw No & Draw Date */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <div>
                            <span>Draw No: </span>
                            <strong className="text-slate-900 font-mono font-bold">{item.drawNo}</strong>
                          </div>
                          <span className="text-[11px] text-slate-400">{item.drawDate}</span>
                        </div>
                      </div>

                      {/* Results Balls Area */}
                      <div className="my-4 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                        {isTiered ? (
                          /* Tiered Presentation for Ada Sampatha & Jaya Sampatha */
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                              Tiered Result (1 Row = 1 Number):
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.numbers.map((tierNum, tIdx) => (
                                <React.Fragment key={tIdx}>
                                  {tIdx > 0 && <span className="text-slate-400 font-black text-sm px-0.5">/</span>}
                                  <div className="px-2.5 py-1 rounded-lg bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-slate-950 font-black text-sm font-mono shadow-xs border border-amber-400/80">
                                    {tierNum}
                                  </div>
                                </React.Fragment>
                              ))}

                              {item.letter && (
                                <>
                                  <span className="text-slate-400 font-black text-sm px-0.5">/</span>
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-b from-blue-500 to-blue-700 text-white font-black text-sm flex items-center justify-center shadow-xs border border-blue-600">
                                    {item.letter}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Regular Lottery Balls Presentation */
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Letter Ball */}
                            {item.letter && (
                              <div
                                className="w-9 h-9 rounded-full bg-gradient-to-b from-blue-600 to-blue-700 text-white font-extrabold text-sm flex items-center justify-center shadow-sm shadow-blue-500/20 ring-2 ring-blue-300/40 shrink-0"
                                title={`Letter: ${item.letter}`}
                              >
                                {item.letter}
                              </div>
                            )}

                            {/* Zodiac Sign Badge */}
                            {(item.zodiacEn || item.zodiacSi) && (
                              <div
                                className="px-2.5 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs shrink-0"
                                title={`Zodiac: ${item.zodiacEn} (${item.zodiacSi || ''})`}
                              >
                                <span className="text-purple-600 text-sm">{item.zodiacSymbol || '♈'}</span>
                                <span>{item.zodiacSi || item.zodiacEn}</span>
                                <span className="text-[10px] text-purple-600/80">({item.zodiacEn})</span>
                              </div>
                            )}

                            {/* Super / Special Number Ball (Red) e.g. Mega Power, Kapruka */}
                            {item.superNumber && (
                              <div
                                className="w-9 h-9 rounded-full bg-gradient-to-b from-rose-500 to-red-600 text-white font-extrabold text-sm flex items-center justify-center shadow-sm shadow-rose-500/20 ring-2 ring-rose-300/50 shrink-0"
                                title={`Super / Special Boxed Number: [${item.superNumber}]`}
                              >
                                {item.superNumber}
                              </div>
                            )}

                            {/* Regular Number Balls (Golden Amber) */}
                            {item.numbers.map((num, nIdx) => (
                              <div
                                key={nIdx}
                                className="w-9 h-9 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-xs ring-1 ring-amber-400/50 shrink-0 font-mono"
                              >
                                {num}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          #{item.matchedLotteryId || 'unmatched'}
                        </span>

                        <span className="flex items-center gap-1 text-emerald-600 font-bold">
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Official Match</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Standard Daily Sheet Mapping Table (Light Theme) */}
        {!isLoading && activeTab === 'table' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Standard Daily Sheet Mapping Overview</h3>
                <p className="text-xs text-slate-500">
                  Showing how official NLB and DLB government results align with the 18 standard rows on the print sheet.
                </p>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Reference Only • Dual-verification is run in Editor after file upload</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Board</th>
                    <th className="py-3 px-4">Official Lottery</th>
                    <th className="py-3 px-4">System ID</th>
                    <th className="py-3 px-4">Draw No</th>
                    <th className="py-3 px-4">Letter / Zodiac</th>
                    <th className="py-3 px-4">Official Numbers</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredLotteries.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.board === 'DLB'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {item.board}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">
                        {item.lotteryNameSi || item.officialName}
                        <span className="block text-[11px] text-slate-400 font-normal font-sans">
                          {item.officialName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-blue-700 font-semibold text-[11px]">
                          {item.matchedLotteryId || 'unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{item.drawNo}</td>
                      <td className="py-3 px-4">
                        {item.letter ? (
                          <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800 font-bold">
                            {item.letter}
                          </span>
                        ) : item.zodiacSi ? (
                          <span className="px-2 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-800 font-bold font-sans">
                            {item.zodiacSymbol} {item.zodiacSi} ({item.zodiacEn})
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.superNumber && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 border border-rose-300 text-rose-800 font-bold">
                              [{item.superNumber}]
                            </span>
                          )}
                          {item.numbers.map((n, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 text-amber-900 font-bold">
                              {n}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1 w-fit">
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

        {/* Tab 3: Handshake & JSON Inspector (Light Theme) */}
        {!isLoading && activeTab === 'inspector' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Handshake Metadata Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Terminal className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Government Portal Connection Status</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Source URLs:</span>
                  <span className="font-mono text-slate-800 font-bold truncate max-w-xs">nlb.lk/results &amp; dlb.lk/result/2/</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Session Handshake Cookie:</span>
                  <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate max-w-[200px]">
                    {data?.handshakeDetails?.humanToken ? `human=${data.handshakeDetails.humanToken}` : 'Direct HTTP Auth'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Response Latency:</span>
                  <span className="font-mono text-blue-700 font-bold">
                    {data?.handshakeDetails?.responseTimeMs || 0} ms
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Payload Size:</span>
                  <span className="font-mono text-slate-700 font-bold">
                    {((data?.handshakeDetails?.htmlLength || 0) / 1024).toFixed(1)} KB HTML
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Fetched Timestamp:</span>
                  <span className="font-mono text-slate-700">{data?.fetchedAt}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-800">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  Dual Verification Architecture
                </p>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  The system fetches directly from the official portals without browser emulation overhead. In the Editor, after file upload, Dual AI Verification cross-references extracted numbers against both your uploaded paper and these official results.
                </p>
              </div>
            </div>

            {/* JSON Code Viewer Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-600" />
                  Raw JSON Payload
                </span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJson ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre className="flex-1 bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-auto max-h-[460px] leading-relaxed">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
