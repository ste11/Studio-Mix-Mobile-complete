import React, { useEffect, useState } from 'react';
import { audioEngine } from '../audio/DjAudioEngine';

interface StereoVuMeterProps {
  className?: string;
}

export const StereoVuMeter: React.FC<StereoVuMeterProps> = ({ className = '' }) => {
  const [meter, setMeter] = useState<{ left: number; right: number; peak: number }>({
    left: 0,
    right: 0,
    peak: 0,
  });

  useEffect(() => {
    let animId: number;
    let smoothL = 0;
    let smoothR = 0;

    const render = () => {
      const data = audioEngine.getMasterAudioLevel();
      // Add subtle stereo variance for authentic twin meter feel
      const l = data.level;
      const r = Math.min(1, data.level * (0.94 + Math.sin(Date.now() * 0.005) * 0.06));

      // Fast attack, smooth decay
      smoothL = l > smoothL ? l : smoothL * 0.88;
      smoothR = r > smoothR ? r : smoothR * 0.88;

      setMeter({
        left: smoothL,
        right: smoothR,
        peak: data.peak,
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  const SEGMENTS = 8;

  const renderChannelLeds = (val: number) => {
    const activeCount = Math.round(val * SEGMENTS);
    return (
      <div className="flex items-center gap-[2px]">
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const isActive = i < activeCount;
          let colorClass = 'bg-zinc-800';
          if (isActive) {
            if (i >= 7) {
              colorClass = 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.9)]';
            } else if (i >= 5) {
              colorClass = 'bg-amber-400 shadow-[0_0_3px_rgba(251,191,36,0.8)]';
            } else {
              colorClass = 'bg-emerald-400 shadow-[0_0_3px_rgba(52,211,153,0.7)]';
            }
          }

          return (
            <div
              key={i}
              className={`w-1.5 h-3 rounded-[1px] transition-colors duration-75 ${colorClass}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div
      id="stereo-vu-meter"
      className={`flex flex-col gap-0.5 bg-zinc-950/90 border border-zinc-800/80 rounded-lg px-2 py-1 select-none ${className}`}
      title="Master Stereo Peak VU Meter"
    >
      <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400">
        <span>L</span>
        {renderChannelLeds(meter.left)}
      </div>
      <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400">
        <span>R</span>
        {renderChannelLeds(meter.right)}
      </div>
    </div>
  );
};
