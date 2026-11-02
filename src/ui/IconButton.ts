import * as Phaser from 'phaser';
import { playClick } from '../audio';
import {
  FONT_FAMILY,
  ICON_BADGE,
  ICON_BUTTON_BG_RADIUS,
  ICON_BUTTON_ICON_SIZE,
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
  private readonly bg: Phaser.GameObjects.Graphics;
  private bgColor: number;
  private readonly tooltip: Phaser.GameObjects.Container;
  private readonly tooltipWidth: number;
  private color: number;
  private toggled = false;
  private hovered = false;
  private readonly radius: number;
  private badgeBg?: Phaser.GameObjects.Graphics;
  private badgeText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, iconKey: string, tooltip: string, onClick: () => void, radius = ICON_BUTTON_BG_RADIUS) {
    super(scene, x, y);
    const theme = getTheme();
    this.radius = radius;
    const ratio = radius / ICON_BUTTON_BG_RADIUS;
    const iconSize = ICON_BUTTON_ICON_SIZE * ratio;
    const hitSize = ICON_BUTTON_SIZE * ratio;
    this.color = this.targetColor();
    this.bgColor = this.targetBgColor();

    this.bg = scene.add.graphics();
    this.drawBg(this.bgColor);
    this.icon = scene.add.image(0, 0, iconKey).setDisplaySize(iconSize, iconSize).setTint(this.color);
    const text = scene.add
      .text(0, TOOLTIP_PADDING_Y, tooltip, { fontFamily: FONT_FAMILY, fontSize: `${TOOLTIP_FONT_SIZE}px`, color: toCss(theme.background) })
      .setOrigin(0.5, 0);
    const width = text.width + TOOLTIP_PADDING_X * 2;
    this.tooltipWidth = width;
    const height = text.height + TOOLTIP_PADDING_Y * 2;
    const bg = scene.add.graphics().fillStyle(theme.text, 0.9).fillRoundedRect(-width / 2, 0, width, height, TOOLTIP_RADIUS);
    this.tooltip = scene.add.container(0, hitSize / 2 + TOOLTIP_OFFSET, [bg, text]).setVisible(false);

    const hitArea = scene.add.zone(0, 0, hitSize, hitSize).setInteractive({ useHandCursor: true });
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

    this.add([this.bg, this.icon, hitArea, this.tooltip]);
    scene.add.existing(this);
  }

  private showTooltip(): void {
    const half = this.tooltipWidth / 2;
    const min = TOOLTIP_OFFSET + half - this.x;
    const max = this.scene.scale.width - TOOLTIP_OFFSET - half - this.x;
    this.tooltip.setX(Phaser.Math.Clamp(0, min, max)).setVisible(true);
  }

  setBadge(value: number): this {
    const theme = getTheme();
    if (!this.badgeBg || !this.badgeText) {
      const offset = this.radius * ICON_BADGE.offset;
      this.badgeBg = this.scene.add.graphics().setPosition(offset, -offset);
      this.badgeText = this.scene.add
        .text(offset, -offset, '', { fontFamily: FONT_FAMILY, fontSize: `${ICON_BADGE.fontSize}px`, fontStyle: 'bold' })
        .setOrigin(0.5);
      this.addAt([this.badgeBg, this.badgeText], this.getIndex(this.tooltip));
    }
    const active = value > 0;
    this.badgeBg.clear()
      .fillStyle(theme.surface, 1)
      .fillCircle(0, 0, ICON_BADGE.radius + ICON_BADGE.border)
      .fillStyle(active ? theme.accent : theme.border, 1)
      .fillCircle(0, 0, ICON_BADGE.radius);
    this.badgeText.setText(String(value)).setColor(toCss(active ? theme.accentText : theme.textMuted));
    this.badgeBg.setVisible(active); this.badgeText.setVisible(active);
    return this;
  }

  setToggled(toggled: boolean): this {
    if (this.toggled === toggled) return this;
    this.toggled = toggled;
    this.fade();
    return this;
  }

  private targetColor(): number {
    const theme = getTheme();
    if (this.toggled) return theme.accentText;
    return this.hovered ? theme.text : theme.textMuted;
  }

  private targetBgColor(): number {
    const theme = getTheme();
    if (this.toggled) return this.hovered ? theme.accentHover : theme.accent;
    return this.hovered ? theme.border : theme.hoverSurface;
  }

  private drawBg(color: number): void {
    this.bg.clear().fillStyle(color, 1).fillCircle(0, 0, this.radius);
  }

  private fade(): void {
    tweenColor(this.scene, this, this.color, this.targetColor(), (c) => {
      this.color = c;
      this.icon.setTint(c);
    });
    tweenColor(this.scene, this.bg, this.bgColor, this.targetBgColor(), (c) => {
      this.bgColor = c;
      this.drawBg(c);
    });
  }
}
