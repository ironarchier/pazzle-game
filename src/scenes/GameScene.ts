import * as Phaser from 'phaser';
import {
  FONT_FAMILY,
  GAME_DEPTH,
  GESTURE_THRESHOLD,
  GRID_SIZE,
  HEADER_HEIGHT,
  HEADER_PADDING,
  HOVER_DURATION,
  HOVER_EASE,
  IMAGE_SIZE,
  PIECE_DRAG_SCALE,
  PIECE_HOVER_SCALE,
  PIECE_SIZE,
  SNAP_DISTANCE,
  SNAP_DURATION,
  TEXTURE_KEY,
  TRAY_ANIMATION_DURATION,
  TRAY_HEIGHT,
  TRAY_PADDING,
  TRAY_PIECE_SCALE,
  TRAY_SLOT_WIDTH,
} from '../constants';
import { goToScene, restartScene } from '../crossfade';
import { onResize } from '../layout';
import { drawPuzzleImage } from '../puzzle/drawPuzzleImage';
import { PuzzlePiece } from '../puzzle/PuzzlePiece';
import { applyTheme, getTheme } from '../theme';
import { BackLink } from '../ui/BackLink';
import { Button } from '../ui/Button';

interface Gesture {
  pointerId: number;
  startX: number;
  startY: number;
  startScroll: number;
  piece?: PuzzlePiece;
  mode: 'pending' | 'scroll' | 'drag';
}

export class GameScene extends Phaser.Scene {
  private pieces: PuzzlePiece[] = [];
  private tray: PuzzlePiece[] = [];
  private trayScroll = 0;
  private gesture?: Gesture;
  private boardX = 0;
  private boardY = 0;
  private scaleTweens = new Map<PuzzlePiece, Phaser.Tweens.Tween>();
  private moveTweens = new Map<PuzzlePiece, Phaser.Tweens.Tween>();

  private board!: Phaser.GameObjects.Graphics;
  private ghost!: Phaser.GameObjects.Image;
  private trayBg!: Phaser.GameObjects.Graphics;
  private headerBg!: Phaser.GameObjects.Graphics;
  private backLink!: BackLink;

  constructor() {
    super('Game');
  }

  create(): void {
    applyTheme(this);

    this.pieces = [];
    this.tray = [];
    this.trayScroll = 0;
    this.gesture = undefined;
    this.scaleTweens.clear();
    this.moveTweens.clear();

    this.createTexture();

    this.board = this.add.graphics().setDepth(GAME_DEPTH.board);
    this.ghost = this.add.image(0, 0, TEXTURE_KEY).setOrigin(0).setAlpha(0.15).setDepth(GAME_DEPTH.board);
    this.trayBg = this.add.graphics().setDepth(GAME_DEPTH.tray);
    this.headerBg = this.add.graphics().setDepth(GAME_DEPTH.header);
    this.backLink = new BackLink(this, 0, 0, 'Меню', () => goToScene(this, 'Menu')).setDepth(GAME_DEPTH.header);

    this.createPieces();
    this.setupInput();
    onResize(this, () => this.layout());
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

  private createPieces(): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const piece = new PuzzlePiece(this, TEXTURE_KEY, this.frameName(row, col), row, col)
          .setScale(TRAY_PIECE_SCALE)
          .setDepth(GAME_DEPTH.trayPieces);

        piece.on('pointerover', () => {
          if (piece.state === 'tray') this.scalePiece(piece, TRAY_PIECE_SCALE * PIECE_HOVER_SCALE);
        });
        piece.on('pointerout', () => {
          if (piece.state === 'tray') this.scalePiece(piece, TRAY_PIECE_SCALE);
        });

        this.pieces.push(piece);
      }
    }
    this.tray = Phaser.Utils.Array.Shuffle([...this.pieces]);
  }

  private layout(): void {
    const { width, height } = this.scale;
    const theme = getTheme();

    this.headerBg.clear();
    this.headerBg.fillStyle(theme.surface, 1);
    this.headerBg.fillRect(0, 0, width, HEADER_HEIGHT);
    this.headerBg.fillStyle(theme.border, 1);
    this.headerBg.fillRect(0, HEADER_HEIGHT - 2, width, 2);
    this.backLink.setPosition(HEADER_PADDING, HEADER_HEIGHT / 2);

    const trayTop = height - TRAY_HEIGHT;
    this.trayBg.clear();
    this.trayBg.fillStyle(theme.surface, 1);
    this.trayBg.fillRect(0, trayTop, width, TRAY_HEIGHT);
    this.trayBg.fillStyle(theme.border, 1);
    this.trayBg.fillRect(0, trayTop, width, 2);

    this.boardX = (width - IMAGE_SIZE) / 2;
    this.boardY = HEADER_HEIGHT + (trayTop - HEADER_HEIGHT - IMAGE_SIZE) / 2;
    this.drawBoard();
    this.ghost.setPosition(this.boardX, this.boardY);

    for (const piece of this.pieces) {
      if (piece.state === 'placed') piece.setPosition(...this.targetOf(piece));
    }

    this.clampTrayScroll();
    this.layoutTray(false);
  }

  private drawBoard(): void {
    const theme = getTheme();
    const g = this.board;
    g.clear();
    g.fillStyle(theme.board, 1);
    g.fillRect(this.boardX, this.boardY, IMAGE_SIZE, IMAGE_SIZE);

    g.lineStyle(2, theme.textMuted, 0.3);
    for (let i = 0; i <= GRID_SIZE; i++) {
      const offset = i * PIECE_SIZE;
      g.lineBetween(this.boardX + offset, this.boardY, this.boardX + offset, this.boardY + IMAGE_SIZE);
      g.lineBetween(this.boardX, this.boardY + offset, this.boardX + IMAGE_SIZE, this.boardY + offset);
    }
  }

  private trayContentWidth(): number {
    return this.tray.length * TRAY_SLOT_WIDTH + TRAY_PADDING * 2;
  }

  private clampTrayScroll(): void {
    const maxScroll = Math.max(0, this.trayContentWidth() - this.scale.width);
    this.trayScroll = Phaser.Math.Clamp(this.trayScroll, 0, maxScroll);
  }

  private layoutTray(animate: boolean): void {
    const { width, height } = this.scale;
    const contentWidth = this.trayContentWidth();
    const startX = contentWidth < width ? (width - contentWidth) / 2 : -this.trayScroll;
    const y = height - TRAY_HEIGHT / 2;

    this.tray.forEach((piece, i) => {
      piece.trayIndex = i;
      const x = startX + TRAY_PADDING + TRAY_SLOT_WIDTH * (i + 0.5);
      if (animate) this.movePiece(piece, x, y, TRAY_ANIMATION_DURATION);
      else {
        this.moveTweens.get(piece)?.stop();
        piece.setPosition(x, y);
      }
    });
  }

  private setupInput(): void {
    const inTray = (pointer: Phaser.Input.Pointer) => pointer.y >= this.scale.height - TRAY_HEIGHT;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.gesture || !inTray(pointer)) return;
      const piece = over.find((o): o is PuzzlePiece => o instanceof PuzzlePiece && o.state === 'tray');
      this.gesture = {
        pointerId: pointer.id,
        startX: pointer.x,
        startY: pointer.y,
        startScroll: this.trayScroll,
        piece,
        mode: 'pending',
      };
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const gesture = this.gesture;
      if (!gesture || gesture.pointerId !== pointer.id) return;

      const dx = pointer.x - gesture.startX;
      const dy = pointer.y - gesture.startY;

      // Пока палец не сдвинулся на порог, жест не определён: движение вверх берёт кусочек, вбок — листает лоток
      if (gesture.mode === 'pending') {
        if (Math.hypot(dx, dy) < GESTURE_THRESHOLD) return;
        if (gesture.piece && -dy > Math.abs(dx)) {
          gesture.mode = 'drag';
          this.pickUp(gesture.piece);
        } else {
          gesture.mode = 'scroll';
        }
      }

      if (gesture.mode === 'scroll') {
        this.trayScroll = gesture.startScroll - dx;
        this.clampTrayScroll();
        this.layoutTray(false);
      } else if (gesture.piece) {
        this.dragTo(gesture.piece, pointer);
      }
    });

    const endGesture = (pointer: Phaser.Input.Pointer) => {
      const gesture = this.gesture;
      if (!gesture || gesture.pointerId !== pointer.id) return;
      this.gesture = undefined;
      if (gesture.mode === 'drag' && gesture.piece) this.drop(gesture.piece);
    };
    this.input.on('pointerup', endGesture);
    this.input.on('pointerupoutside', endGesture);

    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _over: unknown, dx: number, dy: number) => {
      if (!inTray(pointer) || this.gesture) return;
      this.trayScroll += dx + dy;
      this.clampTrayScroll();
      this.layoutTray(false);
    });
  }

  private pickUp(piece: PuzzlePiece): void {
    piece.state = 'drag';
    piece.setDepth(GAME_DEPTH.draggedPiece);
    this.moveTweens.get(piece)?.stop();
    this.scalePiece(piece, PIECE_DRAG_SCALE);

    Phaser.Utils.Array.Remove(this.tray, piece);
    this.clampTrayScroll();
    this.layoutTray(true);
  }

  private dragTo(piece: PuzzlePiece, pointer: Phaser.Input.Pointer): void {
    const half = (PIECE_SIZE * PIECE_DRAG_SCALE) / 2;
    piece.setPosition(
      Phaser.Math.Clamp(pointer.x, half, this.scale.width - half),
      Phaser.Math.Clamp(pointer.y, half, this.scale.height - half),
    );
  }

  private drop(piece: PuzzlePiece): void {
    const [targetX, targetY] = this.targetOf(piece);
    if (Phaser.Math.Distance.Between(piece.x, piece.y, targetX, targetY) <= SNAP_DISTANCE) {
      this.place(piece);
      return;
    }

    piece.state = 'tray';
    piece.setDepth(GAME_DEPTH.trayPieces);
    this.scalePiece(piece, TRAY_PIECE_SCALE);
    this.tray.splice(Math.min(piece.trayIndex, this.tray.length), 0, piece);
    this.clampTrayScroll();
    this.layoutTray(true);
  }

  private place(piece: PuzzlePiece): void {
    piece.state = 'placed';
    piece.disableInteractive();
    piece.setDepth(GAME_DEPTH.placedPieces);
    this.scalePiece(piece, 1);

    const [x, y] = this.targetOf(piece);
    this.movePiece(piece, x, y, SNAP_DURATION, () => {
      if (this.pieces.every((p) => p.state === 'placed')) this.showWin();
    });
  }

  private targetOf(piece: PuzzlePiece): [number, number] {
    return [
      this.boardX + piece.col * PIECE_SIZE + PIECE_SIZE / 2,
      this.boardY + piece.row * PIECE_SIZE + PIECE_SIZE / 2,
    ];
  }

  private movePiece(piece: PuzzlePiece, x: number, y: number, duration: number, onComplete?: () => void): void {
    this.moveTweens.get(piece)?.stop();
    this.moveTweens.set(piece, this.tweens.add({ targets: piece, x, y, duration, ease: HOVER_EASE, onComplete }));
  }

  private scalePiece(piece: PuzzlePiece, scale: number): void {
    this.scaleTweens.get(piece)?.stop();
    this.scaleTweens.set(piece, this.tweens.add({ targets: piece, scale, duration: HOVER_DURATION, ease: HOVER_EASE }));
  }

  private showWin(): void {
    const { width, height } = this.scale;
    const depth = GAME_DEPTH.overlay;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setDepth(depth).setInteractive();
    this.add
      .text(width / 2, height / 2 - 120, 'Собрано!', { fontFamily: FONT_FAMILY, fontSize: '80px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(depth);

    new Button(this, width / 2, height / 2 + 40, 'Ещё раз', () => restartScene(this)).setDepth(depth);
    new Button(this, width / 2, height / 2 + 180, 'В меню', () => goToScene(this, 'Menu')).setDepth(depth);
  }

  private frameName(row: number, col: number): string {
    return `piece-${row}-${col}`;
  }
}
