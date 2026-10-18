import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, CLOUD_BRANCH_COLLECTION, CLOUD_SOURCES_COLLECTION, CLOUD_SETTINGS_COLLECTION } from './firebase';
import { DailySheet, SourceDocument, SavedCustomDesign } from '@/types/lottery';

function cleanFirestoreData(data: any): any {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(cleanFirestoreData);
  }
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      result[key] = cleanFirestoreData(val);
    }
  }
  return result;
}

/**
 * Automatically persists the DailySheet to the separate 'result_generator_daily_sheets'
 * cloud collection on the lottery-sales-tracker Firebase project.
 */
export async function saveSheetToCloud(sheet: DailySheet): Promise<{ success: boolean; cloudId?: string; error?: string; isPermissionDenied?: boolean }> {
  try {
    if (!sheet.date) {
      return { success: false, error: 'Missing sheet date' };
    }

    const docRef = doc(db, CLOUD_BRANCH_COLLECTION, sheet.date);
    
    // Clean payload for Firestore (ensure no undefined fields and avoid 1MB document limit)
    const sanitizedSheet = JSON.parse(JSON.stringify(sheet));
    if (Array.isArray(sanitizedSheet.sources)) {
      sanitizedSheet.sources = sanitizedSheet.sources.map((s: any) => {
        const item = { ...s };
        if (item.filePath && item.filePath.length > 50000) {
          item.filePath = '[Stored in Browser Session]';
        }
        if (item.previewImageUrl && item.previewImageUrl.length > 50000) {
          delete item.previewImageUrl;
        }
        return item;
      });
    }

    const cloudPayload = cleanFirestoreData({
      ...sanitizedSheet,
      branch: 'result-generator',
      syncedAt: new Date().toISOString(),
      lastCloudUpdate: new Date().toISOString(),
    });

    await setDoc(docRef, cloudPayload, { merge: true });
    return { success: true, cloudId: sheet.date };
  } catch (err: any) {
    const isPermissionDenied = err?.code === 'permission-denied';
    const msg = isPermissionDenied
      ? 'Firebase Firestore permission denied. Please allow read/write in Firebase Console -> Firestore -> Rules.'
      : (err.message || 'Failed to save to cloud');
    console.warn('Cloud Firestore save warning:', msg);
    return { success: false, error: msg, isPermissionDenied };
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
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.warn('Firestore read permission denied for date', date);
    } else {
      console.warn('Could not load sheet from cloud:', err);
    }
    return null;
  }
}

/**
 * Lists all available sheet dates currently saved in Cloud Firestore
 */
export async function listCloudDates(): Promise<string[]> {
  try {
    const colRef = collection(db, CLOUD_BRANCH_COLLECTION);
    const snap = await getDocs(colRef);
    const dates: string[] = [];
    snap.forEach((d) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d.id)) {
        dates.push(d.id);
      }
    });
    return dates;
  } catch (err: any) {
    console.warn('Could not list cloud dates:', err?.message || err);
    return [];
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

    const payload = cleanFirestoreData({
      ...sanitizedDoc,
      date,
      branch: 'result-generator',
      uploadedToCloudAt: new Date().toISOString(),
      ...(extraMeta ? JSON.parse(JSON.stringify(extraMeta)) : {})
    });

    await setDoc(docRef, payload, { merge: true });

    return { success: true };
  } catch (err: any) {
    console.warn('Cloud source doc save warning:', err?.message || err);
    return { success: false, error: err.message };
  }
}

export interface CloudCustomDesignsData {
  designs: SavedCustomDesign[];
  defaultDesignId: string | null;
  updatedAt: string;
}

/**
 * Saves custom designs & default design selection to Cloud Firestore
 */
export async function saveCustomDesignsToCloud(
  designs: SavedCustomDesign[],
  defaultDesignId: string | null = null
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, CLOUD_BRANCH_COLLECTION, '_custom_designs');
    const sanitizedDesigns = JSON.parse(JSON.stringify(designs || []));
    await setDoc(docRef, {
      designs: sanitizedDesigns,
      defaultDesignId: defaultDesignId || null,
      branch: 'result-generator',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.warn('Cloud custom designs save warning:', err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Loads custom designs & default design selection from Cloud Firestore
 */
export async function loadCustomDesignsFromCloud(): Promise<CloudCustomDesignsData | null> {
  try {
    const docRef = doc(db, CLOUD_BRANCH_COLLECTION, '_custom_designs');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        designs: Array.isArray(data.designs) ? data.designs : [],
        defaultDesignId: data.defaultDesignId || null,
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    }
    return null;
  } catch (err: any) {
    console.warn('Could not load custom designs from cloud:', err?.message || err);
    return null;
  }
}


