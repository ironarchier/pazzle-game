import * as Phaser from 'phaser';
import { playClick } from '../audio';
import {
  BACK_LINK_CHEVRON_SIZE,
  BACK_LINK_CHEVRON_WIDTH,
  BACK_LINK_FONT_SIZE,
  BACK_LINK_GAP,
  BACK_LINK_HEIGHT,
  BACK_LINK_PADDING,
  FONT_FAMILY,
} from '../constants';
import { getTheme, toCss } from '../theme';
import { tweenColor } from './tweenColor';

export class BackLink extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly pillWidth: number;
  private bgColor: number;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void) {
    super(scene, x, y);
    const theme = getTheme();
    this.bgColor = theme.hoverSurface;

    const s = BACK_LINK_CHEVRON_SIZE;
    const chevron = scene.add.graphics()
      .lineStyle(BACK_LINK_CHEVRON_WIDTH, theme.accent, 1)
      .strokePoints([new Phaser.Math.Vector2(BACK_LINK_PADDING + s, -s), new Phaser.Math.Vector2(BACK_LINK_PADDING, 0), new Phaser.Math.Vector2(BACK_LINK_PADDING + s, s)], false);
    const label = scene.add
      .text(BACK_LINK_PADDING + s + BACK_LINK_GAP, 0, text, {
        fontFamily: FONT_FAMILY,
        fontSize: `${BACK_LINK_FONT_SIZE}px`,
        fontStyle: 'bold',
        color: toCss(theme.accent),
      })
      .setOrigin(0, 0.5);
    this.pillWidth = label.x + label.width + BACK_LINK_PADDING;

    this.bg = scene.add.graphics();
    this.drawBg(this.bgColor);

    const hitArea = scene.add.zone(this.pillWidth / 2, 0, this.pillWidth, BACK_LINK_HEIGHT).setInteractive({ useHandCursor: true });
    hitArea.on('pointerover', () => this.fade(getTheme().border));
    hitArea.on('pointerout', () => this.fade(getTheme().hoverSurface));
    hitArea.on('pointerup', () => {
      playClick();
      onClick();
    });

    this.add([this.bg, chevron, label, hitArea]);
    scene.add.existing(this);
  }

  private fade(color: number): void {
    tweenColor(this.scene, this.bg, this.bgColor, color, (c) => {
      this.bgColor = c;
      this.drawBg(c);
    });
  }

  private drawBg(color: number): void {
    this.bg.clear().fillStyle(color, 1).fillRoundedRect(0, -BACK_LINK_HEIGHT / 2, this.pillWidth, BACK_LINK_HEIGHT, BACK_LINK_HEIGHT / 2);
  }
}
