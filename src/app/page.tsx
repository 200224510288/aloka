'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { DailySheet, PreviewStyleOptions } from '@/types/lottery';
import { createEmptySheet, DAYS_OF_WEEK_SI, DEFAULT_STYLE_OPTIONS } from '@/lib/constants';
import { Header } from '@/components/Header';
import { SheetPreview } from '@/components/SheetPreview';
import { directPrintSheet } from '@/lib/direct-print';
import { 
  Printer, 
  FileDown, 
  CheckCircle2, 
  AlertTriangle, 
  Pencil,
  ArrowRight,
  Calendar,
  Cloud,
} from 'lucide-react';

function getYesterdayDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateShort(dateStr: string): { day: string; monthShort: string; weekday: string; weekdaySi: string } {
  const d = new Date(dateStr);
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return {
    day: String(d.getDate()),
    monthShort: MONTHS[d.getMonth()] || '',
    weekday: WEEKDAYS[d.getDay()] || '',
    weekdaySi: DAYS_OF_WEEK_SI[d.getDay()] || '',
  };
}

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<string>(() => getYesterdayDateStr());
  const [sheet, setSheet] = useState<DailySheet>(() => createEmptySheet(getYesterdayDateStr()));
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'syncing' | 'offline' | 'permission_denied'>('synced');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [printDensity, setPrintDensity] = useState<'eco' | 'high'>('eco');
  const [previewStyles, setPreviewStyles] = useState<PreviewStyleOptions | undefined>(undefined);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Past 4 days for quick access
  const pastDays = useMemo(() => {
    const days: { date: string; label: string; info: ReturnType<typeof formatDateShort>; hasData: boolean }[] = [];
    for (let i = 1; i <= 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      days.push({
        date: dateStr,
        label: i === 1 ? 'ඊයේ' : `දින ${i}`,
        info: formatDateShort(dateStr),
        hasData: availableDates.includes(dateStr),
      });
    }
    return days;
  }, [availableDates]);

  // Fetch sheet by date with triple redundancy (Cloud -> Local Server -> Browser LocalStorage)
  const loadSheet = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/sheet?date=${date}`);
      const data = await res.json();
      if (data.success && data.sheet) {
        setSheet(data.sheet);
        if (data.fromCloud) {
          setCloudStatus('synced');
        }
        if (data.availableDates && Array.isArray(data.availableDates)) {
          setAvailableDates(data.availableDates);
        }
        try {
          localStorage.setItem(`sinhala_lottery_sheet_${date}`, JSON.stringify(data.sheet));
        } catch {}
      } else {
        if (data.availableDates && Array.isArray(data.availableDates)) {
          setAvailableDates(data.availableDates);
        }
        try {
          const cached = localStorage.getItem(`sinhala_lottery_sheet_${date}`);
          if (cached) {
            setSheet(JSON.parse(cached));
            return;
          }
        } catch {}
        setSheet(createEmptySheet(date));
      }
    } catch (e) {
      console.error('Error loading sheet:', e);
      try {
        const cached = localStorage.getItem(`sinhala_lottery_sheet_${date}`);
        if (cached) {
          setSheet(JSON.parse(cached));
          return;
        }
      } catch {}
      setSheet(createEmptySheet(date));
    }
  }, []);

  // Check URL query parameter on mount or restore last active date
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const dateParam = params.get('date');
      if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        if (dateParam !== selectedDate) {
          setSelectedDate(dateParam);
        }
      } else {
        const savedDate = localStorage.getItem('sinhala_lottery_last_active_date');
        if (savedDate && /^\d{4}-\d{2}-\d{2}$/.test(savedDate) && savedDate !== selectedDate) {
          setSelectedDate(savedDate);
        }
      }
    }
  }, []);

  useEffect(() => {
    loadSheet(selectedDate);
  }, [selectedDate, loadSheet]);

  // Load Cloud default design on mount so staff preview & print match user's custom design
  useEffect(() => {
    async function loadCloudDesign() {
      try {
        const res = await fetch('/api/custom-designs');
        const data = await res.json();
        if (data.success && data.defaultDesignId && Array.isArray(data.designs)) {
          const defaultDesign = data.designs.find((d: any) => d.id === data.defaultDesignId);
          if (defaultDesign && defaultDesign.options) {
            setPreviewStyles(defaultDesign.options);
            if (defaultDesign.options.printDensity) {
              setPrintDensity(defaultDesign.options.printDensity);
            }
          }
        }
      } catch (err) {
        console.warn('Could not pre-fetch cloud design for staff page:', err);
      }
    }
    loadCloudDesign();
  }, []);

  // Handle date change
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const d = new Date(newDate);
    const dayIdx = isNaN(d.getDay()) ? 1 : d.getDay();
    const dayName = DAYS_OF_WEEK_SI[dayIdx] || 'සඳුදා';

    setSheet(prev => ({
      ...prev,
      date: newDate,
      dayOfWeekSi: dayName,
    }));

    if (typeof window !== 'undefined') {
      localStorage.setItem('sinhala_lottery_last_active_date', newDate);
      const url = new URL(window.location.href);
      url.searchParams.set('date', newDate);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Direct Native Print (Zero Popups)
  const handlePrint = (targetSheet: DailySheet = sheet) => {
    directPrintSheet(targetSheet, {
      styleOptions: previewStyles,
      onSuccess: () => showToast('මුද්‍රණ කවුළුව විවෘත විය (Print dialog opened)', 'success'),
      onError: (err) => showToast(err, 'error'),
    });
  };

  // 1-Click Quick Print
  const handleQuickPrint = async (targetDate: string) => {
    if (targetDate === selectedDate) {
      handlePrint(sheet);
      return;
    }

    handleDateChange(targetDate);
    try {
      const res = await fetch(`/api/sheet?date=${targetDate}`);
      const data = await res.json();
      if (data.success && data.sheet) {
        setSheet(data.sheet);
        handlePrint(data.sheet);
        return;
      }
    } catch (e) {
      console.warn('Quick print loading error:', e);
    }
    handlePrint();
  };

  // Direct PDF export
  const handleExportPdf = async (customStyles?: PreviewStyleOptions) => {
    setIsExporting(true);

    const activeStyles = customStyles || previewStyles || {};

    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sheet, 
          printDensity: activeStyles.printDensity || printDensity,
          styleOptions: activeStyles
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.isServerless) {
          showToast(errorData.error, 'info');
          handlePrint();
          return;
        }
        showToast(errorData.error || 'Export failed', 'error');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sinhala-Lottery-Sheet-${sheet.date}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      showToast('PDF downloaded!', 'success');
    } catch (e: any) {
      showToast(`Export error: ${e.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedInfo = formatDateShort(selectedDate);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      
      {/* Toast */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold text-white flex items-center gap-2 transition-all animate-in slide-in-from-bottom-2 ${
          notification.type === 'success' ? 'bg-[#15803d]' : notification.type === 'error' ? 'bg-red-700' : 'bg-slate-900'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <Header
        sheet={sheet}
        pageMode="print"
        cloudStatus={cloudStatus}
        onDateChange={handleDateChange}
        onUpdateSheet={setSheet}
        onExportPdf={handleExportPdf}
        exportBlockedErrors={[]}
        onPrint={() => handlePrint()}
        isExporting={isExporting}
      />

      {/* Main: Left Sidebar + Right Preview */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto p-3 sm:p-4 lg:p-5 flex flex-col lg:flex-row gap-4 items-stretch">
        
        {/* LEFT SIDEBAR — Clean & Minimal */}
        <aside className="w-full lg:w-[340px] xl:w-[360px] shrink-0 flex flex-col gap-3">
          
          {/* ── Selected Date Card ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            
            {/* Date Hero */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl font-black text-slate-900 font-mono tracking-tighter leading-none">
                    {selectedInfo.day}
                  </div>
                  <div className="text-sm font-bold text-slate-600 mt-0.5">
                    {selectedInfo.monthShort} · {selectedInfo.weekdaySi}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cloudStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                  <span className="text-[10px] font-semibold text-slate-500">
                    {cloudStatus === 'synced' ? 'Synced' : 'Syncing'}
                  </span>
                </div>
              </div>
            </div>

            {/* Print Button */}
            <div className="px-5 pb-4">
              <button
                type="button"
                onClick={() => handlePrint()}
                className="w-full py-3 text-[15px] font-black rounded-xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] cursor-pointer bg-[#15803d] hover:bg-[#166534] text-white shadow-sm"
              >
                <Printer className="w-5 h-5" />
                මුද්‍රණය කරන්න
              </button>
            </div>

            {/* Quick Actions Row */}
            <div className="px-5 pb-5 flex gap-2">
              <button
                type="button"
                onClick={() => handleExportPdf(previewStyles)}
                disabled={isExporting}
                className="flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition active:scale-[0.97] bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer border border-slate-200"
              >
                <FileDown className="w-3.5 h-3.5" />
                {isExporting ? 'Generating...' : 'PDF'}
              </button>

              <Link
                href={`/editor?date=${selectedDate}`}
                className="flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition active:scale-[0.97] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editor
              </Link>
            </div>

            {/* Date Picker */}
            <div className="px-5 pb-4 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="flex-1 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-slate-400 cursor-pointer"
              />
            </div>

          </div>

          {/* ── Past 4 Days Quick Print ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
              පසුගිය දින
            </div>
            <div className="space-y-1.5">
              {pastDays.map((item) => {
                const isActive = item.date === selectedDate;
                return (
                  <div
                    key={item.date}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-100 hover:border-slate-200'
                    }`}
                    onClick={() => handleDateChange(item.date)}
                  >
                    {/* Left: Date info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`text-lg font-black font-mono leading-none ${isActive ? 'text-white' : 'text-slate-900'}`}>
                        {item.info.day}
                      </div>
                      <div>
                        <div className={`text-xs font-bold leading-tight ${isActive ? 'text-white/90' : 'text-slate-700'}`}>
                          {item.info.weekdaySi}
                          <span className={`ml-1 text-[10px] font-normal ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                            {item.info.weekday}
                          </span>
                        </div>
                        <div className={`text-[10px] font-semibold ${isActive ? 'text-white/50' : 'text-slate-400'}`}>
                          {item.label}
                        </div>
                      </div>
                    </div>

                    {/* Right: Status + Print */}
                    <div className="flex items-center gap-2 shrink-0">
                      {item.hasData && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-emerald-500'}`} />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickPrint(item.date);
                        }}
                        className={`p-1.5 rounded-lg transition active:scale-90 cursor-pointer ${
                          isActive
                            ? 'bg-white/15 hover:bg-white/25 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                        title={`Print ${item.date}`}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </aside>

        {/* RIGHT: Live Preview */}
        <section className="flex-1 min-w-0 w-full bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden min-h-[750px] flex flex-col">
          <SheetPreview
            sheet={sheet}
            onExportPdf={handleExportPdf}
            onRequestPrint={() => handlePrint()}
            isExporting={isExporting}
            canExport={true}
            printDensity={printDensity}
            onDensityChange={setPrintDensity}
            currentStyles={previewStyles}
            onStylesChange={setPreviewStyles}
            showToast={showToast}
            hideLayoutControls={true}
          />
        </section>

      </main>

    </div>
  );
}

