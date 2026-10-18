import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RewardedAds } from '../src/platform/RewardedAds.ts';
import { ProgressStore } from '../src/progress.ts';
import { SHOP_ALBUMS, SAVE_STORAGE_KEY } from '../src/constants.ts';
import { offerState } from '../src/economy/offer.ts';

const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(balance = 0) {
  const values = { [SAVE_STORAGE_KEY]: JSON.stringify({ version: 1, completed: [], current: 0, economy: { balance } }) };
  const store = new ProgressStore({ getItem: key => values[key] ?? null, setItem: (key, value) => { values[key] = value; } });
  let callbacks, requests = 0, receipts = 0, paused = 0, resumed = 0;
  const sdk = { adv: { showRewardedVideo(options) { requests++; callbacks = options.callbacks; } } };
  const ads = new RewardedAds(async () => sdk, id => store.rewardAd(id), () => { paused++; return () => { resumed++; }; }, () => 'test-ad-' + ++receipts);
  return { store, sdk, ads, get callbacks() { return callbacks; }, get requests() { return requests; }, get paused() { return paused; }, get resumed() { return resumed; } };
}

test('onRewarded grants and saves immediately exactly once; onClose only completes the session', async () => {
  const f = fixture(); const pending = f.ads.show(); await tick();
  f.callbacks.onOpen(); f.callbacks.onOpen();
  assert.equal(f.paused, 1);
  assert.equal(f.store.get().economy.balance, 0);
  f.callbacks.onRewarded(); f.callbacks.onRewarded();
  assert.equal(f.store.get().economy.balance, 25);
  assert.equal(f.ads.busy, true);
  assert.equal((await f.ads.show()).status, 'busy');
  assert.equal(f.requests, 1);
  f.callbacks.onClose(); f.callbacks.onError();
  assert.deepEqual(await pending, { status: 'rewarded', coins: 25 });
  assert.equal(f.resumed, 1);
  assert.equal(f.ads.busy, false);
  f.callbacks.onRewarded();
  assert.equal(f.store.get().economy.balance, 25);
});

test('closed, unavailable, throwing and rejected SDK requests never mint coins', async () => {
  const f = fixture();
  let pending = f.ads.show(); await tick(); f.callbacks.onClose(false);
  assert.deepEqual(await pending, { status: 'closed', coins: 0 });
  pending = f.ads.show(); await tick(); f.callbacks.onOpen(); f.callbacks.onError(new Error('SDK unavailable'));
  assert.deepEqual(await pending, { status: 'error', coins: 0 });
  const late = f.callbacks; late.onRewarded();
  assert.equal(f.store.get().economy.balance, 0);
  assert.equal(f.resumed, 1);
  for (const provider of [async () => undefined, async () => { throw new Error('init'); }, async () => ({ adv: { showRewardedVideo() { throw new Error('show'); } } }), async () => ({ adv: { showRewardedVideo() { return Promise.reject(new Error('async show')); } } })]) {
    const ads = new RewardedAds(provider, () => { throw new Error('must never credit'); });
    assert.equal((await ads.show()).coins, 0);
    assert.equal(ads.busy, false);
  }
});

test('a missing open/close callback fails safely before an ad opens; no global view-count cap', async () => {
  const ads = new RewardedAds(async () => ({ adv: { showRewardedVideo() {} } }), () => { throw new Error('must not credit'); }, undefined, undefined, 5);
  assert.deepEqual(await ads.show(), { status: 'unavailable', coins: 0 });
  assert.equal(ads.busy, false);
  const f = fixture();
  for (let i = 0; i < 30; i++) {
    const pending = f.ads.show(); await tick(); f.callbacks.onOpen(); f.callbacks.onRewarded(); f.callbacks.onClose();
    assert.equal((await pending).coins, 25);
  }
  assert.equal(f.store.get().economy.balance, 750);
});

test('150 → 175 → 200 keeps the offer open and never buys an album until explicit confirmation', async () => {
  const f = fixture(150), album = SHOP_ALBUMS[0];
  const intent = { kind: 'album', albumId: album.id, title: album.title };
  assert.equal(offerState(intent, f.store.get().economy.balance).shortfall, 50);
  for (const expected of [175, 200]) {
    const pending = f.ads.show(); await tick(); f.callbacks.onOpen(); f.callbacks.onRewarded();
    assert.equal(f.store.get().economy.balance, expected);
    assert.deepEqual(f.store.get().economy.purchasedAlbums, []);
    f.callbacks.onClose(); await pending;
  }
  assert.equal(offerState(intent, f.store.get().economy.balance).affordable, true);
  assert.equal(f.store.buyAlbum(album.id).status, 'bought');
  assert.equal(f.store.get().economy.balance, 0);
  assert.deepEqual(f.store.get().economy.purchasedAlbums, [album.id]);
});

test('another click is rejected even while SDK initialization is still pending', async () => {
  let release;
  const sdkReady = new Promise(resolve => { release = resolve; });
  const ads = new RewardedAds(() => sdkReady, () => { throw new Error('must not credit'); });
  const pending = ads.show();
  assert.deepEqual(await ads.show(), { status: 'busy', coins: 0 });
  release(undefined);
  assert.deepEqual(await pending, { status: 'unavailable', coins: 0 });
});

test('unresponsive SDK initialization times out without coins and leaves a retry available', async () => {
  const ads = new RewardedAds(() => new Promise(() => {}), () => { throw new Error('must not credit'); }, undefined, undefined, 5);
  assert.deepEqual(await ads.show(), { status: 'unavailable', coins: 0 });
  assert.equal(ads.busy, false);
});
