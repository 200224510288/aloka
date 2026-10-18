'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DailySheet, PreviewStyleOptions } from '@/types/lottery';
import { createEmptySheet, DAYS_OF_WEEK_SI, DEFAULT_STYLE_OPTIONS } from '@/lib/constants';
import { Header } from '@/components/Header';
import { DateHistoryBar } from '@/components/DateHistoryBar';
import { SheetPreview } from '@/components/SheetPreview';
import PrintModal from '@/components/PrintModal';
import { 
  Printer, 
  FileDown, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CalendarDays
} from 'lucide-react';

function getYesterdayDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<string>(() => getYesterdayDateStr());
  const [sheet, setSheet] = useState<DailySheet>(() => createEmptySheet(getYesterdayDateStr()));
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'syncing' | 'offline' | 'permission_denied'>('synced');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printDensity, setPrintDensity] = useState<'eco' | 'high'>('eco');
  const [previewStyles, setPreviewStyles] = useState<PreviewStyleOptions | undefined>(undefined);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

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

  // 1-Click Quick Print from Calendar / 4-Day History Bar
  const handleQuickPrint = async (targetDate: string) => {
    if (targetDate === selectedDate) {
      setIsPrintModalOpen(true);
      return;
    }

    handleDateChange(targetDate);
    try {
      const res = await fetch(`/api/sheet?date=${targetDate}`);
      const data = await res.json();
      if (data.success && data.sheet) {
        setSheet(data.sheet);
      }
    } catch (e) {
      console.warn('Quick print loading error:', e);
    }
    setIsPrintModalOpen(true);
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
          setIsPrintModalOpen(true);
          return;
        }
        showToast(errorData.error || 'Export blocked by validation rules', 'error');
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

      showToast('PDF downloaded successfully!', 'success');
    } catch (e: any) {
      showToast(`Export error: ${e.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans text-slate-900">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold text-white flex items-center gap-2.5 transition-all transform animate-in slide-in-from-bottom-2 ${
          notification.type === 'success' ? 'bg-[#15803d]' : notification.type === 'error' ? 'bg-red-700' : 'bg-slate-900'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Global Staff Header */}
      <Header
        sheet={sheet}
        pageMode="print"
        cloudStatus={cloudStatus}
        onDateChange={handleDateChange}
        onUpdateSheet={setSheet}
        onExportPdf={handleExportPdf}
        exportBlockedErrors={[]}
        onPrint={() => setIsPrintModalOpen(true)}
        isExporting={isExporting}
      />

      {/* Main Content Area: Quick Access & Print Station */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 flex flex-col gap-4">
        
        {/* Quick Access: 4 Days Back History & Calendar */}
        <DateHistoryBar
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onQuickPrint={handleQuickPrint}
          availableDates={availableDates}
          cloudStatus={cloudStatus}
        />

        {/* Staff Quick Action Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-5 py-2.5 text-sm font-black rounded-xl shadow-sm flex items-center gap-2 transition active:scale-[0.98] cursor-pointer bg-[#15803d] hover:bg-[#166534] text-white"
              title="Open Print Dialog (Select copies and print)"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sheet (මුද්‍රණය කරන්න)</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportPdf(previewStyles)}
              disabled={isExporting}
              className="px-4 py-2.5 text-xs font-extrabold rounded-xl shadow-2xs flex items-center gap-1.5 transition active:scale-[0.98] bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-slate-700" />
              <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
          </div>

          {/* Quick link hint to Editor */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Staff Print Mode • Direct printing enabled</span>
            </div>

            <Link
              href={`/editor?date=${selectedDate}`}
              className="text-xs font-bold text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-600" />
              <span>Need to edit numbers or upload? Open Editor</span>
              <ArrowRight className="w-3 h-3 text-slate-600" />
            </Link>
          </div>
        </div>

        {/* Live A4 Print Sheet Preview Container */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden min-h-[700px] flex flex-col">
          <SheetPreview
            sheet={sheet}
            onExportPdf={handleExportPdf}
            onRequestPrint={() => setIsPrintModalOpen(true)}
            isExporting={isExporting}
            canExport={true}
            printDensity={printDensity}
            onDensityChange={setPrintDensity}
            currentStyles={previewStyles}
            onStylesChange={setPreviewStyles}
            showToast={showToast}
            hideLayoutControls={true}
          />
        </div>

      </main>

      {/* Direct Print Modal with Copies, Printer Preferences & Default Settings */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        sheet={sheet}
        styleOptions={previewStyles || DEFAULT_STYLE_OPTIONS}
        isReadyToExport={true}
        pendingCount={0}
        exportBlockedErrors={[]}
        onExportPdf={handleExportPdf}
        showToast={showToast}
      />

    </div>
  );
}
