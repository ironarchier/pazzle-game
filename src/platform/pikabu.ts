import type * as Phaser from 'phaser';
import { SAVE_STORAGE_KEY } from '../constants';
import { configureProgressStorage, rewardAd, type StorageLike } from '../progress';
import { configureSettingsStorage } from '../settings';
import { setAudioSuspended } from '../audio';
import { PauseController } from './PauseController';
import { RewardedAds } from './RewardedAds';
import type { RewardedCallbacks, RewardedSdk } from './types';
import { withTimeout } from './withTimeout';

// '@game-platform' for Pikabu Games (vite --mode pikabu). Types follow https://games.pikabu.ru/sdk/docs
type AdError = 'NOT_SUPPORTED' | 'IN_PROGRESS' | 'UI_BUSY' | 'COOLDOWN_ACTIVE' | 'INVALID_GAME_STATE' | 'UNKNOWN';
type AdResult = { rendered: true } | { rendered: false; reason: AdError };
type SaveError = 'QUOTA_EXCEEDED' | 'RATE_LIMIT' | 'REVISION_CONFLICT' | 'NETWORK_ERROR' | 'UNKNOWN';
interface AdApi<R = AdResult> { isSupported: boolean; canShow(): Promise<boolean>; show(): Promise<R> }
export interface PikabuSdk {
  gameStarted(): void;
  ads: { fullscreen: AdApi; rewarded: AdApi<AdResult & { reward: boolean }> };
  storage: { get(key: string): unknown; set(key: string, value: unknown): void; flush(): Promise<{ success: true } | { success: false; reason: SaveError }> };
  on(event: 'storageSaveError', listener: (reason: SaveError) => void): () => void;
}
declare global { interface Window { PkbSDK?: { init(): Promise<PikabuSdk> } } }

export const PIKABU = {
  sdkUrl: 'https://games.pikabu.ru/sdk/sdk.js',
  loadTimeoutMs: 8000,
  // The platform allows a fullscreen ad every 120 s; the first one also waits that long after launch.
  interstitialGapMs: 120000,
};

let sdk: PikabuSdk | undefined;
let pause: PauseController | undefined;
let started = false;
let transitioning = false;
let adOpen = false;
let afterRewarded = false;
let lastInterstitial = 0;

function pauseForAd(): () => void {
  pause?.setPaused('ad', true);
  return () => pause?.setPaused('ad', false);
}

/** Maps the SDK's promise-based rewarded ad onto the callbacks the coin transaction expects. */
const rewardedSdk: RewardedSdk = { adv: { async showRewardedVideo({ callbacks }: { callbacks: RewardedCallbacks }) {
  const ads = sdk?.ads.rewarded;
  if (!ads?.isSupported || adOpen || !await ads.canShow()) { callbacks.onError(); return; }
  adOpen = true;
  try {
    callbacks.onOpen();
    const result = await ads.show();
    if (!result.rendered) { console.warn('Pikabu rewarded ad was not shown', result.reason); callbacks.onError(); return; }
    // Only a fully watched ad reports reward: true.
    if (result.reward) { afterRewarded = true; callbacks.onRewarded(); }
    callbacks.onClose(result.reward);
  } catch (error) { callbacks.onError(error); }
  finally { adOpen = false; }
} } };

export const rewardedAds = new RewardedAds(async () => sdk && !transitioning ? rewardedSdk : undefined, rewardAd, pauseForAd);

/** Synchronous key-value view over the SDK storage, which uploads changes by itself shortly after set(). */
function pikabuStorage(api: PikabuSdk['storage']): StorageLike {
  return {
    getItem(key) { const value = api.get(key); return typeof value === 'string' ? value : null; },
    setItem(key, value) { api.set(key, value); },
  };
}
function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}
function loadScript(src: string): Promise<void> {
  if (window.PkbSDK) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src; script.async = true;
    script.onload = () => resolve(); script.onerror = () => reject(new Error('Pikabu SDK script failed to load'));
    document.head.append(script);
  });
}

export function startPlatform(): void {}
// Pikabu Games has no banner format.
export function setBannerVisible(_visible: boolean): void {}

export async function initializePlatform(game: Phaser.Game): Promise<void> {
  let storage: StorageLike;
  try {
    await withTimeout(loadScript(PIKABU.sdkUrl), PIKABU.loadTimeoutMs);
    if (!window.PkbSDK) throw new Error('Pikabu SDK is missing');
    sdk = await withTimeout(window.PkbSDK.init(), PIKABU.loadTimeoutMs);
    storage = pikabuStorage(sdk.storage);
    // A save that cannot be read must stop the game instead of being overwritten by a fresh one.
    const raw = storage.getItem(SAVE_STORAGE_KEY);
    if (raw && JSON.parse(raw)?.version !== 1) throw new Error('Unsupported progress data');
    sdk.on('storageSaveError', reason => console.warn('Pikabu save failed', reason));
    lastInterstitial = Date.now();
  } catch (error) {
    if (sdk) throw error;
    // The SDK works only on games.pikabu.ru and in the Studio sandbox; elsewhere the game runs without saves.
    console.warn('Pikabu SDK is unavailable. Progress is kept for this session only.', error);
    storage = memoryStorage();
  }
  // The platform requires a Russian interface on first launch; a saved choice still wins.
  configureSettingsStorage(storage, 'ru');
  configureProgressStorage(storage);
  rewardedAds.setAvailable(!!sdk?.ads.rewarded.isSupported);
  pause = new PauseController(game, setAudioSuspended);
  // Explicit uploads are limited to 100 per 5 minutes, so they happen only when the page hides.
  const onVisibility = () => {
    pause?.setPaused('hidden', document.hidden);
    if (document.hidden) void sdk?.storage.flush().catch(error => console.warn('Pikabu save failed', error));
  };
  const onPageHide = () => { void sdk?.storage.flush().catch(() => {}); };
  onVisibility();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  game.events.on('poststep', pause.enforce);
  game.events.once('destroy', () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    game.events.off('poststep', pause!.enforce);
  });
}

export function platformReady(): void {
  if (!sdk || started) return;
  started = true;
  sdk.gameStarted();
}
export function setGameplayActive(_active: boolean): void {}

/** Between puzzles: a fullscreen ad when the platform allows one, then the next screen. */
export function continueAfterLevel(action: () => void): void {
  if (transitioning || rewardedAds.busy) return;
  const fullscreen = sdk?.ads.fullscreen;
  // Not right after a rewarded video, and not more often than the platform cooldown.
  const due = !!fullscreen?.isSupported && !afterRewarded && Date.now() - lastInterstitial >= PIKABU.interstitialGapMs;
  afterRewarded = false;
  if (!due) { action(); return; }
  transitioning = true;
  let resume: (() => void) | undefined;
  void (async () => {
    try {
      if (!await fullscreen!.canShow()) return;
      resume = pauseForAd(); adOpen = true;
      const result = await fullscreen!.show();
      if (result.rendered) lastInterstitial = Date.now();
      else console.warn('Pikabu fullscreen ad was not shown', result.reason);
    } catch { /* No ad is a normal outcome. */ }
    finally { adOpen = false; resume?.(); transitioning = false; action(); }
  })();
}
