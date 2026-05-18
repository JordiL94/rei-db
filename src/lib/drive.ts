import { google } from 'googleapis';
import { Readable } from 'stream';

// 1. Initialize the Google Drive Client using the token from NextAuth
export function getDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

// 2. The core logic: Find a folder by name, or create it if it doesn't exist
export async function findOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  folderName: string,
  parentId?: string
): Promise<string> {
  // Construct the search query to find the specific folder
  const query = [
    `mimeType='application/vnd.google-apps.folder'`,
    `name='${folderName.replace(/'/g, "\\'")}'`, // Escape apostrophes just in case
    `trashed=false`,
  ];

  if (parentId) {
    query.push(`'${parentId}' in parents`);
  }

  // Search Drive
  const res = await drive.files.list({
    q: query.join(' and '),
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  // If we found it, return its ID immediately
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    // If parentId exists, spread the object { parents: [parentId] } into fileMetadata
    ...(parentId && { parents: [parentId] }),
  };

  const createRes = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  });

  return createRes.data.id!;
}

// 3. Helper to stream an uploaded file buffer directly into Google Drive
export async function uploadImageBuffer(
  drive: ReturnType<typeof google.drive>,
  fileName: string,
  buffer: Buffer,
  parentId: string
): Promise<string> {
  // Convert Node.js Buffer into a readable stream for the Google API
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
}

// 4. Helper to list all folders inside a specific parent folder
export async function listFolders(drive: ReturnType<typeof google.drive>, parentId: string) {
  const res = await drive.files.list({
    // Only fetch folders, must be inside the parent, don't fetch trashed items
    q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    orderBy: 'name', // Alphabetical order
  });

  return res.data.files || [];
}

// 5. Get the very first image inside a specific folder
export async function getFirstImageInFolder(
  drive: ReturnType<typeof google.drive>,
  folderId: string
) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
    orderBy: 'name', // Guarantee we get page_001
    pageSize: 1, // We only need one!
    fields: 'files(id)',
  });
  return res.data.files?.[0]?.id || null;
}

// 6. Traverse down: Series -> First Volume -> First Image
export async function getSeriesCoverId(drive: ReturnType<typeof google.drive>, seriesId: string) {
  const volumes = await listFolders(drive, seriesId);
  if (volumes.length === 0) return null;

  return await getFirstImageInFolder(drive, volumes[0].id!);
}

// 7. Get basic metadata (like the name) of a specific file/folder
export async function getFolderMetadata(drive: ReturnType<typeof google.drive>, folderId: string) {
  const res = await drive.files.get({
    fileId: folderId,
    fields: 'id, name',
  });
  return res.data;
}

// 8. The MAGI Purge Command (Permanently delete a file or folder)
export async function deleteDriveItem(drive: ReturnType<typeof google.drive>, fileId: string) {
  await drive.files.delete({
    fileId: fileId,
  });
  return true;
}

// 9. Fetch all images inside a specific folder, ordered alphabetically by name
export async function listImagesInFolder(drive: ReturnType<typeof google.drive>, folderId: string) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
    fields: 'files(id, name)',
    orderBy: 'name', // Forces alphabetical and numerical sorting
    pageSize: 1000, // Ensures full chapters are fetched at once
  });

  return res.data.files || [];
}
