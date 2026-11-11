import { PieceType } from './types';

class CrystalSoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;
  private masterGain: GainNode | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Storage can be blocked (private mode, sandboxed iframes): never let that break the app.
      try {
        const savedMute = localStorage.getItem('crown_chess_muted');
        if (savedMute !== null) {
          this.isMuted = savedMute === 'true';
        }
        const savedVol = localStorage.getItem('crown_chess_volume');
        if (savedVol !== null) {
          const parsed = parseFloat(savedVol);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
            this.volume = parsed;
          }
        }
      } catch {
        // ignore: defaults are used
      }
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('crown_chess_muted', String(muted));
      } catch {
        // storage unavailable
      }
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('crown_chess_volume', String(this.volume));
      } catch {
        // storage unavailable
      }
    }
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  private getDestination(): AudioNode | null {
    this.initContext();
    return this.masterGain;
  }

  private getRandomPitch(freq: number, variance = 0.06): number {
    return freq * (1 + (Math.random() - 0.5) * variance);
  }

  // 1. Soft crystal "tink" for picking up a piece
  public playPickup() {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = this.getRandomPitch(1760); // A6
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.05, t + 0.08);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // 2. Glassy glide whoosh for movement along arc
  public playGlideWhoosh(duration = 0.35) {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    const t = this.ctx.currentTime;
    const dur = Math.max(0.15, Math.min(0.6, duration));

    // Two layered subtle filtered sine oscillators for airy crystal glide
    [659.25, 1318.5].forEach((baseFreq, i) => {
      if (!this.ctx || !dest) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = this.getRandomPitch(baseFreq, 0.04);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.9, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.15, t + dur * 0.6);
      osc.frequency.exponentialRampToValueAtTime(freq, t + dur);

      const peakAmp = (0.04 / (i + 1));
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(peakAmp, t + dur * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
  }

  // 3. Gentle gem "clack" for landing with piece-specific resonance
  public playLanding(pieceType: PieceType = 'p') {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    const t = this.ctx.currentTime;

    // Piece-specific pitch profiles:
    // Rook & King: heavier, deeper resonance with firm body
    // Queen: majestic brilliant ring
    // Knight & Bishop: bright medium crystal chime
    // Pawn: light delicate cheerful click
    let baseFreq = 1046.5; // C6 default
    let bodyFreq = 440;
    let decayTime = 0.3;

    if (pieceType === 'r') {
      baseFreq = 587.33; // D5
      bodyFreq = 180;
      decayTime = 0.42;
    } else if (pieceType === 'k') {
      baseFreq = 523.25; // C5
      bodyFreq = 160;
      decayTime = 0.45;
    } else if (pieceType === 'q') {
      baseFreq = 1174.66; // D6
      bodyFreq = 392;
      decayTime = 0.38;
    } else if (pieceType === 'b') {
      baseFreq = 987.77; // B5
      bodyFreq = 330;
      decayTime = 0.28;
    } else if (pieceType === 'n') {
      baseFreq = 880; // A5
      bodyFreq = 293;
      decayTime = 0.25;
    } else {
      // Pawn
      baseFreq = 1318.51; // E6
      bodyFreq = 523;
      decayTime = 0.2;
    }

    const freq1 = this.getRandomPitch(baseFreq, 0.04);
    const freq2 = this.getRandomPitch(bodyFreq, 0.04);

    // High crystalline transient
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq1, t);
    osc1.frequency.exponentialRampToValueAtTime(freq1 * 0.96, t + decayTime);

    gain1.gain.setValueAtTime(0.001, t);
    gain1.gain.linearRampToValueAtTime(0.09, t + 0.012);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + decayTime);

    osc1.connect(gain1);
    gain1.connect(dest);
    osc1.start(t);
    osc1.stop(t + decayTime + 0.05);

    // Deep stone body thump
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq2, t);
    osc2.frequency.exponentialRampToValueAtTime(freq2 * 0.8, t + 0.15);

    gain2.gain.setValueAtTime(0.001, t);
    gain2.gain.linearRampToValueAtTime(0.07, t + 0.015);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);

    osc2.connect(gain2);
    gain2.connect(dest);
    osc2.start(t);
    osc2.stop(t + 0.25);
  }

  // 4. Shattering crystal glass for captures (extra grand for Queen capture)
  public playCapture(isQueen: boolean = false) {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    const t = this.ctx.currentTime;
    const cluster = isQueen
      ? [440, 659.25, 880, 1318.5, 1760, 2637, 3520, 5274] // Royal 8-frequency cluster
      : [880, 1318.5, 1760, 2637, 3520];

    const dur = isQueen ? 0.9 : 0.55;

    cluster.forEach((baseFreq, idx) => {
      if (!this.ctx || !dest) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = this.getRandomPitch(baseFreq, 0.08);
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.9, t + dur);

      const amp = (isQueen ? 0.07 : 0.05) / (1 + idx * 0.15);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(amp, t + 0.01 + idx * 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + idx * 0.04);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + dur + 0.1);
    });
  }

  // 5. Deep warning heartbeat sound for check
  public playHeartbeat() {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    // Double beat: "lub-dub"
    const playPulse = (startTime: number, freq: number, gainAmp: number) => {
      if (!this.ctx || !dest) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.65, startTime + 0.25);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(gainAmp, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + 0.35);
    };

    const now = this.ctx.currentTime;
    playPulse(now, 85, 0.18); // Beat 1
    playPulse(now + 0.18, 75, 0.13); // Beat 2
  }

  // 6. Rising chime for pawn promotion
  public playPromotion() {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    // Fast ascending sparkling arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093]; // C5 to C7
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx || !dest || this.isMuted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.02, t + 0.35);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.5);
      }, idx * 60);
    });
  }

  // 7. Uplifting orchestral victory arpeggio
  public playVictory() {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    const chords = [
      [523.25, 659.25, 783.99], // C Major
      [587.33, 739.99, 880.0], // D Major
      [659.25, 830.61, 987.77], // E Major
      [1046.5, 1318.51, 1567.98, 2093], // High C Major triumphant flourish
    ];

    chords.forEach((chord, step) => {
      setTimeout(() => {
        chord.forEach((freq, i) => {
          if (!this.ctx || !dest || this.isMuted) return;
          const t = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = i === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0.001, t);
          gain.gain.linearRampToValueAtTime(0.07 / (1 + i * 0.2), t + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

          osc.connect(gain);
          gain.connect(dest);
          osc.start(t);
          osc.stop(t + 1.0);
        });
      }, step * 220);
    });
  }

  // 8. Board waking up ripple on game start
  public playFirstMove() {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    const t = this.ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx || !dest || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.7);
      }, idx * 80);
    });
  }

  // Twin chime for castling
  public playCastle() {
    this.playLanding('k');
    setTimeout(() => {
      this.playLanding('r');
    }, 120);
  }

  // 9. Soft crystal message chime for incoming chat messages
  public playMessageChime() {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    [880, 1318.51].forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx || !dest || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + 0.15);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.32);
      }, idx * 75);
    });
  }

  // 10. Sparkle pop for royal reaction emojis
  public playReactionPop() {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(659.25, t);
    osc.frequency.exponentialRampToValueAtTime(1567.98, t + 0.12);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.25);
  }
}

export const soundEngine = new CrystalSoundManager();
