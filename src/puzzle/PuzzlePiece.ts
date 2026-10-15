import * as Phaser from 'phaser';

export class PuzzlePiece extends Phaser.GameObjects.Image {
  readonly targetX: number;
  readonly targetY: number;
  placed = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: string,
    targetX: number,
    targetY: number,
  ) {
    super(scene, x, y, texture, frame);
    this.targetX = targetX;
    this.targetY = targetY;
    scene.add.existing(this);
    this.setInteractive({ draggable: true, useHandCursor: true });
  }

  distanceToTarget(): number {
    return Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY);
  }
}