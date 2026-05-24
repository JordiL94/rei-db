'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
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

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
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

  // --- TanStack Query Subscriptions ---
  // These hooks subscribe to the cache for the specific page IDs currently on screen.
  const firstPageQuery = useQuery({
    queryKey: ['translation', firstPage.id],
    queryFn: () => fetchTranslation(firstPage.id),
    enabled: false, // Do not run automatically on render
  });

  const secondPageQuery = useQuery({
    queryKey: ['translation', secondPage?.id],
    queryFn: () => fetchTranslation(secondPage!.id),
    enabled: false, // Do not run automatically on render
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
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > MIN_SWIPE_DISTANCE)
      return readingDirection === 'rtl' ? handlePrev() : handleNext();
    if (distance < -MIN_SWIPE_DISTANCE)
      return readingDirection === 'rtl' ? handleNext() : handlePrev();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const screenWidth = window.innerWidth;
    const clickX = e.clientX;
    if (clickX < screenWidth / 2) {
      return readingDirection === 'rtl' ? handleNext() : handlePrev();
    } else {
      return readingDirection === 'rtl' ? handlePrev() : handleNext();
    }
  };

  const handleImageLoad = (id: string) => setLoadedImages((prev) => new Set(prev).add(id));

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black text-white select-none">
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
        className="relative flex flex-1 cursor-pointer items-center justify-center overflow-hidden bg-zinc-950 px-2 py-0 md:px-6"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleCanvasClick}
      >
        <div className="flex h-full w-full items-center justify-center">
          {/* --- SINGLE PAGE LAYOUT --- */}
          {viewMode === 'single' ? (
            // Removed all padding classes here
            <div className="relative flex h-full w-full items-center justify-center">
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
                  // Perfect math: 100vh - (Header 64px + Footer 56px) = 120px
                  className={`block h-auto max-h-[calc(100vh-120px)] w-auto max-w-full transition-opacity duration-300 ${!loadedImages.has(firstPage.id) ? 'opacity-0' : 'opacity-100'}`}
                />
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
            /* --- DOUBLE PAGE LAYOUT --- */
            <>
              {/* Left Side */}
              {leftPage && (
                // Removed padding, strictly justify-end to push to the center line
                <div className="flex h-full w-1/2 items-center justify-end">
                  {/* Removed shadow-2xl to prevent dark borders in the center spread */}
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
                      className={`block h-auto max-h-[calc(100vh-120px)] w-auto max-w-full transition-opacity duration-300 ${!loadedImages.has(leftPage.id) ? 'opacity-0' : 'opacity-100'}`}
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

              {/* Right Side */}
              {rightPage && (
                // Removed padding, strictly justify-start to push to the center line
                <div className="flex h-full w-1/2 items-center justify-start">
                  {/* Removed shadow-2xl */}
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
                      className={`block h-auto max-h-[calc(100vh-120px)] w-auto max-w-full transition-opacity duration-300 ${!loadedImages.has(rightPage.id) ? 'opacity-0' : 'opacity-100'}`}
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
