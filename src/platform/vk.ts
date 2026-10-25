import bridge from '@vkontakte/vk-bridge';
import { SAVE_STORAGE_KEY, VK_BRIDGE_TIMEOUT_MS } from '../constants';
import type { PlatformAdapter, RewardedSdk } from './types';
import { createVkStorage, type FlushableStorage } from './vkStorage';

let initializing: Promise<boolean> | undefined;
let storage: FlushableStorage | undefined;

function withTimeout<T>(request: Promise<T>): Promise<T | undefined> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([request, new Promise<undefined>(resolve => { timeout = setTimeout(resolve, VK_BRIDGE_TIMEOUT_MS); })])
    .finally(() => clearTimeout(timeout));
}

function initialize(): Promise<boolean> {
  initializing ??= !bridge.isEmbedded() ? Promise.resolve(false) : withTimeout(bridge.send('VKWebAppInit')).then(
    result => {
      if (result) bridge.send('VKWebAppCheckNativeAds', { ad_format: 'reward' }).catch(() => {}); // Preloads the first rewarded ad.
      return !!result;
    },
    () => false,
  );
  return initializing;
}

const rewarded: RewardedSdk = { adv: { async showRewardedVideo({ callbacks }) {
  try {
    const available = await bridge.send('VKWebAppCheckNativeAds', { ad_format: 'reward' });
    if (!available.result) { callbacks.onError(); return; }
    callbacks.onOpen();
    const shown = await bridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' });
    if (shown.result) callbacks.onRewarded();
    callbacks.onClose(shown.result);
  } catch (error) { callbacks.onError(error); }
} } };

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
    bridge.subscribe(event => {
      if (event.detail?.type === 'VKWebAppViewHide') { listener(true); storage?.flush(); }
      else if (event.detail?.type === 'VKWebAppViewRestore') listener(false);
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) storage?.flush(); });
  },
};
