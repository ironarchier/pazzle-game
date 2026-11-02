// Controller behavior with a renderer stub; this is not a browser/layout test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PurchaseModal } from '../src/ui/PurchaseModal.ts';
import { rewardedAds } from '../src/platform/index.ts';
import { configureProgressStorage, getProgress, rewardHintAd, useHint } from '../src/progress.ts';
import { SAVE_STORAGE_KEY } from '../src/constants.ts';
import { Scene, Display } from './phaser-stub.mjs';

let revision = 100;
function fixture() {
  const data = { [SAVE_STORAGE_KEY]: JSON.stringify({ version: 1, catalogueRevision: 2, revision: revision += 100, current: 0, completed: [],
    active: { level: 0, rows: 3, cols: 3, seed: 1, hints: 2, placed: [], tray: Array.from({ length: 9 }, (_, i) => i), groups: [], scroll: 0 },
    economy: { balance: 200 } }) };
  configureProgressStorage({ getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = value; } });
  const scene = new Scene();
  const modal = Object.assign(Object.create(PurchaseModal.prototype), {
    scene, closed: false, cleanup: [], intent: { kind: 'hint' },
    heading: new Display(scene), message: new Display(scene), status: new Display(scene),
    action: { setLabel() { return this; }, setEnabled() { return this; } },
  });
  return modal;
}

test('hint offer applies exactly once after the rewarded ad, without spending or awarding coins', async () => {
  const modal = fixture(), original = rewardedAds.show;
  let confirmed = 0, requests = 0;
  modal.confirmed = () => { confirmed++; assert.equal(useHint('modal-hint', () => true), 'used'); };
  rewardedAds.show = async kind => {
    requests++; assert.equal(kind, 'hint'); assert.equal(confirmed, 0);
    rewardHintAd('modal-ad'); return { status: 'rewarded', coins: 0 };
  };
  try {
    await modal.perform(); await modal.perform();
    assert.equal(requests, 1); assert.equal(confirmed, 1); assert.equal(modal.closed, true);
    assert.equal(getProgress().economy.balance, 200);
    assert.equal(getProgress().economy.hintCredits, 0);
    assert.equal(getProgress().active.hints, 1);
  } finally { rewardedAds.show = original; }
});

test('closed, failed and unavailable hint ads keep the offer open and leave the puzzle unchanged', async () => {
  const original = rewardedAds.show;
  try {
    for (const status of ['closed', 'error', 'unavailable']) {
      const modal = fixture();
      modal.confirmed = () => assert.fail('Cancelled ad must not apply a hint');
      rewardedAds.show = async () => ({ status, coins: 0 });
      await modal.perform();
      assert.equal(modal.closed, false);
      assert.ok(modal.status.text);
      assert.equal(getProgress().economy.balance, 200);
      assert.equal(getProgress().economy.hintCredits, 0);
      assert.equal(getProgress().active.hints, 2);
    }
  } finally { rewardedAds.show = original; }
});

test('a rewarded hint remains saved when its scene is destroyed before the ad closes', async () => {
  const modal = fixture(), original = rewardedAds.show;
  let finish;
  modal.confirmed = () => assert.fail('Destroyed scene must not apply a hint');
  rewardedAds.show = () => new Promise(resolve => { finish = resolve; });
  try {
    const pending = modal.perform();
    rewardHintAd('interrupted-hint-ad'); modal.destroy();
    finish({ status: 'rewarded', coins: 0 }); await pending;
    assert.equal(getProgress().economy.hintCredits, 1);
    assert.equal(getProgress().active.hints, 2);
    assert.equal(getProgress().economy.balance, 200);
  } finally { rewardedAds.show = original; }
});
