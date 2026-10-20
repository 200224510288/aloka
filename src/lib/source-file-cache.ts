/**
 * Client-side IndexedDB cache for uploaded source documents (PDFs and Images).
 * Ensures that uploaded source files persist across page reloads in the browser,
 * even when Cloud Firestore stores metadata with '[Stored in Browser Session]'.
 */

const DB_NAME = 'lottery_sources_cache';
const DB_VERSION = 1;
const STORE_NAME = 'source_files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCachedFile(
  id: string,
  fileName: string,
  file: Blob | File,
  previewDataUrl?: string
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id,
        fileName,
        blob: file,
        previewDataUrl: previewDataUrl || null,
        savedAt: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not cache file in IndexedDB:', err);
  }
}

export async function getCachedFileRecord(
  id: string,
  fileName?: string
): Promise<{ blob: Blob | null; previewDataUrl: string | null }> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result && (req.result.blob || req.result.previewDataUrl)) {
          return resolve({
            blob: req.result.blob || null,
            previewDataUrl: req.result.previewDataUrl || null,
          });
        }

        // Fallback: search by fileName if id changed
        if (fileName) {
          const allReq = store.openCursor();
          allReq.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result as IDBCursorWithValue | null;
            if (cursor) {
              if (cursor.value.fileName === fileName && (cursor.value.blob || cursor.value.previewDataUrl)) {
                return resolve({
                  blob: cursor.value.blob || null,
                  previewDataUrl: cursor.value.previewDataUrl || null,
                });
              }
              cursor.continue();
            } else {
              resolve({ blob: null, previewDataUrl: null });
            }
          };
          allReq.onerror = () => resolve({ blob: null, previewDataUrl: null });
        } else {
          resolve({ blob: null, previewDataUrl: null });
        }
      };
      req.onerror = () => resolve({ blob: null, previewDataUrl: null });
    });
  } catch {
    return { blob: null, previewDataUrl: null };
  }
}

export async function getCachedFile(id: string, fileName?: string): Promise<Blob | null> {
  const record = await getCachedFileRecord(id, fileName);
  return record.blob;
}

export async function deleteCachedFile(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not delete cached file from IndexedDB:', err);
  }
}
