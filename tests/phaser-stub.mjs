// Renderer-free scene tests. This deliberately does not claim to test Phaser or browser input.
import { EventEmitter } from 'node:events';

export class Display extends EventEmitter {
  constructor(scene, x = 0, y = 0) { super(); Object.assign(this, { scene, x, y, scale: 1, visible: true, list: [] }); }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setX(x) { this.x = x; return this; }
  setY(y) { this.y = y; return this; }
  setScale(scale) { this.scale = scale; return this; }
  setText(text) { this.text = text; return this; }
  setIcon() { return this; }
  setTooltip() { return this; }
  setVisible(visible) { this.visible = visible; return this; }
  setDepth() { return this; }
  setInteractive() { return this; }
  disableInteractive() { return this; }
  setOrigin() { return this; }
  setAlpha() { return this; }
  setDisplaySize() { return this; }
  setFillStyle() { return this; }
  setColor() { return this; }
  clear() { return this; }
  lineStyle() { return this; }
  fillStyle() { return this; }
  fillRect() { return this; }
  strokeRect() { return this; }
  fillRoundedRect() { return this; }
  explode() { return this; }
  add(children) { this.list.push(...children); return this; }
  destroy() { this.destroyed = true; }
}
export const GameObjects = { Image: Display, Container: Display };
export const Math = { Clamp: (v, min, max) => globalThis.Math.max(min, globalThis.Math.min(max, v)), Between: () => 0, Distance: { Between: (x, y, a, b) => globalThis.Math.hypot(x - a, y - b) } };
export const Utils = { Array: { Remove: (array, value) => { const i = array.indexOf(value); if (i >= 0) array.splice(i, 1); }, Shuffle: a => a, GetRandom: a => a[0] } };
export class Scene {
  constructor() {
    this.scale = { width: 720, height: 1280 };
    this.input = Object.assign(new EventEmitter(), { manager: { canvas: { style: {} }, defaultCursor: 'default' } });
    this.events = new EventEmitter();
    this.time = { delayedCall: () => ({ remove() {} }) };
    this.add = Object.fromEntries(['graphics', 'text', 'image', 'rectangle', 'zone', 'container', 'particles'].map(name => [name, (...args) => {
      const d = new Display(this, args[0], args[1]);
      if (name === 'container') d.list = args[2] ?? [];
      return d;
    }]));
    this.add.existing = () => {};
    const queue = [];
    this.tweens = {
      add: config => {
        const tween = { config, stopped: false, stop() { this.stopped = true; }, complete() {
          if (this.stopped) return;
          this.stopped = true;
          for (const key of ['x', 'y', 'scale']) if (key in config) config.targets[key] = config[key];
          config.onComplete?.();
        } };
        queue.push(tween); return tween;
      },
      flush: () => { for (const t of queue.splice(0)) t.complete(); },
      killTweensOf() {},
    };
  }
}
