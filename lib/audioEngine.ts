'use client';

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function beep(frequency: number, duration: number, volume: number = 0.3, type: OscillatorType = 'sine') {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

export const AudioEngine = {
  /** Short tick every second */
  tick() {
    beep(880, 0.05, 0.15, 'square');
  },

  /** Countdown beep */
  countdown() {
    beep(660, 0.15, 0.3, 'sine');
  },

  /** Start signal - upward chirp */
  start() {
    beep(440, 0.1, 0.4, 'sine');
    setTimeout(() => beep(660, 0.15, 0.4, 'sine'), 120);
    setTimeout(() => beep(880, 0.25, 0.5, 'sine'), 250);
  },

  /** Rest signal */
  rest() {
    beep(440, 0.2, 0.4, 'sine');
  },

  /** New movement signal */
  nextMovement() {
    beep(550, 0.15, 0.4, 'sine');
    setTimeout(() => beep(770, 0.2, 0.4, 'sine'), 180);
  },

  /** Completion signal */
  complete() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => beep(freq, 0.3, 0.5, 'sine'), i * 150);
    });
  },

  /** Abort signal */
  abort() {
    beep(220, 0.4, 0.4, 'sawtooth');
  },
};
