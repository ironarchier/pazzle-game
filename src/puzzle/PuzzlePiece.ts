import * as Phaser from 'phaser';
import { PIECE_HIT_ALPHA } from '../constants';

export type PieceState = 'tray' | 'drag' | 'board' | 'placed';

export class PuzzlePiece extends Phaser.GameObjects.Image {
  readonly row: number;
  readonly col: number;
  state: PieceState = 'tray';
  trayIndex = 0;
  group: PuzzlePiece[];

  constructor(scene: Phaser.Scene, texture: string, frame: string, row: number, col: number) {
    super(scene, 0, 0, texture, frame);
    this.row = row;
    this.col = col;
    this.group = [this];
    scene.add.existing(this);
    this.setInteractive({ pixelPerfect: true, alphaTolerance: PIECE_HIT_ALPHA, useHandCursor: true });
  }
}
