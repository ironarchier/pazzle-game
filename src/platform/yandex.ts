import type * as Phaser from 'phaser';
import { configureProgressStorage, rewardAd, rewardHintAd } from '../progress';
import { setAudioSuspended } from '../audio';
import { RewardedAds } from './RewardedAds';
import type { YandexSdk } from './types';

let sdk: YandexSdk | undefined;
let initializing: Promise<YandexSdk | undefined> | undefined;
let game: Phaser.Game | undefined;
let gameplay = false;
let loadingReported = false;
const development = import.meta.env?.DEV === true;

async function initialize(): Promise<YandexSdk | undefined> {
  if (typeof window === 'undefined') return;
  if (development && new URLSearchParams(location.search).get('testAds') === '1') {
    const mock = await import('../testing/adsMock');
    return mock.createDevelopmentSdk();
  }
  const hostname = location.hostname;
  const local = /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
  if (!window.YaGames && local) return;
  if (!window.YaGames) {
    await new Promise<void>(resolve => {
      const script = document.createElement('script');
      script.src = '/sdk.js'; script.async = true;
      const timeout = setTimeout(resolve, 8000);
      const finish = () => { clearTimeout(timeout); resolve(); };
      script.onload = finish; script.onerror = finish;
      document.head.appendChild(script);
    });
  }
  if (!window.YaGames) return;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      window.YaGames.init(),
      new Promise<undefined>(resolve => { timeout = setTimeout(resolve, 8000); }),
    ]);
  } catch { return; }
  finally { clearTimeout(timeout); }
}

export function getYandexSdk(): Promise<YandexSdk | undefined> {
  if (sdk) return Promise.resolve(sdk);
  initializing ??= initialize().then(value => { sdk = value; if (!value) initializing = undefined; return value; });
  return initializing;
}

function pauseForAd(): () => void {
  if (!game) return () => {};
  const running = game.scene.getScenes(true);
  for (const scene of running) scene.scene.pause();
  setAudioSuspended(true);
  try { sdk?.features?.GameplayAPI?.stop(); } catch { /* Optional platform telemetry must not interrupt an ad. */ }
  return () => {
    for (const scene of running) if (scene.sys.isPaused()) scene.scene.resume();
    setAudioSuspended(false);
    if (gameplay) { try { sdk?.features?.GameplayAPI?.start(); } catch { /* Gameplay still resumes locally. */ } }
  };
}
export const rewardedAds = new RewardedAds(getYandexSdk, { coins: rewardAd, hint: rewardHintAd }, pauseForAd);

export async function initializePlatform(owner: Phaser.Game): Promise<void> {
  game = owner;
  const platform = await getYandexSdk();
  let storageTimeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const storage = await Promise.race([platform?.getStorage?.(), new Promise<undefined>(resolve => { storageTimeout = setTimeout(resolve, 4000); })]);
    if (storage) configureProgressStorage(storage);
  } catch { /* Local persistence remains available if SDK storage is unavailable. */ }
  finally { clearTimeout(storageTimeout); }
  if (development && new URLSearchParams(location.search).get('testAds') === '1') {
    const setup = await import('../testing/scenario');
    setup.seedDevelopmentScenario();
  }
}
export function platformReady(): void {
  if (loadingReported || !sdk?.features?.LoadingAPI) return;
  try { sdk.features.LoadingAPI.ready(); loadingReported = true; } catch { /* The game can still start offline. */ }
}
export function setGameplayActive(active: boolean): void {
  gameplay = active;
  try {
    if (active && !rewardedAds.busy) sdk?.features?.GameplayAPI?.start();
    else sdk?.features?.GameplayAPI?.stop();
  } catch { /* Optional platform telemetry must not interrupt gameplay. */ }
}
