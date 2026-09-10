import React from 'react';
import { VolumeX, RotateCcw } from 'lucide-react';
import { DeckState, DeckId } from '../types';
import { LinearFader } from './LinearFader';
import { triggerHaptic } from '../audio/DjAudioEngine';

interface DesktopEQProps {
  deckA: DeckState;
  deckB: DeckState;
  onEqChange: (deckId: DeckId, band: 'low' | 'mid' | 'high', val: number) => void;
  onKillToggle: (deckId: DeckId, band: 'low' | 'mid' | 'high') => void;
  onResetDeckEq: (deckId: DeckId) => void;
}

export const DesktopEQ: React.FC<DesktopEQProps> = ({
  deckA,
  deckB,
  onEqChange,
  onKillToggle,
  onResetDeckEq,
}) => {
  const renderDeckEqSection = (deck: DeckState, color: string) => {
    const isDeckA = deck.id === 'A';
    const bands = [
      {
        id: 'high' as const,
        label: 'HI',
        freq: '4.0 kHz',
        val: deck.eqHigh,
        killed: deck.killHigh,
      },
      {
        id: 'mid' as const,
        label: 'MID',
        freq: '1.0 kHz',
        val: deck.eqMid,
        killed: deck.killMid,
      },
      {
        id: 'low' as const,
        label: 'LOW',
        freq: '250 Hz',
        val: deck.eqLow,
        killed: deck.killLow,
      },
    ];

    return (
      <div
        id={`eq-channel-${deck.id}`}
        className="flex-1 flex flex-col justify-between bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 shadow-md"
      >
        {/* Deck Header & Reset Button */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-black uppercase px-2 py-0.5 rounded text-zinc-950 font-mono"
              style={{ backgroundColor: color }}
            >
              Deck {deck.id}
            </span>
            <span className="text-[11px] font-mono text-zinc-400">3-Band Tone</span>
          </div>

          <button
            type="button"
            id={`btn-reset-eq-${deck.id}`}
            onClick={() => {
              triggerHaptic(20);
              onResetDeckEq(deck.id);
            }}
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 active:scale-95"
            style={{ minHeight: '34px' }}
          >
            <RotateCcw className="w-3 h-3 text-zinc-400" />
            RESET
          </button>
        </div>

        {/* 3 Vertical Linear Sliders for HI, MID, LOW */}
        <div className="flex-1 grid grid-cols-3 gap-2 py-3">
          {bands.map((b) => (
            <div key={b.id} className="flex flex-col items-center justify-between h-full">
              {/* Band Label & Frequency Readout */}
              <div className="text-center">
                <div className="text-[11px] font-black font-mono tracking-wider text-zinc-200">
                  {b.label}
                </div>
                <div className="text-[9px] font-mono text-zinc-400">{b.freq}</div>
              </div>

              {/* Linear Vertical Slider (-24dB to +6dB, center snap at 0dB) */}
              <div className="flex-1 w-full my-1 flex justify-center">
                <LinearFader
                  id={`eq-slider-${deck.id}-${b.id}`}
                  orientation="vertical"
                  value={b.val}
                  min={-24}
                  max={6}
                  centerSnap={true}
                  accentColor={b.killed ? '#ef4444' : color}
                  unit="dB"
                  onChange={(val) => onEqChange(deck.id, b.id, val)}
                />
              </div>

              {/* Kill Button (Instant Mute) - Min 50dp touch target */}
              <button
                type="button"
                id={`btn-kill-${deck.id}-${b.id}`}
                onClick={() => {
                  triggerHaptic(25);
                  onKillToggle(deck.id, b.id);
                }}
                className={`w-full py-2.5 px-1 rounded-lg border font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center transition-all select-none active:scale-95 ${
                  b.killed
                    ? 'bg-red-600 text-white border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700'
                }`}
                style={{ minHeight: '52px' }}
              >
                <VolumeX className="w-4 h-4 mb-0.5" />
                <span className="text-[10px]">KILL {b.label}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Quick frequency cut summary indicator */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400 px-1">
          <span>Stato EQ:</span>
          <span className={deck.killLow || deck.killMid || deck.killHigh ? 'text-red-400 font-bold' : 'text-emerald-400'}>
            {deck.killLow || deck.killMid || deck.killHigh ? 'TAGLI ATTIVI' : 'NORMALE (FLAT)'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      id="desktop-eq"
      className="flex-1 flex flex-col justify-between p-2 max-w-md mx-auto w-full select-none"
      style={{ paddingBottom: '74px' }}
    >
      <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
        {renderDeckEqSection(deckA, '#06b6d4')}
        {renderDeckEqSection(deckB, '#f97316')}
      </div>
    </div>
  );
};
