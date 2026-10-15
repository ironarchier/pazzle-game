import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { BACKGROUND_COLOR, GAME_HEIGHT, GAME_WIDTH } from './constants';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: BACKGROUND_COLOR,
  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: [BootScene, MenuScene, GameScene],
});