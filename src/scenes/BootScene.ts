import * as Phaser from 'phaser';
import { initAudio, preloadMusic } from '../audio';
import { FONT_NAME, FONT_SAMPLE, GAME_ICON_SIZE, GAME_ICONS } from '../constants';
import { hidePreloader, showStartupError } from '../preloader';
import { initializePlatform } from '@game-platform';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    preloadMusic(this.load);
    for (const [name, key] of Object.entries(GAME_ICONS)) {
      this.load.svg(key, `icons/${name}.svg`, { width: GAME_ICON_SIZE, height: GAME_ICON_SIZE });
    }
  }

  create(): void {
    const fonts = ['400', '700'].map(weight => document.fonts.load(`${weight} 32px ${FONT_NAME}`, FONT_SAMPLE));
    Promise.all([Promise.allSettled(fonts), initializePlatform(this.game)]).then(() => {
      initAudio(this.sound);
      hidePreloader();
      this.scene.start('Menu');
    }).catch(error => { console.error('Platform initialization failed', error); showStartupError(); });
  }
}
