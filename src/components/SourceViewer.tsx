'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FileText, Image as ImageIcon, ZoomIn, ZoomOut, Maximize2, RotateCcw, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Layers, ArrowRight, Trash2, X, RefreshCw, Sparkles, Building2, Zap, ExternalLink } from 'lucide-react';
import { SourceDocument, UnassignedExtractedRow } from '@/types/lottery';
import { STANDARD_LOTTERIES } from '@/lib/constants';
import { getCachedFile, getCachedFileRecord } from '@/lib/source-file-cache';
import { renderPdfPageToDataUrl } from '@/lib/client-pdf-extractor';

interface SourceViewerProps {
  sources: SourceDocument[];
  currentDate: string;
  onFileUpload: (file: File) => Promise<void>;
  onAutoFetchSource?: () => Promise<void> | void;
  onVerifyWithLkSheet?: () => Promise<void> | void;
  onRemoveSource?: (sourceId: string) => void;
  onClearValues?: () => void;
  onExtractFromSource?: (sourceId: string) => void | Promise<void>;
  isUploading: boolean;
  isAutoFetching?: boolean;
  isVerifyingWithLkSheet?: boolean;
  unassignedRows: UnassignedExtractedRow[];
  onAssignRow: (row: UnassignedExtractedRow, targetLotteryId: string) => void;
  dateMismatchWarning?: string;
  onRunAiVerify?: () => void;
  isAiVerifying?: boolean;
  aiStatusSummary?: { verified: number; total: number; hasDiscrepancy: boolean };
  onRunOfficialVerify?: () => void;
  isOfficialVerifying?: boolean;
  officialStatusSummary?: { matched: number; total: number; hasDiscrepancy: boolean };
  onDeleteSheet?: () => void;
}

export const SourceViewer: React.FC<SourceViewerProps> = ({
  sources,
  currentDate,
  onFileUpload,
  onAutoFetchSource,
  onVerifyWithLkSheet,
  onRemoveSource,
  onClearValues,
  onDeleteSheet,
  onExtractFromSource,
  isUploading,
  isAutoFetching,
  isVerifyingWithLkSheet,
  unassignedRows,
  onAssignRow,
  dateMismatchWarning,
  onRunAiVerify,
  isAiVerifying,
  aiStatusSummary,
  onRunOfficialVerify,
  isOfficialVerifying,
  officialStatusSummary,
}) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string>(sources[0]?.id || '');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hasImgError, setHasImgError] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'preview' | 'text'>('preview');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');
  const [pdfCanvasPreviewUrl, setPdfCanvasPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const directPdfUrl = useMemo(() => {
    if (!currentDate) return null;
    const parts = currentDate.split('-');
    if (parts.length !== 3) return null;
    const yyyy = parts[0];
    const mm = parts[1].padStart(2, '0');
    const dd = parts[2].padStart(2, '0');
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dateObj = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0));
    const dayName = DAY_NAMES[dateObj.getUTCDay()];
    return `https://lklottery.com/api/lklottery/lklottery_pdf_files/lklottery_results_Sinhala_${yyyy}${mm}${dd}_${dayName}.pdf`;
  }, [currentDate]);

  const prevFirstIdRef = useRef<string | undefined>(sources[0]?.id);

  // Auto sync active document when sources list changes or date changes
  useEffect(() => {
    if (sources.length === 0) {
      setSelectedSourceId('');
      prevFirstIdRef.current = undefined;
      return;
    }

    const cleanDateDigits = currentDate ? currentDate.replace(/-/g, '') : '';

    // 1. If a document in sources matches currentDate, ALWAYS select it!
    if (cleanDateDigits) {
      const exactMatch = sources.find(s => 
        s.detectedDate === currentDate || 
        (s.fileName && s.fileName.replace(/-/g, '').includes(cleanDateDigits))
      );
      if (exactMatch) {
        setSelectedSourceId(exactMatch.id);
        prevFirstIdRef.current = exactMatch.id;
        return;
      }
    }

    // 2. If first document changed (e.g. freshly auto-fetched or uploaded), switch to it
    if (sources[0]?.id && sources[0].id !== prevFirstIdRef.current) {
      setSelectedSourceId(sources[0].id);
      prevFirstIdRef.current = sources[0].id;
      return;
    }

    // 3. Fallback: ensure selectedSourceId exists in current sources
    const currentActiveExists = sources.some(s => s.id === selectedSourceId);
    if (!currentActiveExists && sources[0]?.id) {
      setSelectedSourceId(sources[0].id);
      prevFirstIdRef.current = sources[0].id;
    }
  }, [sources, selectedSourceId, currentDate]);

  const activeDoc = sources.find(s => s.id === selectedSourceId) || sources[0];

  const isPlaceholder = !activeDoc?.filePath ||
    activeDoc.filePath.includes('Browser Session') ||
    activeDoc.filePath.startsWith('[') ||
    (activeDoc.filePath.startsWith('blob:') && !pdfBlobUrl);

  // Resolve authentic Blob URLs and render raster preview for active document
  useEffect(() => {
    let isCancelled = false;
    let createdUrlToRevoke: string | null = null;

    // Immediately reset preview states when document or date switches to prevent ghost preview leaks
    setPdfBlobUrl('');
    setPdfCanvasPreviewUrl('');

    if (!activeDoc) {
      return;
    }

    async function resolveActiveDocument() {
      // Step 1: If activeDoc has a blob URL, check if it is alive in this current browser memory
      if (activeDoc.filePath && activeDoc.filePath.startsWith('blob:')) {
        let isAlive = false;
        try {
          const testRes = await fetch(activeDoc.filePath, { method: 'GET' });
          if (testRes.ok) isAlive = true;
        } catch {
          isAlive = false;
        }

        if (isAlive && !isCancelled) {
          setPdfBlobUrl(activeDoc.filePath);
          if (activeDoc.fileType === 'pdf') {
            const dataUrl = await renderPdfPageToDataUrl(activeDoc.filePath);
            if (!isCancelled && dataUrl) {
              setPdfCanvasPreviewUrl(dataUrl);
            }
          }
          return;
        }

        // Blob URL is dead (e.g. from previous session, reload, or cloud sync)
        console.warn('Source blob URL is expired/invalid:', activeDoc.filePath, 'Checking IndexedDB fallback...');
      }

      // Step 2: Check local IndexedDB cache for original file and pre-rendered preview
      try {
        const cached = await getCachedFileRecord(activeDoc.id, activeDoc.fileName);
        if (isCancelled) return;

        if (cached.previewDataUrl) {
          setPdfCanvasPreviewUrl(cached.previewDataUrl);
        }

        if (cached.blob) {
          const freshUrl = URL.createObjectURL(cached.blob);
          createdUrlToRevoke = freshUrl;
          setPdfBlobUrl(freshUrl);

          if (activeDoc.fileType === 'pdf' && !cached.previewDataUrl) {
            const dataUrl = await renderPdfPageToDataUrl(cached.blob);
            if (!isCancelled && dataUrl) {
              setPdfCanvasPreviewUrl(dataUrl);
            }
          }
          return;
        }
      } catch (idbErr) {
        console.warn('IndexedDB retrieval error:', idbErr);
      }

      // Step 3: Check server path (if it's a real HTTP or root path)
      if (
        activeDoc.filePath &&
        (activeDoc.filePath.startsWith('/') || (activeDoc.filePath.startsWith('http') && !activeDoc.filePath.startsWith('blob:')))
      ) {
        try {
          const res = await fetch(activeDoc.filePath, { method: 'HEAD' });
          if (!isCancelled && res.ok) {
            setPdfBlobUrl(activeDoc.filePath);
            if (activeDoc.fileType === 'pdf') {
              const dataUrl = await renderPdfPageToDataUrl(activeDoc.filePath);
              if (!isCancelled && dataUrl) {
                setPdfCanvasPreviewUrl(dataUrl);
              }
            }
            return;
          }
        } catch {}
      }

      // Step 4: Check base64 PDF data URL
      if (activeDoc.filePath?.startsWith('data:application/pdf;base64,')) {
        try {
          const base64 = activeDoc.filePath.split(',')[1];
          const byteCharacters = atob(base64);
          const byteNumbers = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const blob = new Blob([byteNumbers], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          createdUrlToRevoke = url;
          setPdfBlobUrl(url);

          const dataUrl = await renderPdfPageToDataUrl(blob);
          if (!isCancelled && dataUrl) {
            setPdfCanvasPreviewUrl(dataUrl);
          }
          return;
        } catch (b64Err) {
          console.warn('Failed to parse PDF data URL:', b64Err);
        }
      }

      // Step 5: File is not accessible locally or on server
      // Clear pdfBlobUrl to NEVER pass an invalid URL to an iframe
      if (!isCancelled) {
        setPdfBlobUrl('');
        setPdfCanvasPreviewUrl('');
        // Automatically default viewMode to 'text' so user immediately sees the verified OCR text
        if (activeDoc.extractedText) {
          setViewMode('text');
        }
      }
    }

    resolveActiveDocument();

    return () => {
      isCancelled = true;
      if (createdUrlToRevoke) URL.revokeObjectURL(createdUrlToRevoke);
    };
  }, [activeDoc?.id, activeDoc?.filePath, activeDoc?.fileType, activeDoc?.fileName]);

  // Reset image error state whenever active document changes
  useEffect(() => {
    setHasImgError(false);
  }, [activeDoc?.id, activeDoc?.filePath, activeDoc?.previewImageUrl, pdfCanvasPreviewUrl]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  // Build preview image URL for active document (Strictly Page 1)
  const getPreviewImageUrl = () => {
    if (!activeDoc) return null;
    if (activeDoc.fileName === 'result sheet wireframe.pdf') {
      return '/samples/sample_page_1.png';
    }
    // High-fidelity rendered PDF canvas data URL
    if (pdfCanvasPreviewUrl) {
      return pdfCanvasPreviewUrl;
    }
    // Pre-rendered raster image if provided
    if (activeDoc.previewImageUrl && !activeDoc.previewImageUrl.includes('Browser Session')) {
      return activeDoc.previewImageUrl;
    }
    // For PDFs without pre-rendered raster images, return null to show native PDF fallback
    if (activeDoc.fileType === 'pdf') {
      return null;
    }
    if (isPlaceholder) {
      return null;
    }
    return activeDoc.filePath;
  };

  const previewUrl = getPreviewImageUrl();

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      
      {/* Header bar */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-800">Source Document</h2>
          {sources.length > 0 && (
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
              {sources.length} file{sources.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Action button to verify with LK lottery sheet */}
          {(onVerifyWithLkSheet || onAutoFetchSource) && (
            <button
              type="button"
              onClick={onVerifyWithLkSheet || onAutoFetchSource}
              disabled={isAutoFetching || isUploading || isAiVerifying || isVerifyingWithLkSheet}
              title={`Verify numbers against official Sinhala raw sheet from lklottery.com for ${currentDate} (Optional 2nd check)`}
              className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-300 ${isAutoFetching || isAiVerifying || isVerifyingWithLkSheet ? 'animate-bounce' : ''}`} />
              <span>
                {isAutoFetching || isAiVerifying || isVerifyingWithLkSheet
                  ? 'Verifying with LK...'
                  : 'Verify with LK Sheet (Optional)'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isAutoFetching}
            className="px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Extracting...' : 'Upload File'}</span>
          </button>
        </div>
      </div>

      {/* Date Mismatch Banner if any */}
      {dateMismatchWarning && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 flex items-center gap-2 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Date Mismatch Detected:</span> {dateMismatchWarning}
          </div>
        </div>
      )}

      {/* Source selector tabs */}
      {sources.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-200 bg-slate-100 overflow-x-auto">
          {sources.map((doc) => {
            const isSelected = activeDoc?.id === doc.id;
            return (
              <div
                key={doc.id}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition border ${
                  isSelected
                    ? 'bg-white text-blue-700 shadow-2xs font-semibold border-slate-300 ring-1 ring-blue-500/20'
                    : 'text-slate-600 bg-slate-50 border-transparent hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSourceId(doc.id);
                    setCurrentPage(1);
                  }}
                  className="flex items-center gap-1.5 outline-none cursor-pointer"
                >
                  {doc.fileType === 'pdf' ? (
                    <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                  <span className="max-w-[130px] truncate">{doc.fileName}</span>
                </button>

                {onRemoveSource && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSource(doc.id);
                    }}
                    title={`Remove file "${doc.fileName}"`}
                    className="p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition ml-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 relative flex flex-col min-h-[350px] bg-slate-100 overflow-hidden">
        
        {sources.length === 0 ? (
          /* Empty dropzone */
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-300 hover:border-slate-400 m-3 rounded-2xl bg-white transition overflow-y-auto"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-2xs">
              <Upload className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Upload Sheet for Verification
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mb-3.5">
              Drag &amp; drop Sinhala result PDF or image to cross-check &amp; verify against official results
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isAutoFetching}
              className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-2 mb-4 disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Uploading...' : 'Browse Verification File'}</span>
            </button>

            {/* Optional 2nd Verification Section */}
            {(onVerifyWithLkSheet || onAutoFetchSource) && (
              <div className="pt-3 border-t border-slate-100 w-full max-w-xs flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Optional 2nd Verification
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onVerifyWithLkSheet || onAutoFetchSource}
                    disabled={isAutoFetching || isUploading || isAiVerifying || isVerifyingWithLkSheet}
                    className="px-3 py-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                    title={`Verify against raw Sinhala PDF from lklottery.com for ${currentDate}`}
                  >
                    <Zap className={`w-3.5 h-3.5 text-amber-500 ${isAutoFetching || isAiVerifying || isVerifyingWithLkSheet ? 'animate-bounce' : ''}`} />
                    <span>
                      {isAutoFetching || isAiVerifying || isVerifyingWithLkSheet
                        ? 'Verifying with LK...'
                        : 'Verify with LK Sheet (Optional)'}
                    </span>
                  </button>

                  {directPdfUrl && (
                    <a
                      href={directPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open raw PDF on lklottery.com in new tab"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <span className="text-[10px] text-slate-400">
                  Official Gov (NLB / DLB) is Primary Source
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Viewer content */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* View controls toolbar */}
            <div className="h-9 px-3 bg-white border-b border-slate-200 flex items-center justify-between gap-2 z-10">
              {/* Left: Page indicator & Mode toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 shrink-0">
                  <span
                    className="text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1"
                    title="Multi-page uploads strictly consider only Page 1 for extraction and display"
                  >
                    <span className="bg-blue-600 text-white text-[9px] px-1 py-0.2 rounded font-black uppercase tracking-wider">Page 1</span>
                    {activeDoc?.totalFilePages && activeDoc.totalFilePages > 1 && (
                      <span className="text-[10px] text-blue-700 font-bold">
                        of {activeDoc.totalFilePages}
                      </span>
                    )}
                  </span>
                </div>

                {/* View Mode Toggle */}
                {activeDoc?.extractedText && (
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setViewMode('preview')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition ${
                        viewMode === 'preview'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Document
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('text')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition ${
                        viewMode === 'text'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Extracted Text
                    </button>
                  </div>
                )}
              </div>

              {/* Action buttons & Zoom controls */}
              <div className="flex items-center gap-1.5">

                {onDeleteSheet && (
                  <button
                    type="button"
                    onClick={onDeleteSheet}
                    className="px-2 py-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md flex items-center gap-1 transition active:scale-95 cursor-pointer"
                    title="Permanently delete results and uploaded files for this date"
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                    <span>Delete Results (මකන්න)</span>
                  </button>
                )}

                {/* Zoom controls (only for image preview mode) */}
                {viewMode === 'preview' && previewUrl && !hasImgError && (
                  <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.2))}
                      className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-semibold text-slate-600 min-w-[34px] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.2))}
                      className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white"
                      title="Reset Zoom"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable image canvas / PDF viewer / Extracted Text */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100/70">
              {viewMode === 'text' && activeDoc?.extractedText ? (
                <div className="w-full h-full bg-white rounded-lg border border-slate-200 p-4 overflow-auto shadow-xs flex flex-col">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs">
                    <span className="font-bold text-slate-700">Raw Extracted OCR Text (Strictly Page 1)</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeDoc?.extractedText) {
                          navigator.clipboard.writeText(activeDoc.extractedText);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                    >
                      Copy All Text
                    </button>
                  </div>
                  <pre className="font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-text flex-1">
                    {activeDoc.extractedText}
                  </pre>
                </div>
              ) : previewUrl && !hasImgError ? (
                <div
                  className="transition-transform duration-100 origin-center shadow-lg bg-white rounded border border-slate-300"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={`Source document preview ${activeDoc?.fileName} page ${currentPage}`}
                    className="max-w-none w-auto max-h-[750px] object-contain select-none block"
                    onError={() => {
                      console.warn('Image preview failed to load, falling back to embedded PDF/file viewer:', previewUrl);
                      setHasImgError(true);
                    }}
                  />
                </div>
              ) : activeDoc?.fileType === 'pdf' && pdfBlobUrl && !isPlaceholder ? (
                /* Native PDF viewer fallback using authentic Blob/File URL */
                <div className="w-full h-full min-h-[550px] flex flex-col bg-white rounded-lg border border-slate-300 overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700">
                    <span className="font-semibold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Native PDF Viewer (Page 1)</span>
                    </span>
                    <a
                      href={pdfBlobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                    >
                      Open PDF in New Window ↗
                    </a>
                  </div>
                  <iframe
                    src={`${pdfBlobUrl}#page=1&toolbar=0&navpanes=0`}
                    title="Source PDF Document"
                    className="w-full flex-1 min-h-[500px] border-none"
                  />
                </div>
              ) : (
                /* Document file not accessible on this device (e.g. synced from cloud) */
                <div className="text-center p-6 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto my-auto flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 mb-1 truncate max-w-[320px]" title={activeDoc?.fileName}>
                    {activeDoc?.fileName}
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold mb-3">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>OCR Extracted &amp; Verified</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-4 leading-relaxed max-w-xs">
                    Original binary file was uploaded in another browser session. All winning numbers, letters, and OCR text have been verified from this document.
                  </p>
                  <div className="flex items-center gap-2">
                    {activeDoc?.extractedText && (
                      <button
                        type="button"
                        onClick={() => setViewMode('text')}
                        className="px-3.5 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-2xs"
                      >
                        View Raw OCR Text
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-2xs transition flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Attach Original File</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Unassigned Extracted Results Panel */}
      {unassignedRows.length > 0 && (
        <div className="border-t border-slate-200 bg-amber-50/50 p-3 max-h-48 overflow-y-auto">
          <div className="flex items-center gap-1.5 mb-2">
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <h4 className="text-xs font-bold text-amber-900">
              Unassigned Extracted Results ({unassignedRows.length})
            </h4>
          </div>
          <p className="text-[11px] text-amber-700 mb-2">
            The OCR extracted numbers from these rows, but the lottery name wasn&apos;t automatically matched. Click to assign:
          </p>

          <div className="space-y-1.5">
            {unassignedRows.map((row) => (
              <div
                key={row.id}
                className="bg-white p-2 rounded border border-amber-200 flex items-center justify-between text-xs"
              >
                <div className="truncate mr-2">
                  <span className="font-mono font-semibold text-slate-800">
                    {row.detectedDrawNo && `[Draw: ${row.detectedDrawNo}] `}
                    {row.detectedNumbers.join(' ')}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-2 block truncate">
                    Raw: {row.rawText}
                  </span>
                </div>

                <div className="shrink-0 flex items-center gap-1">
                  <select
                    className="text-[11px] font-sinhala border border-slate-300 rounded px-1 py-0.5 bg-white text-slate-800"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        onAssignRow(row, e.target.value);
                      }
                    }}
                  >
                    <option value="" disabled>Assign to lottery...</option>
                    {STANDARD_LOTTERIES.map((def) => (
                      <option key={def.id} value={def.id}>
                        {def.defaultOrder}. {def.nameSi}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
