import * as Phaser from 'phaser';

export type PieceState = 'tray' | 'drag' | 'placed';

export class PuzzlePiece extends Phaser.GameObjects.Image {
  readonly row: number;
  readonly col: number;
  state: PieceState = 'tray';
  trayIndex = 0;

  constructor(scene: Phaser.Scene, texture: string, frame: string, row: number, col: number) {
    super(scene, 0, 0, texture, frame);
    this.row = row;
    this.col = col;
    scene.add.existing(this);
    this.setInteractive({ useHandCursor: true });
  }
}
