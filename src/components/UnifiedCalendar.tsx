'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2, 
  Sparkles, 
  Clock,
  Zap
} from 'lucide-react';
import { DAYS_OF_WEEK_SI } from '@/lib/constants';

interface UnifiedCalendarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onQuickPrint?: (date: string) => void;
  availableDates?: string[];
  cloudStatus?: 'synced' | 'syncing' | 'offline' | 'permission_denied';
  className?: string;
  isLoading?: boolean;
  defaultExpanded?: boolean;
}

const MONTH_NAMES_SI = [
  'ජනවාරි', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි',
  'ජූලි', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝබර්', 'නොවැම්බර්', 'දෙසැම්බර්'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_HEADER = [
  { si: 'ඉරිදා', shortSi: 'ඉරි', en: 'Sun' },
  { si: 'සඳුදා', shortSi: 'සඳු', en: 'Mon' },
  { si: 'අඟහරුවාදා', shortSi: 'අඟ', en: 'Tue' },
  { si: 'බදාදා', shortSi: 'බදා', en: 'Wed' },
  { si: 'බ්‍රහස්පතින්දා', shortSi: 'බ්‍රහ', en: 'Thu' },
  { si: 'සිකුරාදා', shortSi: 'සිකු', en: 'Fri' },
  { si: 'සෙනසුරාදා', shortSi: 'සෙන', en: 'Sat' },
];

export const UnifiedCalendar: React.FC<UnifiedCalendarProps> = ({
  selectedDate,
  onDateChange,
  onQuickPrint,
  availableDates = [],
  cloudStatus = 'synced',
  className = '',
  isLoading = false,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Month & year navigation
  const [calendarView, setCalendarView] = useState(() => {
    const d = new Date(selectedDate || Date.now());
    const valid = !isNaN(d.getTime());
    return {
      year: valid ? d.getFullYear() : new Date().getFullYear(),
      month: valid ? d.getMonth() : new Date().getMonth(),
    };
  });

  // Calculate day details for selected date
  const selectedDateDetails = useMemo(() => {
    const d = new Date(selectedDate);
    const valid = !isNaN(d.getTime());
    if (!valid) return { daySi: 'සඳුදා', dayEn: 'Mon', fullStr: selectedDate };
    const dayIdx = d.getDay();
    return {
      daySi: DAYS_OF_WEEK_SI[dayIdx] || 'සඳුදා',
      dayEn: DAYS_HEADER[dayIdx]?.en || 'Day',
      year: d.getFullYear(),
      monthSi: MONTH_NAMES_SI[d.getMonth()],
      monthEn: MONTH_NAMES_EN[d.getMonth()],
      dayNum: d.getDate(),
      fullStr: selectedDate,
      hasData: availableDates.includes(selectedDate),
    };
  }, [selectedDate, availableDates]);

  // Calendar cells generation for selected month
  const calendarDays = useMemo(() => {
    const { year, month } = calendarView;
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { 
      dateStr: string; 
      dayNum: number; 
      isCurrentMonth: boolean; 
      hasData: boolean; 
      isToday: boolean; 
      isSelected: boolean;
      dayOfWeekSi: string;
      dayOfWeekEn: string;
    }[] = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dObj = new Date(prevYear, prevMonth, dayNum);
      const dayIdx = dObj.getDay();

      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        hasData: availableDates.includes(dateStr),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        dayOfWeekSi: DAYS_OF_WEEK_SI[dayIdx] || '',
        dayOfWeekEn: DAYS_HEADER[dayIdx]?.en || '',
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dObj = new Date(year, month, d);
      const dayIdx = dObj.getDay();

      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        hasData: availableDates.includes(dateStr),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        dayOfWeekSi: DAYS_OF_WEEK_SI[dayIdx] || '',
        dayOfWeekEn: DAYS_HEADER[dayIdx]?.en || '',
      });
    }

    // Next month padding to fill complete weeks
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dObj = new Date(nextYear, nextMonth, d);
      const dayIdx = dObj.getDay();

      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        hasData: availableDates.includes(dateStr),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        dayOfWeekSi: DAYS_OF_WEEK_SI[dayIdx] || '',
        dayOfWeekEn: DAYS_HEADER[dayIdx]?.en || '',
      });
    }

    return cells;
  }, [calendarView, availableDates, selectedDate]);

  const handlePrevMonth = () => {
    setCalendarView(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 });
  };

  const handleNextMonth = () => {
    setCalendarView(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 });
  };

  const jumpToToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    onDateChange(todayStr);
    const d = new Date();
    setCalendarView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const jumpToYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yStr = d.toISOString().split('T')[0];
    onDateChange(yStr);
    setCalendarView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const stepDate = (offset: number) => {
    const d = new Date(selectedDate);
    if (isNaN(d.getTime())) return;
    d.setDate(d.getDate() + offset);
    const str = d.toISOString().split('T')[0];
    onDateChange(str);
    setCalendarView({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <section 
      id="unified-lottery-calendar"
      className={`bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* ========================================================================= */}
      {/* Top Banner / Calendar Bar Header                                          */}
      {/* ========================================================================= */}
      <div className={`bg-slate-50/70 p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${isExpanded ? 'border-b border-slate-200' : ''}`}>
        
        {/* Left: Active Date Pill & Live Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">
                Draw Date • දින තේරීම:
              </span>
              <span className="text-sm font-black text-slate-900 font-mono tracking-tight bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                {selectedDate}
              </span>
              <span className="text-xs font-black text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md font-sinhala">
                {selectedDateDetails.daySi}
              </span>
              
              {/* Data readiness indicator */}
              {isLoading ? (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <Clock className="w-3 h-3" /> Updating Numbers...
                </span>
              ) : selectedDateDetails.hasData ? (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Results Ready
                </span>
              ) : (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  Empty Sheet
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
              {isExpanded 
                ? "Click any day on the calendar below to immediately load and edit that day's 18 lottery results."
                : "Choose date using quick buttons or click 'Show Calendar' for the full interactive monthly grid."}
            </p>
          </div>
        </div>

        {/* Right: Quick Action Buttons & Expand/Collapse Toggle */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
          
          {/* Day stepping shortcuts */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => stepDate(-1)}
              className="px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer flex items-center gap-0.5"
              title="Previous Day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <button
              type="button"
              onClick={() => stepDate(1)}
              className="px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer flex items-center gap-0.5"
              title="Next Day"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick jump to Yesterday (Most common for lotteries) */}
          <button
            type="button"
            onClick={jumpToYesterday}
            className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1"
            title="Jump to Yesterday's results"
          >
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span>Yesterday (ඊයේ)</span>
          </button>

          {/* Quick jump to Today */}
          <button
            type="button"
            onClick={jumpToToday}
            className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Jump to Today"
          >
            Today (අද)
          </button>

          {/* Quick Print CTA if callback provided */}
          {onQuickPrint && (
            <button
              type="button"
              onClick={() => onQuickPrint(selectedDate)}
              className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1"
              title={`Direct 1-click print for ${selectedDate}`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quick Print</span>
            </button>
          )}

          {/* Expand / Collapse Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition flex items-center gap-1 cursor-pointer"
            title={isExpanded ? 'Collapse calendar to save screen space' : 'Show full interactive calendar'}
          >
            <span>{isExpanded ? 'Hide Calendar' : 'Show Calendar'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* Big Interactive Calendar Grid                                             */}
      {/* ========================================================================= */}
      {isExpanded && (
        <div className="p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Month & Year Navigator */}
          <div className="flex items-center justify-between mb-4 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl hover:bg-white text-slate-700 border border-transparent hover:border-slate-200 hover:shadow-2xs transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous Month</span>
            </button>

            <div className="text-center">
              <span className="text-sm sm:text-base font-black text-slate-900 font-sinhala tracking-tight">
                {MONTH_NAMES_SI[calendarView.month]} {calendarView.year}
              </span>
              <span className="text-xs font-bold text-slate-500 font-sans ml-2">
                ({MONTH_NAMES_EN[calendarView.month]} {calendarView.year})
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl hover:bg-white text-slate-700 border border-transparent hover:border-slate-200 hover:shadow-2xs transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="Next Month"
            >
              <span className="hidden sm:inline">Next Month</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of the Week Header (7 Columns) */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center mb-2">
            {DAYS_HEADER.map((d, idx) => (
              <div 
                key={idx} 
                className="py-1.5 bg-slate-100/80 rounded-lg text-slate-700 border border-slate-200/60"
              >
                <div className="text-[11px] sm:text-xs font-black font-sinhala leading-tight">
                  {d.shortSi}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 font-sans">
                  {d.en}
                </div>
              </div>
            ))}
          </div>

          {/* Calendar Date Cells (Big, User-Friendly Click Targets) */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((cell, idx) => {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onDateChange(cell.dateStr)}
                  className={`min-h-[58px] sm:min-h-[64px] p-1.5 sm:p-2 rounded-xl transition-all duration-150 flex flex-col justify-between items-center relative cursor-pointer border ${
                    cell.isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-blue-500 scale-[1.02] z-10'
                      : cell.isCurrentMonth
                        ? 'bg-white hover:bg-blue-50/60 text-slate-900 border-slate-200 hover:border-blue-300 shadow-2xs hover:shadow-xs'
                        : 'bg-slate-50/50 text-slate-400 border-slate-100 hover:text-slate-600'
                  } ${cell.isToday && !cell.isSelected ? 'ring-2 ring-blue-400 font-bold' : ''}`}
                  title={`${cell.dateStr} (${cell.dayOfWeekSi}) ${cell.hasData ? '• Results sheet available' : ''}`}
                >
                  {/* Top: Day number */}
                  <div className="flex items-center justify-between w-full px-1">
                    <span className={`text-xs sm:text-sm font-extrabold font-mono ${
                      cell.isSelected ? 'text-white' : cell.isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                    }`}>
                      {cell.dayNum}
                    </span>
                    
                    {cell.isToday && (
                      <span className={`text-[9px] font-extrabold px-1 rounded uppercase tracking-tighter ${
                        cell.isSelected ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                      }`}>
                        Today
                      </span>
                    )}
                  </div>

                  {/* Middle: Sinhala Day Initial */}
                  <span className={`text-[10px] font-bold font-sinhala leading-none ${
                    cell.isSelected ? 'text-slate-300' : 'text-slate-500'
                  }`}>
                    {cell.dayOfWeekSi.slice(0, 3)}
                  </span>

                  {/* Bottom: Data Ready Indicator */}
                  <div className="w-full flex items-center justify-center pt-0.5">
                    {cell.hasData ? (
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-1 ${
                        cell.isSelected 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                        <span className="hidden sm:inline">Ready</span>
                      </span>
                    ) : (
                      <span className="h-1.5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Legend & Status */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-200/80 text-[11px] text-slate-500">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span className="font-semibold text-slate-700">Green = Results Sheet Available</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-900 inline-block" />
                <span className="font-semibold text-slate-700">Navy = Selected Active Sheet</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded border-2 border-blue-400 inline-block" />
                <span className="font-semibold text-slate-700">Ring = Today</span>
              </div>
            </div>

            <div className="text-slate-600 font-medium">
              Active Date: <strong className="text-slate-900 font-mono">{selectedDate}</strong> ({selectedDateDetails.daySi})
            </div>
          </div>

        </div>
      )}
    </section>
  );
};

export default UnifiedCalendar;
