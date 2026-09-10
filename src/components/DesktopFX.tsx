import React, { useRef, useState, useCallback } from 'react';
import { Sparkles, Radio, Lock, Unlock, Waves, Disc3, RotateCcw, Orbit, Layers, Music2 } from 'lucide-react';
import { FXState, FXType, FXTarget } from '../types';
import { audioEngine, triggerHaptic } from '../audio/DjAudioEngine';

interface DesktopFXProps {
  fxState: FXState;
  onFxChange: (next: Partial<FXState>) => void;
}

export const DesktopFX: React.FC<DesktopFXProps> = ({ fxState, onFxChange }) => {
  const padRef = useRef<HTMLDivElement>(null);
  const [isTouching, setIsTouching] = useState(false);

  // Compute calculated exponential frequency & values for display
  const currentLpFreq = Math.round(80 * Math.pow(20000 / 80, Math.max(0, Math.min(1, fxState.x))));
  const currentHpFreq = Math.round(20 * Math.pow(12000 / 20, Math.max(0, Math.min(1, fxState.x))));
  const resonanceQ = (fxState.type === 'filter' ? 0.707 + fxState.y * 1.4 : 0.707 + fxState.y * 6.5).toFixed(2);
  const wetPercent = Math.round(fxState.y * 100);

  const fxTypes: {
    id: FXType;
    label: string;
    sub: string;
    xLabel: string;
    yLabel: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      id: 'filter',
      label: 'Filter LP',
      sub: 'Low-Pass Cut',
      xLabel: 'Frequenza Taglio',
      yLabel: 'Risonanza Q',
      icon: <Waves className="w-3.5 h-3.5" />,
      color: 'border-cyan-400 text-cyan-300',
    },
    {
      id: 'filter_hp',
      label: 'Filter HP',
      sub: 'High-Pass Sweep',
      xLabel: 'Frequenza Alti',
      yLabel: 'Risonanza Q',
      icon: <Waves className="w-3.5 h-3.5" />,
      color: 'border-emerald-400 text-emerald-300',
    },
    {
      id: 'echo',
      label: 'Dub Echo',
      sub: 'Tape Delay',
      xLabel: 'Tempo Delay',
      yLabel: 'Feedback & Wet',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      color: 'border-amber-400 text-amber-300',
    },
    {
      id: 'spiral',
      label: 'Spiral Delay',
      sub: 'Ping-Pong 3D',
      xLabel: 'Ritmo Ping-Pong',
      yLabel: 'Feedback Spaziale',
      icon: <Orbit className="w-3.5 h-3.5" />,
      color: 'border-sky-400 text-sky-300',
    },
    {
      id: 'reverb',
      label: 'Reverb Hall',
      sub: 'Lush Space',
      xLabel: 'Diffusione',
      yLabel: 'Decadimento Wet',
      icon: <Layers className="w-3.5 h-3.5" />,
      color: 'border-blue-400 text-blue-300',
    },
    {
      id: 'chorus',
      label: 'Chorus Space',
      sub: 'Stereo Dimension',
      xLabel: 'Velocità Rate',
      yLabel: 'Profondità Wet',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      color: 'border-purple-400 text-purple-300',
    },
    {
      id: 'pitch_shift',
      label: 'Pitch Shift',
      sub: 'Harmonizer',
      xLabel: 'Semitoni (-12/+12)',
      yLabel: 'Intensità',
      icon: <Music2 className="w-3.5 h-3.5" />,
      color: 'border-rose-400 text-rose-300',
    },
    {
      id: 'vinyl_brake',
      label: 'Vinyl Brake',
      sub: 'Motor Stop',
      xLabel: 'Inerzia Piatto',
      yLabel: 'Freno & Pitch',
      icon: <Disc3 className="w-3.5 h-3.5" />,
      color: 'border-orange-400 text-orange-300',
    },
  ];

  const targets: { id: FXTarget; label: string }[] = [
    { id: 'A', label: 'Deck A' },
    { id: 'B', label: 'Deck B' },
    { id: 'master', label: 'Master' },
  ];

  const updateCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      if (!padRef.current) return;
      const rect = padRef.current.getBoundingClientRect();
      const normX = Math.max(0.001, Math.min(0.999, (clientX - rect.left) / rect.width));
      // Invert Y so bottom is 0 (dry) and top is 1 (wet/max Q)
      const normY = Math.max(0.001, Math.min(0.999, 1 - (clientY - rect.top) / rect.height));

      onFxChange({
        x: normX,
        y: normY,
        active: true,
      });
    },
    [onFxChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsTouching(true);
    triggerHaptic(18);
    updateCoordinates(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isTouching || e.buttons === 1) {
      updateCoordinates(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = () => {
    setIsTouching(false);
    triggerHaptic(14);
    if (fxState.mode === 'hold' || fxState.type === 'vinyl_brake' || fxState.type === 'pitch_shift') {
      onFxChange({ active: false });
      audioEngine.resetVinylBrake();
    }
  };

  const activeFxInfo = fxTypes.find((f) => f.id === fxState.type) || fxTypes[0];

  // Helper for telemetry values
  const getXValueString = () => {
    if (fxState.type === 'filter') {
      return currentLpFreq >= 1000
        ? `${(currentLpFreq / 1000).toFixed(2)} kHz`
        : `${currentLpFreq} Hz`;
    }
    if (fxState.type === 'filter_hp') {
      return currentHpFreq >= 1000
        ? `${(currentHpFreq / 1000).toFixed(2)} kHz`
        : `${currentHpFreq} Hz`;
    }
    if (fxState.type === 'echo') {
      const beatFraction = fxState.x < 0.28 ? '1/4 Beat' : fxState.x < 0.60 ? '1/2 Beat' : fxState.x < 0.82 ? '3/4 Beat' : '1 Beat';
      return `${beatFraction} Dub`;
    }
    if (fxState.type === 'spiral') {
      const bounceMode = fxState.x < 0.35 ? '1/4 & 1/2' : fxState.x < 0.70 ? '1/2 & 3/4' : '1/2 & 1';
      return `${bounceMode} Beat 3D`;
    }
    if (fxState.type === 'chorus') {
      return `${(0.4 + fxState.x * 0.8).toFixed(1)} Hz Widener`;
    }
    if (fxState.type === 'pitch_shift') {
      const st = Math.round((fxState.x - 0.5) * 24);
      return st > 0 ? `+${st} Semitoni` : `${st} Semitoni`;
    }
    return `${Math.round(fxState.x * 100)}%`;
  };

  const getYValueString = () => {
    if (fxState.type === 'filter' || fxState.type === 'filter_hp') {
      return `Q = ${resonanceQ}`;
    }
    if (fxState.type === 'echo' || fxState.type === 'spiral') {
      return `Feedback: ${Math.round((0.15 + fxState.y * 0.35) * 100)}%`;
    }
    if (fxState.type === 'vinyl_brake') {
      return `Brake Pitch: ${Math.round((1 - fxState.y * 0.96) * 100)}%`;
    }
    return `WET: ${wetPercent}%`;
  };

  return (
    <div
      id="desktop-fx"
      className="flex-1 flex flex-col justify-between p-2 max-w-md mx-auto w-full select-none"
      style={{ paddingBottom: '76px' }}
    >
      {/* Top Controls: 8 FX Selectors */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 shadow-md flex flex-col gap-2">
        {/* FX Type Selector - 2 rows of 4 buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          {fxTypes.map((fx) => {
            const isSelected = fxState.type === fx.id;
            return (
              <button
                key={fx.id}
                id={`fx-select-${fx.id}`}
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  onFxChange({ type: fx.id });
                }}
                className={`flex flex-col items-center justify-center p-1 rounded-lg border font-bold text-xs uppercase tracking-tight transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-cyan-500 text-zinc-950 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.8)] font-black'
                    : 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                }`}
                style={{ minHeight: '46px' }}
              >
                <div className="flex items-center gap-1 mb-0.5">{fx.icon}</div>
                <span className="text-[10px] leading-tight font-bold">{fx.label}</span>
              </button>
            );
          })}
        </div>

        {/* Secondary Bar: Target routing + Hold/Latch mode */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/70">
          {/* Target routing */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-zinc-400 mr-0.5">TARGET:</span>
            {targets.map((tgt) => (
              <button
                key={tgt.id}
                id={`fx-target-${tgt.id}`}
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  onFxChange({ target: tgt.id });
                }}
                className={`px-2 py-1 rounded text-[10px] font-mono uppercase font-bold border transition ${
                  fxState.target === tgt.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                }`}
                style={{ minHeight: '34px' }}
              >
                {tgt.label}
              </button>
            ))}
          </div>

          {/* Hold vs Latch switch */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              id="fx-mode-hold"
              onClick={() => {
                triggerHaptic(15);
                onFxChange({ mode: 'hold', active: isTouching });
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono uppercase font-bold border ${
                fxState.mode === 'hold'
                  ? 'bg-amber-500 text-zinc-950 border-amber-300'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800'
              }`}
              style={{ minHeight: '34px' }}
            >
              <Radio className="w-3 h-3" /> HOLD
            </button>

            <button
              type="button"
              id="fx-mode-latch"
              onClick={() => {
                triggerHaptic(15);
                onFxChange({ mode: 'latch', active: true });
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono uppercase font-bold border ${
                fxState.mode === 'latch'
                  ? 'bg-emerald-500 text-zinc-950 border-emerald-300'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800'
              }`}
              style={{ minHeight: '34px' }}
            >
              {fxState.mode === 'latch' ? (
                <Lock className="w-3 h-3" />
              ) : (
                <Unlock className="w-3 h-3" />
              )}{' '}
              LATCH
            </button>
          </div>
        </div>
      </div>

      {/* Main Dynamic XY Pad */}
      <div
        ref={padRef}
        id="fx-xy-pad"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative flex-1 my-2 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 border-2 border-zinc-800 rounded-2xl overflow-hidden shadow-2xl cursor-crosshair touch-none select-none active:border-cyan-500/80 transition-colors"
        style={{ minHeight: '360px' }}
      >
        {/* XY Grid Matrix Lines */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-20">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="border border-cyan-500/30" />
          ))}
        </div>

        {/* Diagonal guides and center cross */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25">
          <div className="w-full h-px bg-zinc-600" />
          <div className="h-full w-px bg-zinc-600 absolute" />
        </div>

        {/* Real-time Telemetry Overlay in corners */}
        <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-0.5 font-mono">
          <div className="text-[11px] uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> {activeFxInfo.label}
          </div>
          <div className="text-xs text-zinc-200">
            {activeFxInfo.xLabel}:{' '}
            <span className="text-cyan-300 font-bold">{getXValueString()}</span>
          </div>
        </div>

        <div className="absolute top-3 right-3 pointer-events-none text-right font-mono">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider">
            {activeFxInfo.yLabel}
          </div>
          <div className="text-xs text-emerald-300 font-bold">{getYValueString()}</div>
          <div className="text-[9px] text-zinc-500">
            {fxState.mode === 'hold' ? (isTouching ? 'ACTIVE (HOLD)' : 'BYPASS') : 'LATCHED (ON)'}
          </div>
        </div>

        {/* Dynamic Axis Description bottom and sides */}
        <div className="absolute bottom-2 left-4 right-4 pointer-events-none flex justify-between text-[9px] font-mono text-zinc-400">
          <span>MIN (Sinistra)</span>
          <span className="text-cyan-400 font-bold tracking-wider uppercase">
            ← ASSE X: {activeFxInfo.xLabel} →
          </span>
          <span>MAX (Destra)</span>
        </div>

        <div className="absolute left-2 top-14 bottom-14 pointer-events-none flex flex-col justify-between text-[8px] font-mono text-zinc-400">
          <span>100% WET / MAX</span>
          <span>0% DRY / MIN</span>
        </div>

        {/* Target Puck / Crosshair Cursor */}
        <div
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
          style={{
            left: `${fxState.x * 100}%`,
            top: `${(1 - fxState.y) * 100}%`,
          }}
        >
          {/* Glowing Ripple Pulse */}
          <div
            className={`w-16 h-16 rounded-full border-2 border-cyan-400/80 flex items-center justify-center transition-all ${
              fxState.active ? 'animate-ping opacity-50 bg-cyan-500/25' : 'opacity-10'
            }`}
          />

          {/* Central Target Puck */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full border-2 shadow-2xl flex items-center justify-center transition-colors ${
              fxState.active
                ? 'bg-cyan-500 border-white text-zinc-950 shadow-[0_0_24px_rgba(6,182,212,0.95)] scale-105'
                : 'bg-zinc-800 border-zinc-500 text-zinc-400'
            }`}
          >
            <div className="w-3 h-3 rounded-full bg-zinc-950" />
          </div>
        </div>
      </div>

      {/* Bottom Emergency Action Bar: Bypass / Panic Reset + Vinyl Spin-Up */}
      <div className="flex items-center justify-between gap-2 mt-1 px-0.5">
        <button
          type="button"
          id="fx-panic-reset"
          onClick={() => {
            triggerHaptic(25);
            audioEngine.resetVinylBrake();
            onFxChange({ active: false, x: 0.5, y: 0.0 });
          }}
          className="flex-1 py-2 px-3 rounded-xl border border-red-500/40 bg-red-950/30 hover:bg-red-900/50 text-red-300 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm"
          style={{ minHeight: '38px' }}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset FX / Bypass
        </button>

        {fxState.type === 'vinyl_brake' && (
          <button
            type="button"
            id="fx-spin-up"
            onClick={() => {
              triggerHaptic(20);
              audioEngine.resetVinylBrake();
              onFxChange({ active: false, y: 0.0 });
            }}
            className="py-2 px-3.5 rounded-xl border border-orange-500/60 bg-orange-950/60 text-orange-200 font-mono text-[11px] font-bold uppercase flex items-center gap-1.5 active:scale-95 transition shadow-sm animate-pulse"
            style={{ minHeight: '38px' }}
          >
            <Disc3 className="w-3.5 h-3.5 animate-spin" /> Ripristina Velocità (1.0x)
          </button>
        )}
      </div>
    </div>
  );
};
