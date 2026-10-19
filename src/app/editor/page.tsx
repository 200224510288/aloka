'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { DateHistoryBar } from '@/components/DateHistoryBar';
import { transliterateSinglish, hasEnglishLetters } from '@/lib/singlish';
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
  RotateCcw
} from 'lucide-react';

function getYesterdayDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type FilterType = 'all' | 'needs_attention' | 'confirmed' | 'no_draw';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('verify');
  const [selectedDate, setSelectedDate] = useState<string>(() => getYesterdayDateStr());
  const [sheet, setSheet] = useState<DailySheet>(() => createEmptySheet(getYesterdayDateStr()));
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
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

  // AI Verification states
  const [isAiVerifyModalOpen, setIsAiVerifyModalOpen] = useState<boolean>(false);
  const [isAiVerifying, setIsAiVerifying] = useState<boolean>(false);
  const [aiVerificationReport, setAiVerificationReport] = useState<AiVerificationReport | null>(null);

  // Official Government Verification states
  const [isOfficialVerifyModalOpen, setIsOfficialVerifyModalOpen] = useState<boolean>(false);
  const [isOfficialVerifying, setIsOfficialVerifying] = useState<boolean>(false);
  const [isRefreshingOfficial, setIsRefreshingOfficial] = useState<boolean>(false);
  const [officialVerificationSummary, setOfficialVerificationSummary] = useState<OfficialVerificationSummary | null>(null);

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
    try {
      const res = await fetch(`/api/sheet?date=${date}`);
      const data = await res.json();
      if (data.success && data.sheet) {
        // Reconcile any placeholder sources from IndexedDB cache
        if (Array.isArray(data.sheet.sources)) {
          try {
            const { getCachedFile } = await import('@/lib/source-file-cache');
            const reconciledSources = await Promise.all(
              data.sheet.sources.map(async (s: any) => {
                if (!s.filePath || s.filePath.includes('Browser Session') || s.filePath.startsWith('[')) {
                  const cachedBlob = await getCachedFile(s.id, s.fileName);
                  if (cachedBlob) {
                    return {
                      ...s,
                      filePath: URL.createObjectURL(cachedBlob),
                    };
                  }
                }
                return s;
              })
            );
            data.sheet.sources = reconciledSources;
          } catch {}
        }

        setSheet(data.sheet);
        setRevisions(data.revisions || []);
        if (data.fromCloud) {
          setCloudStatus('synced');
        }
        if (data.availableDates && Array.isArray(data.availableDates)) {
          setAvailableDates(data.availableDates);
        }
        // Cache to browser localStorage
        try {
          localStorage.setItem(`sinhala_lottery_sheet_${date}`, JSON.stringify(data.sheet));
        } catch {}
      } else {
        if (data.availableDates && Array.isArray(data.availableDates)) {
          setAvailableDates(data.availableDates);
        }
        // Fallback to localStorage before empty sheet
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
    const targetSheet: DailySheet = {
      ...(sheetToSave || sheet),
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

      const formData = new FormData();
      formData.append('file', file);
      formData.append('date', selectedDate);
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
              selectedDate,
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

        if (matchedLotteries.length > 0) {
          showToast(`Successfully extracted ${matchedLotteries.length} lotteries from ${file.name}!`, 'success');
        } else {
          showToast(`Uploaded ${file.name}, but could not identify lottery results.`, 'error');
        }

        // Cache file in IndexedDB immediately for persistent browser preview across reloads
        if (data.sourceDoc?.id) {
          try {
            const { saveCachedFile } = await import('@/lib/source-file-cache');
            await saveCachedFile(data.sourceDoc.id, file.name, file);
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
          extractedText: data.sourceDoc?.extractedText || browserText,
        };

        const newSources = [...sheet.sources, clientSourceDoc];
        
        const updatedLotteries = sheet.lotteries.map((existing) => {
          const match = matchedLotteries.find(
            (m: any) => m.lotteryId === existing.lotteryId
          );
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
              sourceFileName: file.name,
              sourcePage: match.sourcePage || 1,
              extractionConfidence: match.extractionConfidence,
              isCheckedAgainstSource: true,
            };
          }
          return existing;
        });

        if (dateMismatchWarning) {
          setDateMismatchWarning(dateMismatchWarning);
        }
        if (unassignedRows && unassignedRows.length > 0) {
          setUnassignedRows(prev => [...prev, ...unassignedRows]);
        }

        const newSheet: DailySheet = {
          ...sheet,
          sources: newSources,
          lotteries: updatedLotteries,
          footerAnnouncement: detectedFooterAnnouncement || sheet.footerAnnouncement,
        };

        setSheet(newSheet);
        await handleSave(newSheet, `Uploaded source document: ${file.name}`);
        // Advance to verify step if currently on setup
        if (currentStep === 'setup') {
          setCurrentStep('verify');
        }

        // Document extracted - verification is optional and available on demand
        showToast('📄 Document extracted successfully! You can run AI or Official verification when ready.', 'success');
      } else {
        showToast(`Extraction failed: ${data.error}`, 'error');
      }
    } catch (e: any) {
      showToast(`Upload error: ${e.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle removing uploaded source document
  const handleRemoveSource = async (sourceId: string) => {
    const docToRemove = sheet.sources.find(s => s.id === sourceId);
    if (!docToRemove) return;

    if (!confirm(`Are you sure you want to remove source file "${docToRemove.fileName}"?`)) {
      return;
    }

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
      if (l.sourceFileName === docToRemove.fileName) {
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
    showToast(`Removed "${docToRemove.fileName}"`, 'info');

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
          showToast(`✓ AI Document Audit: 100% Match (${data.report.verifiedCount}/18) confirmed against raw source!`, 'success');
        } else {
          showToast(`⚠️ AI Document Audit: ${data.report.mismatchCount} discrepancy flagged. Review in audit report.`, 'info');
        }
      } else {
        showToast(data.error || 'AI verification failed', 'error');
      }
    } catch (err: any) {
      showToast(`AI verification error: ${err.message}`, 'error');
    } finally {
      setIsAiVerifying(false);
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
        if (lot.lotteryId === result.lotteryId) {
          return {
            ...lot,
            ...result.suggestedFix,
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
          return {
            ...lot,
            ...fix.suggestedFix,
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
      const data = await res.json();
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
        
        {/* Calendar, 4 Days Back History & Quick Print Hub */}
        <DateHistoryBar
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onQuickPrint={handleQuickPrint}
          availableDates={availableDates}
          cloudStatus={cloudStatus}
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
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-800">Result Sheet Date</h3>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <input
                      type="date"
                      value={sheet.date}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="bg-transparent font-bold text-sm text-slate-900 outline-none cursor-pointer flex-1"
                    />
                    <span className="text-xs font-black text-blue-800 bg-blue-100 px-3 py-1 rounded-lg font-sinhala">
                      {sheet.dayOfWeekSi}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2">
                    Date formatted as YYYY.MM.DD on the print-ready sheet.
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
                  onClick={() => {
                    if (aiVerificationReport) {
                      setIsAiVerifyModalOpen(true);
                    } else {
                      handleRunAiVerify();
                    }
                  }}
                  disabled={isAiVerifying || sheet.sources.length === 0}
                  className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  title={sheet.sources.length === 0 ? 'Upload a source document to verify with AI' : 'Audit extracted results against raw document with AI'}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAiVerifying ? 'animate-spin' : 'text-amber-300'}`} />
                  <span>
                    {isAiVerifying
                      ? 'AI Auditing...'
                      : aiStatusSummary
                      ? `AI Verified (${aiStatusSummary.verified}/${aiStatusSummary.total})`
                      : 'AI Verify'}
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Source Documents & Extraction</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {sheet.sources.length} document{sheet.sources.length !== 1 ? 's' : ''} attached
                </span>
              </div>

              {/* Source Viewer Container */}
              <div className="h-[420px] rounded-xl overflow-hidden border border-slate-200">
                <SourceViewer
                  sources={sheet.sources}
                  currentDate={sheet.date}
                  onFileUpload={handleFileUpload}
                  onRemoveSource={handleRemoveSource}
                  isUploading={isUploading}
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
              
              {/* Left: Summary */}
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-extrabold text-slate-900">
                  {totalLotteries} Daily Lotteries
                </span>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Direct Edit Mode
                </span>
              </div>

              {/* Right: Filter Chips & View Mode Toggle */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {noDrawCount > 0 && (
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setFilterMode('all')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        filterMode === 'all'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      All ({totalLotteries})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('no_draw')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        filterMode === 'no_draw'
                          ? 'bg-white text-slate-800 shadow-2xs'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      No Draw ({noDrawCount})
                    </button>
                  </div>
                )}

                {/* Split-View Toggle (Source Document on Left) */}
                <button
                  type="button"
                  onClick={() => setIsSplitView(!isSplitView)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition ${
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

                {/* 1. AI Verification Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (aiVerificationReport) {
                      setIsAiVerifyModalOpen(true);
                    } else {
                      handleRunAiVerify();
                    }
                  }}
                  disabled={isAiVerifying || sheet.sources.length === 0}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition active:scale-[0.98] cursor-pointer disabled:opacity-50 ${
                    isAiVerifying
                      ? 'bg-purple-100 text-purple-700 cursor-wait animate-pulse border border-purple-300'
                      : aiStatusSummary?.hasDiscrepancy
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
                      : aiStatusSummary?.verified
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                      : 'bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs'
                  }`}
                  title={sheet.sources.length === 0 ? 'Upload a source document to verify with AI' : 'Audit extracted results against raw document with AI'}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAiVerifying ? 'animate-spin text-purple-700' : aiStatusSummary ? 'text-amber-300' : 'text-purple-600'}`} />
                  <span>
                    {isAiVerifying
                      ? 'AI Auditing...'
                      : aiStatusSummary
                      ? aiStatusSummary.hasDiscrepancy
                        ? `AI Flagged (${aiStatusSummary.verified}/${aiStatusSummary.total})`
                        : `AI Verified (${aiStatusSummary.verified}/${aiStatusSummary.total})`
                      : 'AI Verify'}
                  </span>
                </button>

                {/* 2. Official Government Verification Button */}
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition active:scale-[0.98] cursor-pointer disabled:opacity-50 ${
                    isOfficialVerifying
                      ? 'bg-blue-100 text-blue-700 cursor-wait animate-pulse border border-blue-300'
                      : officialStatusSummary?.hasDiscrepancy
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200'
                      : officialStatusSummary?.matched
                      ? 'bg-blue-700 hover:bg-blue-800 text-white shadow-blue-200'
                      : 'bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                  }`}
                  title="Cross-check extracted results against live NLB & DLB official government results"
                >
                  <Building2 className={`w-3.5 h-3.5 ${isOfficialVerifying ? 'animate-spin text-blue-700' : officialStatusSummary ? 'text-white' : 'text-blue-600'}`} />
                  <span>
                    {isOfficialVerifying
                      ? 'Checking Official...'
                      : officialStatusSummary
                      ? officialStatusSummary.hasDiscrepancy
                        ? `Official Discrepancy (${officialStatusSummary.matched}/${officialStatusSummary.total})`
                        : `Official Match (${officialStatusSummary.matched}/${officialStatusSummary.total})`
                      : 'Official Verify'}
                  </span>
                </button>

                {/* Next Step Action */}
                <button
                  type="button"
                  onClick={() => setCurrentStep('preview')}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-[0.98]"
                >
                  <span>Preview & Print</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

              </div>

            </div>

            {/* Verification Content Workspace (Split vs Full) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
              
              {/* Optional Left Pane: Source Viewer (when Split View is ON) */}
              {isSplitView && (
                <div className="lg:col-span-5 h-[calc(100vh-175px)] min-h-[540px] flex flex-col">
                  <SourceViewer
                    sources={sheet.sources}
                    currentDate={sheet.date}
                    onFileUpload={handleFileUpload}
                    onRemoveSource={handleRemoveSource}
                    isUploading={isUploading}
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
              <div className={`${isSplitView ? 'lg:col-span-7' : 'lg:col-span-12'} h-[calc(100vh-175px)] min-h-[540px] flex flex-col gap-3 overflow-hidden`}>
                
                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col overflow-hidden">
                  
                  {/* List Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-extrabold text-slate-900">
                        {totalLotteries} Standard Lotteries
                      </h2>
                      {filterMode !== 'all' && (
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          Showing: {filteredLotteries.length} of {totalLotteries}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Lottery Row Cards */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
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
                  </div>

                  {/* Footer Prize Announcement Card */}
                  <div className="pt-2 border-t border-slate-100">
                    <FooterEditor
                      sheet={sheet}
                      onChange={setSheet}
                    />
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

    </div>
  );
}
