import * as Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, 'Pazzle Game', {
        fontFamily: 'Arial',
        fontSize: '64px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
  }
}