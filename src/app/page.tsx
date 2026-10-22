'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { DailySheet, PreviewStyleOptions } from '@/types/lottery';
import { createEmptySheet, DAYS_OF_WEEK_SI, DEFAULT_STYLE_OPTIONS } from '@/lib/constants';
import { Header } from '@/components/Header';
import { SheetPreview } from '@/components/SheetPreview';
import { directPrintSheet } from '@/lib/direct-print';
import { RoleSelectModal } from '@/components/RoleSelectModal';
import { UserRole, getStoredUserRole, setStoredUserRole } from '@/lib/user-role';
import { runStaffOfficialAutomation, StaffAutomationState } from '@/lib/staff-automation';
import { 
  Printer, 
  FileDown, 
  CheckCircle2, 
  AlertTriangle, 
  Pencil,
  Calendar
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

function sanitizeSheet(s: DailySheet): DailySheet {
  if (s && s.footerAnnouncement && s.footerAnnouncement.includes('ගොවි සෙත රු. ලක්ෂ දෙකහමාරක්')) {
    return { ...s, footerAnnouncement: '' };
  }
  return s;
}

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<string>(() => getYesterdayDateStr());
  const [sheet, setSheet] = useState<DailySheet>(() => sanitizeSheet(createEmptySheet(getYesterdayDateStr())));
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'syncing' | 'offline' | 'permission_denied'>('synced');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [printDensity, setPrintDensity] = useState<'eco' | 'high'>('eco');
  const [previewStyles, setPreviewStyles] = useState<PreviewStyleOptions | undefined>(undefined);

  // Role Selection State
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);

  // Staff Automation State
  const [isAutomating, setIsAutomating] = useState<boolean>(false);
  const [automationState, setAutomationState] = useState<StaffAutomationState>({
    step: 'idle',
    progressPercent: 0,
    messageSi: '',
    messageEn: '',
    officialCount: 0,
    totalLotteries: 18,
  });
  const hasAutoRunForDateRef = useRef<Record<string, boolean>>({});

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
        const clean = sanitizeSheet(data.sheet);
        setSheet(clean);
        if (data.fromCloud) {
          setCloudStatus('synced');
        }
        if (data.availableDates && Array.isArray(data.availableDates)) {
          setAvailableDates(data.availableDates);
        }
        try {
          localStorage.setItem(`sinhala_lottery_sheet_${date}`, JSON.stringify(clean));
        } catch {}
      } else {
        if (data.availableDates && Array.isArray(data.availableDates)) {
          setAvailableDates(data.availableDates);
        }
        try {
          const cached = localStorage.getItem(`sinhala_lottery_sheet_${date}`);
          if (cached) {
            setSheet(sanitizeSheet(JSON.parse(cached)));
            return;
          }
        } catch {}
        setSheet(sanitizeSheet(createEmptySheet(date)));
      }
    } catch (e) {
      console.error('Error loading sheet:', e);
      try {
        const cached = localStorage.getItem(`sinhala_lottery_sheet_${date}`);
        if (cached) {
          setSheet(sanitizeSheet(JSON.parse(cached)));
          return;
        }
      } catch {}
      setSheet(sanitizeSheet(createEmptySheet(date)));
    }
  }, []);

  // Check URL query parameter on mount or restore last active date, and check user role
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = getStoredUserRole();
      setUserRole(storedRole);
      // If no role set yet, open role modal immediately on opening!
      if (!storedRole) {
        setIsRoleModalOpen(true);
      }

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

      const handleRoleChange = (e: any) => {
        if (e.detail?.role !== undefined) {
          setUserRole(e.detail.role);
        }
      };
      window.addEventListener('lottery_user_role_changed', handleRoleChange);
      return () => window.removeEventListener('lottery_user_role_changed', handleRoleChange);
    }
  }, []);

  useEffect(() => {
    loadSheet(selectedDate);
  }, [selectedDate, loadSheet]);

  // Real-time synchronization
  useEffect(() => {
    let unsubscribeCloud: (() => void) | undefined;
    import('@/lib/cloud-service').then(({ subscribeToCloudSheet }) => {
      unsubscribeCloud = subscribeToCloudSheet(selectedDate, (cloudSheet) => {
        if (cloudSheet && cloudSheet.lotteries && cloudSheet.lotteries.length > 0) {
          setSheet((prev) => {
            const prevStr = JSON.stringify(prev);
            const nextStr = JSON.stringify(cloudSheet);
            if (prevStr !== nextStr) {
              setCloudStatus('synced');
              return cloudSheet;
            }
            return prev;
          });
        }
      });
    });

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `sinhala_lottery_sheet_${selectedDate}` && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          setSheet(updated);
        } catch {}
      }
    };

    const handleCustomUpdate = (e: any) => {
      if (e.detail?.date === selectedDate) {
        try {
          const cached = localStorage.getItem(`sinhala_lottery_sheet_${selectedDate}`);
          if (cached) setSheet(JSON.parse(cached));
        } catch {}
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadSheet(selectedDate);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('lottery_sheet_updated', handleCustomUpdate);
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      if (unsubscribeCloud) unsubscribeCloud();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('lottery_sheet_updated', handleCustomUpdate);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [selectedDate, loadSheet]);

  // Load Cloud default design on mount
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

  // Direct Native Print (Zero Popups)
  const handlePrint = (targetSheet: DailySheet = sheet) => {
    directPrintSheet(targetSheet, {
      styleOptions: previewStyles,
      onSuccess: () => showToast('මුද්‍රණ කවුළුව විවෘත විය (Print dialog opened)', 'success'),
      onError: (err) => showToast(err, 'error'),
    });
  };

  // Staff Official Automation Runner (NLB & DLB Ground Truth Only - Zero AI)
  const executeStaffAutomation = useCallback(async (targetSheet: DailySheet) => {
    if (isAutomating) return;
    setIsAutomating(true);
    try {
      const result = await runStaffOfficialAutomation(targetSheet, (state) => {
        setAutomationState(state);
      });
      if (result.success && result.sheet) {
        setSheet(result.sheet);
        setCloudStatus('synced');
        showToast(
          result.rawSheetAttached 
            ? '✓ අමු පත්‍රිකාව (PDF) සහ නිල දත්ත 100% තහවුරු විය!' 
            : '✓ නිල ලොතරැයි ප්‍රතිඵල 100% තහවුරු විය. මුද්‍රණය කිරීමට සූදානම්!',
          'success'
        );
      } else {
        showToast(result.error || 'දෝෂයක් ඇති විය', 'error');
      }
    } catch (err: any) {
      console.error('Automation execution failed:', err);
      showToast('ස්වයංක්‍රීය සත්‍යාපනයේ දෝෂයක් ඇති විය', 'error');
    } finally {
      setIsAutomating(false);
    }
  }, [isAutomating]);

  // Automatically trigger Official Automation when in Staff mode and sheet is loaded
  useEffect(() => {
    if (userRole === 'staff' && sheet && sheet.date === selectedDate && !isAutomating) {
      const hasData = (sheet.lotteries || []).some(
        l => l.numbers && l.numbers.length > 0 && l.numbers.some(n => n && n.trim() !== '')
      );
      const isFullyVerified = (sheet.lotteries || []).length > 0 &&
        (sheet.lotteries || []).every(l => l.officialVerified || l.isNoDraw);

      if (isFullyVerified && hasData) {
        setAutomationState({
          step: 'ready',
          progressPercent: 100,
          messageSi: '✓ සියලු ලොතරැයි ප්‍රතිඵල රාජ්‍ය නිල දත්ත මඟින් 100% තහවුරු කර ඇත. මුද්‍රණය කිරීමට සූදානම්!',
          messageEn: '100% Verified against official government portals. Ready to print!',
          officialCount: (sheet.lotteries || []).filter(l => l.officialVerified).length,
          totalLotteries: sheet.lotteries.length,
        });
      } else if (!hasAutoRunForDateRef.current[selectedDate]) {
        hasAutoRunForDateRef.current[selectedDate] = true;
        executeStaffAutomation(sheet);
      }
    }
  }, [userRole, sheet, selectedDate, executeStaffAutomation, isAutomating]);

  // Handle Role Selection from Modal
  const handleRoleSelect = (role: UserRole) => {
    setUserRole(role);
    setStoredUserRole(role);
    setIsRoleModalOpen(false);

    if (role === 'staff') {
      showToast('කාර්ය මණ්ඩල ස්වයංක්‍රීය ප්‍රකාරය සක්‍රියයි (Staff Mode)', 'success');
      // Kick off automation immediately
      executeStaffAutomation(sheet);
    } else {
      showToast('අලෝක පරිපාලක ප්‍රකාරය සක්‍රියයි (Aloka Admin Mode)', 'info');
    }
  };

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

  // 1-Click Quick Print from past days
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
      
      {/* Role Selection Modal (Opens automatically if not selected, or via header) */}
      <RoleSelectModal
        isOpen={isRoleModalOpen}
        currentRole={userRole}
        onSelectRole={handleRoleSelect}
        onClose={userRole ? () => setIsRoleModalOpen(false) : undefined}
      />

      {/* Toast Notification */}
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
        currentRole={userRole}
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
        onDateChange={handleDateChange}
        onUpdateSheet={setSheet}
        onExportPdf={handleExportPdf}
        exportBlockedErrors={[]}
        onPrint={() => handlePrint()}
        isExporting={isExporting}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto p-3 sm:p-4 lg:p-5 flex flex-col lg:flex-row gap-4 items-stretch">
        
        {/* LEFT SIDEBAR */}
        <aside className="w-full lg:w-[350px] xl:w-[380px] shrink-0 flex flex-col gap-3">
          
          {/* Aloka Admin Quick Actions (Only shown in Aloka mode) */}
          {userRole === 'aloka' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    👑
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 font-sinhala">
                      අලෝක පරිපාලක ප්‍රකාරය
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Aloka Admin Mode
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 font-sinhala cursor-pointer"
                >
                  මාරු ⇄
                </button>
              </div>

              {/* Print Button */}
              <button
                type="button"
                onClick={() => handlePrint()}
                className="w-full py-3 text-[15px] font-black rounded-xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] cursor-pointer bg-[#15803d] hover:bg-[#166534] text-white shadow-sm mb-2"
              >
                <Printer className="w-5 h-5" />
                <span className="font-sinhala">මුද්‍රණය කරන්න</span>
              </button>

              <div className="flex gap-2">
                <Link
                  href={`/editor?date=${selectedDate}`}
                  className="flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition active:scale-[0.97] bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>සංස්කාරකය (Editor)</span>
                </Link>

                <button
                  type="button"
                  onClick={() => handleExportPdf(previewStyles)}
                  disabled={isExporting}
                  className="py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition active:scale-[0.97] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Selected Date Hero Card ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-start justify-between">
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

          {/* ── Past 4 Days Quick Access ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="font-sinhala">පසුගිය දින (Past Days)</span>
              <span className="text-[10px] font-normal text-slate-400">1-Click Print</span>
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

        {/* RIGHT: Live High-Resolution Sheet Preview */}
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
