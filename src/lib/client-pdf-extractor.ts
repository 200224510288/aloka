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

/**
 * Renders Page 1 of a PDF in the browser into a high-resolution PNG data URL.
 * Provides instant raster preview with full zoom and pan capabilities,
 * avoiding browser iframe plugin restrictions and 404 issues.
 */
export async function renderPdfPageToDataUrl(
  input: Blob | File | ArrayBuffer | Uint8Array | string,
  scale = 1.5
): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    let data: Uint8Array | undefined;
    let url: string | undefined;

    if (typeof input === 'string') {
      if (input.startsWith('data:application/pdf;base64,')) {
        const base64 = input.split(',')[1];
        const binary = atob(base64);
        data = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          data[i] = binary.charCodeAt(i);
        }
      } else {
        url = input;
      }
    } else if (input instanceof Blob || input instanceof File) {
      const buffer = await input.arrayBuffer();
      data = new Uint8Array(buffer);
    } else if (input instanceof ArrayBuffer) {
      data = new Uint8Array(input);
    } else if (input instanceof Uint8Array) {
      data = input;
    }

    // @ts-ignore
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
    if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }

    const docParams: any = {
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0,
    };
    if (data) docParams.data = data;
    else if (url) docParams.url = url;
    else return null;

    const doc = await pdfjs.getDocument(docParams).promise;
    if (!doc || doc.numPages === 0) return null;

    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Failed to render PDF page to data URL:', err);
    return null;
  }
}

