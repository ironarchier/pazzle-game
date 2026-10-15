import * as Phaser from 'phaser';
import { drawPuzzleImage } from '../puzzle/drawPuzzleImage';
import { PuzzlePiece } from '../puzzle/PuzzlePiece';
import { Button } from '../ui/Button';
import {
  BOARD_TOP,
  FONT_FAMILY,
  GAME_HEIGHT,
  GAME_WIDTH,
  GRID_SIZE,
  HOVER_DURATION,
  HOVER_EASE,
  IMAGE_SIZE,
  PIECE_DRAG_SCALE,
  PIECE_HOVER_SCALE,
  PIECE_SIZE,
  SNAP_DISTANCE,
  TEXTURE_KEY,
  TRAY_BOTTOM,
  TRAY_TOP,
} from '../constants';
import { goToScene, restartScene } from '../crossfade';
import { centerLayout } from '../layout';
import { applyTheme, getTheme, toCss } from '../theme';
import { tweenColor } from '../ui/tweenColor';

export class GameScene extends Phaser.Scene {
  private pieces: PuzzlePiece[] = [];
  private topDepth = 1;
  private boardLeft = 0;
  private draggedPiece?: PuzzlePiece;
  private pieceScaleTweens = new Map<PuzzlePiece, Phaser.Tweens.Tween>();
  private progressText!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create(): void {
    applyTheme(this);
    centerLayout(this);
    const theme = getTheme();

    this.pieces = [];
    this.pieceScaleTweens.clear();
    this.topDepth = 1;
    this.boardLeft = (GAME_WIDTH - IMAGE_SIZE) / 2;

    this.createTexture();
    this.drawBoard();
    this.createPieces();

    this.progressText = this.add
      .text(GAME_WIDTH / 2, 55, '', { fontFamily: FONT_FAMILY, fontSize: '40px', color: toCss(theme.text) })
      .setOrigin(0.5);
    this.updateProgress();

    const menuLink = this.add
      .text(this.boardLeft, 55, '‹ Меню', { fontFamily: FONT_FAMILY, fontSize: '36px', color: toCss(theme.accent) })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    let menuLinkColor = theme.accent;
    const fadeMenuLink = (color: number) =>
      tweenColor(this, menuLink, menuLinkColor, color, (c) => {
        menuLinkColor = c;
        menuLink.setColor(toCss(c));
      });
    menuLink.on('pointerover', () => fadeMenuLink(theme.accentHover));
    menuLink.on('pointerout', () => fadeMenuLink(theme.accent));
    menuLink.on('pointerup', () => goToScene(this, 'Menu'));
  }

  private createTexture(): void {
    if (this.textures.exists(TEXTURE_KEY)) return;

    const texture = this.textures.createCanvas(TEXTURE_KEY, IMAGE_SIZE, IMAGE_SIZE);
    if (!texture) return;

    const ctx = texture.context;
    drawPuzzleImage(ctx, IMAGE_SIZE);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        ctx.strokeRect(col * PIECE_SIZE + 1, row * PIECE_SIZE + 1, PIECE_SIZE - 2, PIECE_SIZE - 2);
        texture.add(this.frameName(row, col), 0, col * PIECE_SIZE, row * PIECE_SIZE, PIECE_SIZE, PIECE_SIZE);
      }
    }
    texture.refresh();
  }

  private drawBoard(): void {
    const theme = getTheme();
    const g = this.add.graphics();
    g.fillStyle(theme.board, 1);
    g.fillRect(this.boardLeft, BOARD_TOP, IMAGE_SIZE, IMAGE_SIZE);
    g.fillStyle(theme.surface, 1);
    g.fillRoundedRect(20, TRAY_TOP, GAME_WIDTH - 40, TRAY_BOTTOM - TRAY_TOP, 24);

    this.add.image(this.boardLeft, BOARD_TOP, TEXTURE_KEY).setOrigin(0).setAlpha(0.15);

    g.lineStyle(2, theme.textMuted, 0.3);
    for (let i = 0; i <= GRID_SIZE; i++) {
      const offset = i * PIECE_SIZE;
      g.lineBetween(this.boardLeft + offset, BOARD_TOP, this.boardLeft + offset, BOARD_TOP + IMAGE_SIZE);
      g.lineBetween(this.boardLeft, BOARD_TOP + offset, this.boardLeft + IMAGE_SIZE, BOARD_TOP + offset);
    }
  }

  private createPieces(): void {
    const half = PIECE_SIZE / 2;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const targetX = this.boardLeft + col * PIECE_SIZE + half;
        const targetY = BOARD_TOP + row * PIECE_SIZE + half;
        const x = Phaser.Math.Between(20 + half, GAME_WIDTH - 20 - half);
        const y = Phaser.Math.Between(TRAY_TOP + half, TRAY_BOTTOM - half);

        const piece = new PuzzlePiece(this, x, y, TEXTURE_KEY, this.frameName(row, col), targetX, targetY);
        piece.setDepth(this.topDepth++);
        this.setupDrag(piece);
        this.pieces.push(piece);
      }
    }
  }

  private setupDrag(piece: PuzzlePiece): void {
    const half = PIECE_SIZE / 2;

    piece.on('pointerover', () => {
      if (this.draggedPiece !== piece) this.scalePiece(piece, PIECE_HOVER_SCALE);
    });

    piece.on('pointerout', () => {
      if (this.draggedPiece !== piece) this.scalePiece(piece, 1);
    });

    piece.on('dragstart', () => {
      this.draggedPiece = piece;
      piece.setDepth(++this.topDepth);
      this.scalePiece(piece, PIECE_DRAG_SCALE);
    });

    piece.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      piece.setPosition(
        Phaser.Math.Clamp(dragX, half, GAME_WIDTH - half),
        Phaser.Math.Clamp(dragY, half, GAME_HEIGHT - half),
      );
    });

    piece.on('dragend', () => {
      this.draggedPiece = undefined;
      this.scalePiece(piece, 1);
      if (piece.distanceToTarget() <= SNAP_DISTANCE) this.placePiece(piece);
    });
  }

  private scalePiece(piece: PuzzlePiece, scale: number): void {
    this.pieceScaleTweens.get(piece)?.stop();
    this.pieceScaleTweens.set(
      piece,
      this.tweens.add({ targets: piece, scale, duration: HOVER_DURATION, ease: HOVER_EASE }),
    );
  }

  private placePiece(piece: PuzzlePiece): void {
    piece.placed = true;
    piece.disableInteractive();
    piece.setDepth(0);
    this.updateProgress();

    this.tweens.add({
      targets: piece,
      x: piece.targetX,
      y: piece.targetY,
      duration: 120,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (this.pieces.every((p) => p.placed)) this.showWin();
      },
    });
  }

  private updateProgress(): void {
    const placed = this.pieces.filter((p) => p.placed).length;
    this.progressText.setText(`${placed} / ${this.pieces.length}`);
  }

  private showWin(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    const depth = this.topDepth + 1;

    this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.6)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(depth);
    this.add
      .text(centerX, centerY - 120, 'Собрано!', { fontFamily: FONT_FAMILY, fontSize: '80px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(depth);

    new Button(this, centerX, centerY + 40, 'Ещё раз', () => restartScene(this)).setDepth(depth);
    new Button(this, centerX, centerY + 180, 'В меню', () => goToScene(this, 'Menu')).setDepth(depth);
  }

  private frameName(row: number, col: number): string {
    return `piece-${row}-${col}`;
  }
}