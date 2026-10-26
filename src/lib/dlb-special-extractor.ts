import { execFileSync } from 'child_process';
import path from 'path';

// Immutable in-memory cache: a draw's special image result never changes once extracted
const extractedNumberCache = new Map<string, string>();

export const ocrDiagnosticInfo: {
  lastError: string | null;
  hasLocalModel: boolean;
  selectedLangPath: string;
  workerState: string;
  cacheSize: number;
  attempts: Record<string, any>;
} = {
  lastError: null,
  hasLocalModel: true,
  selectedLangPath: 'scripts/extract-dlb-special.mjs',
  workerState: 'ready',
  cacheSize: 0,
  attempts: {},
};

export async function getSharedWorker(): Promise<any> {
  return { status: 'external_process' };
}

/**
 * Robust OCR extraction for DLB Special Draw Images:
 * - Lagna Wasana: 5 digits (e.g. 81948)
 * - Shanida Wasana: 5 digits (e.g. 82025)
 * - Super Ball: 5 digits (e.g. 61346)
 * - Supiri Dhana Sampatha: 3 digits top + 3 digits bottom (e.g. 529 / 189)
 *
 * Runs via an isolated Node child process to prevent Turbopack native binary conflicts.
 * In-memory cache guarantees 0ms response on repeat requests.
 */
export async function extractSpecialNumberFromDlbImage(
  imageUrl: string,
  lotteryId: string
): Promise<string | null> {
  const fullUrl = imageUrl.startsWith('http') ? imageUrl : `https://www.dlb.lk/${imageUrl.replace(/^\//, '')}`;

  // Layer 1: In-memory result cache check (Instant 0ms response)
  if (extractedNumberCache.has(fullUrl)) {
    const cached = extractedNumberCache.get(fullUrl)!;
    ocrDiagnosticInfo.attempts[lotteryId] = {
      fullUrl,
      status: 'cache_hit',
      result: cached,
    };
    return cached;
  }

  ocrDiagnosticInfo.attempts[lotteryId] = {
    fullUrl,
    startedAt: new Date().toISOString(),
    status: 'starting',
  };

  try {
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'extract-dlb-special.mjs');
    const stdout = execFileSync(process.execPath, [scriptPath, fullUrl, lotteryId], {
      timeout: 15000,
      encoding: 'utf8',
      windowsHide: true,
    });

    // Parse the JSON output line (ignoring any tesseract stderr/stdout warnings)
    const lines = stdout.trim().split(/\r?\n/);
    let resultJson: any = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        resultJson = JSON.parse(lines[i]);
        break;
      } catch {}
    }

    if (resultJson && resultJson.success && resultJson.result) {
      extractedNumberCache.set(fullUrl, resultJson.result);
      ocrDiagnosticInfo.cacheSize = extractedNumberCache.size;
      ocrDiagnosticInfo.attempts[lotteryId] = {
        fullUrl,
        status: 'success',
        result: resultJson.result,
      };
      return resultJson.result;
    } else {
      ocrDiagnosticInfo.attempts[lotteryId] = {
        fullUrl,
        status: 'no_digits',
        error: resultJson?.error || 'No result returned',
      };
      return null;
    }
  } catch (err: any) {
    ocrDiagnosticInfo.attempts[lotteryId] = {
      fullUrl,
      status: 'exception',
      error: err?.message || String(err),
    };
    console.warn(`[DLB Special OCR] Error for ${lotteryId}:`, err);
    return null;
  }
}
