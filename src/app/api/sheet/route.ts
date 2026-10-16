import { NextRequest, NextResponse } from 'next/server';
import { getSheetByDate, saveSheet, getRevisionsByDate, listAvailableDates } from '@/lib/storage';
import { DailySheet } from '@/types/lottery';
import { saveSheetToCloud, loadSheetFromCloud, listCloudDates } from '@/lib/cloud-service';
import { createEmptySheet, SAMPLE_WIREFRAME_SHEET } from '@/lib/constants';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    let sheet: DailySheet | null = null;
    let fromCloud = false;

    // 1. First priority: Check Cloud Firestore (cloud store across deployments)
    try {
      const cloudSheet = await loadSheetFromCloud(date);
      if (cloudSheet) {
        sheet = cloudSheet;
        fromCloud = true;
        // Cache locally for fast subsequent reads
        saveSheet(cloudSheet, 'Synced from cloud Firestore');
      }
    } catch (cloudErr) {
      console.warn('Cloud fetch check failed:', cloudErr);
    }

    // 2. Second priority: Check local storage
    if (!sheet) {
      sheet = getSheetByDate(date);
    }

    // 3. Fallback: If no sheet exists, generate default template
    if (!sheet) {
      if (date === '2026-10-05') {
        sheet = SAMPLE_WIREFRAME_SHEET;
      } else {
        sheet = createEmptySheet(date);
      }
    }

    const revisions = getRevisionsByDate(date);
    const localDates = listAvailableDates();
    let cloudDates: string[] = [];
    try {
      cloudDates = await listCloudDates();
    } catch {}
    const availableDates = Array.from(new Set([...localDates, ...cloudDates])).sort().reverse();

    return NextResponse.json({
      success: true,
      sheet,
      revisions,
      availableDates,
      fromCloud,
    });
  } catch (error: any) {
    console.error('Error fetching sheet in /api/sheet:', error);
    // Never crash with 500 - return safe fallback sheet
    const fallbackDate = new Date().toISOString().split('T')[0];
    return NextResponse.json({
      success: true,
      sheet: createEmptySheet(fallbackDate),
      revisions: [],
      availableDates: ['2026-10-05'],
      fromCloud: false,
      warning: error.message,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sheet: DailySheet = body.sheet;
    const summary = body.summary || 'Saved lottery results';

    if (!sheet || !sheet.date) {
      return NextResponse.json({ success: false, error: 'Valid sheet with date is required' }, { status: 400 });
    }

    const saved = saveSheet(sheet, summary);
    const revisions = getRevisionsByDate(sheet.date);
    const localDates = listAvailableDates();

    // Automatically sync to cloud Firestore branch
    let cloudSynced = false;
    let cloudError = undefined;
    let isPermissionDenied = false;

    try {
      const cloudRes = await saveSheetToCloud(saved);
      cloudSynced = cloudRes.success;
      if (!cloudRes.success) {
        cloudError = cloudRes.error;
        isPermissionDenied = !!cloudRes.isPermissionDenied;
      }
    } catch (cErr: any) {
      console.warn('Cloud auto-save error in /api/sheet:', cErr);
      cloudError = cErr?.message;
      isPermissionDenied = cErr?.code === 'permission-denied';
    }

    let cloudDates: string[] = [];
    try {
      cloudDates = await listCloudDates();
    } catch {}
    const availableDates = Array.from(new Set([...localDates, ...cloudDates])).sort().reverse();

    return NextResponse.json({
      success: true,
      sheet: saved,
      revisions,
      availableDates,
      cloudSynced,
      cloudError,
      isPermissionDenied,
    });
  } catch (error: any) {
    console.error('Error saving sheet in /api/sheet:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


