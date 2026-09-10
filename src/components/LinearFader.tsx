import React, { useRef, useCallback } from 'react';
import { triggerHaptic } from '../audio/DjAudioEngine';

interface LinearFaderProps {
  id?: string;
  orientation?: 'vertical' | 'horizontal';
  value: number; // For vertical: 0 to 1 (or -24 to 6 for EQ). For horizontal: -1 to 1 or 0 to 1
  min?: number;
  max?: number;
  step?: number;
  centerSnap?: boolean;
  snapThreshold?: number;
  label?: string;
  sublabel?: string;
  color?: string; // hex or tailwind class
  accentColor?: string;
  onChange: (val: number) => void;
  onDoubleClick?: () => void;
  className?: string;
  unit?: string;
}

export const LinearFader: React.FC<LinearFaderProps> = ({
  id,
  orientation = 'vertical',
  value,
  min = 0,
  max = 1,
  centerSnap = false,
  snapThreshold = 0.05,
  label,
  sublabel,
  accentColor = '#06b6d4',
  onChange,
  onDoubleClick,
  className = '',
  unit = '',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const wasAtCenterRef = useRef<boolean>(false);

  const calculateNormalized = useCallback(
    (val: number) => {
      return (val - min) / (max - min);
    },
    [min, max]
  );

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();

      let norm = 0;
      if (orientation === 'vertical') {
        // Top is 1 (max), bottom is 0 (min)
        norm = 1 - (clientY - rect.top) / rect.height;
      } else {
        // Left is 0 (min), right is 1 (max)
        norm = (clientX - rect.left) / rect.width;
      }

      norm = Math.max(0, Math.min(1, norm));

      let targetVal = min + norm * (max - min);

      // Center snap logic with haptic feedback
      if (centerSnap) {
        const centerVal = (min + max) / 2;
        const normalizedCenter = 0.5;
        const diff = Math.abs(norm - normalizedCenter);
        if (diff < snapThreshold) {
          targetVal = centerVal;
          if (!wasAtCenterRef.current) {
            triggerHaptic(20);
            wasAtCenterRef.current = true;
          }
        } else {
          wasAtCenterRef.current = false;
        }
      }

      onChange(targetVal);
    },
    [centerSnap, max, min, onChange, orientation, snapThreshold]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 1 || e.pressure > 0) {
      updateFromPointer(e.clientX, e.clientY);
    }
  };

  const norm = calculateNormalized(value);
  const percent = Math.max(0, Math.min(100, norm * 100));

  if (orientation === 'horizontal') {
    return (
      <div id={id} className={`flex flex-col gap-1 w-full select-none touch-none ${className}`}>
        {(label || sublabel) && (
          <div className="flex justify-between items-center text-xs px-1 text-zinc-400 font-mono">
            <span className="font-semibold text-zinc-300">{label}</span>
            <span>
              {value.toFixed(2)}
              {unit}
            </span>
          </div>
        )}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onDoubleClick={() => {
            if (centerSnap) {
              onChange((min + max) / 2);
              triggerHaptic(25);
            }
            onDoubleClick?.();
          }}
          className="relative h-13 w-full bg-zinc-900 border border-zinc-700/80 rounded-lg flex items-center px-2 cursor-pointer shadow-inner touch-none active:border-zinc-500"
          style={{ minHeight: '52px' }}
        >
          {/* Center Zero Notch Guide */}
          {centerSnap && (
            <div className="absolute left-1/2 top-1 bottom-1 w-0.5 bg-zinc-600/60 -translate-x-1/2 pointer-events-none" />
          )}

          {/* Track Groove */}
          <div className="absolute left-4 right-4 h-2 bg-zinc-950 rounded-full border border-zinc-800 pointer-events-none overflow-hidden">
            {/* Center-origin fill or left-origin fill */}
            {centerSnap ? (
              <div
                className="absolute top-0 bottom-0 transition-all duration-75"
                style={{
                  backgroundColor: accentColor,
                  left: percent >= 50 ? '50%' : `${percent}%`,
                  width: `${Math.abs(percent - 50)}%`,
                  opacity: 0.6,
                }}
              />
            ) : (
              <div
                className="absolute top-0 bottom-0 left-0 transition-all duration-75"
                style={{
                  backgroundColor: accentColor,
                  width: `${percent}%`,
                  opacity: 0.6,
                }}
              />
            )}
          </div>

          {/* Slider Thumb Handle - Min 50dp touch area */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-11 h-11 bg-gradient-to-b from-zinc-700 to-zinc-800 border-2 border-zinc-300 rounded-md shadow-lg flex items-center justify-center transition-transform active:scale-105 pointer-events-none"
            style={{
              left: `calc(${percent}% - 22px)`,
              boxShadow: `0 2px 10px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.3)`,
            }}
          >
            {/* Center Indent Indicator Line */}
            <div
              className="w-1 h-6 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Vertical Fader
  return (
    <div id={id} className={`flex flex-col items-center select-none touch-none h-full ${className}`}>
      {label && (
        <div className="text-[11px] font-bold tracking-wider text-zinc-400 mb-1 font-mono uppercase">
          {label}
        </div>
      )}

      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onDoubleClick={() => {
          if (centerSnap) {
            onChange((min + max) / 2);
            triggerHaptic(25);
          }
          onDoubleClick?.();
        }}
        className="relative w-13 flex-1 bg-zinc-900 border border-zinc-700/80 rounded-lg flex justify-center py-2 cursor-pointer shadow-inner touch-none active:border-zinc-500"
        style={{ minWidth: '52px', minHeight: '120px' }}
      >
        {/* dB Scale marks on sides */}
        <div className="absolute left-1 top-3 bottom-3 flex flex-col justify-between pointer-events-none text-[8px] font-mono text-zinc-500 select-none">
          <span>+6</span>
          <span className="text-zinc-300 font-bold">0</span>
          <span>-6</span>
          <span>-12</span>
          <span>-∞</span>
        </div>

        {/* Center Zero Notch Guide */}
        {centerSnap && (
          <div className="absolute top-1/2 left-1 right-1 h-0.5 bg-zinc-600/70 -translate-y-1/2 pointer-events-none" />
        )}

        {/* Track Groove */}
        <div className="absolute top-4 bottom-4 w-2 bg-zinc-950 rounded-full border border-zinc-800 pointer-events-none overflow-hidden">
          {centerSnap ? (
            <div
              className="absolute left-0 right-0 transition-all duration-75"
              style={{
                backgroundColor: accentColor,
                bottom: percent >= 50 ? '50%' : `${percent}%`,
                height: `${Math.abs(percent - 50)}%`,
                opacity: 0.7,
              }}
            />
          ) : (
            <div
              className="absolute left-0 right-0 bottom-0 transition-all duration-75"
              style={{
                backgroundColor: accentColor,
                height: `${percent}%`,
                opacity: 0.7,
              }}
            />
          )}
        </div>

        {/* Slider Thumb Handle - Min 50dp touch area */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-11 h-11 bg-gradient-to-b from-zinc-700 to-zinc-800 border-2 border-zinc-300 rounded-md shadow-lg flex items-center justify-center transition-transform active:scale-105 pointer-events-none"
          style={{
            bottom: `calc(${percent}% - 22px)`,
            boxShadow: `0 2px 10px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.3)`,
          }}
        >
          {/* Center Indent Indicator Line */}
          <div
            className="w-6 h-1 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        </div>
      </div>

      <div className="text-[11px] font-mono text-zinc-400 mt-1">
        {value > 0 && centerSnap ? `+${value.toFixed(1)}` : value.toFixed(1)}
        {unit}
      </div>
    </div>
  );
};
