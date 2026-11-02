import { ECONOMY } from '../economy/config';
import type { RewardedSdk } from './types';

export type AdResult = { status: 'rewarded' | 'closed' | 'unavailable' | 'error' | 'busy'; coins: number };
export type AdReward = 'coins' | 'hint';
type Rewards = { coins: (receipt: string) => boolean; hint?: (receipt: string) => boolean };
export const createReceipt = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export class RewardedAds {
  busy = false;
  private listeners = new Set<() => void>();
  private getSdk: () => Promise<RewardedSdk | undefined>;
  private rewards: Rewards;
  private pause: () => (() => void);
  private receipt: () => string;
  private launchTimeoutMs: number;
  constructor(
    getSdk: () => Promise<RewardedSdk | undefined>, credit: Rewards | Rewards['coins'],
    pause: () => (() => void) = () => () => {}, receipt: () => string = createReceipt, launchTimeoutMs = 15000,
  ) { this.getSdk = getSdk; this.rewards = typeof credit === 'function' ? { coins: credit } : credit; this.pause = pause; this.receipt = receipt; this.launchTimeoutMs = launchTimeoutMs; }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private setBusy(value: boolean): void {
    this.busy = value;
    for (const listener of this.listeners) { try { listener(); } catch { /* UI listeners cannot own the ad lifecycle. */ } }
  }
  async show(reward: AdReward = 'coins'): Promise<AdResult> {
    if (this.busy) return { status: 'busy', coins: 0 };
    const credit = this.rewards[reward];
    if (!credit) return { status: 'unavailable', coins: 0 };
    this.setBusy(true);
    let sdk: RewardedSdk | undefined;
    let initializationTimeout: ReturnType<typeof setTimeout> | undefined;
    try { sdk = await Promise.race([this.getSdk(), new Promise<undefined>(resolve => { initializationTimeout = setTimeout(resolve, this.launchTimeoutMs); })]); }
    catch { this.setBusy(false); return { status: 'error', coins: 0 }; }
    finally { clearTimeout(initializationTimeout); }
    if (!sdk?.adv?.showRewardedVideo) { this.setBusy(false); return { status: 'unavailable', coins: 0 }; }
    const id = this.receipt();
    return new Promise<AdResult>(resolve => {
      let terminal = false, rewarded = false, credited = false;
      let resume: (() => void) | undefined;
      const timer = setTimeout(() => finish('unavailable'), this.launchTimeoutMs);
      const finish = (status: AdResult['status']) => {
        if (terminal) return;
        terminal = true; clearTimeout(timer);
        try { resume?.(); } catch { /* Restore the ad lock even if a scene has already shut down. */ } finally {
          this.setBusy(false);
          resolve({ status: credited ? 'rewarded' : status, coins: credited && reward === 'coins' ? ECONOMY.rewardedVideoCoins : 0 });
        }
      };
      try {
        const result = sdk!.adv.showRewardedVideo({ callbacks: {
          onOpen: () => {
            if (terminal) return;
            clearTimeout(timer); // No game-imposed limit on how long a real ad may play.
            if (!resume) resume = this.pause();
          },
          onRewarded: () => {
            if (terminal || rewarded) return;
            clearTimeout(timer);
            rewarded = true;
            try { credited = credit(id); } catch { finish('error'); } // Only confirmed rewarded callbacks can grant either reward.
          },
          onClose: () => finish('closed'),
          onError: () => finish('error'),
        } });
        result?.catch(() => finish('error'));
      } catch { finish('error'); }
    });
  }
}
