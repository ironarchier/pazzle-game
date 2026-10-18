import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { initAudio, preloadMusic, playClick, setAudioSuspended } from '../src/audio.ts';
import { updateSettings } from '../src/settings.ts';
import { MUSIC } from '../src/constants.ts';

let sound;
const previousDocument = globalThis.document;
beforeEach(() => {
  globalThis.document = Object.assign(new EventTarget(), { hidden: false });
  updateSettings({ music: true, sound: true });
});
afterEach(() => {
  setAudioSuspended(false);
  sound?.game.events.emit('destroy');
  sound = undefined;
  if (previousDocument === undefined) delete globalThis.document;
  else globalThis.document = previousDocument;
});

test('ad pause silences music and new effects, then respects the latest user preference', () => {
  const m = manager(); initAudio(m);
  playClick();
  const before = m.effects.length;
  setAudioSuspended(true);
  assert.equal(m.track.isPaused, true);
  playClick();
  assert.equal(m.effects.length, before);
  updateSettings({ music: false });
  setAudioSuspended(false);
  assert.equal(m.track.isPlaying, false);
  playClick();
  assert.equal(m.effects.length, before + 1);
  updateSettings({ music: true });
  assert.equal(m.track.isPlaying, true);
});
function manager({ locked = false, available = true } = {}) {
  const instance = Object.assign(new EventEmitter(), {
    locked, added: [], effects: [],
    game: { events: new EventEmitter(), cache: { audio: { exists: () => available } } },
    track: {
      isPlaying: false, isPaused: false, plays: 0, pauses: 0, resumes: 0, destroyed: false,
      play() { this.isPlaying = true; this.isPaused = false; this.plays++; return true; },
      pause() { this.isPlaying = false; this.isPaused = true; this.pauses++; return true; },
      resume() { this.isPlaying = true; this.isPaused = false; this.resumes++; return true; },
      destroy() { this.destroyed = true; this.isPlaying = false; },
    },
    add(key, config) { this.added.push({ key, config }); return this.track; },
    play(key) { this.effects.push(key); return true; },
  });
  const parameter = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect(target) { return target; }, gain: parameter(), frequency: parameter(), start() {}, stop() {} });
  instance.context = {
    state: 'running', currentTime: 0, sampleRate: 8000, destination: node(),
    createGain: node, createDynamicsCompressor: node, createConvolver: node,
    createBuffer: (_channels, length) => ({ getChannelData: () => new Float32Array(length) }),
    createBufferSource: node, createBiquadFilter: node,
    createOscillator: () => { instance.effects.push('tone'); return node(); },
  };
  sound = instance;
  return instance;
}
function visibility(hidden) {
  document.hidden = hidden;
  document.dispatchEvent(new Event('visibilitychange'));
}

test('preload includes only the soundtrack; updated effects are synthesized', () => {
  const loads = [];
  preloadMusic({ audio: (key, path) => loads.push({ key, path }) });
  assert.deepEqual(loads, [{ key: MUSIC.key, path: MUSIC.path }]);
});

test('audio waits for browser unlock and checks the latest music preference', () => {
  const m = manager({ locked: true });
  initAudio(m);
  assert.equal(m.track.plays, 0);
  updateSettings({ music: false });
  m.locked = false; m.emit('unlocked');
  assert.equal(m.track.plays, 0);
  updateSettings({ music: true });
  assert.equal(m.track.plays, 1);
  assert.deepEqual(m.added, [{ key: MUSIC.key, config: { loop: true, volume: MUSIC.volume } }]);
});

test('music toggle pauses and resumes the same track independently from effects', () => {
  const m = manager(); initAudio(m); initAudio(m);
  assert.equal(m.added.length, 1);
  updateSettings({ sound: false }); playClick();
  assert.equal(m.effects.length, 0);
  assert.equal(m.track.isPlaying, true);
  updateSettings({ music: false, sound: true }); playClick();
  assert.equal(m.track.isPlaying, false);
  assert.equal(m.track.pauses, 1);
  assert.deepEqual(m.effects, ['tone']);
  updateSettings({ music: true });
  assert.equal(m.track.resumes, 1);
  assert.equal(m.track.plays, 1);
});

test('hidden tab pauses music and returning never overrides a disabled music setting', () => {
  const m = manager(); initAudio(m);
  visibility(true);
  assert.equal(m.track.isPaused, true);
  visibility(false);
  assert.equal(m.track.resumes, 1);
  visibility(true);
  updateSettings({ music: false });
  visibility(false);
  assert.equal(m.track.isPlaying, false);
  assert.equal(m.track.resumes, 1);
});

test('settings still change playback immediately if persistent storage is blocked', () => {
  const m = manager(); initAudio(m);
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem() { throw new Error('blocked'); } } });
    updateSettings({ music: false });
    assert.equal(m.track.isPaused, true);
    updateSettings({ music: true });
    assert.equal(m.track.isPlaying, true);
  } finally { Object.defineProperty(globalThis, 'localStorage', original); }
});

test('destroying a game removes listeners and a missing soundtrack leaves effects usable', () => {
  const m = manager(); initAudio(m);
  m.game.events.emit('destroy');
  assert.equal(m.listenerCount('unlocked'), 0);
  updateSettings({ music: false }); visibility(true);
  assert.equal(m.track.pauses, 0);
  const withoutMusic = manager({ available: false });
  assert.doesNotThrow(() => initAudio(withoutMusic));
  assert.equal(withoutMusic.added.length, 0);
  playClick();
  assert.deepEqual(withoutMusic.effects, ['tone']);
});
