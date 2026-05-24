'use client';

import { useEffect } from 'react';
import { TranslationData } from './TranslationBubble';

interface TranslationDrawerProps {
  isOpen: boolean;
  data: TranslationData | null;
  onClose: () => void;
}

export function TranslationDrawer({ isOpen, data, onClose }: TranslationDrawerProps) {
  // Prevent scrolling on the main body when drawer is open on mobile
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Dark overlay backdrop (Visible only on mobile/iPad to focus attention) */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* The Drawer Panel */}
      <div
        className={`/* Mobile/iPad: Bottom Sheet */ /* PC Desktop: Right Sidebar */ fixed right-0 bottom-0 left-0 z-50 flex h-[60vh] flex-col rounded-t-2xl border-t border-zinc-800 bg-zinc-900 shadow-2xl transition-transform duration-300 ease-out md:top-0 md:right-0 md:bottom-0 md:left-auto md:h-full md:w-96 md:rounded-none md:border-l ${isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full'}`}
      >
        {/* Header & Close Button */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-[var(--accent-primary)]" />
            <h2 className="font-mono text-xs tracking-widest text-zinc-400 uppercase">
              Analysis Payload
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          {data ? (
            <>
              {/* 1. Raw Japanese */}
              <div>
                <h3 className="mb-2 text-[10px] font-bold text-zinc-500 uppercase">
                  Original Target
                </h3>
                <p className="text-2xl leading-relaxed font-bold text-white">{data.japanese}</p>
              </div>

              {/* 2. English Translation */}
              <div>
                <h3 className="mb-2 text-[10px] font-bold text-zinc-500 uppercase">Decoded</h3>
                <p className="text-lg text-zinc-300">{data.translation}</p>
              </div>

              {/* 3. Vocabulary Breakdown */}
              {data.breakdown.vocabulary.length > 0 && (
                <div>
                  <h3 className="mb-3 text-[10px] font-bold text-zinc-500 uppercase">
                    Vocabulary Nodes
                  </h3>
                  <div className="space-y-3">
                    {data.breakdown.vocabulary.map((vocab, i) => (
                      <div
                        key={i}
                        className="flex flex-col rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-3"
                      >
                        <div className="mb-1 flex items-baseline gap-2">
                          <span className="text-lg font-bold text-[var(--accent-primary)]">
                            {vocab.word}
                          </span>
                          <span className="font-mono text-xs text-zinc-400">[{vocab.reading}]</span>
                        </div>
                        <span className="text-sm text-zinc-300">{vocab.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Grammar Note */}
              {data.breakdown.grammar_note && (
                <div>
                  <h3 className="mb-2 text-[10px] font-bold text-zinc-500 uppercase">
                    Structural Note
                  </h3>
                  <div className="rounded-lg border border-blue-500/20 bg-blue-900/20 p-4 text-sm leading-relaxed text-blue-200">
                    {data.breakdown.grammar_note}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center font-mono text-sm text-zinc-500">
              Awaiting target selection...
            </div>
          )}
        </div>
      </div>
    </>
  );
}
