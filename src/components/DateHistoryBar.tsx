'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Cloud, 
  ChevronDown, 
  ChevronUp,
  FileCheck2,
  CalendarDays
} from 'lucide-react';
import { DAYS_OF_WEEK_SI } from '@/lib/constants';

interface DateHistoryBarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onQuickPrint: (date: string) => void;
  availableDates?: string[];
  cloudStatus?: 'synced' | 'syncing' | 'offline' | 'permission_denied';
  className?: string;
}

const MONTH_NAMES_SI = [
  'ජනවාරි', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි',
  'ජූලි', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝබර්', 'නොවැම්බර්', 'දෙසැම්බර්'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_HEADER_SI = ['ඉ', 'ස', 'අ', 'බ', 'බ්‍ර', 'සි', 'සෙ'];

export const DateHistoryBar: React.FC<DateHistoryBarProps> = ({
  selectedDate,
  onDateChange,
  onQuickPrint,
  availableDates = [],
  cloudStatus = 'synced',
  className = '',
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Month navigation for interactive calendar
  const [calendarView, setCalendarView] = useState(() => {
    const d = new Date(selectedDate || Date.now());
    const valid = !isNaN(d.getTime());
    return {
      year: valid ? d.getFullYear() : new Date().getFullYear(),
      month: valid ? d.getMonth() : new Date().getMonth()
    };
  });

  // Calculate past 4-5 days (Today, Yesterday, -2d, -3d, -4d)
  const pastDays = useMemo(() => {
    const days = [];
    const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i <= 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayIdx = d.getDay();

      let relativeLabel = '';
      if (i === 0) relativeLabel = 'Today (අද)';
      else if (i === 1) relativeLabel = 'Yesterday (ඊයේ)';
      else relativeLabel = `${i} Days Ago (දින ${i}කට පෙර)`;

      // Check if data is already available for this date
      const hasData = availableDates.includes(dateStr);

      days.push({
        date: dateStr,
        daySi: DAYS_OF_WEEK_SI[dayIdx] || 'සඳුදා',
        dayEn: DAYS_EN[dayIdx],
        relativeLabel,
        hasData,
        isToday: i === 0,
        isYesterday: i === 1,
      });
    }
    return days;
  }, [availableDates]);

  // Calendar cells generation for selected month
  const calendarDays = useMemo(() => {
    const { year, month } = calendarView;
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean; hasData: boolean; isToday: boolean; isSelected: boolean }[] = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        hasData: availableDates.includes(dateStr),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: true,
        hasData: availableDates.includes(dateStr),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
      });
    }

    // Next month padding to fill grid to full weeks (35 or 42 cells)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        hasData: availableDates.includes(dateStr),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
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

  return (
    <section className={`bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs space-y-3 ${className}`}>
      
      {/* Top Header: Title, Calendar Toggle & Cloud Status */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold text-slate-800 tracking-tight">
                Quick History & 4-Day Print Hub
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-sinhala">
                පසුගිය දින 4 ඉක්මන් මුද්‍රණය
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-none mt-0.5">
              Click any day to load results instantly, or use 1-Click Quick Print.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cloud Auto-Save Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium">
            <Cloud className={`w-3.5 h-3.5 ${
              cloudStatus === 'synced' ? 'text-emerald-500' :
              cloudStatus === 'syncing' ? 'text-blue-500 animate-spin' :
              'text-slate-400'
            }`} />
            <span>
              {cloudStatus === 'synced' ? 'Cloud Synced (ස්වයංක්‍රීයව සුරැකේ)' :
               cloudStatus === 'syncing' ? 'Saving to Cloud...' : 'Local Cache Active'}
            </span>
          </div>

          {/* Calendar View Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
              isCalendarOpen 
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendar (කැලැන්ඩරය)</span>
            {isCalendarOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 4-5 Days Back Quick Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {pastDays.map((item) => {
          const isSelected = item.date === selectedDate;

          return (
            <div
              key={item.date}
              className={`relative rounded-xl p-2.5 transition-all flex flex-col justify-between border ${
                isSelected
                  ? 'bg-blue-50/80 border-blue-400 shadow-sm ring-2 ring-blue-500/20'
                  : 'bg-slate-50/70 hover:bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* Click area to select date */}
              <div 
                onClick={() => onDateChange(item.date)}
                className="cursor-pointer space-y-1 mb-2"
                title={`Click to load sheet for ${item.date}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}>
                    {item.relativeLabel.split(' ')[0]}
                  </span>
                  
                  {item.hasData ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/90 px-1 py-0.5 rounded flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Empty</span>
                  )}
                </div>

                <div className="pt-0.5">
                  <div className="text-xs font-black text-slate-900 font-mono tracking-tight">
                    {item.date}
                  </div>
                  <div className="text-[11px] font-bold text-blue-900 font-sinhala leading-tight">
                    {item.daySi} <span className="text-[10px] text-slate-500 font-sans font-normal">({item.dayEn})</span>
                  </div>
                </div>
              </div>

              {/* 1-Click Quick Print Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickPrint(item.date);
                }}
                className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs ${
                  isSelected
                    ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 hover:border-slate-300'
                }`}
                title={`1-Click direct print for ${item.date} (${item.daySi})`}
              >
                <Printer className="w-3 h-3 text-emerald-600" />
                <span>Quick Print</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Interactive Expandable Calendar Drawer */}
      {isCalendarOpen && (
        <div className="mt-3 pt-3 border-t border-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 max-w-xl mx-auto">
            
            {/* Month & Year Navigation Bar */}
            <div className="flex items-center justify-between mb-3 px-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-white text-slate-600 border border-transparent hover:border-slate-200 transition cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className="text-xs font-extrabold text-slate-900 font-sinhala">
                  {MONTH_NAMES_SI[calendarView.month]} {calendarView.year}
                </span>
                <span className="text-[11px] text-slate-500 font-sans font-medium ml-1.5">
                  ({MONTH_NAMES_EN[calendarView.month]})
                </span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-white text-slate-600 border border-transparent hover:border-slate-200 transition cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAYS_HEADER_SI.map((dayName, idx) => (
                <div key={idx} className="text-[11px] font-bold text-slate-500 font-sinhala py-0.5">
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar Days 7-Column Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cell, idx) => {
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onDateChange(cell.dateStr);
                    }}
                    className={`py-1.5 px-1 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition cursor-pointer relative ${
                      cell.isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : cell.isCurrentMonth
                          ? 'bg-white hover:bg-blue-50 text-slate-800 border border-slate-200/80 hover:border-blue-300'
                          : 'bg-transparent text-slate-400 hover:text-slate-600'
                    } ${cell.isToday && !cell.isSelected ? 'ring-1.5 ring-blue-500 font-bold' : ''}`}
                    title={`${cell.dateStr} ${cell.hasData ? '(Has Saved Results)' : ''}`}
                  >
                    <span>{cell.dayNum}</span>
                    
                    {/* Green dot indicator for days with saved sheets */}
                    {cell.hasData && (
                      <span className={`w-1 h-1 rounded-full mt-0.5 ${
                        cell.isSelected ? 'bg-white' : 'bg-emerald-500'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Navigation Shortcuts */}
            <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-200/70 text-[11px]">
              <div className="flex items-center gap-1 text-slate-500">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                <span>Green dot = Results saved / Available</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={jumpToYesterday}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold cursor-pointer"
                >
                  Yesterday (ඊයේ)
                </button>
                <button
                  type="button"
                  onClick={jumpToToday}
                  className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold cursor-pointer"
                >
                  Today (අද)
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </section>
  );
};

export default DateHistoryBar;
