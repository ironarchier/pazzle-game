import { ECONOMY } from './config';
import { t } from '../i18n';
export type PurchaseIntent = { kind: 'album'; albumId: string; title: string } | { kind: 'hint' };
export function offerState(intent: PurchaseIntent, balance: number, hintCredits = 0) {
  if (intent.kind === 'hint') return {
    price: 0, shortfall: 0, affordable: hintCredits > 0,
    title: t('hintAdTitle'), message: t(hintCredits > 0 ? 'hintReady' : 'hintAdMessage'),
    button: t(hintCredits > 0 ? 'useHint' : 'watchHintAd'),
  };
  const price = ECONOMY.albumPrice;
  const shortfall = Math.max(0, price - balance);
  return {
    price, shortfall, affordable: shortfall === 0,
    title: t(shortfall > 0 ? 'insufficientCoins' : 'openAlbum'),
    message: shortfall > 0 ? t('albumShortfall', { coins: shortfall }) : t('albumAffordable'),
    button: shortfall > 0 ? t('watchAd', { coins: ECONOMY.rewardedVideoCoins }) : t('buyAlbum', { price }),
  };
}
