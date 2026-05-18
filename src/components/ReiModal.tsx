'use client';

import { useEffect } from 'react';

interface ReiModalProps {
  isOpen: boolean;
  type: 'confirm' | 'alert';
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ReiModal({
  isOpen,
  type,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading,
}: ReiModalProps) {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* The MAGI red-tinted backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => !isLoading && onCancel && onCancel()}
      />

      {/* The Modal Box */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-main)] p-6 shadow-2xl transition-all">
        {/* Warning Icon & Title */}
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold tracking-wider text-[var(--text-primary)] uppercase">
            {title}
          </h3>
        </div>

        {/* Message (Supports NGE style newlines) */}
        <div className="mb-8 text-sm text-[var(--text-secondary)]">
          {message.split('\n').map((line, i) => (
            <p key={i} className="mb-1">
              {line}
            </p>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          {type === 'confirm' && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-hover)] disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex min-w-[100px] items-center justify-center rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="animate-pulse">Purging...</span>
            ) : type === 'confirm' ? (
              'Execute Purge'
            ) : (
              'Acknowledge'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
