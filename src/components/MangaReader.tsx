'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TranslationBubble, TranslationData } from '@/components/TranslationBubble';
import { TranslationDrawer } from '@/components/TranslationDrawer';
import { TranslationControls } from '@/components/TranslationControls';

interface PageItem {
  id: string;
  name: string;
}

interface MangaReaderProps {
  pages: PageItem[];
  volumeName: string;
  backUrl: string;
}

// 1. The API Fetcher Function
const fetchTranslation = async (imageId: string): Promise<TranslationData[]> => {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageId }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'MAGI processing failed');
  return data.data;
};

export function MangaReader({ pages, volumeName, backUrl }: MangaReaderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'double'>('single');
  const [readingDirection, setReadingDirection] = useState<'rtl' | 'ltr'>('rtl');
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const [showAllTranslations, setShowAllTranslations] = useState(false);
  const [activeDrawerItem, setActiveDrawerItem] = useState<TranslationData | null>(null);

  const [autoMode, setAutoMode] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null); // NEW: Track Y axis
  const MIN_SWIPE_DISTANCE = 50;

  // --- Preloader Logic ---
  const PRELOAD_COUNT = 3;
  const pagesToPreload = pages.slice(currentIndex + 1, currentIndex + 1 + PRELOAD_COUNT);

  // --- View Calculation ---
  const firstPage = pages[currentIndex];
  const secondPage =
    viewMode === 'double' && currentIndex + 1 < pages.length ? pages[currentIndex + 1] : null;

  const leftPage = readingDirection === 'rtl' ? secondPage : firstPage;
  const rightPage = readingDirection === 'rtl' ? firstPage : secondPage;

  const queryClient = useQueryClient();

  const firstPageQuery = useQuery({
    queryKey: ['translation', firstPage.id],
    queryFn: () => fetchTranslation(firstPage.id),
    enabled: autoMode, // Do not run automatically on render
  });

  const secondPageQuery = useQuery({
    queryKey: ['translation', secondPage?.id],
    queryFn: () => fetchTranslation(secondPage!.id),
    enabled: autoMode && !!secondPage, // Do not run automatically on render
  });

  // Derived queries based on layout direction (fixes the double-page mapping bug!)
  const leftPageQuery = readingDirection === 'rtl' ? secondPageQuery : firstPageQuery;
  const rightPageQuery = readingDirection === 'rtl' ? firstPageQuery : secondPageQuery;

  // NEW: Accurate global fetching state
  const isTranslating =
    firstPageQuery.isFetching ||
    (viewMode === 'double' && !!secondPage && secondPageQuery.isFetching);

  // --- The Execution Trigger ---
  const handleTranslateView = async () => {
    const fetchPromises = [];

    // If the data isn't in cache yet, command TanStack to fetch it
    if (!firstPageQuery.data) fetchPromises.push(firstPageQuery.refetch());
    if (secondPage && !secondPageQuery.data) fetchPromises.push(secondPageQuery.refetch());

    if (fetchPromises.length > 0) {
      await Promise.all(fetchPromises);
    }

    // Once data is secured (or if it was already cached), reveal the bubbles
    setShowAllTranslations(true);
  };

  // --- Navigation Logic ---
  const handleNext = useCallback(() => {
    if (viewMode === 'single') {
      if (currentIndex < pages.length - 1) setCurrentIndex((prev) => prev + 1);
    } else {
      if (currentIndex < pages.length - 2)
        setCurrentIndex((prev) => Math.min(prev + 2, pages.length - 1));
    }
  }, [currentIndex, pages.length, viewMode]);

  const handlePrev = useCallback(() => {
    if (viewMode === 'single') {
      if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
    } else {
      if (currentIndex > 0) setCurrentIndex((prev) => Math.max(prev - 2, 0));
    }
  }, [currentIndex, viewMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readingDirection === 'rtl') {
        if (e.key === 'ArrowLeft') handleNext();
        if (e.key === 'ArrowRight') handlePrev();
      } else {
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'ArrowLeft') handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, viewMode, readingDirection, handleNext, handlePrev]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const currentX = e.changedTouches[0].clientX;
    const currentY = e.changedTouches[0].clientY;

    const dragDistanceX = touchStartX.current - currentX; // Positive = swiped left
    const dragDistanceY = touchStartY.current - currentY;

    // Reset touch refs immediately
    touchStartX.current = null;
    touchStartY.current = null;

    // THE ANTI-JITTER: Ignore diagonal or vertical swipes
    if (Math.abs(dragDistanceY) > Math.abs(dragDistanceX)) return;

    // Trigger Navigation
    if (dragDistanceX > MIN_SWIPE_DISTANCE) {
      readingDirection === 'rtl' ? handlePrev() : handleNext();
    } else if (dragDistanceX < -MIN_SWIPE_DISTANCE) {
      readingDirection === 'rtl' ? handleNext() : handlePrev();
    }
  };

  const handleImageLoad = (id: string) => setLoadedImages((prev) => new Set(prev).add(id));

  // --- Background Translation Pre-fetcher ---
  useEffect(() => {
    if (!autoMode) return;

    // Silently queue up the next 3 pages in the background
    pagesToPreload.forEach((page) => {
      queryClient
        .prefetchQuery({
          queryKey: ['translation', page.id],
          queryFn: () => fetchTranslation(page.id),
        })
        .catch();
    });
  }, [currentIndex, autoMode, pagesToPreload, queryClient]);

  return (
    <div className="fixed inset-0 z-40 flex h-[100dvh] flex-col bg-black text-white select-none">
      <div className="hidden">
        {pagesToPreload.map((page) => (
          <img key={`preload-${page.id}`} src={`/api/image/${page.id}`} alt="preload" />
        ))}
      </div>

      <header className="z-50 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-4">
          <Link
            href={backUrl}
            className="flex items-center text-sm font-medium text-zinc-400 transition-colors hover:text-white"
          >
            <span className="mr-2">←</span> <span className="hidden md:inline">Terminal</span>
          </Link>
          <h1 className="max-w-[150px] truncate text-sm font-bold text-zinc-200 md:max-w-xs md:text-base">
            {volumeName}
          </h1>
        </div>

        {/* Dynamic MAGI Status Indicator */}
        <div
          className={`hidden font-mono text-[10px] tracking-widest uppercase transition-all duration-300 sm:block sm:text-xs ${
            isTranslating
              ? 'animate-pulse text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
              : 'text-zinc-500'
          }`}
        >
          {isTranslating ? 'MAGI System: Analyzing Target...' : 'Neural Connection: Stable'}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex rounded-lg bg-zinc-800 p-1 text-xs font-medium">
            <button
              onClick={() => setAutoMode(false)}
              className={`rounded-md px-3 py-1.5 transition-all ${!autoMode ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Manual
            </button>
            <button
              onClick={() => {
                setAutoMode(true);
                setShowAllTranslations(true); // Ensure bubbles are visible when switching to auto!
              }}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 transition-all ${autoMode ? 'bg-[var(--accent-primary)] text-white shadow-[0_0_10px_rgba(var(--accent-primary-rgb),0.5)]' : 'text-zinc-400 hover:text-white'}`}
            >
              Auto <span className="animate-pulse">✧</span>
            </button>
          </div>

          <div className="hidden rounded-lg bg-zinc-800 p-1 text-xs font-medium md:flex">
            <button
              onClick={() => setReadingDirection('ltr')}
              className={`rounded-md px-3 py-1.5 transition-all ${readingDirection === 'ltr' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              LTR (Comic)
            </button>
            <button
              onClick={() => setReadingDirection('rtl')}
              className={`rounded-md px-3 py-1.5 transition-all ${readingDirection === 'rtl' ? 'bg-[var(--accent-primary)] text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              RTL (Manga)
            </button>
          </div>
          <div className="flex rounded-lg bg-zinc-800 p-1 text-xs font-medium">
            <button
              onClick={() => setViewMode('single')}
              className={`rounded-md px-2 py-1.5 transition-all md:px-3 ${viewMode === 'single' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Single
            </button>
            <button
              onClick={() => setViewMode('double')}
              className={`rounded-md px-2 py-1.5 transition-all md:px-3 ${viewMode === 'double' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Double
            </button>
          </div>
        </div>
      </header>

      <main
        className="relative flex flex-1 touch-none items-center justify-center overflow-hidden bg-zinc-950 px-2 py-0 select-none md:px-6"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* --- THE PC CLICK ZONES (Completely invisible on iPad/Mobile) --- */}
        <div
          className="absolute top-0 bottom-0 left-0 z-20 w-1/2 cursor-pointer [@media(pointer:coarse)]:hidden"
          onClick={() => {
            // If drawer is open, dismiss it. Otherwise, navigate.
            if (activeDrawerItem) return setActiveDrawerItem(null);
            readingDirection === 'rtl' ? handleNext() : handlePrev();
          }}
        />
        <div
          className="absolute top-0 right-0 bottom-0 z-20 w-1/2 cursor-pointer [@media(pointer:coarse)]:hidden"
          onClick={() => {
            // If drawer is open, dismiss it. Otherwise, navigate.
            if (activeDrawerItem) return setActiveDrawerItem(null);
            readingDirection === 'rtl' ? handlePrev() : handleNext();
          }}
        />

        <div className="pointer-events-none flex h-full w-full items-center justify-center">
          {viewMode === 'single' ? (
            <div className="pointer-events-auto relative flex h-full w-full items-center justify-center">
              <div className="relative h-fit w-fit max-w-full">
                {!loadedImages.has(firstPage.id) && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-[var(--accent-primary)]" />
                  </div>
                )}
                <img
                  key={firstPage.id}
                  src={`/api/image/${firstPage.id}`}
                  alt={firstPage.name}
                  onLoad={() => handleImageLoad(firstPage.id)}
                  className={`block h-auto max-h-[calc(100dvh-120px)] w-auto max-w-full transition-opacity duration-300 ${!loadedImages.has(firstPage.id) ? 'opacity-0' : 'opacity-100'}`}
                />
                {/* BUBBLE LAYER (z-30) */}
                {firstPageQuery.data?.map((trans, i) => (
                  <TranslationBubble
                    key={i}
                    data={trans}
                    globalShow={showAllTranslations}
                    onOpenDrawer={setActiveDrawerItem}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Left Side Double Page */}
              {leftPage && (
                <div className="pointer-events-auto flex h-full w-1/2 items-center justify-end">
                  <div className="relative h-fit w-fit max-w-full">
                    {!loadedImages.has(leftPage.id) && (
                      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-[var(--accent-primary)]" />
                      </div>
                    )}
                    <img
                      key={leftPage.id}
                      src={`/api/image/${leftPage.id}`}
                      alt={leftPage.name}
                      onLoad={() => handleImageLoad(leftPage.id)}
                      className={`block h-auto max-h-[calc(100dvh-120px)] w-auto max-w-full transition-opacity duration-300 ${!loadedImages.has(leftPage.id) ? 'opacity-0' : 'opacity-100'}`}
                    />
                    {leftPageQuery.data?.map((trans, i) => (
                      <TranslationBubble
                        key={i}
                        data={trans}
                        globalShow={showAllTranslations}
                        onOpenDrawer={setActiveDrawerItem}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Right Side Double Page */}
              {rightPage && (
                <div className="pointer-events-auto flex h-full w-1/2 items-center justify-start">
                  <div className="relative h-fit w-fit max-w-full">
                    {!loadedImages.has(rightPage.id) && (
                      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-[var(--accent-primary)]" />
                      </div>
                    )}
                    <img
                      key={rightPage.id}
                      src={`/api/image/${rightPage.id}`}
                      alt={rightPage.name}
                      onLoad={() => handleImageLoad(rightPage.id)}
                      className={`block h-auto max-h-[calc(100dvh-120px)] w-auto max-w-full transition-opacity duration-300 ${!loadedImages.has(rightPage.id) ? 'opacity-0' : 'opacity-100'}`}
                    />
                    {rightPageQuery.data?.map((trans, i) => (
                      <TranslationBubble
                        key={i}
                        data={trans}
                        globalShow={showAllTranslations}
                        onOpenDrawer={setActiveDrawerItem}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <TranslationControls
        isTranslating={isTranslating}
        onTranslate={handleTranslateView}
        showAll={showAllTranslations}
        onToggleShowAll={() => setShowAllTranslations(!showAllTranslations)}
      />

      <footer className="z-50 flex h-14 items-center justify-between border-t border-zinc-800 bg-zinc-900/90 px-6 font-mono text-xs text-zinc-400">
        <div className="w-24">
          {viewMode === 'double' && secondPage ? (
            <span>
              Pg {currentIndex + 1}-{currentIndex + 2} / {pages.length}
            </span>
          ) : (
            <span>
              Pg {currentIndex + 1} / {pages.length}
            </span>
          )}
        </div>
        <div className="flex max-w-2xl flex-1 justify-center px-4 md:px-12">
          <input
            type="range"
            min="0"
            max={pages.length - 1}
            value={currentIndex}
            onChange={(e) => setCurrentIndex(Number(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700 focus:outline-none"
            style={readingDirection === 'rtl' ? { direction: 'rtl' } : {}}
          />
        </div>
        <div className="hidden w-24 text-right tracking-tight text-zinc-500 md:block">
          Rei_DB.sys
        </div>
      </footer>

      <TranslationDrawer
        isOpen={activeDrawerItem !== null}
        data={activeDrawerItem}
        onClose={() => setActiveDrawerItem(null)}
      />
    </div>
  );
}
