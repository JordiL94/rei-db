import { google } from 'googleapis';
import { Readable } from 'stream';

// 1. Initialize the Google Drive Client
export function getDriveClient(accessToken: string) {
  if (!accessToken) {
    console.error('[Drive API] Initialization failed: No access token provided.');
    throw new Error('Missing Google Access Token');
  }
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

// 2. Find a folder by name, or create it if it doesn't exist
export async function findOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  folderName: string,
  parentId?: string
): Promise<string | null> {
  try {
    const query = [
      `mimeType='application/vnd.google-apps.folder'`,
      `name='${folderName.replace(/'/g, "\\'")}'`,
      `trashed=false`,
    ];

    if (parentId) query.push(`'${parentId}' in parents`);

    const res = await drive.files.list({
      q: query.join(' and '),
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id!;
    }

    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId && { parents: [parentId] }),
    };

    const createRes = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    return createRes.data.id!;
  } catch (error) {
    console.error(`[Drive API] findOrCreateFolder failed for "${folderName}":`, error);
    return null;
  }
}

// 2.5 Check if a folder already exists without creating it
export async function checkIfFolderExists(
  drive: ReturnType<typeof google.drive>,
  folderName: string,
  parentId: string
): Promise<boolean> {
  try {
    const query = [
      `mimeType='application/vnd.google-apps.folder'`,
      `name='${folderName.replace(/'/g, "\\'")}'`,
      `'${parentId}' in parents`,
      `trashed=false`,
    ].join(' and ');

    const res = await drive.files.list({
      q: query,
      fields: 'files(id)',
      spaces: 'drive',
    });

    return !!(res.data.files && res.data.files.length > 0);
  } catch (error) {
    console.error(`[Drive API] checkIfFolderExists failed for "${folderName}":`, error);
    // If the API fails (e.g., auth error), we return false to let the main try/catch block handle the downstream failure safely
    return false;
  }
}

// 3. Helper to stream an uploaded file buffer directly into Google Drive
export async function uploadImageBuffer(
  drive: ReturnType<typeof google.drive>,
  fileName: string,
  buffer: Buffer,
  parentId: string
): Promise<string | null> {
  try {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentId],
      },
      media: {
        mimeType: 'image/jpeg',
        body: stream,
      },
      fields: 'id',
    });

    return res.data.id!;
  } catch (error) {
    console.error(`[Drive API] uploadImageBuffer failed for "${fileName}":`, error);
    return null;
  }
}

// 4. Helper to list all folders inside a specific parent folder
export async function listFolders(drive: ReturnType<typeof google.drive>, parentId: string) {
  try {
    const res = await drive.files.list({
      q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'name',
    });
    return res.data.files || [];
  } catch (error) {
    console.error(`[Drive API] listFolders failed for parent "${parentId}":`, error);
    return []; // Return empty array to prevent mapping errors on the frontend
  }
}

// 5. Get the very first image inside a specific folder
export async function getFirstImageInFolder(
  drive: ReturnType<typeof google.drive>,
  folderId: string
) {
  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
      orderBy: 'name',
      pageSize: 1,
      fields: 'files(id)',
    });
    return res.data.files?.[0]?.id || null;
  } catch (error) {
    console.error(`[Drive API] getFirstImageInFolder failed for folder "${folderId}":`, error);
    return null;
  }
}

// 6. Traverse down: Series -> First Volume -> First Image
export async function getSeriesCoverId(drive: ReturnType<typeof google.drive>, seriesId: string) {
  try {
    const volumes = await listFolders(drive, seriesId);
    if (!volumes || volumes.length === 0) return null;

    return await getFirstImageInFolder(drive, volumes[0].id!);
  } catch (error) {
    console.error(`[Drive API] getSeriesCoverId failed for series "${seriesId}":`, error);
    return null;
  }
}

// 7. Get basic metadata (like the name) of a specific file/folder
export async function getFolderMetadata(drive: ReturnType<typeof google.drive>, folderId: string) {
  try {
    const res = await drive.files.get({
      fileId: folderId,
      fields: 'id, name',
    });
    return res.data;
  } catch (error) {
    console.error(`[Drive API] getFolderMetadata failed for folder "${folderId}":`, error);
    return null;
  }
}

// 8. Permanent deletion
export async function deleteDriveItem(drive: ReturnType<typeof google.drive>, fileId: string) {
  try {
    await drive.files.delete({
      fileId: fileId,
    });
    return true;
  } catch (error) {
    console.error(`[Drive API] deleteDriveItem failed for item "${fileId}":`, error);
    return false;
  }
}

// 9. Fetch all images inside a specific folder
export async function listImagesInFolder(drive: ReturnType<typeof google.drive>, folderId: string) {
  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'name',
      pageSize: 1000,
    });
    return res.data.files || [];
  } catch (error) {
    console.error(`[Drive API] listImagesInFolder failed for folder "${folderId}":`, error);
    return []; // Return empty array so UI maps over nothing instead of crashing
  }
}

// 10. Find a specific file by exact name (used for cache lookups)
export async function findFileByName(
  drive: ReturnType<typeof google.drive>,
  fileName: string
): Promise<string | null> {
  try {
    const res = await drive.files.list({
      q: `name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`,
      fields: 'files(id)',
      spaces: 'drive',
    });
    return res.data.files?.[0]?.id || null;
  } catch (error) {
    console.error(`[Drive API] findFileByName failed for "${fileName}":`, error);
    return null;
  }
}

// 11. Download a JSON file from Drive and parse it using Generics
export async function downloadJsonFile<T = unknown>(
  drive: ReturnType<typeof google.drive>,
  fileId: string
): Promise<T | null> {
  try {
    const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'json' });
    // Cast the response to the generic type provided by the caller
    return res.data as T;
  } catch (error) {
    console.error(`[Drive API] downloadJsonFile failed for ID "${fileId}":`, error);
    return null;
  }
}

// 12. Download an image as a base64 string (ready for Gemini payload)
export async function downloadImageForGemini(
  drive: ReturnType<typeof google.drive>,
  fileId: string
): Promise<{ base64Data: string; mimeType: string } | null> {
  try {
    const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
    const base64Data = Buffer.from(res.data as ArrayBuffer).toString('base64');
    const mimeType = res.headers['content-type'] || 'image/jpeg';
    return { base64Data, mimeType };
  } catch (error) {
    console.error(`[Drive API] downloadImageForGemini failed for ID "${fileId}":`, error);
    return null;
  }
}

// 13. Get the parent folder ID of a file
export async function getFileParentId(
  drive: ReturnType<typeof google.drive>,
  fileId: string
): Promise<string | null> {
  try {
    const res = await drive.files.get({
      fileId,
      fields: 'parents',
    });
    return res.data.parents?.[0] || null;
  } catch (error) {
    console.error(`[Drive API] getFileParentId failed for ID "${fileId}":`, error);
    return null;
  }
}

// 14. Upload JSON data to Drive using Generics
export async function uploadJsonFile<T = unknown>(
  drive: ReturnType<typeof google.drive>,
  fileName: string,
  jsonData: T,
  parentId?: string
): Promise<string | null> {
  try {
    const fileMetadata = {
      name: fileName,
      mimeType: 'application/json',
      ...(parentId && { parents: [parentId] }),
    };

    const media = {
      mimeType: 'application/json',
      body: Readable.from([JSON.stringify(jsonData)]),
    };

    const res = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });

    return res.data.id || null;
  } catch (error) {
    console.error(`[Drive API] uploadJsonFile failed for "${fileName}":`, error);
    return null;
  }
}
