import React, { useState, useMemo, useRef } from 'react';
import { X, Search, ArrowUpDown, Music, Upload, Check, Disc3, FolderOpen, ShieldCheck, FileAudio } from 'lucide-react';
import { Track, DeckId } from '../types';
import { triggerHaptic } from '../audio/DjAudioEngine';
import { FileSystemBridge, DiscoveredAudioFile } from '../audio/FileSystemBridge';

interface TrackDrawerProps {
  isOpen: boolean;
  targetDeck: DeckId | null;
  tracks: Track[];
  onSelectTrack: (deckId: DeckId, track: Track) => void;
  onUploadCustomTrack: (file: File) => Promise<Track>;
  onClose: () => void;
}

export const TrackDrawer: React.FC<TrackDrawerProps> = ({
  isOpen,
  targetDeck,
  tracks,
  onSelectTrack,
  onUploadCustomTrack,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'bpm' | 'key' | 'title'>('bpm');
  const [sortAsc, setSortAsc] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchStartYRef = useRef<number | null>(null);

  const filteredTracks = useMemo(() => {
    let list = (tracks || []).filter((t) => {
      if (!t) return false;
      const q = (searchQuery || '').toLowerCase();
      const title = (t.title || '').toLowerCase();
      const artist = (t.artist || '').toLowerCase();
      const genre = (t.genre || '').toLowerCase();
      const key = (t.key || '').toLowerCase();
      return (
        title.includes(q) ||
        artist.includes(q) ||
        genre.includes(q) ||
        key.includes(q)
      );
    });

    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'bpm') {
        comparison = (a.bpm || 0) - (b.bpm || 0);
      } else if (sortBy === 'key') {
        comparison = (a.key || '').localeCompare(b.key || '');
      } else {
        comparison = (a.title || '').localeCompare(b.title || '');
      }
      return sortAsc ? comparison : -comparison;
    });

    return list;
  }, [tracks, searchQuery, sortBy, sortAsc]);

  if (!isOpen || !targetDeck) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current !== null) {
      const diffY = touchStartYRef.current - e.changedTouches[0].clientY;
      // Swipe UP to close
      if (diffY > 60) {
        triggerHaptic(15);
        onClose();
      }
      touchStartYRef.current = null;
    }
  };

  // Process a batch of audio files safely
  const processAudioFiles = async (files: File[]) => {
    if (!files.length || !targetDeck) return;
    setIsUploading(true);
    setErrorMessage(null);
    let lastLoadedTrack: Track | null = null;
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadStatus(`Decodifica file ${i + 1}/${files.length}: ${file.name.slice(0, 16)}...`);
      try {
        const loaded = await onUploadCustomTrack(file);
        lastLoadedTrack = loaded;
        successCount++;
      } catch (err: unknown) {
        console.warn(`Errore file ${file.name}`, err);
      }
    }

    setIsUploading(false);
    setUploadStatus(null);

    if (successCount > 0 && lastLoadedTrack) {
      triggerHaptic(30);
      onSelectTrack(targetDeck, lastLoadedTrack);
      onClose();
    } else {
      setErrorMessage('Nessun file audio valido trovato o autorizzato. Formati: MP3, M4A, AAC, WAV, FLAC.');
    }
  };

  // 1. Native File System Access API - File Picker (with OS permissions)
  const handleFileSystemPicker = async () => {
    triggerHaptic(15);
    try {
      setIsUploading(true);
      setErrorMessage(null);
      setUploadStatus('Richiesta permessi file...');
      const discovered = await FileSystemBridge.pickAudioFiles(true);
      if (discovered && discovered.length > 0) {
        await processAudioFiles(discovered.map((d) => d.file));
      } else {
        setIsUploading(false);
        setUploadStatus(null);
      }
    } catch (err: unknown) {
      console.warn('File System Picker error', err);
      setIsUploading(false);
      setUploadStatus(null);
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  // 2. Native File System Access API - Folder / Directory Picker (with OS permissions)
  const handleDirectoryPicker = async () => {
    triggerHaptic(15);
    try {
      setIsUploading(true);
      setErrorMessage(null);
      setUploadStatus('Scansione cartella e permessi OS...');
      const discovered = await FileSystemBridge.pickMusicDirectory();
      if (discovered && discovered.length > 0) {
        await processAudioFiles(discovered.map((d) => d.file));
      } else {
        setIsUploading(false);
        setUploadStatus(null);
        setErrorMessage('Nessun file audio compatibile trovato nella cartella selezionata.');
      }
    } catch (err: unknown) {
      console.warn('Directory Picker error', err);
      setIsUploading(false);
      setUploadStatus(null);
      const msg = err instanceof Error ? err.message : 'Impossibile accedere alla cartella.';
      setErrorMessage(msg);
    }
  };

  // 3. Fallback standard HTML5 input change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files: File[] = Array.from(fileList);
    await processAudioFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      const files: File[] = Array.from(dt.files);
      await processAudioFiles(files);
    }
  };

  const deckColor = targetDeck === 'A' ? '#06b6d4' : '#f97316';
  const hasNativeFs = FileSystemBridge.isSupported();

  return (
    <div
      id="track-drawer-overlay"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-start select-none transition-opacity duration-200"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          triggerHaptic(10);
          onClose();
        }
      }}
    >
      {/* 80% Top Sheet Drawer Container */}
      <div
        id="track-drawer-sheet"
        className="w-full max-w-md mx-auto bg-zinc-900 border-b border-zinc-700 shadow-2xl rounded-b-2xl flex flex-col overflow-hidden animate-in slide-in-from-top duration-250"
        style={{ height: '82vh', maxHeight: '820px' }}
      >
        {/* Drawer Header */}
        <div className="p-3 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center font-black text-sm text-zinc-950"
              style={{ backgroundColor: deckColor }}
            >
              {targetDeck}
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <Disc3 className="w-4 h-4 text-zinc-400" />
                Carica Traccia su Deck {targetDeck}
              </h2>
              <p className="text-[10px] text-zinc-400">Swipe in alto o tocca X per chiudere</p>
            </div>
          </div>

          <button
            id="btn-close-drawer"
            type="button"
            onClick={() => {
              triggerHaptic(15);
              onClose();
            }}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:scale-95"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Sort Bar */}
        <div className="p-3 bg-zinc-900 border-b border-zinc-800 flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              id="track-search-input"
              type="text"
              placeholder="Cerca per titolo, artista, genere, tonalità..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-cyan-500 placeholder-zinc-500"
            />
          </div>

          <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
            <span className="text-zinc-400 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-zinc-500" /> Ordina per:
            </span>
            <div className="flex items-center gap-1">
              {(['bpm', 'key', 'title'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    if (sortBy === mode) {
                      setSortAsc(!sortAsc);
                    } else {
                      setSortBy(mode);
                      setSortAsc(true);
                    }
                  }}
                  className={`px-2.5 py-1 rounded border uppercase ${
                    sortBy === mode
                      ? 'bg-zinc-800 text-cyan-400 border-cyan-500/50 font-bold'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                  style={{ minHeight: '34px' }}
                >
                  {mode} {sortBy === mode ? (sortAsc ? '▲' : '▼') : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* File System Access API & File Upload Trigger */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`px-3 py-2.5 bg-zinc-950/70 border-b border-zinc-800 flex flex-col gap-2 transition-all ${
            isDragging ? 'bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/50' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">File System Access API & Brani Locali:</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">M4A • MP3 • WAV • AAC</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* File System Access API - Multi File Picker */}
            <button
              type="button"
              id="btn-pick-audio-files"
              onClick={handleFileSystemPicker}
              disabled={isUploading}
              className="px-2.5 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-zinc-950 font-bold text-[11px] rounded-lg shadow flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              style={{ minHeight: '40px' }}
            >
              <FileAudio className="w-3.5 h-3.5 shrink-0" />
              <span>Sfoglia Brani (OS)</span>
            </button>

            {/* File System Access API - Folder / Directory Picker */}
            <button
              type="button"
              id="btn-pick-music-directory"
              onClick={handleDirectoryPicker}
              disabled={isUploading}
              className="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-cyan-300 font-bold text-[11px] rounded-lg border border-cyan-500/30 shadow flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              style={{ minHeight: '40px' }}
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
              <span>Importa Cartella</span>
            </button>
          </div>

          {/* Hidden input for HTML5 fallback */}
          <input
            id="audio-file-upload-fallback"
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,audio/mp4,audio/m4a,audio/x-m4a,audio/aac,audio/mpeg,audio/wav,audio/ogg,audio/flac,.m4a,.aac,.mp3,.wav,.ogg,.flac,.opus,.mp4,*/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />

          {/* Progress / Status feedback */}
          {isUploading && (
            <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 px-2.5 py-1.5 rounded-lg animate-pulse">
              <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="truncate">{uploadStatus || 'Decodifica audio hardware in corso...'}</span>
            </div>
          )}

          {errorMessage && (
            <div className="text-[11px] text-red-400 bg-red-950/50 border border-red-800/60 px-2.5 py-1.5 rounded-lg">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Track List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 p-1">
          {filteredTracks.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              Nessuna traccia trovata con i filtri selezionati.
            </div>
          ) : (
            filteredTracks.map((track) => (
              <button
                key={track.id}
                id={`track-item-${track.id}`}
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  onSelectTrack(targetDeck, track);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-zinc-800/80 active:bg-zinc-700/80 transition-colors rounded-lg group select-none"
                style={{ minHeight: '56px' }}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
                    style={{ backgroundColor: `${track.color || '#06b6d4'}22`, borderColor: track.color || '#06b6d4' }}
                  >
                    <Music className="w-4 h-4" style={{ color: track.color || '#06b6d4' }} />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-zinc-100 truncate group-hover:text-cyan-300">
                      {track.title || 'Traccia senza titolo'}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      {track.artist || 'Sconosciuto'} • <span className="text-zinc-500">{track.genre || 'Audio'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-right font-mono">
                  <div className="text-[11px] font-bold text-zinc-200">
                    {track.bpm || 128} <span className="text-[9px] text-zinc-500 font-normal">BPM</span>
                  </div>
                  <div className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {track.key || '12A'}
                  </div>
                  <div
                    className="w-6 h-6 rounded-full border flex items-center justify-center text-zinc-400 group-hover:border-cyan-400 group-hover:text-cyan-400"
                    style={{ borderColor: `${track.color || '#06b6d4'}66` }}
                  >
                    <Check className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Bottom swipe-indicator */}
        <div className="py-2 bg-zinc-950 flex justify-center items-center border-t border-zinc-800">
          <div className="w-12 h-1 bg-zinc-600 rounded-full" />
        </div>
      </div>
    </div>
  );
};
