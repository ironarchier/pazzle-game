import * as Phaser from 'phaser';
import { HOVER_DURATION, HOVER_EASE } from '../constants';

const activeTweens = new WeakMap<object, Phaser.Tweens.Tween>();

export function tweenColor(
  scene: Phaser.Scene,
  owner: object,
  from: number,
  to: number,
  apply: (color: number) => void,
): void {
  activeTweens.get(owner)?.stop();

  const start = Phaser.Display.Color.ValueToColor(from);
  const end = Phaser.Display.Color.ValueToColor(to);

  const tween = scene.tweens.addCounter({
    from: 0,
    to: 100,
    duration: HOVER_DURATION,
    ease: HOVER_EASE,
    onUpdate: (t) => {
      const { r, g, b } = Phaser.Display.Color.Interpolate.ColorWithColor(start, end, 100, t.getValue() ?? 100);
      apply(Phaser.Display.Color.GetColor(r, g, b));
    },
  });
  activeTweens.set(owner, tween);
}
