import type * as Phaser from 'phaser';
import type { RewardedAds } from './RewardedAds';

// A new distribution target implements this contract; scenes only use the facade.
export interface PlatformAdapter {
  initializePlatform(owner: Phaser.Game): Promise<void>;
  platformReady(): void;
  setGameplayActive(active: boolean): void;
  rewardedAds: Pick<RewardedAds, 'busy' | 'show' | 'subscribe'>;
  continueAfterLevel?(action: () => void): void;
}
