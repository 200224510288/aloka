import { NextRequest, NextResponse } from 'next/server';
import { saveCustomDesignsToCloud, loadCustomDesignsFromCloud } from '@/lib/cloud-service';
import { saveCustomDesignsLocally, loadCustomDesignsLocally } from '@/lib/storage';
import { SavedCustomDesign } from '@/types/lottery';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let designs: SavedCustomDesign[] = [];
    let defaultDesignId: string | null = null;
    let fromCloud = false;

    // 1. Try fetching from Cloud Firestore
    try {
      const cloudData = await loadCustomDesignsFromCloud();
      if (cloudData && Array.isArray(cloudData.designs) && cloudData.designs.length > 0) {
        designs = cloudData.designs;
        defaultDesignId = cloudData.defaultDesignId;
        fromCloud = true;
        // Save to local cache as fallback
        saveCustomDesignsLocally({ designs, defaultDesignId });
      }
    } catch (err) {
      console.warn('API custom designs cloud fetch error:', err);
    }

    // 2. If not found in cloud, check local file backup
    if (!fromCloud) {
      const localData = loadCustomDesignsLocally();
      if (localData && Array.isArray(localData.designs) && localData.designs.length > 0) {
        designs = localData.designs;
        defaultDesignId = localData.defaultDesignId;
        // Automatically sync local to cloud in background
        saveCustomDesignsToCloud(designs, defaultDesignId).catch(e =>
          console.warn('Background sync of local designs to cloud failed:', e)
        );
      }
    }

    return NextResponse.json({
      success: true,
      designs,
      defaultDesignId,
      fromCloud,
    });
  } catch (err: any) {
    console.error('Error in GET /api/custom-designs:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch custom designs' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const designs: SavedCustomDesign[] = Array.isArray(body.designs) ? body.designs : [];
    const defaultDesignId: string | null = body.defaultDesignId || null;

    // 1. Save to Cloud Firestore
    const cloudRes = await saveCustomDesignsToCloud(designs, defaultDesignId);

    // 2. Save to local storage as fallback
    saveCustomDesignsLocally({ designs, defaultDesignId });

    return NextResponse.json({
      success: true,
      cloudSaved: cloudRes.success,
      cloudError: cloudRes.error,
      count: designs.length,
      defaultDesignId,
    });
  } catch (err: any) {
    console.error('Error in POST /api/custom-designs:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save custom designs' },
      { status: 500 }
    );
  }
}
