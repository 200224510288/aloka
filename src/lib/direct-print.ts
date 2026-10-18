import { DailySheet, PreviewStyleOptions } from '@/types/lottery';
import { generatePrintHtml, validateSheetForPrint } from './html-generator';
import { DEFAULT_STYLE_OPTIONS } from './constants';

export interface DirectPrintOptions {
  styleOptions?: PreviewStyleOptions;
  copies?: number;
  onSuccess?: (msg: string) => void;
  onError?: (err: string) => void;
}

export function directPrintSheet(
  sheet: DailySheet,
  options?: DirectPrintOptions
): boolean {
  if (typeof window === 'undefined') return false;

  try {
    let copies = options?.copies || 1;
    if (!options?.copies) {
      try {
        const saved = localStorage.getItem('sinhala_lottery_print_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.copies && typeof parsed.copies === 'number') {
            copies = Math.max(1, Math.min(50, parsed.copies));
          }
        }
      } catch {}
    }

    const validation = validateSheetForPrint(sheet);
    if (!validation.isValid) {
      options?.onError?.(validation.errors[0] || 'Please ensure sheet data is valid before printing.');
      return false;
    }

    const activeStyles: PreviewStyleOptions = {
      ...DEFAULT_STYLE_OPTIONS,
      ...(options?.styleOptions || {}),
      printDensity: options?.styleOptions?.printDensity || 'eco',
    };

    const html = generatePrintHtml(sheet, activeStyles, copies);

    let printFrame = document.getElementById('lottery-direct-print-frame') as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'lottery-direct-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.left = '-9999px';
      printFrame.style.top = '-9999px';
      printFrame.style.width = '297mm';
      printFrame.style.height = '210mm';
      printFrame.style.border = '0';
      printFrame.style.visibility = 'hidden';
      printFrame.style.zIndex = '-9999';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!frameDoc) {
      window.print();
      return true;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    // Give iframe webfonts and styles a moment to settle, then invoke native print
    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        options?.onSuccess?.('Print dialog opened.');
      } catch (err: any) {
        console.error('Print frame focus/print error:', err);
        window.print();
      }
    }, 350);

    return true;
  } catch (err: any) {
    console.error('Direct print failed:', err);
    options?.onError?.(`Print error: ${err?.message || err}`);
    return false;
  }
}
