import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { initializePlatform, platformReady, setGameplayActive, rewardedAds, continueAfterLevel } from '../src/platform/index.ts';
import { getProgress } from '../src/progress.ts';
import { SAVE_STORAGE_KEY } from '../src/constants.ts';

test('default facade keeps native Yandex storage, ready/gameplay callbacks, rewarded ads and synchronous level transitions', async () => {
  const oldWindow = globalThis.window, oldLocation = globalThis.location;
  const values = new Map([[SAVE_STORAGE_KEY, JSON.stringify({ version: 1, catalogueRevision: 2, revision: 5, current: 0, completed: [], economy: { balance: 175 } })]]);
  let callbacks, ready = 0, starts = 0, stops = 0, paused = false;
  const native = {
    adv: { showRewardedVideo(options) { callbacks = options.callbacks; } },
    async getStorage() { return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; },
    features: { LoadingAPI: { ready() { ready++; } }, GameplayAPI: { start() { starts++; }, stop() { stops++; } } },
  };
  globalThis.window = { YaGames: { async init() { return native; } } };
  globalThis.location = { hostname: 'localhost' };
  const scene = { sys: { isPaused: () => paused }, scene: { pause() { paused = true; }, resume() { paused = false; } } };
  const game = { events: new EventEmitter(), scene: { getScenes: () => [scene] } };
  try {
    await initializePlatform(game);
    assert.equal(getProgress().economy.balance, 175);
    platformReady(); platformReady(); assert.equal(ready, 1);
    setGameplayActive(true); assert.equal(starts, 1);
    const pending = rewardedAds.show(); await new Promise(resolve => setImmediate(resolve));
    callbacks.onOpen(); assert.equal(paused, true); assert.equal(stops, 1);
    callbacks.onRewarded(); callbacks.onRewarded();
    assert.equal(getProgress().economy.balance, 200);
    callbacks.onClose(); assert.deepEqual(await pending, { status: 'rewarded', coins: 25 });
    assert.equal(paused, false); assert.equal(starts, 2);
    assert.equal(JSON.parse(values.get(SAVE_STORAGE_KEY)).economy.balance, 200);
    let continued = false; continueAfterLevel(() => { continued = true; }); assert.equal(continued, true);
    setGameplayActive(false); assert.equal(stops, 2);
  } finally {
    if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
    if (oldLocation === undefined) delete globalThis.location; else globalThis.location = oldLocation;
  }
});
