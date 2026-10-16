import fs from 'fs';
import path from 'path';
import { DailySheet, RevisionRecord } from '@/types/lottery';
import { createEmptySheet, SAMPLE_WIREFRAME_SHEET } from './constants';

const DATA_DIR = path.join(process.cwd(), 'data');
const SHEETS_DIR = path.join(DATA_DIR, 'sheets');
const REVISIONS_DIR = path.join(DATA_DIR, 'revisions');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SHEETS_DIR)) fs.mkdirSync(SHEETS_DIR, { recursive: true });
  if (!fs.existsSync(REVISIONS_DIR)) fs.mkdirSync(REVISIONS_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function getSheetByDate(date: string): DailySheet {
  ensureDirectories();
  const filePath = path.join(SHEETS_DIR, `${date}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.error(`Error reading sheet for ${date}:`, e);
    }
  }
  
  // If requesting 2026-10-05 and no file exists, return the reference sample
  if (date === '2026-10-05') {
    return SAMPLE_WIREFRAME_SHEET;
  }

  // Otherwise return empty configured template
  return createEmptySheet(date);
}

export function saveSheet(sheet: DailySheet, changeSummary = 'Updated lottery results'): DailySheet {
  ensureDirectories();
  const filePath = path.join(SHEETS_DIR, `${sheet.date}.json`);
  
  sheet.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(sheet, null, 2), 'utf-8');

  // Record revision
  addRevision(sheet.date, sheet, changeSummary);

  return sheet;
}

export function getRevisionsByDate(date: string): RevisionRecord[] {
  ensureDirectories();
  const filePath = path.join(REVISIONS_DIR, `${date}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.error(`Error reading revisions for ${date}:`, e);
    }
  }
  return [];
}

export function addRevision(date: string, snapshot: DailySheet, summary: string): RevisionRecord {
  ensureDirectories();
  const filePath = path.join(REVISIONS_DIR, `${date}.json`);
  let revisions: RevisionRecord[] = [];
  if (fs.existsSync(filePath)) {
    try {
      revisions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      revisions = [];
    }
  }

  const newRevision: RevisionRecord = {
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sheetDate: date,
    timestamp: new Date().toISOString(),
    summary,
    changedFields: [],
    snapshot: JSON.parse(JSON.stringify(snapshot))
  };

  revisions.unshift(newRevision); // newest first
  // Keep last 50 revisions
  if (revisions.length > 50) revisions = revisions.slice(0, 50);

  fs.writeFileSync(filePath, JSON.stringify(revisions, null, 2), 'utf-8');
  return newRevision;
}

export function listAvailableDates(): string[] {
  ensureDirectories();
  const files = fs.readdirSync(SHEETS_DIR);
  const dates = files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
  
  if (!dates.includes('2026-10-05')) {
    dates.push('2026-10-05');
  }
  return dates.sort().reverse();
}

export function getUploadsDirectory(): string {
  ensureDirectories();
  return UPLOADS_DIR;
}
