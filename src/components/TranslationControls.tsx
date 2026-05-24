'use client';

interface TranslationControlsProps {
  isTranslating: boolean;
  onTranslate: () => void;
  showAll: boolean;
  onToggleShowAll: () => void;
}

export function TranslationControls({
  isTranslating,
  onTranslate,
  showAll,
  onToggleShowAll,
}: TranslationControlsProps) {
  return (
    // Removed backdrop-blur, changed to a simple flat transparent black, tightened padding
    <div className="absolute bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center rounded-full border border-white/5 bg-black/30 px-2 py-1 transition-all hover:bg-black/50">
      {/* Translate Current View Button (✨) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTranslate();
        }}
        disabled={isTranslating}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-transparent transition-all hover:bg-white/10 disabled:opacity-50"
        title="Translate Current View"
      >
        {isTranslating ? (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white opacity-70" />
        ) : (
          <span className="text-[13px] opacity-60 transition-opacity hover:opacity-100">✨</span>
        )}
      </button>

      {/* Subtle Divider */}
      <div className="mx-1.5 h-3.5 w-[1px] bg-white/20" />

      {/* Show/Hide All Toggle (👁️) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleShowAll();
        }}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${
          showAll ? 'bg-white/10 text-white' : 'bg-transparent text-white hover:bg-white/10'
        }`}
        title={showAll ? 'Hide All Bubbles' : 'Show All Bubbles'}
      >
        <svg
          className={`h-3.5 w-3.5 transition-opacity ${showAll ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {showAll ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
          )}
        </svg>
      </button>
    </div>
  );
}
