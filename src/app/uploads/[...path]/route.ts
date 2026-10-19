import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await context.params;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const relativePath = pathSegments.join('/');
    
    // Check in public/uploads first, then data/uploads
    const searchDirs = [
      path.join(process.cwd(), 'public', 'uploads'),
      path.join(process.cwd(), 'data', 'uploads'),
      path.join(process.cwd(), 'public'),
    ];

    let fullPath: string | null = null;
    for (const baseDir of searchDirs) {
      const candidate = path.join(/*turbopackIgnore: true*/ baseDir, ...pathSegments);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        fullPath = candidate;
        break;
      }
    }

    if (!fullPath) {
      return new NextResponse('File Not Found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(/*turbopackIgnore: true*/ fullPath);
    const ext = path.extname(fullPath).toLowerCase();

    let mimeType = 'application/octet-stream';
    if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.svg') mimeType = 'image/svg+xml';
    else if (ext === '.txt') mimeType = 'text/plain; charset=utf-8';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Uploads route handler error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
