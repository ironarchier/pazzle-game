import type { StorageLike } from '../progress';

export interface RewardedCallbacks {
  onOpen: () => void; onRewarded: () => void;
  onClose: (wasShown?: boolean) => void; onError: (error?: unknown) => void;
}
export interface RewardedSdk {
  adv: { showRewardedVideo: (options: { callbacks: RewardedCallbacks }) => void | Promise<void> };
}
export interface YandexSdk extends RewardedSdk {
  getStorage?: () => Promise<StorageLike>;
  features?: { LoadingAPI?: { ready: () => void }; GameplayAPI?: { start: () => void; stop: () => void } };
}
declare global {
  interface Window { YaGames?: { init: () => Promise<YandexSdk> } }
}
