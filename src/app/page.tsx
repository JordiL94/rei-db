import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SignInButton } from '@/components/AuthButtons';
import { UploadForm } from '@/components/UploadForm';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // THE LOCKED STATE
  if (!session) {
    return (
      <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center p-8 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="mb-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
          Rei DB is Locked
        </h2>
        <p className="mb-8 text-[var(--text-secondary)]">
          You need to connect your Google account to access your personal media hub.
        </p>
        <SignInButton />
      </div>
    );
  }

  // THE UNLOCKED STATE
  return (
    <div className="mx-auto max-w-6xl space-y-10 p-8">
      {/* 1. Welcome Header */}
      <header>
        <h2 className="mb-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">
          Welcome Back, {session.user?.name?.split(' ')[0] || 'User'}.
        </h2>
        <p className="text-[var(--text-secondary)]">
          Your personal Google Drive media hub is online.
        </p>
      </header>

      {/* 2. State of the App (Quick Stats) */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
            Connected Storage
          </h3>
          <div className="text-2xl font-bold text-[var(--text-primary)]">Google Drive</div>
          <p className="mt-2 text-sm font-medium text-green-600">Active & Authenticated</p>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
            Manga Library
          </h3>
          <div className="text-2xl font-bold text-[var(--text-primary)]">0 Volumes</div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Awaiting first sync</p>
        </div>
      </section>

      {/* 3. Primary Action (The Uploader) */}
      <section>
        <UploadForm />
      </section>

      {/* 4. Historical Context (Recent Activity) */}
      <section>
        <h3 className="mb-4 text-xl font-bold text-[var(--text-primary)]">Recent Uploads</h3>

        {/* Placeholder for future Drive API fetch */}
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-hover)] p-12 text-center opacity-75">
          <div className="mb-2 text-2xl">📂</div>
          <div className="font-medium text-[var(--text-primary)]">No recent activity</div>
          <div className="text-sm text-[var(--text-secondary)]">
            Volumes you upload will appear here.
          </div>
        </div>
      </section>
    </div>
  );
}
