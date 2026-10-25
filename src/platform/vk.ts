import bridge from '@vkontakte/vk-bridge';
import { SAVE_STORAGE_KEY, VK_BRIDGE_TIMEOUT_MS, VK_REWARDED_RECHECK_MS } from '../constants';
import type { PlatformAdapter, RewardedSdk } from './types';
import { createVkStorage, type FlushableStorage } from './vkStorage';

let initializing: Promise<boolean> | undefined;
let storage: FlushableStorage | undefined;
let visibilityListener: ((hidden: boolean) => void) | undefined;
let rewardedListener: ((available: boolean) => void) | undefined;
let rewardedAvailable: boolean | undefined;
let rewardedRecheck: ReturnType<typeof setTimeout> | undefined;
let bannerWanted = false;
let bannerShown = false;
let bannerClosed = false;
let bannerQueue = Promise.resolve();

bridge.subscribe(event => {
  const type = event.detail?.type;
  if (type === 'VKWebAppViewHide') { visibilityListener?.(true); storage?.flush(); }
  else if (type === 'VKWebAppViewRestore') visibilityListener?.(false);
  else if (type === 'VKWebAppBannerAdClosedByUser') { bannerClosed = true; bannerShown = false; }
});

function withTimeout<T>(request: Promise<T>): Promise<T | undefined> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([request, new Promise<undefined>(resolve => { timeout = setTimeout(resolve, VK_BRIDGE_TIMEOUT_MS); })])
    .finally(() => clearTimeout(timeout));
}

function initialize(): Promise<boolean> {
  initializing ??= !bridge.isEmbedded() ? Promise.resolve(false) : withTimeout(bridge.send('VKWebAppInit')).then(
    result => {
      if (result) void checkRewarded();
      return !!result;
    },
    () => false,
  );
  return initializing;
}

// The check also asks VK to load an ad, so it is repeated until a rewarded video is ready.
async function checkRewarded(): Promise<boolean> {
  clearTimeout(rewardedRecheck);
  let available = false;
  try { available = (await bridge.send('VKWebAppCheckNativeAds', { ad_format: 'reward' })).result; } catch { /* Treated as no ad. */ }
  rewardedAvailable = available;
  rewardedListener?.(available);
  if (!available) rewardedRecheck = setTimeout(checkRewarded, VK_REWARDED_RECHECK_MS);
  return available;
}

const rewarded: RewardedSdk = { adv: { async showRewardedVideo({ callbacks }) {
  try {
    if (!await checkRewarded()) { callbacks.onError(); return; }
    callbacks.onOpen();
    const shown = await bridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' });
    if (shown.result) callbacks.onRewarded();
    callbacks.onClose(shown.result);
  } catch (error) { callbacks.onError(error); }
  finally { void checkRewarded(); }
} } };

async function syncBanner(): Promise<void> {
  if (!await initialize()) return;
  if (bannerWanted && !bannerShown && !bannerClosed) {
    try { bannerShown = (await bridge.send('VKWebAppShowBannerAd', { banner_location: 'bottom', layout_type: 'resize' })).result; }
    catch { bannerShown = false; }
  } else if (!bannerWanted && bannerShown) {
    bannerShown = false;
    try { await bridge.send('VKWebAppHideBannerAd'); } catch { /* The banner may already be gone. */ }
  }
}

export const vkPlatform: PlatformAdapter = {
  async getSdk() { return await initialize() ? rewarded : undefined; },
  async getStorage() {
    if (!await initialize()) return;
    storage ??= await createVkStorage({
      async get(keys) {
        const { keys: values } = await bridge.send('VKWebAppStorageGet', { keys });
        return Object.fromEntries(values.map(({ key, value }) => [key, value]));
      },
      async set(key, value) { await bridge.send('VKWebAppStorageSet', { key, value }); },
    }, [SAVE_STORAGE_KEY]);
    return storage;
  },
  ready() {},
  setGameplay() {},
  onVisibility(listener) {
    visibilityListener = listener;
    document.addEventListener('visibilitychange', () => { if (document.hidden) storage?.flush(); });
  },
  onRewardedAvailability(listener) {
    rewardedListener = listener;
    if (rewardedAvailable !== undefined) listener(rewardedAvailable);
  },
  setBanner(visible) {
    bannerWanted = visible;
    bannerQueue = bannerQueue.then(syncBanner);
  },
};
