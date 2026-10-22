import sharp from 'sharp';
import { createWorker, Worker } from 'tesseract.js';

let globalWorkerPromise: Promise<Worker> | null = null;

async function getSharedWorker(): Promise<Worker> {
  if (!globalWorkerPromise) {
    globalWorkerPromise = (async () => {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789',
        tessedit_pageseg_mode: '7' as any, // Single line mode
      });
      return worker;
    })();
  }
  return globalWorkerPromise;
}

/**
 * Extracts digits from a specified region of an image buffer
 * using pure dark pixel isolation to eliminate background patterns, colors, and divider lines.
 */
async function binarizeRegion(
  imageBuffer: Buffer,
  cropBox: { left: number; top: number; width: number; height: number },
  thresh = 55
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

  // Clear thin edge border artifacts (outer 3 pixels)
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (x < 3 || x >= info.width - 3 || y < 3 || y >= info.height - 3) {
        outData[y * info.width + x] = 255;
      }
    }
  }

  return await sharp(outData, {
    raw: { width: info.width, height: info.height, channels: 1 }
  })
    .resize({ width: info.width * 2, height: info.height * 2, kernel: 'nearest' })
    .extend({ top: 30, bottom: 30, left: 30, right: 30, background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();
}

/**
 * Robust OCR extraction for DLB Special Draw Images:
 * - Lagna Wasana: 5 digits (e.g. 49113)
 * - Shanida Wasana: 5 digits (e.g. 61027)
 * - Super Ball: 5 digits (e.g. 14525)
 * - Supiri Dhana Sampatha: 3 digits top + 3 digits bottom (e.g. 862 / 139)
 */
export async function extractSpecialNumberFromDlbImage(
  imageUrl: string,
  lotteryId: string
): Promise<string | null> {
  try {
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : `https://www.dlb.lk/${imageUrl.replace(/^\//, '')}`;
    const res = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[DLB Special OCR] Failed to fetch image ${fullUrl}: HTTP ${res.status}`);
      return null;
    }

    const imageBuffer = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(imageBuffer).metadata();
    const w = meta.width;
    const h = meta.height;
    if (!w || !h) return null;

    const worker = await getSharedWorker();

    // 1. Lagna Wasana: 5 separate white squares horizontally centered
    if (lotteryId === 'lagna_wasana') {
      const crop = {
        left: Math.round(0.16 * w),
        top: Math.round(0.53 * h),
        width: Math.round(0.68 * w),
        height: Math.round(0.18 * h)
      };
      const processed = await binarizeRegion(imageBuffer, crop, 70);
      const ret = await worker.recognize(processed);
      const digits = ret.data.text.replace(/\D/g, '');
      if (digits.length === 5) return digits;
      if (digits.length > 5) return digits.slice(0, 5);
      return digits || null;
    }

    // 2. Shanida Wasana & Super Ball: White rectangular 5-box grid at bottom right
    if (lotteryId === 'shanida_wasana' || lotteryId === 'super_ball') {
      const crop = {
        left: Math.round(0.38 * w),
        top: Math.round(0.56 * h),
        width: Math.round(0.52 * w),
        height: Math.round(0.26 * h)
      };
      const processed = await binarizeRegion(imageBuffer, crop, 70);
      const ret = await worker.recognize(processed);
      const digits = ret.data.text.replace(/\D/g, '');
      if (digits.length === 5) return digits;
      if (digits.length > 5) return digits.slice(0, 5);
      return digits || null;
    }

    // 3. Supiri Dhana Sampatha: Top box (3 digits) + Bottom box (3 digits) -> e.g. 862 / 139
    if (lotteryId === 'dhana_sampatha') {
      const cropTop = {
        left: Math.round(0.50 * w),
        top: Math.round(0.39 * h),
        width: Math.round(0.25 * w),
        height: Math.round(0.17 * h)
      };
      const cropBottom = {
        left: Math.round(0.50 * w),
        top: Math.round(0.73 * h),
        width: Math.round(0.25 * w),
        height: Math.round(0.17 * h)
      };

      const [topBuf, botBuf] = await Promise.all([
        binarizeRegion(imageBuffer, cropTop, 50),
        binarizeRegion(imageBuffer, cropBottom, 50)
      ]);

      const [topRet, botRet] = await Promise.all([
        worker.recognize(topBuf),
        worker.recognize(botBuf)
      ]);

      const topDigits = topRet.data.text.replace(/\D/g, '').slice(0, 3);
      const botDigits = botRet.data.text.replace(/\D/g, '').slice(0, 3);

      if (topDigits && botDigits) {
        return `${topDigits} / ${botDigits}`;
      } else if (topDigits) {
        return topDigits;
      }
      return null;
    }

    return null;
  } catch (err) {
    console.error(`[DLB Special OCR] Error extracting special number for ${lotteryId}:`, err);
    return null;
  }
}
