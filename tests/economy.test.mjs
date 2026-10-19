import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ProgressStore, readProgress, isUnlocked } from '../src/progress.ts';
import { ALBUMS, FREE_ALBUMS, SHOP_ALBUMS, LEVELS, SAVE_STORAGE_KEY, getAlbumLevels } from '../src/constants.ts';
import { ECONOMY } from '../src/economy/config.ts';
import { offerState } from '../src/economy/offer.ts';
import { updateSettings } from '../src/settings.ts';
import { CATALOGUE_REVISION } from '../src/catalogueMigration.ts';

function fixture(balance = 0, extra = {}) {
  const data = { [SAVE_STORAGE_KEY]: JSON.stringify({ version: 1, catalogueRevision: CATALOGUE_REVISION, current: 0, completed: [], revision: 1, economy: { balance, purchasedAlbums: [], rewardedLevels: [], adReceipts: [], hintReceipts: [] }, ...extra }) };
  const storage = { getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = value; } };
  return { store: new ProgressStore(storage), storage, data };
}

test('incoming main free images, translations, order and difficulty remain unchanged by the economy', () => {
  const old = JSON.parse(readFileSync(new URL('./fixtures/free-catalogue.json', import.meta.url), 'utf8'));
  assert.deepEqual(FREE_ALBUMS.slice(0, old.albums.length), old.albums);
  assert.deepEqual(LEVELS.slice(0, old.levels.length), old.levels);
  assert.equal(FREE_ALBUMS[5].id, 'hunter-x-hunter');
});

test('each first clear pays exactly the configured reward; all six free albums pay 900 total', () => {
  const { store } = fixture();
  for (const album of FREE_ALBUMS) {
    let albumTotal = 0;
    getAlbumLevels(album.id).forEach((id, slot) => {
      const before = store.get().economy.balance;
      assert.equal(store.complete(id), true);
      const earned = store.get().economy.balance - before;
      assert.equal(earned, [10, 15, 20, 25, 35, 45][slot]);
      albumTotal += earned;
      assert.equal(store.complete(id), false);
      assert.equal(store.get().economy.balance, before + earned);
    });
    assert.equal(albumTotal, 150);
  }
  assert.equal(store.get().economy.balance, 900);
});

test('old completions migrate as settled without retroactive coins or lost assembly', () => {
  const active = { level: 2, rows: 5, cols: 5, seed: 44, placed: [], groups: [], tray: Array.from({ length: 25 }, (_, i) => i), scroll: 0 };
  const { store, storage } = fixture(0, { completed: [0, 1], active, economy: undefined });
  assert.deepEqual(store.get().completed, [0, 1]);
  assert.deepEqual(store.get().active, active);
  assert.equal(store.get().economy.balance, 0);
  assert.deepEqual(store.get().economy.rewardedLevels, [0, 1]);
  assert.equal(store.complete(0), false);
  assert.equal(store.get().economy.balance, 0);
  assert.equal(store.complete(2), true);
  assert.equal(store.get().economy.balance, 20);
  assert.equal(new ProgressStore(storage).complete(2), false);
  assert.equal(new ProgressStore(storage).get().economy.balance, 20);
});

test('buying every new album costs 200 exactly, persists and never charges twice', () => {
  for (const album of SHOP_ALBUMS) {
    const { store, storage } = fixture(200);
    const ids = getAlbumLevels(album.id);
    assert.equal(isUnlocked(ids[0], [], []), false);
    assert.equal(store.complete(ids[0]), false);
    assert.deepEqual(store.buyAlbum(album.id), { status: 'bought', balance: 0 });
    assert.deepEqual(store.buyAlbum(album.id), { status: 'owned', balance: 0 });
    const reloaded = new ProgressStore(storage);
    assert.deepEqual(reloaded.get().economy.purchasedAlbums, [album.id]);
    assert.equal(isUnlocked(ids[0], [], reloaded.get().economy.purchasedAlbums), true);
    assert.equal(isUnlocked(ids[1], [], reloaded.get().economy.purchasedAlbums), false);
    for (const id of ids) assert.equal(reloaded.complete(id), true);
    assert.equal(reloaded.get().economy.balance, 150);
    for (const id of ids) assert.equal(reloaded.complete(id), false);
    assert.equal(reloaded.get().economy.balance, 150);
  }
});

test('insufficient, invalid, free and unavailable purchases never spend coins', () => {
  const { store } = fixture(199);
  assert.equal(store.buyAlbum(SHOP_ALBUMS[0].id).status, 'insufficient');
  assert.equal(store.buyAlbum('missing').status, 'invalid');
  assert.equal(store.buyAlbum(FREE_ALBUMS[0].id).status, 'invalid');
  const album = SHOP_ALBUMS[0], previous = album.ready;
  album.ready = false;
  try { assert.equal(fixture(1000).store.buyAlbum(album.id).status, 'unavailable'); }
  finally { album.ready = previous; }
  assert.equal(store.get().economy.balance, 199);
});

test('ad receipts survive reloads and shared-storage clients cannot replay a receipt', () => {
  const { store, storage } = fixture(0);
  const second = new ProgressStore(storage);
  assert.equal(store.rewardAd('receipt-one'), true);
  assert.equal(second.rewardAd('receipt-one'), false);
  assert.equal(second.get().economy.balance, 25);
  assert.equal(second.rewardAd('receipt-two'), true);
  assert.equal(store.get().economy.balance, 50);
  assert.equal(new ProgressStore(storage).rewardAd('receipt-two'), false);
  for (let i = 0; i < 200; i++) assert.equal(store.rewardAd('repeatable-' + i), true);
  assert.equal(store.get().economy.balance, 5050);
});

test('hints charge only on a useful successful application; failure, cancellation and repeat are free', () => {
  const { store, storage } = fixture(25);
  assert.equal(store.useHint('cancel', () => false), 'not-useful');
  assert.equal(store.useHint('error', () => { throw new Error('render failed'); }), 'not-useful');
  assert.equal(store.get().economy.balance, 25);
  let applied = 0;
  assert.equal(store.useHint('successful', () => { applied++; return true; }), 'used');
  assert.equal(store.get().economy.balance, 0);
  assert.equal(store.useHint('successful', () => { applied++; return true; }), 'duplicate');
  assert.equal(store.useHint('no-money', () => { applied++; return true; }), 'insufficient');
  assert.equal(new ProgressStore(storage).useHint('successful', () => true), 'duplicate');
  assert.equal(applied, 1);
});

test('offer calculations cover 150 to 175 to 200 and hint insufficiency without automatic spending', () => {
  updateSettings({ language: 'ru' });
  const intent = { kind: 'album', albumId: SHOP_ALBUMS[0].id, title: SHOP_ALBUMS[0].title };
  assert.equal(offerState(intent, 150).shortfall, 50);
  assert.equal(offerState(intent, 175).shortfall, 25);
  assert.match(offerState(intent, 175).button, /Смотреть рекламу/);
  assert.equal(offerState(intent, 200).affordable, true);
  assert.equal(offerState(intent, 200).message, 'Теперь ты можешь открыть этот альбом!');
  assert.equal(offerState(intent, 200).button, 'Купить альбом · 200 🪙');
  assert.equal(offerState({ kind: 'hint' }, 0).shortfall, 25);
  assert.equal(offerState({ kind: 'hint' }, 24).shortfall, 1);
  assert.equal(offerState({ kind: 'hint' }, 25).button, 'Купить подсказку · 25 🪙');
});

test('malformed wallet values and duplicate records are sanitized without losing free progress', () => {
  const data = { version: 1, current: 1, completed: [0], economy: { balance: -10, purchasedAlbums: ['missing', SHOP_ALBUMS[0].id, SHOP_ALBUMS[0].id], rewardedLevels: [0, 1, 999], adReceipts: ['one', 'one', null], hintReceipts: [] } };
  const progress = readProgress({ getItem: () => JSON.stringify(data) });
  assert.equal(progress.economy.balance, 0);
  assert.deepEqual(progress.completed, [0]);
  assert.deepEqual(progress.economy.purchasedAlbums, [SHOP_ALBUMS[0].id]);
  assert.deepEqual(progress.economy.rewardedLevels, [0]);
  assert.deepEqual(progress.economy.adReceipts, ['one']);
});

test('changing to SDK storage preserves valid local state when the remote slot is empty or corrupt', () => {
  for (const raw of [null, '{bad', 'null']) {
    const { store } = fixture(175, { completed: [0] });
    const values = { [SAVE_STORAGE_KEY]: raw };
    store.setStorage({ getItem: key => values[key], setItem: (key, value) => { values[key] = value; } });
    assert.equal(store.get().economy.balance, 175);
    assert.deepEqual(store.get().completed, [0]);
    assert.equal(JSON.parse(values[SAVE_STORAGE_KEY]).economy.balance, 175);
  }
});

test('storage failures retain atomic changes in memory and view failures never duplicate rewards', () => {
  const store = new ProgressStore({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });
  store.subscribe(() => { throw new Error('broken view'); });
  assert.equal(store.rewardAd('safe'), true);
  assert.equal(store.rewardAd('safe'), false);
  assert.equal(store.get().economy.balance, 25);
  assert.equal(store.useHint('hint', () => true), 'used');
  assert.equal(store.get().economy.balance, 0);
  assert.equal(ECONOMY.firstCompletionRewards.reduce((sum, n) => sum + n, 0), 150);
  assert.equal(ALBUMS.length, 12);
});

test('replacing the shop preserves free progress and owned replacements, refunds retired albums once', () => {
  const oldActive = { level: 36, rows: 3, cols: 3, seed: 67, placed: [], groups: [], tray: Array.from({ length: 9 }, (_, i) => i), scroll: 0 };
  const { store, storage } = fixture(75, { catalogueRevision: undefined, current: 36, completed: [0, 36, 37, 72], active: oldActive, economy: { balance: 75, purchasedAlbums: ['pact-city', 'night-bloom', 'night-bloom', 'huntress-atlas'], rewardedLevels: [0, 36, 37, 72], adReceipts: ['old-ad'], hintReceipts: ['old-hint'] } });
  const migrated = store.get();
  assert.equal(migrated.catalogueRevision, CATALOGUE_REVISION);
  assert.equal(migrated.economy.balance, 475);
  assert.deepEqual(migrated.completed, [0]);
  assert.deepEqual(migrated.economy.rewardedLevels, [0]);
  assert.deepEqual(migrated.economy.purchasedAlbums, ['pact-city']);
  assert.equal(migrated.active, undefined);
  assert.equal(store.rewardAd('old-ad'), false);
  assert.equal(store.useHint('old-hint', () => { throw new Error('replayed'); }), 'duplicate');
  assert.equal(store.rewardAd('new-ad'), true);
  assert.equal(new ProgressStore(storage).get().economy.balance, 500);
  assert.equal(store.complete(36), true);
  assert.equal(new ProgressStore(storage).get().economy.balance, 510);
  assert.deepEqual(new ProgressStore(storage).get().completed, [0, 36]);
  assert.equal(new ProgressStore(storage).complete(36), false);
  assert.equal(store.buyAlbum('night-bloom').status, 'invalid');
});

test('shop replacement keeps an in-progress free puzzle and never refunds a second time', () => {
  const active = { level: 1, rows: 4, cols: 4, seed: 23, placed: [], groups: [], tray: Array.from({ length: 16 }, (_, i) => i), scroll: 0, hints: 2 };
  const { store, storage } = fixture(25, { catalogueRevision: undefined, current: 1, completed: [0], active, economy: { balance: 25, purchasedAlbums: ['ink-trail'], rewardedLevels: [0], adReceipts: [], hintReceipts: [] } });
  assert.deepEqual(store.get().active, active);
  assert.equal(store.get().economy.balance, 225);
  store.save(active);
  assert.equal(new ProgressStore(storage).get().economy.balance, 225);
  assert.deepEqual(new ProgressStore(storage).get().active, active);
});
