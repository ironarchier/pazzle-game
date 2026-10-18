import * as Phaser from 'phaser';
import {
  BUTTON_BORDER_WIDTH,
  BUTTON_HEIGHT,
  BUTTON_HOVER_GLOW,
  BUTTON_HOVER_SCALE,
  BUTTON_PRESS_SCALE,
  BUTTON_WIDTH,
  FONT_FAMILY,
  HOVER_DURATION,
  HOVER_EASE,
} from '../constants';
import { playClick } from '../audio';
import { getTheme, toCss } from '../theme';
import { gradientTexture } from './cardTexture';
import { tweenColor } from './tweenColor';

export type ButtonVariant = 'primary' | 'secondary';

export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private bgColor: number;
  private readonly baseScale: number;
  private readonly variant: ButtonVariant;
  private labelText!: Phaser.GameObjects.Text;
  private coinIcon!: Phaser.GameObjects.Graphics;
  private hitArea!: Phaser.GameObjects.Zone;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, baseScale = 1, variant: ButtonVariant = 'primary') {
    super(scene, x, y);
    this.baseScale = baseScale;
    this.variant = variant;
    const theme = getTheme();
    const primary = variant === 'primary';

    this.bg = scene.add.graphics();
    this.bgColor = primary ? 0xffffff : theme.surface;
    this.drawBg(this.bgColor);
    if (primary) this.bg.setAlpha(0);

    const text = scene.add
      .text(0, 0, label, { fontFamily: FONT_FAMILY, fontSize: '48px', fontStyle: 'bold', color: toCss(primary ? theme.accentText : theme.accent) })
      .setOrigin(0.5);

    if (text.width > BUTTON_WIDTH - 48) text.setFontSize(Math.floor(48 * (BUTTON_WIDTH - 48) / text.width));
    this.labelText = text;
    this.coinIcon = scene.add.graphics().fillStyle(0xffce68).fillCircle(0, 0, 16).lineStyle(2, 0xd19b36).strokeCircle(0, 0, 12);

    const hitArea = scene.add.zone(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT).setInteractive({ useHandCursor: true });
    this.hitArea = hitArea;
    hitArea.on('pointerover', () => {
      this.highlight(true);
      this.scaleTo(BUTTON_HOVER_SCALE);
    });
    hitArea.on('pointerout', () => {
      this.highlight(false);
      this.scaleTo(1);
    });
    let pressed: { x: number; y: number } | undefined;
    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => { pressed = { x: pointer.x, y: pointer.y }; this.scaleTo(BUTTON_PRESS_SCALE); });
    hitArea.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const start = pressed; pressed = undefined;
      if (!this.enabled || !start || Math.hypot(pointer.x - start.x, pointer.y - start.y) > 12) return;
      this.scaleTo(BUTTON_HOVER_SCALE);
      playClick();
      onClick();
    });

    if (primary) this.add([scene.add.image(0, 0, gradientTexture(scene, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_HEIGHT / 2, theme.accent, theme.secondary))]);
    this.add([this.bg, text, this.coinIcon, hitArea]);
    this.setLabel(label);
    this.setScale(baseScale);
    scene.add.existing(this);
  }

  setLabel(label: string): this {
    const withCoin = label.endsWith('🪙');
    this.labelText.setFontSize(48).setText(withCoin ? label.replace(/\s*🪙$/, '') : label);
    const available = BUTTON_WIDTH - 48 - (withCoin ? 44 : 0);
    if (this.labelText.width > available) this.labelText.setFontSize(Math.floor(48 * available / this.labelText.width));
    this.labelText.setX(withCoin ? -22 : 0);
    this.coinIcon.setVisible(withCoin).setPosition(this.labelText.width / 2 + 5, 0);
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.setAlpha(enabled ? 1 : 0.48);
    if (enabled) this.hitArea.setInteractive({ useHandCursor: true });
    else this.hitArea.disableInteractive();
    return this;
  }

  private highlight(on: boolean): void {
    if (this.variant === 'primary') {
      this.scene.tweens.killTweensOf(this.bg);
      this.scene.tweens.add({ targets: this.bg, alpha: on ? BUTTON_HOVER_GLOW : 0, duration: HOVER_DURATION, ease: HOVER_EASE });
      return;
    }
    const theme = getTheme();
    tweenColor(this.scene, this.bg, this.bgColor, on ? theme.hoverSurface : theme.surface, (c) => {
      this.bgColor = c;
      this.drawBg(c);
    });
  }

  private drawBg(color: number): void {
    const w = BUTTON_WIDTH, h = BUTTON_HEIGHT;
    this.bg.clear();
    this.bg.fillStyle(color, 1);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    if (this.variant === 'secondary') {
      this.bg.lineStyle(BUTTON_BORDER_WIDTH, getTheme().accent, 1);
      this.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    }
  }

  private scaleTo(scale: number): void {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, scale: scale * this.baseScale, duration: HOVER_DURATION, ease: HOVER_EASE });
  }
}
