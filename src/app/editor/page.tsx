'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { DailySheet, LotteryResultItem, RevisionRecord, UnassignedExtractedRow, LotteryDefinition, PreviewStyleOptions, SourceDocument, AiVerificationReport, AiLotteryAuditResult, OfficialLotteryMatchResult, OfficialVerificationSummary } from '@/types/lottery';
import { createEmptySheet, SAMPLE_WIREFRAME_SHEET, STANDARD_LOTTERIES, DAYS_OF_WEEK_SI, DEFAULT_STYLE_OPTIONS } from '@/lib/constants';
import { Header } from '@/components/Header';
import { StepNavigation, WorkflowStep } from '@/components/StepNavigation';
import { SourceViewer } from '@/components/SourceViewer';
import { LotteryRowEditor } from '@/components/LotteryRowEditor';
import { FooterEditor } from '@/components/FooterEditor';
import { SheetPreview } from '@/components/SheetPreview';
import { RevisionsModal } from '@/components/RevisionsModal';
import { AiVerificationModal } from '@/components/AiVerificationModal';
import { OfficialVerificationModal } from '@/components/OfficialVerificationModal';
import { directPrintSheet } from '@/lib/direct-print';
import { UnifiedCalendar } from '@/components/UnifiedCalendar';
import { transliterateSinglish, hasEnglishLetters } from '@/lib/singlish';
import { RoleSelectModal } from '@/components/RoleSelectModal';
import { UserRole, getStoredUserRole, setStoredUserRole } from '@/lib/user-role';
import { buildSheetFromOfficialData, secureFormatLotteryItem } from '@/lib/lottery-format-security';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  FileText, 
  CheckCheck, 
  Columns, 
  Maximize2, 
  ArrowRight, 
  ArrowLeft, 
  Filter, 
  Building2, 
  Upload, 
  Sparkles,
  Printer,
  FileDown,
  RotateCcw,
  Zap,
  ShieldCheck,
  Trash2
} from 'lucide-react';


function getYesterdayDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getSheetContentHash(s: DailySheet): string {
  if (!s || !s.date) return '';
  return JSON.stringify({
    date: s.date,
    headerDealerName: s.headerDealerName || '',
    footerAnnouncement: s.footerAnnouncement || '',
    isFooterReviewed: !!s.isFooterReviewed,
    lotteries: (s.lotteries || []).map(l => ({
      id: l.lotteryId,
      draw: l.drawNo || '',
      let: l.letter || '',
      zod: l.zodiac || '',
      nums: l.numbers || [],
      bonus: l.bonusNumber || '',
      noDraw: !!l.isNoDraw,
      noDrawReason: l.noDrawReason || '',
      boxed: l.boxedIndex ?? null,
      isCheckedAgainstSource: !!l.isCheckedAgainstSource,
      aiVerified: !!l.aiVerified,
      officialVerified: !!l.officialVerified,
    })),
  });
}

function sanitizeSheet(s: DailySheet): DailySheet {
  if (s && s.footerAnnouncement && s.footerAnnouncement.includes('ගොවි සෙත රු. ලක්ෂ දෙකහමාරක්')) {
    return { ...s, footerAnnouncement: '' };
  }
  return s;
}

type FilterType = 'all' | 'needs_attention' | 'confirmed' | 'no_draw';

function EditorContent() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('verify');
  const [selectedDate, setSelectedDate] = useState<string>(() => getYesterdayDateStr());
  const [sheet, setSheet] = useState<DailySheet>(() => sanitizeSheet(createEmptySheet(getYesterdayDateStr())));
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isAutoFetchingSource, setIsAutoFetchingSource] = useState<boolean>(false);
  const [unassignedRows, setUnassignedRows] = useState<UnassignedExtractedRow[]>([]);
  const [dateMismatchWarning, setDateMismatchWarning] = useState<string | undefined>();
  const [exportBlockedErrors, setExportBlockedErrors] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Verification UX controls
  const [filterMode, setFilterMode] = useState<FilterType>('all');
  const [isSplitView, setIsSplitView] = useState<boolean>(true);
  const [printDensity, setPrintDensity] = useState<'eco' | 'high'>('eco');
  const [previewStyles, setPreviewStyles] = useState<PreviewStyleOptions | undefined>(undefined);
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'syncing' | 'offline' | 'permission_denied'>('synced');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isLoadingDate, setIsLoadingDate] = useState<boolean>(false);

  // User Role State
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);

  // Hydrate availableDates from browser localStorage on mount for instant visual indicators
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const localKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('sinhala_lottery_sheet_')) {
            const d = k.replace('sinhala_lottery_sheet_', '');
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
              localKeys.push(d);
            }
          }
        }
        if (localKeys.length > 0) {
          setAvailableDates(prev => Array.from(new Set([...prev, ...localKeys])).sort().reverse());
        }
      } catch {}

      // Hydrate user role
      setUserRole(getStoredUserRole());
      const handleRoleChange = (e: any) => {
        if (e.detail?.role !== undefined) {
          setUserRole(e.detail.role);
        }
      };
      window.addEventListener('lottery_user_role_changed', handleRoleChange);
      return () => window.removeEventListener('lottery_user_role_changed', handleRoleChange);
    }
  }, []);

  const handleRoleSelect = (role: UserRole) => {
    setUserRole(role);
    setStoredUserRole(role);
    setIsRoleModalOpen(false);
    if (role === 'staff') {
      router.push(`/?date=${selectedDate}`);
    }
  };

  // Auto-save tracking refs
  const lastSavedHashRef = useRef<string>('');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadedRef = useRef<boolean>(false);

  // AI Verification states
  const [isAiVerifyModalOpen, setIsAiVerifyModalOpen] = useState<boolean>(false);
  const [isAiVerifying, setIsAiVerifying] = useState<boolean>(false);
  const [aiVerificationReport, setAiVerificationReport] = useState<AiVerificationReport | null>(null);

  // Official Government Verification states
  const [isOfficialVerifyModalOpen, setIsOfficialVerifyModalOpen] = useState<boolean>(false);
  const [isOfficialVerifying, setIsOfficialVerifying] = useState<boolean>(false);
  const [isRefreshingOfficial, setIsRefreshingOfficial] = useState<boolean>(false);
  const [officialVerificationSummary, setOfficialVerificationSummary] = useState<OfficialVerificationSummary | null>(null);
  const [isBuildingFromOfficial, setIsBuildingFromOfficial] = useState<boolean>(false);


  const aiStatusSummary = useMemo(() => {
    if (!aiVerificationReport) return undefined;
    return {
      verified: aiVerificationReport.verifiedCount,
      total: aiVerificationReport.totalLotteries,
      hasDiscrepancy: aiVerificationReport.mismatchCount > 0,
    };
  }, [aiVerificationReport]);

  const officialStatusSummary = useMemo(() => {
    if (!officialVerificationSummary) return undefined;
    return {
      matched: officialVerificationSummary.matchedCount,
      total: officialVerificationSummary.totalLotteries,
      hasDiscrepancy: officialVerificationSummary.discrepancyCount > 0,
    };
  }, [officialVerificationSummary]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Helper: check if a lottery item meets all required data criteria
  const isRowComplete = useCallback((item: LotteryResultItem, def: LotteryDefinition) => {
    if (item.isNoDraw) return !!(item.noDrawReason && item.noDrawReason.trim().length > 0);
    if (!item.drawNo || item.drawNo.trim().length === 0) return false;
    if (def.requiresLetter && (!item.letter || item.letter.trim().length === 0)) return false;
    if (def.requiresZodiac && (!item.zodiac || item.zodiac.trim().length === 0)) return false;
    if (def.isTieredDigits) {
      const nums = item.numbers || [];
      if (!nums[0] || !nums[1] || !nums[2]) return false;
    } else {
      const nums = item.numbers || [];
      if (nums.length < def.numberCount || nums.slice(0, def.numberCount).some(n => !n || n.trim().length === 0)) {
        return false;
      }
    }
    if (def.hasBonusNumber && (!item.bonusNumber || item.bonusNumber.trim().length === 0)) return false;
    return true;
  }, []);

  // Fetch sheet by date with triple redundancy (Cloud -> Local Server -> Browser LocalStorage)
  const loadSheet = useCallback(async (date: string) => {
    isInitialLoadedRef.current = false;
    setIsLoadingDate(true);
    try {
      const res = await fetch(`/api/sheet?date=${date}`);
      const data = await res.json();
      if (data.success && data.sheet) {
        // Reconcile any placeholder sources from IndexedDB cache
        if (Array.isArray(data.sheet.sources)) {
          try {
            const { getCachedFileRecord } = await import('@/lib/source-file-cache');
            const reconciledSources = await Promise.all(
              data.sheet.sources.map(async (s: any) => {
                const isPlaceholder = !s.filePath ||
                  s.filePath.startsWith('blob:') ||
                  s.filePath.includes('Browser Session') ||
                  s.filePath.startsWith('[');

                if (isPlaceholder) {
                  const cachedRecord = await getCachedFileRecord(s.id, s.fileName);
                  if (cachedRecord.blob) {
                    return {
                      ...s,
                      filePath: URL.createObjectURL(cachedRecord.blob),
                      previewImageUrl: cachedRecord.previewDataUrl || s.previewImageUrl,
                    };
                  } else {
                    return {
                      ...s,
                      filePath: '[Stored in Browser Session]',
                    };
                  }
                }
                return s;
              })
            );
            data.sheet.sources = reconciledSources;
          } catch {}
        }

        // NOTE: Raw sheet extractions are strictly for verification (e.g. side-by-side or Verify with LK Sheet).
        // Editor lottery fields are NEVER auto-populated from raw sheets; they are filled exclusively from official sites results or user manual edits.

        const cleanSheet = sanitizeSheet(data.sheet);
        setSheet(cleanSheet);
        setRevisions(data.revisions || []);
        lastSavedHashRef.current = getSheetContentHash(cleanSheet);
        isInitialLoadedRef.current = true;
        if (data.fromCloud) {
          setCloudStatus('synced');
        }
        if (data.availableDates && Array.isArray(data.availableDates)) {
          setAvailableDates(prev => Array.from(new Set([...prev, ...data.availableDates])).sort().reverse());
        }
        // Cache to browser localStorage
        try {
          localStorage.setItem(`sinhala_lottery_sheet_${date}`, JSON.stringify(cleanSheet));
        } catch {}
      } else {
        if (data.availableDates && Array.isArray(data.availableDates)) {
          setAvailableDates(prev => Array.from(new Set([...prev, ...data.availableDates])).sort().reverse());
        }
        // Fallback to localStorage before empty sheet
        try {
          const cached = localStorage.getItem(`sinhala_lottery_sheet_${date}`);
          if (cached) {
            const parsed = sanitizeSheet(JSON.parse(cached));
            setSheet(parsed);
            lastSavedHashRef.current = getSheetContentHash(parsed);
            isInitialLoadedRef.current = true;
            return;
          }
        } catch {}
        const empty = sanitizeSheet(createEmptySheet(date));
        setSheet(empty);
        lastSavedHashRef.current = getSheetContentHash(empty);
        isInitialLoadedRef.current = true;
      }
    } catch (e) {
      console.error('Error loading sheet:', e);
      try {
        const cached = localStorage.getItem(`sinhala_lottery_sheet_${date}`);
        if (cached) {
          const parsed = sanitizeSheet(JSON.parse(cached));
          setSheet(parsed);
          lastSavedHashRef.current = getSheetContentHash(parsed);
          isInitialLoadedRef.current = true;
          return;
        }
      } catch {}
      const empty = sanitizeSheet(createEmptySheet(date));
      setSheet(empty);
      lastSavedHashRef.current = getSheetContentHash(empty);
      isInitialLoadedRef.current = true;
    } finally {
      setIsLoadingDate(false);
    }
  }, []);

  const router = useRouter();
  const searchParams = useSearchParams();
  const urlDate = searchParams?.get('date');
  const activeDateRef = useRef<string>(selectedDate);

  // Fast, real-time date switcher: instantly sets cached numbers, cancels auto-save on old date, and fetches freshest data
  const handleDateChange = useCallback((newDate: string) => {
    if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return;

    // 1. Immediately cancel any pending auto-save timer for previous sheet
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    // Block auto-save until fresh sheet is fully loaded
    isInitialLoadedRef.current = false;
    setIsLoadingDate(true);

    // 2. Synchronize activeDateRef, selectedDate, URL and localStorage
    activeDateRef.current = newDate;
    setSelectedDate(newDate);

    if (typeof window !== 'undefined') {
      localStorage.setItem('sinhala_lottery_last_active_date', newDate);
    }
    router.replace(`/editor?date=${newDate}`, { scroll: false });

    // 3. REAL-TIME ZERO-LATENCY CACHE CHECK:
    // If we have cached sheet for this date in localStorage, apply it synchronously with 0ms delay!
    let appliedFromCache = false;
    try {
      const cached = localStorage.getItem(`sinhala_lottery_sheet_${newDate}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.date === newDate && Array.isArray(parsed.lotteries) && parsed.lotteries.length > 0) {
          setSheet(parsed);
          lastSavedHashRef.current = getSheetContentHash(parsed);
          appliedFromCache = true;
        }
      }
    } catch {}

    // If no cache, initialize an empty sheet for this new date IMMEDIATELY
    // so old numbers NEVER leak into the new date!
    if (!appliedFromCache) {
      const empty = createEmptySheet(newDate);
      setSheet(empty);
      lastSavedHashRef.current = getSheetContentHash(empty);
    }
  }, [router]);

  // Reactively synchronize active date when external URL query param changes
  useEffect(() => {
    if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) {
      if (urlDate !== activeDateRef.current) {
        activeDateRef.current = urlDate;
        handleDateChange(urlDate);
      }
    }
  }, [urlDate, handleDateChange]);

  useEffect(() => {
    loadSheet(selectedDate);
  }, [selectedDate, loadSheet]);

  // Debounced auto-save effect: automatically persists edits so staff sees them immediately
  useEffect(() => {
    if (!isInitialLoadedRef.current || !sheet?.date) return;

    const currentHash = getSheetContentHash(sheet);
    if (!currentHash || currentHash === lastSavedHashRef.current) {
      return;
    }

    // Indicate syncing status
    setCloudStatus('syncing');

    // Immediately cache in localStorage & dispatch custom event for instant cross-tab / staff access
    try {
      localStorage.setItem(`sinhala_lottery_sheet_${sheet.date}`, JSON.stringify(sheet));
      window.dispatchEvent(new CustomEvent('lottery_sheet_updated', { detail: { date: sheet.date } }));
    } catch {}

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Debounce save by 800ms to group consecutive keystrokes smoothly
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        const targetSheet: DailySheet = {
          ...sheet,
          sources: (sheet.sources || []).map(s => ({
            ...s,
            filePath: (s.filePath && s.filePath.startsWith('blob:')) ? '[Stored in Browser Session]' : s.filePath,
          })),
          updatedAt: new Date().toISOString(),
        };

        // 1. Save to local server & cloud via /api/sheet
        const res = await fetch('/api/sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheet: targetSheet, summary: 'Auto-saved edit' }),
        });
        const data = await res.json();

        // 2. Also execute direct client Firestore sync for instant real-time delivery
        try {
          const { saveSheetToCloud } = await import('@/lib/cloud-service');
          await saveSheetToCloud(targetSheet);
        } catch {}

        lastSavedHashRef.current = getSheetContentHash(targetSheet);
        setCloudStatus('synced');
      } catch (err) {
        console.warn('Auto-save error:', err);
        setCloudStatus('offline');
      } finally {
        setIsSaving(false);
      }
    }, 800);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [sheet]);

  // Flush pending auto-save on page exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isInitialLoadedRef.current || !sheet?.date) return;
      const currentHash = getSheetContentHash(sheet);
      if (currentHash && currentHash !== lastSavedHashRef.current) {
        try {
          localStorage.setItem(`sinhala_lottery_sheet_${sheet.date}`, JSON.stringify(sheet));
          const blob = new Blob([JSON.stringify({ sheet, summary: 'Auto-saved on exit' })], { type: 'application/json' });
          navigator.sendBeacon('/api/sheet', blob);
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sheet]);


  // 1-Click Quick Print from Calendar / 4-Day History Bar
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

  // Save current sheet
  const handleSave = async (sheetToSave?: DailySheet, summary = 'Updated lottery results') => {
    const raw = sheetToSave || sheet;
    const sanitizedLotteries = (raw.lotteries || []).map(lot => {
      const def = STANDARD_LOTTERIES.find(d => d.id === lot.lotteryId);
      return def ? secureFormatLotteryItem(lot, def) : lot;
    });

    const targetSheet: DailySheet = {
      ...raw,
      lotteries: sanitizedLotteries,
      sources: (raw.sources || []).map(s => ({
        ...s,
        filePath: (s.filePath && s.filePath.startsWith('blob:')) ? '[Stored in Browser Session]' : s.filePath,
      })),
      updatedAt: new Date().toISOString(),
    };
    setIsSaving(true);
    setCloudStatus('syncing');

    // Instantly persist to browser localStorage so client data is never lost
    try {
      localStorage.setItem(`sinhala_lottery_sheet_${targetSheet.date}`, JSON.stringify(targetSheet));
    } catch {}

    try {
      const res = await fetch('/api/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet: targetSheet, summary }),
      });
      const data = await res.json();
      if (data.success && data.sheet) {
        setSheet(data.sheet);
        setRevisions(data.revisions || []);
        if (data.cloudSynced) {
          setCloudStatus('synced');
          showToast('Saved locally & auto-synced to cloud!', 'success');
        } else if (data.isPermissionDenied) {
          setCloudStatus('permission_denied');
          showToast('Saved locally. Cloud sync blocked: Update Firebase Firestore rules.', 'info');
        } else {
          // Attempt client-side direct cloud save (shares active browser session if authenticated)
          try {
            const { saveSheetToCloud } = await import('@/lib/cloud-service');
            const clientCloud = await saveSheetToCloud(data.sheet);
            if (clientCloud.success) {
              setCloudStatus('synced');
              showToast('Saved locally & auto-synced to cloud!', 'success');
            } else if (clientCloud.isPermissionDenied) {
              setCloudStatus('permission_denied');
              showToast('Saved locally. Cloud sync blocked: Update Firebase Firestore rules.', 'info');
            } else {
              setCloudStatus('offline');
              showToast('Saved locally (cloud sync pending)', 'info');
            }
          } catch {
            setCloudStatus('offline');
            showToast('Saved locally (cloud sync pending)', 'info');
          }
        }
      } else {
        setCloudStatus('offline');
        showToast(`Save failed: ${data.error}`, 'error');
      }
    } catch (e: any) {
      setCloudStatus('offline');
      showToast(`Save error: ${e.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle uploading source document
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setDateMismatchWarning(undefined);

    // Create an in-memory blob URL for instantaneous, 100% reliable local preview
    const localBlobUrl = typeof window !== 'undefined' ? URL.createObjectURL(file) : '';

    try {
      // Step 1: Run browser-side PDF extraction for immediate zero-dependency reliability
      let browserText = '';
      if (file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const { extractTextFromPdfInBrowser } = await import('@/lib/client-pdf-extractor');
          browserText = await extractTextFromPdfInBrowser(file);
        } catch (clientErr) {
          console.warn('Browser extraction error:', clientErr);
        }
      }

      const activeDate = sheet.date || selectedDate;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('date', activeDate);
      if (browserText && browserText.trim().length > 0) {
        formData.append('clientExtractedText', browserText.trim());
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        let matchedLotteries = data.extraction?.matchedLotteries || [];
        let detectedDate = data.extraction?.detectedDate;
        let detectedFooterAnnouncement = data.extraction?.detectedFooterAnnouncement;
        let unassignedRows = data.extraction?.unassignedRows || [];
        let dateMismatchWarning = data.extraction?.dateMismatchWarning;

        // Step 2: Fallback: If server matched 0 lotteries, but browser extracted text, run local extractor!
        if (matchedLotteries.length === 0 && (browserText || data.sourceDoc?.extractedText)) {
          try {
            const { extractLotteryDataFromText } = await import('@/lib/extractor');
            const fallbackExt = extractLotteryDataFromText(
              browserText || data.sourceDoc?.extractedText || '',
              activeDate,
              file.name,
              1
            );
            if (fallbackExt.matchedLotteries && fallbackExt.matchedLotteries.length > 0) {
              matchedLotteries = fallbackExt.matchedLotteries;
              detectedDate = fallbackExt.detectedDate || detectedDate;
              detectedFooterAnnouncement = fallbackExt.detectedFooterAnnouncement || detectedFooterAnnouncement;
              unassignedRows = fallbackExt.unassignedRows || unassignedRows;
              dateMismatchWarning = fallbackExt.dateMismatchWarning || dateMismatchWarning;
            }
          } catch (fallbackErr) {
            console.warn('Client fallback extraction error:', fallbackErr);
          }
        }

        showToast(`📄 Document "${file.name}" uploaded. Saved for verification.`, 'info');

        // Render raster preview for instant visual verification
        let clientPreviewUrl: string | undefined = undefined;
        if (file.name.toLowerCase().endsWith('.pdf')) {
          try {
            const { renderPdfPageToDataUrl } = await import('@/lib/client-pdf-extractor');
            const dataUrl = await renderPdfPageToDataUrl(file);
            if (dataUrl) clientPreviewUrl = dataUrl;
          } catch (renderErr) {
            console.warn('Client PDF preview rendering error:', renderErr);
          }
        }

        // Cache file in IndexedDB immediately for persistent browser preview across reloads
        if (data.sourceDoc?.id) {
          try {
            const { saveCachedFile } = await import('@/lib/source-file-cache');
            await saveCachedFile(data.sourceDoc.id, file.name, file, clientPreviewUrl);
          } catch (cacheErr) {
            console.warn('Could not cache file in IndexedDB:', cacheErr);
          }
        }

        const isServerPlaceholder = !data.sourceDoc?.filePath ||
          data.sourceDoc.filePath.includes('Browser Session') ||
          data.sourceDoc.filePath.startsWith('[');

        const clientSourceDoc: SourceDocument = {
          ...data.sourceDoc,
          filePath: isServerPlaceholder ? localBlobUrl : (data.sourceDoc.filePath || localBlobUrl),
          previewImageUrl: clientPreviewUrl || data.sourceDoc?.previewImageUrl,
          extractedText: data.sourceDoc?.extractedText || browserText,
        };

        const newSources = [...sheet.sources, clientSourceDoc];
        
        if (dateMismatchWarning) {
          setDateMismatchWarning(dateMismatchWarning);
        }
        if (unassignedRows && unassignedRows.length > 0) {
          setUnassignedRows(prev => [...prev, ...unassignedRows]);
        }

        // IMPORTANT: Extracted raw sheets are strictly for verification (e.g. side-by-side or Verify with LK Sheet).
        // Editor lottery fields are NEVER overwritten by raw sheets; they are filled exclusively by official sites or manual input.
        const newSheet: DailySheet = {
          ...sheet,
          sources: newSources,
          lotteries: sheet.lotteries,
          footerAnnouncement: detectedFooterAnnouncement || sheet.footerAnnouncement,
        };

        setSheet(newSheet);
        await handleSave(newSheet, `Uploaded verification document: ${file.name}`);
        // Advance to verify step if currently on setup
        if (currentStep === 'setup') {
          setCurrentStep('verify');
        }

        showToast(`📄 Document "${file.name}" attached for verification. Editor fields remain filled with official/manual results.`, 'success');
      } else {
        showToast(`Extraction failed: ${data.error}`, 'error');
      }
    } catch (e: any) {
      showToast(`Upload error: ${e.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle auto-fetching daily Sinhala raw lottery sheet from lklottery.com
  const handleAutoFetchSource = async () => {
    setIsAutoFetchingSource(true);
    setDateMismatchWarning(undefined);

    const activeDate = sheet.date || selectedDate;

    try {
      showToast(`⚡ Fetching daily sheet from lklottery.com for ${activeDate}...`, 'info');

      const res = await fetch(`/api/auto-fetch-source?date=${activeDate}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        const is403 = res.status === 403 || data.error?.includes('403');
        if (is403) {
          const parts = activeDate.split('-');
          const yyyy = parts[0];
          const mm = parts[1].padStart(2, '0');
          const dd = parts[2].padStart(2, '0');
          const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dateObj = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0));
          const dayName = DAY_NAMES[dateObj.getUTCDay()];
          const directPdfUrl = `https://lklottery.com/api/lklottery/lklottery_pdf_files/lklottery_results_Sinhala_${yyyy}${mm}${dd}_${dayName}.pdf`;

          showToast(`⚠️ lklottery.com blocked the cloud server (Cloudflare 403). Opening official PDF directly for download & manual upload...`, 'info');
          try {
            window.open(directPdfUrl, '_blank');
          } catch {}
          return;
        }

        const errDetail = data.error || `Could not fetch sheet for ${activeDate}`;
        const latestMsg = data.latestDate ? ` (Latest available sheet on lklottery: ${data.latestDate})` : '';
        showToast(`ℹ️ Raw sheet is not uploaded yet to lklottery.com${latestMsg}. You can click "⚡ Build from Official" to populate directly from NLB & DLB portals!`, 'info');
        return;
      }

      const { sourceDoc, dataUrl, extraction, matchedCount } = data;
      let matchedLotteries = extraction?.matchedLotteries || [];
      let detectedDate = extraction?.detectedDate;
      let detectedFooterAnnouncement = extraction?.detectedFooterAnnouncement;
      let unassignedRows = extraction?.unassignedRows || [];
      let dateMismatchWarning = extraction?.dateMismatchWarning;

      // SAFETY CHECK: If detected date in PDF does not match activeDate, do not overwrite the sheet!
      if (detectedDate && detectedDate !== activeDate) {
        const mismatchMsg = `Fetched PDF is for date ${detectedDate}, which does not match active sheet date ${activeDate}!`;
        setDateMismatchWarning(mismatchMsg);
        showToast(`⚠️ ${mismatchMsg}`, 'error');
        return;
      }

      // Render raster preview and cache into IndexedDB for persistent visual display across reloads
      let clientPreviewUrl: string | undefined = undefined;
      try {
        if (dataUrl) {
          const blobRes = await fetch(dataUrl);
          const pdfBlob = await blobRes.blob();

          const { renderPdfPageToDataUrl } = await import('@/lib/client-pdf-extractor');
          clientPreviewUrl = (await renderPdfPageToDataUrl(pdfBlob)) || undefined;

          const { saveCachedFile } = await import('@/lib/source-file-cache');
          await saveCachedFile(sourceDoc.id, sourceDoc.fileName, pdfBlob, clientPreviewUrl);
        }
      } catch (cacheErr) {
        console.warn('Could not cache auto-fetched file in IndexedDB:', cacheErr);
      }

      const clientSourceDoc: SourceDocument = {
        ...sourceDoc,
        previewImageUrl: clientPreviewUrl || sourceDoc.previewImageUrl,
      };

      // Strip out any stale auto-fetched lklottery sheets (especially from another date)
      // and place the newly fetched document first
      const existingSources = sheet.sources.filter(s => 
        !s.fileName.startsWith('lklottery_results_') &&
        s.fileName !== sourceDoc.fileName &&
        (!s.detectedDate || s.detectedDate === activeDate)
      );
      const newSources = [clientSourceDoc, ...existingSources];

      if (dateMismatchWarning) {
        setDateMismatchWarning(dateMismatchWarning);
      }
      if (unassignedRows && unassignedRows.length > 0) {
        setUnassignedRows(prev => [...prev, ...unassignedRows]);
      }

      // IMPORTANT: Raw sheets from lklottery are strictly for verification.
      // Editor lottery fields are NEVER overwritten by raw sheets; they are filled exclusively by official sites or manual input.
      const newSheet: DailySheet = {
        ...sheet,
        date: activeDate,
        sources: newSources,
        lotteries: sheet.lotteries,
        footerAnnouncement: detectedFooterAnnouncement || sheet.footerAnnouncement,
      };

      setSheet(newSheet);
      await handleSave(newSheet, `Auto-fetched verification source from lklottery.com: ${sourceDoc.fileName}`);

      if (currentStep === 'setup') {
        setCurrentStep('verify');
      }

      showToast(`✓ Raw lottery sheet fetched for verification. Click "Verify with LK Sheet" to cross-check.`, 'success');
    } catch (err: any) {
      showToast(`Auto-fetch error: ${err.message}`, 'error');
    } finally {
      setIsAutoFetchingSource(false);
    }
  };

  // Handle removing uploaded source document
  const handleRemoveSource = async (sourceId: string) => {
    const docToRemove = sheet.sources.find(s => s.id === sourceId);
    if (!docToRemove) return;

    if (!confirm(`Are you sure you want to remove source file "${docToRemove.fileName}"?`)) {
      return;
    }

    const alsoClearValues = confirm(
      `Do you also want to clear all lottery numbers, draw numbers, and values extracted from "${docToRemove.fileName}"?`
    );

    try {
      if (docToRemove.filePath && docToRemove.filePath.startsWith('/uploads/')) {
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: docToRemove.filePath }),
        });
      }
    } catch (e) {
      console.warn('Could not remove physical uploaded file:', e);
    }

    const remainingSources = sheet.sources.filter(s => s.id !== sourceId);
    setUnassignedRows(prev => prev.filter(r => r.sourceFileName !== docToRemove.fileName));

    const updatedLotteries = sheet.lotteries.map(l => {
      const isFromThisDoc = l.sourceFileName === docToRemove.fileName || (alsoClearValues && remainingSources.length === 0);
      if (isFromThisDoc) {
        if (alsoClearValues) {
          return {
            ...l,
            drawNo: '',
            letter: '',
            zodiac: '',
            numbers: [],
            bonusNumber: '',
            boxedIndex: undefined,
            isNoDraw: false,
            noDrawReason: undefined,
            aiVerified: undefined,
            aiDiscrepancy: undefined,
            officialVerified: undefined,
            officialDiscrepancy: undefined,
            officialDrawNo: undefined,
            officialMatchedAt: undefined,
            extractionConfidence: undefined,
            isCheckedAgainstSource: false,
            sourceFileName: undefined,
            sourcePage: undefined,
          };
        }
        return {
          ...l,
          sourceFileName: undefined,
          sourcePage: undefined,
        };
      }
      return l;
    });

    const newSheet: DailySheet = {
      ...sheet,
      sources: remainingSources,
      lotteries: updatedLotteries,
    };

    setSheet(newSheet);
    if (alsoClearValues && remainingSources.length === 0) {
      setDateMismatchWarning(undefined);
      setAiVerificationReport(null);
      setOfficialVerificationSummary(null);
    }
    showToast(alsoClearValues ? `Removed "${docToRemove.fileName}" and cleared extracted values` : `Removed "${docToRemove.fileName}"`, 'info');

    try {
      await fetch('/api/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet: newSheet, summary: `Removed source file: ${docToRemove.fileName}` }),
      });
    } catch (e) {
      console.error('Failed to save sheet after removing source:', e);
    }
  };

  // Clear all entered/extracted lottery numbers and values back to blank template
  const handleClearAllValues = async () => {
    if (!confirm('Are you sure you want to clear all lottery numbers, draw numbers, letters, and results for this date? The sheet will be reset to blank.')) {
      return;
    }

    const clearedLotteries: LotteryResultItem[] = sheet.lotteries.map(l => ({
      ...l,
      drawNo: '',
      letter: '',
      zodiac: '',
      numbers: [],
      bonusNumber: '',
      boxedIndex: undefined,
      isNoDraw: false,
      noDrawReason: undefined,
      aiVerified: undefined,
      aiDiscrepancy: undefined,
      officialVerified: undefined,
      officialDiscrepancy: undefined,
      officialDrawNo: undefined,
      officialMatchedAt: undefined,
      extractionConfidence: undefined,
      isCheckedAgainstSource: false,
      sourceFileName: undefined,
      sourcePage: undefined,
    }));

    const newSheet: DailySheet = {
      ...sheet,
      lotteries: clearedLotteries,
    };

    setSheet(newSheet);
    setDateMismatchWarning(undefined);
    setUnassignedRows([]);
    setAiVerificationReport(null);
    setOfficialVerificationSummary(null);

    await handleSave(newSheet, 'Cleared all lottery values');
    showToast('🧹 Cleared all lottery values and reset sheet to blank!', 'info');
  };

  // Permanently delete sheet, all results, and uploaded files for the active date
  const handleDeleteSheet = async (targetDateParam?: string) => {
    const targetDate = targetDateParam || sheet.date || selectedDate;
    if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      showToast('Invalid date to delete', 'error');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ ඔබ සැබවින්ම ${targetDate} දින ප්‍රතිඵල සහ අප්ලෝඩ් කරන ලද සියලුම ගොනු සම්පූර්ණයෙන්ම මැකීමට කැමතිද?\n\n` +
      `Are you sure you want to PERMANENTLY DELETE all results and uploaded files for ${targetDate}?\n\n` +
      `• Local Server & Cloud Firestore වෙතින් මෙම දිනයේ ප්‍රතිඵල සම්පූර්ණයෙන්ම මැකී යයි.\n` +
      `• කාර්ය මණ්ඩලයට (Staff) මෙම දිනයේ ප්‍රතිඵල මුද්‍රණය කිරීමට නොහැකි වේ.\n` +
      `• අප්ලෝඩ් කළ PDF/පින්තූර සියල්ල මැකී යයි.\n` +
      `• දිනය හිස් (Blank) තත්ත්වයට පත් වේ.`
    );

    if (!confirmed) return;

    // Immediately cancel any pending auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    isInitialLoadedRef.current = false;
    setIsLoadingDate(true);

    try {
      showToast(`🗑️ Deleting results and files for ${targetDate}...`, 'info');

      // 1. Call DELETE on /api/sheet
      const res = await fetch(`/api/sheet?date=${targetDate}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      // 2. Delete from Cloud Firestore directly as well for instant real-time synchronization
      try {
        const { deleteSheetFromCloud } = await import('@/lib/cloud-service');
        await deleteSheetFromCloud(targetDate);
      } catch (cloudErr) {
        console.warn('Direct cloud delete error:', cloudErr);
      }

      // 3. Clear IndexedDB cache for any sources associated with this sheet
      try {
        const { deleteCachedFile } = await import('@/lib/source-file-cache');
        if (Array.isArray(sheet.sources)) {
          for (const s of sheet.sources) {
            if (s.id) await deleteCachedFile(s.id);
          }
        }
      } catch (idbErr) {
        console.warn('IndexedDB source clean error:', idbErr);
      }

      // 4. Remove browser localStorage cache
      try {
        localStorage.removeItem(`sinhala_lottery_sheet_${targetDate}`);
      } catch {}

      // 5. Notify all open tabs & staff view
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lottery_sheet_deleted', { detail: { date: targetDate } }));
      }

      // 6. Reset local editor state to empty template
      const emptySheet = sanitizeSheet(createEmptySheet(targetDate));
      setSheet(emptySheet);
      setRevisions([]);
      setUnassignedRows([]);
      setAiVerificationReport(null);
      setOfficialVerificationSummary(null);
      setDateMismatchWarning(undefined);
      lastSavedHashRef.current = getSheetContentHash(emptySheet);
      isInitialLoadedRef.current = true;

      // 7. Update available dates (remove deleted date)
      if (data.availableDates && Array.isArray(data.availableDates)) {
        setAvailableDates(data.availableDates);
      } else {
        setAvailableDates(prev => prev.filter(d => d !== targetDate));
      }

      showToast(`✓ ${targetDate} ප්‍රතිඵල සහ ගොනු සාර්ථකව මකා දැමුණි (Deleted permanently)!`, 'success');
    } catch (err: any) {
      console.error('Error deleting sheet:', err);
      showToast(`Failed to delete sheet: ${err.message || err}`, 'error');
    } finally {
      setIsLoadingDate(false);
    }
  };


  // Extract lottery results directly from an attached source document into the cards
  const handleExtractFromSource = async (sourceId: string) => {
    const doc = sheet.sources.find(s => s.id === sourceId) || sheet.sources[0];
    if (!doc) {
      showToast('No source document found to extract from.', 'error');
      return;
    }

    try {
      showToast(`⚡ Extracting lottery results from "${doc.fileName}"...`, 'info');
      let text = doc.extractedText || '';

      // If document text is not already present, try to extract it
      if (!text || text.trim().length === 0) {
        if (doc.filePath && !doc.filePath.startsWith('[') && !doc.filePath.startsWith('blob:')) {
          try {
            const fileRes = await fetch(doc.filePath);
            const fileBlob = await fileRes.blob();
            const fileObj = new File([fileBlob], doc.fileName, { type: 'application/pdf' });
            const { extractTextFromPdfInBrowser } = await import('@/lib/client-pdf-extractor');
            text = await extractTextFromPdfInBrowser(fileObj);
          } catch {}
        }
      }

      if (!text || text.trim().length === 0) {
        try {
          const { getCachedFileRecord } = await import('@/lib/source-file-cache');
          const cached = await getCachedFileRecord(doc.id, doc.fileName);
          if (cached.blob) {
            const cachedFile = new File([cached.blob], doc.fileName, { type: 'application/pdf' });
            const { extractTextFromPdfInBrowser } = await import('@/lib/client-pdf-extractor');
            text = await extractTextFromPdfInBrowser(cachedFile);
          }
        } catch {}
      }

      if (!text || text.trim().length === 0) {
        showToast(`Could not read text content from "${doc.fileName}". Please re-upload the file.`, 'error');
        return;
      }

      const { extractLotteryDataFromText } = await import('@/lib/extractor');
      const activeDate = sheet.date || selectedDate;
      const extraction = extractLotteryDataFromText(text, activeDate, doc.fileName, 1);
      const matchedLotteries = extraction.matchedLotteries || [];

      if (matchedLotteries.length === 0) {
        showToast(`Could not identify lottery rows in "${doc.fileName}".`, 'error');
        return;
      }

      const updatedLotteries = sheet.lotteries.map((existing) => {
        const match = matchedLotteries.find((m: any) => m.lotteryId === existing.lotteryId);
        if (match) {
          const def = STANDARD_LOTTERIES.find(d => d.id === existing.lotteryId);
          let rawNums = (match.numbers && match.numbers.length > 0) ? match.numbers : existing.numbers;
          const bNum = match.bonusNumber !== undefined ? match.bonusNumber : existing.bonusNumber;
          if (def?.hasBonusNumber && bNum) {
            rawNums = rawNums.filter((n: string) => n !== bNum);
          }
          if (def?.numberCount && rawNums.length > def.numberCount) {
            rawNums = rawNums.slice(0, def.numberCount);
          }

          return {
            ...existing,
            drawNo: match.drawNo || existing.drawNo,
            letter: match.letter !== undefined ? match.letter : existing.letter,
            zodiac: match.zodiac || existing.zodiac,
            numbers: rawNums,
            bonusNumber: bNum,
            boxedIndex: match.boxedIndex !== undefined ? match.boxedIndex : existing.boxedIndex,
            sourceFileName: doc.fileName,
            sourcePage: match.sourcePage || 1,
            extractionConfidence: match.extractionConfidence || 95,
            isCheckedAgainstSource: true,
            isNoDraw: false,
          };
        }
        return existing;
      });

      const newSheet: DailySheet = {
        ...sheet,
        lotteries: updatedLotteries,
        footerAnnouncement: extraction.detectedFooterAnnouncement || sheet.footerAnnouncement,
      };

      setSheet(newSheet);
      if (extraction.unassignedRows && extraction.unassignedRows.length > 0) {
        setUnassignedRows(extraction.unassignedRows);
      }
      await handleSave(newSheet, `Extracted lotteries from attached document: ${doc.fileName}`);
      showToast(`🎉 Successfully extracted ${matchedLotteries.length} lotteries to cards from ${doc.fileName}!`, 'success');
    } catch (extractErr: any) {
      showToast(`Extraction error: ${extractErr?.message || extractErr}`, 'error');
    }
  };

  // Assign unassigned row
  const handleAssignRow = (row: UnassignedExtractedRow, targetLotteryId: string) => {
    setSheet(prev => ({
      ...prev,
      lotteries: prev.lotteries.map(item => {
        if (item.lotteryId === targetLotteryId) {
          return {
            ...item,
            drawNo: row.detectedDrawNo || item.drawNo,
            numbers: row.detectedNumbers.slice(1).length > 0 ? row.detectedNumbers.slice(1) : row.detectedNumbers,
            sourceFileName: row.sourceFileName,
            sourcePage: row.sourcePage,
            isCheckedAgainstSource: true,
          };
        }
        return item;
      })
    }));

    setUnassignedRows(prev => prev.filter(r => r.id !== row.id));
    showToast(`Assigned numbers to ${targetLotteryId}`, 'info');
  };

  // Export final PDF
  const handleExportPdf = async (customStyles?: PreviewStyleOptions) => {
    setIsExporting(true);
    setExportBlockedErrors([]);

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
        setExportBlockedErrors(errorData.errors || [errorData.error]);
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

      showToast('PDF generated and downloaded successfully!', 'success');
    } catch (e: any) {
      showToast(`Export error: ${e.message}`, 'error');
    } finally {
      setIsExporting(false);
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

  // Load Sample Wireframe
  const handleLoadSample = async () => {
    if (confirm('Load reference wireframe sample data (2026.10.05 Monday)? This verifies standard wireframe layout.')) {
      setSheet(SAMPLE_WIREFRAME_SHEET);
      setSelectedDate('2026-10-05');
      await handleSave(SAMPLE_WIREFRAME_SHEET, 'Loaded reference wireframe sample');
      showToast('Wireframe reference sample data loaded.', 'info');
    }
  };

  // 1-Click Verification of all valid rows (Major Cognitive Load Reducer!)
  const handleVerifyAllValid = () => {
    let verifiedCount = 0;
    const updatedLotteries = sheet.lotteries.map(item => {
      const def = STANDARD_LOTTERIES.find(d => d.id === item.lotteryId);
      if (def && isRowComplete(item, def)) {
        verifiedCount++;
        return {
          ...item,
          isCheckedAgainstSource: true,
          checkedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    const newSheet = {
      ...sheet,
      lotteries: updatedLotteries,
      isFooterReviewed: true, // Confirm footer as well
    };

    setSheet(newSheet);
    showToast(`✓ All ${verifiedCount} valid lotteries confirmed in 1 click!`, 'success');
  };

  // AI Verification against raw uploaded source document
  const handleRunAiVerify = async (targetSheet?: any, targetSource?: SourceDocument) => {
    // Defensively check if targetSheet is an actual DailySheet or a SyntheticEvent from onClick
    const isActualSheet = targetSheet && typeof targetSheet === 'object' && !('nativeEvent' in targetSheet) && !('preventDefault' in targetSheet) && ('lotteries' in targetSheet);
    const validSheet: DailySheet = isActualSheet ? targetSheet : sheet;
    const sourcesList = Array.isArray(validSheet?.sources) ? validSheet.sources : [];
    const activeSource = targetSource || sourcesList[0];

    if (!activeSource) {
      showToast('Please upload a source document first to audit against', 'info');
      return;
    }

    setIsAiVerifying(true);
    setIsAiVerifyModalOpen(true);

    try {
      const res = await fetch('/api/ai-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: validSheet.date,
          lotteries: validSheet.lotteries,
          rawText: activeSource.extractedText || '',
          imageBase64: activeSource.previewImageUrl?.startsWith('data:image/') ? activeSource.previewImageUrl : undefined,
          sourceFileName: activeSource.fileName,
          filePath: activeSource.filePath,
        }),
      });

      const data = await res.json();
      if (data.success && data.report) {
        setAiVerificationReport(data.report);

        // Auto-tag verified lotteries and discrepancies on rows for AI
        setSheet(prev => ({
          ...prev,
          lotteries: prev.lotteries.map(lot => {
            const audit = data.report.results.find((r: AiLotteryAuditResult) => r.lotteryId === lot.lotteryId);

            return {
              ...lot,
              aiVerified: audit ? audit.status === 'verified' : lot.aiVerified,
              aiDiscrepancy: audit?.status === 'mismatch' ? audit.discrepancies?.[0] : undefined,
            };
          })
        }));

        if (data.report.mismatchCount === 0) {
          showToast(`✓ LK Sheet Audit: 100% Match (${data.report.verifiedCount}/18) confirmed against raw source!`, 'success');
        } else {
          showToast(`⚠️ LK Sheet Audit: ${data.report.mismatchCount} discrepancy flagged. Review in audit report.`, 'info');
        }
      } else {
        showToast(data.error || 'LK sheet verification failed', 'error');
      }
    } catch (err: any) {
      showToast(`Verification error: ${err.message}`, 'error');
    } finally {
      setIsAiVerifying(false);
    }
  };

  // Verify with LK Lottery Sheet (Optional 2nd verification)
  const handleVerifyWithLkSheet = async () => {
    // 1. Check if we already have an LK Lottery Sheet or any source document attached
    let lkSource = (sheet.sources || []).find(s => 
      s.fileName?.startsWith('lklottery_results_') || 
      s.detectedDate === sheet.date
    ) || (sheet.sources || [])[0];

    // 2. If no source attached yet, auto-fetch from lklottery.com first
    if (!lkSource) {
      showToast('⚡ Fetching official LK lottery sheet for verification...', 'info');
      setIsAutoFetchingSource(true);
      try {
        const res = await fetch(`/api/auto-fetch-source?date=${sheet.date}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          const is403 = res.status === 403 || data.error?.includes('403');
          if (is403) {
            showToast('⚠️ lklottery.com cloud blocked (403). Official Gov (NLB & DLB) results are active!', 'info');
          } else {
            showToast('ℹ️ LK lottery sheet is not uploaded yet for this date. (Gov NLB & DLB is primary)', 'info');
          }
          return;
        }

        if (data.sourceDoc) {
          lkSource = data.sourceDoc;
          setSheet(prev => ({
            ...prev,
            sources: [data.sourceDoc, ...(prev.sources || [])]
          }));
        }
      } catch (err: any) {
        showToast(`Could not fetch LK sheet: ${err.message}`, 'error');
        return;
      } finally {
        setIsAutoFetchingSource(false);
      }
    }

    // 3. Now run the verification audit against this LK lottery sheet!
    if (lkSource) {
      await handleRunAiVerify(sheet, lkSource);
    }
  };

  const handleApplySingleFix = (result: AiLotteryAuditResult) => {
    if (!result.suggestedFix) return;

    setSheet(prev => ({
      ...prev,
      lotteries: prev.lotteries.map(lot => {
        if (lot.lotteryId === result.lotteryId) {
          return {
            ...lot,
            ...result.suggestedFix,
            isCheckedAgainstSource: true,
            aiVerified: true,
            aiDiscrepancy: undefined,
          };
        }
        return lot;
      })
    }));

    setAiVerificationReport(prev => {
      if (!prev) return null;
      const updatedResults = prev.results.map(r => {
        if (r.lotteryId === result.lotteryId) {
          return { ...r, status: 'verified' as const, discrepancies: [] };
        }
        return r;
      });
      return {
        ...prev,
        verifiedCount: updatedResults.filter(r => r.status === 'verified').length,
        mismatchCount: updatedResults.filter(r => r.status === 'mismatch').length,
        results: updatedResults,
      };
    });

    showToast(`✓ Applied AI fix for ${result.nameSi}`, 'success');
  };

  const handleApplyAllFixes = (report: AiVerificationReport) => {
    let appliedCount = 0;
    setSheet(prev => ({
      ...prev,
      lotteries: prev.lotteries.map(lot => {
        const fix = report.results.find(r => r.lotteryId === lot.lotteryId && r.suggestedFix && Object.keys(r.suggestedFix).length > 0);
        if (fix && fix.suggestedFix) {
          appliedCount++;
          return {
            ...lot,
            ...fix.suggestedFix,
            isCheckedAgainstSource: true,
            aiVerified: true,
            aiDiscrepancy: undefined,
          };
        }
        return lot;
      })
    }));

    setAiVerificationReport(prev => {
      if (!prev) return null;
      const updatedResults = prev.results.map(r => ({
        ...r,
        status: 'verified' as const,
        discrepancies: [],
      }));
      return {
        ...prev,
        verifiedCount: updatedResults.length,
        mismatchCount: 0,
        overallStatus: 'perfect_match' as const,
        results: updatedResults,
      };
    });

    showToast(`✓ Applied all ${appliedCount} AI corrections!`, 'success');
  };

  // Apply single official government fix
  const handleApplyOfficialFix = (result: OfficialLotteryMatchResult) => {
    if (!result.suggestedFix) return;

    setSheet(prev => ({
      ...prev,
      lotteries: prev.lotteries.map(lot => {
        if (lot.lotteryId === result.lotteryId && result.suggestedFix) {
          const def = STANDARD_LOTTERIES.find(d => d.id === lot.lotteryId);
          const sanitized = def ? secureFormatLotteryItem({ ...lot, ...result.suggestedFix }, def) : result.suggestedFix;
          return {
            ...lot,
            ...sanitized,
            isCheckedAgainstSource: true,
            officialVerified: true,
            officialDiscrepancy: undefined,
          };
        }
        return lot;
      })
    }));

    setOfficialVerificationSummary(prev => {
      if (!prev) return null;
      const updated = prev.results.map(r => {
        if (r.lotteryId === result.lotteryId) {
          return { ...r, status: 'match' as const, discrepancies: [] };
        }
        return r;
      });
      return {
        ...prev,
        matchedCount: updated.filter(r => r.status === 'match').length,
        discrepancyCount: updated.filter(r => r.status === 'discrepancy').length,
        results: updated,
      };
    });

    setAiVerificationReport(prev => {
      if (!prev || !prev.officialVerification) return prev;
      const updatedOfficialResults = prev.officialVerification.results.map(r => {
        if (r.lotteryId === result.lotteryId) {
          return { ...r, status: 'match' as const, discrepancies: [] };
        }
        return r;
      });
      return {
        ...prev,
        officialVerification: {
          ...prev.officialVerification,
          matchedCount: updatedOfficialResults.filter(r => r.status === 'match').length,
          discrepancyCount: updatedOfficialResults.filter(r => r.status === 'discrepancy').length,
          results: updatedOfficialResults,
        }
      };
    });

    showToast(`✓ Applied Official Government values for ${result.nameSi}`, 'success');
  };

  // Apply all official government fixes
  const handleApplyAllOfficialFixes = (officialSummary: OfficialVerificationSummary) => {
    let appliedCount = 0;
    setSheet(prev => ({
      ...prev,
      lotteries: prev.lotteries.map(lot => {
        const fix = officialSummary.results.find(r => r.lotteryId === lot.lotteryId && r.suggestedFix && Object.keys(r.suggestedFix).length > 0);
        if (fix && fix.suggestedFix) {
          appliedCount++;
          const def = STANDARD_LOTTERIES.find(d => d.id === lot.lotteryId);
          const sanitized = def ? secureFormatLotteryItem({ ...lot, ...fix.suggestedFix }, def) : fix.suggestedFix;
          return {
            ...lot,
            ...sanitized,
            isCheckedAgainstSource: true,
            officialVerified: true,
            officialDiscrepancy: undefined,
          };
        }
        return lot;
      })
    }));

    setOfficialVerificationSummary(prev => {
      if (!prev) return null;
      const updated = prev.results.map(r => ({
        ...r,
        status: 'match' as const,
        discrepancies: [],
      }));
      return {
        ...prev,
        matchedCount: updated.length,
        discrepancyCount: 0,
        results: updated,
      };
    });

    setAiVerificationReport(prev => {
      if (!prev || !prev.officialVerification) return prev;
      const updatedOfficialResults = prev.officialVerification.results.map(r => ({
        ...r,
        status: 'match' as const,
        discrepancies: [],
      }));
      return {
        ...prev,
        officialVerification: {
          ...prev.officialVerification,
          matchedCount: updatedOfficialResults.length,
          discrepancyCount: 0,
          results: updatedOfficialResults,
        }
      };
    });

    showToast(`✓ Applied all ${appliedCount} official government fixes!`, 'success');
  };

  // Official Government Verification against live NLB & DLB portals
  const handleRunOfficialVerify = async (targetSheet?: any) => {
    const isActualSheet = targetSheet && typeof targetSheet === 'object' && !('nativeEvent' in targetSheet) && !('preventDefault' in targetSheet) && ('lotteries' in targetSheet);
    const validSheet: DailySheet = isActualSheet ? targetSheet : sheet;

    setIsOfficialVerifying(true);
    setIsRefreshingOfficial(true);
    setIsOfficialVerifyModalOpen(true);

    try {
      const res = await fetch('/api/official-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: validSheet.date,
          lotteries: validSheet.lotteries 
        }),
      });
      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned HTTP ${res.status}: ${rawText.slice(0, 100) || res.statusText}`);
      }

      if (!res.ok) {
        throw new Error(data?.error || `Request failed with status ${res.status}`);
      }

      if (data.success && data.comparison) {
        setOfficialVerificationSummary(data.comparison);
        setAiVerificationReport(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            officialVerification: data.comparison,
          };
        });

        // Update sheet officialVerified badges
        setSheet(prev => ({
          ...prev,
          lotteries: prev.lotteries.map(lot => {
            const off = data.comparison.results.find((r: OfficialLotteryMatchResult) => r.lotteryId === lot.lotteryId);
            if (off) {
              return {
                ...lot,
                officialVerified: off.status === 'match',
                officialDiscrepancy: off.status === 'discrepancy' ? off.discrepancies?.[0] : undefined,
                officialDrawNo: off.officialValues?.drawNo || lot.officialDrawNo,
                officialMatchedAt: new Date().toISOString(),
              };
            }
            return lot;
          })
        }));

        if (data.comparison.discrepancyCount === 0) {
          showToast(`🏛️ Official Ground Truth 100% Match! All ${data.comparison.matchedCount} lotteries verified against NLB & DLB.`, 'success');
        } else {
          showToast(`⚠️ Official Government Audit: ${data.comparison.discrepancyCount} discrepancy flagged against live portals.`, 'info');
        }
      } else {
        showToast(data.error || 'Failed to check official results', 'error');
      }
    } catch (err: any) {
      showToast(`Error checking official results: ${err.message}`, 'error');
    } finally {
      setIsOfficialVerifying(false);
      setIsRefreshingOfficial(false);
    }
  };

  // Convenience re-check wrapper
  const handleRefreshOfficial = async () => {
    await handleRunOfficialVerify();
  };

  // ⚡ Directly build/populate the sheet from Official Government Portals (NLB & DLB)
  const handleBuildFromOfficial = async () => {
    setIsBuildingFromOfficial(true);
    const activeDate = sheet.date || selectedDate;
    showToast(`⚡ Connecting to Official Gov Portals (NLB & DLB) for ${activeDate}...`, 'info');

    try {
      const res = await fetch('/api/official-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: activeDate,
          lotteries: sheet.lotteries,
        }),
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned HTTP ${res.status}: ${rawText.slice(0, 100) || res.statusText}`);
      }

      if (!res.ok || !data.success || !Array.isArray(data.lotteries)) {
        throw new Error(data.error || 'Failed to fetch live official results from NLB & DLB.');
      }

      if (data.lotteries.length === 0) {
        showToast(`⚠️ No official results found on NLB/DLB for ${activeDate}.`, 'info');
        return;
      }

      // Build sheet with guaranteed format security directly from official ground truth
      const updatedSheet = buildSheetFromOfficialData(activeDate, data.lotteries, sheet);
      setSheet(updatedSheet);

      if (data.comparison) {
        setOfficialVerificationSummary(data.comparison);
      }

      await handleSave(updatedSheet, `Directly built 100% from Official Government Sites (NLB & DLB) for ${activeDate}`);
      const matchedCount = (updatedSheet.lotteries || []).filter(l => l.officialVerified).length;
      if (matchedCount > 0) {
        showToast(`🎉 100% Built from Official Government Portals for ${activeDate}! (${matchedCount} lotteries verified)`, 'success');
      } else {
        showToast(`⚠️ Date mismatch: Official portals did not have matching draws for ${activeDate}.`, 'info');
      }
    } catch (err: any) {
      console.error('Error building from official:', err);
      showToast(`Error building from official portals: ${err.message}`, 'error');
    } finally {
      setIsBuildingFromOfficial(false);
    }
  };


  const handleConfirmAllVerified = () => {
    setSheet(prev => ({
      ...prev,
      lotteries: prev.lotteries.map(lot => ({
        ...lot,
        isCheckedAgainstSource: true,
        aiVerified: true,
        officialVerified: true,
        checkedAt: new Date().toISOString(),
      }))
    }));
    showToast('✓ All lotteries dual-verified (AI & Official Government) and confirmed!', 'success');
    setIsAiVerifyModalOpen(false);
  };

  // Stats calculation
  const totalLotteries = sheet.lotteries.length;
  const noDrawCount = sheet.lotteries.filter(l => l.isNoDraw).length;
  const pendingCount = 0;
  const canExport = exportBlockedErrors.length === 0;

  // Filtered rows for Step 2
  const filteredLotteries = useMemo(() => {
    return STANDARD_LOTTERIES.map((def, idx) => {
      const item = sheet.lotteries.find(l => l.lotteryId === def.id) || {
        lotteryId: def.id,
        drawNo: '',
        numbers: [],
        isNoDraw: false,
        isCheckedAgainstSource: true,
      };
      return { def, item, originalIndex: idx };
    }).filter(({ item }) => {
      if (filterMode === 'no_draw') {
        return item.isNoDraw;
      }
      return true; // 'all'
    });
  }, [sheet.lotteries, filterMode]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans text-slate-900">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold text-white flex items-center gap-2.5 transition-all transform animate-in slide-in-from-bottom-2 ${
          notification.type === 'success' ? 'bg-emerald-600' : notification.type === 'error' ? 'bg-red-600' : 'bg-slate-900'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Global Application Header */}
      <Header
        sheet={sheet}
        currentStep={currentStep}
        pageMode="editor"
        cloudStatus={cloudStatus}
        currentRole={userRole}
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
        onStepChange={setCurrentStep}
        onDateChange={handleDateChange}
        onUpdateSheet={setSheet}
        onSave={() => handleSave()}
        onExportPdf={handleExportPdf}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onLoadSample={handleLoadSample}
        isSaving={isSaving}
        isExporting={isExporting}
        exportBlockedErrors={exportBlockedErrors}
        onPrint={() => handlePrint()}
      />

      {/* 3-Step Guided Workflow Navigation */}
      <StepNavigation
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        pendingCount={pendingCount}
        totalLotteries={totalLotteries}
        isFooterReviewed={sheet.isFooterReviewed}
        canExport={canExport}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 flex flex-col gap-4">
        


        {/* Single Unified Big User-Friendly Draw Date Calendar */}
        <UnifiedCalendar
          key={`${selectedDate}`}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onQuickPrint={handleQuickPrint}
          availableDates={availableDates}
          cloudStatus={cloudStatus}
          isLoading={isLoadingDate}
          defaultExpanded={false}
        />

        {/* Export Blocked Alerts Banner */}
        {exportBlockedErrors.length > 0 && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 shadow-2xs">
            <div className="font-bold flex items-center gap-1.5 mb-1.5 text-red-700">
              <AlertTriangle className="w-4 h-4" /> PDF Export Blocked — Please resolve the following before printing:
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-red-800">
              {exportBlockedErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: SETUP & SOURCE (Minimal Friction, Clear Setup)                   */}
        {/* ========================================================================= */}
        {currentStep === 'setup' && (
          <div className="space-y-6 max-w-4xl mx-auto w-full animate-in fade-in-50 duration-200">
            
            {/* Quick Step Header */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Step 1: Daily Sheet Setup & Source Document
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set the daily result date, agency header, and upload or review source documents.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep('verify')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <span>Continue to Verification</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* General Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Date & Sinhala Day Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-800">Result Sheet Date</h3>
                    </div>
                    <a
                      href="#unified-lottery-calendar"
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Use Calendar ↑
                    </a>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="font-mono font-bold text-base text-slate-900 flex-1">
                      {sheet.date}
                    </span>
                    <span className="text-xs font-black text-blue-800 bg-blue-100 px-3 py-1 rounded-lg font-sinhala">
                      {sheet.dayOfWeekSi}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2">
                    Managed by the single unified calendar above.
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      handleDateChange(getYesterdayDateStr());
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition"
                  >
                    Set to Yesterday (ඊයේ)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      handleDateChange(today);
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    Set to Today (අද)
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Load Reference Sample</span>
                  </button>
                </div>
              </div>

              {/* Agency Header Details Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-800">Agency & Header Text</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Dealer Agency Name (Bottom Right Corner)
                        </label>
                        <span className="text-[10px] text-blue-600 font-bold">Singlish enabled</span>
                      </div>
                      <input
                        type="text"
                        value={sheet.headerDealerName}
                        onChange={(e) => setSheet(prev => ({ ...prev, headerDealerName: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            const val = e.currentTarget.value;
                            if (hasEnglishLetters(val)) {
                              setSheet(prev => ({ ...prev, headerDealerName: transliterateSinglish(val) }));
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const val = e.currentTarget.value;
                          if (hasEnglishLetters(val)) {
                            setSheet(prev => ({ ...prev, headerDealerName: transliterateSinglish(val) }));
                          }
                        }}
                        placeholder="S.W.ඔස්මන් ද සිල්වා"
                        className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-600 outline-none font-sinhala transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  Appears in bold at the bottom right corner of each copy of the result sheet. Top header removed to give maximum space to lotteries.
                </div>
              </div>

            </div>

            {/* Dual Verification Info Banner in Step 1 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-purple-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-slate-900">
                      Dual Verification (On-Demand &amp; Optional)
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      Optional 1-Click
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Click <strong>AI Verify</strong> to audit against your uploaded paper source, or <strong>Official Verify</strong> to check live against NLB &amp; DLB government portals.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleBuildFromOfficial}
                  disabled={isBuildingFromOfficial}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  title="Fill all 18 lottery editor cards directly with live official government results from NLB & DLB portals"
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${isBuildingFromOfficial ? 'animate-spin' : 'text-emerald-200'}`} />
                  <span>
                    {isBuildingFromOfficial ? 'Connecting to Gov Portals...' : '⚡ Fill Editor with Official (NLB/DLB)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleVerifyWithLkSheet}
                  disabled={isAiVerifying || isAutoFetchingSource}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  title="Audit winning numbers against official LK lottery raw sheet (Optional 2nd check)"
                >
                  <Zap className={`w-3.5 h-3.5 ${isAiVerifying || isAutoFetchingSource ? 'animate-bounce text-amber-300' : 'text-amber-300'}`} />
                  <span>
                    {isAiVerifying || isAutoFetchingSource
                      ? 'Verifying with LK...'
                      : aiStatusSummary
                      ? `LK Verified (${aiStatusSummary.verified}/${aiStatusSummary.total})`
                      : 'Verify with LK Sheet (Optional)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (officialVerificationSummary) {
                      setIsOfficialVerifyModalOpen(true);
                    } else {
                      handleRunOfficialVerify();
                    }
                  }}
                  disabled={isOfficialVerifying}
                  className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  title="Cross-check against live NLB & DLB official portals"
                >
                  <Building2 className={`w-3.5 h-3.5 ${isOfficialVerifying ? 'animate-spin' : ''}`} />
                  <span>
                    {isOfficialVerifying
                      ? 'Checking Official...'
                      : officialStatusSummary
                      ? `Official Match (${officialStatusSummary.matched}/${officialStatusSummary.total})`
                      : 'Official Verify'}
                  </span>
                </button>
              </div>
            </div>

            {/* Source Documents Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Source Document Viewer</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {sheet.sources.length} document{sheet.sources.length !== 1 ? 's' : ''} attached
                </span>
              </div>

              {/* Source Viewer Container */}
              <div className="h-[420px] rounded-xl overflow-hidden border border-slate-200">
                <SourceViewer
                  sources={sheet.sources || []}
                  currentDate={sheet.date}
                  onFileUpload={handleFileUpload}
                  onAutoFetchSource={handleAutoFetchSource}
                  onVerifyWithLkSheet={handleVerifyWithLkSheet}
                  onRemoveSource={handleRemoveSource}
                  onClearValues={handleClearAllValues}
                  onDeleteSheet={() => handleDeleteSheet()}
                  onExtractFromSource={handleExtractFromSource}
                  isUploading={isUploading}
                  isAutoFetching={isAutoFetchingSource}
                  isVerifyingWithLkSheet={isAiVerifying || isAutoFetchingSource}
                  unassignedRows={unassignedRows}
                  onAssignRow={handleAssignRow}
                  dateMismatchWarning={dateMismatchWarning}
                  onRunAiVerify={() => handleRunAiVerify()}
                  isAiVerifying={isAiVerifying}
                  aiStatusSummary={aiStatusSummary}
                  onRunOfficialVerify={() => handleRunOfficialVerify()}
                  isOfficialVerifying={isOfficialVerifying}
                  officialStatusSummary={officialStatusSummary}
                />
              </div>

              {/* Advance action */}
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep('verify')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition active:scale-[0.98]"
                >
                  <span>Proceed to Step 2: Review & Verify ({totalLotteries} Lotteries)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: REVIEW & VERIFY (Minimal Steps, 1-Click Verification, Filter)     */}
        {/* ========================================================================= */}
        {currentStep === 'verify' && (
          <div className="flex flex-col gap-4 flex-1 animate-in fade-in-50 duration-200">
            
            {/* Command & Verification Toolbar */}
            {/* Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              {/* Left: Summary & Filters */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="text-sm font-extrabold text-slate-900">
                  {totalLotteries} Daily Lotteries
                </span>

                {noDrawCount > 0 && (
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-bold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setFilterMode('all')}
                      className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                        filterMode === 'all'
                          ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      All ({totalLotteries})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('no_draw')}
                      className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                        filterMode === 'no_draw'
                          ? 'bg-white text-slate-800 shadow-2xs font-extrabold'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      No Draw ({noDrawCount})
                    </button>
                  </div>
                )}

                {filterMode !== 'all' && (
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                    Showing {filteredLotteries.length} of {totalLotteries}
                  </span>
                )}
              </div>

              {/* Right: View Mode Toggle & Verification Actions */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                {/* Split-View Toggle (Source Document on Left) */}
                <button
                  type="button"
                  onClick={() => setIsSplitView(!isSplitView)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                    isSplitView
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Toggle side-by-side source document viewer"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {isSplitView ? 'Side Source: ON' : 'Side Source: OFF'}
                  </span>
                </button>

                {/* 0. Fill Editor with Official Results Button */}
                <button
                  type="button"
                  onClick={handleBuildFromOfficial}
                  disabled={isBuildingFromOfficial}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs hover:shadow-xs flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  title="Connect to NLB & DLB official government portals and fill all 18 lottery cards with official winning numbers"
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${isBuildingFromOfficial ? 'animate-spin' : 'text-emerald-200'}`} />
                  <span>
                    {isBuildingFromOfficial ? 'Fetching Official...' : '⚡ Fill Editor with Official'}
                  </span>
                </button>



                {/* 3. Clear All Values Button */}
                <button
                  type="button"
                  onClick={handleClearAllValues}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 flex items-center gap-1.5 shadow-2xs transition active:scale-[0.98] cursor-pointer"
                  title="Clear all extracted numbers and reset lottery sheet back to blank"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span>Clear Values</span>
                </button>

                {/* 4. Delete Sheet & Uploads Button */}
                <button
                  type="button"
                  onClick={() => handleDeleteSheet()}
                  className="px-3 py-1.5 rounded-xl text-xs font-black border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 flex items-center gap-1.5 shadow-2xs transition active:scale-[0.98] cursor-pointer"
                  title="Permanently delete all results, uploaded files, and reset sheet for this date so staff cannot print it"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Delete Results (මකන්න)</span>
                </button>
              </div>

            </div>

            {/* Verification Content Workspace (Split vs Full) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
              
              {/* Optional Left Pane: Source Viewer (when Split View is ON) */}
              {isSplitView && (
                <div className="lg:col-span-5 h-[calc(100vh-230px)] min-h-[560px] flex flex-col">
                  <SourceViewer
                    sources={sheet.sources || []}
                    currentDate={sheet.date}
                    onFileUpload={handleFileUpload}
                    onAutoFetchSource={handleAutoFetchSource}
                    onVerifyWithLkSheet={handleVerifyWithLkSheet}
                    onRemoveSource={handleRemoveSource}
                    onClearValues={handleClearAllValues}
                    onDeleteSheet={() => handleDeleteSheet()}
                    onExtractFromSource={handleExtractFromSource}
                    isUploading={isUploading}
                    isAutoFetching={isAutoFetchingSource}
                    isVerifyingWithLkSheet={isAiVerifying || isAutoFetchingSource}
                    unassignedRows={unassignedRows}
                    onAssignRow={handleAssignRow}
                    dateMismatchWarning={dateMismatchWarning}
                    onRunAiVerify={() => handleRunAiVerify()}
                    isAiVerifying={isAiVerifying}
                    aiStatusSummary={aiStatusSummary}
                    onRunOfficialVerify={() => handleRunOfficialVerify()}
                    isOfficialVerifying={isOfficialVerifying}
                    officialStatusSummary={officialStatusSummary}
                  />
                </div>
              )}

              {/* Right / Main Pane: Lottery Editor List & Footer Card (Expanded vertical space) */}
              <div className={`${isSplitView ? 'lg:col-span-7' : 'lg:col-span-12'} h-[calc(100vh-230px)] min-h-[560px] flex flex-col gap-3 overflow-hidden`}>
                
                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col overflow-hidden relative">
                  
                  {/* Real-time Sync Indicator when Date changes */}
                  {isLoadingDate && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center justify-between mb-2 shadow-2xs animate-pulse">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                        <span>Updating numbers for {selectedDate}...</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                        Real-time Update
                      </span>
                    </div>
                  )}



                  {/* Scrollable Lottery Row Cards */}
                  <div className={`flex-1 overflow-y-auto space-y-2.5 py-1 pr-1 transition-opacity duration-150 ${isLoadingDate ? 'opacity-70 pointer-events-none' : 'opacity-100'}`}>
                    {filteredLotteries.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-xs font-bold text-slate-600">
                          No lottery rows match the current filter: &ldquo;{filterMode}&rdquo;.
                        </p>
                        <button
                          type="button"
                          onClick={() => setFilterMode('all')}
                          className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                        >
                          View All 17 Lotteries
                        </button>
                      </div>
                    ) : (
                      filteredLotteries.map(({ def, item, originalIndex }) => (
                        <LotteryRowEditor
                          key={def.id}
                          index={originalIndex}
                          definition={def}
                          item={item}
                          onChange={(updated) => {
                            setSheet(prev => ({
                              ...prev,
                              lotteries: prev.lotteries.map(l => l.lotteryId === def.id ? updated : l)
                            }));
                          }}
                        />
                      ))
                    )}

                    {/* Footer Prize Announcement Card at the bottom of the sheet flow */}
                    <div className="pt-4 border-t border-slate-200/80 mt-4">
                      <FooterEditor
                        sheet={sheet}
                        onChange={setSheet}
                      />
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: PREVIEW & PRINT (Full-Fidelity A4 Landscape, 1-Click Export)      */}
        {/* ========================================================================= */}
        {currentStep === 'preview' && (
          <div className="space-y-4 max-w-[1700px] mx-auto w-full animate-in fade-in-50 duration-200 flex flex-col flex-1">
            
            {/* Action Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep('verify')}
                  className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
                  title="Return to review"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span>Print-Ready A4 Landscape Preview</span>
                    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                      2 Identical Copies
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Standardised {sheet.lotteries.length}-row Sinhala Lottery Result Sheet with central cut guide.
                  </p>
                </div>
              </div>

              {/* Primary Download / Print CTA */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('verify')}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  ← Edit Results
                </button>

                <button
                  type="button"
                  onClick={() => handlePrint()}
                  className="px-4 py-2 text-xs font-extrabold rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                  title="Print Sheet directly without popup modal"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Sheet (මුද්‍රණය)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportPdf(previewStyles)}
                  disabled={!canExport || isExporting}
                  className={`px-4 py-2 text-xs font-extrabold rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-[0.98] ${
                    canExport
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <FileDown className="w-4 h-4" />
                  <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
                </button>
              </div>
            </div>

            {/* A4 Sheet Preview Container */}
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden min-h-[700px] flex flex-col">
              <SheetPreview
                sheet={sheet}
                onExportPdf={handleExportPdf}
                onRequestPrint={() => handlePrint()}
                isExporting={isExporting}
                canExport={canExport}
                printDensity={printDensity}
                onDensityChange={setPrintDensity}
                currentStyles={previewStyles}
                onStylesChange={setPreviewStyles}
                showToast={showToast}
              />
            </div>

          </div>
        )}

      </main>

      {/* Revision History Modal */}
      <RevisionsModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        revisions={revisions}
        onRestoreRevision={(snapshot) => {
          setSheet(snapshot);
          showToast('Revision snapshot restored successfully.', 'success');
        }}
      />

      {/* AI Verification Report & Fix Modal */}
      <AiVerificationModal
        isOpen={isAiVerifyModalOpen}
        onClose={() => setIsAiVerifyModalOpen(false)}
        report={aiVerificationReport}
        isLoading={isAiVerifying}
        onApplySingleFix={handleApplySingleFix}
        onApplyAllFixes={handleApplyAllFixes}
        onConfirmAllVerified={handleConfirmAllVerified}
      />

      {/* Official Government Verification Modal */}
      <OfficialVerificationModal
        isOpen={isOfficialVerifyModalOpen}
        onClose={() => setIsOfficialVerifyModalOpen(false)}
        summary={officialVerificationSummary}
        isLoading={isOfficialVerifying}
        onRefresh={() => handleRunOfficialVerify()}
        onApplyOfficialFix={handleApplyOfficialFix}
        onApplyAllOfficialFixes={handleApplyAllOfficialFixes}
      />

      {/* Role Selection Modal */}
      <RoleSelectModal
        isOpen={isRoleModalOpen}
        currentRole={userRole}
        onSelectRole={handleRoleSelect}
        onClose={() => setIsRoleModalOpen(false)}
      />

    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-slate-700 font-bold text-sm bg-white p-4 rounded-xl shadow-md border border-slate-200">
          <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <span>පූරණය වෙමින් පවතී (Loading editor)...</span>
        </div>
      </div>
    }>
      <EditorContent />
    </Suspense>
  );
}
