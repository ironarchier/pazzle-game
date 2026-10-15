import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';

function onResize(scene: Phaser.Scene, handler: () => void): void {
  handler();
  scene.scale.on(Phaser.Scale.Events.RESIZE, handler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, handler));
}

export function centerLayout(scene: Phaser.Scene): void {
  onResize(scene, () => {
    const { width, height } = scene.scale;
    scene.cameras.main.setScroll(-(width - GAME_WIDTH) / 2, -(height - GAME_HEIGHT) / 2);
  });
}

export function createUiCamera(scene: Phaser.Scene): Phaser.Cameras.Scene2D.Camera {
  const camera = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height);
  onResize(scene, () => camera.setSize(scene.scale.width, scene.scale.height));
  return camera;
}
