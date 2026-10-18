import * as Phaser from 'phaser';

/** A clipped vertical list; only this container moves, leaving the page header fixed. */
export class ScrollList {
  readonly content: Phaser.GameObjects.Container;
  private offset = 0;
  private drag?: { id: number; y: number; offset: number };
  private cleanup: (() => void)[] = [];
  private top: number;
  private height: number;
  private contentHeight: number;
  constructor(scene: Phaser.Scene, x: number, top: number, width: number, height: number, contentHeight: number) {
    this.top = top; this.height = height; this.contentHeight = contentHeight;
    this.content = scene.add.container(x, top);
    const mask = scene.make.graphics({ x: 0, y: 0 });
    mask.fillStyle(0xffffff).fillRect(x - width / 2, top, width, height);
    // Phaser 4 uses a filter for WebGL clipping and a geometry mask for Canvas.
    if (scene.renderer.type === Phaser.WEBGL) this.content.enableFilters().filters!.external.addMask(mask, false, scene.cameras.main);
    else this.content.setMask(mask.createGeometryMask());
    const inside = (pointer: Phaser.Input.Pointer) => pointer.worldX >= x - width / 2 && pointer.worldX <= x + width / 2 && pointer.worldY >= top && pointer.worldY <= top + height;
    this.containsPointer = inside;
    const down = (p: Phaser.Input.Pointer) => { if (inside(p)) this.drag = { id: p.id, y: p.y, offset: this.offset }; };
    const move = (p: Phaser.Input.Pointer) => { if (this.drag?.id === p.id && p.isDown) this.scroll(this.drag.offset + p.y - this.drag.y); };
    const up = () => { this.drag = undefined; };
    const wheel = (p: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => { if (inside(p)) this.scroll(this.offset - dy); };
    scene.input.on('pointerdown', down).on('pointermove', move).on('pointerup', up).on('pointerupoutside', up).on('wheel', wheel);
    this.cleanup.push(() => {
      scene.input.off('pointerdown', down).off('pointermove', move).off('pointerup', up).off('pointerupoutside', up).off('wheel', wheel);
      this.content.clearMask(true); mask.destroy();
    });
    scene.events.once('shutdown', () => this.destroy());
  }
  containsPointer: (pointer: Phaser.Input.Pointer) => boolean;
  add(item: Phaser.GameObjects.Container): void {
    const clip = (object: Phaser.GameObjects.GameObject) => {
      if (object instanceof Phaser.GameObjects.Zone && object.input) {
        const test = object.input.hitAreaCallback;
        object.input.hitAreaCallback = (area, x, y, target) => {
          const world = object.getWorldTransformMatrix().transformPoint(x - object.displayOriginX, y - object.displayOriginY);
          return world.y >= this.top && world.y <= this.top + this.height && test(area, x, y, target);
        };
      }
      if (object instanceof Phaser.GameObjects.Container) object.list.forEach(clip);
    };
    clip(item); this.content.add(item);
  }
  private scroll(offset: number): void {
    this.offset = Phaser.Math.Clamp(offset, Math.min(0, this.height - this.contentHeight), 0);
    this.content.setY(this.top + this.offset);
  }
  destroy(): void { for (const cleanup of this.cleanup.splice(0)) cleanup(); }
}
