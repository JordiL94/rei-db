'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface PageItem {
  id: string;
  name: string;
}

interface MangaReaderProps {
  pages: PageItem[];
  volumeName: string;
  backUrl: string;
}

export function MangaReader({ pages, volumeName, backUrl }: MangaReaderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'double'>('single');
  const [readingDirection, setReadingDirection] = useState<'rtl' | 'ltr'>('rtl'); // Default to Manga style!
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const MIN_SWIPE_DISTANCE = 50;

  // --- Preloader Logic ---
  // Look 3 pages ahead of our current position
  const PRELOAD_COUNT = 3;
  const pagesToPreload = pages.slice(currentIndex + 1, currentIndex + 1 + PRELOAD_COUNT);

  // --- Navigation Logic ---
  const handleNext = () => {
    if (viewMode === 'single') {
      if (currentIndex < pages.length - 1) setCurrentIndex((prev) => prev + 1);
    } else {
      if (currentIndex < pages.length - 2)
        setCurrentIndex((prev) => Math.min(prev + 2, pages.length - 1));
    }
  };

  const handlePrev = () => {
    if (viewMode === 'single') {
      if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
    } else {
      if (currentIndex > 0) setCurrentIndex((prev) => Math.max(prev - 2, 0));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // In RTL (Manga), the left arrow goes to the NEXT page. In LTR (Comics), right arrow goes NEXT.
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
  }, [currentIndex, viewMode, readingDirection]);

  // Touch Swipe Handling
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;

    // Swipe left (finger moves left). In RTL, this goes PREV. In LTR, this goes NEXT.
    if (distance > MIN_SWIPE_DISTANCE) readingDirection === 'rtl' ? handlePrev() : handleNext();
    // Swipe right (finger moves right). In RTL, this goes NEXT. In LTR, this goes PREV.
    if (distance < -MIN_SWIPE_DISTANCE) readingDirection === 'rtl' ? handleNext() : handlePrev();

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // --- Smart Click Navigation (PC) ---
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Measure the screen width and the user's click position
    const screenWidth = window.innerWidth;
    const clickX = e.clientX;

    if (clickX < screenWidth / 2) {
      // Clicked Left Half: In RTL, go Next. In LTR, go Prev.
      readingDirection === 'rtl' ? handleNext() : handlePrev();
    } else {
      // Clicked Right Half: In RTL, go Prev. In LTR, go Next.
      readingDirection === 'rtl' ? handlePrev() : handleNext();
    }
  };

  const handleImageLoad = (id: string) => {
    setLoadedImages((prev) => new Set(prev).add(id));
  };

  const firstPage = pages[currentIndex];
  const secondPage =
    viewMode === 'double' && currentIndex + 1 < pages.length ? pages[currentIndex + 1] : null;

  // Determine rendering order based on Reading Direction
  const leftPage = readingDirection === 'rtl' ? secondPage : firstPage;
  const rightPage = readingDirection === 'rtl' ? firstPage : secondPage;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black text-white select-none">
      {/* Ghost Preloader: Silently fetches upcoming pages into browser RAM */}
      <div className="hidden">
        {pagesToPreload.map((page) => (
          <img key={`preload-${page.id}`} src={`/api/image/${page.id}`} alt="preload" />
        ))}
      </div>

      {/* 1. Top Control Bar */}
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

        <div className="flex items-center gap-2 md:gap-4">
          {/* Direction Toggle */}
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

          {/* View Mode Toggle */}
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

      {/* 2. Interactive Canvas Container */}
      <main
        className="relative flex flex-1 cursor-pointer items-center justify-center overflow-hidden bg-zinc-950 px-2 py-0 md:px-6"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleCanvasClick}
      >
        {/* Panel View Display Canvas */}
        <div className="flex h-full w-full items-center justify-center">
          {viewMode === 'single' ? (
            /* --- SINGLE PAGE LAYOUT --- */
            <div className="relative flex h-full min-h-0 w-full min-w-0 items-center justify-center">
              {!loadedImages.has(firstPage.id) && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-[var(--accent-primary)]" />
                </div>
              )}
              <Image
                key={firstPage.id}
                src={`/api/image/${firstPage.id}`}
                alt={firstPage.name}
                fill
                unoptimized
                priority
                onLoad={() => handleImageLoad(firstPage.id)}
                className={`pointer-events-auto object-contain object-center transition-opacity duration-300 ${!loadedImages.has(firstPage.id) ? 'opacity-0' : 'opacity-100'}`}
              />
            </div>
          ) : (
            /* --- DOUBLE PAGE LAYOUT --- */
            <>
              {/* Left Side (Visual Left) */}
              {leftPage && (
                <div className="relative flex h-full min-h-0 w-1/2 min-w-0 items-center justify-end">
                  {!loadedImages.has(leftPage.id) && (
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-[var(--accent-primary)]" />
                    </div>
                  )}
                  <Image
                    key={leftPage.id}
                    src={`/api/image/${leftPage.id}`}
                    alt={leftPage.name}
                    fill
                    unoptimized
                    priority
                    onLoad={() => handleImageLoad(leftPage.id)}
                    className={`pointer-events-auto object-contain object-right transition-opacity duration-300 ${!loadedImages.has(leftPage.id) ? 'opacity-0' : 'opacity-100'}`}
                  />
                </div>
              )}

              {/* Right Side (Visual Right) */}
              {rightPage && (
                <div className="relative flex h-full min-h-0 w-1/2 min-w-0 items-center justify-start">
                  {!loadedImages.has(rightPage.id) && (
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-[var(--accent-primary)]" />
                    </div>
                  )}
                  <Image
                    key={rightPage.id}
                    src={`/api/image/${rightPage.id}`}
                    alt={rightPage.name}
                    fill
                    unoptimized
                    priority
                    onLoad={() => handleImageLoad(rightPage.id)}
                    className={`pointer-events-auto object-contain object-left transition-opacity duration-300 ${!loadedImages.has(rightPage.id) ? 'opacity-0' : 'opacity-100'}`}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 3. Bottom Execution Status Bar */}
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
    </div>
  );
}
