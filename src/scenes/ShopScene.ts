import * as Phaser from 'phaser';
import { CARD_RADIUS, FONT_FAMILY, SHOP_AD_BUTTON_SCALE, SHOP_ALBUMS, SHOP_ROW_SPACING, getAlbumLevels } from '../constants';
import { ECONOMY } from '../economy/config';
import { ownsAlbum } from '../progress';
import { rewardedAds } from '../platform';
import { goToScene, restartScene } from '../crossfade';
import { centerLayout } from '../layout';
import { applyTheme, getTheme, toCss } from '../theme';
import { BackLink } from '../ui/BackLink';
import { Button } from '../ui/Button';
import { createCard } from '../ui/card';
import { cardTexture } from '../ui/cardTexture';
import { CoinBadge } from '../ui/CoinBadge';
import { showPurchaseOffer } from '../ui/PurchaseModal';
import { showToast } from '../ui/toast';
import { albumTitle, t } from '../i18n';

export class ShopScene extends Phaser.Scene {
  private page = 0;
  private unlockedId?: string;
  constructor() { super('Shop'); }
  init(data: { page?: number; unlockedId?: string } = {}): void {
    this.page = Math.max(0, Math.min(Math.ceil(SHOP_ALBUMS.length / 4) - 1, data.page ?? 0));
    this.unlockedId = data.unlockedId;
  }
  preload(): void {
    for (const album of this.entries()) if (!this.textures.exists('shop-' + album.id)) this.load.image('shop-' + album.id, album.characters[0].image);
  }
  private entries() { return SHOP_ALBUMS.slice(this.page * 4, this.page * 4 + 4); }
  create(): void {
    applyTheme(this); centerLayout(this);
    new BackLink(this, 35, 65, t('albums'), () => goToScene(this, 'Album'));
    new CoinBadge(this, 580, 65);
    this.label(360, 150, t('shopTitle'), 46);
    this.label(360, 215, t('shopSubtitle', { price: ECONOMY.albumPrice }), 25, getTheme().textMuted);
    this.entries().forEach((album, index) => {
      const owned = ownsAlbum(album.id);
      const x = 190 + index % 2 * 340, y = 420 + Math.floor(index / 2) * SHOP_ROW_SPACING;
      const card = createCard(this, x, y, 308, 310, () => {
        if (owned) { goToScene(this, 'Album', { albumId: album.id }); return; }
        if (album.ready === false) { showToast(this, t('albumUnavailable')); return; }
        showPurchaseOffer(this, { kind: 'album', albumId: album.id, title: albumTitle(album) }, () => restartScene(this, { page: this.page, unlockedId: album.id }));
      }, owned ? album.accent : undefined);
      const key = 'shop-' + album.id;
      if (this.textures.exists(key)) card.add(this.add.image(0, -70, cardTexture(this, key, 308, 170, { tl: CARD_RADIUS, tr: CARD_RADIUS, br: 0, bl: 0 }, false, album.coverFocusY)));
      card.add(this.label(0, 46, albumTitle(album), 25).setWordWrapWidth(270));
      card.add(this.label(0, 110, owned ? t('ownedOpen') : album.ready === false ? t('soon') : t('buyAlbum', { price: ECONOMY.albumPrice }), 22, owned ? album.accent : getTheme().accent));
      if (this.unlockedId === album.id) {
        card.setScale(0.92).setAlpha(0.4);
        this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 550, ease: 'Back.easeOut' });
      }
      this.label(x, y + 178, t('shopReward', { count: getAlbumLevels(album.id).length, coins: ECONOMY.firstCompletionRewards.reduce((sum, value) => sum + value, 0) }), 21, getTheme().textMuted);
    });
    const count = Math.ceil(SHOP_ALBUMS.length / 4);
    new Button(this, 155, 1040, t('back'), () => restartScene(this, { page: this.page - 1 }), 0.68, 'secondary').setEnabled(this.page > 0);
    this.label(360, 1040, (this.page + 1) + ' / ' + count, 26);
    new Button(this, 565, 1040, t('next'), () => restartScene(this, { page: this.page + 1 }), 0.68, 'secondary').setEnabled(this.page < count - 1);
    const watch = new Button(this, 360, 1170, t('watchAd', { coins: ECONOMY.rewardedVideoCoins }), () => { void this.watchAd(); }, SHOP_AD_BUTTON_SCALE);
    const update = () => watch.setVisible(rewardedAds.available || rewardedAds.busy).setEnabled(!rewardedAds.busy).setLabel(rewardedAds.busy ? t('adLoading') : t('watchAd', { coins: ECONOMY.rewardedVideoCoins }));
    const unsubscribe = rewardedAds.subscribe(update); update();
    this.events.once('shutdown', unsubscribe);
  }
  private async watchAd(): Promise<void> {
    const result = await rewardedAds.show();
    if (!this.sys.isActive()) return;
    showToast(this, result.status === 'rewarded' ? '+' + result.coins + ' ' + t('coins') : t(result.status === 'closed' ? 'adClosed' : 'adUnavailable'));
  }
  private label(x: number, y: number, text: string, size: number, color = getTheme().text): Phaser.GameObjects.Text {
    return this.add.text(x, y, text.replace(/🪙/g, t('coins')), { fontFamily: FONT_FAMILY, fontSize: size + 'px', color: toCss(color), align: 'center', wordWrap: { width: 620 } }).setOrigin(0.5);
  }
}
