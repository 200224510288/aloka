import fs from 'fs';
import path from 'path';
import os from 'os';
import { DailySheet, RevisionRecord } from '@/types/lottery';
import { createEmptySheet, SAMPLE_WIREFRAME_SHEET } from './constants';

function resolveDataDir(): string {
  // On Vercel or AWS Lambda, process.cwd() (/var/task) is strictly read-only
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), 'lottery_data');
  }

  const localDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    // Test write capability
    const testFile = path.join(localDir, '.write_test');
    fs.writeFileSync(testFile, '1');
    fs.unlinkSync(testFile);
    return localDir;
  } catch {
    // Read-only filesystem fallback
    return path.join(os.tmpdir(), 'lottery_data');
  }
}

function getDirectories() {
  const dataDir = resolveDataDir();
  return {
    DATA_DIR: dataDir,
    SHEETS_DIR: path.join(dataDir, 'sheets'),
    REVISIONS_DIR: path.join(dataDir, 'revisions'),
    UPLOADS_DIR: path.join(dataDir, 'uploads'),
  };
}

function ensureDirectories() {
  try {
    const { DATA_DIR, SHEETS_DIR, REVISIONS_DIR, UPLOADS_DIR } = getDirectories();
    if (!fs.existsSync(/*turbopackIgnore: true*/ DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(/*turbopackIgnore: true*/ SHEETS_DIR)) fs.mkdirSync(SHEETS_DIR, { recursive: true });
    if (!fs.existsSync(/*turbopackIgnore: true*/ REVISIONS_DIR)) fs.mkdirSync(REVISIONS_DIR, { recursive: true });
    if (!fs.existsSync(/*turbopackIgnore: true*/ UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not ensure local storage directories:', err);
  }
}

/**
 * Retrieves a saved DailySheet from disk if present. Returns null if not found.
 */
export function getSheetByDate(date: string): DailySheet | null {
  try {
    ensureDirectories();
    const { SHEETS_DIR } = getDirectories();
    const filePath = path.join(SHEETS_DIR, `${date}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`Error reading sheet for ${date} from disk:`, e);
  }

  // If requesting reference wireframe date and no saved override exists
  if (date === '2026-10-05') {
    return SAMPLE_WIREFRAME_SHEET;
  }

  return null;
}

export function saveSheet(sheet: DailySheet, changeSummary = 'Updated lottery results'): DailySheet {
  sheet.updatedAt = new Date().toISOString();

  try {
    ensureDirectories();
    const { SHEETS_DIR } = getDirectories();
    const filePath = path.join(SHEETS_DIR, `${sheet.date}.json`);
    fs.writeFileSync(filePath, JSON.stringify(sheet, null, 2), 'utf-8');

    // Record revision
    addRevision(sheet.date, sheet, changeSummary);
  } catch (err) {
    console.warn('Could not write sheet to local disk (environment may be read-only):', err);
  }

  return sheet;
}

export function getRevisionsByDate(date: string): RevisionRecord[] {
  try {
    ensureDirectories();
    const { REVISIONS_DIR } = getDirectories();
    const filePath = path.join(REVISIONS_DIR, `${date}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`Error reading revisions for ${date}:`, e);
  }
  return [];
}

export function addRevision(date: string, snapshot: DailySheet, summary: string): RevisionRecord {
  const newRevision: RevisionRecord = {
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sheetDate: date,
    timestamp: new Date().toISOString(),
    summary,
    changedFields: [],
    snapshot: JSON.parse(JSON.stringify(snapshot))
  };

  try {
    ensureDirectories();
    const { REVISIONS_DIR } = getDirectories();
    const filePath = path.join(REVISIONS_DIR, `${date}.json`);
    let revisions: RevisionRecord[] = [];
    if (fs.existsSync(filePath)) {
      try {
        revisions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch {
        revisions = [];
      }
    }

    revisions.unshift(newRevision); // newest first
    // Keep last 50 revisions
    if (revisions.length > 50) revisions = revisions.slice(0, 50);

    fs.writeFileSync(filePath, JSON.stringify(revisions, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save revision to local disk:', err);
  }

  return newRevision;
}

export function listAvailableDates(): string[] {
  const dates = new Set<string>();
  dates.add('2026-10-05');

  try {
    ensureDirectories();
    const { SHEETS_DIR } = getDirectories();
    if (fs.existsSync(/*turbopackIgnore: true*/ SHEETS_DIR)) {
      const files = fs.readdirSync(/*turbopackIgnore: true*/ SHEETS_DIR);
      for (const f of files) {
        if (f.endsWith('.json')) {
          dates.add(f.replace('.json', ''));
        }
      }
    }
  } catch (err) {
    console.warn('Could not list local dates from disk:', err);
  }

  return Array.from(dates).sort().reverse();
}

export function getUploadsDirectory(): string {
  ensureDirectories();
  return getDirectories().UPLOADS_DIR;
}

