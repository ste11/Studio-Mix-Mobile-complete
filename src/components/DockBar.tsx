import React from 'react';
import { Sliders, Activity, Sparkles, Repeat, LayoutGrid } from 'lucide-react';
import { DesktopId } from '../types';
import { triggerHaptic } from '../audio/DjAudioEngine';

interface DockBarProps {
  activeDesktop: DesktopId;
  onSelectDesktop: (id: DesktopId) => void;
}

export const DockBar: React.FC<DockBarProps> = ({ activeDesktop, onSelectDesktop }) => {
  const tabs = [
    {
      id: 'performance' as DesktopId,
      label: 'Mixer',
      sublabel: 'Decks',
      icon: Sliders,
    },
    {
      id: 'eq' as DesktopId,
      label: 'EQ Tone',
      sublabel: 'Filtri',
      icon: Activity,
    },
    {
      id: 'fx' as DesktopId,
      label: 'FX Pad',
      sublabel: 'XY Touch',
      icon: Sparkles,
    },
    {
      id: 'cues_sampler' as DesktopId,
      label: 'Loops',
      sublabel: 'Cues',
      icon: Repeat,
    },
    {
      id: 'pads' as DesktopId,
      label: 'Pads',
      sublabel: 'Live Drum',
      icon: LayoutGrid,
    },
  ];

  return (
    <nav
      id="dj-dock-bar"
      aria-label="DJ Navigation Dock"
      className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800 backdrop-blur-md pb-safe"
      style={{ minHeight: '64px' }}
    >
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center px-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeDesktop === tab.id;

          return (
            <button
              key={tab.id}
              id={`dock-tab-${tab.id}`}
              type="button"
              onClick={() => {
                triggerHaptic(15);
                onSelectDesktop(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center h-full w-full select-none transition-all touch-manipulation active:scale-95 ${
                isActive ? 'text-cyan-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              style={{ minWidth: '48px', minHeight: '48px' }}
            >
              {/* Active top glow indicator */}
              {isActive && (
                <span className="absolute top-0 left-2 right-2 h-0.5 bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              )}

              <Icon
                className={`w-4 h-4 mb-0.5 transition-transform ${
                  isActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'
                }`}
              />
              <span className="text-[10px] font-bold leading-tight tracking-tight">
                {tab.label}
              </span>
              <span className="text-[8px] text-zinc-400 font-mono scale-90 -mt-0.5">
                {tab.sublabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
