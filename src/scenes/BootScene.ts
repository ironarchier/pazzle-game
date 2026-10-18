import * as Phaser from 'phaser';
import { initAudio, preloadSounds } from '../audio';
import { GAME_ICON_SIZE, GAME_ICONS, ICON_KEY } from '../constants';
import { hidePreloader } from '../preloader';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.svg(ICON_KEY, 'icon.svg', { width: 512, height: 512 });
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