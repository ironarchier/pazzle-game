import * as Phaser from 'phaser';
import { TRANSITION_DURATION } from './constants';

let inProgress = false;

export function isTransitioning(): boolean {
  return inProgress;
}

export function crossfade(game: Phaser.Game, change: () => void): void {
  if (inProgress) return;
  inProgress = true;

  game.renderer.snapshot((snapshot: Phaser.Display.Color | HTMLImageElement) => {
    if (!(snapshot instanceof HTMLImageElement)) {
      change();
      inProgress = false;
      return;
    }

    Object.assign(snapshot.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '5',
      pointerEvents: 'none',
      transition: `opacity ${TRANSITION_DURATION}ms ease`,
    });
    document.body.appendChild(snapshot);
    change();

    const finish = () => {
      snapshot.remove();
      inProgress = false;
    };
    requestAnimationFrame(() => requestAnimationFrame(() => (snapshot.style.opacity = '0')));
    snapshot.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, TRANSITION_DURATION + 100);
  });
}

export function goToScene(from: Phaser.Scene, key: string, data: object = {}): void {
  crossfade(from.game, () => from.scene.start(key, data));
}

export function restartScene(scene: Phaser.Scene, data: object = {}): void {
  crossfade(scene.game, () => scene.scene.restart(data));
}
