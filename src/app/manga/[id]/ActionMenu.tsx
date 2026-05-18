'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ReiModal } from '@/components/ReiModal';

interface ActionMenuProps {
  targetId: string;
  targetName: string;
  isSeries: boolean;
}

export function ActionMenu({ targetId, targetName, isSeries }: ActionMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'confirm' | 'alert';
    title: string;
    msg: string;
  }>({
    isOpen: false,
    type: 'confirm',
    title: '',
    msg: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown if user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteTrigger = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop the Link tag from firing
    setIsMenuOpen(false);

    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: isSeries ? 'Delete Series' : 'Delete Volume',
      msg: `WARNING: You are about to permanently delete ${targetName}.\n\nYou can (not) redo. Proceed with purge?`,
    });
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/drive/${targetId}`, { method: 'DELETE' });
      if (res.ok) {
        if (isSeries) {
          router.push('/manga');
          router.refresh();
        } else {
          setModalConfig({ ...modalConfig, isOpen: false });
          router.refresh();
        }
      } else {
        setModalConfig({
          isOpen: true,
          type: 'alert',
          title: 'Error',
          msg: "Purge failed. The target's AT Field is too strong.",
        });
      }
    } catch (error) {
      setModalConfig({
        isOpen: true,
        type: 'alert',
        title: 'Network Error',
        msg: 'Synchronization failed. Check your connection.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* The Kebab Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsMenuOpen(!isMenuOpen);
        }}
        className={`flex items-center justify-center rounded-full transition-colors ${
          isSeries
            ? 'h-10 w-10 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
            : 'h-8 w-8 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 hover:bg-[var(--border-subtle)] focus:opacity-100'
        }`}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {/* The Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute top-full right-0 z-30 mt-1 w-40 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] py-1 shadow-lg">
          <button
            onClick={handleDeleteTrigger}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete {isSeries ? 'Series' : 'Volume'}
          </button>
        </div>
      )}

      {/* The Modal */}
      <ReiModal
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.msg}
        isLoading={isDeleting}
        onConfirm={
          modalConfig.type === 'confirm'
            ? executeDelete
            : () => setModalConfig({ ...modalConfig, isOpen: false })
        }
        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />
    </div>
  );
}
