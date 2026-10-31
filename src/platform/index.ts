import type * as Phaser from 'phaser';
import { configureProgressStorage, rewardAd } from '../progress';
import { setAudioSuspended } from '../audio';
import { RewardedAds } from './RewardedAds';
import type { PlatformAdapter, RewardedSdk } from './types';

const development = import.meta.env?.DEV === true;
const testAds = development && typeof location !== 'undefined' && new URLSearchParams(location.search).get('testAds') === '1';

let adapter: Promise<PlatformAdapter> | undefined;
let current: PlatformAdapter | undefined;
let game: Phaser.Game | undefined;
let gameplay = false;
let suspensions = 0;
let pausedScenes: Phaser.Scene[] = [];
let resumeAfterHide: (() => void) | undefined;

function loadAdapter(): Promise<PlatformAdapter> {
  adapter ??= (import.meta.env?.MODE === 'vk'
    ? import('./vk').then(module => module.vkPlatform)
    : import('./yandex').then(module => module.yandexPlatform)
  ).then(value => (current = value));
  return adapter;
}

async function getSdk(): Promise<RewardedSdk | undefined> {
  if (testAds) return (await import('../testing/adsMock')).createDevelopmentSdk();
  return (await loadAdapter()).getSdk();
}

// Ads and hidden views can overlap, so the game resumes only after the last suspension is released.
function suspend(): () => void {
  if (!game) return () => {};
  if (suspensions++ === 0) {
    pausedScenes = game.scene.getScenes(true);
    for (const scene of pausedScenes) scene.scene.pause();
    setAudioSuspended(true);
    current?.setGameplay(false);
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--suspensions > 0) return;
    for (const scene of pausedScenes) if (scene.sys.isPaused()) scene.scene.resume();
    pausedScenes = [];
    setAudioSuspended(false);
    if (gameplay) current?.setGameplay(true);
  };
}

function onVisibility(hidden: boolean): void {
  if (hidden) resumeAfterHide ??= suspend();
  else { resumeAfterHide?.(); resumeAfterHide = undefined; }
}

export const rewardedAds = new RewardedAds(getSdk, rewardAd, suspend);

// VK requires VKWebAppInit before any long asset loading, so the SDK starts before Phaser preloads.
export function startPlatform(): void {
  loadAdapter().then(platform => platform.getSdk()).catch(() => {});
}

export async function initializePlatform(owner: Phaser.Game): Promise<void> {
  game = owner;
  const platform = await loadAdapter();
  platform.onVisibility?.(onVisibility);
  platform.onRewardedAvailability?.(available => rewardedAds.setAvailable(available));
  await platform.getSdk();
  let storageTimeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const storage = await Promise.race([platform.getStorage(), new Promise<undefined>(resolve => { storageTimeout = setTimeout(resolve, 4000); })]);
    if (storage) configureProgressStorage(storage);
  } catch { /* Local persistence remains available if SDK storage is unavailable. */ }
  finally { clearTimeout(storageTimeout); }
  if (testAds) {
    const setup = await import('../testing/scenario');
    setup.seedDevelopmentScenario();
  }
}
export function platformReady(): void {
  current?.ready();
}
export function setBannerVisible(visible: boolean): void {
  current?.setBanner?.(visible);
}
export function setGameplayActive(active: boolean): void {
  gameplay = active;
  current?.setGameplay(active && suspensions === 0 && !rewardedAds.busy);
}
export function continueAfterLevel(action: () => void): void { action(); }
