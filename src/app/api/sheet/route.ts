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

    // 1. Fetch local and cloud sheet with timestamp comparison to prevent stale overwrites
    const localSheet = getSheetByDate(date);

    try {
      const cloudSheet = await loadSheetFromCloud(date);
      if (cloudSheet && localSheet) {
        const localTime = new Date(localSheet.updatedAt || 0).getTime();
        const cloudTime = new Date(cloudSheet.updatedAt || (cloudSheet as any).syncedAt || 0).getTime();

        if (localTime > cloudTime) {
          // Local sheet is NEWER than cloud: Keep local and update cloud in background
          sheet = localSheet;
          fromCloud = false;
          saveSheetToCloud(localSheet).catch(e => console.warn('Background cloud catchup error:', e));
        } else {
          // Cloud sheet is newer or equal
          sheet = cloudSheet;
          fromCloud = true;
          if ((!sheet.sources || sheet.sources.length === 0) && localSheet.sources && localSheet.sources.length > 0) {
            sheet.sources = localSheet.sources;
          }
          saveSheet(sheet, 'Synced from cloud Firestore');
        }
      } else if (cloudSheet) {
        sheet = cloudSheet;
        fromCloud = true;
        saveSheet(sheet, 'Synced from cloud Firestore');
      } else if (localSheet) {
        sheet = localSheet;
        fromCloud = false;
        saveSheetToCloud(localSheet).catch(e => console.warn('Initial cloud sync error:', e));
      }

      // Always restore extractedText from localSheet if cloud sources omitted or stripped it
      if (localSheet?.sources && localSheet.sources.length > 0 && sheet) {
        if (!sheet.sources || sheet.sources.length === 0) {
          sheet.sources = localSheet.sources;
        } else {
          sheet.sources = sheet.sources.map(s => {
            let cleanFilePath = s.filePath;
            if (cleanFilePath && cleanFilePath.startsWith('blob:')) {
              cleanFilePath = '[Stored in Browser Session]';
            }
            if (!s.extractedText) {
              const localMatch = localSheet.sources.find(ls => ls.fileName === s.fileName || ls.id === s.id);
              if (localMatch?.extractedText) {
                const safeLocalPath = (localMatch.filePath && !localMatch.filePath.startsWith('blob:'))
                  ? localMatch.filePath
                  : '[Stored in Browser Session]';
                return {
                  ...s,
                  extractedText: localMatch.extractedText,
                  filePath: (cleanFilePath && !cleanFilePath.includes('Browser Session')) ? cleanFilePath : safeLocalPath,
                };
              }
            }
            return {
              ...s,
              filePath: cleanFilePath,
            };
          });
        }
      }
    } catch (cloudErr) {
      console.warn('Cloud fetch check failed:', cloudErr);
      sheet = localSheet;
    }

    // 3. Fallback: If no sheet exists, generate default template
    if (!sheet) {
      if (date === '2026-10-05') {
        sheet = SAMPLE_WIREFRAME_SHEET;
      } else {
        sheet = createEmptySheet(date);
      }
    }

    // 3.5. Sanitize sources: Strip out any source documents that belong to a different date
    if (sheet.sources && sheet.sources.length > 0) {
      const cleanDigits = date.replace(/-/g, '');
      sheet.sources = sheet.sources.filter(s => {
        const match = s.fileName.match(/(\d{8})/);
        if (match && match[1] !== cleanDigits) {
          return false;
        }
        if (s.detectedDate && s.detectedDate !== date) {
          return false;
        }
        return true;
      });
    }

    // 4. Auto-reconcile physical uploaded files from public/uploads/${date}
    try {
      const fs = await import('fs');
      const path = await import('path');
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', date);
      if (fs.existsSync(uploadDir)) {
        const diskFiles = fs.readdirSync(uploadDir).filter(f => !f.startsWith('.') && !f.endsWith('.tmp'));
        if (diskFiles.length > 0) {
          const hasValidSources = sheet.sources && sheet.sources.length > 0 && sheet.sources.some(s => s.filePath && !s.filePath.includes('Browser Session') && s.extractedText);
          if (!hasValidSources) {
            sheet.sources = await Promise.all(diskFiles.map(async (fname, idx) => {
              const fullFp = path.join(uploadDir, fname);
              const stats = fs.statSync(fullFp);
              const ext = path.extname(fname).toLowerCase();
              let extractedText = localSheet?.sources?.[0]?.extractedText || '';
              if (!extractedText && ext === '.pdf') {
                try {
                  const { extractTextFromPdfBuffer } = await import('@/lib/pdf-text-extractor');
                  const res = await extractTextFromPdfBuffer(fs.readFileSync(fullFp));
                  extractedText = res.text;
                } catch (e) {
                  console.warn('Could not extract text during auto-reconciliation:', e);
                }
              }
              return {
                id: `doc_disk_${idx}_${fname}`,
                fileName: fname.replace(/^doc_\d+_[a-zA-Z0-9]+_/, ''),
                fileType: ext === '.pdf' ? 'pdf' : (ext === '.png' ? 'png' : 'jpg'),
                filePath: `/uploads/${date}/${fname}`,
                fileSize: stats.size,
                uploadedAt: stats.mtime.toISOString(),
                pageCount: 1,
                status: 'extracted',
                extractedText,
              };
            }));
            saveSheet(sheet, 'Auto-reconciled uploaded sources from disk');
          }
        }
      }
    } catch (recErr) {
      console.warn('Sources disk reconciliation error:', recErr);
    }

    // 5. Auto-repair missing zodiac or letter fields using improved extractor on extractedText
    if (sheet.sources && sheet.sources.length > 0) {
      try {
        const { extractLotteryDataFromText } = await import('@/lib/extractor');
        let needsSave = false;
        for (const src of sheet.sources) {
          if (src.extractedText) {
            const reExt = extractLotteryDataFromText(src.extractedText, date, src.fileName);
            if (reExt.matchedLotteries && reExt.matchedLotteries.length > 0) {
              sheet.lotteries = sheet.lotteries.map(lot => {
                const match = reExt.matchedLotteries.find(m => m.lotteryId === lot.lotteryId);
                if (match) {
                  let updatedLot = { ...lot };
                  if (!lot.zodiac && match.zodiac) {
                    updatedLot.zodiac = match.zodiac;
                    needsSave = true;
                  }
                  if (!lot.letter && match.letter) {
                    updatedLot.letter = match.letter;
                    needsSave = true;
                  }
                  return updatedLot;
                }
                return lot;
              });
            }
          }
        }
        if (needsSave) {
          sheet.updatedAt = new Date().toISOString();
          saveSheet(sheet, 'Auto-reconciled missing zodiac/letter from document text');
          saveSheetToCloud(sheet).catch(() => {});
        }
      } catch (err) {
        console.warn('Auto-repair from extracted text error:', err);
      }
    }

    const revisions = getRevisionsByDate(date);
    const localDates = listAvailableDates();
    let cloudDates: string[] = [];
    try {
      cloudDates = await listCloudDates();
    } catch {}
    const availableDates = Array.from(new Set([...localDates, ...cloudDates])).sort().reverse();

    if (sheet && Array.isArray(sheet.sources)) {
      sheet.sources = sheet.sources.map(s => {
        if (s.filePath && s.filePath.startsWith('blob:')) {
          return { ...s, filePath: '[Stored in Browser Session]' };
        }
        return s;
      });
    }

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
    const sheet: DailySheet = {
      ...body.sheet,
      updatedAt: new Date().toISOString(),
    };
    const summary = body.summary || 'Saved lottery results';

    if (!sheet || !sheet.date) {
      return NextResponse.json({ success: false, error: 'Valid sheet with date is required' }, { status: 400 });
    }

    if (sheet && Array.isArray(sheet.sources)) {
      sheet.sources = sheet.sources.map(s => {
        if (s.filePath && s.filePath.startsWith('blob:')) {
          return { ...s, filePath: '[Stored in Browser Session]' };
        }
        return s;
      });
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


