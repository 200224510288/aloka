/**
 * Serverless-compatible, pure-JavaScript PDF text extractor.
 * Uses pdfjs-dist directly without any native canvas, worker, or python dependencies.
 * Extracts Page 1 text while preserving layout lines and column tabs.
 */
// Polyfill DOMMatrix, ImageData, and Path2D in Node.js serverless runtimes (Vercel)
// where native canvas is absent, preventing "ReferenceError: DOMMatrix is not defined"
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true;
    isIdentity = true;
    constructor(init?: any) {
      if (Array.isArray(init) && init.length >= 6) {
        this.a = init[0]; this.b = init[1]; this.c = init[2];
        this.d = init[3]; this.e = init[4]; this.f = init[5];
      }
    }
    multiplySelf() { return this; }
    preMultiplySelf() { return this; }
    translate() { return this; }
    scale() { return this; }
    invertSelf() { return this; }
    transformPoint(p?: any) { return p || { x: 0, y: 0 }; }
  };
}

if (typeof (globalThis as any).ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageData {};
}

if (typeof (globalThis as any).Path2D === 'undefined') {
  (globalThis as any).Path2D = class Path2D {
    addPath() {}
  };
}

export async function extractTextFromPdfBuffer(fileBuffer: Buffer | Uint8Array): Promise<{
  text: string;
  totalFilePages: number;
}> {
  try {
    // Load worker in-memory and register on globalThis so pdfjs uses the main-thread
    // fake worker directly without needing file-system worker resolution on Vercel
    if (!(globalThis as any).pdfjsWorker) {
      try {
        // @ts-ignore
        const workerModule = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
        (globalThis as any).pdfjsWorker = workerModule;
      } catch (wErr) {
        console.warn('Worker import warning:', wErr);
      }
    }

    // Dynamically import pure JS legacy build of pdfjs-dist
    // @ts-ignore
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

    // Ensure data is a pure Uint8Array and NOT a Node.js Buffer, because pdfjs-dist v5
    // explicitly throws: "Please provide binary data as `Uint8Array`, rather than `Buffer`"
    const uint8 = (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileBuffer))
      ? new Uint8Array(fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength))
      : (fileBuffer instanceof Uint8Array ? fileBuffer : new Uint8Array(fileBuffer));

    // Disable worker and font face loading so it runs 100% reliably in serverless environments
    const loadingTask = pdfjs.getDocument({
      data: uint8,
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0,
    } as any);

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
