import React, { useState, useRef } from 'react';
import {
  Grid,
  Sparkles,
  Repeat,
  Flame,
  Settings2,
  Volume2,
  Upload,
  Check,
  X,
  FastForward,
} from 'lucide-react';
import { DeckState, DeckId, PadMode, ControllerPad } from '../types';
import { triggerHaptic, audioEngine } from '../audio/DjAudioEngine';

interface DesktopPadsControllerProps {
  deckA: DeckState;
  deckB: DeckState;
}

const DEFAULT_DRUM_PADS: ControllerPad[] = [
  { id: 1, name: 'KICK 909', subLabel: 'Sub Punch', color: '#06b6d4', soundKey: 'drum_kick', triggerMode: 'momentary' },
  { id: 2, name: 'SNARE', subLabel: 'Layer Snap', color: '#f97316', soundKey: 'drum_snare', triggerMode: 'momentary' },
  { id: 3, name: 'CLAP', subLabel: 'Stereo 808', color: '#ec4899', soundKey: 'drum_clap', triggerMode: 'momentary' },
  { id: 4, name: 'CLOSED HAT', subLabel: 'Tight Click', color: '#eab308', soundKey: 'drum_closed_hat', triggerMode: 'momentary' },
  { id: 5, name: 'OPEN HAT', subLabel: 'Sizzle', color: '#10b981', soundKey: 'drum_open_hat', triggerMode: 'momentary' },
  { id: 6, name: 'PERC TOM', subLabel: 'Low Boom', color: '#8b5cf6', soundKey: 'drum_tom', triggerMode: 'momentary' },
  { id: 7, name: 'RIMSHOT', subLabel: 'Wood Click', color: '#3b82f6', soundKey: 'drum_rimshot', triggerMode: 'momentary' },
  { id: 8, name: 'CRASH', subLabel: 'Explosion', color: '#ef4444', soundKey: 'drum_crash', triggerMode: 'momentary' },
];

const DEFAULT_PERCUSSION_PADS: ControllerPad[] = [
  { id: 1, name: 'SHAKER', subLabel: '16th Groove', color: '#06b6d4', soundKey: 'perc_shaker', triggerMode: 'momentary' },
  { id: 2, name: 'TAMBOURINE', subLabel: 'Bright Jingle', color: '#eab308', soundKey: 'perc_tambourine', triggerMode: 'momentary' },
  { id: 3, name: 'CONGA HIGH', subLabel: 'Latin Slap', color: '#f97316', soundKey: 'perc_conga_high', triggerMode: 'momentary' },
  { id: 4, name: 'CONGA LOW', subLabel: 'Deep Thumb', color: '#ec4899', soundKey: 'perc_conga_low', triggerMode: 'momentary' },
  { id: 5, name: 'BONGO TOP', subLabel: 'Afro Swing', color: '#10b981', soundKey: 'perc_bongo', triggerMode: 'momentary' },
  { id: 6, name: 'CLAVE WOOD', subLabel: 'High Click', color: '#8b5cf6', soundKey: 'perc_clave', triggerMode: 'momentary' },
  { id: 7, name: '808 COWBELL', subLabel: 'Classic Accent', color: '#3b82f6', soundKey: 'perc_cowbell', triggerMode: 'momentary' },
  { id: 8, name: 'SNARE FILL', subLabel: 'Triplet Burst', color: '#ef4444', soundKey: 'perc_snare_fill', triggerMode: 'momentary' },
];

const DEFAULT_BUILDS_PADS: ControllerPad[] = [
  { id: 1, name: 'SNARE BUILD', subLabel: '1-Bar Riser', color: '#f43f5e', soundKey: 'build_snare_riser', triggerMode: 'momentary' },
  { id: 2, name: 'NOISE SWEEP', subLabel: 'Tension Riser', color: '#ec4899', soundKey: 'build_noise_sweep', triggerMode: 'momentary' },
  { id: 3, name: 'DOWNLIFTER', subLabel: 'Sub Impact', color: '#8b5cf6', soundKey: 'build_downlifter', triggerMode: 'momentary' },
  { id: 4, name: 'REV CRASH', subLabel: 'Swell to Drop', color: '#06b6d4', soundKey: 'build_rev_crash', triggerMode: 'momentary' },
  { id: 5, name: '808 BOOM', subLabel: 'Deep Sub Drop', color: '#eab308', soundKey: 'subdrop', triggerMode: 'momentary' },
  { id: 6, name: 'LASER ZAP', subLabel: 'EDM Glitch', color: '#10b981', soundKey: 'laser', triggerMode: 'momentary' },
  { id: 7, name: 'REGGAE SIREN', subLabel: 'Soundclash', color: '#f97316', soundKey: 'siren', triggerMode: 'momentary' },
  { id: 8, name: 'AIRHORN', subLabel: 'Stadium Fanfare', color: '#ef4444', soundKey: 'airhorn', triggerMode: 'momentary' },
];

const DEFAULT_ROLL_PADS: ControllerPad[] = [
  { id: 1, name: '1/32 ROLL', subLabel: 'Ultra Fast', color: '#ec4899', soundKey: '', rollBeats: 0.03125, triggerMode: 'momentary' },
  { id: 2, name: '1/16 ROLL', subLabel: 'Fast Snare', color: '#f43f5e', soundKey: '', rollBeats: 0.0625, triggerMode: 'momentary' },
  { id: 3, name: '1/8 ROLL', subLabel: 'Double Time', color: '#f97316', soundKey: '', rollBeats: 0.125, triggerMode: 'momentary' },
  { id: 4, name: '1/4 ROLL', subLabel: 'Quarter Beat', color: '#eab308', soundKey: '', rollBeats: 0.25, triggerMode: 'momentary' },
  { id: 5, name: '1/2 ROLL', subLabel: 'Half Bar', color: '#10b981', soundKey: '', rollBeats: 0.5, triggerMode: 'momentary' },
  { id: 6, name: '1 BEAT', subLabel: '1 Beat Loop', color: '#06b6d4', soundKey: '', rollBeats: 1, triggerMode: 'momentary' },
  { id: 7, name: '2 BEATS', subLabel: 'Half Phrase', color: '#3b82f6', soundKey: '', rollBeats: 2, triggerMode: 'momentary' },
  { id: 8, name: '4 BEATS', subLabel: 'Full Bar', color: '#8b5cf6', soundKey: '', rollBeats: 4, triggerMode: 'momentary' },
];

const PRESET_SOUND_OPTIONS = [
  { key: 'perc_shaker', label: 'Shaker 16th Groove' },
  { key: 'perc_tambourine', label: 'Acoustic Tambourine' },
  { key: 'perc_conga_high', label: 'Conga High Slap' },
  { key: 'perc_conga_low', label: 'Conga Low Tone' },
  { key: 'perc_bongo', label: 'Bongo Accent' },
  { key: 'perc_clave', label: 'Wooden Clave' },
  { key: 'perc_cowbell', label: '808 Cowbell' },
  { key: 'perc_snare_fill', label: 'Snare Triplet Fill' },
  { key: 'build_snare_riser', label: 'Snare Roll Riser' },
  { key: 'build_noise_sweep', label: 'White Noise Sweep' },
  { key: 'build_downlifter', label: 'Downlifter / Impact' },
  { key: 'build_rev_crash', label: 'Reverse Crash' },
  { key: 'drum_kick', label: 'Kick Drum (909)' },
  { key: 'drum_snare', label: 'Snare Drum' },
  { key: 'drum_clap', label: 'Hand Clap' },
  { key: 'drum_closed_hat', label: 'Closed Hi-Hat' },
  { key: 'drum_open_hat', label: 'Open Hi-Hat' },
  { key: 'airhorn', label: 'Club Airhorn' },
  { key: 'scratch', label: 'Vinyl Scratch' },
  { key: 'subdrop', label: '808 Sub Boom' },
  { key: 'laser', label: 'Laser Zap Riser' },
  { key: 'siren', label: 'Soundclash Siren' },
  { key: 'vocal', label: 'Vocal "Drop The Beat"' },
];

const COLOR_OPTIONS = [
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#10b981', name: 'Emerald' },
  { hex: '#eab308', name: 'Amber' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#8b5cf6', name: 'Purple' },
  { hex: '#3b82f6', name: 'Blue' },
];

export const DesktopPadsController: React.FC<DesktopPadsControllerProps> = ({
  deckA,
  deckB,
}) => {
  const [activeMode, setActiveMode] = useState<PadMode>('percussion');
  const [targetDeck, setTargetDeck] = useState<DeckId>('A');
  const [padVolume, setPadVolume] = useState<number>(0.9);
  const [activePadIds, setActivePadIds] = useState<Set<number>>(new Set());

  // Custom User Pads state
  const [customPads, setCustomPads] = useState<ControllerPad[]>([
    { id: 1, name: 'SHAKER', subLabel: '16th Swing', color: '#06b6d4', soundKey: 'perc_shaker', triggerMode: 'momentary' },
    { id: 2, name: 'CONGA', subLabel: 'Latin Slap', color: '#f97316', soundKey: 'perc_conga_high', triggerMode: 'momentary' },
    { id: 3, name: 'CLAP', subLabel: '808 Stereo', color: '#ec4899', soundKey: 'drum_clap', triggerMode: 'momentary' },
    { id: 4, name: 'COWBELL', subLabel: 'House Accent', color: '#eab308', soundKey: 'perc_cowbell', triggerMode: 'momentary' },
    { id: 5, name: 'AIRHORN', subLabel: 'Fanfare', color: '#ef4444', soundKey: 'airhorn', triggerMode: 'momentary' },
    { id: 6, name: 'SCRATCH', subLabel: 'Vinyl Rub', color: '#10b981', soundKey: 'scratch', triggerMode: 'momentary' },
    { id: 7, name: 'SUB BOOM', subLabel: '808 Drop', color: '#8b5cf6', soundKey: 'subdrop', triggerMode: 'momentary' },
    { id: 8, name: 'SNARE FILL', subLabel: 'Triplet', color: '#3b82f6', soundKey: 'perc_snare_fill', triggerMode: 'momentary' },
  ]);

  // Edit Modal State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingPad, setEditingPad] = useState<ControllerPad | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current active set of pads based on mode
  const currentPads: ControllerPad[] =
    activeMode === 'percussion'
      ? DEFAULT_PERCUSSION_PADS
      : activeMode === 'builds'
      ? DEFAULT_BUILDS_PADS
      : activeMode === 'drum'
      ? DEFAULT_DRUM_PADS
      : activeMode === 'roll'
      ? DEFAULT_ROLL_PADS
      : customPads;

  const handlePadDown = (pad: ControllerPad) => {
    triggerHaptic(22);
    setActivePadIds((prev) => new Set(prev).add(pad.id));

    if (activeMode === 'roll' && pad.rollBeats !== undefined) {
      // Slip-mode Beat Roll on target deck: continuous non-stopping loop!
      audioEngine.triggerBeatRoll(targetDeck, pad.rollBeats, true);
    } else {
      // Direct Punchy Sample Trigger
      audioEngine.playSample(pad.soundKey, 0, padVolume);
    }
  };

  const handlePadUp = (pad: ControllerPad) => {
    setActivePadIds((prev) => {
      const next = new Set(prev);
      next.delete(pad.id);
      return next;
    });

    if (activeMode === 'roll' && pad.rollBeats !== undefined) {
      // Seamlessly catches up to real-time track position!
      audioEngine.triggerBeatRoll(targetDeck, pad.rollBeats, false);
    }
  };

  // Custom pad editor save
  const handleSaveEditedPad = () => {
    if (!editingPad) return;
    setCustomPads((prev) =>
      prev.map((p) => (p.id === editingPad.id ? editingPad : p))
    );
    setEditingPad(null);
    triggerHaptic(20);
  };

  const handleCustomAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPad) return;
    try {
      const { buffer } = await audioEngine.loadCustomAudioFile(file);
      const customKey = `custom_pad_${editingPad.id}_${Date.now()}`;
      audioEngine.registerCustomSampleBuffer(customKey, buffer);
      setEditingPad({
        ...editingPad,
        name: file.name.slice(0, 10).toUpperCase(),
        subLabel: 'Audio Caricato',
        soundKey: customKey,
        customAudioName: file.name,
      });
      triggerHaptic(30);
    } catch {
      // Ignored
    }
  };

  return (
    <div
      id="desktop-pads-controller"
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

      {/* Header Bar: Mode Switcher & Routing */}
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-xl p-2 shadow-md flex flex-col gap-2">
        {/* 5 Pad Modes */}
        <div className="grid grid-cols-5 gap-1">
          <button
            type="button"
            id="pad-mode-percussion"
            onClick={() => {
              triggerHaptic(15);
              setActiveMode('percussion');
            }}
            className={`flex flex-col items-center justify-center p-1 rounded-lg border font-bold text-[10px] uppercase tracking-tight transition-all active:scale-95 ${
              activeMode === 'percussion'
                ? 'bg-cyan-500 text-zinc-950 border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.8)] font-black'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
            }`}
            style={{ minHeight: '42px' }}
          >
            <Sparkles className="w-3.5 h-3.5 mb-0.5" />
            <span className="leading-tight text-[9px]">GROOVE</span>
          </button>

          <button
            type="button"
            id="pad-mode-builds"
            onClick={() => {
              triggerHaptic(15);
              setActiveMode('builds');
            }}
            className={`flex flex-col items-center justify-center p-1 rounded-lg border font-bold text-[10px] uppercase tracking-tight transition-all active:scale-95 ${
              activeMode === 'builds'
                ? 'bg-pink-500 text-zinc-950 border-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.8)] font-black'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
            }`}
            style={{ minHeight: '42px' }}
          >
            <Flame className="w-3.5 h-3.5 mb-0.5" />
            <span className="leading-tight text-[9px]">BUILDS</span>
          </button>

          <button
            type="button"
            id="pad-mode-drum"
            onClick={() => {
              triggerHaptic(15);
              setActiveMode('drum');
            }}
            className={`flex flex-col items-center justify-center p-1 rounded-lg border font-bold text-[10px] uppercase tracking-tight transition-all active:scale-95 ${
              activeMode === 'drum'
                ? 'bg-emerald-500 text-zinc-950 border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.8)] font-black'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
            }`}
            style={{ minHeight: '42px' }}
          >
            <Grid className="w-3.5 h-3.5 mb-0.5" />
            <span className="leading-tight text-[9px]">DRUM KIT</span>
          </button>

          <button
            type="button"
            id="pad-mode-roll"
            onClick={() => {
              triggerHaptic(15);
              setActiveMode('roll');
            }}
            className={`flex flex-col items-center justify-center p-1 rounded-lg border font-bold text-[10px] uppercase tracking-tight transition-all active:scale-95 ${
              activeMode === 'roll'
                ? 'bg-amber-500 text-zinc-950 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.8)] font-black'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
            }`}
            style={{ minHeight: '42px' }}
          >
            <Repeat className="w-3.5 h-3.5 mb-0.5" />
            <span className="leading-tight text-[9px]">BEAT ROLL</span>
          </button>

          <button
            type="button"
            id="pad-mode-custom"
            onClick={() => {
              triggerHaptic(15);
              setActiveMode('custom');
            }}
            className={`flex flex-col items-center justify-center p-1 rounded-lg border font-bold text-[10px] uppercase tracking-tight transition-all active:scale-95 ${
              activeMode === 'custom'
                ? 'bg-violet-500 text-zinc-950 border-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.8)] font-black'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
            }`}
            style={{ minHeight: '42px' }}
          >
            <Settings2 className="w-3.5 h-3.5 mb-0.5" />
            <span className="leading-tight text-[9px]">CUSTOM</span>
          </button>
        </div>

        {/* Secondary Sub-Bar: Target Deck & Quick Phrase Jump */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-zinc-400 font-semibold">TARGET:</span>
            <button
              type="button"
              id="pad-target-deck-a"
              onClick={() => {
                triggerHaptic(15);
                setTargetDeck('A');
              }}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold border transition ${
                targetDeck === 'A'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800'
              }`}
            >
              DECK A ({deckA.effectiveBpm.toFixed(0)} BPM)
            </button>

            <button
              type="button"
              id="pad-target-deck-b"
              onClick={() => {
                triggerHaptic(15);
                setTargetDeck('B');
              }}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold border transition ${
                targetDeck === 'B'
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800'
              }`}
            >
              DECK B ({deckB.effectiveBpm.toFixed(0)} BPM)
            </button>
          </div>

          {/* Jump / Phrase skip & Custom edit */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              id="pad-jump-4beats"
              title="Salta avanti 4 battute in battuta"
              onClick={() => {
                triggerHaptic(18);
                audioEngine.beatJump(targetDeck, 4);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-bold bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 active:scale-95 transition"
            >
              <FastForward className="w-3 h-3 text-cyan-400" />
              <span>+4 BATTUTE</span>
            </button>

            {activeMode === 'custom' && (
              <button
                type="button"
                id="pad-custom-edit-toggle"
                onClick={() => {
                  triggerHaptic(15);
                  setIsEditing(!isEditing);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-bold border transition ${
                  isEditing
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}
              >
                <Settings2 className="w-3 h-3" />
                <span>{isEditing ? 'FINE' : 'EDIT'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main 8 Performance Pads Matrix (4x2 layout for thumbs) */}
      <div className="my-2 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 border-2 border-zinc-800 rounded-2xl p-2.5 shadow-2xl flex-1 flex flex-col justify-center gap-2.5">
        <div className="grid grid-cols-4 gap-2.5 flex-1">
          {currentPads.map((pad) => {
            const isFired = activePadIds.has(pad.id);

            return (
              <button
                key={pad.id}
                id={`perf-pad-${pad.id}`}
                type="button"
                onPointerDown={(e) => {
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  if (isEditing && activeMode === 'custom') {
                    setEditingPad({ ...pad });
                  } else {
                    handlePadDown(pad);
                  }
                }}
                onPointerUp={() => handlePadUp(pad)}
                onPointerCancel={() => handlePadUp(pad)}
                className={`relative rounded-2xl border-2 flex flex-col items-center justify-between p-2 select-none transition-all active:scale-95 shadow-lg ${
                  isFired
                    ? 'border-white text-zinc-950 scale-98 shadow-2xl brightness-125'
                    : isEditing && activeMode === 'custom'
                    ? 'border-dashed border-emerald-400/80 bg-zinc-900/90 text-emerald-200'
                    : 'bg-zinc-900 hover:bg-zinc-800/90 border-zinc-700/80 text-zinc-100'
                }`}
                style={{
                  minHeight: '110px',
                  backgroundColor: isFired ? pad.color : undefined,
                  boxShadow: isFired ? `0 0 24px ${pad.color}` : `0 4px 12px rgba(0,0,0,0.5)`,
                }}
              >
                {/* Top LED Indicator & Pad Number */}
                <div className="w-full flex items-center justify-between">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: pad.color,
                      boxShadow: isFired ? `0 0 8px #ffffff` : `0 0 6px ${pad.color}`,
                    }}
                  />
                  <span
                    className={`text-[9px] font-mono font-bold ${
                      isFired ? 'text-zinc-950' : 'text-zinc-400'
                    }`}
                  >
                    PAD {pad.id}
                  </span>
                </div>

                {/* Center Pad Title */}
                <div className="my-auto flex flex-col items-center justify-center">
                  <span
                    className={`text-xs font-black tracking-tight leading-tight text-center ${
                      isFired ? 'text-zinc-950' : 'text-zinc-100'
                    }`}
                  >
                    {pad.name}
                  </span>
                </div>

                {/* Bottom Sub-Label (Groove, riser, or roll duration) */}
                <div className="w-full text-center">
                  <span
                    className={`text-[9px] font-mono truncate max-w-full block ${
                      isFired ? 'text-zinc-900 font-black' : 'text-zinc-400'
                    }`}
                  >
                    {isEditing && activeMode === 'custom' ? '✎ MODIFICA' : pad.subLabel || 'READY'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Control Bar: Pads Master Volume Level Slider */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-2 flex items-center gap-3 shadow-md">
        <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[10px]">
          <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>PAD VOLUME:</span>
        </div>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={padVolume}
          onChange={(e) => setPadVolume(parseFloat(e.target.value))}
          className="flex-1 accent-cyan-400 h-2 bg-zinc-950 rounded-lg cursor-pointer"
        />

        <span className="text-[10px] font-mono font-bold text-cyan-300 w-10 text-right">
          {Math.round(padVolume * 100)}%
        </span>
      </div>

      {/* Modal: Custom Pad Configurator */}
      {editingPad && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-4 space-y-3.5 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: editingPad.color }}
                />
                <h3 className="font-bold text-sm text-zinc-100">
                  Modifica PAD {editingPad.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPad(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pad Label Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-300">Etichetta Pad:</label>
              <input
                type="text"
                value={editingPad.name}
                onChange={(e) =>
                  setEditingPad({ ...editingPad, name: e.target.value.toUpperCase() })
                }
                maxLength={12}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 font-bold font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Sound Assignment */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-300">Suono Assegnato:</label>
              <select
                value={editingPad.soundKey}
                onChange={(e) => {
                  const opt = PRESET_SOUND_OPTIONS.find((s) => s.key === e.target.value);
                  setEditingPad({
                    ...editingPad,
                    soundKey: e.target.value,
                    subLabel: opt ? opt.label : 'Preset',
                  });
                }}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 font-mono text-xs focus:border-cyan-400 focus:outline-none"
              >
                {PRESET_SOUND_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Upload Custom Audio File */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-200 flex items-center justify-center gap-2 font-semibold transition"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Carica File Audio Personale (MP3/WAV)</span>
              </button>
              {editingPad.customAudioName && (
                <p className="text-[10px] text-cyan-300 font-mono truncate">
                  Caricato: {editingPad.customAudioName}
                </p>
              )}
            </div>

            {/* Color Palette */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-300">Colore LED RGB:</label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setEditingPad({ ...editingPad, color: c.hex })}
                    className={`h-8 rounded-lg border flex items-center justify-center transition ${
                      editingPad.color === c.hex ? 'border-white scale-105' : 'border-zinc-700'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {editingPad.color === c.hex && <Check className="w-4 h-4 text-zinc-950" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setEditingPad(null)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 font-semibold"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSaveEditedPad}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-600/30"
              >
                Salva Modifiche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
