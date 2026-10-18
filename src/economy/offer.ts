import { ECONOMY } from './config';
import { t } from '../i18n';
export type PurchaseIntent = { kind: 'album'; albumId: string; title: string } | { kind: 'hint' };
export function offerState(intent: PurchaseIntent, balance: number) {
  const price = intent.kind === 'album' ? ECONOMY.albumPrice : ECONOMY.hintPrice;
  const shortfall = Math.max(0, price - balance);
  return {
    price, shortfall, affordable: shortfall === 0,
    title: t(shortfall > 0 ? 'insufficientCoins' : intent.kind === 'album' ? 'openAlbum' : 'hintTitle'),
    message: shortfall > 0 ? t(intent.kind === 'album' ? 'albumShortfall' : 'hintShortfall', { coins: shortfall }) : t(intent.kind === 'album' ? 'albumAffordable' : 'hintAffordable'),
    button: shortfall > 0 ? t('watchAd', { coins: ECONOMY.rewardedVideoCoins }) : t(intent.kind === 'album' ? 'buyAlbum' : 'buyHint', { price }),
  };
}
