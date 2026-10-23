import sharp from 'sharp';
import { createWorker, Worker } from 'tesseract.js';
import path from 'path';
import fs from 'fs';

let globalWorkerPromise: Promise<Worker | null> | null = null;

export const ocrDiagnosticInfo: {
  lastError: string | null;
  hasLocalModel: boolean;
  selectedLangPath: string;
  workerState: string;
  attempts: Record<string, any>;
} = {
  lastError: null,
  hasLocalModel: false,
  selectedLangPath: '',
  workerState: 'uninitialized',
  attempts: {},
};

async function getSharedWorker(): Promise<Worker | null> {
  if (!globalWorkerPromise) {
    globalWorkerPromise = (async () => {
      try {
        const localTessPath = path.join(process.cwd(), 'public', 'tessdata');
        const rootTessPath = process.cwd();
        let langPath: string = 'https://aloka-alpha.vercel.app/tessdata';
        let foundLocal = false;

        if (fs.existsSync(path.join(localTessPath, 'eng.traineddata'))) {
          langPath = localTessPath;
          foundLocal = true;
        } else if (fs.existsSync(path.join(rootTessPath, 'eng.traineddata'))) {
          langPath = rootTessPath;
          foundLocal = true;
        }

        ocrDiagnosticInfo.hasLocalModel = foundLocal;
        ocrDiagnosticInfo.selectedLangPath = langPath;

        const options: any = {
          cachePath: '/tmp',
          langPath,
        };

        // 12s ceiling for worker initialization
        let timer: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Tesseract worker initialization timeout')), 12000);
        });

        const workerPromise = createWorker('eng', 1, options);
        const worker = await Promise.race([workerPromise, timeoutPromise]);
        clearTimeout(timer!);

        await worker.setParameters({
          tessedit_char_whitelist: '0123456789',
          tessedit_pageseg_mode: '8' as any, // Single word mode for high accuracy on spaced lottery numbers
        });
        ocrDiagnosticInfo.workerState = 'ready';
        return worker;
      } catch (err: any) {
        ocrDiagnosticInfo.lastError = err?.message || String(err);
        ocrDiagnosticInfo.workerState = 'error';
        console.warn('[DLB Special OCR] Could not initialize Tesseract worker, skipping OCR:', err);
        return null;
      }
    })();
  }
  return globalWorkerPromise;
}

async function recognizeWithTimeout(worker: Worker, buffer: Buffer, timeoutMs = 2500): Promise<string> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<string>((_, reject) => {
    timer = setTimeout(() => reject(new Error('OCR recognition timeout')), timeoutMs);
  });
  const recPromise = worker.recognize(buffer).then(r => r.data.text);
  return Promise.race([recPromise, timeoutPromise]).finally(() => clearTimeout(timer));
}

/**
 * Extracts digits from a specified region of an image buffer
 * using pure dark pixel isolation to eliminate background patterns, colors, and divider lines.
 */
async function binarizeRegion(
  imageBuffer: Buffer,
  cropBox: { left: number; top: number; width: number; height: number },
  thresh = 55,
  scaleX = 1
): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer)
    .extract(cropBox)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const outData = Buffer.alloc(info.width * info.height);

  // Isolate pure dark pixels (digits are black, dividers and backgrounds are colored or white)
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    if (r < thresh && g < thresh && b < thresh) {
      outData[i] = 0; // Black
    } else {
      outData[i] = 255; // White
    }
  }

  // Clear thin edge border artifacts (outer 6 pixels)
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (x < 6 || x >= info.width - 6 || y < 6 || y >= info.height - 6) {
        outData[y * info.width + x] = 255;
      }
    }
  }

  return await sharp(outData, {
    raw: { width: info.width, height: info.height, channels: 1 }
  })
    .resize({ width: Math.round(info.width * scaleX), height: 250, fit: 'fill' })
    .withMetadata({ density: 300 })
    .extend({ top: 30, bottom: 30, left: 30, right: 30, background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();
}

/**
 * Robust OCR extraction for DLB Special Draw Images:
 * - Lagna Wasana: 5 digits (e.g. 46517)
 * - Shanida Wasana: 5 digits (e.g. 96427)
 * - Super Ball: 5 digits (e.g. 66574)
 * - Supiri Dhana Sampatha: 3 digits top + 3 digits bottom (e.g. 707 / 941)
 *
 * Guarantees zero blocking: never throws and never delays the response beyond timeout.
 */
export async function extractSpecialNumberFromDlbImage(
  imageUrl: string,
  lotteryId: string
): Promise<string | null> {
  const fullUrl = imageUrl.startsWith('http') ? imageUrl : `https://www.dlb.lk/${imageUrl.replace(/^\//, '')}`;
  ocrDiagnosticInfo.attempts[lotteryId] = {
    fullUrl,
    startedAt: new Date().toISOString(),
    status: 'starting',
  };

  try {
    const res = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.dlb.lk/result/2/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(6000),
    });

    ocrDiagnosticInfo.attempts[lotteryId].httpStatus = res.status;

    if (!res.ok) {
      ocrDiagnosticInfo.attempts[lotteryId].status = `http_error_${res.status}`;
      console.warn(`[DLB Special OCR] Failed to fetch image ${fullUrl}: HTTP ${res.status}`);
      return null;
    }

    const imageBuffer = Buffer.from(await res.arrayBuffer());
    ocrDiagnosticInfo.attempts[lotteryId].bufferLength = imageBuffer.length;

    const meta = await sharp(imageBuffer).metadata();
    const w = meta.width;
    const h = meta.height;
    if (!w || !h) {
      ocrDiagnosticInfo.attempts[lotteryId].status = 'invalid_image_meta';
      return null;
    }

    ocrDiagnosticInfo.attempts[lotteryId].dimensions = { w, h };

    const worker = await getSharedWorker();
    if (!worker) {
      ocrDiagnosticInfo.attempts[lotteryId].status = 'worker_unavailable';
      return null;
    }

    // 1. Lagna Wasana: 5 separate white squares horizontally centered
    if (lotteryId === 'lagna_wasana') {
      const crop = {
        left: Math.round(0.165 * w),
        top: Math.round(0.53 * h),
        width: Math.round(0.66 * w),
        height: Math.round(0.18 * h)
      };
      const processed = await binarizeRegion(imageBuffer, crop, 65, 1.4);
      const text = await recognizeWithTimeout(worker, processed, 2500);
      const digits = text.replace(/\D/g, '');
      const finalDigits = digits.length >= 5 ? digits.slice(0, 5) : (digits || null);
      if (ocrDiagnosticInfo.attempts[lotteryId]) {
        ocrDiagnosticInfo.attempts[lotteryId].status = finalDigits ? 'success' : 'no_digits';
        ocrDiagnosticInfo.attempts[lotteryId].result = finalDigits;
        ocrDiagnosticInfo.attempts[lotteryId].rawText = text;
      }
      return finalDigits;
    }

    // 2. Shanida Wasana & Super Ball: White rectangular 5-box grid at bottom right
    if (lotteryId === 'shanida_wasana' || lotteryId === 'super_ball') {
      const crop = {
        left: Math.round(0.40 * w),
        top: Math.round(0.57 * h),
        width: Math.round(0.48 * w),
        height: Math.round(0.24 * h)
      };
      const processed = await sharp(imageBuffer)
        .extract(crop)
        .resize({ height: 250 })
        .withMetadata({ density: 300 })
        .png()
        .toBuffer();

      const text = await recognizeWithTimeout(worker, processed, 2500);
      const digits = text.replace(/\D/g, '');
      const finalDigits = digits.length >= 5 ? digits.slice(-5) : (digits || null);
      if (ocrDiagnosticInfo.attempts[lotteryId]) {
        ocrDiagnosticInfo.attempts[lotteryId].status = finalDigits ? 'success' : 'no_digits';
        ocrDiagnosticInfo.attempts[lotteryId].result = finalDigits;
        ocrDiagnosticInfo.attempts[lotteryId].rawText = text;
      }
      return finalDigits;
    }

    // 3. Supiri Dhana Sampatha: Top box (3 digits) + Bottom box (3 digits) -> e.g. 707 / 941
    if (lotteryId === 'supiri_dhana_sampatha' || lotteryId === 'dhana_sampatha') {
      const cropTop = {
        left: Math.round(0.505 * w),
        top: Math.round(0.405 * h),
        width: Math.round(0.25 * w),
        height: Math.round(0.145 * h)
      };
      const cropBottom = {
        left: Math.round(0.505 * w),
        top: Math.round(0.745 * h),
        width: Math.round(0.25 * w),
        height: Math.round(0.145 * h)
      };

      const topBuf = await sharp(imageBuffer)
        .extract(cropTop)
        .resize({ height: 200 })
        .withMetadata({ density: 300 })
        .png()
        .toBuffer();

      const botBuf = await sharp(imageBuffer)
        .extract(cropBottom)
        .resize({ height: 200 })
        .withMetadata({ density: 300 })
        .png()
        .toBuffer();

      // Sequentially recognize to avoid worker concurrency collision
      const topText = await recognizeWithTimeout(worker, topBuf, 2000);
      const botText = await recognizeWithTimeout(worker, botBuf, 2000);

      const topDigits = topText.replace(/\D/g, '').slice(-3);
      const botDigits = botText.replace(/\D/g, '').slice(-3);

      let finalDigits: string | null = null;
      if (topDigits && botDigits) {
        finalDigits = `${topDigits} / ${botDigits}`;
      } else if (topDigits) {
        finalDigits = topDigits;
      }

      if (ocrDiagnosticInfo.attempts[lotteryId]) {
        ocrDiagnosticInfo.attempts[lotteryId].status = finalDigits ? 'success' : 'no_digits';
        ocrDiagnosticInfo.attempts[lotteryId].result = finalDigits;
        ocrDiagnosticInfo.attempts[lotteryId].topText = topText;
        ocrDiagnosticInfo.attempts[lotteryId].botText = botText;
      }
      return finalDigits;
    }

    return null;
  } catch (err: any) {
    if (ocrDiagnosticInfo.attempts[lotteryId]) {
      ocrDiagnosticInfo.attempts[lotteryId].status = 'exception';
      ocrDiagnosticInfo.attempts[lotteryId].error = err?.message || String(err);
    }
    console.warn(`[DLB Special OCR] Safe fallback for ${lotteryId}:`, err);
    return null;
  }
}
