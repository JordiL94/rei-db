import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { getDriveClient, getFolderMetadata, listImagesInFolder } from '@/lib/drive';
import { MangaReader } from '@/components/MangaReader';

export default async function VolumeReaderPage({
  params,
}: {
  params: Promise<{ id: string; volumeId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) redirect('/');

  const resolvedParams = await params;
  const { id: seriesId, volumeId } = resolvedParams;

  const drive = getDriveClient(session.accessToken);

  // Concurrently fetch the volume name and the list of sorted image pages
  const [volumeMeta, images] = await Promise.all([
    getFolderMetadata(drive, volumeId),
    listImagesInFolder(drive, volumeId),
  ]);

  if (images.length === 0) {
    redirect(`/manga/${seriesId}`);
  }

  // Format the image array for the reader component
  const pages = images.map((img) => ({
    id: img.id!,
    name: img.name!,
  }));

  return (
    <MangaReader
      pages={pages}
      volumeName={volumeMeta?.name as string}
      backUrl={`/manga/${seriesId}`}
    />
  );
}
