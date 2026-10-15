import * as Phaser from 'phaser';
import { playClick } from '../audio';
import {
  BACK_LINK_CHEVRON_SIZE,
  BACK_LINK_CHEVRON_WIDTH,
  BACK_LINK_FONT_SIZE,
  BACK_LINK_GAP,
  BACK_LINK_HEIGHT,
  FONT_FAMILY,
} from '../constants';
import { getTheme, toCss } from '../theme';
import { tweenColor } from './tweenColor';

export class BackLink extends Phaser.GameObjects.Container {
  private readonly chevron: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private color: number;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void) {
    super(scene, x, y);
    const theme = getTheme();
    this.color = theme.accent;

    this.chevron = scene.add.graphics();
    this.label = scene.add
      .text(BACK_LINK_CHEVRON_SIZE + BACK_LINK_GAP, 0, text, {
        fontFamily: FONT_FAMILY,
        fontSize: `${BACK_LINK_FONT_SIZE}px`,
      })
      .setOrigin(0, 0.5);
    this.paint(this.color);

    const width = this.label.x + this.label.width;
    const hitArea = scene.add.zone(width / 2, 0, width, BACK_LINK_HEIGHT).setInteractive({ useHandCursor: true });
    hitArea.on('pointerover', () => this.fade(getTheme().accentHover));
    hitArea.on('pointerout', () => this.fade(getTheme().accent));
    hitArea.on('pointerup', () => {
      playClick();
      onClick();
    });

    this.add([this.chevron, this.label, hitArea]);
    scene.add.existing(this);
  }

  private fade(color: number): void {
    tweenColor(this.scene, this, this.color, color, (c) => this.paint(c));
  }

  private paint(color: number): void {
    this.color = color;
    this.label.setColor(toCss(color));

    const s = BACK_LINK_CHEVRON_SIZE;
    this.chevron.clear();
    this.chevron.lineStyle(BACK_LINK_CHEVRON_WIDTH, color, 1);
    this.chevron.strokePoints(
      [new Phaser.Math.Vector2(s, -s), new Phaser.Math.Vector2(0, 0), new Phaser.Math.Vector2(s, s)],
      false,
    );
  }
}
