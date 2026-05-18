'use client';

import { signIn, signOut } from 'next-auth/react';

export function SignInButton() {
  return (
    <button
      onClick={() => signIn('google')}
      className="w-full rounded-xl bg-[var(--accent-primary)] px-8 py-3 font-semibold text-white shadow-sm transition-all hover:bg-[var(--accent-primary-hover)] hover:shadow-md active:scale-95"
    >
      Connect Google Drive
    </button>
  );
}

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-red-500"
    >
      Log Out
    </button>
  );
}
