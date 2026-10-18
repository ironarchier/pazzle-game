import * as Phaser from 'phaser';
import { FONT_FAMILY, HOVER_DURATION, HOVER_EASE, SEGMENT, TOGGLE_TRACK_HEIGHT, TOGGLE_WIDTH } from '../constants';
import { playClick } from '../audio';
import { getTheme, toCss } from '../theme';

export class Segmented<T extends string> extends Phaser.GameObjects.Container {
  private value: T;
  private readonly pill: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly options: { id: T; label: string }[];
  private readonly left: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    options: { id: T; label: string }[],
    value: T,
    onChange: (value: T) => void,
  ) {
    super(scene, x, y);
    this.value = value;
    this.options = options;
    const theme = getTheme();
    const width = options.length * SEGMENT.optionWidth + SEGMENT.padding * 2;
    const height = TOGGLE_TRACK_HEIGHT;
    this.left = TOGGLE_WIDTH / 2 - width + SEGMENT.padding;

    const text = scene.add
      .text(-TOGGLE_WIDTH / 2, 0, label, { fontFamily: FONT_FAMILY, fontSize: '40px', color: toCss(theme.text) })
      .setOrigin(0, 0.5);
    const track = scene.add.graphics()
      .fillStyle(theme.track, 1)
      .fillRoundedRect(TOGGLE_WIDTH / 2 - width, -height / 2, width, height, height / 2);
    const pillHeight = height - SEGMENT.padding * 2;
    this.pill = scene.add.graphics()
      .fillStyle(theme.accent, 1)
      .fillRoundedRect(0, -pillHeight / 2, SEGMENT.optionWidth, pillHeight, pillHeight / 2);
    this.add([text, track, this.pill]);

    options.forEach((option, i) => {
      const centerX = this.left + SEGMENT.optionWidth * (i + 0.5);
      const optionText = scene.add
        .text(centerX, 0, option.label, { fontFamily: FONT_FAMILY, fontSize: `${SEGMENT.fontSize}px`, fontStyle: 'bold' })
        .setOrigin(0.5);
      const hitArea = scene.add.zone(centerX, 0, SEGMENT.optionWidth, height).setInteractive({ useHandCursor: true });
      hitArea.on('pointerup', () => {
        if (this.value === option.id) return;
        this.value = option.id;
        playClick();
        this.refresh(true);
        onChange(option.id);
      });
      this.labels.push(optionText);
      this.add([optionText, hitArea]);
    });

    this.refresh(false);
    scene.add.existing(this);
  }

  private refresh(animate: boolean): void {
    const theme = getTheme();
    const index = this.options.findIndex(option => option.id === this.value);
    const x = this.left + SEGMENT.optionWidth * index;
    this.scene.tweens.killTweensOf(this.pill);
    if (animate) this.scene.tweens.add({ targets: this.pill, x, duration: HOVER_DURATION, ease: HOVER_EASE });
    else this.pill.x = x;
    this.labels.forEach((label, i) => label.setColor(toCss(i === index ? theme.accentText : theme.textMuted)));
  }
}
