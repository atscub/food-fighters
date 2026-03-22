import * as Tone from 'tone';

/**
 * Procedural chiptune sound effects manager using Tone.js.
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

  // BGM synths and sequencers
  private bgmLeadSynth: Tone.Synth | null = null;
  private bgmBassSynth: Tone.Synth | null = null;
  private bgmSeqLead: Tone.Sequence | null = null;
  private bgmSeqBass: Tone.Sequence | null = null;
  private bgmPlaying = false;

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

  // ---------- Background Music ----------

  /** Start looping chiptune background music at ~140 BPM. */
  playBGM(): void {
    if (!this.started || this.bgmPlaying) return;
    try {
      const transport = Tone.getTransport();
      transport.bpm.value = 140;

      // Lead melody synth (square wave, retro feel)
      this.bgmLeadSynth = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.3,
          release: 0.1,
        },
        volume: -20,
      }).toDestination();

      // Bass synth (triangle wave for that NES bass)
      this.bgmBassSynth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: {
          attack: 0.01,
          decay: 0.15,
          sustain: 0.4,
          release: 0.1,
        },
        volume: -22,
      }).toDestination();

      // 8-bar lead melody: energetic, upbeat fighting game riff
      // Uses two 4-bar phrases for variety
      const leadNotes: Array<string | null> = [
        // Bar 1
        'C5', 'C5', 'E5', 'G5',
        // Bar 2
        'A5', null, 'G5', 'E5',
        // Bar 3
        'F5', 'F5', 'A5', 'C6',
        // Bar 4
        'B5', null, 'A5', 'G5',
        // Bar 5
        'C5', 'E5', 'G5', 'C6',
        // Bar 6
        'B5', 'A5', 'G5', null,
        // Bar 7
        'F5', 'A5', 'G5', 'E5',
        // Bar 8
        'D5', 'E5', 'C5', null,
      ];

      // Bass line: root notes following chord progression
      const bassNotes: Array<string | null> = [
        // Bar 1-2: C
        'C3', null, 'C3', null,
        'C3', null, 'C3', null,
        // Bar 3-4: F -> G
        'F3', null, 'F3', null,
        'G3', null, 'G3', null,
        // Bar 5-6: C -> Am
        'C3', null, 'C3', null,
        'A2', null, 'A2', null,
        // Bar 7-8: F -> G
        'F3', null, 'F3', null,
        'G3', null, 'G3', null,
      ];

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

      this.bgmSeqLead.loop = true;
      this.bgmSeqBass.loop = true;

      this.bgmSeqLead.start(0);
      this.bgmSeqBass.start(0);

      transport.start();
      this.bgmPlaying = true;
    } catch {
      // ignore
    }
  }

  /** Pause background music (preserves playback position). */
  pauseBGM(): void {
    if (!this.bgmPlaying) return;
    try {
      Tone.getTransport().pause();
    } catch {
      // ignore
    }
  }

  /** Resume background music after a pause. */
  resumeBGM(): void {
    if (!this.bgmPlaying) return;
    try {
      Tone.getTransport().start();
    } catch {
      // ignore
    }
  }

  /** Stop background music. */
  stopBGM(): void {
    if (!this.bgmPlaying) return;
    try {
      const transport = Tone.getTransport();
      transport.stop();

      if (this.bgmSeqLead) {
        this.bgmSeqLead.stop();
        this.bgmSeqLead.dispose();
        this.bgmSeqLead = null;
      }
      if (this.bgmSeqBass) {
        this.bgmSeqBass.stop();
        this.bgmSeqBass.dispose();
        this.bgmSeqBass = null;
      }
      if (this.bgmLeadSynth) {
        this.bgmLeadSynth.dispose();
        this.bgmLeadSynth = null;
      }
      if (this.bgmBassSynth) {
        this.bgmBassSynth.dispose();
        this.bgmBassSynth = null;
      }

      this.bgmPlaying = false;
    } catch {
      // ignore
    }
  }
}

/** Singleton instance */
export const soundManager = new SoundManager();
