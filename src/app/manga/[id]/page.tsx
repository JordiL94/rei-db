import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getDriveClient, listFolders, getFolderMetadata, getSeriesCoverId } from '@/lib/drive';
import Image from 'next/image';
import { ActionMenu } from '@/app/manga/[id]/ActionMenu';

export default async function MangaDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) redirect('/');

  const resolvedParams = await params;
  const seriesId = resolvedParams.id;

  // Fetch the series name, volumes, and cover image concurrently
  const drive = getDriveClient(session.accessToken);
  const [seriesMeta, volumes, coverId] = await Promise.all([
    getFolderMetadata(drive, seriesId),
    listFolders(drive, seriesId),
    getSeriesCoverId(drive, seriesId),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      {/* 1. Navigation & Actions Header */}
      <nav className="flex items-center justify-between text-sm font-medium">
        <Link
          href="/manga"
          className="flex items-center text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-primary)]"
        >
          <span className="mr-2">←</span> Back to Central Dogma
        </Link>

        {/* Delete Entire Series Button */}
        <ActionMenu targetId={seriesId} targetName={seriesMeta.name!} isSeries={true} />
      </nav>

      {/* 2. The Hero Banner */}
      <div className="relative flex h-64 items-end overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 shadow-sm">
        {coverId && (
          <div className="absolute inset-0 opacity-20 blur-sm">
            <Image
              src={`/api/image/${coverId}`}
              alt="Cover Blur"
              fill
              unoptimized
              className="object-cover"
            />
            {/* Gradient overlay to ensure text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] to-transparent" />
          </div>
        )}
        <div className="relative z-10 flex w-full items-end justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)]">
              {seriesMeta.name}
            </h1>
            <p className="mt-2 font-mono text-[var(--text-secondary)]">
              {volumes.length} Volumes Detected
            </p>
          </div>
        </div>
      </div>

      {/* 3. The Volumes Grid */}
      {volumes.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-center text-[var(--text-secondary)]">
          No volumes found. Return to the dashboard to initiate upload sequence.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {volumes.map((vol) => (
            <div
              key={vol.id}
              className="group relative flex flex-col items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 shadow-sm transition-all hover:border-[var(--accent-primary)] hover:shadow-md"
            >
              {/* The clickable link to the actual reader */}
              <Link href={`/manga/${seriesId}/${vol.id}`} className="absolute inset-0 z-10" />

              {/* NEW: Kebab Menu for the Volume (Top Right) */}
              <div className="absolute top-2 right-2 z-20">
                <ActionMenu targetId={vol.id!} targetName={vol.name!} isSeries={false} />
              </div>

              <div className="mb-4 text-5xl opacity-50 transition-transform duration-300 group-hover:-translate-y-1 group-hover:opacity-100">
                📁
              </div>
              <h3 className="w-full truncate text-center font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-primary)]">
                {vol.name}
              </h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
