import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';

export function centerLayout(scene: Phaser.Scene): void {
  const apply = () => {
    const { width, height } = scene.scale;
    scene.cameras.main.setScroll(-(width - GAME_WIDTH) / 2, -(height - GAME_HEIGHT) / 2);
  };

  apply();
  scene.scale.on(Phaser.Scale.Events.RESIZE, apply);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, apply));
}