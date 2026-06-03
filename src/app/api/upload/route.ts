import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  getDriveClient,
  findOrCreateFolder,
  uploadImageBuffer,
  checkIfFolderExists,
} from '@/lib/drive';

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

    // Create or find root. If it returns null, Drive API failed, abort the upload.
    const rootId = await findOrCreateFolder(drive, 'MangaHub_Root');
    if (!rootId) throw new Error('Failed to resolve Root folder');

    const seriesId = await findOrCreateFolder(drive, seriesName, rootId);
    if (!seriesId) throw new Error('Failed to resolve Series folder');

    // THE CIRCUIT BREAKER: Only check on the very first chunk of a volume
    if (isFirstChunk) {
      const volumeExists = await checkIfFolderExists(drive, volumeName, seriesId);

      if (volumeExists) {
        // Boom. Volume exists. Tell the frontend to abort sending any more chunks for this volume.
        return NextResponse.json({
          skipVolume: true,
          message: 'Volume folder already exists. Skipping.',
        });
      }
    }

    // If we reach here, either the volume didn't exist, OR this is chunk 2, 3, 4, etc.
    const volumeId = await findOrCreateFolder(drive, volumeName, seriesId);
    if (!volumeId) throw new Error('Failed to resolve Volume folder');

    // Upload the Images
    const uploadedIds: string[] = [];
    const CONCURRENCY_LIMIT = 5;

    for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
      const batch = files.slice(i, i + CONCURRENCY_LIMIT);

      const uploadPromises = batch.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // uploadImageBuffer now returns string | null, we filter out nulls below
        return uploadImageBuffer(drive, file.name, buffer, volumeId);
      });

      const batchResults = await Promise.all(uploadPromises);
      // Filter out any nulls if an individual image failed
      uploadedIds.push(...(batchResults.filter(Boolean) as string[]));
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
