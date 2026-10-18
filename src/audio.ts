import * as Phaser from 'phaser';
import { MUSIC, SOUND_REVERB, SOUND_SCALE, SOUND_VOLUME, SOUND_WIN_CHORD, SOUND_WIN_STEP } from './constants';
import { getSettings, subscribeSettings } from './settings';

interface Voice {
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  glide?: number;
}

interface Mixer {
  context: AudioContext;
  dry: AudioNode;
  noise: AudioBuffer;
}

let manager: Phaser.Sound.BaseSoundManager | undefined;
let mixer: Mixer | undefined;
let music: Phaser.Sound.BaseSound | undefined;
let disposeAudio: (() => void) | undefined;

export function initAudio(sound: Phaser.Sound.BaseSoundManager): void {
  if (manager === sound) return;
  disposeAudio?.();
  manager = sound;
  // Music is optional: a failed download must not prevent the game from starting.
  if (!sound.game.cache.audio.exists(MUSIC.key)) return;
  const track = sound.add(MUSIC.key, { loop: true, volume: MUSIC.volume });
  music = track;
  const unsubscribe = subscribeSettings(syncMusic);
  sound.on('unlocked', syncMusic);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', syncMusic);
  const cleanup = () => {
    unsubscribe();
    sound.off('unlocked', syncMusic);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', syncMusic);
    sound.game.events.off('destroy', cleanup);
    if (manager === sound) { manager = undefined; mixer = undefined; music = undefined; disposeAudio = undefined; }
  };
  sound.game.events.once('destroy', cleanup);
  disposeAudio = () => { track.destroy(); cleanup(); };
  syncMusic();
}

function syncMusic(): void {
  if (!manager || !music) return;
  if (!getSettings().music || typeof document !== 'undefined' && document.hidden) {
    if (music.isPlaying) music.pause();
    return;
  }
  if (manager.locked) return; // Phaser unlocks audio after the first permitted user gesture.
  if (music.isPaused) music.resume();
  else if (!music.isPlaying) music.play();
}

export function preloadMusic(load: Phaser.Loader.LoaderPlugin): void {
  load.audio(MUSIC.key, MUSIC.path);
}

function createMixer(context: AudioContext): Mixer {
  const master = context.createGain();
  master.gain.value = SOUND_VOLUME;
  const compressor = context.createDynamicsCompressor();
  master.connect(compressor).connect(context.destination);

  const length = Math.floor(context.sampleRate * SOUND_REVERB.seconds);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** SOUND_REVERB.decay;
  }
  const reverb = context.createConvolver();
  reverb.buffer = impulse;
  const send = context.createGain();
  send.gain.value = SOUND_REVERB.wet;
  send.connect(reverb).connect(master);

  const noise = context.createBuffer(1, context.sampleRate / 4, context.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

  const dry = context.createGain();
  dry.connect(master);
  dry.connect(send);
  return { context, dry, noise };
}

function ready(): Mixer | undefined {
  if (!getSettings().sound || !manager || !('context' in manager)) return undefined;
  const context = (manager as Phaser.Sound.WebAudioSoundManager).context;
  if (context.state !== 'running') return undefined;
  if (mixer?.context !== context) mixer = createMixer(context);
  return mixer;
}

function envelope(context: AudioContext, start: number, duration: number, peak: number, attack: number): GainNode {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  return gain;
}

function tone(m: Mixer, frequency: number, delay: number, duration: number, voice: Voice = {}): void {
  const { context } = m;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  oscillator.type = voice.type ?? 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  if (voice.glide) oscillator.frequency.exponentialRampToValueAtTime(voice.glide, start + Math.min(duration, 0.12));
  const gain = envelope(context, start, duration, voice.gain ?? 0.2, voice.attack ?? 0.005);
  oscillator.connect(gain).connect(m.dry);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

function noise(m: Mixer, delay: number, duration: number, filter: BiquadFilterType, frequency: number, peak: number): void {
  const { context } = m;
  const start = context.currentTime + delay;
  const source = context.createBufferSource();
  source.buffer = m.noise;
  const band = context.createBiquadFilter();
  band.type = filter;
  band.frequency.value = frequency;
  source.connect(band).connect(envelope(context, start, duration, peak, 0.002)).connect(m.dry);
  source.start(start);
  source.stop(start + duration + 0.05);
}

function bell(m: Mixer, frequency: number, delay: number, gain: number, duration = 0.9): void {
  tone(m, frequency, delay, duration, { gain });
  tone(m, frequency * 2, delay, duration * 0.5, { gain: gain * 0.35 });
  tone(m, frequency * 3.98, delay, duration * 0.18, { gain: gain * 0.15 });
}

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export function playClick(): void {
  const m = ready();
  if (!m) return;
  tone(m, 1200, 0, 0.09, { glide: 620, gain: 0.22 });
  noise(m, 0, 0.015, 'highpass', 4000, 0.04);
}

export function playToggle(on: boolean): void {
  const m = ready();
  if (!m) return;
  const [first, second] = on ? [660, 990] : [880, 587.33];
  tone(m, first, 0, 0.1, { type: 'triangle', gain: 0.16 });
  tone(m, second, 0.07, 0.16, { type: 'triangle', gain: 0.16 });
}

export function playPickUp(): void {
  const m = ready();
  if (!m) return;
  tone(m, 360, 0, 0.1, { glide: 620, gain: 0.14 });
}

export function playDrop(): void {
  const m = ready();
  if (!m) return;
  tone(m, 560, 0, 0.12, { glide: 300, gain: 0.12 });
}

export function playJoin(): void {
  const m = ready();
  if (!m) return;
  noise(m, 0, 0.025, 'bandpass', 2600, 0.12);
  const note = pick(SOUND_SCALE.slice(3, 7));
  tone(m, note, 0, 0.18, { type: 'triangle', gain: 0.14 });
  tone(m, note * 1.5, 0.05, 0.22, { type: 'triangle', gain: 0.1 });
}

export function playPlace(progress = 0): void {
  const m = ready();
  if (!m) return;
  const index = Math.round(Phaser.Math.Clamp(progress, 0, 1) * (SOUND_SCALE.length - 1));
  noise(m, 0, 0.03, 'lowpass', 1800, 0.18);
  tone(m, 180, 0, 0.08, { glide: 90, gain: 0.25 });
  bell(m, SOUND_SCALE[index], 0.01, 0.2, 0.7);
}

export function playWin(): void {
  const m = ready();
  if (!m) return;
  SOUND_WIN_CHORD.forEach((note, i) => bell(m, note, i * SOUND_WIN_STEP, 0.16, 1.4));
  const end = SOUND_WIN_CHORD.length * SOUND_WIN_STEP;
  for (const note of SOUND_WIN_CHORD.slice(0, 3)) {
    tone(m, note / 2, end, 1.8, { type: 'triangle', gain: 0.08, attack: 0.25 });
  }
  for (let i = 0; i < 8; i++) {
    tone(m, pick(SOUND_SCALE.slice(5)) * 2, end + i * 0.07 + Math.random() * 0.04, 0.3, { gain: 0.05 });
  }
}
