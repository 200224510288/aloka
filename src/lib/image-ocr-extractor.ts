import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import { STANDARD_LOTTERIES } from './constants';

export interface ImageOcrResult {
  text: string;
  confidence: number;
  detectedRowCount?: number;
  detectedDate?: string;
  detectedDaySi?: string;
}

/**
 * Robust OCR extraction for lottery sheets uploaded as images (PNG, JPG, JPEG)
 * or scanned PDF raster images.
 * Specially optimized for:
 * 1. 18-row tabular Sinhala lottery sheets (e.g. dealer WhatsApp sheets / LK Lottery graphics).
 * 2. General lottery photo/image documents.
 */
export async function extractTextFromImageBuffer(imageBuffer: Buffer): Promise<ImageOcrResult> {
  try {
    // Auto-orient based on smartphone EXIF metadata
    const orientedBuffer = await sharp(imageBuffer)
      .rotate()
      .toBuffer();

    const meta = await sharp(orientedBuffer).metadata();
    const width = meta.width || 723;
    const height = meta.height || 1024;

    // Fast horizontal divider line detection
    const { data, info } = await sharp(orientedBuffer)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const lineYs: number[] = [];
    const xStart = Math.floor(info.width * 0.1);
    const xEnd = Math.floor(info.width * 0.9);
    const xCount = Math.max(1, xEnd - xStart);

    for (let y = 0; y < info.height; y++) {
      let darkCount = 0;
      for (let x = xStart; x < xEnd; x++) {
        const pixel = data[y * info.width + x];
        if (pixel < 180) darkCount++;
      }
      if (darkCount / xCount > 0.7) {
        lineYs.push(y);
      }
    }

    // Cluster adjacent line pixels into single divider center coordinates
    const dividers: number[] = [];
    let group: number[] = [];
    for (const y of lineYs) {
      if (group.length === 0 || y === group[group.length - 1] + 1) {
        group.push(y);
      } else {
        dividers.push(Math.round(group.reduce((a, b) => a + b, 0) / group.length));
        group = [y];
      }
    }
    if (group.length > 0) {
      dividers.push(Math.round(group.reduce((a, b) => a + b, 0) / group.length));
    }

    // Filter dividers that make up the main table (excluding top banner)
    const tableDividers = dividers.filter(y => y >= height * 0.06 && y <= height * 0.96);

    // Initialize Tesseract worker with Sinhala and English
    const worker = await Tesseract.createWorker(['sin', 'eng']);

    const extractedLines: string[] = [];
    let detectedDate = '';
    let detectedDaySi = '';

    // Check if this matches an 18-row tabular lottery sheet layout
    if (tableDividers.length >= 18) {
      // 1. Extract bottom Date and Day bar
      const bottomDividers = dividers.filter(y => y > height * 0.92);
      if (bottomDividers.length > 0) {
        try {
          const dateY = bottomDividers[0];
          const dateBuf = await sharp(orientedBuffer)
            .extract({
              left: Math.floor(width * 0.05),
              top: Math.min(height - 40, dateY + 2),
              width: Math.floor(width * 0.9),
              height: Math.min(45, height - dateY - 4)
            })
            .resize({ width: Math.floor(width * 1.8) })
            .greyscale()
            .normalise()
            .sharpen()
            .toBuffer();

          const { data: { text: dateRaw } } = await worker.recognize(dateBuf);
          const cleanDateLine = dateRaw.replace(/[\r\n]+/g, ' ').trim();
          
          const dateMatch = cleanDateLine.match(/\b(20\d{2})[.\/'\u2019-](0[1-9]|1[0-2])[.\/'\u2019-](0[1-9]|[12]\d|3[01])\b/);
          if (dateMatch) {
            detectedDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
          }

          if (cleanDateLine.includes('බදාදා')) detectedDaySi = 'බදාදා';
          else if (cleanDateLine.includes('සඳුදා')) detectedDaySi = 'සඳුදා';
          else if (cleanDateLine.includes('අඟහරුවාදා')) detectedDaySi = 'අඟහරුවාදා';
          else if (cleanDateLine.includes('බ්‍රහස්පතින්දා')) detectedDaySi = 'බ්‍රහස්පතින්දා';
          else if (cleanDateLine.includes('සිකුරාදා')) detectedDaySi = 'සිකුරාදා';
          else if (cleanDateLine.includes('සෙනසුරාදා')) detectedDaySi = 'සෙනසුරාදා';
          else if (cleanDateLine.includes('ඉරිදා')) detectedDaySi = 'ඉරිදා';

          if (cleanDateLine) {
            extractedLines.push(cleanDateLine);
          }
        } catch (dateErr) {
          console.warn('Error extracting date bar from image:', dateErr);
        }
      }

      // 2. Extract each of the 18 rows
      const rowCount = Math.min(18, tableDividers.length - 1);
      const splitX = Math.floor(width * 0.28); // boundary between name column and results column

      for (let r = 0; r < rowCount; r++) {
        const def = STANDARD_LOTTERIES[r];
        const top = tableDividers[r] + 2;
        const rowH = Math.max(10, (tableDividers[r + 1] - tableDividers[r]) - 4);

        try {
          // A. Left column: Name + Draw Number
          const leftBuf = await sharp(orientedBuffer)
            .extract({ left: Math.floor(width * 0.01), top, width: splitX, height: rowH })
            .resize({ width: splitX * 2 })
            .greyscale()
            .normalise()
            .sharpen()
            .toBuffer();

          const { data: { text: leftRaw } } = await worker.recognize(leftBuf);
          const cleanLeft = leftRaw.replace(/[\r\n]+/g, ' ').replace(/[|()]/g, '').trim();

          const drawTokens = cleanLeft.match(/\b\d{1,5}\b/g) || [];
          const detectedDraw = drawTokens.length > 0 ? drawTokens[drawTokens.length - 1] : '';

          // B. Right column: Results (Letter, Zodiac, Winning numbers, Bonus)
          const rightWidth = width - splitX - Math.floor(width * 0.02);
          const rightBuf = await sharp(orientedBuffer)
            .extract({ left: splitX, top, width: rightWidth, height: rowH })
            .resize({ width: rightWidth * 2 })
            .greyscale()
            .normalise()
            .sharpen()
            .threshold(160)
            .toBuffer();

          const { data: { text: rightRaw } } = await worker.recognize(rightBuf);
          let cleanRight = rightRaw.replace(/[\r\n]+/g, ' ').replace(/[|]/g, '').trim();

          // Fallback if right column was empty or faint: try full row
          if (!cleanRight || cleanRight.length < 2) {
            const fullRowBuf = await sharp(orientedBuffer)
              .extract({ left: Math.floor(width * 0.01), top, width: width - Math.floor(width * 0.02), height: rowH })
              .toBuffer();
            const { data: { text: fullRaw } } = await worker.recognize(fullRowBuf);
            cleanRight = fullRaw.replace(/[\r\n]+/g, ' ').replace(/[|]/g, '').trim();
          }

          // Format clean line: [Sinhala Name] [Draw No] [Results]
          const combinedRow = `${def.nameSi} ${detectedDraw} ${cleanRight}`.replace(/\s+/g, ' ').trim();
          extractedLines.push(combinedRow);
        } catch (rowErr) {
          console.warn(`Error extracting row ${r + 1} from image:`, rowErr);
        }
      }

      await worker.terminate();

      return {
        text: extractedLines.join('\n'),
        confidence: 95,
        detectedRowCount: rowCount,
        detectedDate,
        detectedDaySi,
      };
    }

    // General image fallback (non-tabular or photo layout)
    const processedBuffer = await sharp(orientedBuffer)
      .resize({ width: Math.min(2400, width * 2) })
      .greyscale()
      .normalise()
      .sharpen()
      .toBuffer();

    const { data: { text, confidence } } = await worker.recognize(processedBuffer);
    await worker.terminate();

    return {
      text: text.trim(),
      confidence: confidence || 80,
    };
  } catch (error: any) {
    console.error('extractTextFromImageBuffer failed:', error);
    return {
      text: '',
      confidence: 0,
    };
  }
}
