import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import * as Phaser from 'phaser';
import { AlbumScene } from './scenes/AlbumScene';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';
import { getTheme, toCss } from './theme';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: toCss(getTheme().background),
  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: [BootScene, MenuScene, GameScene, AlbumScene],
});