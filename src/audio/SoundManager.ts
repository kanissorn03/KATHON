/**
 * Synthesized Web Audio sound manager featuring the traditional Thai
 * "รำวงวันลอยกระทง" (Loy Krathong Song) background music + temple fair SFX.
 * Zero external MP3 dependencies — works offline on iOS/iPad, Android, and Desktop.
 */

interface MelodyStep {
  note: number | null;
  beats: number;
  bass?: number;
}

const N = {
  F2: 87.31,
  G2: 98.0,
  A2: 110.0,
  C3: 130.81,
  D3: 146.83,
  G3: 196.0,
  E4: 329.63,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99
};

// Traditional Thai "รำวงวันลอยกระทง" melody in C Major
const LOY_KRATHONG_MELODY: MelodyStep[] = [
  // วันเพ็ญเดือนสิบสอง น้ำก็นองเต็มตลิ่ง
  { note: N.G4, beats: 0.5, bass: N.C3 },
  { note: N.G4, beats: 0.5 },
  { note: N.E4, beats: 0.5 },
  { note: N.G4, beats: 0.5 },
  { note: N.A4, beats: 1.0, bass: N.F2 },
  { note: N.C5, beats: 1.0, bass: N.C3 },

  { note: N.D5, beats: 0.5, bass: N.G2 },
  { note: N.C5, beats: 0.5 },
  { note: N.A4, beats: 0.5 },
  { note: N.G4, beats: 0.5 },
  { note: N.G4, beats: 0.5, bass: N.C3 },
  { note: N.E4, beats: 1.5 },

  // เราทั้งหลายชายหญิง สนุกกันจริงวันลอยกระทง
  { note: N.G4, beats: 0.5, bass: N.C3 },
  { note: N.G4, beats: 0.5 },
  { note: N.A4, beats: 0.5 },
  { note: N.C5, beats: 1.0, bass: N.A2 },
  { note: N.A4, beats: 0.5 },
  { note: N.C5, beats: 1.0, bass: N.F2 },

  { note: N.G4, beats: 0.5, bass: N.C3 },
  { note: N.A4, beats: 0.5 },
  { note: N.C5, beats: 0.5 },
  { note: N.D5, beats: 0.5, bass: N.G2 },
  { note: N.C5, beats: 0.5 },
  { note: N.A4, beats: 0.5 },
  { note: N.G4, beats: 0.5, bass: N.C3 },
  { note: N.G4, beats: 1.5 },

  // ลอย ลอยกระทง, ลอย ลอยกระทง
  { note: N.C5, beats: 1.5, bass: N.C3 },
  { note: N.C5, beats: 0.5 },
  { note: N.C5, beats: 0.5, bass: N.A2 },
  { note: N.C5, beats: 1.5 },

  { note: N.G4, beats: 1.5, bass: N.G2 },
  { note: N.G4, beats: 0.5 },
  { note: N.G4, beats: 0.5, bass: N.C3 },
  { note: N.G4, beats: 1.5 },

  // ลอยกระทงกันแล้ว ขอเชิญน้องแก้วออกมารำวง
  { note: N.C5, beats: 0.5, bass: N.C3 },
  { note: N.C5, beats: 0.5 },
  { note: N.C5, beats: 0.5 },
  { note: N.D5, beats: 0.5 },
  { note: N.E5, beats: 1.5, bass: N.C3 },
  { note: null, beats: 0.5 },

  { note: N.E5, beats: 0.5, bass: N.A2 },
  { note: N.D5, beats: 0.5 },
  { note: N.C5, beats: 0.5 },
  { note: N.A4, beats: 0.5, bass: N.F2 },
  { note: N.G4, beats: 0.5, bass: N.G2 },
  { note: N.A4, beats: 0.5 },
  { note: N.C5, beats: 0.5 },
  { note: N.D5, beats: 1.5, bass: N.G2 },

  // รำวงวันลอยกระทง, รำวงวันลอยกระทง
  { note: N.E5, beats: 0.5, bass: N.C3 },
  { note: N.E5, beats: 0.5 },
  { note: N.E5, beats: 0.5 },
  { note: N.D5, beats: 0.5 },
  { note: N.E5, beats: 1.5, bass: N.C3 },
  { note: null, beats: 0.5 },

  { note: N.C5, beats: 0.5, bass: N.F2 },
  { note: N.C5, beats: 0.5 },
  { note: N.C5, beats: 0.5 },
  { note: N.A4, beats: 0.5 },
  { note: N.C5, beats: 1.5, bass: N.C3 },
  { note: null, beats: 0.5 },

  // บุญจะส่งให้เราสุขใจ, บุญจะส่งให้เราสุขใจ
  { note: N.C5, beats: 0.5, bass: N.F2 },
  { note: N.A4, beats: 0.5 },
  { note: N.G4, beats: 0.5, bass: N.C3 },
  { note: N.A4, beats: 0.5 },
  { note: N.C5, beats: 0.5, bass: N.G2 },
  { note: N.A4, beats: 0.5 },
  { note: N.C5, beats: 1.0, bass: N.C3 },

  { note: N.C5, beats: 0.5, bass: N.F2 },
  { note: N.A4, beats: 0.5 },
  { note: N.G4, beats: 0.5, bass: N.G2 },
  { note: N.A4, beats: 0.5 },
  { note: N.C5, beats: 0.5, bass: N.C3 },
  { note: N.A4, beats: 0.5 },
  { note: N.C5, beats: 2.0, bass: N.C3 },
  { note: null, beats: 2.0 }
];

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private muted = false;
  private unlocked = false;

  // Sequencer state
  private seqTimer: number | null = null;
  private stepIdx = 0;
  private nextNoteTime = 0;
  private beatAccumulator = 0;
  private readonly bpm = 108;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) {
        this.ctx.suspend().catch(() => {});
      } else if (!this.muted) {
        this.ctx.resume().catch(() => {});
        this.nextNoteTime = this.ctx.currentTime + 0.08;
      }
    });
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.48;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.34;
      this.bgmGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (!this.unlocked) {
      this.unlocked = true;
      this.startLoyKrathongBGM();
    }
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.48, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.unlock();
    this.setMuted(!this.muted);
    return this.muted;
  }

  private startLoyKrathongBGM(): void {
    if (this.seqTimer !== null || !this.ctx) return;
    this.stepIdx = 0;
    this.beatAccumulator = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.12;

    const secPerBeat = 60 / this.bpm;
    const lookahead = 0.22;

    const scheduleLoop = () => {
      if (!this.ctx || !this.bgmGain) return;

      if (this.ctx.state === 'running' && !this.muted) {
        // Guard against large catch-up spikes after tab switch
        if (this.nextNoteTime < this.ctx.currentTime - 0.5) {
          this.nextNoteTime = this.ctx.currentTime + 0.06;
        }

        while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
          const step = LOY_KRATHONG_MELODY[this.stepIdx];
          const durSec = step.beats * secPerBeat;

          if (step.note !== null) {
            this.playRanatNote(step.note, this.nextNoteTime, durSec);
          }
          if (step.bass !== undefined) {
            this.playBassNote(step.bass, this.nextNoteTime, secPerBeat * 1.6);
          }

          this.scheduleRhythmForStep(this.beatAccumulator, step.beats, this.nextNoteTime, secPerBeat);

          this.beatAccumulator = (this.beatAccumulator + step.beats) % 4;
          this.nextNoteTime += durSec;
          this.stepIdx = (this.stepIdx + 1) % LOY_KRATHONG_MELODY.length;
        }
      }

      this.seqTimer = window.setTimeout(scheduleLoop, 60);
    };

    scheduleLoop();
  }

  private scheduleRhythmForStep(
    beatStart: number,
    beats: number,
    startTime: number,
    secPerBeat: number
  ): void {
    const end = beatStart + beats;
    const epsilon = 0.001;

    // Ramwong rhythm within 4-beat bar: Drum at 0 & 2.5, Ching "ฉิ่ง" at 1, "ฉับ" at 3
    if (beatStart <= 0 + epsilon && 0 < end) {
      this.playRamwongDrum(startTime + (0 - beatStart) * secPerBeat, true);
    }
    if (beatStart <= 1 + epsilon && 1 < end) {
      this.playChing(startTime + (1 - beatStart) * secPerBeat, true);
    }
    if (beatStart <= 2.5 + epsilon && 2.5 < end) {
      this.playRamwongDrum(startTime + (2.5 - beatStart) * secPerBeat, false);
    }
    if (beatStart <= 3 + epsilon && 3 < end) {
      this.playChing(startTime + (3 - beatStart) * secPerBeat, false);
    }
  }

  private playRanatNote(freq: number, time: number, durSec: number): void {
    if (!this.ctx || !this.bgmGain) return;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.22, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(durSec * 1.15, 0.72));

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, time);
    const overtoneGain = this.ctx.createGain();
    overtoneGain.gain.value = 0.14;

    osc1.connect(filter);
    osc2.connect(overtoneGain);
    overtoneGain.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc1.start(time);
    osc2.start(time);
    const stopAt = time + Math.min(durSec * 1.15, 0.75) + 0.03;
    osc1.stop(stopAt);
    osc2.stop(stopAt);

    // Gentle Khlui (Thai flute) swell on sustained notes
    if (durSec >= 0.52) {
      const flute = this.ctx.createOscillator();
      const fg = this.ctx.createGain();
      flute.type = 'sine';
      flute.frequency.setValueAtTime(freq, time);
      fg.gain.setValueAtTime(0.0001, time);
      fg.gain.exponentialRampToValueAtTime(0.09, time + 0.08);
      fg.gain.exponentialRampToValueAtTime(0.0001, time + durSec * 0.95);
      flute.connect(fg);
      fg.connect(this.bgmGain);
      flute.start(time);
      flute.stop(time + durSec + 0.04);
    }
  }

  private playBassNote(freq: number, time: number, durSec: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.14, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + durSec);

    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + durSec + 0.04);
  }

  private playChing(time: number, open: boolean): void {
    if (!this.ctx || !this.bgmGain) return;
    const freqs = open ? [2780, 4120] : [2550, 3800];
    const decay = open ? 0.32 : 0.055;
    const vol = open ? 0.045 : 0.035;

    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, time);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(vol, time + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
      osc.connect(g);
      g.connect(this.bgmGain);
      osc.start(time);
      osc.stop(time + decay + 0.02);
    }
  }

  private playRamwongDrum(time: number, accent: boolean): void {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 135 : 112, time);
    osc.frequency.exponentialRampToValueAtTime(52, time + 0.12);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(accent ? 0.16 : 0.11, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);

    osc.connect(g);
    g.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.18);
  }

  private playBellNote(freq: number, duration: number, volume: number, dest?: AudioNode): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(dest ?? this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  public playTap(): void {
    this.unlock();
    this.playBellNote(740, 0.12, 0.14);
  }

  public playBuy(): void {
    this.unlock();
    this.playBellNote(587.33, 0.25, 0.18);
    window.setTimeout(() => this.playBellNote(880, 0.35, 0.18), 80);
  }

  public playEatSip(): void {
    this.unlock();
    [523.25, 659.25, 783.99].forEach((f, idx) => {
      window.setTimeout(() => this.playBellNote(f, 0.22, 0.14), idx * 75);
    });
  }

  public playFortuneShake(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted) return;
    for (let i = 0; i < 6; i++) {
      window.setTimeout(() => {
        this.playBellNote(240 + Math.random() * 140, 0.08, 0.16);
      }, i * 70);
    }
    window.setTimeout(() => {
      this.playBellNote(783.99, 0.45, 0.2);
      this.playBellNote(1046.5, 0.55, 0.18);
    }, 460);
  }

  public playPrayerChime(): void {
    this.unlock();
    this.playBellNote(523.25, 1.4, 0.22);
    window.setTimeout(() => this.playBellNote(659.25, 1.4, 0.18), 160);
    window.setTimeout(() => this.playBellNote(783.99, 1.6, 0.2), 320);
  }

  public playWaterSplash(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(260, now + 0.4);
    filter.Q.value = 1.6;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);

    window.setTimeout(() => this.playBellNote(659.25, 0.8, 0.15), 110);
  }

  public playFestivalBurst(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, Math.floor(sampleRate * 0.58), sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.3);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.57);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  public playFirework(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.22);
    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.26);

    [880, 1046.5, 1318.5, 1567.98].forEach((f, idx) => {
      window.setTimeout(() => this.playBellNote(f, 0.45, 0.12), 90 + idx * 45);
    });
  }

  public playPhoneNotify(): void {
    this.unlock();
    this.playBellNote(880, 0.24, 0.2);
    window.setTimeout(() => this.playBellNote(1318.51, 0.36, 0.22), 95);
  }

  public playCoinTransfer(): void {
    this.unlock();
    this.playBellNote(1046.5, 0.22, 0.2);
    window.setTimeout(() => this.playBellNote(1567.98, 0.38, 0.2), 85);
  }
}
