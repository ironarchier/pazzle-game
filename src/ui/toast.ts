import * as Phaser from 'phaser';
import { CARD_RADIUS, FONT_FAMILY } from '../constants';
import { getTheme, toCss } from '../theme';

export function showToast(scene: Phaser.Scene, message: string): void {
  const x = scene.cameras.main.scrollX + scene.scale.width / 2;
  const y = scene.cameras.main.scrollY + scene.scale.height - 120;
  const width = Math.min(620, scene.scale.width - 40), theme = getTheme();
  const bg = scene.add.graphics().fillStyle(theme.surface, 1).fillRoundedRect(-width / 2, -50, width, 100, CARD_RADIUS).lineStyle(2, theme.border, 1).strokeRoundedRect(-width / 2, -50, width, 100, CARD_RADIUS);
  const text = scene.add.text(0, 0, message.replace(/🪙/g, 'монет'), { fontFamily: FONT_FAMILY, fontSize: '25px', color: toCss(theme.text), align: 'center', wordWrap: { width: width - 32 } }).setOrigin(0.5);
  const root = scene.add.container(x, y, [bg, text]).setDepth(1100);
  scene.tweens.add({ targets: root, alpha: 0, y: y - 20, delay: 2500, duration: 300, onComplete: () => root.destroy() });
}
