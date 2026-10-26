import { DailySheet, PreviewStyleOptions } from '@/types/lottery';
import { generateSingleSlipHtml } from './html-generator';

export interface ImageShareResult {
  mode: 'native_share' | 'clipboard_web' | 'download_only';
  success: boolean;
  message?: string;
}

/**
 * Renders or fetches the high-definition PNG Blob for a Half-A4 (A5) single slip.
 * Triple-redundant:
 * 1. Server-side Chromium/Edge Playwright via /api/export-image (High accuracy, flawless fonts)
 * 2. Client-side html-to-image DOM render (Seamless offline/serverless fallback)
 */
export async function getHalfSheetImageBlob(
  sheet: DailySheet,
  styleOptions?: PreviewStyleOptions
): Promise<Blob> {
  // Strategy 1: Server-side high-precision render
  try {
    const res = await fetch('/api/export-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet, styleOptions }),
    });

    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 1000) {
        return blob;
      }
    }
  } catch (err) {
    console.warn('Server image render failed, trying client fallback:', err);
  }

  // Strategy 2: Client-side rendering fallback with html-to-image
  if (typeof window !== 'undefined') {
    const { toBlob } = await import('html-to-image');

    // Create a hidden rendering container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '148.5mm';
    container.style.height = '210mm';
    container.style.background = '#ffffff';
    container.style.zIndex = '-9999';
    container.style.overflow = 'hidden';

    // Insert full HTML content inside an iframe or direct sandbox
    const iframe = document.createElement('iframe');
    iframe.style.width = '148.5mm';
    iframe.style.height = '210mm';
    iframe.style.border = 'none';
    container.appendChild(iframe);
    document.body.appendChild(container);

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Could not access iframe document');

      iframeDoc.open();
      iframeDoc.write(generateSingleSlipHtml(sheet, styleOptions));
      iframeDoc.close();

      // Wait 300ms for fonts & images to render
      await new Promise(r => setTimeout(r, 350));

      const target = iframeDoc.querySelector('.slip-page') as HTMLElement || iframeDoc.body;
      const clientBlob = await toBlob(target, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
      });

      if (clientBlob) return clientBlob;
    } finally {
      document.body.removeChild(container);
    }
  }

  throw new Error('Failed to generate half-sheet image');
}

/**
 * Triggers direct download of the image file
 */
export function downloadImageBlob(blob: Blob, fileName: string): void {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

/**
 * Copies the PNG image directly to system clipboard
 */
export async function copyImageBlobToClipboard(blob: Blob): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.clipboard?.write) return false;
  try {
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch (err) {
    console.warn('Direct clipboard image write failed:', err);
    return false;
  }
}

/**
 * Smart WhatsApp Sharing:
 * - On Mobile / Web Share API Level 2 supported devices: Directly passes image file to native WhatsApp share sheet.
 * - On Desktop / Browsers without file share: Copies image to clipboard & launches WhatsApp Web so user can Ctrl+V paste.
 */
export async function shareHalfSheetToWhatsApp(
  blob: Blob,
  sheet: DailySheet
): Promise<ImageShareResult> {
  const fileName = `Lottery-Result-${sheet.date}.png`;
  const shareText = `ලොතරැයි ප්‍රතිඵල පත්‍රිකාව (${sheet.date}) - Sinhala Lottery Result Sheet`;

  // 1. Mobile & Web Share API Level 2 (Direct image attachment into WhatsApp)
  if (typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Lottery Results - ${sheet.date}`,
          text: shareText,
        });
        return {
          mode: 'native_share',
          success: true,
          message: 'WhatsApp එකට සාර්ථකව බෙදා ගන්නා ලදී (Shared to WhatsApp)',
        };
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return { mode: 'native_share', success: false, message: 'Share cancelled' };
      }
      console.warn('Native file share failed, falling back:', e);
    }
  }

  // 2. Desktop Fallback: Copy Image to Clipboard and Open WhatsApp Web
  const copied = await copyImageBlobToClipboard(blob);

  // Direct WhatsApp Web / mobile app link
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');

  return {
    mode: 'clipboard_web',
    success: true,
    message: copied
      ? 'පින්තූරය Copy විය! WhatsApp හි Paste (Ctrl+V) කර යවන්න (Image copied! Paste in WhatsApp).'
      : 'WhatsApp විවෘත විය. කරුණාකර පින්තූරය Attach කරන්න (WhatsApp opened. Please attach image).',
  };
}
