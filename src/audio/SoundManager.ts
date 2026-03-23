import * as Tone from 'tone';

/**
 * Procedural chiptune sound effects and music manager using Tone.js.
 * All sounds are generated programmatically -- no audio files needed.
 *
 * Call `init()` on the first user interaction to satisfy the browser
 * AudioContext autoplay policy, then use the play* methods freely.
 */
class SoundManager {
  private started = false;

  // Shared synths (created lazily after AudioContext is running)
  private synth: Tone.Synth | null = null;
  private noiseSynth: Tone.NoiseSynth | null = null;
  private membraneSynth: Tone.MembraneSynth | null = null;

  // Fight BGM synths
  private bgmLeadSynth: Tone.Synth | null = null;
  private bgmBassSynth: Tone.Synth | null = null;
  private bgmDrumKick: Tone.MembraneSynth | null = null;
  private bgmDrumSnare: Tone.NoiseSynth | null = null;
  private bgmSnareFilter: Tone.Filter | null = null;
  private bgmHiHat: Tone.NoiseSynth | null = null;
  private bgmHiHatFilter: Tone.Filter | null = null;
  private bgmPadSynth: Tone.PolySynth | null = null;
  private bgmArpSynth: Tone.Synth | null = null;

  // Fight BGM sequences
  private bgmSeqLead: Tone.Sequence | null = null;
  private bgmSeqBass: Tone.Sequence | null = null;
  private bgmSeqDrumKick: Tone.Sequence | null = null;
  private bgmSeqDrumSnare: Tone.Sequence | null = null;
  private bgmSeqHiHat: Tone.Sequence | null = null;
  private bgmSeqPad: Tone.Sequence | null = null;
  private bgmSeqArp: Tone.Sequence | null = null;
  private bgmPlaying = false;

  // Menu BGM synths and sequences
  private menuLeadSynth: Tone.Synth | null = null;
  private menuBassSynth: Tone.Synth | null = null;
  private menuPadSynth: Tone.PolySynth | null = null;
  private menuSeqLead: Tone.Sequence | null = null;
  private menuSeqBass: Tone.Sequence | null = null;
  private menuSeqPad: Tone.Sequence | null = null;
  private menuPlaying = false;

  /**
   * Must be called from a user-gesture handler (click / keydown).
   * Safe to call multiple times -- only the first call does work.
   */
  async init(): Promise<void> {
    if (this.started) return;
    try {
      await Tone.start();
      this.started = true;
      this.createSynths();
    } catch {
      // Audio failed to start -- game continues silently
      console.warn('SoundManager: Tone.js failed to start');
    }
  }

  private createSynths(): void {
    // General-purpose square-wave synth for chiptune bleeps
    this.synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0,
        release: 0.05,
      },
      volume: -10,
    }).toDestination();

    // Noise synth for percussive effects
    this.noiseSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.06,
        sustain: 0,
        release: 0.01,
      },
      volume: -8,
    }).toDestination();

    // Membrane synth for bassy / thuddy impacts
    this.membraneSynth = new Tone.MembraneSynth({
      pitchDecay: 0.02,
      octaves: 6,
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.03,
      },
      volume: -8,
    }).toDestination();
  }

  // ---------- public sound effects ----------

  /** Punchy impact sound when a punch/kick connects. */
  playHit(): void {
    if (!this.started) return;
    try {
      const now = Tone.now();

      // Layer 1: Noise burst for the crunch/impact
      this.noiseSynth?.triggerAttackRelease('32n', now);

      // Layer 2: Low membrane hit for the "thud" body
      this.membraneSynth?.triggerAttackRelease('G1', '32n', now);

      // Layer 3: Quick pitch-bent square wave for the "thwack"
      const thwack = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: {
          attack: 0.001,
          decay: 0.06,
          sustain: 0,
          release: 0.02,
        },
        volume: -12,
      }).toDestination();

      thwack.frequency.setValueAtTime(800, now);
      thwack.frequency.exponentialRampToValueAtTime(200, now + 0.05);
      thwack.triggerAttackRelease('32n', now);

      setTimeout(() => thwack.dispose(), 200);
    } catch {
      // ignore
    }
  }

  /** Metallic shield deflection sound when an attack is blocked. */
  playBlock(): void {
    if (!this.started) return;
    try {
      const now = Tone.now();

      // Layer 1: Filtered noise burst (higher, shorter) for metallic "ting"
      const blockNoise = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: {
          attack: 0.001,
          decay: 0.04,
          sustain: 0,
          release: 0.02,
        },
        volume: -14,
      }).toDestination();
      blockNoise.triggerAttackRelease('64n', now);

      // Layer 2: High-pitched triangle ping for the "clink"
      const clink = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: {
          attack: 0.001,
          decay: 0.08,
          sustain: 0,
          release: 0.04,
        },
        volume: -12,
      }).toDestination();
      clink.triggerAttackRelease('E6', '64n', now);

      // Layer 3: Quick descending square blip for the deflection feel
      const deflect = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: {
          attack: 0.001,
          decay: 0.05,
          sustain: 0,
          release: 0.02,
        },
        volume: -16,
      }).toDestination();
      deflect.frequency.setValueAtTime(1200, now);
      deflect.frequency.exponentialRampToValueAtTime(600, now + 0.04);
      deflect.triggerAttackRelease('64n', now);

      setTimeout(() => {
        blockNoise.dispose();
        clink.dispose();
        deflect.dispose();
      }, 300);
    } catch {
      // ignore
    }
  }

  /** Short low thud when a fighter lands on the ground. */
  playLand(): void {
    if (!this.started) return;
    try {
      const now = Tone.now();
      const land = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 4,
        envelope: {
          attack: 0.001,
          decay: 0.05,
          sustain: 0,
          release: 0.02,
        },
        volume: -20,
      }).toDestination();

      land.triggerAttackRelease('C2', '32n', now);
      setTimeout(() => land.dispose(), 200);
    } catch {
      // ignore
    }
  }

  /** Quiet whoosh for a missed attack. */
  playWhiff(): void {
    if (!this.started) return;
    try {
      const now = Tone.now();
      const filter = new Tone.Filter({
        type: 'bandpass',
        frequency: 1200,
        Q: 0.8,
      }).toDestination();

      const whiff = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: {
          attack: 0.01,
          decay: 0.12,
          sustain: 0,
          release: 0.05,
        },
        volume: -28,
      }).connect(filter);

      filter.frequency.linearRampTo(400, 0.12, now);
      whiff.triggerAttackRelease('16n', now);

      setTimeout(() => {
        whiff.dispose();
        filter.dispose();
      }, 300);
    } catch {
      // ignore
    }
  }

  /** Upward pitch sweep when a fighter jumps. */
  playJump(): void {
    if (!this.started) return;
    try {
      const now = Tone.now();
      const osc = new Tone.Oscillator({
        type: 'triangle',
        frequency: 200,
        volume: -12,
      }).toDestination();

      osc.frequency.linearRampTo(600, 0.1, now);
      osc.start(now).stop(now + 0.1);
      setTimeout(() => osc.dispose(), 200);
    } catch {
      // ignore
    }
  }

  /** Dramatic descending tone when a fighter is KO'd. */
  playKO(): void {
    if (!this.started) return;
    try {
      const now = Tone.now();

      // Descending sawtooth sweep
      const osc = new Tone.Oscillator({
        type: 'sawtooth',
        frequency: 800,
        volume: -8,
      }).toDestination();

      osc.frequency.exponentialRampTo(60, 0.8, now);

      const gain = new Tone.Gain(1).toDestination();
      osc.disconnect();
      osc.connect(gain);
      gain.gain.linearRampTo(0, 0.9, now);

      osc.start(now).stop(now + 0.9);
      setTimeout(() => {
        osc.dispose();
        gain.dispose();
      }, 1500);
    } catch {
      // ignore
    }
  }

  /** Ascending arpeggio for "FIGHT!" announcement. */
  playRoundStart(): void {
    if (!this.started) return;
    try {
      const now = Tone.now();
      const notes = ['C5', 'E5', 'G5', 'C6'];
      const noteLen = 0.08;

      const arpSynth = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: {
          attack: 0.005,
          decay: 0.08,
          sustain: 0.2,
          release: 0.1,
        },
        volume: -8,
      }).toDestination();

      notes.forEach((note, i) => {
        arpSynth.triggerAttackRelease(note, '16n', now + i * noteLen);
      });

      // Clean up after arpeggio finishes
      setTimeout(() => {
        arpSynth.dispose();
      }, 1500);
    } catch {
      // ignore
    }
  }

  /** Short beep for character selection cursor movement. */
  playSelect(): void {
    if (!this.started) return;
    try {
      this.synth?.triggerAttackRelease('A5', '64n');
    } catch {
      // ignore
    }
  }

  /** Positive chord for character selection confirm. */
  playConfirm(): void {
    if (!this.started) return;
    try {
      const now = Tone.now();

      const confirmSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square' },
        envelope: {
          attack: 0.005,
          decay: 0.2,
          sustain: 0,
          release: 0.1,
        },
        volume: -10,
      }).toDestination();

      confirmSynth.triggerAttackRelease(['C5', 'E5', 'G5'], '8n', now);

      setTimeout(() => {
        confirmSynth.dispose();
      }, 1000);
    } catch {
      // ignore
    }
  }

  /** Sound for pressing Enter on the start screen. */
  playMenuSelect(): void {
    if (!this.started) return;
    try {
      const now = Tone.now();

      const menuSynth = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: {
          attack: 0.005,
          decay: 0.1,
          sustain: 0.1,
          release: 0.1,
        },
        volume: -8,
      }).toDestination();

      // Two quick ascending notes
      menuSynth.triggerAttackRelease('E5', '32n', now);
      menuSynth.triggerAttackRelease('A5', '16n', now + 0.08);

      setTimeout(() => {
        menuSynth.dispose();
      }, 1000);
    } catch {
      // ignore
    }
  }

  // ---------- Fight Background Music ----------

  /** Start looping chiptune fight BGM with full instrumentation at ~140 BPM. */
  playBGM(): void {
    if (!this.started || this.bgmPlaying) return;
    try {
      // Stop menu music if playing
      this.stopMenuBGM();

      const transport = Tone.getTransport();
      transport.bpm.value = 140;

      // --- Lead melody synth (square wave, retro feel) ---
      this.bgmLeadSynth = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 },
        volume: -20,
      }).toDestination();

      // --- Bass synth (triangle wave for NES bass) ---
      this.bgmBassSynth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0.4, release: 0.1 },
        volume: -22,
      }).toDestination();

      // --- Kick drum (punchy membrane) ---
      this.bgmDrumKick = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 6,
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
        volume: -24,
      }).toDestination();

      // --- Snare drum (high-pass filtered noise) ---
      this.bgmSnareFilter = new Tone.Filter({
        type: 'highpass',
        frequency: 2000,
      }).toDestination();
      this.bgmDrumSnare = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.03 },
        volume: -26,
      }).connect(this.bgmSnareFilter);

      // --- Hi-hat (very short high-pass filtered noise) ---
      this.bgmHiHatFilter = new Tone.Filter({
        type: 'highpass',
        frequency: 6000,
      }).toDestination();
      this.bgmHiHat = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 },
        volume: -32,
      }).connect(this.bgmHiHatFilter);

      // --- Pad synth (warm sustained chords) ---
      this.bgmPadSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.3, decay: 0.3, sustain: 0.5, release: 0.5 },
        volume: -28,
      }).toDestination();

      // --- Arpeggio synth (shimmering high triangle wave) ---
      this.bgmArpSynth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.06, sustain: 0.05, release: 0.05 },
        volume: -30,
      }).toDestination();

      // ========== Patterns ==========

      // Lead melody: 4 bars (32 eighth notes), energetic fighting game riff
      const leadNotes: Array<string | null> = [
        // Bar 1
        'C5', 'C5', 'E5', 'G5', 'A5', null, 'G5', 'E5',
        // Bar 2
        'F5', 'F5', 'A5', 'C6', 'B5', null, 'A5', 'G5',
        // Bar 3
        'C5', 'E5', 'G5', 'C6', 'B5', 'A5', 'G5', null,
        // Bar 4
        'F5', 'A5', 'G5', 'E5', 'D5', 'E5', 'C5', null,
      ];

      // Bass line: root notes following chord progression
      const bassNotes: Array<string | null> = [
        // Bar 1 (C → C)
        'C3', null, 'C3', null, 'C3', null, 'C3', null,
        // Bar 2 (F → G)
        'F3', null, 'F3', null, 'G3', null, 'G3', null,
        // Bar 3 (C → Am)
        'C3', null, 'C3', null, 'A2', null, 'A2', null,
        // Bar 4 (F → G)
        'F3', null, 'F3', null, 'G3', null, 'G3', null,
      ];

      // Kick: beats 1 and 3, with syncopation in bar 4
      const kickPattern: Array<number | null> = [
        // Bar 1
        1, null, null, null, 1, null, null, null,
        // Bar 2
        1, null, null, null, 1, null, null, null,
        // Bar 3
        1, null, null, null, 1, null, null, null,
        // Bar 4 (extra kick on &3 for energy)
        1, null, null, null, 1, null, 1, null,
      ];

      // Snare: beats 2 and 4, with fill in bar 4
      const snarePattern: Array<number | null> = [
        // Bar 1
        null, null, 1, null, null, null, 1, null,
        // Bar 2
        null, null, 1, null, null, null, 1, null,
        // Bar 3
        null, null, 1, null, null, null, 1, null,
        // Bar 4 (fill: snare flam on beat 4)
        null, null, 1, null, null, null, 1, 1,
      ];

      // Hi-hat: all eighth notes
      const hiHatPattern: Array<number | null> = [
        1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1,
      ];

      // Pad chords: half-note sustained chords (8 per 4 bars)
      const padChords: Array<string[]> = [
        // Bar 1 (C)
        ['C4', 'E4', 'G4'], ['C4', 'E4', 'G4'],
        // Bar 2 (F → G)
        ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5'],
        // Bar 3 (C → Am)
        ['C4', 'E4', 'G4'], ['A3', 'C4', 'E4'],
        // Bar 4 (F → G)
        ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5'],
      ];

      // Arpeggio: 16th notes following chord changes (64 notes for 4 bars)
      const arpNotes: Array<string | null> = [
        // Bar 1: C major
        'G5', 'C6', 'E6', 'C6', 'G5', 'C6', 'E6', 'C6',
        'G5', 'E6', 'C6', 'E6', 'G5', 'C6', 'E6', 'G5',
        // Bar 2: F major → G major
        'C6', 'F6', 'A6', 'F6', 'C6', 'F6', 'A6', 'C6',
        'D6', 'G6', 'B6', 'G6', 'D6', 'G6', 'B6', 'D6',
        // Bar 3: C major → A minor
        'G5', 'C6', 'E6', 'C6', 'G5', 'C6', 'E6', 'C6',
        'A5', 'C6', 'E6', 'C6', 'A5', 'C6', 'E6', 'A5',
        // Bar 4: F major → G major
        'C6', 'F6', 'A6', 'F6', 'C6', 'F6', 'A6', 'C6',
        'D6', 'G6', 'B6', 'G6', 'D6', 'G6', 'B6', 'D6',
      ];

      // ========== Sequences ==========

      this.bgmSeqLead = new Tone.Sequence(
        (time, note) => {
          if (note !== null && this.bgmLeadSynth) {
            this.bgmLeadSynth.triggerAttackRelease(note, '8n', time);
          }
        },
        leadNotes,
        '8n',
      );

      this.bgmSeqBass = new Tone.Sequence(
        (time, note) => {
          if (note !== null && this.bgmBassSynth) {
            this.bgmBassSynth.triggerAttackRelease(note, '8n', time);
          }
        },
        bassNotes,
        '8n',
      );

      this.bgmSeqDrumKick = new Tone.Sequence(
        (time, val) => {
          if (val !== null && this.bgmDrumKick) {
            this.bgmDrumKick.triggerAttackRelease('C1', '32n', time);
          }
        },
        kickPattern,
        '8n',
      );

      this.bgmSeqDrumSnare = new Tone.Sequence(
        (time, val) => {
          if (val !== null && this.bgmDrumSnare) {
            this.bgmDrumSnare.triggerAttackRelease('32n', time);
          }
        },
        snarePattern,
        '8n',
      );

      this.bgmSeqHiHat = new Tone.Sequence(
        (time, val) => {
          if (val !== null && this.bgmHiHat) {
            this.bgmHiHat.triggerAttackRelease('64n', time);
          }
        },
        hiHatPattern,
        '8n',
      );

      this.bgmSeqPad = new Tone.Sequence(
        (time, chord) => {
          if (chord !== null && this.bgmPadSynth) {
            this.bgmPadSynth.triggerAttackRelease(chord as unknown as string[], '2n', time);
          }
        },
        padChords,
        '2n',
      );

      this.bgmSeqArp = new Tone.Sequence(
        (time, note) => {
          if (note !== null && this.bgmArpSynth) {
            this.bgmArpSynth.triggerAttackRelease(note, '32n', time);
          }
        },
        arpNotes,
        '16n',
      );

      // Start all sequences
      const sequences = [
        this.bgmSeqLead, this.bgmSeqBass,
        this.bgmSeqDrumKick, this.bgmSeqDrumSnare, this.bgmSeqHiHat,
        this.bgmSeqPad, this.bgmSeqArp,
      ];
      for (const seq of sequences) {
        seq.loop = true;
        seq.start(0);
      }

      transport.start();
      this.bgmPlaying = true;
    } catch {
      // ignore
    }
  }

  /** Pause fight background music (preserves playback position). */
  pauseBGM(): void {
    if (!this.bgmPlaying) return;
    try {
      Tone.getTransport().pause();
    } catch {
      // ignore
    }
  }

  /** Resume fight background music after a pause. */
  resumeBGM(): void {
    if (!this.bgmPlaying) return;
    try {
      Tone.getTransport().start();
    } catch {
      // ignore
    }
  }

  /** Stop fight background music and dispose all synths. */
  stopBGM(): void {
    if (!this.bgmPlaying) return;
    try {
      const transport = Tone.getTransport();
      transport.stop();
      transport.position = 0;

      // Dispose sequences
      const sequences = [
        this.bgmSeqLead, this.bgmSeqBass,
        this.bgmSeqDrumKick, this.bgmSeqDrumSnare, this.bgmSeqHiHat,
        this.bgmSeqPad, this.bgmSeqArp,
      ];
      for (const seq of sequences) {
        if (seq) {
          seq.stop();
          seq.dispose();
        }
      }
      this.bgmSeqLead = null;
      this.bgmSeqBass = null;
      this.bgmSeqDrumKick = null;
      this.bgmSeqDrumSnare = null;
      this.bgmSeqHiHat = null;
      this.bgmSeqPad = null;
      this.bgmSeqArp = null;

      // Dispose synths and filters
      const disposables: Array<Tone.ToneAudioNode | null> = [
        this.bgmLeadSynth, this.bgmBassSynth,
        this.bgmDrumKick, this.bgmDrumSnare, this.bgmSnareFilter,
        this.bgmHiHat, this.bgmHiHatFilter,
        this.bgmPadSynth, this.bgmArpSynth,
      ];
      for (const node of disposables) {
        if (node) node.dispose();
      }
      this.bgmLeadSynth = null;
      this.bgmBassSynth = null;
      this.bgmDrumKick = null;
      this.bgmDrumSnare = null;
      this.bgmSnareFilter = null;
      this.bgmHiHat = null;
      this.bgmHiHatFilter = null;
      this.bgmPadSynth = null;
      this.bgmArpSynth = null;

      this.bgmPlaying = false;
    } catch {
      // ignore
    }
  }

  // ---------- Menu Background Music ----------

  /** Start looping chill menu BGM at ~100 BPM. */
  playMenuBGM(): void {
    if (!this.started || this.menuPlaying) return;
    try {
      const transport = Tone.getTransport();
      transport.bpm.value = 100;

      // Soft triangle lead
      this.menuLeadSynth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.3, release: 0.3 },
        volume: -22,
      }).toDestination();

      // Gentle sine bass
      this.menuBassSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.4, release: 0.2 },
        volume: -24,
      }).toDestination();

      // Warm sine pad
      this.menuPadSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.5, decay: 0.3, sustain: 0.6, release: 0.8 },
        volume: -26,
      }).toDestination();

      // Relaxed pentatonic melody (4 bars, 32 eighth notes)
      const menuLead: Array<string | null> = [
        // Bar 1
        'E5', null, 'G5', null, 'C6', null, 'B5', null,
        // Bar 2
        'A5', null, 'G5', null, 'E5', null, null, null,
        // Bar 3
        'F5', null, 'A5', null, 'G5', null, 'E5', null,
        // Bar 4
        'D5', null, null, 'E5', 'C5', null, null, null,
      ];

      // Sparse bass (root notes)
      const menuBass: Array<string | null> = [
        // Bar 1
        'C3', null, null, null, 'G3', null, null, null,
        // Bar 2
        'A2', null, null, null, 'E3', null, null, null,
        // Bar 3
        'F3', null, null, null, 'G3', null, null, null,
        // Bar 4
        'G3', null, null, null, 'C3', null, null, null,
      ];

      // Pad chords (whole notes, 4 per 4 bars)
      const menuPad: Array<string[]> = [
        ['C4', 'E4', 'G4'],
        ['A3', 'C4', 'E4'],
        ['F3', 'A3', 'C4'],
        ['G3', 'B3', 'D4'],
      ];

      this.menuSeqLead = new Tone.Sequence(
        (time, note) => {
          if (note !== null && this.menuLeadSynth) {
            this.menuLeadSynth.triggerAttackRelease(note, '8n', time);
          }
        },
        menuLead,
        '8n',
      );

      this.menuSeqBass = new Tone.Sequence(
        (time, note) => {
          if (note !== null && this.menuBassSynth) {
            this.menuBassSynth.triggerAttackRelease(note, '4n', time);
          }
        },
        menuBass,
        '8n',
      );

      this.menuSeqPad = new Tone.Sequence(
        (time, chord) => {
          if (chord !== null && this.menuPadSynth) {
            this.menuPadSynth.triggerAttackRelease(chord as unknown as string[], '1n', time);
          }
        },
        menuPad,
        '1n',
      );

      const sequences = [this.menuSeqLead, this.menuSeqBass, this.menuSeqPad];
      for (const seq of sequences) {
        seq.loop = true;
        seq.start(0);
      }

      transport.start();
      this.menuPlaying = true;
    } catch {
      // ignore
    }
  }

  /** Stop menu background music and dispose synths. */
  stopMenuBGM(): void {
    if (!this.menuPlaying) return;
    try {
      const transport = Tone.getTransport();
      transport.stop();
      transport.position = 0;

      const sequences = [this.menuSeqLead, this.menuSeqBass, this.menuSeqPad];
      for (const seq of sequences) {
        if (seq) {
          seq.stop();
          seq.dispose();
        }
      }
      this.menuSeqLead = null;
      this.menuSeqBass = null;
      this.menuSeqPad = null;

      const disposables: Array<Tone.ToneAudioNode | null> = [
        this.menuLeadSynth, this.menuBassSynth, this.menuPadSynth,
      ];
      for (const node of disposables) {
        if (node) node.dispose();
      }
      this.menuLeadSynth = null;
      this.menuBassSynth = null;
      this.menuPadSynth = null;

      this.menuPlaying = false;
    } catch {
      // ignore
    }
  }

  // ---------- Victory / Defeat ----------

  /** Triumphant fanfare played when a player wins the match. */
  playVictoryFanfare(): void {
    if (!this.started) return;
    try {
      const now = Tone.now();

      // Fanfare lead (bright square wave)
      const fanfare = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0.4, release: 0.2 },
        volume: -10,
      }).toDestination();

      // Harmony (triangle wave chord hits)
      const harmony = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3 },
        volume: -14,
      }).toDestination();

      // Ascending fanfare melody
      const notes: Array<[string, number]> = [
        ['C5', 0],
        ['E5', 0.12],
        ['G5', 0.24],
        ['C6', 0.36],
        ['E6', 0.6],
        ['G6', 0.72],
        ['C7', 0.84],
      ];

      for (const [note, offset] of notes) {
        fanfare.triggerAttackRelease(note, '8n', now + offset);
      }

      // Big triumphant chord at the end
      harmony.triggerAttackRelease(
        ['C5', 'E5', 'G5', 'C6'],
        '2n',
        now + 1.0,
      );

      setTimeout(() => {
        fanfare.dispose();
        harmony.dispose();
      }, 3000);
    } catch {
      // ignore
    }
  }
}

/** Singleton instance */
export const soundManager = new SoundManager();
