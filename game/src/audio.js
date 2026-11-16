// Tiny WebAudio synth for Aurora Keep: every sound is generated in code,
// no audio files are loaded. All calls are safe before the audio context
// exists (browsers require a user gesture first) and when audio is muted.
export class SoundBank {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
  }

  ensure() {
    if (this.context || typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.22;
      this.master.connect(this.context.destination);
    } catch (error) {
      this.context = null;
    }
  }

  resume() {
    this.ensure();
    if (this.context && this.context.state === 'suspended') {
      this.context.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.context) {
      this.master.gain.setValueAtTime(muted ? 0 : 0.22, this.context.currentTime);
    }
  }

  tone(frequency, duration, type, volume, slideTo) {
    if (!this.context || this.muted) return;
    try {
      const start = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (slideTo) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + duration);
      }
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    } catch (error) {
      // Sound is decorative; never let it break the game.
    }
  }

  shoot(towerKey) {
    if (towerKey === 'cannon') this.tone(140, 0.12, 'square', 0.25, 60);
    else if (towerKey === 'nova') this.tone(220, 0.18, 'sine', 0.3, 90);
    else if (towerKey === 'frost') this.tone(880, 0.1, 'sine', 0.16, 1200);
    else this.tone(660, 0.06, 'square', 0.1, 520);
  }

  hit() {
    this.tone(320, 0.05, 'triangle', 0.12, 240);
  }

  coin() {
    this.tone(988, 0.07, 'sine', 0.16);
    if (!this.context) return;
    setTimeout(() => this.tone(1319, 0.09, 'sine', 0.16), 60);
  }

  place() {
    this.tone(196, 0.12, 'triangle', 0.3, 130);
  }

  denied() {
    this.tone(160, 0.14, 'sawtooth', 0.18, 110);
  }

  waveStart() {
    this.tone(392, 0.12, 'triangle', 0.22);
    setTimeout(() => this.tone(523, 0.14, 'triangle', 0.22), 110);
  }

  ability() {
    this.tone(523, 0.25, 'sine', 0.28, 1047);
    setTimeout(() => this.tone(784, 0.3, 'triangle', 0.24, 1568), 90);
  }

  leak() {
    this.tone(220, 0.3, 'sawtooth', 0.3, 70);
  }

  victory() {
    [523, 659, 784, 1047].forEach((frequency, index) => {
      setTimeout(() => this.tone(frequency, 0.22, 'triangle', 0.24), index * 140);
    });
  }

  defeat() {
    [392, 330, 262, 196].forEach((frequency, index) => {
      setTimeout(() => this.tone(frequency, 0.26, 'triangle', 0.22), index * 170);
    });
  }
}
