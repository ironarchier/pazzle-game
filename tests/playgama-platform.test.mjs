import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { EVENT_NAME } from '@playgama/bridge/constants';
import { initializePlatform, platformReady, setGameplayActive, continueAfterLevel } from '../src/platform/playgama.ts';
import { getProgress } from '../src/progress.ts';
import { getSettings } from '../src/settings.ts';
import { SAVE_STORAGE_KEY, SETTINGS_STORAGE_KEY } from '../src/constants.ts';
import { withTimeout } from '../src/platform/withTimeout.ts';

test('Playgama adapter waits for hydration, protects unread saves, applies initial host pause/audio and cleans up listeners', async () => {
  const previous = { bridge: globalThis.bridge, window: globalThis.window, document: globalThis.document };
  globalThis.window = new EventTarget();
  globalThis.document = Object.assign(new EventTarget(), { hidden: false });
  const platform = Object.assign(new EventEmitter(), { language: 'en', isAudioEnabled: false, isPaused: true, messages: [], async sendMessage(message) { this.messages.push(message); } });
  const advertisement = Object.assign(new EventEmitter(), { isInterstitialSupported: false });
  let read, initialized = false, writes = 0;
  const values = new Map([
    [SAVE_STORAGE_KEY, JSON.stringify({ version: 1, catalogueRevision: 2, revision: 5, completed: [0], current: 1, economy: { balance: 175 } })],
    [SETTINGS_STORAGE_KEY, JSON.stringify({ language: 'ru', sound: false, music: false, theme: 'dark' })],
  ]);
  const bridge = { EVENT_NAME, platform, advertisement,
    async initialize() { initialized = true; },
    storage: { get(keys) { assert.equal(initialized, true); return new Promise(resolve => { read = () => resolve(keys.map(key => values.get(key) ?? null)); }); },
      async set(keys, data) { writes++; keys.forEach((key, i) => values.set(key, data[i])); } },
  };
  const game = { input: { enabled: true }, scene: { getScenes: () => [] }, events: new EventEmitter() };
  try {
    globalThis.bridge = undefined;
    await assert.rejects(initializePlatform(game));
    globalThis.bridge = { ...bridge, storage: { ...bridge.storage, async get() { throw new Error('offline'); } } };
    await assert.rejects(initializePlatform(game)); assert.equal(writes, 0);
    globalThis.bridge = { ...bridge, storage: { ...bridge.storage, async get() { return ['broken JSON', null]; } } };
    await assert.rejects(initializePlatform(game)); assert.equal(writes, 0);
    globalThis.bridge = bridge;
    let completed = false;
    const pending = initializePlatform(game).then(() => { completed = true; });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(completed, false); assert.equal(writes, 0);
    read(); await pending;
    assert.equal(getProgress().economy.balance, 175);
    assert.deepEqual(getProgress().completed, [0]);
    assert.equal(getSettings().language, 'ru'); assert.equal(getSettings().theme, 'dark');
    assert.equal(game.input.enabled, false);
    platform.emit(EVENT_NAME.PAUSE_STATE_CHANGED, false); assert.equal(game.input.enabled, true);
    platformReady(); platformReady(); setGameplayActive(true); setGameplayActive(true); setGameplayActive(false);
    assert.deepEqual(platform.messages, ['game_ready', 'gameplay_started', 'gameplay_stopped']);
    let transitions = 0;
    continueAfterLevel(() => { transitions++; }); continueAfterLevel(() => { transitions++; });
    await new Promise(resolve => setImmediate(resolve)); assert.equal(transitions, 1);
    game.events.emit('destroy');
    assert.equal(platform.listenerCount(EVENT_NAME.PAUSE_STATE_CHANGED), 0);
    assert.equal(platform.listenerCount(EVENT_NAME.AUDIO_STATE_CHANGED), 0);
    assert.equal(game.events.listenerCount('poststep'), 0);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});

test('unresponsive initialization is bounded and successful requests clear their timeout', async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 5), /timed out/);
  assert.equal(await withTimeout(Promise.resolve(42), 1000), 42);
});
