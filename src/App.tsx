import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DesktopId,
  DeckState,
  DeckId,
  Track,
  FXState,
  HotCue,
} from './types';
import {
  audioEngine,
  DEFAULT_TRACKS,
  triggerHaptic,
} from './audio/DjAudioEngine';
import { DockBar } from './components/DockBar';
import { TrackDrawer } from './components/TrackDrawer';
import { DesktopPerformance } from './components/DesktopPerformance';
import { DesktopEQ } from './components/DesktopEQ';
import { DesktopFX } from './components/DesktopFX';
import { DesktopCuesLoops } from './components/DesktopCuesLoops';
import { DesktopPadsController } from './components/DesktopPadsController';
import { InstallApkModal } from './components/InstallApkModal';
import { Disc3, Volume2, ShieldCheck, Smartphone, Download } from 'lucide-react';

const INITIAL_HOT_CUES: HotCue[] = [
  { id: 1, time: null, color: '#ef4444', label: 'CUE 1' },
  { id: 2, time: null, color: '#06b6d4', label: 'CUE 2' },
  { id: 3, time: null, color: '#10b981', label: 'CUE 3' },
  { id: 4, time: null, color: '#f59e0b', label: 'CUE 4' },
  { id: 5, time: null, color: '#ec4899', label: 'CUE 5' },
  { id: 6, time: null, color: '#8b5cf6', label: 'CUE 6' },
  { id: 7, time: null, color: '#14b8a6', label: 'CUE 7' },
  { id: 8, time: null, color: '#eab308', label: 'CUE 8' },
];

export default function App() {
  const [activeDesktop, setActiveDesktop] = useState<DesktopId>('performance');
  const [trackCatalog, setTrackCatalog] = useState<Track[]>(DEFAULT_TRACKS);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerTargetDeck, setDrawerTargetDeck] = useState<DeckId | null>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  // Crossfader position (-1 = full Deck A, 0 = center, 1 = full Deck B)
  const [crossfader, setCrossfader] = useState<number>(0);

  // Deck A State
  const [deckA, setDeckA] = useState<DeckState>({
    id: 'A',
    track: DEFAULT_TRACKS[0],
    isPlaying: false,
    isCuePressed: false,
    volume: 0.85,
    currentTime: 0,
    pitchPercent: 0,
    effectiveBpm: DEFAULT_TRACKS[0].bpm,
    isSync: false,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    killLow: false,
    killMid: false,
    killHigh: false,
    hotCues: [...INITIAL_HOT_CUES],
    isLooping: false,
    loopLengthBeats: null,
    loopStart: null,
    loopEnd: null,
    manualLoopIn: null,
    manualLoopOut: null,
    isKeyLock: true,
    isSlipMode: false,
  });

  // Deck B State
  const [deckB, setDeckB] = useState<DeckState>({
    id: 'B',
    track: DEFAULT_TRACKS[1],
    isPlaying: false,
    isCuePressed: false,
    volume: 0.85,
    currentTime: 0,
    pitchPercent: 0,
    effectiveBpm: DEFAULT_TRACKS[1].bpm,
    isSync: false,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    killLow: false,
    killMid: false,
    killHigh: false,
    hotCues: [...INITIAL_HOT_CUES],
    isLooping: false,
    loopLengthBeats: null,
    loopStart: null,
    loopEnd: null,
    manualLoopIn: null,
    manualLoopOut: null,
    isKeyLock: true,
    isSlipMode: false,
  });

  // FX Pad State
  const [fxState, setFxState] = useState<FXState>({
    type: 'filter',
    target: 'master',
    active: false,
    mode: 'hold',
    x: 0.85,
    y: 0.2,
  });

  // Assistant features state
  const [isQuantize, setIsQuantize] = useState<boolean>(true);
  const [isFilterFade, setIsFilterFade] = useState<boolean>(false);
  const [isAutoCrossfading, setIsAutoCrossfading] = useState<boolean>(false);
  const [pflA, setPflA] = useState<boolean>(false);
  const [pflB, setPflB] = useState<boolean>(false);

  // Live Master Mix Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const [recordedMix, setRecordedMix] = useState<{ blob: Blob; url: string; duration: number } | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);

  // Refs for tracking current states without stale closures in audio loop
  const deckARef = useRef(deckA);
  deckARef.current = deckA;
  const deckBRef = useRef(deckB);
  deckBRef.current = deckB;

  // Initialize engine & attach real-time playback position listener
  useEffect(() => {
    audioEngine.setTimeUpdateListener((deckId, curTime) => {
      if (deckId === 'A') {
        const d = deckARef.current;
        // Check loop boundaries
        if (d.isLooping && d.loopStart !== null && d.loopEnd !== null) {
          if (curTime >= d.loopEnd || curTime < d.loopStart) {
            if (d.track) {
              audioEngine.seekDeck('A', d.track, d.loopStart, true);
              return;
            }
          }
        }
        setDeckA((prev) => ({ ...prev, currentTime: curTime }));
      } else {
        const d = deckBRef.current;
        if (d.isLooping && d.loopStart !== null && d.loopEnd !== null) {
          if (curTime >= d.loopEnd || curTime < d.loopStart) {
            if (d.track) {
              audioEngine.seekDeck('B', d.track, d.loopStart, true);
              return;
            }
          }
        }
        setDeckB((prev) => ({ ...prev, currentTime: curTime }));
      }
    });

    return () => {
      audioEngine.cleanup();
    };
  }, []);

  // Update Crossfader
  const handleCrossfaderChange = useCallback((val: number) => {
    setCrossfader(val);
    audioEngine.setCrossfader(val);
  }, []);

  // Play / Pause Toggle
  const handlePlayPauseToggle = useCallback(async (deckId: DeckId) => {
    const deck = deckId === 'A' ? deckARef.current : deckBRef.current;
    if (!deck || !deck.track) return;

    if (deck.isPlaying) {
      audioEngine.pauseDeck(deckId);
      if (deckId === 'A') {
        setDeckA((prev) => ({ ...prev, isPlaying: false }));
      } else {
        setDeckB((prev) => ({ ...prev, isPlaying: false }));
      }
    } else {
      await audioEngine.playDeck(deckId, deck.track);
      if (deckId === 'A') {
        setDeckA((prev) => ({ ...prev, isPlaying: true }));
      } else {
        setDeckB((prev) => ({ ...prev, isPlaying: true }));
      }
    }
  }, []);

  // Cue Press & Release
  const handleCueDown = useCallback((deckId: DeckId) => {
    const deck = deckId === 'A' ? deckARef.current : deckBRef.current;
    if (!deck || !deck.track) return;

    // If already playing, jump to cue 0 and hold
    audioEngine.seekDeck(deckId, deck.track, 0, true);
    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, isCuePressed: true, isPlaying: true, currentTime: 0 }));
    } else {
      setDeckB((prev) => ({ ...prev, isCuePressed: true, isPlaying: true, currentTime: 0 }));
    }
  }, []);

  const handleCueUp = useCallback((deckId: DeckId) => {
    const deck = deckId === 'A' ? deckARef.current : deckBRef.current;
    if (!deck || !deck.isCuePressed) return;

    audioEngine.pauseDeck(deckId);
    if (deck.track) {
      audioEngine.seekDeck(deckId, deck.track, 0, false);
    }
    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, isCuePressed: false, isPlaying: false, currentTime: 0 }));
    } else {
      setDeckB((prev) => ({ ...prev, isCuePressed: false, isPlaying: false, currentTime: 0 }));
    }
  }, []);

  // Sync BPM
  const handleSync = useCallback((deckId: DeckId) => {
    const targetDeck = deckId === 'A' ? deckBRef.current : deckARef.current;
    const currentDeck = deckId === 'A' ? deckARef.current : deckBRef.current;

    if (!targetDeck?.track || !currentDeck?.track) return;

    const targetBpm = targetDeck.effectiveBpm || targetDeck.track.bpm || 128;
    const baseBpm = currentDeck.track.bpm || 128;
    const newPitch = ((targetBpm - baseBpm) / baseBpm) * 100;
    const clampedPitch = Math.max(-16, Math.min(16, newPitch));
    const rate = 1 + clampedPitch / 100;

    audioEngine.setPitchRate(deckId, rate);

    const update = {
      isSync: true,
      pitchPercent: clampedPitch,
      effectiveBpm: baseBpm * rate,
    };

    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, ...update }));
    } else {
      setDeckB((prev) => ({ ...prev, ...update }));
    }
  }, []);

  // Tap Tempo
  const handleTapTempo = useCallback((deckId: DeckId) => {
    const deck = deckId === 'A' ? deckARef.current : deckBRef.current;
    // Slight pitch nudge on tap
    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, isSync: false }));
    } else {
      setDeckB((prev) => ({ ...prev, isSync: false }));
    }
  }, []);

  // Volume Change
  const handleVolumeChange = useCallback((deckId: DeckId, volume: number) => {
    audioEngine.setDeckVolume(deckId, volume);
    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, volume }));
    } else {
      setDeckB((prev) => ({ ...prev, volume }));
    }
  }, []);

  // Pitch Change
  const handlePitchChange = useCallback((deckId: DeckId, pitchPercent: number) => {
    const deck = deckId === 'A' ? deckARef.current : deckBRef.current;
    const rate = 1 + pitchPercent / 100;
    audioEngine.setPitchRate(deckId, rate);

    const baseBpm = deck.track?.bpm || 126;
    const update = {
      pitchPercent,
      effectiveBpm: baseBpm * rate,
      isSync: false,
    };

    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, ...update }));
    } else {
      setDeckB((prev) => ({ ...prev, ...update }));
    }
  }, []);

  // EQ Control & Kill
  const handleEqChange = useCallback((deckId: DeckId, band: 'low' | 'mid' | 'high', val: number) => {
    const deck = deckId === 'A' ? deckARef.current : deckBRef.current;
    const killed = band === 'low' ? deck.killLow : band === 'mid' ? deck.killMid : deck.killHigh;
    audioEngine.setEq(deckId, band, val, killed);

    const key = band === 'low' ? 'eqLow' : band === 'mid' ? 'eqMid' : 'eqHigh';
    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, [key]: val }));
    } else {
      setDeckB((prev) => ({ ...prev, [key]: val }));
    }
  }, []);

  const handleKillToggle = useCallback((deckId: DeckId, band: 'low' | 'mid' | 'high') => {
    const deck = deckId === 'A' ? deckARef.current : deckBRef.current;
    const killKey = band === 'low' ? 'killLow' : band === 'mid' ? 'killMid' : 'killHigh';
    const eqKey = band === 'low' ? 'eqLow' : band === 'mid' ? 'eqMid' : 'eqHigh';

    const willBeKilled = !deck[killKey];
    audioEngine.setEq(deckId, band, deck[eqKey], willBeKilled);

    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, [killKey]: willBeKilled }));
    } else {
      setDeckB((prev) => ({ ...prev, [killKey]: willBeKilled }));
    }
  }, []);

  const handleResetDeckEq = useCallback((deckId: DeckId) => {
    ['low', 'mid', 'high'].forEach((b) => {
      audioEngine.setEq(deckId, b as 'low' | 'mid' | 'high', 0, false);
    });

    const resetValues = {
      eqLow: 0,
      eqMid: 0,
      eqHigh: 0,
      killLow: false,
      killMid: false,
      killHigh: false,
    };

    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, ...resetValues }));
    } else {
      setDeckB((prev) => ({ ...prev, ...resetValues }));
    }
  }, []);

  // FX Pad Updates
  const handleFxChange = useCallback((next: Partial<FXState>) => {
    setFxState((prev) => {
      const updated = { ...prev, ...next };
      audioEngine.updateFx(updated.type, updated.target, updated.x, updated.y, updated.active);
      return updated;
    });
  }, []);

  // Hot Cues Handling
  const handleSetHotCue = useCallback((deckId: DeckId, cueId: number) => {
    const deck = deckId === 'A' ? deckARef.current : deckBRef.current;
    const time = deck.currentTime;

    const updateCues = (cues: HotCue[]) =>
      cues.map((c) => (c.id === cueId ? { ...c, time } : c));

    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, hotCues: updateCues(prev.hotCues) }));
    } else {
      setDeckB((prev) => ({ ...prev, hotCues: updateCues(prev.hotCues) }));
    }
  }, []);

  const handleJumpHotCue = useCallback((deckId: DeckId, cueId: number) => {
    const deck = deckId === 'A' ? deckARef.current : deckBRef.current;
    const targetCue = deck.hotCues.find((c) => c.id === cueId);
    if (!targetCue || targetCue.time === null || !deck.track) return;

    audioEngine.seekDeck(deckId, deck.track, targetCue.time, true);

    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, currentTime: targetCue.time!, isPlaying: true }));
    } else {
      setDeckB((prev) => ({ ...prev, currentTime: targetCue.time!, isPlaying: true }));
    }
  }, []);

  const handleClearHotCue = useCallback((deckId: DeckId, cueId: number) => {
    const updateCues = (cues: HotCue[]) =>
      cues.map((c) => (c.id === cueId ? { ...c, time: null } : c));

    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, hotCues: updateCues(prev.hotCues) }));
    } else {
      setDeckB((prev) => ({ ...prev, hotCues: updateCues(prev.hotCues) }));
    }
  }, []);

  // Auto-Loop & Manual Loop Handling
  const handleSetAutoLoop = useCallback((deckId: DeckId, beats: number) => {
    const deck = deckId === 'A' ? deckARef.current : deckBRef.current;
    const secondsPerBeat = 60 / deck.effectiveBpm;
    const loopDuration = beats * secondsPerBeat;
    const start = deck.currentTime;
    const end = start + loopDuration;

    const update = {
      isLooping: true,
      loopLengthBeats: beats,
      loopStart: start,
      loopEnd: end,
    };

    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, ...update }));
    } else {
      setDeckB((prev) => ({ ...prev, ...update }));
    }
  }, []);

  const handleToggleLoop = useCallback((deckId: DeckId) => {
    const deck = deckId === 'A' ? deckARef.current : deckBRef.current;
    const willLoop = !deck.isLooping;

    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, isLooping: willLoop }));
    } else {
      setDeckB((prev) => ({ ...prev, isLooping: willLoop }));
    }
  }, []);

  const handleManualLoopIn = useCallback((deckId: DeckId) => {
    const deck = deckId === 'A' ? deckARef.current : deckBRef.current;
    const start = deck.currentTime;

    if (deckId === 'A') {
      setDeckA((prev) => ({
        ...prev,
        manualLoopIn: start,
        loopStart: start,
      }));
    } else {
      setDeckB((prev) => ({
        ...prev,
        manualLoopIn: start,
        loopStart: start,
      }));
    }
  }, []);

  const handleManualLoopOut = useCallback((deckId: DeckId) => {
    const deck = deckId === 'A' ? deckARef.current : deckBRef.current;
    const end = deck.currentTime;
    const start = deck.manualLoopIn !== null ? deck.manualLoopIn : Math.max(0, end - 2);

    const update = {
      manualLoopOut: end,
      loopStart: start,
      loopEnd: end,
      isLooping: true,
      loopLengthBeats: null,
    };

    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, ...update }));
    } else {
      setDeckB((prev) => ({ ...prev, ...update }));
    }
  }, []);

  // Sampler Drop
  const handlePlaySamplerDrop = useCallback((type: string) => {
    audioEngine.playSample(type);
  }, []);

  // Drawer Track Loading
  const handleOpenTrackDrawer = (deckId: DeckId) => {
    setDrawerTargetDeck(deckId);
    setIsDrawerOpen(true);
  };

  const handleSelectTrack = useCallback((deckId: DeckId, track: Track) => {
    // If deck was playing, stop it and reset position
    audioEngine.pauseDeck(deckId);

    const update = {
      track,
      isPlaying: false,
      currentTime: 0,
      effectiveBpm: track.bpm,
      pitchPercent: 0,
      isSync: false,
      isLooping: false,
      loopLengthBeats: null,
      loopStart: null,
      loopEnd: null,
    };

    if (deckId === 'A') {
      setDeckA((prev) => ({ ...prev, ...update }));
    } else {
      setDeckB((prev) => ({ ...prev, ...update }));
    }
  }, []);

  const handleUploadCustomTrack = useCallback(async (file: File): Promise<Track> => {
    const { buffer, duration, bpm } = await audioEngine.loadCustomAudioFile(file);
    const id = `custom-${Date.now()}`;
    const newTrack: Track = {
      id,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'File Locale',
      bpm: bpm || 128,
      key: '12A',
      duration,
      color: '#38bdf8',
      isCustom: true,
      genre: 'User Audio',
    };

    audioEngine.registerCustomTrackBuffer(id, buffer);
    setTrackCatalog((prev) => [newTrack, ...prev.filter((t) => t.id !== id)]);
    return newTrack;
  }, []);

  const handleToggleQuantize = useCallback(() => {
    setIsQuantize((prev) => {
      const next = !prev;
      audioEngine.setQuantize(next);
      return next;
    });
  }, []);

  const handleToggleFilterFade = useCallback(() => {
    setIsFilterFade((prev) => {
      const next = !prev;
      audioEngine.setFilterFade(next);
      return next;
    });
  }, []);

  const handleTogglePfl = useCallback((deckId: DeckId) => {
    if (deckId === 'A') {
      setPflA((prev) => {
        const next = !prev;
        audioEngine.setPfl('A', next);
        return next;
      });
    } else {
      setPflB((prev) => {
        const next = !prev;
        audioEngine.setPfl('B', next);
        return next;
      });
    }
  }, []);

  const handleToggleKeyLock = useCallback((deckId: DeckId) => {
    if (deckId === 'A') {
      setDeckA((prev) => {
        const next = !prev.isKeyLock;
        audioEngine.setKeyLock('A', next);
        return { ...prev, isKeyLock: next };
      });
    } else {
      setDeckB((prev) => {
        const next = !prev.isKeyLock;
        audioEngine.setKeyLock('B', next);
        return { ...prev, isKeyLock: next };
      });
    }
  }, []);

  const handleToggleSlipMode = useCallback((deckId: DeckId) => {
    if (deckId === 'A') {
      setDeckA((prev) => {
        const next = !prev.isSlipMode;
        audioEngine.setSlipMode('A', next);
        return { ...prev, isSlipMode: next };
      });
    } else {
      setDeckB((prev) => {
        const next = !prev.isSlipMode;
        audioEngine.setSlipMode('B', next);
        return { ...prev, isSlipMode: next };
      });
    }
  }, []);

  const handleAutoCrossfade = useCallback(() => {
    if (isAutoCrossfading) {
      audioEngine.stopAutoCrossfade();
      setIsAutoCrossfading(false);
      return;
    }
    setIsAutoCrossfading(true);
    audioEngine.startAutoCrossfade(
      crossfader,
      (newVal) => {
        setCrossfader(newVal);
      },
      () => {
        setIsAutoCrossfading(false);
      },
      3200
    );
  }, [crossfader, isAutoCrossfading]);

  const handleToggleRecord = useCallback(async () => {
    triggerHaptic(30);
    if (!isRecording) {
      const started = audioEngine.startRecording((state) => {
        setRecordDuration(state.duration);
      });
      if (started) {
        setIsRecording(true);
        setRecordDuration(0);
      }
    } else {
      const result = await audioEngine.stopRecording();
      setIsRecording(false);
      if (result && result.blob.size > 0) {
        setRecordedMix(result);
        setIsRecordModalOpen(true);
      }
    }
  }, [isRecording]);

  const handleNudge = useCallback((deckId: DeckId, direction: 'forward' | 'backward', isHeld: boolean) => {
    audioEngine.nudgeDeck(deckId, direction, isHeld);
  }, []);

  return (
    <div
      id="app-root"
      className="fixed inset-0 flex flex-col bg-zinc-950 text-zinc-100 select-none overflow-hidden touch-none"
    >
      {/* Top Application Status Bar */}
      <header
        id="app-header"
        className="w-full max-w-md mx-auto bg-zinc-950 border-b border-zinc-800/80 px-3 py-1.5 flex items-center justify-between z-30 shrink-0 select-none"
        style={{ minHeight: '44px' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center shadow-md">
            <Disc3 className="w-4 h-4 text-zinc-950 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-wider uppercase text-zinc-100 flex items-center gap-1.5">
              ZERO-LATENCY <span className="text-cyan-400">DJ MIXER</span>
            </h1>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>48 kHz WebAudio Engine</span>
            </div>
          </div>
        </div>

        {/* Live Recording, Status Badge + Install/APK Button */}
        <div className="flex items-center gap-1.5">
          {/* Master Live Recording Button */}
          <button
            id="btn-record-mix"
            type="button"
            onClick={handleToggleRecord}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg font-mono font-bold text-[10px] border transition active:scale-95 shadow-sm ${
              isRecording
                ? 'bg-red-500/25 border-red-500 text-red-400 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
            }`}
            title={isRecording ? 'Ferma e salva la registrazione del DJ set' : 'Registra il tuo DJ Mix in tempo reale'}
          >
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-red-500'}`} />
            <span>
              {isRecording
                ? `${Math.floor(recordDuration / 60)}:${String(recordDuration % 60).padStart(2, '0')}`
                : 'REC'}
            </span>
          </button>

          <button
            id="btn-open-install-modal"
            onClick={() => {
              triggerHaptic(20);
              setIsInstallModalOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 active:scale-95 border border-cyan-500/50 text-cyan-300 font-bold text-[10px] shadow-sm transition"
            title="Installa applicazione sul telefono o genera file .APK Android"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Installa / APK</span>
          </button>

          <div className="px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
            {activeDesktop === 'performance' && 'DESK 1'}
            {activeDesktop === 'eq' && 'DESK 2'}
            {activeDesktop === 'fx' && 'DESK 3'}
            {activeDesktop === 'cues_sampler' && 'DESK 4'}
            {activeDesktop === 'pads' && 'DESK 5'}
          </div>

          <div
            title="Zero Latency Haptic Enabled"
            className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>
      </header>

      {/* Main View Area: Render Active Desktop */}
      <main id="active-desktop-viewport" className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {activeDesktop === 'performance' && (
          <DesktopPerformance
            deckA={deckA}
            deckB={deckB}
            crossfader={crossfader}
            isQuantize={isQuantize}
            isFilterFade={isFilterFade}
            pflA={pflA}
            pflB={pflB}
            isAutoCrossfading={isAutoCrossfading}
            onPlayPauseToggle={handlePlayPauseToggle}
            onCueDown={handleCueDown}
            onCueUp={handleCueUp}
            onSync={handleSync}
            onToggleKeyLock={handleToggleKeyLock}
            onToggleSlipMode={handleToggleSlipMode}
            onTapTempo={handleTapTempo}
            onNudge={handleNudge}
            onTogglePfl={handleTogglePfl}
            onToggleQuantize={handleToggleQuantize}
            onToggleFilterFade={handleToggleFilterFade}
            onAutoCrossfade={handleAutoCrossfade}
            onVolumeChange={handleVolumeChange}
            onPitchChange={handlePitchChange}
            onCrossfaderChange={handleCrossfaderChange}
            onOpenTrackDrawer={handleOpenTrackDrawer}
          />
        )}

        {activeDesktop === 'eq' && (
          <DesktopEQ
            deckA={deckA}
            deckB={deckB}
            onEqChange={handleEqChange}
            onKillToggle={handleKillToggle}
            onResetDeckEq={handleResetDeckEq}
          />
        )}

        {activeDesktop === 'fx' && (
          <DesktopFX
            fxState={fxState}
            onFxChange={handleFxChange}
          />
        )}

        {activeDesktop === 'cues_sampler' && (
          <DesktopCuesLoops
            deckA={deckA}
            deckB={deckB}
            onSetHotCue={handleSetHotCue}
            onJumpHotCue={handleJumpHotCue}
            onClearHotCue={handleClearHotCue}
            onSetAutoLoop={handleSetAutoLoop}
            onToggleLoop={handleToggleLoop}
            onManualLoopIn={handleManualLoopIn}
            onManualLoopOut={handleManualLoopOut}
            onPlaySamplerDrop={handlePlaySamplerDrop}
          />
        )}

        {activeDesktop === 'pads' && (
          <DesktopPadsController
            deckA={deckA}
            deckB={deckB}
          />
        )}
      </main>

      {/* Track Selection Top-Sheet Drawer (Overlay covering 80% of interface) */}
      <TrackDrawer
        isOpen={isDrawerOpen}
        targetDeck={drawerTargetDeck}
        tracks={trackCatalog}
        onSelectTrack={handleSelectTrack}
        onUploadCustomTrack={handleUploadCustomTrack}
        onClose={() => {
          setIsDrawerOpen(false);
          setDrawerTargetDeck(null);
        }}
      />

      {/* Fixed Bottom Dock Bar with 4 1-Tap Desktops */}
      <DockBar
        activeDesktop={activeDesktop}
        onSelectDesktop={(id) => setActiveDesktop(id)}
      />

      {/* Install App / APK Download Modal */}
      <InstallApkModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Master Mix Live Recording Modal */}
      {isRecordModalOpen && recordedMix && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <h3 className="font-bold text-sm text-zinc-100 uppercase tracking-wide">DJ Mix Registrato</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xs px-2.5 py-1 rounded bg-zinc-800"
              >
                Chiudi
              </button>
            </div>

            <div className="flex flex-col gap-2 bg-zinc-950/80 p-3 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-400">Durata Mix:</span>
                <span className="text-emerald-400 font-bold">
                  {Math.floor(recordedMix.duration / 60)}:{String(recordedMix.duration % 60).padStart(2, '0')} min
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Dimensione File:</span>
                <span className="text-zinc-300">{(recordedMix.blob.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Qualità:</span>
                <span className="text-cyan-400">Master 48kHz HD (Opus)</span>
              </div>
            </div>

            {/* Audio player preview */}
            <audio controls src={recordedMix.url} className="w-full h-9 rounded" />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  audioEngine.downloadRecording(recordedMix.blob);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs uppercase tracking-wider shadow-lg transition active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Scarica Mix Audio</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
