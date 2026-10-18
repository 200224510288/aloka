/**
 * Client-side PDF text extractor running natively in the browser.
 * Extracts Page 1 text while preserving layout lines and column tabs.
 * Used as a guaranteed, instant fallback so extraction never relies solely on serverless lambdas.
 */

export async function extractTextFromPdfInBrowser(file: File): Promise<string> {
  if (typeof window === 'undefined') return '';

  try {
    const arrayBuffer = await file.arrayBuffer();

    // Use pdfjs-dist build suitable for browser environments
    // @ts-ignore
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs');

    if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }

    const doc = await pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0,
    } as any).promise;

    if (!doc || doc.numPages === 0) return '';

    const page = await doc.getPage(1);
    const textContent = await page.getTextContent();

    let lastY: number | null = null;
    let text = '';

    for (const item of textContent.items as any[]) {
      if (!item || typeof item.str !== 'string') continue;

      const y = item.transform ? item.transform[5] : null;

      if (lastY !== null && y !== null && Math.abs(y - lastY) > 5) {
        text += '\n';
      } else if (text.length > 0 && !text.endsWith('\n') && !text.endsWith(' ') && !text.endsWith('\t')) {
        text += '\t';
      }

      text += item.str;
      if (y !== null) {
        lastY = y;
      }
    }

    return text;
  } catch (err) {
    console.warn('Browser-side PDF extraction error:', err);
    return '';
  }
}
