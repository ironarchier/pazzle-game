import * as Phaser from 'phaser';
import { initAudio } from '../audio';
import { FONT_NAME, FONT_SAMPLE, GAME_ICON_SIZE, GAME_ICONS } from '../constants';
import { hidePreloader } from '../preloader';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const [name, key] of Object.entries(GAME_ICONS)) {
      this.load.svg(key, `icons/${name}.svg`, { width: GAME_ICON_SIZE, height: GAME_ICON_SIZE });
    }
  }

  create(): void {
    initAudio(this.sound);
    const fonts = ['400', '700'].map(weight => document.fonts.load(`${weight} 32px ${FONT_NAME}`, FONT_SAMPLE));
    Promise.allSettled(fonts).then(() => {
      hidePreloader();
      this.scene.start('Menu');
    });
  }
}
