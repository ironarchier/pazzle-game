import * as Phaser from 'phaser';
import {
  BUTTON_HEIGHT,
  BUTTON_HOVER_SCALE,
  BUTTON_PRESS_SCALE,
  BUTTON_WIDTH,
  FONT_FAMILY,
  HOVER_DURATION,
  HOVER_EASE,
} from '../constants';
import { getTheme, toCss } from '../theme';
import { tweenColor } from './tweenColor';

export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private bgColor: number;

  constructor(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void) {
    super(scene, x, y);
    const theme = getTheme();

    this.bg = scene.add.graphics();
    this.bgColor = theme.accent;
    this.drawBg(this.bgColor);

    const text = scene.add
      .text(0, 0, label, { fontFamily: FONT_FAMILY, fontSize: '48px', fontStyle: 'bold', color: toCss(theme.accentText) })
      .setOrigin(0.5);

    const hitArea = scene.add.zone(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT).setInteractive({ useHandCursor: true });
    hitArea.on('pointerover', () => {
      this.fadeBg(getTheme().accentHover);
      this.scaleTo(BUTTON_HOVER_SCALE);
    });
    hitArea.on('pointerout', () => {
      this.fadeBg(getTheme().accent);
      this.scaleTo(1);
    });
    hitArea.on('pointerdown', () => this.scaleTo(BUTTON_PRESS_SCALE));
    hitArea.on('pointerup', () => {
      this.scaleTo(BUTTON_HOVER_SCALE);
      onClick();
    });

    this.add([this.bg, text, hitArea]);
    scene.add.existing(this);
  }

  private fadeBg(color: number): void {
    tweenColor(this.scene, this.bg, this.bgColor, color, (c) => {
      this.bgColor = c;
      this.drawBg(c);
    });
  }

  private drawBg(color: number): void {
    this.bg.clear();
    this.bg.fillStyle(color, 1);
    this.bg.fillRoundedRect(-BUTTON_WIDTH / 2, -BUTTON_HEIGHT / 2, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_HEIGHT / 2);
  }

  private scaleTo(scale: number): void {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, scale, duration: HOVER_DURATION, ease: HOVER_EASE });
  }
}
