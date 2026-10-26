'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Loader2, 
  Sparkles,
  Smartphone
} from 'lucide-react';
import { DailySheet, PreviewStyleOptions } from '@/types/lottery';
import { 
  getHalfSheetImageBlob, 
  downloadImageBlob, 
  copyImageBlobToClipboard, 
  shareHalfSheetToWhatsApp 
} from '@/lib/share-image';

interface ExportImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: DailySheet;
  styleOptions?: PreviewStyleOptions;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function ExportImageModal({
  isOpen,
  onClose,
  sheet,
  styleOptions,
  showToast,
}: ExportImageModalProps) {
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  // Load / generate image when modal opens
  useEffect(() => {
    let active = true;
    if (isOpen) {
      setIsLoading(true);
      setImageBlob(null);
      setImageUrl(null);
      setIsCopied(false);

      getHalfSheetImageBlob(sheet, styleOptions)
        .then((blob) => {
          if (!active) return;
          setImageBlob(blob);
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
          setIsLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          console.error('Image load failed:', err);
          showToast?.('රූප රාමුව සෑදීමේ දෝෂයක් (Image generation error)', 'error');
          setIsLoading(false);
        });
    }

    return () => {
      active = false;
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [isOpen, sheet, styleOptions]);

  if (!isOpen) return null;

  // Handle Download
  const handleDownload = () => {
    if (!imageBlob) return;
    downloadImageBlob(imageBlob, `Lottery-Result-${sheet.date}.png`);
    showToast?.('පින්තූරය Download විය (PNG saved)', 'success');
  };

  // Handle Copy
  const handleCopy = async () => {
    if (!imageBlob) return;
    const ok = await copyImageBlobToClipboard(imageBlob);
    if (ok) {
      setIsCopied(true);
      showToast?.('පින්තූරය Clipboard එකට Copy විය (Image copied)', 'success');
      setTimeout(() => setIsCopied(false), 2500);
    } else {
      showToast?.('Copy කිරීමට නොහැකි විය (Copy failed)', 'error');
    }
  };

  // Handle WhatsApp Share
  const handleWhatsApp = async () => {
    if (!imageBlob) return;
    setIsSharing(true);
    try {
      const res = await shareHalfSheetToWhatsApp(imageBlob, sheet);
      if (res.success && res.message) {
        showToast?.(res.message, 'success');
      }
    } catch (err: any) {
      showToast?.('WhatsApp වෙත යැවීමේ දෝෂයක් (Share error)', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Simple & Minimal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>Half A4 Image</span>
                <span className="text-[11px] font-sinhala font-normal text-emerald-300">(ප්‍රතිඵල පත්‍රිකාව)</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {sheet.date} • A5 Single Slip • PNG
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slip Preview Body */}
        <div className="p-4 bg-slate-50 flex-1 overflow-y-auto flex flex-col items-center justify-center min-h-[320px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-12 text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
              <span className="text-xs font-semibold text-slate-600">Generating slip image...</span>
            </div>
          ) : imageUrl ? (
            <div className="w-full max-w-[280px] bg-white rounded-lg shadow-md border border-slate-300 overflow-hidden transition-all hover:shadow-lg">
              <img 
                src={imageUrl} 
                alt={`Lottery Result ${sheet.date}`}
                className="w-full h-auto block select-none pointer-events-none" 
              />
            </div>
          ) : (
            <div className="text-xs text-red-500 py-8">
              Failed to load preview
            </div>
          )}
        </div>

        {/* Minimal Action Footer */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-2">
          {/* Primary: WhatsApp Button */}
          <button
            type="button"
            onClick={handleWhatsApp}
            disabled={isLoading || isSharing || !imageBlob}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98] ${
              !isLoading && imageBlob
                ? 'bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-emerald-600/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSharing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.074-2.115-.515-1.745-.723-2.883-2.483-2.97-2.599-.088-.116-.708-.941-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z" />
              </svg>
            )}
            <span>Share via WhatsApp (වට්ස්ඇප් යවන්න)</span>
          </button>

          {/* Secondary Actions Row */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isLoading || !imageBlob}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                !isLoading && imageBlob
                  ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 active:scale-[0.98]'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              disabled={isLoading || !imageBlob}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                !isLoading && imageBlob
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 active:scale-[0.98]'
                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Copy Image</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
