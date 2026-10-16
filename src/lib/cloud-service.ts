import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, CLOUD_BRANCH_COLLECTION, CLOUD_SOURCES_COLLECTION } from './firebase';
import { DailySheet, SourceDocument } from '@/types/lottery';

/**
 * Automatically persists the DailySheet to the separate 'result_generator_daily_sheets'
 * cloud collection on the lottery-sales-tracker Firebase project.
 */
export async function saveSheetToCloud(sheet: DailySheet): Promise<{ success: boolean; cloudId?: string; error?: string }> {
  try {
    if (!sheet.date) {
      return { success: false, error: 'Missing sheet date' };
    }

    const docRef = doc(db, CLOUD_BRANCH_COLLECTION, sheet.date);
    
    // Clean payload for Firestore (ensure no undefined fields)
    const sanitizedSheet = JSON.parse(JSON.stringify(sheet));

    const cloudPayload = {
      ...sanitizedSheet,
      branch: 'result-generator',
      syncedAt: new Date().toISOString(),
      lastCloudUpdate: new Date().toISOString(),
    };

    await setDoc(docRef, cloudPayload, { merge: true });
    return { success: true, cloudId: sheet.date };
  } catch (err: any) {
    console.error('Cloud Firestore save error:', err);
    return { success: false, error: err.message || 'Failed to save to cloud' };
  }
}

/**
 * Loads a DailySheet from Firestore by date
 */
export async function loadSheetFromCloud(date: string): Promise<DailySheet | null> {
  try {
    const docRef = doc(db, CLOUD_BRANCH_COLLECTION, date);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as DailySheet;
    }
    return null;
  } catch (err) {
    console.warn('Could not load sheet from cloud:', err);
    return null;
  }
}

/**
 * Automatically saves source document metadata to cloud upon upload
 */
export async function saveSourceDocToCloud(
  docData: SourceDocument,
  date: string,
  extraMeta?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, CLOUD_SOURCES_COLLECTION, docData.id);
    const sanitizedDoc = JSON.parse(JSON.stringify(docData));

    await setDoc(docRef, {
      ...sanitizedDoc,
      date,
      branch: 'result-generator',
      uploadedToCloudAt: new Date().toISOString(),
      ...(extraMeta ? JSON.parse(JSON.stringify(extraMeta)) : {})
    }, { merge: true });

    return { success: true };
  } catch (err: any) {
    console.error('Cloud source doc save error:', err);
    return { success: false, error: err.message };
  }
}
