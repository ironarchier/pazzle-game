import type * as Phaser from 'phaser';
import type { PlatformAdapter } from './adapter';
import type { AdResult, AdReward } from './RewardedAds';

let adapter: PlatformAdapter | undefined;
let initialization: Promise<void> | undefined;

export function initializePlatform(owner: Phaser.Game): Promise<void> {
  initialization ??= (async () => {
    adapter = await import('@platform-adapter');
    await adapter.initializePlatform(owner);
  })();
  return initialization;
}

export const rewardedAds = {
  get busy(): boolean { return adapter?.rewardedAds.busy ?? false; },
  show(reward: AdReward = 'coins'): Promise<AdResult> { return adapter?.rewardedAds.show(reward) ?? Promise.resolve({ status: 'unavailable', coins: 0 }); },
  subscribe(listener: () => void): () => void { return adapter?.rewardedAds.subscribe(listener) ?? (() => {}); },
};
export function platformReady(): void { adapter?.platformReady(); }
export function setGameplayActive(active: boolean): void { adapter?.setGameplayActive(active); }
export function continueAfterLevel(action: () => void): void {
  if (adapter?.continueAfterLevel) adapter.continueAfterLevel(action);
  else action();
}
