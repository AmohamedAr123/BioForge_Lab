// Lightweight Web Audio API sound synthesizer for tactile laboratory instrumentation cues.

class LabAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private unlocked = false;
  private listenersAttached = false;

  constructor() {
    this.attachUnlockListeners();
  }

  private attachUnlockListeners() {
    if (this.listenersAttached || typeof window === 'undefined') return;
    this.listenersAttached = true;

    const handleFirstInteraction = () => {
      this.unlocked = true;
      if (!this.muted) {
        const ctx = this.ensureContext();
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      }
      window.removeEventListener('pointerdown', handleFirstInteraction, true);
      window.removeEventListener('keydown', handleFirstInteraction, true);
    };

    window.addEventListener('pointerdown', handleFirstInteraction, {
      capture: true,
      passive: true,
    });
    window.addEventListener('keydown', handleFirstInteraction, {
      capture: true,
      passive: true,
    });
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined' || !this.unlocked) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private getContext(): AudioContext | null {
    if (this.muted || !this.unlocked) return null;
    const ctx = this.ensureContext();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx.state === 'running' ? ctx : null;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    durationSec: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.06
  ) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + durationSec);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.01);
  }

  public playUiClick() {
    this.playTone(540, 620, 0.055, 'triangle', 0.035);
  }

  public playPipetteDispense() {
    this.playTone(720, 420, 0.09, 'sine', 0.05);
    setTimeout(() => this.playTone(960, 1120, 0.06, 'sine', 0.04), 55);
  }

  public playPipetteSuction() {
    this.playTone(340, 760, 0.11, 'sine', 0.045);
    setTimeout(() => this.playTone(620, 880, 0.06, 'triangle', 0.03), 65);
  }

  public playSinkPour() {
    this.playTone(520, 210, 0.16, 'sine', 0.045);
    setTimeout(() => this.playTone(380, 170, 0.14, 'triangle', 0.03), 80);
  }

  public playStationOpen() {
    this.playTone(330, 495, 0.08, 'triangle', 0.04);
  }

  public playMicroscopeTurret() {
    this.playTone(240, 180, 0.06, 'square', 0.025);
  }

  public playSnapshotShutter() {
    this.playTone(1100, 320, 0.07, 'triangle', 0.05);
  }

  public playSterilizeCycle() {
    this.playTone(220, 440, 0.22, 'sine', 0.045);
    setTimeout(() => this.playTone(660, 880, 0.14, 'sine', 0.04), 190);
  }

  public playSaveSuccess() {
    this.playTone(523.25, 659.25, 0.09, 'sine', 0.045);
    setTimeout(() => this.playTone(659.25, 783.99, 0.12, 'sine', 0.045), 85);
  }
}

export const labAudio = new LabAudioEngine();
