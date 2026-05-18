'use client';

import { useEffect, useState } from 'react';

const evaMessages = [
  'MAGI System Querying Central Dogma...',
  'Synchronizing with Google Drive...',
  'Analyzing Data Patterns...',
  'Pattern Blue Confirmed. Manga detected.',
  "God's in his heaven. All's right with the world.",
];

export default function Loading() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % evaMessages.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-center">
      {/* The NGE "Emergency" style pulsing border */}
      <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full border-4 border-[var(--accent-primary)] opacity-20"></div>
        <div className="absolute inset-2 animate-pulse rounded-full border-4 border-[var(--accent-primary)] opacity-40"></div>
        <div className="z-10 text-3xl">🗂️</div>
      </div>

      <h3 className="mb-2 font-mono text-xl font-bold tracking-widest text-[var(--text-primary)] uppercase">
        Accessing Records
      </h3>
      <p className="h-6 animate-pulse font-mono text-sm font-medium text-[var(--accent-primary)]">
        {evaMessages[messageIndex]}
      </p>
    </div>
  );
}
