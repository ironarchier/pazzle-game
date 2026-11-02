import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { EVENT_NAME } from '@playgama/bridge/constants';
import { BridgeAds } from '../src/platform/BridgeAds.ts';
import { BridgeStorage } from '../src/platform/BridgeStorage.ts';
import { PauseController } from '../src/platform/PauseController.ts';
import { RewardedAds } from '../src/platform/RewardedAds.ts';
import { ProgressStore } from '../src/progress.ts';
import { SAVE_STORAGE_KEY, SETTINGS_STORAGE_KEY, SHOP_ALBUMS } from '../src/constants.ts';
import { configureSettingsStorage, getSettings, updateSettings } from '../src/settings.ts';

const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(timeout = 50) {
  const advertisement = Object.assign(new EventEmitter(), {
    isRewardedSupported: true, isInterstitialSupported: true, rewardedState: 'closed', interstitialState: 'closed', requests: [],
    showRewarded(placement) { this.requests.push(['rewarded', placement]); },
    showInterstitial(placement) { this.requests.push(['interstitial', placement]); },
  });
  const transport = new BridgeAds({ advertisement, EVENT_NAME }, timeout);
  const values = new Map();
  const store = new ProgressStore({ getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) });
  let paused = 0, resumed = 0, receipt = 0;
  const pause = () => { paused++; return () => { resumed++; }; };
  const ads = new RewardedAds(async () => transport.busy ? undefined : transport, id => store.rewardAd(id), pause, () => `bridge-test-${++receipt}`, timeout + 50);
  const state = (value, kind = 'rewarded') => {
    advertisement[kind + 'State'] = value;
    advertisement.emit(kind === 'rewarded' ? EVENT_NAME.REWARDED_STATE_CHANGED : EVENT_NAME.INTERSTITIAL_STATE_CHANGED, value);
  };
  return { advertisement, transport, ads, store, values, pause, state, get paused() { return paused; }, get resumed() { return resumed; } };
}

test('Bridge rewarded is terminal: one persistent 25-coin reward without requiring a subsequent closed event', async () => {
  const f = fixture();
  const pending = f.ads.show(); await tick();
  assert.equal((await f.ads.show()).status, 'busy');
  f.state('loading'); f.state('opened'); f.state('opened');
  assert.equal(f.paused, 1);
  assert.equal(f.store.get().economy.balance, 0);
  f.state('rewarded'); f.state('rewarded'); f.state('closed');
  assert.deepEqual(await pending, { status: 'rewarded', coins: 25 });
  assert.equal(f.resumed, 1);
  assert.equal(f.ads.busy, false);
  assert.equal(f.transport.busy, false);
  assert.equal(f.advertisement.listenerCount(EVENT_NAME.REWARDED_STATE_CHANGED), 0);
  const reloaded = new ProgressStore({ getItem: key => f.values.get(key) ?? null, setItem() {} });
  assert.equal(reloaded.get().economy.balance, 25);
  assert.deepEqual(f.advertisement.requests, [['rewarded', 'coins']]);
});

test('Bridge cancellation, failure, unsupported ads and out-of-session reward events never grant coins', async () => {
  for (const state of ['closed', 'failed']) {
    const f = fixture(); const pending = f.ads.show(); await tick();
    f.state('opened'); f.state(state); f.state('rewarded');
    assert.equal((await pending).coins, 0);
    assert.equal(f.store.get().economy.balance, 0);
    assert.equal(f.resumed, 1);
  }
  const f = fixture(); f.advertisement.isRewardedSupported = false;
  assert.equal((await f.ads.show()).coins, 0);
  assert.equal(f.advertisement.requests.length, 0);
  f.state('rewarded'); assert.equal(f.store.get().economy.balance, 0);
});

test('Bridge missing open times out, removes listeners and ignores late rewards; synchronous failure releases lock', async () => {
  const f = fixture(5);
  assert.equal((await f.ads.show()).coins, 0);
  assert.equal(f.transport.busy, false);
  assert.equal(f.advertisement.listenerCount(EVENT_NAME.REWARDED_STATE_CHANGED), 0);
  f.state('rewarded'); assert.equal(f.store.get().economy.balance, 0);
  f.advertisement.showRewarded = () => { throw new Error('SDK failure'); };
  assert.equal((await f.ads.show()).coins, 0);
  assert.equal(f.transport.busy, false);
});

test('an opened Bridge ad has no game-imposed playback timeout', async () => {
  const f = fixture(5); const pending = f.ads.show(); await tick(); f.state('opened');
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(f.ads.busy, true);
  assert.equal(f.transport.busy, true);
  f.state('rewarded'); assert.equal((await pending).coins, 25);
});

test('Bridge interstitial is serialized with rewarded, pauses/restores and never changes the economy', async () => {
  const f = fixture();
  const pending = f.transport.showInterstitial(f.pause);
  f.state('opened', 'interstitial');
  assert.equal((await f.ads.show()).coins, 0);
  f.state('closed', 'interstitial'); await pending;
  assert.equal(f.paused, 1); assert.equal(f.resumed, 1);
  assert.equal(f.store.get().economy.balance, 0);
  assert.equal(f.advertisement.listenerCount(EVENT_NAME.INTERSTITIAL_STATE_CHANGED), 0);
  assert.deepEqual(f.advertisement.requests, [['interstitial', 'level_completed']]);
  f.advertisement.isInterstitialSupported = false;
  await f.transport.showInterstitial(f.pause);
  assert.equal(f.advertisement.requests.length, 1);
});

test('failed or missing interstitial callbacks do not block level continuation', async () => {
  const f = fixture(5);
  let pending = f.transport.showInterstitial(f.pause);
  f.state('failed', 'interstitial'); await pending;
  pending = f.transport.showInterstitial(f.pause); await pending;
  assert.equal(f.transport.busy, false);
});

test('Bridge Storage hydrates the complete existing save before use and retains purchased albums, coins and active assembly', async () => {
  const active = { level: 0, rows: 3, cols: 3, seed: 43, placed: [], groups: [], tray: [0, 1, 2, 3, 4, 5, 6, 7, 8], scroll: 0 };
  const original = { version: 1, catalogueRevision: 2, revision: 9, current: 0, completed: [6], active, economy: { balance: 175, purchasedAlbums: [SHOP_ALBUMS[0].id], rewardedLevels: [6], adReceipts: ['old-ad'], hintReceipts: [] } };
  const values = new Map([[SAVE_STORAGE_KEY, JSON.stringify(original)]]);
  const api = {
    async get(keys, parse) { assert.equal(parse, false); return keys.map(key => values.get(key) ?? null); },
    async set(keys, data) { keys.forEach((key, i) => values.set(key, data[i])); },
  };
  const storage = new BridgeStorage(api);
  await storage.load([SAVE_STORAGE_KEY, SETTINGS_STORAGE_KEY]);
  const store = new ProgressStore(storage);
  assert.equal(store.get().economy.balance, 175);
  assert.deepEqual(store.get().economy.purchasedAlbums, original.economy.purchasedAlbums);
  assert.deepEqual(store.get().active, active);
  assert.deepEqual(store.get().completed, [6]);
  assert.equal(store.rewardAd('old-ad'), false);
  store.rewardAd('new-ad'); await storage.flush();
  const restored = JSON.parse(values.get(SAVE_STORAGE_KEY));
  assert.equal(restored.economy.balance, 200);
  assert.deepEqual(restored.active, active);
  assert.equal(restored.version, 1);
  storage.dispose();
});

test('Bridge Storage serializes concurrent writes so an older balance cannot overwrite a newer one', async () => {
  let release;
  const writes = [];
  const storage = new BridgeStorage({ async get(keys) { return keys.map(() => null); }, async set(keys, values) {
    writes.push([keys, values]);
    if (writes.length === 1) await new Promise(resolve => { release = resolve; });
  } });
  await storage.load(['save']);
  storage.setItem('save', '175'); storage.setItem('save', '200'); storage.setItem('settings', 'off');
  assert.equal(storage.getItem('save'), '200');
  assert.equal(writes.length, 1);
  release(); await storage.flush();
  assert.deepEqual(writes, [[['save'], ['175']], [['save', 'settings'], ['200', 'off']]]);
  storage.dispose();
});

test('failed Bridge reads never write; failed writes retain the newest snapshot for retry', async () => {
  let writes = 0, fail = true;
  const storage = new BridgeStorage({ async get() { throw new Error('offline'); }, async set() { writes++; if (fail) throw new Error('offline'); } }, () => {});
  await assert.rejects(storage.load(['save'])); assert.equal(writes, 0);
  storage.setItem('save', '175'); await assert.rejects(storage.flush()); await tick();
  assert.equal(storage.getItem('save'), '175');
  fail = false; await storage.flush(); assert.equal(writes, 2);
  storage.dispose();
});

test('Bridge settings use platform language for new players, preserve user choices and save through SDK storage', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  configureSettingsStorage(storage, 'ru-RU'); assert.equal(getSettings().language, 'ru');
  configureSettingsStorage(storage, 'fr'); assert.equal(getSettings().language, 'en');
  updateSettings({ language: 'ru', music: false, theme: 'dark' });
  configureSettingsStorage(storage, 'en');
  assert.equal(getSettings().language, 'ru'); assert.equal(getSettings().music, false); assert.equal(getSettings().theme, 'dark');
  assert.equal(JSON.parse(values.get(SETTINGS_STORAGE_KEY)).language, 'ru');
});

test('overlapping platform, ad, visibility and audio pauses resume only owned scenes and preserve input/audio preferences', () => {
  const scene = (initial = false) => {
    let paused = initial;
    return { sys: { isPaused: () => paused }, scene: { pause() { paused = true; }, resume() { paused = false; } } };
  };
  const active = scene(), other = scene(true), late = scene();
  const scenes = [active, other];
  const game = { input: { enabled: true }, scene: { getScenes: () => scenes.filter(item => !item.sys.isPaused()) } };
  const audio = [];
  const pause = new PauseController(game, value => audio.push(value));
  pause.setPaused('platform', true); pause.setPaused('ad', true); pause.setAudioEnabled(false);
  assert.equal(game.input.enabled, false); assert.equal(active.sys.isPaused(), true);
  scenes.push(late); pause.enforce(); assert.equal(late.sys.isPaused(), true);
  pause.setPaused('ad', false); assert.equal(active.sys.isPaused(), true);
  pause.setPaused('hidden', true); pause.setPaused('platform', false);
  assert.equal(game.input.enabled, false);
  pause.setPaused('hidden', false);
  assert.equal(active.sys.isPaused(), false); assert.equal(late.sys.isPaused(), false);
  assert.equal(other.sys.isPaused(), true); assert.equal(game.input.enabled, true);
  assert.equal(audio.at(-1), true);
  pause.setAudioEnabled(true); assert.equal(audio.at(-1), false);
  game.input.enabled = false;
  pause.setPaused('ad', true); pause.setPaused('ad', false); assert.equal(game.input.enabled, false);
});
