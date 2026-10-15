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
  IMAGE_KEY,
  IMAGE_SIZE,
  PIECE_BEVEL,
  PIECE_DRAG_SCALE,
  PIECE_FRAME_SIZE,
  PIECE_HOVER_SCALE,
  PIECE_MARGIN,
  PIECE_SHADOW,
  PIECE_SIZE,
  PIECES_KEY,
  SNAP_DISTANCE,
  SNAP_DURATION,
  SNAP_VIBRATION,
  SPARKLE,
  SPARKLE_KEY,
  SPARKLE_TEXTURE_SIZE,
  TRAY_ANIMATION_DURATION,
  TRAY_HEIGHT,
  TRAY_PADDING,
  TRAY_PIECE_SCALE,
  TRAY_SLOT_WIDTH,
} from '../constants';
import { goToScene, restartScene } from '../crossfade';
import { playJoin, playPlace } from '../audio';
import { vibrate } from '../haptics';
import { onResize } from '../layout';
import { drawPuzzleImage } from '../puzzle/drawPuzzleImage';
import { createPiecePath, generateEdges, type PieceEdges } from '../puzzle/pieceShape';
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
  offsetX: number;
  offsetY: number;
  origin?: Map<PuzzlePiece, [number, number]>;
  mode: 'pending' | 'scroll' | 'drag';
}

export class GameScene extends Phaser.Scene {
  private pieces: PuzzlePiece[] = [];
  private tray: PuzzlePiece[] = [];
  private trayScroll = 0;
  private trayGap?: number;
  private gesture?: Gesture;
  private boardX = 0;
  private boardY = 0;
  private scaleTweens = new Map<PuzzlePiece, Phaser.Tweens.Tween>();
  private moveTweens = new Map<PuzzlePiece, Phaser.Tweens.Tween>();

  private board!: Phaser.GameObjects.Graphics;
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
    this.trayGap = undefined;
    this.gesture = undefined;
    this.scaleTweens.clear();
    this.moveTweens.clear();

    this.createTextures();

    this.board = this.add.graphics().setDepth(GAME_DEPTH.board);
    this.trayBg = this.add.graphics().setDepth(GAME_DEPTH.tray);
    this.headerBg = this.add.graphics().setDepth(GAME_DEPTH.header);
    this.backLink = new BackLink(this, 0, 0, 'Меню', () => goToScene(this, 'Menu')).setDepth(GAME_DEPTH.header);

    this.createPieces();
    this.setupInput();
    onResize(this, () => this.layout());
  }

  private createTextures(): void {
    this.createPiecesTexture(this.getSourceImage(), generateEdges(GRID_SIZE, GRID_SIZE));
    this.createSparkleTexture();
  }

  private createSparkleTexture(): void {
    if (this.textures.exists(SPARKLE_KEY)) return;
    const size = SPARKLE_TEXTURE_SIZE;
    const texture = this.createCanvasTexture(SPARKLE_KEY, size, size);
    const ctx = texture.context;
    const c = size / 2;

    const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    glow.addColorStop(0.3, 'rgba(255, 255, 255, 0.25)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    const inner = size * 0.08;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(c, 0);
    ctx.quadraticCurveTo(c + inner, c - inner, size, c);
    ctx.quadraticCurveTo(c + inner, c + inner, c, size);
    ctx.quadraticCurveTo(c - inner, c + inner, 0, c);
    ctx.quadraticCurveTo(c - inner, c - inner, c, 0);
    ctx.fill();
    texture.refresh();
  }

  private sparkle(x: number, y: number): void {
    const half = PIECE_SIZE / 2;
    const emitter = this.add
      .particles(x, y, SPARKLE_KEY, {
        lifespan: SPARKLE.lifespan,
        speed: SPARKLE.speed,
        scale: SPARKLE.scale,
        alpha: { start: 1, end: 0 },
        rotate: { min: 0, max: 360 },
        tint: SPARKLE.tints,
        emitZone: {
          type: 'random',
          source: {
            getRandomPoint: (point) => {
              point.x = Phaser.Math.Between(-half, half);
              point.y = Phaser.Math.Between(-half, half);
            },
          },
        },
        emitting: false,
      })
      .setDepth(GAME_DEPTH.sparkles);
    emitter.explode(SPARKLE.count);
    this.time.delayedCall(SPARKLE.lifespan.max, () => emitter.destroy());
  }

  private getSourceImage(): HTMLCanvasElement {
    if (!this.textures.exists(IMAGE_KEY)) {
      const texture = this.textures.createCanvas(IMAGE_KEY, IMAGE_SIZE, IMAGE_SIZE);
      if (texture) {
        drawPuzzleImage(texture.context, IMAGE_SIZE);
        texture.refresh();
      }
    }
    return this.textures.get(IMAGE_KEY).getSourceImage() as HTMLCanvasElement;
  }

  private createCanvasTexture(key: string, width: number, height: number): Phaser.Textures.CanvasTexture {
    if (this.textures.exists(key)) this.textures.remove(key);
    const texture = this.textures.createCanvas(key, width, height);
    if (!texture) throw new Error(`Failed to create texture ${key}`);
    return texture;
  }

  private createPiecesTexture(source: HTMLCanvasElement, edges: PieceEdges[][]): void {
    const size = PIECE_FRAME_SIZE * GRID_SIZE;
    const texture = this.createCanvasTexture(PIECES_KEY, size, size);
    const ctx = texture.context;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const frameX = col * PIECE_FRAME_SIZE;
        const frameY = row * PIECE_FRAME_SIZE;
        const cellX = frameX + PIECE_MARGIN;
        const cellY = frameY + PIECE_MARGIN;
        const path = createPiecePath(cellX, cellY, PIECE_SIZE, edges[row][col]);

        ctx.save();
        ctx.shadowColor = PIECE_SHADOW.color;
        ctx.shadowBlur = PIECE_SHADOW.blur;
        ctx.shadowOffsetY = PIECE_SHADOW.offsetY;
        ctx.fill(path);
        ctx.restore();

        ctx.save();
        ctx.clip(path);
        ctx.drawImage(source, cellX - col * PIECE_SIZE, cellY - row * PIECE_SIZE);
        this.drawBevel(ctx, path);
        ctx.restore();

        texture.add(this.frameName(row, col), 0, frameX, frameY, PIECE_FRAME_SIZE, PIECE_FRAME_SIZE);
      }
    }
    texture.refresh();
  }

  // Обводка контура, сдвинутого внутрь клипа: свет остаётся вдоль верхних и левых краёв, тень — вдоль нижних и правых
  private drawBevel(ctx: CanvasRenderingContext2D, path: Path2D): void {
    const { width, offset, light, dark, outline } = PIECE_BEVEL;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';

    ctx.save();
    ctx.translate(offset, offset);
    ctx.strokeStyle = light;
    ctx.stroke(path);
    ctx.restore();

    ctx.save();
    ctx.translate(-offset, -offset);
    ctx.strokeStyle = dark;
    ctx.stroke(path);
    ctx.restore();

    ctx.lineWidth = 1;
    ctx.strokeStyle = outline;
    ctx.stroke(path);
  }

  private createPieces(): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const piece = new PuzzlePiece(this, PIECES_KEY, this.frameName(row, col), row, col)
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

    const prevBoardX = this.boardX;
    const prevBoardY = this.boardY;
    this.boardX = (width - IMAGE_SIZE) / 2;
    this.boardY = HEADER_HEIGHT + (trayTop - HEADER_HEIGHT - IMAGE_SIZE) / 2;
    this.board.clear();
    this.board.fillStyle(theme.board, 1);
    this.board.fillRect(this.boardX, this.boardY, IMAGE_SIZE, IMAGE_SIZE);

    for (const piece of this.pieces) {
      if (piece.state === 'placed') piece.setPosition(...this.targetOf(piece));
      else if (piece.state === 'board') {
        this.moveTweens.get(piece)?.stop();
        piece.setPosition(piece.x + this.boardX - prevBoardX, piece.y + this.boardY - prevBoardY);
      }
    }

    this.clampTrayScroll();
    this.layoutTray(false);
  }

  private traySlotCount(): number {
    return this.tray.length + (this.trayGap === undefined ? 0 : 1);
  }

  private trayContentWidth(slots = this.traySlotCount()): number {
    return slots * TRAY_SLOT_WIDTH + TRAY_PADDING * 2;
  }

  private trayStartX(slots = this.traySlotCount()): number {
    const { width } = this.scale;
    const contentWidth = this.trayContentWidth(slots);
    return contentWidth < width ? (width - contentWidth) / 2 : -this.trayScroll;
  }

  private clampTrayScroll(): void {
    const maxScroll = Math.max(0, this.trayContentWidth() - this.scale.width);
    this.trayScroll = Phaser.Math.Clamp(this.trayScroll, 0, maxScroll);
  }

  private trayIndexAt(x: number): number {
    const startX = this.trayStartX(this.tray.length + 1);
    const index = Math.floor((x - startX - TRAY_PADDING) / TRAY_SLOT_WIDTH);
    return Phaser.Math.Clamp(index, 0, this.tray.length);
  }

  private setTrayGap(gap: number | undefined): void {
    if (gap === this.trayGap) return;
    this.trayGap = gap;
    this.clampTrayScroll();
    this.layoutTray(true);
  }

  private layoutTray(animate: boolean): void {
    const startX = this.trayStartX();
    const y = this.scale.height - TRAY_HEIGHT / 2;
    const gap = this.trayGap ?? Infinity;

    this.tray.forEach((piece, i) => {
      piece.trayIndex = i;
      const slot = i >= gap ? i + 1 : i;
      const x = startX + TRAY_PADDING + TRAY_SLOT_WIDTH * (slot + 0.5);
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
      if (this.gesture) return;
      const gesture: Gesture = {
        pointerId: pointer.id,
        startX: pointer.x,
        startY: pointer.y,
        startScroll: this.trayScroll,
        offsetX: 0,
        offsetY: 0,
        mode: 'pending',
      };

      const boardPiece = over.find((o): o is PuzzlePiece => o instanceof PuzzlePiece && o.state === 'board');
      if (boardPiece && !inTray(pointer)) {
        this.gesture = {
          ...gesture,
          piece: boardPiece,
          offsetX: boardPiece.x - pointer.x,
          offsetY: boardPiece.y - pointer.y,
          origin: this.positionsOf(boardPiece.group),
          mode: 'drag',
        };
        this.pickUp(boardPiece);
        return;
      }

      if (!inTray(pointer)) return;
      const piece = over.find((o): o is PuzzlePiece => o instanceof PuzzlePiece && o.state === 'tray');
      this.gesture = { ...gesture, piece };
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
        this.dragTo(gesture.piece, pointer.x + gesture.offsetX, pointer.y + gesture.offsetY);
      }
    });

    const endGesture = (pointer: Phaser.Input.Pointer) => {
      const gesture = this.gesture;
      if (!gesture || gesture.pointerId !== pointer.id) return;
      this.gesture = undefined;
      if (gesture.mode === 'drag' && gesture.piece) this.drop(gesture.piece, gesture.origin);
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
    const fromTray = piece.state === 'tray';
    const scale = piece.group.length > 1 ? 1 : PIECE_DRAG_SCALE;
    for (const member of piece.group) {
      member.state = 'drag';
      member.setDepth(GAME_DEPTH.draggedPiece);
      this.moveTweens.get(member)?.stop();
      this.scalePiece(member, scale);
    }

    if (!fromTray) return;
    Phaser.Utils.Array.Remove(this.tray, piece);
    this.clampTrayScroll();
    this.layoutTray(true);
  }

  private dragTo(piece: PuzzlePiece, x: number, y: number): void {
    const { group } = piece;
    const half = (PIECE_FRAME_SIZE * (group.length > 1 ? 1 : PIECE_DRAG_SCALE)) / 2;
    const offsetsX = group.map((m) => m.x - piece.x);
    const offsetsY = group.map((m) => m.y - piece.y);
    const clampedX = Phaser.Math.Clamp(x, half - Math.min(...offsetsX), this.scale.width - half - Math.max(...offsetsX));
    const clampedY = Phaser.Math.Clamp(y, half - Math.min(...offsetsY), this.scale.height - half - Math.max(...offsetsY));
    this.shiftGroup(group, clampedX - piece.x, clampedY - piece.y);

    const showGap = group.length === 1 && this.isOverTray(piece);
    this.setTrayGap(showGap ? this.trayIndexAt(piece.x) : undefined);
  }

  private isOverTray({ y }: PuzzlePiece): boolean {
    return y >= this.scale.height - TRAY_HEIGHT;
  }

  private drop(piece: PuzzlePiece, origin?: Map<PuzzlePiece, [number, number]>): void {
    const trayIndex = this.trayGap ?? piece.trayIndex;
    this.trayGap = undefined;

    if (this.isOverBoard(piece)) {
      this.dropOnBoard(piece);
      return;
    }

    if (piece.group.length > 1 && origin) {
      for (const member of piece.group) {
        member.state = 'board';
        member.setDepth(GAME_DEPTH.boardPieces);
        const [x, y] = origin.get(member) ?? [member.x, member.y];
        this.movePiece(member, x, y, TRAY_ANIMATION_DURATION);
      }
      return;
    }

    piece.state = 'tray';
    piece.setDepth(GAME_DEPTH.trayPieces);
    this.scalePiece(piece, TRAY_PIECE_SCALE);
    this.tray.splice(Math.min(trayIndex, this.tray.length), 0, piece);
    this.clampTrayScroll();
    this.layoutTray(true);
  }

  private isOverBoard({ x, y }: PuzzlePiece): boolean {
    return (
      x >= this.boardX && x <= this.boardX + IMAGE_SIZE && y >= this.boardY && y <= this.boardY + IMAGE_SIZE
    );
  }

  private canPlace({ row, col }: PuzzlePiece): boolean {
    const last = GRID_SIZE - 1;
    if (row === 0 || col === 0 || row === last || col === last) return true;
    return this.pieces.some(
      (p) => p.state === 'placed' && Math.abs(p.row - row) + Math.abs(p.col - col) === 1,
    );
  }

  private dropOnBoard(piece: PuzzlePiece): void {
    const before = this.positionsOf(piece.group);
    for (const member of piece.group) {
      member.state = 'board';
      member.setDepth(GAME_DEPTH.boardPieces);
      this.scalePiece(member, 1);
    }

    const joined = this.joinNeighbors(piece);
    const { group } = piece;
    const placeable = this.isPlaceable(group);
    const final = this.positionsOf(group);

    // Соединение уже выставило детали в итоговые позиции, возвращаем их назад, чтобы доехать анимацией
    for (const [member, [x, y]] of before) member.setPosition(x, y);

    if (placeable) {
      this.place(group);
      return;
    }
    if (!joined) return;

    for (const [member, [x, y]] of final) this.movePiece(member, x, y, SNAP_DURATION);
    vibrate(SNAP_VIBRATION);
    playJoin();
  }

  private joinNeighbors(piece: PuzzlePiece): boolean {
    let joined = false;
    for (let join = this.findJoin(piece.group); join; join = this.findJoin(piece.group)) {
      this.shiftGroup(piece.group, join.dx, join.dy);
      const merged = [...piece.group, ...join.other.group];
      for (const member of merged) member.group = merged;
      joined = true;
    }
    return joined;
  }

  private findJoin(group: PuzzlePiece[]): { other: PuzzlePiece; dx: number; dy: number } | undefined {
    let best: { other: PuzzlePiece; dx: number; dy: number } | undefined;
    let bestDistance = SNAP_DISTANCE;
    for (const member of group) {
      for (const other of this.pieces) {
        if (other.state !== 'board' || group.includes(other)) continue;
        if (Math.abs(other.row - member.row) + Math.abs(other.col - member.col) !== 1) continue;
        const dx = other.x - (other.col - member.col) * PIECE_SIZE - member.x;
        const dy = other.y - (other.row - member.row) * PIECE_SIZE - member.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= bestDistance) {
          best = { other, dx, dy };
          bestDistance = distance;
        }
      }
    }
    return best;
  }

  private isPlaceable(group: PuzzlePiece[]): boolean {
    return group.some((member) => {
      const [x, y] = this.targetOf(member);
      return this.canPlace(member) && Phaser.Math.Distance.Between(member.x, member.y, x, y) <= SNAP_DISTANCE;
    });
  }

  private shiftGroup(group: PuzzlePiece[], dx: number, dy: number): void {
    for (const member of group) member.setPosition(member.x + dx, member.y + dy);
  }

  private positionsOf(group: PuzzlePiece[]): Map<PuzzlePiece, [number, number]> {
    return new Map(group.map((m) => [m, [m.x, m.y]]));
  }

  private place(group: PuzzlePiece[]): void {
    this.input.manager.canvas.style.cursor = this.input.manager.defaultCursor;
    group.forEach((piece, i) => {
      piece.state = 'placed';
      piece.disableInteractive();
      piece.setDepth(GAME_DEPTH.placedPieces);
      this.scalePiece(piece, 1);

      const [x, y] = this.targetOf(piece);
      this.movePiece(piece, x, y, SNAP_DURATION, () => {
        this.sparkle(x, y);
        if (i > 0) return;
        vibrate(SNAP_VIBRATION);
        playPlace();
        if (this.pieces.every((p) => p.state === 'placed')) this.showWin();
      });
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
