import * as Phaser from 'phaser';
import { initAudio, preloadSounds } from '../audio';
import { GAME_ICON_SIZE, GAME_ICONS } from '../constants';
import { hidePreloader } from '../preloader';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const [name, key] of Object.entries(GAME_ICONS)) {
      this.load.svg(key, `icons/${name}.svg`, { width: GAME_ICON_SIZE, height: GAME_ICON_SIZE });
    }
    preloadSounds(this.load);
  }

  create(): void {
    initAudio(this.sound);
    hidePreloader();
    this.scene.start('Menu');
  }
}