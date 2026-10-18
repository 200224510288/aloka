import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { extractLotteryDataFromText } from '@/lib/extractor';
import { SourceDocument } from '@/types/lottery';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const date = (formData.get('date') as string) || new Date().toISOString().split('T')[0];

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(sanitizedName).toLowerCase();
    const fileType = ext === '.pdf' ? 'pdf' : (ext === '.jpg' || ext === '.jpeg' ? 'jpg' : 'png');
    const mimeType = ext === '.pdf' ? 'application/pdf' : (ext === '.png' ? 'image/png' : 'image/jpeg');

    // Generate base64 Data URL so preview works in browser without requiring local disk storage
    const base64Data = fileBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    // Check serverless environment (Vercel or AWS Lambda)
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

    let relativeWebPath: string | null = null;
    let savedFilePath: string | null = null;
    let uploadDir: string | null = null;
    let previewImages: string[] = [];

    if (!isServerless) {
      // Local dev environment: save to public/uploads
      try {
        const pubDir = path.join(process.cwd(), 'public', 'uploads', date);
        if (!fs.existsSync(pubDir)) {
          fs.mkdirSync(pubDir, { recursive: true });
        }
        const pubFilePath = path.join(pubDir, `${fileId}_${sanitizedName}`);
        fs.writeFileSync(pubFilePath, fileBuffer);
        relativeWebPath = `/uploads/${date}/${fileId}_${sanitizedName}`;
        savedFilePath = pubFilePath;
        uploadDir = pubDir;
      } catch (localErr) {
        console.warn('Could not write to local public/uploads:', localErr);
      }
    } else {
      // Serverless (Vercel): write to os.tmpdir() for ephemeral processing if needed
      try {
        const tmpDir = path.join(os.tmpdir(), 'lottery_uploads', date);
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        savedFilePath = path.join(tmpDir, `${fileId}_${sanitizedName}`);
        fs.writeFileSync(savedFilePath, fileBuffer);
        uploadDir = tmpDir;
      } catch (tmpErr) {
        console.warn('Operating purely in-memory:', tmpErr);
      }
    }

    // PDF Text Extraction using pure Node.js (Serverless-compatible, zero Python dependency)
    let extractedText = '';
    let totalFilePages = 1;

    if (fileType === 'pdf') {
      try {
        const { extractTextFromPdfBuffer } = await import('@/lib/pdf-text-extractor');
        const result = await extractTextFromPdfBuffer(fileBuffer);
        extractedText = result.text;
        totalFilePages = result.totalFilePages;
      } catch (pdfErr: any) {
        console.warn('Serverless PDF extraction error:', pdfErr?.message || pdfErr);
      }

      // Secondary fallback: if python is present and local (Windows dev)
      if (!extractedText && savedFilePath && uploadDir && !isServerless) {
        try {
          const pythonScript = path.join(process.cwd(), 'scripts', 'extract.py');
          if (fs.existsSync(pythonScript)) {
            const cmd = `python "${pythonScript}" "${savedFilePath}" "${uploadDir}" "${date}"`;
            const { stdout } = await execAsync(cmd);
            const pyResult = JSON.parse(stdout);
            if (pyResult.full_text) {
              extractedText = pyResult.full_text;
              totalFilePages = pyResult.total_file_pages || totalFilePages;
              if (pyResult.preview_images && pyResult.preview_images.length > 0) {
                previewImages = pyResult.preview_images;
              }
            }
          }
        } catch {
          // Python unavailable (e.g. on Vercel), ignore
        }
      }
    }

    // Run lottery extraction
    const extraction = extractLotteryDataFromText(
      extractedText || '',
      date,
      file.name,
      1
    );

    // On Vercel, public runtime files are not served by Edge CDN, so dataUrl is the primary source of truth.
    // Locally, relativeWebPath is used when available.
    const displayPath = (isServerless ? dataUrl : relativeWebPath) || dataUrl;
    
    // For preview image: only use if an actual raster image exists. Never invent a fake _preview-1.png!
    let previewImg: string | undefined = undefined;
    if (previewImages && previewImages.length > 0) {
      previewImg = previewImages[0];
    } else if (fileType !== 'pdf') {
      previewImg = displayPath;
    }

    const sourceDoc: SourceDocument = {
      id: fileId,
      fileName: file.name,
      fileType,
      filePath: displayPath,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      pageCount: 1,
      totalFilePages,
      previewImageUrl: previewImg,
      extractedText,
      detectedDate: extraction.detectedDate,
      status: 'extracted',
    };

    // Automatically save uploaded document metadata to Cloud Firestore (sanitized to avoid 1MB limit)
    try {
      const { saveSourceDocToCloud } = await import('@/lib/cloud-service');
      const cloudDoc: SourceDocument = {
        ...sourceDoc,
        // Don't blow up Firestore document limit with massive base64 strings
        filePath: sourceDoc.filePath.length > 50000 ? '[Stored in Browser Session]' : sourceDoc.filePath,
        previewImageUrl: sourceDoc.previewImageUrl && sourceDoc.previewImageUrl.length > 50000 ? undefined : sourceDoc.previewImageUrl,
      };
      await saveSourceDocToCloud(cloudDoc, date, {
        detectedDate: extraction.detectedDate,
        matchedCount: extraction.matchedLotteries?.length || 0,
      });
    } catch (cloudErr) {
      console.warn('Could not save source doc to cloud Firestore:', cloudErr);
    }

    return NextResponse.json({
      success: true,
      sourceDoc,
      previewImages: previewImages.length > 0 ? previewImages : [previewImg],
      extraction: {
        detectedDate: extraction.detectedDate,
        detectedDaySi: extraction.detectedDaySi,
        detectedFooterAnnouncement: extraction.detectedFooterAnnouncement,
        matchedLotteries: extraction.matchedLotteries,
        unassignedRows: extraction.unassignedRows,
        dateMismatchWarning: extraction.dateMismatchWarning,
      }
    });

  } catch (error: any) {
    console.error('Upload handler error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { filePath } = await req.json();
    if (filePath && typeof filePath === 'string' && !filePath.startsWith('data:')) {
      const fullPath = path.join(process.cwd(), 'public', filePath.replace(/^\//, ''));
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (e) {
        console.warn('Could not unlink original file:', e);
      }
      // Also remove preview image if exists
      const base = fullPath.replace(/\.[^.]+$/, '');
      const previewImg = `${base}_preview-1.png`;
      try {
        if (fs.existsSync(previewImg)) {
          fs.unlinkSync(previewImg);
        }
      } catch (e) {
        console.warn('Could not unlink preview file:', e);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete file error:', error);
    return NextResponse.json({ success: true });
  }
}


