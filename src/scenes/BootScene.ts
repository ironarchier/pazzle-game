import * as Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // Здесь загружаем ассеты: this.load.image('key', 'assets/...')
  }

  create(): void {
    this.scene.start('Game');
  }
}