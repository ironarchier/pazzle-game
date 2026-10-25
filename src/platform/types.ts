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
export interface PlatformAdapter {
  getSdk: () => Promise<RewardedSdk | undefined>;
  getStorage: () => Promise<StorageLike | undefined>;
  ready: () => void;
  setGameplay: (active: boolean) => void;
  onVisibility?: (listener: (hidden: boolean) => void) => void;
  onRewardedAvailability?: (listener: (available: boolean) => void) => void;
  setBanner?: (visible: boolean) => void;
}
declare global {
  interface Window { YaGames?: { init: () => Promise<YandexSdk> } }
}
