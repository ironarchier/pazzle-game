import * as Phaser from 'phaser';
import { FONT_FAMILY } from '../constants';
import { getProgress, subscribeProgress } from '../progress';
import { getTheme, toCss } from '../theme';

export class CoinBadge extends Phaser.GameObjects.Container {
  private counter: Phaser.GameObjects.Text;
  private value = { amount: getProgress().economy.balance };
  private unsubscribe: () => void;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const theme = getTheme();
    const bg = scene.add.graphics().fillStyle(theme.hoverSurface, 1).fillRoundedRect(-94, -29, 188, 58, 29);
    const coin = scene.add.graphics().fillStyle(0xffce68, 1).fillCircle(-57, 0, 16).lineStyle(2, 0xd19b36, 1).strokeCircle(-57, 0, 12);
    this.counter = scene.add.text(15, 0, String(this.value.amount), { fontFamily: FONT_FAMILY, fontSize: '28px', fontStyle: 'bold', color: toCss(theme.text) }).setOrigin(0.5);
    this.add([bg, coin, this.counter]); scene.add.existing(this);
    this.unsubscribe = subscribeProgress(event => {
      if (event.delta === 0 && event.balance === this.value.amount) return;
      scene.tweens.killTweensOf(this.value);
      scene.tweens.add({ targets: this.value, amount: event.balance, duration: 350, ease: 'Cubic.easeOut', onUpdate: () => this.counter.setText(String(Math.round(this.value.amount))), onComplete: () => this.counter.setText(String(event.balance)) });
      if (event.delta > 0) {
        const amount = scene.add.text(-10, 0, '+' + event.delta, { fontFamily: FONT_FAMILY, fontSize: '27px', fontStyle: 'bold', color: toCss(theme.accent) }).setOrigin(0.5);
        const symbol = scene.add.graphics().fillStyle(0xffce68).fillCircle(amount.width / 2 + 9, 0, 10).lineStyle(1.5, 0xd19b36).strokeCircle(amount.width / 2 + 9, 0, 7);
        amount.cameraFilter = symbol.cameraFilter = this.counter.cameraFilter;
        const reward = scene.add.container(0, -35, [amount, symbol]);
        this.add(reward);
        scene.tweens.add({ targets: reward, y: -90, alpha: 0, duration: 1400, onComplete: () => reward.destroy() });
      }
    });
  }
  destroy(fromScene?: boolean): void {
    this.unsubscribe?.();
    this.scene?.tweens.killTweensOf(this.value);
    super.destroy(fromScene);
  }
}
