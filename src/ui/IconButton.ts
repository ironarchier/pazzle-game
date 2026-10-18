import * as Phaser from 'phaser';
import { playClick } from '../audio';
import {
  FONT_FAMILY,
  ICON_BUTTON_SIZE,
  TOOLTIP_FONT_SIZE,
  TOOLTIP_OFFSET,
  TOOLTIP_PADDING_X,
  TOOLTIP_PADDING_Y,
  TOOLTIP_RADIUS,
} from '../constants';
import { getTheme, toCss } from '../theme';
import { tweenColor } from './tweenColor';

export class IconButton extends Phaser.GameObjects.Container {
  private readonly icon: Phaser.GameObjects.Image;
  private readonly tooltip: Phaser.GameObjects.Container;
  private readonly tooltipBg: Phaser.GameObjects.Graphics;
  private readonly tooltipText: Phaser.GameObjects.Text;
  private color: number;

  constructor(scene: Phaser.Scene, x: number, y: number, iconKey: string, tooltip: string, onClick: () => void) {
    super(scene, x, y);
    const theme = getTheme();
    this.color = theme.accent;

    this.icon = scene.add.image(0, 0, iconKey).setTint(this.color);
    this.tooltipBg = scene.add.graphics();
    this.tooltipText = scene.add
      .text(0, TOOLTIP_PADDING_Y, '', { fontFamily: FONT_FAMILY, fontSize: `${TOOLTIP_FONT_SIZE}px`, color: toCss(theme.background) })
      .setOrigin(0.5, 0);
    this.tooltip = scene.add.container(0, ICON_BUTTON_SIZE / 2 + TOOLTIP_OFFSET, [this.tooltipBg, this.tooltipText]).setVisible(false);
    this.setTooltip(tooltip);

    const hitArea = scene.add.zone(0, 0, ICON_BUTTON_SIZE, ICON_BUTTON_SIZE).setInteractive({ useHandCursor: true });
    hitArea.on('pointerover', () => {
      this.fade(getTheme().accentHover);
      this.tooltip.setVisible(true);
    });
    hitArea.on('pointerout', () => {
      this.fade(getTheme().accent);
      this.tooltip.setVisible(false);
    });
    hitArea.on('pointerup', () => {
      playClick();
      onClick();
    });

    this.add([this.icon, hitArea, this.tooltip]);
    scene.add.existing(this);
  }

  setIcon(iconKey: string): this {
    this.icon.setTexture(iconKey);
    return this;
  }

  setTooltip(text: string): this {
    this.tooltipText.setText(text);
    const width = this.tooltipText.width + TOOLTIP_PADDING_X * 2;
    const height = this.tooltipText.height + TOOLTIP_PADDING_Y * 2;
    this.tooltipBg.clear().fillStyle(getTheme().text, 0.9).fillRoundedRect(-width / 2, 0, width, height, TOOLTIP_RADIUS);
    return this;
  }

  private fade(color: number): void {
    tweenColor(this.scene, this, this.color, color, (c) => {
      this.color = c;
      this.icon.setTint(c);
    });
  }
}
