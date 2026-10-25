import * as Phaser from 'phaser';
import { CARD_RADIUS, DIALOG_BUTTON_SCALE, FONT_FAMILY } from '../constants';
import { offerState, type PurchaseIntent } from '../economy/offer';
import { buyAlbum, getProgress, subscribeProgress } from '../progress';
import { rewardedAds } from '../platform';
import { getTheme, toCss } from '../theme';
import { Button } from './Button';
import { CoinBadge } from './CoinBadge';
import { showToast } from './toast';
import { t } from '../i18n';

const modals = new WeakMap<Phaser.Scene, PurchaseModal>();
export function hasPurchaseOffer(scene: Phaser.Scene): boolean { return modals.has(scene); }
export function showPurchaseOffer(scene: Phaser.Scene, intent: PurchaseIntent, confirmed: () => void): PurchaseModal {
  const existing = modals.get(scene);
  if (existing) return existing;
  const modal = new PurchaseModal(scene, intent, confirmed);
  modals.set(scene, modal); return modal;
}

export class PurchaseModal extends Phaser.GameObjects.Container {
  private heading: Phaser.GameObjects.Text;
  private message: Phaser.GameObjects.Text;
  private status: Phaser.GameObjects.Text;
  private action: Button;
  private closed = false;
  private cleanup: (() => void)[] = [];
  private intent: PurchaseIntent;
  private confirmed: () => void;
  constructor(scene: Phaser.Scene, intent: PurchaseIntent, confirmed: () => void) {
    super(scene, scene.cameras.main.scrollX + scene.scale.width / 2, scene.cameras.main.scrollY + scene.scale.height / 2);
    this.intent = intent; this.confirmed = confirmed;
    const theme = getTheme(), width = 640, height = 650;
    const shade = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.65).setInteractive();
    const panel = scene.add.graphics().fillStyle(theme.surface, 1).fillRoundedRect(-width / 2, -height / 2, width, height, CARD_RADIUS);
    this.heading = this.label(0, -252, '', 36).setFontStyle('bold');
    const product = this.label(0, -202, intent.kind === 'album' ? intent.title : t('hintProduct'), 25, theme.textMuted);
    this.message = this.label(0, -124, '', 28);
    const balanceTitle = this.label(0, -54, t('yourBalance'), 23, theme.textMuted);
    const balance = new CoinBadge(scene, 0, -5);
    const cost = this.label(0, 49, t(intent.kind === 'album' ? 'albumCost' : 'hintCost', { price: offerState(intent, 0).price }), 25, theme.textMuted);
    this.status = this.label(0, 95, '', 20, theme.accent);
    this.action = new Button(scene, 0, 192, '', () => { void this.perform(); }, DIALOG_BUTTON_SCALE);
    const close = this.label(0, 282, t('close'), 27, theme.textMuted).setPadding(30, 12).setInteractive({ useHandCursor: true });
    close.on('pointerup', () => { if (!rewardedAds.busy) this.destroy(); });
    this.add([shade, panel, this.heading, product, this.message, balanceTitle, balance, cost, this.status, this.action, close]);
    scene.add.existing(this); this.setDepth(1000);
    this.cleanup.push(subscribeProgress(() => this.refresh()), rewardedAds.subscribe(() => this.refresh()));
    const resize = () => {
      this.setPosition(scene.cameras.main.scrollX + scene.scale.width / 2, scene.cameras.main.scrollY + scene.scale.height / 2);
      shade.setSize(scene.scale.width, scene.scale.height);
    };
    scene.scale.on('resize', resize); this.cleanup.push(() => scene.scale.off('resize', resize));
    this.setAlpha(0); scene.tweens.add({ targets: this, alpha: 1, duration: 170 });
    this.refresh();
  }
  private label(x: number, y: number, text: string, size: number, color = getTheme().text): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, text, { fontFamily: FONT_FAMILY, fontSize: size + 'px', color: toCss(color), align: 'center', wordWrap: { width: 570 } }).setOrigin(0.5);
  }
  private refresh(): void {
    if (this.closed) return;
    const state = offerState(this.intent, getProgress().economy.balance);
    this.heading.setText(state.title); this.message.setText(state.message);
    this.action.setLabel(rewardedAds.busy ? t('adLoading') : state.button).setEnabled(!rewardedAds.busy);
  }
  private async perform(): Promise<void> {
    if (this.closed || rewardedAds.busy) return;
    const state = offerState(this.intent, getProgress().economy.balance);
    if (!state.affordable) {
      this.status.setText('');
      const result = await rewardedAds.show();
      if (this.closed) return;
      this.status.setText(result.status === 'rewarded' ? '+' + result.coins + ' ' + t('coins') : t(result.status === 'closed' ? 'adClosed' : 'adUnavailable'));
      if (result.status === 'rewarded') this.scene.time.delayedCall(1600, () => { if (!this.closed) this.status.setText(''); });
      this.refresh(); return;
    }
    if (this.intent.kind === 'album') {
      const result = buyAlbum(this.intent.albumId);
      if (result.status !== 'bought' && result.status !== 'owned') { this.refresh(); return; }
      showToast(this.scene, t('albumOpened'));
    }
    const done = this.confirmed; this.destroy(); done();
  }
  destroy(fromScene?: boolean): void {
    if (this.closed) return;
    this.closed = true;
    for (const cleanup of this.cleanup) cleanup();
    modals.delete(this.scene);
    super.destroy(fromScene);
  }
}
