import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDriveClient, findOrCreateFolder, uploadImageBuffer } from '@/lib/drive';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const seriesName = formData.get('seriesName') as string;
    const volumeName = formData.get('volumeName') as string;
    const isFirstChunk = formData.get('isFirstChunk') === 'true'; // New flag!
    const files = formData.getAll('files') as File[];

    if (!seriesName || !volumeName || files.length === 0) {
      return NextResponse.json({ error: 'Missing required fields or files.' }, { status: 400 });
    }

    const drive = getDriveClient(session.accessToken);
    const rootId = await findOrCreateFolder(drive, 'MangaHub_Root');
    const seriesId = await findOrCreateFolder(drive, seriesName, rootId);

    // THE CIRCUIT BREAKER: Only check on the very first chunk of a volume
    if (isFirstChunk) {
      const existingVolumeRes = await drive.files.list({
        // Search specifically for this volume folder inside the series folder
        q: `mimeType='application/vnd.google-apps.folder' and name='${volumeName.replace(/'/g, "\\'")}' and '${seriesId}' in parents and trashed=false`,
        fields: 'files(id)',
      });

      if (existingVolumeRes.data.files && existingVolumeRes.data.files.length > 0) {
        // Boom. Volume exists. Tell the frontend to abort sending any more chunks for this volume.
        return NextResponse.json({
          skipVolume: true,
          message: 'Volume folder already exists. Skipping.',
        });
      }
    }

    // If we reach here, either the volume didn't exist, OR this is chunk 2, 3, 4, etc.
    const volumeId = await findOrCreateFolder(drive, volumeName, seriesId);

    // Upload the Images (Blindly and fast, because we know the folder is clean)
    const uploadedIds: string[] = [];
    const CONCURRENCY_LIMIT = 5;

    for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
      const batch = files.slice(i, i + CONCURRENCY_LIMIT);

      const uploadPromises = batch.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return uploadImageBuffer(drive, file.name, buffer, volumeId);
      });

      const batchResults = await Promise.all(uploadPromises);
      uploadedIds.push(...batchResults);
    }

    return NextResponse.json({
      message: 'Upload successful!',
      uploadedCount: uploadedIds.length,
      volumeFolderId: volumeId,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error during upload.' }, { status: 500 });
  }
}
