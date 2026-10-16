'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DailySheet, LotteryResultItem, RevisionRecord, UnassignedExtractedRow, LotteryDefinition, PreviewStyleOptions } from '@/types/lottery';
import { createEmptySheet, SAMPLE_WIREFRAME_SHEET, STANDARD_LOTTERIES, DAYS_OF_WEEK_SI, DEFAULT_STYLE_OPTIONS } from '@/lib/constants';
import { Header } from '@/components/Header';
import { StepNavigation, WorkflowStep } from '@/components/StepNavigation';
import { SourceViewer } from '@/components/SourceViewer';
import { LotteryRowEditor } from '@/components/LotteryRowEditor';
import { FooterEditor } from '@/components/FooterEditor';
import { SheetPreview } from '@/components/SheetPreview';
import { RevisionsModal } from '@/components/RevisionsModal';
import PrintModal from '@/components/PrintModal';
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
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Verification UX controls
  const [filterMode, setFilterMode] = useState<FilterType>('all');
  const [isSplitView, setIsSplitView] = useState<boolean>(true);
  const [printDensity, setPrintDensity] = useState<'eco' | 'high'>('eco');
  const [previewStyles, setPreviewStyles] = useState<PreviewStyleOptions | undefined>(undefined);
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

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

  // Fetch sheet by date
  const loadSheet = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/sheet?date=${date}`);
      const data = await res.json();
      if (data.success && data.sheet) {
        setSheet(data.sheet);
        setRevisions(data.revisions || []);
      } else {
        setSheet(createEmptySheet(date));
      }
    } catch (e) {
      console.error('Error loading sheet:', e);
      setSheet(createEmptySheet(date));
    }
  }, []);

  // Check URL query parameter on mount if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const dateParam = params.get('date');
      if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dateParam !== selectedDate) {
        setSelectedDate(dateParam);
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
      const url = new URL(window.location.href);
      url.searchParams.set('date', newDate);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Save current sheet
  const handleSave = async (sheetToSave?: DailySheet, summary = 'Updated lottery results') => {
    const targetSheet = sheetToSave || sheet;
    setIsSaving(true);
    setCloudStatus('syncing');
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
        } else {
          // Attempt client-side direct cloud save (shares active browser session if authenticated)
          try {
            const { saveSheetToCloud } = await import('@/lib/cloud-service');
            const clientCloud = await saveSheetToCloud(data.sheet);
            if (clientCloud.success) {
              setCloudStatus('synced');
              showToast('Saved locally & auto-synced to cloud!', 'success');
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
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('date', selectedDate);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Extracted data from ${file.name}!`, 'success');

        const newSources = [...sheet.sources, data.sourceDoc];
        
        const updatedLotteries = sheet.lotteries.map((existing) => {
          const match = data.extraction.matchedLotteries.find(
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
              isCheckedAgainstSource: false, // Reset confirmation upon new extract
            };
          }
          return existing;
        });

        if (data.extraction.dateMismatchWarning) {
          setDateMismatchWarning(data.extraction.dateMismatchWarning);
        }
        if (data.extraction.unassignedRows && data.extraction.unassignedRows.length > 0) {
          setUnassignedRows(prev => [...prev, ...data.extraction.unassignedRows]);
        }

        const newSheet: DailySheet = {
          ...sheet,
          sources: newSources,
          lotteries: updatedLotteries,
          footerAnnouncement: data.extraction.detectedFooterAnnouncement || sheet.footerAnnouncement,
        };

        setSheet(newSheet);
        await handleSave(newSheet, `Uploaded source document: ${file.name}`);
        // Advance to verify step if currently on setup
        if (currentStep === 'setup') {
          setCurrentStep('verify');
        }
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
            isCheckedAgainstSource: false,
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
        const errorData = await res.json();
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

  // Stats calculation
  const totalLotteries = sheet.lotteries.length;
  const checkedCount = sheet.lotteries.filter(l => l.isCheckedAgainstSource && !l.isNoDraw).length;
  const noDrawCount = sheet.lotteries.filter(l => l.isNoDraw).length;
  const pendingCount = totalLotteries - checkedCount - noDrawCount;
  const canExport = pendingCount === 0 && sheet.isFooterReviewed && exportBlockedErrors.length === 0;

  // Filtered rows for Step 2
  const filteredLotteries = useMemo(() => {
    return STANDARD_LOTTERIES.map((def, idx) => {
      const item = sheet.lotteries.find(l => l.lotteryId === def.id) || {
        lotteryId: def.id,
        drawNo: '',
        numbers: [],
        isNoDraw: false,
        isCheckedAgainstSource: false,
      };
      return { def, item, originalIndex: idx };
    }).filter(({ def, item }) => {
      if (filterMode === 'needs_attention') {
        return !item.isNoDraw && (!item.isCheckedAgainstSource || !isRowComplete(item, def));
      }
      if (filterMode === 'confirmed') {
        return item.isCheckedAgainstSource && !item.isNoDraw;
      }
      if (filterMode === 'no_draw') {
        return item.isNoDraw;
      }
      return true; // 'all'
    });
  }, [sheet.lotteries, filterMode, isRowComplete]);

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
        onPrint={() => setIsPrintModalOpen(true)}
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 flex flex-col">
        
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
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              
              {/* Left: Progress bar & status */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">
                      Verification Progress
                    </span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      pendingCount === 0 && sheet.isFooterReviewed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {checkedCount + noDrawCount}/{totalLotteries} Ready
                    </span>
                  </div>

                  {/* Visual progress bar */}
                  <div className="w-48 sm:w-64 h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5 border border-slate-200">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.round(((checkedCount + noDrawCount) / totalLotteries) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                {/* 1-Click Verify All Button (Massive Cognitive Relief!) */}
                <button
                  type="button"
                  onClick={handleVerifyAllValid}
                  className="ml-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                  title="Verify all 17 valid lottery rows in 1 click"
                >
                  <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>Verify All Valid</span>
                </button>
              </div>

              {/* Center / Right: Filter Chips & View Mode Toggle */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                
                {/* Filter Tabs */}
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
                    onClick={() => setFilterMode('needs_attention')}
                    className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                      filterMode === 'needs_attention'
                        ? 'bg-white text-amber-700 shadow-2xs'
                        : pendingCount > 0 ? 'text-amber-800 hover:text-amber-900 font-black' : 'hover:text-slate-900'
                    }`}
                  >
                    <span>Needs Attention</span>
                    {pendingCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                        {pendingCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterMode('confirmed')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      filterMode === 'confirmed'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Confirmed ({checkedCount})
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

                    <div className="flex items-center gap-2 text-xs">
                      {pendingCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilterMode('needs_attention')}
                          className="text-amber-700 hover:text-amber-900 font-bold underline text-[11px]"
                        >
                          Show {pendingCount} Pending Row{pendingCount !== 1 ? 's' : ''}
                        </button>
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
          <div className="space-y-4 max-w-6xl mx-auto w-full animate-in fade-in-50 duration-200 flex flex-col flex-1">
            
            {/* Action Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep('verify')}
                  className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition"
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
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  ← Edit Results
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-4 py-2 text-xs font-extrabold rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                  title="Open Print Dialog to select copies and printer"
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
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <FileDown className="w-4 h-4" />
                  <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
                </button>
              </div>
            </div>

            {/* A4 Sheet Preview Container */}
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs min-h-[600px] flex items-center justify-center">
              <SheetPreview
                sheet={sheet}
                onExportPdf={handleExportPdf}
                onRequestPrint={() => setIsPrintModalOpen(true)}
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

      {/* Direct Print Modal with Copies, Printer Preferences & Default Settings */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        sheet={sheet}
        styleOptions={previewStyles || DEFAULT_STYLE_OPTIONS}
        isReadyToExport={canExport}
        pendingCount={pendingCount}
        exportBlockedErrors={exportBlockedErrors}
        onVerifyAll={handleVerifyAllValid}
        onExportPdf={handleExportPdf}
        showToast={showToast}
      />

    </div>
  );
}
