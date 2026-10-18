import * as Phaser from 'phaser';
import {
  FONT_FAMILY,
  HOVER_DURATION,
  HOVER_EASE,
  TOGGLE_HEIGHT,
  TOGGLE_HOVER_PADDING,
  TOGGLE_TRACK_HEIGHT,
  TOGGLE_TRACK_WIDTH,
  TOGGLE_WIDTH,
} from '../constants';
import { playClick } from '../audio';
import { getTheme, toCss } from '../theme';
import { tweenColor } from './tweenColor';

export class Toggle extends Phaser.GameObjects.Container {
  private value: boolean;
  private hovered = false;
  private trackColor: number;
  private readonly track: Phaser.GameObjects.Graphics;
  private readonly knob: Phaser.GameObjects.Arc;
  private readonly trackX = TOGGLE_WIDTH / 2 - TOGGLE_TRACK_WIDTH / 2;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    value: boolean,
    onChange: (value: boolean) => void,
  ) {
    super(scene, x, y);
    this.value = value;
    const theme = getTheme();

    const hoverWidth = TOGGLE_WIDTH + TOGGLE_HOVER_PADDING * 2;
    const hoverBg = scene.add.graphics().setAlpha(0);
    hoverBg.fillStyle(theme.hoverSurface, 1);
    hoverBg.fillRoundedRect(-hoverWidth / 2, -TOGGLE_HEIGHT / 2, hoverWidth, TOGGLE_HEIGHT, TOGGLE_HEIGHT / 4);

    const text = scene.add
      .text(-TOGGLE_WIDTH / 2, 0, label, { fontFamily: FONT_FAMILY, fontSize: '40px', color: toCss(theme.text) })
      .setOrigin(0, 0.5);

    this.track = scene.add.graphics();
    this.trackColor = this.targetTrackColor();
    this.drawTrack(this.trackColor);
    this.knob = scene.add.circle(0, 0, TOGGLE_TRACK_HEIGHT / 2 - 6, 0xffffff);

    const setHovered = (hovered: boolean) => {
      this.hovered = hovered;
      this.fadeTrack();
      scene.tweens.killTweensOf(hoverBg);
      scene.tweens.add({ targets: hoverBg, alpha: hovered ? 1 : 0, duration: HOVER_DURATION, ease: HOVER_EASE });
    };

    const hitArea = scene.add.zone(0, 0, hoverWidth, TOGGLE_HEIGHT).setInteractive({ useHandCursor: true });
    hitArea.on('pointerover', () => setHovered(true));
    hitArea.on('pointerout', () => setHovered(false));
    hitArea.on('pointerup', () => {
      this.value = !this.value;
      this.fadeTrack();
      this.moveKnob(true);
      onChange(this.value);
      playClick();
    });

    this.add([hoverBg, text, this.track, this.knob, hitArea]);
    this.moveKnob(false);
    scene.add.existing(this);
  }

  private targetTrackColor(): number {
    const theme = getTheme();
    if (!this.value) return theme.track;
    return this.hovered ? theme.accentHover : theme.accent;
  }

  private fadeTrack(): void {
    tweenColor(this.scene, this.track, this.trackColor, this.targetTrackColor(), (color) => {
      this.trackColor = color;
      this.drawTrack(color);
    });
  }

  private drawTrack(color: number): void {
    this.track.clear();
    this.track.fillStyle(color, 1);
    this.track.fillRoundedRect(
      this.trackX - TOGGLE_TRACK_WIDTH / 2,
      -TOGGLE_TRACK_HEIGHT / 2,
      TOGGLE_TRACK_WIDTH,
      TOGGLE_TRACK_HEIGHT,
      TOGGLE_TRACK_HEIGHT / 2,
    );
  }

  private moveKnob(animate: boolean): void {
    const knobOffset = TOGGLE_TRACK_WIDTH / 2 - TOGGLE_TRACK_HEIGHT / 2;
    const knobX = this.trackX + (this.value ? knobOffset : -knobOffset);

    if (animate) {
      this.scene.tweens.killTweensOf(this.knob);
      this.scene.tweens.add({ targets: this.knob, x: knobX, duration: HOVER_DURATION, ease: HOVER_EASE });
    } else {
      this.knob.x = knobX;
    }
  }
}
