import React, { useRef } from 'react';
import { Play, Pause, Disc, Music2, Headphones, Zap, SlidersHorizontal, Plus, Minus, ArrowLeftRight } from 'lucide-react';
import { DeckState, DeckId } from '../types';
import { LinearFader } from './LinearFader';
import { triggerHaptic } from '../audio/DjAudioEngine';
import { StereoVuMeter } from './StereoVuMeter';

interface DesktopPerformanceProps {
  deckA: DeckState;
  deckB: DeckState;
  crossfader: number; // -1 to 1
  isQuantize: boolean;
  isFilterFade: boolean;
  pflA: boolean;
  pflB: boolean;
  isAutoCrossfading?: boolean;
  onPlayPauseToggle: (deckId: DeckId) => void;
  onCueDown: (deckId: DeckId) => void;
  onCueUp: (deckId: DeckId) => void;
  onSync: (deckId: DeckId) => void;
  onToggleKeyLock: (deckId: DeckId) => void;
  onToggleSlipMode: (deckId: DeckId) => void;
  onTapTempo: (deckId: DeckId) => void;
  onNudge: (deckId: DeckId, direction: 'forward' | 'backward', isHeld: boolean) => void;
  onTogglePfl: (deckId: DeckId) => void;
  onToggleQuantize: () => void;
  onToggleFilterFade: () => void;
  onAutoCrossfade: () => void;
  onVolumeChange: (deckId: DeckId, volume: number) => void;
  onPitchChange: (deckId: DeckId, pitchPercent: number) => void;
  onCrossfaderChange: (val: number) => void;
  onOpenTrackDrawer: (deckId: DeckId) => void;
}

export const DesktopPerformance: React.FC<DesktopPerformanceProps> = ({
  deckA,
  deckB,
  crossfader,
  isQuantize,
  isFilterFade,
  pflA,
  pflB,
  isAutoCrossfading = false,
  onPlayPauseToggle,
  onCueDown,
  onCueUp,
  onSync,
  onToggleKeyLock,
  onToggleSlipMode,
  onTapTempo,
  onNudge,
  onTogglePfl,
  onToggleQuantize,
  onToggleFilterFade,
  onAutoCrossfade,
  onVolumeChange,
  onPitchChange,
  onCrossfaderChange,
  onOpenTrackDrawer,
}) => {
  const tapTimesA = useRef<number[]>([]);
  const tapTimesB = useRef<number[]>([]);

  const handleTap = (deckId: DeckId) => {
    triggerHaptic(20);
    const now = performance.now();
    const tapList = deckId === 'A' ? tapTimesA : tapTimesB;
    tapList.current.push(now);
    if (tapList.current.length > 5) tapList.current.shift();
    onTapTempo(deckId);
  };

  const renderDeckChannel = (deck: DeckState | undefined, color: string) => {
    if (!deck) return null;
    const isDeckA = deck.id === 'A';
    const isPflActive = isDeckA ? pflA : pflB;
    const track = deck.track;
    const isPlaying = !!deck.isPlaying;
    const currentTime = deck.currentTime || 0;
    const effectiveBpm = deck.effectiveBpm || (track?.bpm || 128);

    // Progress percentage
    const progressPercent = track && track.duration > 0 ? (currentTime / track.duration) * 100 : 0;

    return (
      <div
        id={`deck-channel-${deck.id}`}
        className="flex-1 flex flex-col justify-between bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 shadow-md"
      >
        {/* Track Info Header (Drawer Trigger) */}
        <button
          type="button"
          id={`btn-track-info-${deck.id}`}
          onClick={() => {
            triggerHaptic(15);
            onOpenTrackDrawer(deck.id);
          }}
          className="w-full text-left bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 rounded-lg p-2 transition-all active:scale-[0.98] select-none group"
          style={{ minHeight: '52px' }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded text-zinc-950 font-mono"
              style={{ backgroundColor: color }}
            >
              Deck {deck.id}
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              {deck.effectiveBpm.toFixed(1)} <span className="text-zinc-600">BPM</span>
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between gap-1">
            <div className="truncate flex-1">
              <div className="text-xs font-bold text-zinc-100 truncate group-hover:text-cyan-300">
                {track ? track.title : 'Seleziona Brano...'}
              </div>
              <div className="text-[9px] text-zinc-500 truncate">
                {track ? `${track.artist} • ${track.key}` : 'Tocca per aprire catalogo'}
              </div>
            </div>
            <Music2 className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
          </div>

          {/* Mini Playhead progress bar */}
          <div className="mt-1.5 h-1 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/80">
            <div
              className="h-full transition-all duration-100 rounded-full"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </button>

        {/* Middle Section: Volume Fader + Tempo Pitch Slider */}
        <div className="flex-1 my-1.5 grid grid-cols-2 gap-2 items-center">
          {/* Deck Volume Vertical Fader + PFL CUE Headphone Monitor */}
          <div className="flex flex-col items-center justify-between h-full">
            <div className="flex-1 w-full flex justify-center">
              <LinearFader
                id={`fader-volume-${deck.id}`}
                orientation="vertical"
                value={deck.volume}
                min={0}
                max={1}
                accentColor={color}
                label="VOL"
                unit=""
                onChange={(val) => onVolumeChange(deck.id, val)}
              />
            </div>

            {/* PFL Headphone Pre-listen Button */}
            <button
              type="button"
              id={`btn-pfl-${deck.id}`}
              onClick={() => {
                triggerHaptic(18);
                onTogglePfl(deck.id);
              }}
              className={`w-full mt-1.5 py-1 px-1.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border flex items-center justify-center gap-1 transition active:scale-95 ${
                isPflActive
                  ? 'bg-amber-400 text-zinc-950 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.85)]'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
              }`}
              style={{ minHeight: '32px' }}
              title="Preascolto Cuffie PFL CUE"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>CUE</span>
            </button>
          </div>

          {/* Tempo / Pitch Control Slider + Nudge & Sync */}
          <div className="flex flex-col items-center justify-between h-full bg-zinc-950/60 border border-zinc-800/70 rounded-lg p-1.5">
            <div className="text-[10px] font-mono font-bold text-zinc-400 tracking-wider">
              TEMPO
            </div>

            <div className="text-[11px] font-mono font-semibold" style={{ color }}>
              {deck.pitchPercent >= 0 ? `+${deck.pitchPercent.toFixed(1)}%` : `${deck.pitchPercent.toFixed(1)}%`}
            </div>

            <div className="flex-1 w-full flex justify-center py-0.5">
              <LinearFader
                id={`fader-pitch-${deck.id}`}
                orientation="vertical"
                value={deck.pitchPercent}
                min={-16}
                max={16}
                centerSnap={true}
                accentColor={color}
                label=""
                unit="%"
                onChange={(val) => onPitchChange(deck.id, val)}
              />
            </div>

            {/* Pitch Bend / Nudge Buttons (- / +) */}
            <div className="grid grid-cols-2 gap-1 w-full mt-1">
              <button
                type="button"
                id={`btn-nudge-minus-${deck.id}`}
                onPointerDown={() => {
                  triggerHaptic(15);
                  onNudge(deck.id, 'backward', true);
                }}
                onPointerUp={() => onNudge(deck.id, 'backward', false)}
                onPointerLeave={() => onNudge(deck.id, 'backward', false)}
                className="py-1 px-1 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-cyan-500 active:text-zinc-950 text-zinc-300 font-mono text-[9px] font-bold border border-zinc-700 flex items-center justify-center gap-0.5 select-none"
                style={{ minHeight: '30px' }}
                title="Rallenta temporaneamente (Nudge -)"
              >
                <Minus className="w-2.5 h-2.5" /> NUDGE
              </button>
              <button
                type="button"
                id={`btn-nudge-plus-${deck.id}`}
                onPointerDown={() => {
                  triggerHaptic(15);
                  onNudge(deck.id, 'forward', true);
                }}
                onPointerUp={() => onNudge(deck.id, 'forward', false)}
                onPointerLeave={() => onNudge(deck.id, 'forward', false)}
                className="py-1 px-1 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-cyan-500 active:text-zinc-950 text-zinc-300 font-mono text-[9px] font-bold border border-zinc-700 flex items-center justify-center gap-0.5 select-none"
                style={{ minHeight: '30px' }}
                title="Accelera temporaneamente (Nudge +)"
              >
                NUDGE <Plus className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Pro DJ Performance Controls: SYNC, MASTER TEMPO (KEY LOCK), SLIP, TAP */}
            <div className="w-full grid grid-cols-2 gap-1 mt-1">
              <button
                type="button"
                id={`btn-sync-${deck.id}`}
                onClick={() => {
                  triggerHaptic(20);
                  onSync(deck.id);
                }}
                className={`w-full py-1 px-0.5 rounded text-[9px] font-black uppercase tracking-wider border transition-all active:scale-95 ${
                  deck.isSync
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                }`}
                style={{ minHeight: '28px' }}
                title="Sincronizza BPM con l'altro deck"
              >
                SYNC
              </button>

              <button
                type="button"
                id={`btn-keylock-${deck.id}`}
                onClick={() => {
                  triggerHaptic(18);
                  onToggleKeyLock(deck.id);
                }}
                className={`w-full py-1 px-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border transition-all active:scale-95 ${
                  deck.isKeyLock
                    ? 'bg-amber-400 text-zinc-950 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                }`}
                style={{ minHeight: '28px' }}
                title="Master Tempo / Key Lock: Mantiene la tonalità musicale al variare del tempo"
              >
                MT
              </button>
            </div>

            <div className="w-full grid grid-cols-2 gap-1 mt-1">
              <button
                type="button"
                id={`btn-slip-${deck.id}`}
                onClick={() => {
                  triggerHaptic(18);
                  onToggleSlipMode(deck.id);
                }}
                className={`w-full py-1 px-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border transition-all active:scale-95 ${
                  deck.isSlipMode
                    ? 'bg-cyan-500 text-zinc-950 border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                }`}
                style={{ minHeight: '28px' }}
                title="Slip Mode: il brano continua sotto scratch, roll e brake tornando a tempo"
              >
                SLIP
              </button>

              <button
                type="button"
                id={`btn-tap-${deck.id}`}
                onClick={() => handleTap(deck.id)}
                className="w-full py-1 px-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 active:scale-95"
                style={{ minHeight: '28px' }}
                title="Batti a tempo per rilevare il BPM"
              >
                TAP
              </button>
            </div>
          </div>
        </div>

        {/* Transport Controls: Extra-Large CUE and PLAY/PAUSE Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          {/* CUE Button */}
          <button
            type="button"
            id={`btn-cue-${deck.id}`}
            onPointerDown={() => {
              triggerHaptic(20);
              onCueDown(deck.id);
            }}
            onPointerUp={() => onCueUp(deck.id)}
            onPointerLeave={() => {
              if (deck.isCuePressed) onCueUp(deck.id);
            }}
            className={`flex flex-col items-center justify-center rounded-xl border font-black text-sm uppercase tracking-wider transition-all select-none active:scale-95 ${
              deck.isCuePressed
                ? 'bg-amber-400 text-zinc-950 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)] scale-98'
                : 'bg-zinc-800/90 hover:bg-zinc-700 text-amber-400 border-amber-500/40 shadow-inner'
            }`}
            style={{ minHeight: '52px' }}
          >
            <Disc className="w-4 h-4 mb-0.5" />
            <span>CUE</span>
          </button>

          {/* PLAY/PAUSE Button */}
          <button
            type="button"
            id={`btn-play-pause-${deck.id}`}
            onClick={() => {
              triggerHaptic(25);
              onPlayPauseToggle(deck.id);
            }}
            className={`flex flex-col items-center justify-center rounded-xl border font-black text-sm uppercase tracking-wider transition-all select-none active:scale-95 ${
              isPlaying
                ? 'bg-emerald-500 text-zinc-950 border-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.9)]'
                : 'bg-zinc-800/90 hover:bg-zinc-700 text-emerald-400 border-emerald-500/40 shadow-inner'
            }`}
            style={{ minHeight: '52px' }}
          >
            {isPlaying ? <Pause className="w-4 h-4 mb-0.5" /> : <Play className="w-4 h-4 mb-0.5 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      id="desktop-performance"
      className="flex-1 flex flex-col justify-between p-2 max-w-md mx-auto w-full select-none"
      style={{ paddingBottom: '74px' }}
    >
      {/* Upper Section: Dual Decks (Deck A & Deck B) */}
      <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
        {renderDeckChannel(deckA, '#06b6d4')}
        {renderDeckChannel(deckB, '#f97316')}
      </div>

      {/* Lower Section: Wide Horizontal Crossfader + Assistant Tools + VU Meter */}
      <div className="mt-2 bg-zinc-900/95 border border-zinc-800 rounded-xl p-2.5 shadow-lg">
        {/* Crossfader Header with Stereo VU Meter */}
        <div className="flex justify-between items-center mb-1.5 text-[11px] font-mono">
          <span className="font-bold text-cyan-400">DECK A</span>
          <StereoVuMeter />
          <span className="font-bold text-orange-400">DECK B</span>
        </div>

        <LinearFader
          id="crossfader-slider"
          orientation="horizontal"
          value={crossfader}
          min={-1}
          max={1}
          centerSnap={true}
          accentColor="#06b6d4"
          onChange={onCrossfaderChange}
        />

        <div className="flex justify-between text-[9px] font-mono text-zinc-400 mt-1 px-1">
          <span>A 100%</span>
          <span className="text-zinc-400">CENTER (A+B)</span>
          <span>B 100%</span>
        </div>

        {/* Pro DJ Helper Toggles: Quantize, Auto Mix & Filter Fade */}
        <div className="flex items-center justify-between gap-1.5 mt-2 pt-2 border-t border-zinc-800/80">
          <button
            type="button"
            id="btn-quantize-toggle"
            onClick={() => {
              triggerHaptic(20);
              onToggleQuantize();
            }}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg border font-mono text-[9px] font-bold uppercase tracking-wider transition active:scale-95 ${
              isQuantize
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                : 'bg-zinc-950 text-zinc-500 border-zinc-800'
            }`}
            style={{ minHeight: '34px' }}
            title="Allineamento automatico alla battuta (Quantize)"
          >
            <Zap className="w-3 h-3 shrink-0" />
            <span>QUANTIZE {isQuantize ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            id="btn-automix-trigger"
            onClick={() => {
              triggerHaptic(25);
              onAutoCrossfade();
            }}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg border font-mono text-[9px] font-bold uppercase tracking-wider transition active:scale-95 ${
              isAutoCrossfading
                ? 'bg-amber-400 text-zinc-950 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-pulse font-black'
                : 'bg-zinc-950 hover:bg-zinc-800/80 text-amber-300 border-zinc-800'
            }`}
            style={{ minHeight: '34px' }}
            title="Auto Crossfade / Auto Mix: Transizione fluida e automatica tra Deck A e Deck B"
          >
            <ArrowLeftRight className="w-3 h-3 shrink-0" />
            <span>{isAutoCrossfading ? 'FADING...' : 'AUTO MIX'}</span>
          </button>

          <button
            type="button"
            id="btn-filterfade-toggle"
            onClick={() => {
              triggerHaptic(20);
              onToggleFilterFade();
            }}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg border font-mono text-[9px] font-bold uppercase tracking-wider transition active:scale-95 ${
              isFilterFade
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                : 'bg-zinc-950 text-zinc-500 border-zinc-800'
            }`}
            style={{ minHeight: '34px' }}
            title="Taglio bassi automatico nel passaggio crossfader (Filter Fade)"
          >
            <SlidersHorizontal className="w-3 h-3 shrink-0" />
            <span>FILTER FADE {isFilterFade ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
