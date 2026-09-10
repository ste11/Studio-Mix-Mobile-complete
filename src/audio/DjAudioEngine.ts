import { Track, DeckId, FXType, FXTarget } from '../types';

export function triggerHaptic(ms: number = 18) {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  } catch {
    // Ignore unsupported environments
  }
}

// Built-in starter DJ tracks with diverse styles
export const DEFAULT_TRACKS: Track[] = [
  {
    id: 'track-1',
    title: 'Neon Sunrise (Club Mix)',
    artist: 'Anthem X',
    bpm: 126,
    key: '8A (Am)',
    duration: 180,
    color: '#06b6d4', // Cyan
    genre: 'House',
  },
  {
    id: 'track-2',
    title: 'Sub Zero Bassline',
    artist: 'Modulation Crew',
    bpm: 128,
    key: '9A (Em)',
    duration: 195,
    color: '#f97316', // Orange
    genre: 'Tech House',
  },
  {
    id: 'track-3',
    title: 'Dark Orbit Techno',
    artist: 'Sector 7',
    bpm: 132,
    key: '11A (F#m)',
    duration: 210,
    color: '#ec4899', // Pink
    genre: 'Techno',
  },
  {
    id: 'track-4',
    title: 'Liquid Velocity',
    artist: 'Drift & Flow',
    bpm: 174,
    key: '5A (Cm)',
    duration: 165,
    color: '#10b981', // Emerald
    genre: 'Drum & Bass',
  },
  {
    id: 'track-5',
    title: 'Golden Era Scratch Groove',
    artist: 'DJ Premier League',
    bpm: 94,
    key: '4A (Fm)',
    duration: 150,
    color: '#eab308', // Amber
    genre: 'Hip-Hop',
  },
  {
    id: 'track-6',
    title: 'Cyberpunk Drive 1984',
    artist: 'RetroVibe',
    bpm: 120,
    key: '2A (Ebm)',
    duration: 188,
    color: '#8b5cf6', // Violet
    genre: 'Synthwave',
  },
];

interface DeckAudioNodes {
  sourceNode: AudioBufferSourceNode | null;
  audioBuffer: AudioBuffer | null;
  currentTrack: Track | null;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  gainNode: GainNode;
  cueGainNode: GainNode;
  startTime: number;
  pauseOffset: number;
  isPlaying: boolean;
  bpm: number;
  pitchRate: number;
  basePitchRate: number;
  isBraking: boolean;
  // Slip-mode Roll & scratch tracking
  isRollActive: boolean;
  rollSavedOffset: number;
  rollSavedTime: number;
  isKeyLock: boolean;
  isSlipMode: boolean;
  slipBackgroundStartTime: number;
}

class DjAudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;

  // Master Gain, Compressor Limiter & Analyser
  private masterGain!: GainNode;
  private masterLimiter!: DynamicsCompressorNode;
  private analyserNode!: AnalyserNode;

  // Master Mix Live Recording Bus
  private recorderDestination: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording: boolean = false;
  private recordStartTime: number = 0;
  private onRecordStateChange?: (state: { isRecording: boolean; duration: number }) => void;
  private recordIntervalId: number | null = null;

  // Auto-Crossfade Animation
  private autoMixAnimId: number | null = null;

  // Deck Nodes
  private deckA!: DeckAudioNodes;
  private deckB!: DeckAudioNodes;

  // Crossfader gain nodes
  private crossfaderGainA!: GainNode;
  private crossfaderGainB!: GainNode;

  // Dry / FX Send matrix nodes
  private deckA_dry!: GainNode;
  private deckA_fxSend!: GainNode;
  private deckB_dry!: GainNode;
  private deckB_fxSend!: GainNode;

  // FX Bus Nodes
  private fxInputNode!: GainNode;
  private fxOutputNode!: GainNode;

  // FX Nodes (Isolated & Non-distorting)
  private fxFilterLpNode!: BiquadFilterNode;
  private fxFilterLpWetGain!: GainNode;

  private fxFilterHpNode!: BiquadFilterNode;
  private fxFilterHpWetGain!: GainNode;

  private fxDelayNode!: DelayNode;
  private fxDelayFeedbackGain!: GainNode;
  private fxDelayWetGain!: GainNode;
  private fxDelayDamperFilter!: BiquadFilterNode;
  private fxDelayHighPassFilter!: BiquadFilterNode;

  private fxSpiralDelayL!: DelayNode;
  private fxSpiralDelayR!: DelayNode;
  private fxSpiralPannerL!: StereoPannerNode;
  private fxSpiralPannerR!: StereoPannerNode;
  private fxSpiralFeedbackGain!: GainNode;
  private fxSpiralWetGain!: GainNode;
  private fxSpiralDamperFilter!: BiquadFilterNode;
  private fxSpiralHighPassFilter!: BiquadFilterNode;

  private fxReverbConvolver!: ConvolverNode;
  private fxReverbPreFilter!: BiquadFilterNode;
  private fxReverbWetGain!: GainNode;

  private fxChorusDelayL!: DelayNode;
  private fxChorusDelayR!: DelayNode;
  private fxChorusPannerL!: StereoPannerNode;
  private fxChorusPannerR!: StereoPannerNode;
  private fxChorusHighPassFilter!: BiquadFilterNode;
  private fxChorusLfoL!: OscillatorNode;
  private fxChorusLfoR!: OscillatorNode;
  private fxChorusLfoGainL!: GainNode;
  private fxChorusLfoGainR!: GainNode;
  private fxChorusWetGain!: GainNode;

  private fxPitchShiftWetGain!: GainNode;

  // Assistant features (Quantize, Filter Fade, PFL Pre-listen)
  private isQuantize: boolean = true;
  private isFilterFade: boolean = false;
  private pflGainA!: GainNode;
  private pflGainB!: GainNode;
  private pflActiveA: boolean = false;
  private pflActiveB: boolean = false;

  // Loop & Playback tracking callbacks
  private onTimeUpdate?: (deck: DeckId, currentTime: number) => void;
  private animFrameId: number | null = null;

  // Buffers cache
  private trackBufferCache: Map<string, AudioBuffer> = new Map();
  private samplerBuffers: Map<string, AudioBuffer> = new Map();
  private customSampleBuffers: Map<string, AudioBuffer> = new Map();

  public getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    const ctx = this.getAudioContext();

    // Master Gain (optimal clean headroom - 3dB margin)
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.78, ctx.currentTime);

    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 128;

    // Transparent Broadcast Peak Limiter (prevents digital clipping against DAC without squashing bass)
    this.masterLimiter = ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(-1.0, ctx.currentTime);
    this.masterLimiter.knee.setValueAtTime(3.0, ctx.currentTime);
    this.masterLimiter.ratio.setValueAtTime(20.0, ctx.currentTime);
    this.masterLimiter.attack.setValueAtTime(0.003, ctx.currentTime);
    this.masterLimiter.release.setValueAtTime(0.060, ctx.currentTime);

    this.masterGain.connect(this.masterLimiter);
    this.masterLimiter.connect(this.analyserNode);
    this.analyserNode.connect(ctx.destination);

    // Master Mix Live Recording Bus (clean tap after limiter)
    this.recorderDestination = ctx.createMediaStreamDestination();
    this.masterLimiter.connect(this.recorderDestination);

    // Crossfader gain nodes
    this.crossfaderGainA = ctx.createGain();
    this.crossfaderGainB = ctx.createGain();
    this.crossfaderGainA.gain.setValueAtTime(0.707, ctx.currentTime);
    this.crossfaderGainB.gain.setValueAtTime(0.707, ctx.currentTime);

    // Initialize Decks
    this.deckA = this.createDeckNodes(ctx);
    this.deckB = this.createDeckNodes(ctx);

    // Dry / FX Send Split Matrix
    this.deckA_dry = ctx.createGain();
    this.deckA_fxSend = ctx.createGain();
    this.deckB_dry = ctx.createGain();
    this.deckB_fxSend = ctx.createGain();

    this.deckA_dry.gain.setValueAtTime(1.0, ctx.currentTime);
    this.deckA_fxSend.gain.setValueAtTime(0.0, ctx.currentTime);
    this.deckB_dry.gain.setValueAtTime(1.0, ctx.currentTime);
    this.deckB_fxSend.gain.setValueAtTime(0.0, ctx.currentTime);

    // FX Chain setup
    this.initFxSystem(ctx);

    // Wire: Deck -> Volume -> Crossfader -> Matrix -> Master / FX Send
    this.deckA.eqHigh.connect(this.deckA.gainNode);
    this.deckA.gainNode.connect(this.crossfaderGainA);
    this.crossfaderGainA.connect(this.deckA_dry);
    this.crossfaderGainA.connect(this.deckA_fxSend);
    this.deckA_dry.connect(this.masterGain);
    this.deckA_fxSend.connect(this.fxInputNode);

    this.deckB.eqHigh.connect(this.deckB.gainNode);
    this.deckB.gainNode.connect(this.crossfaderGainB);
    this.crossfaderGainB.connect(this.deckB_dry);
    this.crossfaderGainB.connect(this.deckB_fxSend);
    this.deckB_dry.connect(this.masterGain);
    this.deckB_fxSend.connect(this.fxInputNode);

    this.fxOutputNode.connect(this.masterGain);

    // PFL Headphone Pre-listen Bus (Allows hearing incoming deck before opening fader/crossfader)
    this.pflGainA = ctx.createGain();
    this.pflGainB = ctx.createGain();
    this.pflGainA.gain.setValueAtTime(0.0, ctx.currentTime);
    this.pflGainB.gain.setValueAtTime(0.0, ctx.currentTime);
    this.deckA.eqHigh.connect(this.pflGainA);
    this.deckB.eqHigh.connect(this.pflGainB);
    this.pflGainA.connect(this.masterGain);
    this.pflGainB.connect(this.masterGain);

    // Pre-synthesize default audio buffers, punchy sampler drops, drum kit, percussion groove, and builds
    await this.generateSampleDrops(ctx);
    await this.generateDrumKit(ctx);
    await this.generatePercussionKit(ctx);
    await this.generateBuildsKit(ctx);

    this.isInitialized = true;
    this.startTrackingLoop();
  }

  private createDeckNodes(ctx: AudioContext): DeckAudioNodes {
    const eqLow = ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.setValueAtTime(250, ctx.currentTime);
    eqLow.gain.setValueAtTime(0, ctx.currentTime);

    const eqMid = ctx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.setValueAtTime(1000, ctx.currentTime);
    eqMid.Q.setValueAtTime(1.0, ctx.currentTime);
    eqMid.gain.setValueAtTime(0, ctx.currentTime);

    const eqHigh = ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.setValueAtTime(4000, ctx.currentTime);
    eqHigh.gain.setValueAtTime(0, ctx.currentTime);

    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.85, ctx.currentTime);

    const cueGainNode = ctx.createGain();
    cueGainNode.gain.setValueAtTime(1.0, ctx.currentTime);

    return {
      sourceNode: null,
      audioBuffer: null,
      currentTrack: null,
      eqLow,
      eqMid,
      eqHigh,
      gainNode,
      cueGainNode,
      startTime: 0,
      pauseOffset: 0,
      isPlaying: false,
      bpm: 126,
      pitchRate: 1.0,
      basePitchRate: 1.0,
      isBraking: false,
      isRollActive: false,
      rollSavedOffset: 0,
      rollSavedTime: 0,
      isKeyLock: true,
      isSlipMode: false,
      slipBackgroundStartTime: 0,
    };
  }

  private initFxSystem(ctx: AudioContext): void {
    this.fxInputNode = ctx.createGain();
    this.fxInputNode.gain.setValueAtTime(0.0, ctx.currentTime);

    this.fxOutputNode = ctx.createGain();
    this.fxOutputNode.gain.setValueAtTime(0.0, ctx.currentTime);

    // 1. Resonant Low-Pass Filter
    this.fxFilterLpNode = ctx.createBiquadFilter();
    this.fxFilterLpNode.type = 'lowpass';
    this.fxFilterLpNode.frequency.setValueAtTime(20000, ctx.currentTime);
    this.fxFilterLpNode.Q.setValueAtTime(1.0, ctx.currentTime);
    this.fxFilterLpWetGain = ctx.createGain();
    this.fxFilterLpWetGain.gain.setValueAtTime(0.0, ctx.currentTime);
    this.fxFilterLpNode.connect(this.fxFilterLpWetGain);
    this.fxFilterLpWetGain.connect(this.fxOutputNode);

    // 2. Resonant High-Pass Filter
    this.fxFilterHpNode = ctx.createBiquadFilter();
    this.fxFilterHpNode.type = 'highpass';
    this.fxFilterHpNode.frequency.setValueAtTime(20, ctx.currentTime);
    this.fxFilterHpNode.Q.setValueAtTime(1.0, ctx.currentTime);
    this.fxFilterHpWetGain = ctx.createGain();
    this.fxFilterHpWetGain.gain.setValueAtTime(0.0, ctx.currentTime);
    this.fxFilterHpNode.connect(this.fxFilterHpWetGain);
    this.fxFilterHpWetGain.connect(this.fxOutputNode);

    // 3. Dub Tape Echo (Isolated, warm 3200Hz damper + 220Hz highpass, clean rhythmic repeats)
    this.fxDelayNode = ctx.createDelay(1.5);
    this.fxDelayNode.delayTime.setValueAtTime(0.25, ctx.currentTime);
    this.fxDelayDamperFilter = ctx.createBiquadFilter();
    this.fxDelayDamperFilter.type = 'lowpass';
    this.fxDelayDamperFilter.frequency.setValueAtTime(3200, ctx.currentTime);
    this.fxDelayHighPassFilter = ctx.createBiquadFilter();
    this.fxDelayHighPassFilter.type = 'highpass';
    this.fxDelayHighPassFilter.frequency.setValueAtTime(220, ctx.currentTime);
    this.fxDelayFeedbackGain = ctx.createGain();
    this.fxDelayFeedbackGain.gain.setValueAtTime(0.25, ctx.currentTime);
    this.fxDelayWetGain = ctx.createGain();
    this.fxDelayWetGain.gain.setValueAtTime(0.0, ctx.currentTime);

    // Delay loop: Input -> DelayNode -> Highpass -> DamperFilter -> FeedbackGain -> DelayNode
    this.fxDelayNode.connect(this.fxDelayHighPassFilter);
    this.fxDelayHighPassFilter.connect(this.fxDelayDamperFilter);
    this.fxDelayDamperFilter.connect(this.fxDelayFeedbackGain);
    this.fxDelayFeedbackGain.connect(this.fxDelayNode);
    this.fxDelayDamperFilter.connect(this.fxDelayWetGain);
    this.fxDelayWetGain.connect(this.fxOutputNode);

    // 4. Spiral Ping-Pong Delay (True 3D stereo bouncing echoes with left/right pan)
    this.fxSpiralDelayL = ctx.createDelay(1.5);
    this.fxSpiralDelayL.delayTime.setValueAtTime(0.24, ctx.currentTime);
    this.fxSpiralDelayR = ctx.createDelay(1.5);
    this.fxSpiralDelayR.delayTime.setValueAtTime(0.36, ctx.currentTime);
    this.fxSpiralPannerL = ctx.createStereoPanner();
    this.fxSpiralPannerL.pan.setValueAtTime(-0.80, ctx.currentTime);
    this.fxSpiralPannerR = ctx.createStereoPanner();
    this.fxSpiralPannerR.pan.setValueAtTime(0.80, ctx.currentTime);
    this.fxSpiralDamperFilter = ctx.createBiquadFilter();
    this.fxSpiralDamperFilter.type = 'lowpass';
    this.fxSpiralDamperFilter.frequency.setValueAtTime(3600, ctx.currentTime);
    this.fxSpiralHighPassFilter = ctx.createBiquadFilter();
    this.fxSpiralHighPassFilter.type = 'highpass';
    this.fxSpiralHighPassFilter.frequency.setValueAtTime(240, ctx.currentTime);
    this.fxSpiralFeedbackGain = ctx.createGain();
    this.fxSpiralFeedbackGain.gain.setValueAtTime(0.25, ctx.currentTime);
    this.fxSpiralWetGain = ctx.createGain();
    this.fxSpiralWetGain.gain.setValueAtTime(0.0, ctx.currentTime);

    // Ping-pong cross loop: L connects to R and Pan L; R connects to Pan R and Feedback -> Highpass -> L
    this.fxSpiralDelayL.connect(this.fxSpiralPannerL);
    this.fxSpiralDelayL.connect(this.fxSpiralDelayR);
    this.fxSpiralDelayR.connect(this.fxSpiralPannerR);
    this.fxSpiralDelayR.connect(this.fxSpiralFeedbackGain);
    this.fxSpiralFeedbackGain.connect(this.fxSpiralHighPassFilter);
    this.fxSpiralHighPassFilter.connect(this.fxSpiralDelayL);
    this.fxSpiralPannerL.connect(this.fxSpiralDamperFilter);
    this.fxSpiralPannerR.connect(this.fxSpiralDamperFilter);
    this.fxSpiralDamperFilter.connect(this.fxSpiralWetGain);
    this.fxSpiralWetGain.connect(this.fxOutputNode);

    // 5. Studio Reverb Space
    this.fxReverbPreFilter = ctx.createBiquadFilter();
    this.fxReverbPreFilter.type = 'lowpass';
    this.fxReverbPreFilter.frequency.setValueAtTime(3600, ctx.currentTime);
    this.fxReverbConvolver = ctx.createConvolver();
    this.fxReverbConvolver.buffer = this.createImpulseResponse(ctx, 1.8, 2.4);
    this.fxReverbWetGain = ctx.createGain();
    this.fxReverbWetGain.gain.setValueAtTime(0.0, ctx.currentTime);

    this.fxReverbPreFilter.connect(this.fxReverbConvolver);
    this.fxReverbConvolver.connect(this.fxReverbWetGain);
    this.fxReverbWetGain.connect(this.fxOutputNode);

    // 6. Stereo Chorus & Dimension (Roland Dimension D Style - True Stereo Spatial Widening, No phase hollow, Kick preserved)
    this.fxChorusHighPassFilter = ctx.createBiquadFilter();
    this.fxChorusHighPassFilter.type = 'highpass';
    this.fxChorusHighPassFilter.frequency.setValueAtTime(280, ctx.currentTime);

    this.fxChorusDelayL = ctx.createDelay(0.08);
    this.fxChorusDelayL.delayTime.setValueAtTime(0.015, ctx.currentTime);
    this.fxChorusDelayR = ctx.createDelay(0.08);
    this.fxChorusDelayR.delayTime.setValueAtTime(0.019, ctx.currentTime);

    this.fxChorusPannerL = ctx.createStereoPanner();
    this.fxChorusPannerL.pan.setValueAtTime(-0.85, ctx.currentTime);
    this.fxChorusPannerR = ctx.createStereoPanner();
    this.fxChorusPannerR.pan.setValueAtTime(0.85, ctx.currentTime);

    this.fxChorusLfoL = ctx.createOscillator();
    this.fxChorusLfoL.type = 'sine';
    this.fxChorusLfoL.frequency.setValueAtTime(0.5, ctx.currentTime);

    this.fxChorusLfoR = ctx.createOscillator();
    this.fxChorusLfoR.type = 'sine';
    this.fxChorusLfoR.frequency.setValueAtTime(0.7, ctx.currentTime);

    this.fxChorusLfoGainL = ctx.createGain();
    this.fxChorusLfoGainL.gain.setValueAtTime(0.0010, ctx.currentTime);
    this.fxChorusLfoGainR = ctx.createGain();
    this.fxChorusLfoGainR.gain.setValueAtTime(0.0010, ctx.currentTime);

    this.fxChorusLfoL.connect(this.fxChorusLfoGainL);
    this.fxChorusLfoGainL.connect(this.fxChorusDelayL.delayTime);
    this.fxChorusLfoR.connect(this.fxChorusLfoGainR);
    this.fxChorusLfoGainR.connect(this.fxChorusDelayR.delayTime);
    this.fxChorusLfoL.start();
    this.fxChorusLfoR.start();

    this.fxChorusWetGain = ctx.createGain();
    this.fxChorusWetGain.gain.setValueAtTime(0.0, ctx.currentTime);

    this.fxChorusHighPassFilter.connect(this.fxChorusDelayL);
    this.fxChorusHighPassFilter.connect(this.fxChorusDelayR);
    this.fxChorusDelayL.connect(this.fxChorusPannerL);
    this.fxChorusDelayR.connect(this.fxChorusPannerR);
    this.fxChorusPannerL.connect(this.fxChorusWetGain);
    this.fxChorusPannerR.connect(this.fxChorusWetGain);
    this.fxChorusWetGain.connect(this.fxOutputNode);

    // 7. Harmonic Pitch Shift Gain
    this.fxPitchShiftWetGain = ctx.createGain();
    this.fxPitchShiftWetGain.gain.setValueAtTime(0.0, ctx.currentTime);
    this.fxPitchShiftWetGain.connect(this.fxOutputNode);

    // Connect Input ONLY to individual processors
    this.fxInputNode.connect(this.fxFilterLpNode);
    this.fxInputNode.connect(this.fxFilterHpNode);
    this.fxInputNode.connect(this.fxDelayNode);
    this.fxInputNode.connect(this.fxSpiralDelayL);
    this.fxInputNode.connect(this.fxReverbPreFilter);
    this.fxInputNode.connect(this.fxChorusHighPassFilter);
    this.fxInputNode.connect(this.fxPitchShiftWetGain);
  }

  private createDistortionCurve(amount: number = 10): Float32Array {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      // Soft saturation arctangent curve to prevent harsh clipping
      curve[i] = (Math.atan(x * amount) / Math.atan(amount)) * 0.9;
    }
    return curve;
  }

  private createImpulseResponse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = rate * duration;
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    // Normalized diffuse exponential decay (safe amplitude, no clipping)
    let sumSquares = 0;
    for (let i = 0; i < length; i++) {
      const n = length - i;
      const factor = Math.pow(n / length, decay);
      // High frequency damping: progressively smooth noise
      const valL = (Math.random() * 2 - 1) * factor;
      const valR = (Math.random() * 2 - 1) * factor;
      left[i] = valL;
      right[i] = valR;
      sumSquares += valL * valL + valR * valR;
    }

    // Energy normalization factor to ensure safe wet levels
    const rms = Math.sqrt(sumSquares / (length * 2));
    const targetRms = 0.08;
    const scale = rms > 0 ? targetRms / rms : 1;
    for (let i = 0; i < length; i++) {
      left[i] *= scale;
      right[i] *= scale;
    }

    return impulse;
  }

  // Pre-generate rich musical drum & bass loops for demo tracks
  public async getTrackBuffer(track: Track): Promise<AudioBuffer> {
    if (this.trackBufferCache.has(track.id)) {
      return this.trackBufferCache.get(track.id)!;
    }

    const ctx = this.getAudioContext();
    const sampleRate = ctx.sampleRate;
    const bpm = track.bpm || 128;
    const secondsPerBeat = 60 / bpm;
    const totalBeats = 32;
    const totalDuration = totalBeats * secondsPerBeat;
    const totalSamples = Math.floor(sampleRate * totalDuration);

    const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const genre = (track.genre || 'House').toLowerCase();
    for (let beat = 0; beat < totalBeats; beat++) {
      const beatStartTime = beat * secondsPerBeat;
      const beatStartSample = Math.floor(beatStartTime * sampleRate);

      const isKick =
        genre.includes('drum & bass')
          ? beat % 8 === 0 || beat % 8 === 5
          : genre.includes('hip-hop')
          ? beat % 4 === 0 || (beat % 4 === 2 && beat % 8 === 6)
          : beat % 1 === 0;

      if (isKick) {
        const kickDuration = 0.28;
        const kickSamples = Math.floor(kickDuration * sampleRate);
        for (let i = 0; i < kickSamples && beatStartSample + i < totalSamples; i++) {
          const t = i / sampleRate;
          const freq = 45 + 95 * Math.exp(-t * 22);
          const env = Math.exp(-t * 14);
          const sampleVal = Math.sin(2 * Math.PI * freq * t) * env * 0.75;
          left[beatStartSample + i] += sampleVal;
          right[beatStartSample + i] += sampleVal;
        }
      }

      const isSnare =
        genre.includes('drum & bass')
          ? beat % 8 === 2 || beat % 8 === 6
          : genre.includes('hip-hop')
          ? beat % 4 === 2
          : beat % 2 === 1;

      if (isSnare) {
        const snareDuration = 0.2;
        const snareSamples = Math.floor(snareDuration * sampleRate);
        for (let i = 0; i < snareSamples && beatStartSample + i < totalSamples; i++) {
          const t = i / sampleRate;
          const noise = (Math.random() * 2 - 1) * Math.exp(-t * 24);
          const tone = Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 18) * 0.4;
          const snareVal = (noise * 0.4 + tone) * 0.6;
          left[beatStartSample + i] += snareVal * 0.95;
          right[beatStartSample + i] += snareVal * 1.05;
        }
      }

      // Offbeat Hi-Hat
      const halfBeatSample = beatStartSample + Math.floor(0.5 * secondsPerBeat * sampleRate);
      const hatDuration = 0.08;
      const hatSamples = Math.floor(hatDuration * sampleRate);
      for (let i = 0; i < hatSamples && halfBeatSample + i < totalSamples; i++) {
        const t = i / sampleRate;
        const hatVal = (Math.random() * 2 - 1) * Math.exp(-t * 45) * 0.28;
        left[halfBeatSample + i] += hatVal * 0.8;
        right[halfBeatSample + i] += hatVal * 1.2;
      }

      // 16th groove shaker
      for (let s = 0; s < 4; s++) {
        const sixteenthSample =
          beatStartSample + Math.floor(s * 0.25 * secondsPerBeat * sampleRate);
        const shkSamples = Math.floor(0.03 * sampleRate);
        for (let i = 0; i < shkSamples && sixteenthSample + i < totalSamples; i++) {
          const t = i / sampleRate;
          const shk = (Math.random() * 2 - 1) * Math.exp(-t * 70) * 0.08;
          left[sixteenthSample + i] += shk;
          right[sixteenthSample + i] += shk;
        }
      }
    }

    // Melodic Bassline
    const rootFreq = genre.includes('techno') ? 55 : genre.includes('drum & bass') ? 43.65 : 65.4;
    const bassNoteOffsets = [0, 0, 3, 5, 7, 5, 3, 2];
    for (let bar = 0; bar < totalBeats / 4; bar++) {
      for (let b = 0; b < 4; b++) {
        const noteIdx = (bar * 4 + b) % bassNoteOffsets.length;
        const semitone = bassNoteOffsets[noteIdx];
        const freq = rootFreq * Math.pow(2, semitone / 12);
        const bassStartSample = Math.floor((bar * 4 + b) * secondsPerBeat * sampleRate);
        const bassDuration = secondsPerBeat * 0.85;
        const bassSamples = Math.floor(bassDuration * sampleRate);

        for (let i = 0; i < bassSamples && bassStartSample + i < totalSamples; i++) {
          const t = i / sampleRate;
          const bassEnv = Math.sin((Math.PI * i) / bassSamples) * 0.35;
          const harmonic1 = Math.sin(2 * Math.PI * freq * t);
          const harmonic2 = Math.sin(2 * Math.PI * freq * 2 * t) * 0.45;
          const harmonic3 = Math.sin(2 * Math.PI * freq * 3 * t) * 0.2;
          const bassVal = (harmonic1 + harmonic2 + harmonic3) * bassEnv;

          left[bassStartSample + i] += bassVal;
          right[bassStartSample + i] += bassVal;
        }
      }
    }

    // Normalize
    let maxAmp = 0;
    for (let i = 0; i < totalSamples; i++) {
      maxAmp = Math.max(maxAmp, Math.abs(left[i]), Math.abs(right[i]));
    }
    if (maxAmp > 0.95) {
      const scale = 0.92 / maxAmp;
      for (let i = 0; i < totalSamples; i++) {
        left[i] *= scale;
        right[i] *= scale;
      }
    }

    this.trackBufferCache.set(track.id, buffer);
    return buffer;
  }

  // Generate punchy studio-grade audio drops for Sampler & Performance Pads
  private async generateSampleDrops(ctx: AudioContext): Promise<void> {
    const rate = ctx.sampleRate;

    // 1. High-Power Club Airhorn (Rich 6-tone brass fanfare with vibrato)
    {
      const duration = 0.85;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      const chordFreqs = [466.16, 554.37, 622.25, 698.46, 932.33, 1108.7];
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        let sumL = 0;
        let sumR = 0;
        chordFreqs.forEach((f, idx) => {
          const detuneL = 1 + 0.004 * (idx % 2 === 0 ? 1 : -1);
          const detuneR = 1 + 0.004 * (idx % 2 === 0 ? -1 : 1);
          const vibrato = 1 + 0.04 * Math.sin(2 * Math.PI * 28 * t);
          const waveL = Math.sin(2 * Math.PI * f * detuneL * vibrato * t);
          const waveR = Math.sin(2 * Math.PI * f * detuneR * vibrato * t);
          sumL += waveL;
          sumR += waveR;
        });
        const attack = Math.min(1, t * 120);
        const decay = Math.pow(1 - t / duration, 1.4);
        const env = attack * decay * 0.26;
        left[i] = sumL * env;
        right[i] = sumR * env;
      }
      this.samplerBuffers.set('airhorn', buffer);
    }

    // 2. Realistic Vinyl Scratch ("Wiki-Wiki-Wah")
    {
      const duration = 0.58;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        let pitch: number;
        let strokeEnv: number;
        if (t < 0.25) {
          const st = t / 0.25;
          pitch = 280 + 1400 * Math.sin(st * Math.PI * 0.5);
          strokeEnv = Math.sin(st * Math.PI);
        } else {
          const st = (t - 0.25) / 0.33;
          pitch = 1600 * Math.cos(st * Math.PI * 0.5) + 180;
          strokeEnv = Math.sin(st * Math.PI);
        }
        const vinylHiss = (Math.random() * 2 - 1) * 0.16;
        const tone = Math.sin(2 * Math.PI * pitch * t);
        const val = (tone + vinylHiss) * strokeEnv * 0.75;
        left[i] = val;
        right[i] = val * 0.95;
      }
      this.samplerBuffers.set('scratch', buffer);
    }

    // 3. Monster 808 Sub Drop (Click transient diving into saturated 36Hz sub)
    {
      const duration = 1.35;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const freq = 36 + 130 * Math.exp(-t * 9);
        const subEnv = Math.exp(-t * 2.2);
        const raw = Math.sin(2 * Math.PI * freq * t);
        const saturated = Math.tanh(raw * 1.5) * subEnv * 0.8;
        left[i] = saturated;
        right[i] = saturated;
      }
      this.samplerBuffers.set('subdrop', buffer);
    }

    // 4. Sci-Fi EDM Laser Riser / Zap
    {
      const duration = 0.65;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const baseFreq = 2600 * Math.exp(-t * 8) + 120;
        const fmMod = 250 * Math.sin(2 * Math.PI * 40 * t);
        const env = Math.exp(-t * 4.5);
        const val = Math.sin(2 * Math.PI * (baseFreq + fmMod) * t) * env * 0.7;
        left[i] = val;
        right[i] = val;
      }
      this.samplerBuffers.set('laser', buffer);
    }

    // 5. Soundclash Reggae Siren
    {
      const duration = 1.1;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 5.5 * t);
        const freq = 600 + 750 * lfo;
        const env = Math.min(1, t * 50) * (1 - t / duration) * 0.65;
        const val = Math.sin(2 * Math.PI * freq * t) * env;
        left[i] = val;
        right[i] = val;
      }
      this.samplerBuffers.set('siren', buffer);
    }

    // 6. Club Vocal Drop ("DROP THE BEAT!")
    {
      const duration = 0.75;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const f1 = 300 + 80 * Math.sin(2 * Math.PI * 12 * t);
        const f2 = 880;
        const f3 = 1800;
        const formants =
          Math.sin(2 * Math.PI * f1 * t) * 0.6 +
          Math.sin(2 * Math.PI * f2 * t) * 0.4 +
          Math.sin(2 * Math.PI * f3 * t) * 0.2;
        const env = Math.min(1, t * 90) * Math.exp(-t * 3.8);
        const val = Math.tanh(formants * 1.6) * env * 0.6;
        left[i] = val;
        right[i] = val;
      }
      this.samplerBuffers.set('vocal', buffer);
    }
  }

  // Synthesize responsive punchy drum kit for Desktop 5 (Drum Mode)
  private async generateDrumKit(ctx: AudioContext): Promise<void> {
    const rate = ctx.sampleRate;

    // Kick Drum (909 Punch)
    {
      const duration = 0.32;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const freq = 46 + 125 * Math.exp(-t * 26);
        const env = Math.exp(-t * 12);
        const sample = Math.sin(2 * Math.PI * freq * t) * env * 0.85;
        left[i] = sample;
        right[i] = sample;
      }
      this.samplerBuffers.set('drum_kick', buffer);
    }

    // Snare Drum (Body + Noise snap)
    {
      const duration = 0.24;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const tone = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 22) * 0.45;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 18) * 0.5;
        const sample = tone + noise;
        left[i] = sample;
        right[i] = sample;
      }
      this.samplerBuffers.set('drum_snare', buffer);
    }

    // Hand Clap (Layered stereo bursts)
    {
      const duration = 0.28;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        let burst = 0;
        if (t < 0.012) burst = Math.exp(-t * 200);
        else if (t < 0.024) burst = Math.exp(-(t - 0.012) * 200);
        else if (t < 0.036) burst = Math.exp(-(t - 0.024) * 200);
        else burst = Math.exp(-(t - 0.036) * 16);
        const noise = (Math.random() * 2 - 1) * burst * 0.7;
        left[i] = noise * 1.05;
        right[i] = noise * 0.95;
      }
      this.samplerBuffers.set('drum_clap', buffer);
    }

    // Closed Hi-Hat (Crisp metallic click)
    {
      const duration = 0.07;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 60) * 0.4;
        left[i] = noise;
        right[i] = noise;
      }
      this.samplerBuffers.set('drum_closed_hat', buffer);
    }

    // Open Hi-Hat (Sustained metallic sizzle)
    {
      const duration = 0.42;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 9) * 0.35;
        left[i] = noise * 1.1;
        right[i] = noise * 0.9;
      }
      this.samplerBuffers.set('drum_open_hat', buffer);
    }

    // Percussion Tom
    {
      const duration = 0.35;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const freq = 65 + 110 * Math.exp(-t * 14);
        const sample = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 8) * 0.75;
        left[i] = sample;
        right[i] = sample;
      }
      this.samplerBuffers.set('drum_tom', buffer);
    }

    // Rimshot
    {
      const duration = 0.05;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const sample = Math.sin(2 * Math.PI * 450 * t) * Math.exp(-t * 90) * 0.8;
        left[i] = sample;
        right[i] = sample;
      }
      this.samplerBuffers.set('drum_rimshot', buffer);
    }

    // Crash Cymbal
    {
      const duration = 1.4;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 3.5) * 0.4;
        left[i] = noise * 1.1;
        right[i] = noise * 0.9;
      }
      this.samplerBuffers.set('drum_crash', buffer);
    }
  }

  // Synthesize Universal Percussion Groove Kit (Usable over ANY song to give rhythm!)
  private async generatePercussionKit(ctx: AudioContext): Promise<void> {
    const rate = ctx.sampleRate;

    // 1. Shaker 16th (Crisp metallic swing burst)
    {
      const duration = 0.12;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        // Two quick back-and-forth passes
        const env = Math.sin((t / duration) * Math.PI) * Math.exp(-t * 28);
        const noise = (Math.random() * 2 - 1) * env * 0.55;
        left[i] = noise * 1.1;
        right[i] = noise * 0.9;
      }
      this.samplerBuffers.set('perc_shaker', buffer);
    }

    // 2. Tambourine (Bright acoustic jingles)
    {
      const duration = 0.22;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const jingle =
          Math.sin(2 * Math.PI * 6200 * t) * 0.3 +
          Math.sin(2 * Math.PI * 9400 * t) * 0.4 +
          (Math.random() * 2 - 1) * 0.3;
        const env = Math.exp(-t * 18);
        const sample = jingle * env * 0.5;
        left[i] = sample * 0.95;
        right[i] = sample * 1.05;
      }
      this.samplerBuffers.set('perc_tambourine', buffer);
    }

    // 3. Conga High (Melodic acoustic slap)
    {
      const duration = 0.22;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const pitch = 330 + 120 * Math.exp(-t * 50);
        const tone = Math.sin(2 * Math.PI * pitch * t);
        const skinSnap = (Math.random() * 2 - 1) * Math.exp(-t * 80) * 0.4;
        const env = Math.exp(-t * 16);
        const sample = (tone + skinSnap) * env * 0.75;
        left[i] = sample;
        right[i] = sample;
      }
      this.samplerBuffers.set('perc_conga_high', buffer);
    }

    // 4. Conga Low (Warm open tone)
    {
      const duration = 0.32;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const pitch = 175 + 40 * Math.exp(-t * 30);
        const tone = Math.sin(2 * Math.PI * pitch * t) + 0.3 * Math.sin(2 * Math.PI * pitch * 2 * t);
        const env = Math.exp(-t * 9);
        const sample = tone * env * 0.8;
        left[i] = sample;
        right[i] = sample;
      }
      this.samplerBuffers.set('perc_conga_low', buffer);
    }

    // 5. Bongo Accent (Punchy Latin top)
    {
      const duration = 0.18;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const pitch = 460 + 80 * Math.exp(-t * 60);
        const tone = Math.sin(2 * Math.PI * pitch * t);
        const env = Math.exp(-t * 24);
        const sample = tone * env * 0.75;
        left[i] = sample;
        right[i] = sample;
      }
      this.samplerBuffers.set('perc_bongo', buffer);
    }

    // 6. Wooden Clave (High-cut rosewood click)
    {
      const duration = 0.08;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const tone = Math.sin(2 * Math.PI * 2250 * t);
        const env = Math.exp(-t * 65);
        const sample = tone * env * 0.8;
        left[i] = sample;
        right[i] = sample;
      }
      this.samplerBuffers.set('perc_clave', buffer);
    }

    // 7. 808 Cowbell (Dual-harmonic classic)
    {
      const duration = 0.28;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const tone =
          Math.sin(2 * Math.PI * 587 * t) * 0.6 + Math.sin(2 * Math.PI * 845 * t) * 0.5;
        const env = Math.exp(-t * 14);
        const sample = Math.tanh(tone * 1.5) * env * 0.65;
        left[i] = sample;
        right[i] = sample;
      }
      this.samplerBuffers.set('perc_cowbell', buffer);
    }

    // 8. Snare Triplet Fill (Instant bridge fill)
    {
      const duration = 0.38;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      const hitTimes = [0, 0.11, 0.22];
      hitTimes.forEach((hitT, idx) => {
        const startSample = Math.floor(hitT * rate);
        const hitSamples = Math.floor(0.12 * rate);
        for (let i = 0; i < hitSamples && startSample + i < buffer.length; i++) {
          const t = i / rate;
          const tone = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 28) * 0.4;
          const noise = (Math.random() * 2 - 1) * Math.exp(-t * 22) * 0.5;
          const val = (tone + noise) * (0.6 + idx * 0.2); // Crescendo
          left[startSample + i] += val * 0.9;
          right[startSample + i] += val * 0.9;
        }
      });
      this.samplerBuffers.set('perc_snare_fill', buffer);
    }
  }

  // Synthesize Transitions, Builds & Fills Kit (Exciting live energy)
  private async generateBuildsKit(ctx: AudioContext): Promise<void> {
    const rate = ctx.sampleRate;

    // 1. Snare Roll Build (1-bar accelerating riser)
    {
      const duration = 1.6;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      const numHits = 16;
      for (let h = 0; h < numHits; h++) {
        // Accelerating curve: hits get closer together
        const hitT = Math.pow(h / numHits, 1.6) * (duration - 0.1);
        const startSample = Math.floor(hitT * rate);
        const hitLen = Math.floor(0.08 * rate);
        const hitVol = 0.3 + (h / numHits) * 0.6; // Progressive riser
        for (let i = 0; i < hitLen && startSample + i < buffer.length; i++) {
          const t = i / rate;
          const noise = (Math.random() * 2 - 1) * Math.exp(-t * 30);
          const tone = Math.sin(2 * Math.PI * (180 + h * 8) * t) * Math.exp(-t * 25) * 0.4;
          const val = (noise + tone) * hitVol * 0.7;
          left[startSample + i] += val;
          right[startSample + i] += val;
        }
      }
      this.samplerBuffers.set('build_snare_riser', buffer);
    }

    // 2. White Noise Sweep Riser
    {
      const duration = 1.8;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const progress = t / duration;
        // Resonant frequency sweeps up from 300Hz to 12kHz
        const centerFreq = 300 * Math.pow(12000 / 300, progress);
        const env = Math.pow(progress, 1.2) * 0.6;
        const noise = Math.random() * 2 - 1;
        const resonance = Math.sin(2 * Math.PI * centerFreq * t) * 0.4;
        const sample = (noise * 0.6 + resonance) * env;
        left[i] = sample;
        right[i] = sample * 0.95;
      }
      this.samplerBuffers.set('build_noise_sweep', buffer);
    }

    // 3. Downlifter / Bass Impact
    {
      const duration = 1.2;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const freq = 140 * Math.exp(-t * 5) + 38;
        const env = Math.exp(-t * 2.8);
        const boom = Math.sin(2 * Math.PI * freq * t) * env;
        const hiss = (Math.random() * 2 - 1) * Math.exp(-t * 8) * 0.2;
        const sample = (boom + hiss) * 0.75;
        left[i] = sample;
        right[i] = sample;
      }
      this.samplerBuffers.set('build_downlifter', buffer);
    }

    // 4. Reverse Crash Swell
    {
      const duration = 1.4;
      const buffer = ctx.createBuffer(2, Math.floor(rate * duration), rate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < buffer.length; i++) {
        const t = i / rate;
        const progress = t / duration;
        const env = Math.pow(progress, 2.5) * 0.7;
        const noise = (Math.random() * 2 - 1) * env;
        left[i] = noise * 1.1;
        right[i] = noise * 0.9;
      }
      this.samplerBuffers.set('build_rev_crash', buffer);
    }
  }

  // Universal File to ArrayBuffer reader compatible with all mobile and desktop browsers
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      // First try standard FileReader which is 100% reliable on all Android/iOS/Desktop browsers
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Formato buffer non valido'));
        }
      };
      reader.onerror = () => {
        // Fallback to file.arrayBuffer() if available
        if (typeof file.arrayBuffer === 'function') {
          file.arrayBuffer().then(resolve).catch(reject);
        } else {
          reject(reader.error || new Error('Impossibile leggere il file dal disco'));
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Load custom audio file from device storage with universal MP3, M4A, AAC, WAV, FLAC, OGG decoding
  public async loadCustomAudioFile(file: File): Promise<{ buffer: AudioBuffer; duration: number; bpm: number }> {
    // Ensure audio context exists and attempt resume non-blockingly
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const rawArrayBuffer = await this.readFileAsArrayBuffer(file);

    let audioBuffer: AudioBuffer | null = null;

    // Strategy 1: Standard async Promise ctx.decodeAudioData
    try {
      audioBuffer = await ctx.decodeAudioData(rawArrayBuffer.slice(0));
    } catch {
      audioBuffer = null;
    }

    // Strategy 2: OfflineAudioContext (completely independent of user-gesture/hardware audio context state)
    if (!audioBuffer) {
      try {
        const OfflineContextClass =
          window.OfflineAudioContext ||
          (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
        if (OfflineContextClass) {
          const offlineCtx = new OfflineContextClass(2, 44100 * 2, 44100);
          audioBuffer = await offlineCtx.decodeAudioData(rawArrayBuffer.slice(0));
        }
      } catch {
        audioBuffer = null;
      }
    }

    // Strategy 3: Legacy Callback-based decodeAudioData for older mobile engines
    if (!audioBuffer) {
      try {
        audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
          ctx.decodeAudioData(
            rawArrayBuffer.slice(0),
            (decoded) => resolve(decoded),
            (err) => reject(err || new Error('Decode error'))
          );
        });
      } catch {
        audioBuffer = null;
      }
    }

    // Strategy 4: OfflineAudioContext at 48000Hz (native hardware sample rate on many Android devices)
    if (!audioBuffer) {
      try {
        const OfflineContextClass =
          window.OfflineAudioContext ||
          (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
        if (OfflineContextClass) {
          const offlineCtx = new OfflineContextClass(2, 48000 * 2, 48000);
          audioBuffer = await offlineCtx.decodeAudioData(rawArrayBuffer.slice(0));
        }
      } catch {
        audioBuffer = null;
      }
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Impossibile decodificare il file audio. Assicurati che sia un file audio valido.');
    }

    // Detect approximate BPM from transients or fallback to 128
    let detectedBpm = 128;
    try {
      detectedBpm = this.estimateBpmFromBuffer(audioBuffer);
    } catch {
      detectedBpm = 128;
    }

    return {
      buffer: audioBuffer,
      duration: Math.round(audioBuffer.duration) || 120,
      bpm: detectedBpm || 128,
    };
  }

  // Fast BPM estimator from energy peaks
  private estimateBpmFromBuffer(buffer: AudioBuffer): number {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    // Inspect first 30 seconds
    const maxSamples = Math.min(channelData.length, sampleRate * 30);
    const step = Math.floor(sampleRate / 100); // 10ms intervals
    const energy: number[] = [];
    
    for (let i = 0; i < maxSamples; i += step) {
      let sum = 0;
      for (let j = 0; j < step && i + j < maxSamples; j++) {
        sum += Math.abs(channelData[i + j]);
      }
      energy.push(sum / step);
    }

    // Peak thresholding
    let avgEnergy = energy.reduce((a, b) => a + b, 0) / (energy.length || 1);
    let peakIndices: number[] = [];
    for (let i = 1; i < energy.length - 1; i++) {
      if (energy[i] > avgEnergy * 1.5 && energy[i] > energy[i - 1] && energy[i] > energy[i + 1]) {
        peakIndices.push(i);
      }
    }

    if (peakIndices.length >= 4) {
      const intervals: number[] = [];
      for (let i = 1; i < peakIndices.length; i++) {
        const intervalSec = (peakIndices[i] - peakIndices[i - 1]) * 0.01;
        if (intervalSec > 0.3 && intervalSec < 1.0) {
          intervals.push(intervalSec);
        }
      }
      if (intervals.length > 0) {
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        let bpm = Math.round(60 / avgInterval);
        while (bpm < 85) bpm *= 2;
        while (bpm > 175) bpm = Math.round(bpm / 2);
        return bpm;
      }
    }
    return 128;
  }

  public registerCustomTrackBuffer(trackId: string, buffer: AudioBuffer) {
    this.trackBufferCache.set(trackId, buffer);
  }

  public registerCustomSampleBuffer(key: string, buffer: AudioBuffer) {
    this.customSampleBuffers.set(key, buffer);
  }

  // Play / Pause / Cue controls
  public async playDeck(deckId: DeckId, track: Track, startOffset?: number): Promise<void> {
    await this.init();
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    const deck = deckId === 'A' ? this.deckA : this.deckB;

    if (deck.isPlaying) return;

    deck.currentTrack = track;
    deck.bpm = track.bpm || 128;

    if (!deck.audioBuffer || deck.audioBuffer !== this.trackBufferCache.get(track.id)) {
      deck.audioBuffer = await this.getTrackBuffer(track);
    }

    const source = ctx.createBufferSource();
    source.buffer = deck.audioBuffer;
    source.loop = true;
    source.playbackRate.setValueAtTime(deck.pitchRate, ctx.currentTime);

    source.connect(deck.eqLow);

    const offset =
      startOffset !== undefined
        ? startOffset
        : deck.pauseOffset % (deck.audioBuffer?.duration || 1);
    source.start(0, offset);

    deck.sourceNode = source;
    deck.startTime = ctx.currentTime - offset / deck.pitchRate;
    deck.isPlaying = true;
  }

  public pauseDeck(deckId: DeckId): void {
    const ctx = this.getAudioContext();
    const deck = deckId === 'A' ? this.deckA : this.deckB;

    if (!deck.isPlaying || !deck.sourceNode) return;

    const currentOffset = (ctx.currentTime - deck.startTime) * deck.pitchRate;
    deck.pauseOffset = currentOffset % (deck.audioBuffer?.duration || 1);

    try {
      deck.sourceNode.stop();
      deck.sourceNode.disconnect();
    } catch {
      // Ignored
    }
    deck.sourceNode = null;
    deck.isPlaying = false;
  }

  public seekDeck(deckId: DeckId, track: Track, seconds: number, shouldPlay: boolean): void {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    const isCurrentlyPlaying = deck.isPlaying;

    if (deck.sourceNode) {
      try {
        deck.sourceNode.stop();
        deck.sourceNode.disconnect();
      } catch {
        // Ignored
      }
      deck.sourceNode = null;
      deck.isPlaying = false;
    }

    deck.pauseOffset = Math.max(0, seconds);

    if (shouldPlay || isCurrentlyPlaying) {
      this.playDeck(deckId, track, deck.pauseOffset);
    }
  }

  public setPitchRate(deckId: DeckId, rate: number): void {
    const ctx = this.getAudioContext();
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    deck.pitchRate = rate;
    deck.basePitchRate = rate;
    if (deck.sourceNode) {
      deck.sourceNode.playbackRate.setTargetAtTime(rate, ctx.currentTime, 0.015);
    }
  }

  public setDeckVolume(deckId: DeckId, volume: number): void {
    const ctx = this.getAudioContext();
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    deck.gainNode.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), ctx.currentTime, 0.015);
  }

  public setCrossfader(val: number): void {
    const ctx = this.getAudioContext();
    const norm = (val + 1) / 2; // 0 (left) to 1 (right)
    const gainA = Math.cos(norm * 0.5 * Math.PI);
    const gainB = Math.sin(norm * 0.5 * Math.PI);

    this.crossfaderGainA.gain.setTargetAtTime(gainA, ctx.currentTime, 0.015);
    this.crossfaderGainB.gain.setTargetAtTime(gainB, ctx.currentTime, 0.015);

    // Filter Fade: automatically rolls off low frequencies of outgoing track
    if (this.isFilterFade) {
      if (val > 0.05) {
        // Fading to B: cut lows on Deck A
        this.deckA.eqLow.gain.setTargetAtTime(-val * 24, ctx.currentTime, 0.02);
        this.deckB.eqLow.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      } else if (val < -0.05) {
        // Fading to A: cut lows on Deck B
        this.deckB.eqLow.gain.setTargetAtTime(val * 24, ctx.currentTime, 0.02);
        this.deckA.eqLow.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      } else {
        this.deckA.eqLow.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
        this.deckB.eqLow.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      }
    }
  }

  // 3-Band EQ & Kill Buttons
  public setEq(deckId: DeckId, band: 'low' | 'mid' | 'high', dB: number, isKill: boolean): void {
    const ctx = this.getAudioContext();
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    const filter = band === 'low' ? deck.eqLow : band === 'mid' ? deck.eqMid : deck.eqHigh;

    const targetGain = isKill ? -70 : Math.max(-24, Math.min(6, dB));
    filter.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.015);
  }

  // JUMP BEATS (Quick 1-bar / 4-bar phrase jump)
  public beatJump(deckId: DeckId, beats: number): void {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck.audioBuffer || !deck.currentTrack) return;
    const secondsPerBeat = 60 / Math.max(40, deck.bpm);
    const deltaSeconds = beats * secondsPerBeat;
    const currentPos = this.getDeckCurrentTime(deckId);
    const newPos = (currentPos + deltaSeconds + deck.audioBuffer.duration) % deck.audioBuffer.duration;
    this.seekDeck(deckId, deck.currentTrack, newPos, deck.isPlaying);
  }

  public getDeckCurrentTime(deckId: DeckId): number {
    const ctx = this.getAudioContext();
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck.audioBuffer) return 0;
    if (!deck.isPlaying) return deck.pauseOffset;
    const elapsed = (ctx.currentTime - deck.startTime) * deck.pitchRate;
    return elapsed % deck.audioBuffer.duration;
  }

  // SLIP-MODE BEAT ROLL for Performance Pads (Non-stopping, seamless loop and catchup)
  public triggerBeatRoll(deckId: DeckId, beats: number, active: boolean): void {
    const ctx = this.getAudioContext();
    const deck = deckId === 'A' ? this.deckA : this.deckB;

    if (!deck.isPlaying || !deck.audioBuffer || !deck.currentTrack) return;

    if (active && !deck.isRollActive) {
      // 1. Save real-time position to catch up when released
      const elapsed = (ctx.currentTime - deck.startTime) * deck.pitchRate;
      deck.rollSavedOffset = elapsed % deck.audioBuffer.duration;
      deck.rollSavedTime = ctx.currentTime;
      deck.isRollActive = true;

      // Calculate roll loop duration based on deck BPM
      const secondsPerBeat = 60 / Math.max(40, deck.bpm);
      const rollDuration = Math.max(0.02, beats * secondsPerBeat);

      // Stop normal playback source and start dedicated instant roll loop
      if (deck.sourceNode) {
        try {
          deck.sourceNode.stop();
          deck.sourceNode.disconnect();
        } catch {
          // Ignored
        }
        deck.sourceNode = null;
      }

      const rollSource = ctx.createBufferSource();
      rollSource.buffer = deck.audioBuffer;
      rollSource.loop = true;
      rollSource.loopStart = deck.rollSavedOffset;
      rollSource.loopEnd = Math.min(
        deck.audioBuffer.duration,
        deck.rollSavedOffset + rollDuration
      );
      rollSource.playbackRate.setValueAtTime(deck.pitchRate, ctx.currentTime);
      rollSource.connect(deck.eqLow);
      rollSource.start(0, deck.rollSavedOffset);

      deck.sourceNode = rollSource;
    } else if (!active && deck.isRollActive) {
      // 2. Release roll: calculate slip position and seamlessly resume track!
      deck.isRollActive = false;
      const rollElapsed = (ctx.currentTime - deck.rollSavedTime) * deck.pitchRate;
      const catchUpOffset =
        (deck.rollSavedOffset + rollElapsed) % (deck.audioBuffer.duration || 1);

      if (deck.sourceNode) {
        try {
          deck.sourceNode.stop();
          deck.sourceNode.disconnect();
        } catch {
          // Ignored
        }
        deck.sourceNode = null;
      }

      deck.isPlaying = false;
      this.playDeck(deckId, deck.currentTrack, catchUpOffset);
    }
  }

  // Restore turntable motor speed after Vinyl Brake
  public restoreDeckPitch(deckId: DeckId): void {
    const ctx = this.getAudioContext();
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    const normalRate = deck.basePitchRate || 1.0;
    deck.pitchRate = normalRate;
    deck.isBraking = false;
    if (deck.sourceNode) {
      deck.sourceNode.playbackRate.cancelScheduledValues(ctx.currentTime);
      deck.sourceNode.playbackRate.setTargetAtTime(normalRate, ctx.currentTime, 0.08);
    }
    // Slip Mode: seamless real-time catch-up
    if (deck.isSlipMode && deck.isPlaying && deck.audioBuffer) {
      const elapsed = (ctx.currentTime - deck.slipBackgroundStartTime) * normalRate;
      const catchUp = (deck.rollSavedOffset + elapsed) % (deck.audioBuffer.duration || 1);
      this.seekDeck(deckId, deck.currentTrack, catchUp, true);
    }
  }

  public resetVinylBrake(): void {
    this.restoreDeckPitch('A');
    this.restoreDeckPitch('B');
  }

  // FX Engine Control (XY Pad)
  public updateFx(type: FXType, target: FXTarget, x: number, y: number, active: boolean): void {
    const ctx = this.getAudioContext();
    if (!this.isInitialized) return;

    // When inactive, restore full dry signal and silence all wet sends
    if (!active) {
      this.deckA_dry.gain.setTargetAtTime(1.0, ctx.currentTime, 0.02);
      this.deckB_dry.gain.setTargetAtTime(1.0, ctx.currentTime, 0.02);
      this.deckA_fxSend.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);
      this.deckB_fxSend.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);
      this.fxOutputNode.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);
      this.fxInputNode.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);

      // Reset individual wet nodes
      this.fxFilterLpWetGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);
      this.fxFilterHpWetGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);
      this.fxDelayWetGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);
      this.fxSpiralWetGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);
      this.fxReverbWetGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);
      this.fxChorusWetGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);
      this.fxPitchShiftWetGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);
      this.fxFilterLpNode.frequency.setTargetAtTime(20000, ctx.currentTime, 0.02);
      this.fxFilterHpNode.frequency.setTargetAtTime(20, ctx.currentTime, 0.02);

      // Restore pitch if Vinyl Brake or Pitch Shift was active!
      if (this.deckA.isBraking) {
        this.restoreDeckPitch('A');
      }
      if (this.deckB.isBraking) {
        this.restoreDeckPitch('B');
      }
      return;
    }

    const clampedX = Math.max(0.001, Math.min(0.999, x));
    const clampedY = Math.max(0.001, Math.min(0.999, y));

    // Wet intensity (0 to 1)
    const wetLevel = clampedY;

    // Route matrix based on effect type:
    // Low-Pass filter requires true insert crossfade to prevent comb filtering / sub doubling
    const dryDamp = type === 'filter' ? 1.0 - wetLevel * 0.96 : 1.0 - wetLevel * 0.50;

    if (target === 'A') {
      this.deckA_dry.gain.setTargetAtTime(dryDamp, ctx.currentTime, 0.015);
      this.deckA_fxSend.gain.setTargetAtTime(1.0, ctx.currentTime, 0.015);
      this.deckB_dry.gain.setTargetAtTime(1.0, ctx.currentTime, 0.015);
      this.deckB_fxSend.gain.setTargetAtTime(0.0, ctx.currentTime, 0.015);
    } else if (target === 'B') {
      this.deckB_dry.gain.setTargetAtTime(dryDamp, ctx.currentTime, 0.015);
      this.deckB_fxSend.gain.setTargetAtTime(1.0, ctx.currentTime, 0.015);
      this.deckA_dry.gain.setTargetAtTime(1.0, ctx.currentTime, 0.015);
      this.deckA_fxSend.gain.setTargetAtTime(0.0, ctx.currentTime, 0.015);
    } else {
      // Master
      this.deckA_dry.gain.setTargetAtTime(dryDamp, ctx.currentTime, 0.015);
      this.deckA_fxSend.gain.setTargetAtTime(1.0, ctx.currentTime, 0.015);
      this.deckB_dry.gain.setTargetAtTime(dryDamp, ctx.currentTime, 0.015);
      this.deckB_fxSend.gain.setTargetAtTime(1.0, ctx.currentTime, 0.015);
    }
    this.fxInputNode.gain.setTargetAtTime(1.0, ctx.currentTime, 0.015);
    this.fxOutputNode.gain.setTargetAtTime(1.0, ctx.currentTime, 0.015);

    // Mute ONLY inactive effects with smooth transition (NEVER click with setValueAtTime)
    if (type !== 'filter') this.fxFilterLpWetGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);
    if (type !== 'filter_hp') this.fxFilterHpWetGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);
    if (type !== 'echo') this.fxDelayWetGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);
    if (type !== 'spiral') this.fxSpiralWetGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);
    if (type !== 'reverb') this.fxReverbWetGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);
    if (type !== 'chorus') this.fxChorusWetGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);
    if (type !== 'pitch_shift') this.fxPitchShiftWetGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.02);

    // Exponential frequency calculation for filters
    const expFreqLp = 40 * Math.pow(20000 / 40, clampedX);
    const expFreqHp = 20 * Math.pow(12000 / 20, clampedX);
    const resonanceQ = 0.707 + clampedY * 6.5;

    switch (type) {
      case 'filter': {
        // Resonant Low-Pass Filter: silky smooth sweep from 20kHz down to 40Hz with automatic Q gain compensation
        const resonanceQLp = 0.707 + clampedY * 2.0; // Warm musical range: 0.707 to 2.7
        const qComp = 1.0 / (1.0 + (resonanceQLp - 0.707) * 0.20);
        this.fxFilterLpNode.frequency.setTargetAtTime(expFreqLp, ctx.currentTime, 0.015);
        this.fxFilterLpNode.Q.setTargetAtTime(resonanceQLp, ctx.currentTime, 0.015);
        this.fxFilterLpWetGain.gain.setTargetAtTime(wetLevel * qComp, ctx.currentTime, 0.015);
        break;
      }

      case 'filter_hp': {
        // Resonant High-Pass Filter (Clean buildup) - DO NOT TOUCH (PERFECT)
        this.fxFilterHpNode.frequency.setTargetAtTime(expFreqHp, ctx.currentTime, 0.015);
        this.fxFilterHpNode.Q.setTargetAtTime(resonanceQ, ctx.currentTime, 0.015);
        this.fxFilterHpWetGain.gain.setTargetAtTime(1.0, ctx.currentTime, 0.015);
        break;
      }

      case 'echo': {
        // Beat-Synchronized Dub Echo: tempo-locked divisions, zero Doppler zipper noise
        const activeBpm = (target === 'B' ? this.deckB.bpm : this.deckA.bpm) || 126;
        const beatSec = 60 / activeBpm;
        let targetDelay = beatSec * 0.5;
        if (clampedX < 0.28) {
          targetDelay = beatSec * 0.25; // 1/4 beat
        } else if (clampedX < 0.60) {
          targetDelay = beatSec * 0.50; // 1/2 beat
        } else if (clampedX < 0.82) {
          targetDelay = beatSec * 0.75; // 3/4 beat
        } else {
          targetDelay = beatSec * 1.00; // 1 beat
        }
        const delayFeedback = 0.12 + clampedY * 0.35; // Safe max 0.47, zero distortion
        this.fxDelayNode.delayTime.setTargetAtTime(targetDelay, ctx.currentTime, 0.06);
        this.fxDelayFeedbackGain.gain.setTargetAtTime(delayFeedback, ctx.currentTime, 0.015);
        this.fxDelayWetGain.gain.setTargetAtTime(0.65 * wetLevel, ctx.currentTime, 0.015);
        break;
      }

      case 'spiral': {
        // Beat-Synchronized Stereo Ping-Pong Delay: clean rhythmic bounce between Left and Right
        const activeBpm = (target === 'B' ? this.deckB.bpm : this.deckA.bpm) || 126;
        const beatSec = 60 / activeBpm;
        let delayL = beatSec * 0.50;
        let delayR = beatSec * 0.75;
        if (clampedX < 0.35) {
          delayL = beatSec * 0.25;
          delayR = beatSec * 0.50;
        } else if (clampedX < 0.70) {
          delayL = beatSec * 0.50;
          delayR = beatSec * 0.75;
        } else {
          delayL = beatSec * 0.50;
          delayR = beatSec * 1.00;
        }
        const spiralFeedback = 0.12 + clampedY * 0.30; // Safe max 0.42
        this.fxSpiralDelayL.delayTime.setTargetAtTime(delayL, ctx.currentTime, 0.06);
        this.fxSpiralDelayR.delayTime.setTargetAtTime(delayR, ctx.currentTime, 0.06);
        this.fxSpiralFeedbackGain.gain.setTargetAtTime(spiralFeedback, ctx.currentTime, 0.015);
        this.fxSpiralWetGain.gain.setTargetAtTime(0.60 * wetLevel, ctx.currentTime, 0.015);
        break;
      }

      case 'reverb': {
        // Lush Normalized Club Space Reverb - DO NOT TOUCH (PERFECT)
        this.fxReverbWetGain.gain.setTargetAtTime(clampedY * 0.60, ctx.currentTime, 0.015);
        break;
      }

      case 'chorus': {
        // Roland Dimension D Style Stereo Widener: crystal club dimension, preserved kick punch
        const rate = 0.35 + clampedX * 0.65; // 0.35Hz to 1.0Hz silky modulation
        const depth = 0.0006 + clampedY * 0.0008; // 0.6ms to 1.4ms subtle widening
        this.fxChorusLfoL.frequency.setTargetAtTime(rate, ctx.currentTime, 0.015);
        this.fxChorusLfoR.frequency.setTargetAtTime(rate * 1.25, ctx.currentTime, 0.015);
        this.fxChorusLfoGainL.gain.setTargetAtTime(depth, ctx.currentTime, 0.015);
        this.fxChorusLfoGainR.gain.setTargetAtTime(depth, ctx.currentTime, 0.015);
        this.fxChorusWetGain.gain.setTargetAtTime(0.48 * wetLevel, ctx.currentTime, 0.015);
        break;
      }

      case 'pitch_shift': {
        // Harmonic Pitch Shift: -12 to +12 semitones - DO NOT TOUCH (PERFECT)
        const semitones = Math.round((clampedX - 0.5) * 24);
        const pitchMultiplier = Math.pow(2, semitones / 12);
        this.deckA.isBraking = true;
        this.deckB.isBraking = true;

        if (target === 'A' || target === 'master') {
          if (this.deckA.sourceNode) {
            const baseRateA = this.deckA.basePitchRate || 1.0;
            this.deckA.sourceNode.playbackRate.setTargetAtTime(baseRateA * pitchMultiplier, ctx.currentTime, 0.02);
          }
        }
        if (target === 'B' || target === 'master') {
          if (this.deckB.sourceNode) {
            const baseRateB = this.deckB.basePitchRate || 1.0;
            this.deckB.sourceNode.playbackRate.setTargetAtTime(baseRateB * pitchMultiplier, ctx.currentTime, 0.02);
          }
        }
        break;
      }

      case 'vinyl_brake': {
        // Turntable Motor Brake (Simulated platter slowdown) - DO NOT TOUCH (PERFECT)
        if (!this.deckA.isBraking) {
          this.deckA.slipBackgroundStartTime = ctx.currentTime;
          this.deckA.rollSavedOffset = this.getDeckCurrentTime('A');
        }
        if (!this.deckB.isBraking) {
          this.deckB.slipBackgroundStartTime = ctx.currentTime;
          this.deckB.rollSavedOffset = this.getDeckCurrentTime('B');
        }
        this.deckA.isBraking = true;
        this.deckB.isBraking = true;
        const baseRateA = this.deckA.basePitchRate || 1.0;
        const baseRateB = this.deckB.basePitchRate || 1.0;
        const brakePitchA = Math.max(0.04, (1.0 - clampedY * 0.96) * baseRateA);
        const brakePitchB = Math.max(0.04, (1.0 - clampedY * 0.96) * baseRateB);

        this.deckA.pitchRate = brakePitchA;
        this.deckB.pitchRate = brakePitchB;

        if (this.deckA.sourceNode) {
          this.deckA.sourceNode.playbackRate.setTargetAtTime(brakePitchA, ctx.currentTime, 0.03);
        }
        if (this.deckB.sourceNode) {
          this.deckB.sourceNode.playbackRate.setTargetAtTime(brakePitchB, ctx.currentTime, 0.03);
        }
        break;
      }
    }
  }

  // Pitch Bend / Nudge (Temporary +3.5% / -3.5% speed jog nudge)
  public nudgeDeck(deckId: DeckId, direction: 'forward' | 'backward', isHeld: boolean): void {
    const ctx = this.getAudioContext();
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck.sourceNode) return;

    if (isHeld) {
      const nudgeFactor = direction === 'forward' ? 1.045 : 0.955;
      const nudgedRate = deck.pitchRate * nudgeFactor;
      deck.sourceNode.playbackRate.setTargetAtTime(nudgedRate, ctx.currentTime, 0.02);
    } else {
      deck.sourceNode.playbackRate.setTargetAtTime(deck.pitchRate, ctx.currentTime, 0.05);
    }
  }

  // Quantize Control
  public setQuantize(enabled: boolean): void {
    this.isQuantize = enabled;
  }

  public isQuantizeEnabled(): boolean {
    return this.isQuantize;
  }

  public quantizeTime(deckId: DeckId, time: number): number {
    if (!this.isQuantize) return time;
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    const secondsPerBeat = 60 / Math.max(40, deck.bpm * deck.pitchRate);
    const snapGrid = secondsPerBeat * 0.25; // 1/4 beat snap
    return Math.max(0, Math.round(time / snapGrid) * snapGrid);
  }

  // Filter Fade Transition Mode (Crossfader Auto-EQ / Low-Cut)
  public setFilterFade(enabled: boolean): void {
    this.isFilterFade = enabled;
    if (!enabled && this.ctx) {
      this.deckA.eqLow.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      this.deckB.eqLow.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    }
  }

  public isFilterFadeEnabled(): boolean {
    return this.isFilterFade;
  }

  // Key Lock (Master Tempo) Control
  public setKeyLock(deckId: DeckId, enabled: boolean): void {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    deck.isKeyLock = enabled;
  }

  public isKeyLockEnabled(deckId: DeckId): boolean {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    return deck.isKeyLock;
  }

  // Slip Mode Control
  public setSlipMode(deckId: DeckId, enabled: boolean): void {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    deck.isSlipMode = enabled;
  }

  public isSlipModeEnabled(deckId: DeckId): boolean {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    return deck.isSlipMode;
  }

  // Smooth Auto-Crossfade (Automix Transition)
  public startAutoCrossfade(
    currentValue: number,
    onProgress: (val: number) => void,
    onComplete?: () => void,
    durationMs: number = 3200
  ): void {
    this.stopAutoCrossfade();
    // Transition towards opposite side: if on A side (< 0), go to B (1.0), otherwise to A (-1.0)
    const targetVal = currentValue < 0 ? 1.0 : -1.0;
    const startVal = currentValue;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // Equal-power sinusoidal curve for professional club transition
      const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);
      const current = startVal + (targetVal - startVal) * ease;

      this.setCrossfader(current);
      onProgress(current);

      if (progress < 1) {
        this.autoMixAnimId = requestAnimationFrame(step);
      } else {
        this.autoMixAnimId = null;
        if (onComplete) onComplete();
      }
    };

    this.autoMixAnimId = requestAnimationFrame(step);
  }

  public stopAutoCrossfade(): void {
    if (this.autoMixAnimId !== null) {
      cancelAnimationFrame(this.autoMixAnimId);
      this.autoMixAnimId = null;
    }
  }

  public isAutoCrossfading(): boolean {
    return this.autoMixAnimId !== null;
  }

  // Master Mix Live Recording
  public startRecording(onStateChange?: (state: { isRecording: boolean; duration: number }) => void): boolean {
    if (this.isRecording) return false;
    const ctx = this.getAudioContext();
    if (!this.recorderDestination) {
      this.recorderDestination = ctx.createMediaStreamDestination();
      if (this.masterLimiter) {
        this.masterLimiter.connect(this.recorderDestination);
      }
    }

    try {
      const stream = this.recorderDestination.stream;
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        ''
      ];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (!mime || (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime))) {
          selectedMime = mime;
          break;
        }
      }

      this.mediaRecorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);

      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(250);
      this.isRecording = true;
      this.recordStartTime = Date.now();
      this.onRecordStateChange = onStateChange;

      if (this.recordIntervalId !== null) clearInterval(this.recordIntervalId);
      this.recordIntervalId = window.setInterval(() => {
        if (this.isRecording && this.onRecordStateChange) {
          const duration = Math.floor((Date.now() - this.recordStartTime) / 1000);
          this.onRecordStateChange({ isRecording: true, duration });
        }
      }, 500);

      if (this.onRecordStateChange) {
        this.onRecordStateChange({ isRecording: true, duration: 0 });
      }
      return true;
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      return false;
    }
  }

  public stopRecording(): Promise<{ blob: Blob; url: string; duration: number } | null> {
    return new Promise((resolve) => {
      if (!this.isRecording || !this.mediaRecorder) {
        resolve(null);
        return;
      }

      if (this.recordIntervalId !== null) {
        clearInterval(this.recordIntervalId);
        this.recordIntervalId = null;
      }

      const totalDuration = Math.floor((Date.now() - this.recordStartTime) / 1000);
      this.isRecording = false;

      if (this.onRecordStateChange) {
        this.onRecordStateChange({ isRecording: false, duration: totalDuration });
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        resolve({ blob, url, duration: totalDuration });
      };

      try {
        this.mediaRecorder.stop();
      } catch {
        resolve(null);
      }
    });
  }

  public downloadRecording(blob: Blob, filename?: string): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const ext = blob.type.includes('ogg') ? 'ogg' : 'webm';
    const name = filename || `DJ_Set_${timestamp}.${ext}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
  }

  public isMixRecording(): boolean {
    return this.isRecording;
  }

  // Pre-listen (Headphone PFL CUE)
  public setPfl(deckId: DeckId, active: boolean): void {
    const ctx = this.getAudioContext();
    if (deckId === 'A') {
      this.pflActiveA = active;
      if (this.pflGainA) {
        this.pflGainA.gain.setTargetAtTime(active ? 0.75 : 0.0, ctx.currentTime, 0.02);
      }
    } else {
      this.pflActiveB = active;
      if (this.pflGainB) {
        this.pflGainB.gain.setTargetAtTime(active ? 0.75 : 0.0, ctx.currentTime, 0.02);
      }
    }
  }

  public isPflActive(deckId: DeckId): boolean {
    return deckId === 'A' ? this.pflActiveA : this.pflActiveB;
  }

  // Play Sample from Buffer
  public playSample(type: string, semitoneOffset: number = 0, volume: number = 0.9): void {
    const ctx = this.getAudioContext();
    const buffer = this.samplerBuffers.get(type) || this.customSampleBuffers.get(type);
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    if (semitoneOffset !== 0) {
      source.playbackRate.setValueAtTime(Math.pow(2, semitoneOffset / 12), ctx.currentTime);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.min(1.0, volume), ctx.currentTime);
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  // Live Master Audio Level Meter for dynamic VU Meter UI
  public getMasterAudioLevel(): { level: number; peak: number } {
    if (!this.analyserNode) return { level: 0, peak: 0 };
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(data);

    let sum = 0;
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const val = (data[i] - 128) / 128;
      sum += val * val;
      peak = Math.max(peak, Math.abs(val));
    }
    const rms = Math.sqrt(sum / data.length);
    return {
      level: Math.min(1, rms * 3.2),
      peak: Math.min(1, peak),
    };
  }

  // Time & Position Loop Tracker
  public setTimeUpdateListener(cb: (deck: DeckId, currentTime: number) => void): void {
    this.onTimeUpdate = cb;
  }

  private startTrackingLoop(): void {
    const update = () => {
      if (this.ctx && this.onTimeUpdate) {
        if (this.deckA.isPlaying && this.deckA.audioBuffer && !this.deckA.isRollActive) {
          const elapsed = (this.ctx.currentTime - this.deckA.startTime) * this.deckA.pitchRate;
          const pos = elapsed % this.deckA.audioBuffer.duration;
          this.onTimeUpdate('A', pos);
        }
        if (this.deckB.isPlaying && this.deckB.audioBuffer && !this.deckB.isRollActive) {
          const elapsed = (this.ctx.currentTime - this.deckB.startTime) * this.deckB.pitchRate;
          const pos = elapsed % this.deckB.audioBuffer.duration;
          this.onTimeUpdate('B', pos);
        }
      }
      this.animFrameId = requestAnimationFrame(update);
    };
    this.animFrameId = requestAnimationFrame(update);
  }

  public cleanup(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audioEngine = new DjAudioEngine();
