'use client';

import { useState } from 'react';

type SupportedFiletypes = 'manga' | 'movie';

interface UploadFormProps {
  fixedCategory?: SupportedFiletypes; // If provided, locks the UI to this category
}

export function UploadForm({ fixedCategory }: UploadFormProps = {}) {
  const [uploadMode, setUploadMode] = useState<'manual' | 'bulk'>('bulk');
  const [uploadType, setUploadType] = useState(fixedCategory || 'manga');
  const [seriesName, setSeriesName] = useState('');
  const [volumeName, setVolumeName] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState('');

  // Handle standard file selection
  const handleManualFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  // Handle the magical Folder selection
  const handleBulkFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Filter out hidden files like .DS_Store
      const validFiles = Array.from(e.target.files).filter((f) => f.type.startsWith('image/'));
      setFiles(validFiles);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setIsUploading(true);
    setStatusMessage('Initializing upload...');

    if (uploadMode === 'manual') {
      if (!seriesName || !volumeName) {
        setStatusMessage('Please fill all fields for manual upload.');
        setIsUploading(false);
        return;
      }
      await uploadVolume(seriesName, volumeName, files);
      setStatusMessage(`Success! Uploaded ${files.length} pages.`);
      setFiles([]);
      setSeriesName('');
      setVolumeName('');
    } else {
      // THE BULK UPLOAD MAGIC
      // Group files by Series and Volume based on their folder path
      const groupedUploads: Record<string, Record<string, File[]>> = {};

      files.forEach((file) => {
        // webkitRelativePath looks like: "Manga/Berserk/Volume 01/001.jpg"
        const pathParts = file.webkitRelativePath.split('/');

        // Remove the filename itself
        pathParts.pop();

        // Grab the Volume (the folder directly containing the image)
        const volName = pathParts.pop() || 'Unknown Volume';

        // Grab the Series (the folder containing the Volume folder)
        const serName = pathParts.pop() || 'Unknown Series';

        if (!groupedUploads[serName]) groupedUploads[serName] = {};
        if (!groupedUploads[serName][volName]) groupedUploads[serName][volName] = [];

        groupedUploads[serName][volName].push(file);
      });

      // Count total volumes to show progress
      let totalVolumes = 0;
      let completedVolumes = 0;
      for (const s in groupedUploads) totalVolumes += Object.keys(groupedUploads[s]).length;

      // Upload them sequentially to respect Google Drive rate limits
      for (const sName in groupedUploads) {
        for (const vName in groupedUploads[sName]) {
          setProgress(`Uploading ${sName} - ${vName} (${completedVolumes + 1}/${totalVolumes})`);
          await uploadVolume(sName, vName, groupedUploads[sName][vName]);
          completedVolumes++;
        }
      }

      setStatusMessage(`Success! Uploaded ${completedVolumes} volumes completely automatically.`);
      setProgress('');
      setFiles([]);
    }

    setIsUploading(false);
  };

  // The robust, chunked fetch call to our backend API
  // The robust, chunked fetch call to our backend API
  const uploadVolume = async (series: string, volume: string, volumeFiles: File[]) => {
    const sortedFiles = [...volumeFiles].sort((a, b) => a.name.localeCompare(b.name));
    const CHUNK_SIZE = 10;

    for (let i = 0; i < sortedFiles.length; i += CHUNK_SIZE) {
      const chunk = sortedFiles.slice(i, i + CHUNK_SIZE);
      const isFirstChunk = i === 0; // True ONLY on the first pass

      setProgress(
        `Uploading ${series} - ${volume} (Pages ${i + 1} to ${Math.min(i + CHUNK_SIZE, sortedFiles.length)} of ${sortedFiles.length})`
      );

      const formData = new FormData();
      formData.append('seriesName', series);
      formData.append('volumeName', volume);
      formData.append('isFirstChunk', isFirstChunk.toString()); // Send the flag
      chunk.forEach((file) => formData.append('files', file));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Upload failed on chunk`);
      }

      // THE ABORT SWITCH
      if (data.skipVolume) {
        // Break completely out of the for-loop.
        // We skip chunks 2, 3, 4... and immediately move to the next volume!
        break;
      }
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Quick Upload</h3>

        <div className="flex gap-3">
          {/* Hide this selector if the category is locked! */}
          {!fixedCategory && (
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value as SupportedFiletypes)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="manga">Manga Volume</option>
              <option value="movie" disabled>
                Movie (Coming Soon)
              </option>
            </select>
          )}

          <select
            value={uploadMode}
            onChange={(e) => {
              setUploadMode(e.target.value as 'manual' | 'bulk');
              setFiles([]);
            }}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
          >
            <option value="bulk">Bulk Folder Upload</option>
            <option value="manual">Manual Single Volume</option>
          </select>
        </div>
      </div>

      <form onSubmit={handleUpload} className="space-y-4">
        {/* Manual Input Fields (Only show if manual mode) */}
        {uploadMode === 'manual' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
                Series Name
              </label>
              <input
                type="text"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-4 py-2 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-primary)]"
                disabled={isUploading}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
                Volume / Chapter
              </label>
              <input
                type="text"
                value={volumeName}
                onChange={(e) => setVolumeName(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-4 py-2 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-primary)]"
                disabled={isUploading}
              />
            </div>
          </div>
        )}

        {/* The Dropzone */}
        <div className="relative mt-4 rounded-xl border-2 border-dashed border-[var(--border-subtle)] p-8 text-center transition-colors hover:bg-[var(--bg-surface-hover)]">
          <input
            type="file"
            // Magic attributes to allow full folder selection
            {...(uploadMode === 'bulk'
              ? { webkitdirectory: '', directory: '' }
              : { multiple: true })}
            onChange={uploadMode === 'bulk' ? handleBulkFolderChange : handleManualFileChange}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            disabled={isUploading}
          />
          <div className="text-[var(--text-secondary)]">
            {files.length > 0 ? (
              <span className="font-semibold text-[var(--accent-primary)]">
                {files.length} images queued
              </span>
            ) : (
              <span>
                {uploadMode === 'bulk'
                  ? 'Click to select a Series folder (e.g., Berserk/)'
                  : 'Click or drag manga pages here'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-col">
            <span
              className={`text-sm ${statusMessage.includes('Success') ? 'text-green-600' : 'text-[var(--text-secondary)]'}`}
            >
              {statusMessage}
            </span>
            {progress && (
              <span className="mt-1 text-xs font-medium text-[var(--accent-primary)]">
                {progress}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isUploading || files.length === 0}
            className={`rounded-lg px-6 py-2 font-medium text-white transition-all ${
              isUploading || files.length === 0
                ? 'cursor-not-allowed bg-[var(--border-subtle)] text-[var(--text-secondary)]'
                : 'bg-[var(--accent-primary)] shadow-sm hover:bg-[var(--accent-primary-hover)] hover:shadow-md'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Upload Media'}
          </button>
        </div>
      </form>
    </div>
  );
}
