import * as React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SignOutButton } from '@/components/AuthButtons';
import { SidebarNav } from '@/components/SidebarNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Rei DB',
  description: 'Personal Google Drive Media Hub',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body className={`${inter.className} flex h-screen overflow-hidden bg-[var(--bg-main)]`}>
        <Providers>
          {/* DESKTOP SIDEBAR (Hidden on mobile) */}
          <aside className="z-10 hidden w-64 flex-shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm md:flex">
            <div className="flex h-16 items-center border-b border-[var(--border-subtle)] px-6">
              <h1 className="text-2xl font-black tracking-tighter text-[var(--accent-primary)]">
                Rei DB
              </h1>
            </div>

            {session ? (
              <nav className="flex-1 overflow-y-auto px-4 py-6">
                <SidebarNav />
              </nav>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 text-center">
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  Connect your account to see your files.
                </p>
              </div>
            )}

            <div className="border-t border-[var(--border-subtle)] p-4">
              {session ? (
                <div className="flex items-center gap-3">
                  <img
                    src={session.user?.image || ''}
                    alt="Profile"
                    className="h-9 w-9 rounded-full border border-[var(--border-subtle)]"
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-bold text-[var(--text-primary)]">
                      {session.user?.name}
                    </span>
                    <SignOutButton />
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm font-medium text-[var(--text-secondary)]">
                  Not Authenticated
                </div>
              )}
            </div>
          </aside>

          {/* MAIN CONTENT WRAPPER */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* MOBILE HEADER (Hidden on desktop) */}
            <header className="z-10 flex h-16 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 shadow-sm md:hidden">
              <h1 className="text-xl font-black tracking-tighter text-[var(--accent-primary)]">
                Rei DB
              </h1>
              {/* We will add a mobile hamburger menu here later */}
              <div className="h-8 w-8 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)]"></div>
            </header>

            {/* MAIN PAGE CONTENT */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
