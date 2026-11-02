import type * as Phaser from 'phaser';
import type { PlaygamaBridge } from '@playgama/bridge';
import { SAVE_STORAGE_KEY, SETTINGS_STORAGE_KEY } from '../constants';
import { configureProgressStorage, rewardAd, rewardHintAd } from '../progress';
import { configureSettingsStorage } from '../settings';
import { setAudioSuspended } from '../audio';
import { BridgeStorage } from './BridgeStorage';
import { BridgeAds } from './BridgeAds';
import { PauseController } from './PauseController';
import { RewardedAds } from './RewardedAds';
import { withTimeout } from './withTimeout';

let sdk: PlaygamaBridge | undefined;
let ads: BridgeAds | undefined;
let pause: PauseController | undefined;
let ready = false;
let transitioning = false;
let gameplay = false;

function pauseForAd(): () => void {
  pause?.setPaused('ad', true);
  return () => pause?.setPaused('ad', false);
}
export const rewardedAds = new RewardedAds(async () => ads?.busy || transitioning ? undefined : ads, { coins: rewardAd, hint: rewardHintAd }, pauseForAd);
export function startPlatform(): void {}
export function setBannerVisible(_visible: boolean): void {}

export async function initializePlatform(game: Phaser.Game): Promise<void> {
  const bridge = globalThis.bridge;
  if (!bridge) throw new Error('Playgama Bridge script did not load');
  await withTimeout(bridge.initialize(), 20000);
  const storage = new BridgeStorage(bridge.storage, error => console.warn('Playgama save pending; retrying', error));
  // A failed read must never turn an existing cloud save into a fresh empty save.
  await storage.load([SAVE_STORAGE_KEY, SETTINGS_STORAGE_KEY]);
  const raw = storage.getItem(SAVE_STORAGE_KEY);
  if (raw && JSON.parse(raw)?.version !== 1) throw new Error('Unsupported progress data');
  configureSettingsStorage(storage, bridge.platform.language);
  configureProgressStorage(storage);
  sdk = bridge;
  ads = new BridgeAds(bridge);
  pause = new PauseController(game, setAudioSuspended);
  const onPause = (value: unknown) => pause?.setPaused('platform', value === true);
  const onAudio = (value: unknown) => pause?.setAudioEnabled(value === true);
  const onVisibility = () => {
    pause?.setPaused('hidden', document.hidden);
    void storage.flush().catch(error => console.warn('Playgama save pending', error));
  };
  bridge.platform.on(bridge.EVENT_NAME.PAUSE_STATE_CHANGED, onPause);
  bridge.platform.on(bridge.EVENT_NAME.AUDIO_STATE_CHANGED, onAudio);
  pause.setAudioEnabled(bridge.platform.isAudioEnabled);
  pause.setPaused('platform', bridge.platform.isPaused);
  onVisibility();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onVisibility);
  game.events.on('poststep', pause.enforce);
  game.events.once('destroy', () => {
    bridge.platform.off(bridge.EVENT_NAME.PAUSE_STATE_CHANGED, onPause);
    bridge.platform.off(bridge.EVENT_NAME.AUDIO_STATE_CHANGED, onAudio);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onVisibility);
    game.events.off('poststep', pause!.enforce);
    storage.dispose();
  });
}

export function platformReady(): void {
  if (!sdk || ready) return;
  ready = true;
  void sdk.platform.sendMessage('game_ready').catch(error => console.warn('Playgama game_ready failed', error));
}
export function setGameplayActive(active: boolean): void {
  if (!sdk || gameplay === active) return;
  gameplay = active;
  void sdk.platform.sendMessage(active ? 'gameplay_started' : 'gameplay_stopped').catch(error => console.warn('Playgama gameplay message failed', error));
}
export function continueAfterLevel(action: () => void): void {
  if (transitioning || rewardedAds.busy) return;
  transitioning = true;
  const resume = pauseForAd();
  void (ads?.showInterstitial(() => () => {}) ?? Promise.resolve()).finally(() => {
    resume();
    transitioning = false;
    action();
  });
}
