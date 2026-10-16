import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
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
    
    // Upload directory in public so preview images/files are accessible
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', date);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const savedFilePath = path.join(uploadDir, `${fileId}_${sanitizedName}`);
    fs.writeFileSync(savedFilePath, fileBuffer);

    const ext = path.extname(sanitizedName).toLowerCase();
    const fileType = ext === '.pdf' ? 'pdf' : (ext === '.jpg' || ext === '.jpeg' ? 'jpg' : 'png');

    // Run extraction helper
    const pythonScript = path.join(process.cwd(), 'scripts', 'extract.py');
    const cmd = `python "${pythonScript}" "${savedFilePath}" "${uploadDir}" "${date}"`;

    let pyResult = {
      success: true,
      page_count: 1,
      total_file_pages: 1,
      preview_images: [] as string[],
      pages_text: [] as { page: number; text: string }[],
      full_text: ''
    };

    try {
      const { stdout } = await execAsync(cmd);
      pyResult = JSON.parse(stdout);
    } catch (e) {
      console.error('Python extraction failed or fallback needed:', e);
    }

    // Run lottery extraction
    const extraction = extractLotteryDataFromText(
      pyResult.full_text || '',
      date,
      file.name,
      1
    );

    const previewImg = (pyResult.preview_images && pyResult.preview_images.length > 0)
      ? pyResult.preview_images[0]
      : (fileType === 'pdf'
          ? `/uploads/${date}/${fileId}_${sanitizedName}_preview-1.png`
          : `/uploads/${date}/${fileId}_${sanitizedName}`);

    const sourceDoc: SourceDocument = {
      id: fileId,
      fileName: file.name,
      fileType,
      filePath: `/uploads/${date}/${fileId}_${sanitizedName}`,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      pageCount: pyResult.page_count || 1,
      totalFilePages: pyResult.total_file_pages || 1,
      previewImageUrl: previewImg,
      extractedText: pyResult.full_text,
      detectedDate: extraction.detectedDate,
      status: 'extracted',
    };

    // Automatically save uploaded document metadata to Cloud Firestore (separate branch)
    try {
      const { saveSourceDocToCloud } = await import('@/lib/cloud-service');
      await saveSourceDocToCloud(sourceDoc, date, {
        detectedDate: extraction.detectedDate,
        matchedCount: extraction.matchedLotteries?.length || 0,
      });
    } catch (cloudErr) {
      console.warn('Could not save source doc to cloud Firestore:', cloudErr);
    }

    return NextResponse.json({
      success: true,
      sourceDoc,
      previewImages: pyResult.preview_images,
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
    if (filePath && typeof filePath === 'string') {
      const fullPath = path.join(process.cwd(), 'public', filePath.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (e) {
          console.warn('Could not unlink original file:', e);
        }
      }
      // Also remove preview image if exists
      const base = fullPath.replace(/\.[^.]+$/, '');
      const previewImg = `${base}_preview-1.png`;
      if (fs.existsSync(previewImg)) {
        try {
          fs.unlinkSync(previewImg);
        } catch (e) {
          console.warn('Could not unlink preview file:', e);
        }
      }
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete file error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

