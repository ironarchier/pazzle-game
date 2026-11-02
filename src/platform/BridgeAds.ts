import type { PlaygamaBridge } from '@playgama/bridge';
import type { RewardedCallbacks, RewardedSdk } from './types';

type BridgeAdApi = Pick<PlaygamaBridge, 'advertisement' | 'EVENT_NAME'>;

/** Normalize Bridge's terminal `rewarded` state to the existing coin transaction. */
export class BridgeAds implements RewardedSdk {
  busy = false;
  private bridge: BridgeAdApi;
  private launchTimeoutMs: number;
  constructor(bridge: BridgeAdApi, launchTimeoutMs = 12000) { this.bridge = bridge; this.launchTimeoutMs = launchTimeoutMs; }
  adv = { showRewardedVideo: ({ callbacks }: { callbacks: RewardedCallbacks }): void => {
    if (this.busy || !this.bridge.advertisement.isRewardedSupported) { callbacks.onError(); return; }
    this.run('rewarded', callbacks);
  } };
  showInterstitial(pause: () => () => void): Promise<void> {
    if (this.busy || !this.bridge.advertisement.isInterstitialSupported) return Promise.resolve();
    return new Promise(resolve => {
      let resume: (() => void) | undefined;
      const finish = () => { resume?.(); resolve(); };
      this.run('interstitial', { onOpen: () => { resume ??= pause(); }, onRewarded: () => {}, onClose: finish, onError: finish });
    });
  }
  private run(kind: 'rewarded' | 'interstitial', callbacks: RewardedCallbacks): void {
    const api = this.bridge.advertisement;
    const current = kind === 'rewarded' ? api.rewardedState : api.interstitialState;
    if (current === 'loading' || current === 'opened') { callbacks.onError(); return; }
    const event = kind === 'rewarded' ? this.bridge.EVENT_NAME.REWARDED_STATE_CHANGED : this.bridge.EVENT_NAME.INTERSTITIAL_STATE_CHANGED;
    this.busy = true;
    let terminal = false;
    const timer = setTimeout(() => finish(false), this.launchTimeoutMs);
    const finish = (success: boolean, closed = false) => {
      if (terminal) return;
      terminal = true;
      clearTimeout(timer);
      api.off(event, onState);
      this.busy = false;
      if (success) { callbacks.onRewarded(); callbacks.onClose(true); }
      else if (closed) callbacks.onClose(false);
      else callbacks.onError();
    };
    const onState = (state: unknown) => {
      if (terminal) return;
      if (state === 'opened') { clearTimeout(timer); callbacks.onOpen(); }
      else if (kind === 'rewarded' && state === 'rewarded') finish(true);
      else if (state === 'closed') finish(false, true);
      else if (state === 'failed') finish(false);
    };
    api.on(event, onState);
    try {
      if (kind === 'rewarded') api.showRewarded('coins');
      else api.showInterstitial('level_completed');
    } catch { finish(false); }
  }
}
