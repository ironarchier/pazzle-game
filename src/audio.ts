import { CLICK_SOUND } from './constants';
import { getSettings } from './settings';

let context: AudioContext | undefined;

function getContext(): AudioContext | undefined {
  try {
    context ??= new AudioContext();
  } catch {
    return undefined;
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

export function playClick(): void {
  if (!getSettings().sound) return;

  const ctx = getContext();
  if (!ctx) return;

  const { startFrequency, endFrequency, duration, volume } = CLICK_SOUND;
  const now = ctx.currentTime;

  const oscillator = ctx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(startFrequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}
