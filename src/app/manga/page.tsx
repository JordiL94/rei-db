import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getDriveClient, findOrCreateFolder, listFolders, getSeriesCoverId } from '@/lib/drive';
import { UploadForm } from '@/components/UploadForm';
import Image from 'next/image';

export default async function MangaLibrary() {
  const session = await getServerSession(authOptions);

  // Protect the route: if not logged in, kick them to the dashboard
  if (!session || !session.accessToken) {
    redirect('/');
  }

  // Fetch the data directly from Google Drive
  const drive = getDriveClient(session.accessToken);
  const rootId = await findOrCreateFolder(drive, 'MangaHub_Root');
  const baseSeriesList = await listFolders(drive, rootId);

  // Fetch the cover image ID for every series simultaneously
  const seriesList = await Promise.all(
    baseSeriesList.map(async (series) => {
      const coverId = await getSeriesCoverId(drive, series.id!);
      return { ...series, coverId };
    })
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <header className="flex items-end justify-between border-b border-[var(--border-subtle)] pb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
            Manga Library
          </h2>
          <p className="mt-1 text-[var(--text-secondary)]">Central Dogma Data Storage</p>
        </div>
        <div className="text-sm font-semibold text-[var(--text-secondary)]">
          {seriesList.length} {seriesList.length === 1 ? 'Series' : 'Series'} Found
        </div>
      </header>

      {/* The Contextual Uploader */}
      <section>
        <UploadForm fixedCategory="manga" />
      </section>

      {seriesList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-hover)] p-16 text-center">
          <div className="mb-4 text-4xl opacity-50">🗂️</div>
          <p className="text-lg font-medium text-[var(--text-primary)]">
            Anywhere can be paradise as long as you have the will to live.
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            But your library is currently empty. Upload some manga.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {seriesList.map((series) => (
            <Link
              href={`/manga/${series.id}`}
              key={series.id}
              className="group flex flex-col items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-sm transition-all hover:border-[var(--accent-primary)] hover:shadow-md"
            >
              {/* The Cover Image Area */}
              {/* NOTE: Added 'relative' to this div! */}
              <div className="relative mb-4 flex h-56 w-full items-center justify-center overflow-hidden rounded-lg bg-[var(--bg-main)] text-[var(--text-secondary)] transition-colors group-hover:bg-[var(--bg-surface-hover)]">
                {series.coverId ? (
                  <Image
                    src={`/api/image/${series.coverId}`}
                    alt={`${series.name} cover`}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <svg
                    className="h-10 w-10 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                )}
              </div>
              <h3 className="w-full truncate text-center font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-primary)]">
                {series.name}
              </h3>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
