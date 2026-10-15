import * as Phaser from 'phaser';
import { BUTTON_HEIGHT, BUTTON_WIDTH, COLORS, FONT_FAMILY } from '../constants';

export class Button extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void) {
    super(scene, x, y);

    const bg = scene.add.graphics();
    bg.fillStyle(COLORS.accent, 1);
    bg.fillRoundedRect(-BUTTON_WIDTH / 2, -BUTTON_HEIGHT / 2, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_HEIGHT / 2);

    const text = scene.add
      .text(0, 0, label, { fontFamily: FONT_FAMILY, fontSize: '48px', fontStyle: 'bold', color: COLORS.textDark })
      .setOrigin(0.5);

    const hitArea = scene.add.zone(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT).setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => this.setScale(0.95));
    hitArea.on('pointerout', () => this.setScale(1));
    hitArea.on('pointerup', () => {
      this.setScale(1);
      onClick();
    });

    this.add([bg, text, hitArea]);
    scene.add.existing(this);
  }
}