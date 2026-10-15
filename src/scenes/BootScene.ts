import * as Phaser from 'phaser';
import { initAudio, preloadSounds } from '../audio';
import { ICON_KEY } from '../constants';
import { hidePreloader } from '../preloader';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.svg(ICON_KEY, 'icon.svg', { width: 512, height: 512 });
    preloadSounds(this.load);
  }

  create(): void {
    initAudio(this.sound);
    hidePreloader();
    this.scene.start('Menu');
  }
}