export type DesktopId = 'performance' | 'eq' | 'fx' | 'cues_sampler' | 'pads';

export interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  duration: number; // in seconds
  color: string;
  isCustom?: boolean;
  genre: string;
}

export type DeckId = 'A' | 'B';

export interface HotCue {
  id: number;
  time: number | null; // in seconds
  color: string;
  label: string;
}

export interface DeckState {
  id: DeckId;
  track: Track | null;
  isPlaying: boolean;
  isCuePressed: boolean;
  volume: number; // 0 to 1
  currentTime: number; // in seconds
  pitchPercent: number; // -16% to +16%
  effectiveBpm: number;
  isSync: boolean;
  
  // EQ (-24dB to +6dB, 0dB is neutral)
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  killLow: boolean;
  killMid: boolean;
  killHigh: boolean;

  // Cues & Loops
  hotCues: HotCue[];
  isLooping: boolean;
  loopLengthBeats: number | null; // 0.5, 1, 2, 4, 8
  loopStart: number | null;
  loopEnd: number | null;
  manualLoopIn: number | null;
  manualLoopOut: number | null;

  // Pro Performance Modes
  isKeyLock: boolean;
  isSlipMode: boolean;
}

export type FXType =
  | 'filter' // Low-Pass
  | 'filter_hp' // High-Pass
  | 'echo' // Dub Tape Echo
  | 'spiral' // Spiral Ping-Pong Delay
  | 'reverb' // Lush Reverb Hall
  | 'chorus' // Stereo Chorus & Dimension
  | 'pitch_shift' // Harmonic Pitch Shift
  | 'vinyl_brake'; // Turntable Vinyl Brake

export type FXTarget = 'A' | 'B' | 'master';

export interface FXState {
  type: FXType;
  target: FXTarget;
  active: boolean;
  mode: 'hold' | 'latch';
  x: number; // 0 to 1 (Frequency / Rate)
  y: number; // 0 to 1 (Resonance Q / Wet-Dry)
}

export interface SamplerPad {
  id: number;
  name: string;
  color: string;
  type: string;
  isPlaying: boolean;
  customName?: string;
}

export type PadMode = 'drum' | 'percussion' | 'builds' | 'roll' | 'custom';

export interface ControllerPad {
  id: number;
  name: string;
  subLabel?: string;
  color: string;
  soundKey: string;
  triggerMode: 'momentary' | 'toggle';
  rollBeats?: number;
  semitone?: number;
  customAudioName?: string;
  isTriggered?: boolean;
}
