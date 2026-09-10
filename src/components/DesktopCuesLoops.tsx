import React, { useState, useRef } from 'react';
import { Repeat, Zap, Trash2, ArrowRight, Layers, Volume2, Upload } from 'lucide-react';
import { DeckState, DeckId, HotCue, SamplerPad } from '../types';
import { triggerHaptic, audioEngine } from '../audio/DjAudioEngine';

interface DesktopCuesLoopsProps {
  deckA: DeckState;
  deckB: DeckState;
  onSetHotCue: (deckId: DeckId, cueId: number) => void;
  onJumpHotCue: (deckId: DeckId, cueId: number) => void;
  onClearHotCue: (deckId: DeckId, cueId: number) => void;
  onSetAutoLoop: (deckId: DeckId, beats: number) => void;
  onToggleLoop: (deckId: DeckId) => void;
  onManualLoopIn: (deckId: DeckId) => void;
  onManualLoopOut: (deckId: DeckId) => void;
  onPlaySamplerDrop: (type: string) => void;
}

export const DesktopCuesLoops: React.FC<DesktopCuesLoopsProps> = ({
  deckA,
  deckB,
  onSetHotCue,
  onJumpHotCue,
  onClearHotCue,
  onSetAutoLoop,
  onToggleLoop,
  onManualLoopIn,
  onManualLoopOut,
  onPlaySamplerDrop,
}) => {
  const [selectedDeck, setSelectedDeck] = useState<DeckId>('A');
  const [isDeleteMode, setIsDeleteMode] = useState<boolean>(false);
  const [activeDropId, setActiveDropId] = useState<string | null>(null);
  const [customSampleName, setCustomSampleName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentDeck = (selectedDeck === 'A' ? deckA : deckB) || {
    id: selectedDeck,
    track: null,
    isPlaying: false,
    currentTime: 0,
    pitchPercent: 0,
    effectiveBpm: 128,
    volume: 1,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    filter: 0,
    isKeyLock: true,
    isSlipMode: false,
    isSync: false,
    isCuePressed: false,
    hotCues: [],
    isLooping: false,
    loopLengthBeats: 4,
    loopStart: 0,
    loopEnd: 0,
  };

  const defaultPads: SamplerPad[] = [
    { id: 1, name: 'AIRHORN', color: '#ef4444', type: 'airhorn', isPlaying: false },
    { id: 2, name: 'SCRATCH', color: '#06b6d4', type: 'scratch', isPlaying: false },
    { id: 3, name: '808 SUB', color: '#eab308', type: 'subdrop', isPlaying: false },
    { id: 4, name: 'LASER ZAP', color: '#ec4899', type: 'laser', isPlaying: false },
    { id: 5, name: 'SIREN', color: '#10b981', type: 'siren', isPlaying: false },
    {
      id: 6,
      name: customSampleName ? customSampleName.slice(0, 10) : 'VOCAL HIT',
      color: '#a855f7',
      type: customSampleName ? 'custom_user_drop' : 'vocal',
      isPlaying: false,
    },
  ];

  const loopLengths = [0.5, 1, 2, 4, 8];

  const handleCueClick = (cue: HotCue) => {
    triggerHaptic(20);
    if (isDeleteMode) {
      onClearHotCue(selectedDeck, cue.id);
    } else {
      if (cue.time === null) {
        onSetHotCue(selectedDeck, cue.id);
      } else {
        onJumpHotCue(selectedDeck, cue.id);
      }
    }
  };

  const handleSamplerTrigger = (drop: SamplerPad) => {
    triggerHaptic(25);
    setActiveDropId(drop.type);
    onPlaySamplerDrop(drop.type);
    setTimeout(() => {
      setActiveDropId(null);
    }, 380);
  };

  const handleCustomAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { buffer } = await audioEngine.loadCustomAudioFile(file);
      audioEngine.registerCustomSampleBuffer('custom_user_drop', buffer);
      setCustomSampleName(file.name.replace(/\.[^/.]+$/, ''));
      triggerHaptic(30);
    } catch {
      // Ignored
    }
  };

  return (
    <div
      id="desktop-cues-sampler"
      className="flex-1 flex flex-col justify-between p-2 max-w-md mx-auto w-full select-none"
      style={{ paddingBottom: '76px' }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCustomAudioUpload}
        accept="audio/*,audio/mp4,audio/m4a,audio/x-m4a,audio/aac,audio/mpeg,audio/wav,audio/ogg,audio/flac,.m4a,.aac,.mp3,.wav,.ogg,.flac,.opus,.mp4,*/*"
        className="hidden"
      />

      {/* Target Deck Switcher (Deck A vs Deck B) */}
      <div className="flex items-center justify-between bg-zinc-900/90 border border-zinc-800 rounded-xl p-1.5 shadow-md">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono font-bold text-zinc-400 ml-1">CONTROLLI PER:</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="tab-deck-a-cues"
            onClick={() => {
              triggerHaptic(15);
              setSelectedDeck('A');
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border transition-all ${
              selectedDeck === 'A'
                ? 'bg-cyan-500 text-zinc-950 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
            style={{ minHeight: '38px', minWidth: '70px' }}
          >
            DECK A
          </button>

          <button
            type="button"
            id="tab-deck-b-cues"
            onClick={() => {
              triggerHaptic(15);
              setSelectedDeck('B');
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border transition-all ${
              selectedDeck === 'B'
                ? 'bg-orange-500 text-zinc-950 border-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.8)]'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
            style={{ minHeight: '38px', minWidth: '70px' }}
          >
            DECK B
          </button>
        </div>
      </div>

      {/* 1. Hot Cues Grid (8 pads) */}
      <div className="my-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 shadow-md flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-zinc-200">HOT CUES (DECK {selectedDeck})</span>
          </div>

          <button
            type="button"
            id="btn-cue-delete-mode"
            onClick={() => {
              triggerHaptic(15);
              setIsDeleteMode(!isDeleteMode);
            }}
            className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
              isDeleteMode
                ? 'bg-red-600 text-white border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
            style={{ minHeight: '32px' }}
          >
            <Trash2 className="w-3 h-3" />
            {isDeleteMode ? 'CANCELLA ATTIVO' : 'CANCELLA CUE'}
          </button>
        </div>

        {/* 4x2 Pad Matrix - Min 50dp touch targets */}
        <div className="grid grid-cols-4 gap-2">
          {currentDeck.hotCues.map((cue) => {
            const isSet = cue.time !== null;
            return (
              <button
                key={cue.id}
                id={`hot-cue-pad-${selectedDeck}-${cue.id}`}
                type="button"
                onClick={() => handleCueClick(cue)}
                className={`relative rounded-xl border flex flex-col items-center justify-center p-2 font-mono transition-all active:scale-95 shadow-md ${
                  isSet
                    ? isDeleteMode
                      ? 'bg-red-950/80 border-red-500 text-red-200'
                      : 'border-white/30 text-zinc-950 shadow-lg'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
                style={{
                  minHeight: '52px',
                  backgroundColor: isSet && !isDeleteMode ? cue.color : undefined,
                  boxShadow: isSet && !isDeleteMode ? `0 0 12px ${cue.color}88` : undefined,
                }}
              >
                <span
                  className={`text-xs font-black ${
                    isSet && !isDeleteMode ? 'text-zinc-950' : ''
                  }`}
                >
                  CUE {cue.id}
                </span>
                <span
                  className={`text-[9px] truncate max-w-full ${
                    isSet && !isDeleteMode ? 'text-zinc-900 font-bold' : 'text-zinc-600'
                  }`}
                >
                  {isSet ? `${cue.time?.toFixed(1)}s` : 'VUOTO'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Auto-Loop & Manual Loop Controls */}
      <div className="my-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 shadow-md flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
          <div className="flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-bold text-zinc-200">AUTO-LOOP (DECK {selectedDeck})</span>
          </div>

          <button
            type="button"
            id={`btn-toggle-loop-${selectedDeck}`}
            onClick={() => {
              triggerHaptic(20);
              onToggleLoop(selectedDeck);
            }}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase border transition-all ${
              currentDeck.isLooping
                ? 'bg-emerald-500 text-zinc-950 border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
            style={{ minHeight: '34px' }}
          >
            {currentDeck.isLooping ? 'LOOP ATTIVO' : 'LOOP OFF'}
          </button>
        </div>

        {/* Quick Beat Selectors (1/2, 1, 2, 4, 8) */}
        <div className="grid grid-cols-5 gap-1.5">
          {loopLengths.map((len) => {
            const isSelected = currentDeck.isLooping && currentDeck.loopLengthBeats === len;
            return (
              <button
                key={len}
                id={`btn-loop-len-${len}`}
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  onSetAutoLoop(selectedDeck, len);
                }}
                className={`py-2 rounded-lg border font-mono font-black text-xs transition-all active:scale-95 flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-cyan-500 text-zinc-950 border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                }`}
                style={{ minHeight: '48px' }}
              >
                <span>{len === 0.5 ? '1/2' : len}</span>
                <span className="text-[8px] font-normal text-zinc-400">BEAT</span>
              </button>
            );
          })}
        </div>

        {/* Manual Loop In / Loop Out Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80">
          <button
            type="button"
            id="btn-loop-in"
            onClick={() => {
              triggerHaptic(15);
              onManualLoopIn(selectedDeck);
            }}
            className="py-2 px-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-300 flex items-center justify-center gap-1.5 active:scale-95"
            style={{ minHeight: '42px' }}
          >
            <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            <span>LOOP IN</span>
          </button>

          <button
            type="button"
            id="btn-loop-out"
            onClick={() => {
              triggerHaptic(15);
              onManualLoopOut(selectedDeck);
            }}
            className="py-2 px-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-300 flex items-center justify-center gap-1.5 active:scale-95"
            style={{ minHeight: '42px' }}
          >
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            <span>LOOP OUT</span>
          </button>
        </div>
      </div>

      {/* 3. Punchy Club Sampler Drops (6 Drops + Upload) */}
      <div className="mt-1 bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 shadow-md flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-bold text-zinc-200">SAMPLER DROPS (PUNCHY LIVE)</span>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition active:scale-95"
          >
            <Upload className="w-3 h-3 text-cyan-400" />
            <span>CARICA DROP</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {defaultPads.map((pad) => {
            const isFired = activeDropId === pad.type;
            return (
              <button
                key={pad.id}
                id={`sampler-pad-${pad.type}`}
                type="button"
                onPointerDown={() => handleSamplerTrigger(pad)}
                className={`relative rounded-xl border flex flex-col items-center justify-center p-2 transition-all active:scale-95 select-none shadow-md ${
                  isFired
                    ? 'border-white text-zinc-950 scale-105 shadow-2xl brightness-125'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                }`}
                style={{
                  minHeight: '52px',
                  backgroundColor: isFired ? pad.color : undefined,
                  boxShadow: isFired ? `0 0 16px ${pad.color}` : undefined,
                }}
              >
                <Volume2
                  className="w-3.5 h-3.5 mb-0.5"
                  style={{ color: isFired ? '#09090b' : pad.color }}
                />
                <span className="text-[10px] font-black tracking-tight leading-tight">
                  {pad.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
