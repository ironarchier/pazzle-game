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
  private readonly tooltipWidth: number;
  private color: number;
  private toggled = false;
  private hovered = false;

  constructor(scene: Phaser.Scene, x: number, y: number, iconKey: string, tooltip: string, onClick: () => void) {
    super(scene, x, y);
    const theme = getTheme();
    this.color = this.targetColor();

    this.icon = scene.add.image(0, 0, iconKey).setTint(this.color);
    const text = scene.add
      .text(0, TOOLTIP_PADDING_Y, tooltip, { fontFamily: FONT_FAMILY, fontSize: `${TOOLTIP_FONT_SIZE}px`, color: toCss(theme.background) })
      .setOrigin(0.5, 0);
    const width = text.width + TOOLTIP_PADDING_X * 2;
    this.tooltipWidth = width;
    const height = text.height + TOOLTIP_PADDING_Y * 2;
    const bg = scene.add.graphics().fillStyle(theme.text, 0.9).fillRoundedRect(-width / 2, 0, width, height, TOOLTIP_RADIUS);
    this.tooltip = scene.add.container(0, ICON_BUTTON_SIZE / 2 + TOOLTIP_OFFSET, [bg, text]).setVisible(false);

    const hitArea = scene.add.zone(0, 0, ICON_BUTTON_SIZE, ICON_BUTTON_SIZE).setInteractive({ useHandCursor: true });
    hitArea.on('pointerover', () => {
      this.hovered = true;
      this.fade();
      this.showTooltip();
    });
    hitArea.on('pointerout', () => {
      this.hovered = false;
      this.fade();
      this.tooltip.setVisible(false);
    });
    hitArea.on('pointerup', () => {
      playClick();
      onClick();
    });

    this.add([this.icon, hitArea, this.tooltip]);
    scene.add.existing(this);
  }

  private showTooltip(): void {
    const half = this.tooltipWidth / 2;
    const min = TOOLTIP_OFFSET + half - this.x;
    const max = this.scene.scale.width - TOOLTIP_OFFSET - half - this.x;
    this.tooltip.setX(Phaser.Math.Clamp(0, min, max)).setVisible(true);
  }

  setToggled(toggled: boolean): this {
    if (this.toggled === toggled) return this;
    this.toggled = toggled;
    this.fade();
    return this;
  }

  private targetColor(): number {
    const theme = getTheme();
    if (this.toggled) return this.hovered ? theme.accentHover : theme.accent;
    return this.hovered ? theme.text : theme.textMuted;
  }

  private fade(): void {
    tweenColor(this.scene, this, this.color, this.targetColor(), (c) => {
      this.color = c;
      this.icon.setTint(c);
    });
  }
}
