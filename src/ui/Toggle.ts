import * as Phaser from 'phaser';
import {
  COLORS,
  FONT_FAMILY,
  TOGGLE_HEIGHT,
  TOGGLE_TRACK_HEIGHT,
  TOGGLE_TRACK_WIDTH,
  TOGGLE_WIDTH,
} from '../constants';

export class Toggle extends Phaser.GameObjects.Container {
  private value: boolean;
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

    const text = scene.add
      .text(-TOGGLE_WIDTH / 2, 0, label, { fontFamily: FONT_FAMILY, fontSize: '40px', color: COLORS.text })
      .setOrigin(0, 0.5);

    this.track = scene.add.graphics();
    this.knob = scene.add.circle(0, 0, TOGGLE_TRACK_HEIGHT / 2 - 6, 0xffffff);

    const hitArea = scene.add.zone(0, 0, TOGGLE_WIDTH, TOGGLE_HEIGHT).setInteractive({ useHandCursor: true });
    hitArea.on('pointerup', () => {
      this.value = !this.value;
      this.redraw(true);
      onChange(this.value);
    });

    this.add([text, this.track, this.knob, hitArea]);
    this.redraw(false);
    scene.add.existing(this);
  }

  private redraw(animate: boolean): void {
    this.track.clear();
    this.track.fillStyle(this.value ? COLORS.accent : COLORS.surfaceLight, 1);
    this.track.fillRoundedRect(
      this.trackX - TOGGLE_TRACK_WIDTH / 2,
      -TOGGLE_TRACK_HEIGHT / 2,
      TOGGLE_TRACK_WIDTH,
      TOGGLE_TRACK_HEIGHT,
      TOGGLE_TRACK_HEIGHT / 2,
    );

    const knobOffset = TOGGLE_TRACK_WIDTH / 2 - TOGGLE_TRACK_HEIGHT / 2;
    const knobX = this.trackX + (this.value ? knobOffset : -knobOffset);

    if (animate) {
      this.scene.tweens.add({ targets: this.knob, x: knobX, duration: 150, ease: 'Quad.easeOut' });
    } else {
      this.knob.x = knobX;
    }
  }
}