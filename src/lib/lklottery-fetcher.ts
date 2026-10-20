import { extractTextFromPdfBuffer } from './pdf-text-extractor';
import { extractLotteryDataFromText, ExtractionResult } from './extractor';

export interface LkLotteryCatalogItem {
  date: string;
  si_results_pdf_url: string;
  en_results_pdf_url?: string;
}

export interface LkLotteryFetchResult {
  success: boolean;
  date: string;
  pdfUrl?: string;
  fileName?: string;
  buffer?: Buffer;
  text?: string;
  totalFilePages?: number;
  extraction?: ExtractionResult;
  error?: string;
  availableDates?: string[];
  latestDate?: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Predicts the standard LK Lottery PDF URL based on date conventions.
 * Example: 2026-10-19 (Monday) -> lklottery_results_Sinhala_20261019_Mon.pdf
 */
export function predictLkLotteryPdfUrl(dateStr: string): { url: string; fileName: string } {
  // Parse date components safely (YYYY-MM-DD)
  const parts = dateStr.trim().split('-');
  const yyyy = parts[0];
  const mm = parts[1].padStart(2, '0');
  const dd = parts[2].padStart(2, '0');
  
  // Determine day of week
  const dateObj = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0));
  const dayName = DAY_NAMES[dateObj.getUTCDay()];
  
  const fileName = `lklottery_results_Sinhala_${yyyy}${mm}${dd}_${dayName}.pdf`;
  const url = `https://lklottery.com/api/lklottery/lklottery_pdf_files/${fileName}`;
  return { url, fileName };
}

/**
 * Scrapes the live catalog of available PDF files from https://lklottery.com/pdf/
 */
export async function getLkLotteryCatalog(): Promise<LkLotteryCatalogItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch('https://lklottery.com/pdf/', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      next: { revalidate: 300 } // Cache for 5 minutes in Next.js
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[LkLottery] Failed to load catalog: HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();

    // Match var pdfArr = [...] in the page script
    const match = html.match(/var\s+pdfArr\s*=\s*(\[[\s\S]*?\]);/);
    if (!match || !match[1]) {
      console.warn('[LkLottery] Could not locate var pdfArr in page script');
      return [];
    }

    const rawList = JSON.parse(match[1]);
    if (Array.isArray(rawList)) {
      return rawList.map((item: any) => ({
        date: String(item.date || '').trim(),
        si_results_pdf_url: String(item.si_results_pdf_url || '').replace(/\\\//g, '/').trim(),
        en_results_pdf_url: item.en_results_pdf_url ? String(item.en_results_pdf_url).replace(/\\\//g, '/').trim() : undefined,
      })).filter(item => item.date && item.si_results_pdf_url);
    }

    return [];
  } catch (err: any) {
    clearTimeout(timeout);
    console.warn('[LkLottery] Error fetching catalog:', err?.message || err);
    return [];
  }
}

/**
 * Downloads and extracts the daily Sinhala lottery sheet from lklottery.com for a given date.
 */
export async function fetchAndExtractLkLotteryPdf(targetDate: string): Promise<LkLotteryFetchResult> {
  const normalizedDate = targetDate.trim();

  // Step 1: Look up in live catalog first
  let resolvedUrl = '';
  let resolvedFileName = '';
  let availableDates: string[] = [];

  try {
    const catalog = await getLkLotteryCatalog();
    if (catalog.length > 0) {
      availableDates = catalog.map(c => c.date);
      const match = catalog.find(item => item.date === normalizedDate);
      if (match?.si_results_pdf_url) {
        resolvedUrl = match.si_results_pdf_url;
        resolvedFileName = resolvedUrl.split('/').pop() || `lklottery_results_Sinhala_${normalizedDate.replace(/-/g, '')}.pdf`;
      }
    }
  } catch (catErr) {
    console.warn('[LkLottery] Catalog search error, falling back to predicted URL:', catErr);
  }

  // Step 2: If not in catalog, construct predicted URL
  if (!resolvedUrl) {
    const predicted = predictLkLotteryPdfUrl(normalizedDate);
    resolvedUrl = predicted.url;
    resolvedFileName = predicted.fileName;
  }

  // Step 3: Fetch the PDF binary
  const fetchController = new AbortController();
  const fetchTimeout = setTimeout(() => fetchController.abort(), 15000);

  let pdfBuffer: Buffer;
  try {
    const pdfRes = await fetch(resolvedUrl, {
      signal: fetchController.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://lklottery.com/pdf/',
      },
    });

    clearTimeout(fetchTimeout);

    if (!pdfRes.ok) {
      return {
        success: false,
        date: normalizedDate,
        error: `Could not retrieve PDF for ${normalizedDate} (HTTP ${pdfRes.status}). Sheet may not be uploaded to lklottery.com yet.`,
        availableDates: availableDates.slice(0, 7),
        latestDate: availableDates[0],
      };
    }

    const arrayBuf = await pdfRes.arrayBuffer();
    pdfBuffer = Buffer.from(arrayBuf);

    // Validate that it looks like a PDF (starts with %PDF)
    const header = pdfBuffer.slice(0, 5).toString('ascii');
    if (!header.startsWith('%PDF')) {
      return {
        success: false,
        date: normalizedDate,
        error: `Downloaded file for ${normalizedDate} is not a valid PDF document.`,
        availableDates: availableDates.slice(0, 7),
        latestDate: availableDates[0],
      };
    }
  } catch (fetchErr: any) {
    clearTimeout(fetchTimeout);
    return {
      success: false,
      date: normalizedDate,
      error: `Network error downloading PDF from lklottery: ${fetchErr?.message || fetchErr}`,
      availableDates: availableDates.slice(0, 7),
      latestDate: availableDates[0],
    };
  }

  // Step 4: Extract text using serverless-compatible extractor
  let extractedText = '';
  let totalFilePages = 1;

  try {
    const extractRes = await extractTextFromPdfBuffer(pdfBuffer);
    extractedText = extractRes.text;
    totalFilePages = extractRes.totalFilePages || 1;
  } catch (extractErr: any) {
    console.error('[LkLottery] PDF text extraction error:', extractErr);
    return {
      success: false,
      date: normalizedDate,
      pdfUrl: resolvedUrl,
      fileName: resolvedFileName,
      error: `Failed to extract text from PDF: ${extractErr?.message || extractErr}`,
    };
  }

  // Step 5: Extract structured lottery data
  const extraction = extractLotteryDataFromText(
    extractedText,
    normalizedDate,
    resolvedFileName,
    1
  );

  return {
    success: true,
    date: normalizedDate,
    pdfUrl: resolvedUrl,
    fileName: resolvedFileName,
    buffer: pdfBuffer,
    text: extractedText,
    totalFilePages,
    extraction,
    availableDates: availableDates.slice(0, 7),
    latestDate: availableDates[0],
  };
}
