import { NextRequest, NextResponse } from 'next/server';
import { getSheetByDate, saveSheet, getRevisionsByDate, listAvailableDates } from '@/lib/storage';
import { DailySheet } from '@/types/lottery';
import { saveSheetToCloud, loadSheetFromCloud } from '@/lib/cloud-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    let sheet = getSheetByDate(date);
    let fromCloud = false;

    // If not found locally, attempt to fetch from cloud
    if (!sheet) {
      try {
        const cloudSheet = await loadSheetFromCloud(date);
        if (cloudSheet) {
          sheet = cloudSheet;
          fromCloud = true;
          // Also save locally for fast subsequent access
          saveSheet(cloudSheet, 'Synced from cloud Firestore');
        }
      } catch (cloudErr) {
        console.warn('Cloud fetch fallback failed:', cloudErr);
      }
    }

    const revisions = getRevisionsByDate(date);
    const availableDates = listAvailableDates();

    return NextResponse.json({
      success: true,
      sheet,
      revisions,
      availableDates,
      fromCloud,
    });
  } catch (error: any) {
    console.error('Error fetching sheet:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
    const availableDates = listAvailableDates();

    // Automatically sync to cloud Firestore branch
    let cloudSynced = false;
    let cloudError = undefined;
    try {
      const cloudRes = await saveSheetToCloud(saved);
      cloudSynced = cloudRes.success;
      if (!cloudRes.success) {
        cloudError = cloudRes.error;
      }
    } catch (cErr: any) {
      console.warn('Cloud auto-save error in /api/sheet:', cErr);
      cloudError = cErr?.message;
    }

    return NextResponse.json({
      success: true,
      sheet: saved,
      revisions,
      availableDates,
      cloudSynced,
      cloudError,
    });
  } catch (error: any) {
    console.error('Error saving sheet:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

