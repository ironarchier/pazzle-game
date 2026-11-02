import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { initializePlatform, platformReady, continueAfterLevel, rewardedAds, PIKABU } from '../src/platform/pikabu.ts';
import { getProgress } from '../src/progress.ts';
import { getSettings } from '../src/settings.ts';
import { SAVE_STORAGE_KEY, SETTINGS_STORAGE_KEY } from '../src/constants.ts';

const tick = () => new Promise(resolve => setImmediate(resolve));

test('Pikabu adapter restores cloud saves in Russian, pays only for watched ads and spaces fullscreen ads', async () => {
  const values = new Map([
    [SAVE_STORAGE_KEY, JSON.stringify({ version: 1, catalogueRevision: 2, revision: 5, completed: [0], current: 1, economy: { balance: 175 } })],
    [SETTINGS_STORAGE_KEY, JSON.stringify({ sound: false, music: true, theme: 'dark' })],
  ]);
  const calls = { started: 0, flush: 0, fullscreen: 0 };
  let rewarded = { rendered: true, reward: true }, canShowRewarded = true;
  const sdk = {
    gameStarted() { calls.started++; },
    on() { return () => {}; },
    storage: { get: key => values.get(key), set: (key, value) => values.set(key, value), async flush() { calls.flush++; return { success: true }; } },
    ads: {
      rewarded: { isSupported: true, canShow: async () => canShowRewarded, show: async () => rewarded },
      fullscreen: { isSupported: true, canShow: async () => true, show: async () => { calls.fullscreen++; return { rendered: true }; } },
    },
  };
  const scripts = [];
  globalThis.window = Object.assign(new EventTarget(), {});
  globalThis.document = Object.assign(new EventTarget(), {
    hidden: false, createElement: () => ({}),
    head: { append(script) { scripts.push(script.src); globalThis.window.PkbSDK = { init: async () => sdk }; script.onload(); } },
  });
  const game = { input: { enabled: true }, scene: { getScenes: () => [] }, events: new EventEmitter() };
  const realNow = Date.now;
  let now = realNow();
  Date.now = () => now;
  try {
    await initializePlatform(game);
    assert.deepEqual(scripts, [PIKABU.sdkUrl]);
    assert.equal(getSettings().language, 'ru');
    assert.equal(getSettings().sound, false);
    assert.equal(getProgress().economy.balance, 175);
    assert.equal(rewardedAds.available, true);

    platformReady(); platformReady();
    assert.equal(calls.started, 1);

    const before = getProgress().economy.balance;
    assert.equal((await rewardedAds.show()).status, 'rewarded');
    assert.ok(getProgress().economy.balance > before, 'a watched ad pays coins');
    assert.match(values.get(SAVE_STORAGE_KEY), new RegExp(`"balance":${getProgress().economy.balance}`), 'the balance goes to cloud storage');
    const paid = getProgress().economy.balance;
    rewarded = { rendered: true, reward: false };
    assert.equal((await rewardedAds.show()).status, 'closed');
    rewarded = { rendered: false, reason: 'UI_BUSY' };
    assert.equal((await rewardedAds.show()).status, 'error');
    canShowRewarded = false;
    assert.equal((await rewardedAds.show()).status, 'error');
    assert.equal(getProgress().economy.balance, paid, 'skipped or missing ads pay nothing');

    let moved = 0;
    continueAfterLevel(() => moved++);
    assert.equal(moved, 1); assert.equal(calls.fullscreen, 0, 'no fullscreen ad in the first two minutes');
    now += PIKABU.interstitialGapMs;
    continueAfterLevel(() => moved++);
    await tick(); await tick();
    assert.equal(calls.fullscreen, 1); assert.equal(moved, 2);
    now += PIKABU.interstitialGapMs;
    canShowRewarded = true; rewarded = { rendered: true, reward: true };
    await rewardedAds.show();
    continueAfterLevel(() => moved++);
    assert.equal(calls.fullscreen, 1, 'no fullscreen ad right after a rewarded one'); assert.equal(moved, 3);

    globalThis.document.hidden = true;
    globalThis.document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(calls.flush, 1, 'hiding the page uploads the save');
  } finally {
    Date.now = realNow;
    game.events.emit('destroy');
  }
});
