/**
 * Serverless-compatible, pure-JavaScript PDF text extractor.
 * Uses pdfjs-dist directly without any native canvas, worker, or python dependencies.
 * Extracts Page 1 text while preserving layout lines and column tabs.
 */
export async function extractTextFromPdfBuffer(fileBuffer: Buffer | Uint8Array): Promise<{
  text: string;
  totalFilePages: number;
}> {
  try {
    // Dynamically import pure JS legacy build of pdfjs-dist
    // @ts-ignore
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const uint8 = fileBuffer instanceof Uint8Array ? fileBuffer : new Uint8Array(fileBuffer);

    // Disable worker and eval so it runs 100% reliably in Vercel serverless functions
    const loadingTask = pdfjs.getDocument({
      data: uint8,
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0,
    });

    const doc = await loadingTask.promise;
    const totalFilePages = doc.numPages || 1;

    // Rule: strictly Page 1 only for daily lottery result sheets
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

    return {
      text,
      totalFilePages,
    };
  } catch (err: any) {
    console.error('Pure JS PDF text extraction failed:', err);
    throw err;
  }
}
