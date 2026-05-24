'use client';

import { useState } from 'react';

export interface TranslationBreakdown {
  vocabulary: { word: string; reading: string; meaning: string }[];
  grammar_note: string | null;
}

export interface TranslationData {
  box_2d: [number, number, number, number];
  type: 'dialogue' | 'sfx' | 'narrative';
  japanese: string;
  translation: string;
  breakdown: TranslationBreakdown;
}

interface TranslationBubbleProps {
  data: TranslationData;
  globalShow: boolean;
  onOpenDrawer: (data: TranslationData) => void;
}

export function TranslationBubble({ data, globalShow, onOpenDrawer }: TranslationBubbleProps) {
  const [ymin, xmin, ymax, xmax] = data.box_2d;

  const [isVisible, setIsVisible] = useState(globalShow);
  const [prevGlobalShow, setPrevGlobalShow] = useState(globalShow);

  if (globalShow !== prevGlobalShow) {
    setIsVisible(globalShow);
    setPrevGlobalShow(globalShow);
  }

  // Calculate strict dimensions from Gemini's coordinates
  const top = `${ymin / 10}%`;
  const left = `${xmin / 10}%`;
  // Add 1.5rem (24px) to the width to compensate for the internal left/right padding
  const boxWidth = `calc(${(xmax - xmin) / 10}% + 1.5rem)`;
  const boxHeight = `${(ymax - ymin) / 10}%`; // Used just for the invisible hitbox

  return (
    <div
      // NEW: Added negative margins to pull the box left and up, perfectly aligning the text
      className="group absolute z-30 -mt-0.5 -ml-2 hover:z-50 sm:-mt-1 sm:-ml-3"
      style={{ top, left, width: boxWidth, minWidth: '110px' }}
      onClick={(e) => {
        e.stopPropagation();
        setIsVisible(!isVisible);
      }}
    >
      {/* Invisible Hitbox: Maintains the exact height of the original Japanese text so you can hover/tap it easily when hidden */}
      {!isVisible && (
        <div
          className="absolute top-0 left-0 w-full cursor-pointer rounded-md border-2 border-transparent transition-colors group-hover:border-[var(--accent-primary)]/50"
          style={{ height: boxHeight }}
        />
      )}

      {/* The Actual Translation Bubble */}
      <div
        className={`relative h-auto w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900/95 px-2 py-0.5 text-white shadow-2xl backdrop-blur-sm transition-all duration-200 sm:px-3 sm:py-1 ${
          isVisible
            ? 'pointer-events-auto scale-100 opacity-100'
            : 'pointer-events-none scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100'
        }`}
      >
        <span className="block text-[11px] leading-tight font-medium break-words whitespace-pre-wrap sm:text-xs md:text-sm">
          {data.translation}
        </span>

        {/* The Info Icon (Deep Dive Trigger) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDrawer(data);
          }}
          className="hover:bg-opacity-80 absolute -right-2 -bottom-2 z-40 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow-lg transition-all sm:h-6 sm:w-6"
        >
          <svg
            className="h-3 w-3 sm:h-4 sm:w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
