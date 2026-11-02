import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { initializePlatform, platformReady, continueAfterLevel, rewardedAds } from '../src/platform/pikabu.ts';
import { getSettings } from '../src/settings.ts';

test('Pikabu build still starts in Russian without saves outside the platform', async () => {
  globalThis.window = new EventTarget();
  globalThis.document = Object.assign(new EventTarget(), { hidden: false, createElement: () => ({}), head: { append(script) { script.onerror(); } } });
  const game = { input: { enabled: true }, scene: { getScenes: () => [] }, events: new EventEmitter() };
  await initializePlatform(game);
  assert.equal(getSettings().language, 'ru');
  assert.equal(rewardedAds.available, false);
  assert.equal((await rewardedAds.show()).status, 'unavailable');
  platformReady();
  let moved = false; continueAfterLevel(() => { moved = true; }); assert.equal(moved, true);
  game.events.emit('destroy');
});
