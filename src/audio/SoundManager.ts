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
        attack: 0.002,
        decay: 0.08,
        sustain: 0,
        release: 0.01,
      },
      volume: -16,
    }).toDestination();

    // Membrane synth for bassy / thuddy impacts
    this.membraneSynth = new Tone.MembraneSynth({
      pitchDecay: 0.03,
      octaves: 4,
      envelope: {
        attack: 0.001,
        decay: 0.15,
        sustain: 0,
        release: 0.05,
      },
      volume: -10,
    }).toDestination();
  }

  // ---------- public sound effects ----------

  /** Short percussive blip when a punch/kick connects. */
  playHit(): void {
    if (!this.started) return;
    try {
      // Quick high-pitched square blip + noise burst
      this.synth?.triggerAttackRelease('C6', '32n');
      this.noiseSynth?.triggerAttackRelease('32n');
    } catch {
      // ignore
    }
  }

  /** Duller, muffled sound when an attack is blocked. */
  playBlock(): void {
    if (!this.started) return;
    try {
      // Low, short membrane thud
      this.membraneSynth?.triggerAttackRelease('C2', '16n');
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

      const synth = new Tone.Synth({
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
        synth.triggerAttackRelease(note, '16n', now + i * noteLen);
      });

      // Clean up after arpeggio finishes
      setTimeout(() => {
        synth.dispose();
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

      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square' },
        envelope: {
          attack: 0.005,
          decay: 0.2,
          sustain: 0,
          release: 0.1,
        },
        volume: -10,
      }).toDestination();

      synth.triggerAttackRelease(['C5', 'E5', 'G5'], '8n', now);

      setTimeout(() => {
        synth.dispose();
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

      const synth = new Tone.Synth({
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
      synth.triggerAttackRelease('E5', '32n', now);
      synth.triggerAttackRelease('A5', '16n', now + 0.08);

      setTimeout(() => {
        synth.dispose();
      }, 1000);
    } catch {
      // ignore
    }
  }
}

/** Singleton instance */
export const soundManager = new SoundManager();
