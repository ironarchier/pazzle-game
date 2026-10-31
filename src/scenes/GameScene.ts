import * as Phaser from 'phaser';
import {
  BACK_BUTTON_RADIUS,
  BOARD_FRAME,
  BOARD_FRAME_RADIUS,
  BOARD_PADDING,
  CONFETTI,
  CARD_SHADOW_ALPHA,
  CARD_SHADOW_OFFSET,
  COUNTER_CHIP_HEIGHT,
  COUNTER_CHIP_PADDING,
  COUNTER_ICON_GAP,
  COUNTER_ICON_SIZE,
  GAME_PANEL_RADIUS,
  GAME_WIDTH,
  getLevelAlbum,
  getAlbumLevels,
  FONT_FAMILY,
  GAME_DEPTH,
  GAME_ICONS,
  GESTURE_THRESHOLD,
  HEADER_BOTTOM_ROW_Y,
  HEADER_HEIGHT,
  HEADER_PADDING,
  HEADER_TITLE_FONT_SIZE,
  HEADER_TITLE_GAP,
  HEADER_TITLE_MIN_FONT_SIZE,
  HEADER_TOP_ROW_Y,
  HOVER_DURATION,
  HINT_FLIGHT_DURATION,
  HINT_SHAKE,
  HOVER_EASE,
  ICON_BUTTON_SIZE,
  ICON_BUTTON_SPACING,
  LEVELS,
  PIECE_BEVEL,
  PIECE_DRAG_SCALE,
  PIECE_FRAME_SIZE,
  PIECE_HOVER_SCALE,
  PIECE_MARGIN,
  PIECE_SHADOW,
  PIECE_SIZE,
  PIECES_KEY,
  PREVIEW_FADE_DURATION,
  PUZZLE_SOURCE_KEY,
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
  TRAY_SHELF_INSET,
  TRAY_SHELF_RADIUS,
  TRAY_SLOT_WIDTH,
  WIN_PANEL,
} from '../constants';
import { goToScene, restartScene } from '../crossfade';
import { playDrop, playJoin, playPickUp, playPlace, playWin } from '../audio';
import { vibrate } from '../haptics';
import { onResize } from '../layout';
import { getCurrentLevel, getProgress, saveAssembly, completeLevel, isUnlocked, nextLevel, useHint, type Assembly } from '../progress';
import { createPiecePath, generateEdges, seededRandom, type PieceEdges } from '../puzzle/pieceShape';
import { PuzzlePiece } from '../puzzle/PuzzlePiece';
import { applyTheme, getTheme, toCss } from '../theme';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { albumTitle, levelTitle, pieces, t } from '../i18n';
import { CoinBadge } from '../ui/CoinBadge';
import { hasPurchaseOffer, showPurchaseOffer } from '../ui/PurchaseModal';
import { PuzzleTutorial } from '../ui/PuzzleTutorial';
import { getSettings, updateSettings } from '../settings';
import { createReceipt } from '../platform/RewardedAds';
import { continueAfterLevel, rewardedAds, setBannerVisible, setGameplayActive } from '@game-platform';

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
  private level = 0;
  private rows = 4;
  private cols = 4;
  private seed = 1;
  private restored?: Assembly;
  private won = false;
  private preview?: Phaser.GameObjects.Image;
  private title!: Phaser.GameObjects.Text;
  private counter!: Phaser.GameObjects.Text;
  private counterBg!: Phaser.GameObjects.Graphics;
  private counterIcon!: Phaser.GameObjects.Image;
  private sampleButton!: IconButton;
  private edgesButton!: IconButton;
  private edgesFirst = false;
  private trayBeforeEdges: PuzzlePiece[] = [];
  private hintButton!: IconButton;
  private completeImage!: Phaser.GameObjects.Image;
  private winPanel?: Phaser.GameObjects.Container;
  private tutorial?: PuzzleTutorial;
  private pendingMoves = new Map<PuzzlePiece, [number, number]>();
  private get imageWidth(): number { return this.cols * PIECE_SIZE; }
  private get imageHeight(): number { return this.rows * PIECE_SIZE; }
  private pieces: PuzzlePiece[] = [];
  private tray: PuzzlePiece[] = [];
  private trayScroll = 0;
  private trayGap?: number;
  private gesture?: Gesture;
  private boardX = 0;
  private boardY = 0;
  private boardWidth = 1;
  private boardHeight = 1;
  private boardScale = 1;
  private scaleTweens = new Map<PuzzlePiece, Phaser.Tweens.Tween>();
  private moveTweens = new Map<PuzzlePiece, Phaser.Tweens.Tween>();

  private board!: Phaser.GameObjects.Graphics;
  private trayBg!: Phaser.GameObjects.Graphics;
  private headerBg!: Phaser.GameObjects.Graphics;
  private backButton!: IconButton;
  private coins!: CoinBadge;

  constructor() {
    super('Game');
  }

  init(data: { level?: number }): void {
    this.level = data.level ?? getCurrentLevel();
    const progress = getProgress();
    if (!isUnlocked(this.level, progress.completed, progress.economy.purchasedAlbums)) this.level = 0;
    this.restored = progress.active?.level === this.level ? progress.active : undefined;
    this.rows = this.restored?.rows ?? LEVELS[this.level].rows;
    this.cols = this.restored?.cols ?? LEVELS[this.level].cols;
    this.seed = this.restored?.seed ?? (Math.floor(Math.random() * 0xfffffffe) + 1);
  }

  preload(): void {
    const key = this.imageKey();
    if (!this.textures.exists(key)) this.load.image(key, LEVELS[this.level].image);
  }

  create(): void {
    applyTheme(this);

    this.won = false;
    this.preview = undefined;
    this.winPanel = undefined;
    this.tutorial = undefined;
    this.edgesFirst = false;
    this.trayBeforeEdges = [];
    this.pendingMoves.clear();
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
    this.backButton = new IconButton(this, 0, 0, GAME_ICONS.back, t('album'), () => { this.save(); goToScene(this, 'Album', { albumId: getLevelAlbum(this.level).id }); }, BACK_BUTTON_RADIUS).setDepth(GAME_DEPTH.headerControls);

    this.title = this.label('', HEADER_TITLE_FONT_SIZE).setDepth(GAME_DEPTH.header);
    this.counterBg = this.add.graphics().setDepth(GAME_DEPTH.header);
    this.counterIcon = this.add.image(0, 0, GAME_ICONS.puzzle).setDisplaySize(COUNTER_ICON_SIZE, COUNTER_ICON_SIZE).setTint(getTheme().accent).setDepth(GAME_DEPTH.header);
    this.counter = this.label('', 28).setOrigin(0, 0.5).setDepth(GAME_DEPTH.header);
    this.sampleButton = new IconButton(this, 0, 0, GAME_ICONS.image, t('sample'), () => this.togglePreview()).setDepth(GAME_DEPTH.headerControls);
    this.edgesButton = new IconButton(this, 0, 0, GAME_ICONS.edges, t('edgesFirst'), () => this.toggleEdgesFirst()).setDepth(GAME_DEPTH.headerControls);
    this.hintButton = new IconButton(this, 0, 0, GAME_ICONS.bulb, t('hint'), () => this.requestHint()).setDepth(GAME_DEPTH.headerControls);
    this.coins = new CoinBadge(this, 0, 0).setDepth(GAME_DEPTH.headerControls);
    this.completeImage = this.add.image(0, 0, PUZZLE_SOURCE_KEY).setOrigin(0).setDepth(GAME_DEPTH.placedPieces + 0.5).setVisible(false);
    this.createPieces();
    this.setupInput();
    onResize(this, () => this.layout());
    this.restore();
    this.save();
    this.startTutorial();
    setGameplayActive(true);
    setBannerVisible(false);
    const save = () => { this.layout(); this.save(); };
    const visibility = () => { if (document.hidden) save(); };
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', visibility);
    this.events.on('platformpause', save);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tutorial = undefined;
      setGameplayActive(false);
      setBannerVisible(true);
      this.save();
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', visibility);
      this.events.off('platformpause', save);
    });
  }

  private startTutorial(): void {
    if (getSettings().tutorialDone || getProgress().completed.length || this.pieces.some(p => p.state === 'placed')) return;
    this.tutorial = new PuzzleTutorial(this, () => {
      this.tutorial = undefined;
      updateSettings({ tutorialDone: true });
    });
  }

  update(): void {
    const left = TRAY_SHELF_INSET, right = this.scale.width - TRAY_SHELF_INSET;
    for (const piece of this.pieces) {
      const half = piece.width / 2, scale = piece.scaleX;
      const from = piece.state === 'tray' ? Math.max(0, (left - piece.x) / scale + half) : 0;
      const to = piece.state === 'tray' ? Math.min(piece.width, (right - piece.x) / scale + half) : piece.width;
      if (from <= 0 && to >= piece.width) { if (piece.isCropped) piece.setCrop(); }
      else piece.setCrop(from, 0, Math.max(0, to - from), piece.height);
    }
  }

  private createTextures(): void {
    this.createPiecesTexture(this.getSourceImage(), generateEdges(this.rows, this.cols, seededRandom(this.seed)));
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
    const half = this.cellSize / 2;
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
    const image = this.textures.get(this.imageKey()).getSourceImage() as HTMLImageElement;
    const texture = this.createCanvasTexture(PUZZLE_SOURCE_KEY, this.imageWidth, this.imageHeight);
    const crop = Math.min(image.width / this.imageWidth, image.height / this.imageHeight);
    const sw = this.imageWidth * crop;
    const sh = this.imageHeight * crop;
    const sx = (image.width - sw) / 2;
    const sy = (image.height - sh) / 2;
    texture.context.drawImage(image, sx, sy, sw, sh, 0, 0, this.imageWidth, this.imageHeight);
    texture.refresh();
    return texture.getSourceImage() as HTMLCanvasElement;
  }

  private createCanvasTexture(key: string, width: number, height: number): Phaser.Textures.CanvasTexture {
    if (this.textures.exists(key)) this.textures.remove(key);
    const texture = this.textures.createCanvas(key, width, height);
    if (!texture) throw new Error(`Failed to create texture ${key}`);
    return texture;
  }

  private createPiecesTexture(source: HTMLCanvasElement, edges: PieceEdges[][]): void {
    const texture = this.createCanvasTexture(PIECES_KEY, PIECE_FRAME_SIZE * this.cols, PIECE_FRAME_SIZE * this.rows);
    const ctx = texture.context;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
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
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
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
    this.cancelGesture();
    this.hidePreview();
    const { width, height } = this.scale;
    const theme = getTheme();

    const r = GAME_PANEL_RADIUS;
    this.headerBg.clear()
      .fillStyle(0x000000, CARD_SHADOW_ALPHA)
      .fillRoundedRect(0, CARD_SHADOW_OFFSET, width, HEADER_HEIGHT, { tl: 0, tr: 0, bl: r, br: r })
      .fillStyle(theme.surface, 1)
      .fillRoundedRect(0, 0, width, HEADER_HEIGHT, { tl: 0, tr: 0, bl: r, br: r });
    this.backButton.setPosition(HEADER_PADDING + BACK_BUTTON_RADIUS, HEADER_TOP_ROW_Y);
    this.coins?.setPosition(width - 120, HEADER_TOP_ROW_Y);
    this.fitTitle();
    this.hintButton.setPosition(width - HEADER_PADDING - ICON_BUTTON_SIZE / 2, HEADER_BOTTOM_ROW_Y);
    this.sampleButton.setPosition(this.hintButton.x - ICON_BUTTON_SPACING, HEADER_BOTTOM_ROW_Y);
    this.edgesButton.setPosition(this.sampleButton.x - ICON_BUTTON_SPACING, HEADER_BOTTOM_ROW_Y);
    this.tutorial?.layout();

    const trayTop = height - TRAY_HEIGHT;
    this.trayBg.clear()
      .fillStyle(0x000000, CARD_SHADOW_ALPHA)
      .fillRoundedRect(0, trayTop - CARD_SHADOW_OFFSET, width, TRAY_HEIGHT, { tl: r, tr: r, bl: 0, br: 0 })
      .fillStyle(theme.surface, 1)
      .fillRoundedRect(0, trayTop, width, TRAY_HEIGHT, { tl: r, tr: r, bl: 0, br: 0 })
      .fillStyle(theme.hoverSurface, 1)
      .fillRoundedRect(TRAY_SHELF_INSET, trayTop + TRAY_SHELF_INSET, width - TRAY_SHELF_INSET * 2, TRAY_HEIGHT - TRAY_SHELF_INSET * 2, TRAY_SHELF_RADIUS);

    const prev = { x: this.boardX, y: this.boardY, scale: this.boardScale };
    const top = HEADER_HEIGHT;
    const areaHeight = trayTop - top;
    this.boardScale = Math.min(
      (width - BOARD_PADDING * 2) / this.imageWidth,
      (areaHeight - BOARD_PADDING * 2) / this.imageHeight,
    );
    this.boardWidth = this.imageWidth * this.boardScale;
    this.boardHeight = this.imageHeight * this.boardScale;
    this.boardX = (width - this.boardWidth) / 2;
    this.boardY = top + (areaHeight - this.boardHeight) / 2;
    const f = BOARD_FRAME;
    this.board.clear()
      .fillStyle(0x000000, CARD_SHADOW_ALPHA)
      .fillRoundedRect(this.boardX - f, this.boardY - f + CARD_SHADOW_OFFSET, this.boardWidth + f * 2, this.boardHeight + f * 2, BOARD_FRAME_RADIUS)
      .fillStyle(theme.surface, 1)
      .fillRoundedRect(this.boardX - f, this.boardY - f, this.boardWidth + f * 2, this.boardHeight + f * 2, BOARD_FRAME_RADIUS)
      .fillStyle(theme.board, 1)
      .fillRect(this.boardX, this.boardY, this.boardWidth, this.boardHeight);

    for (const piece of this.pieces) {
      if (piece.state !== 'placed' && piece.state !== 'board') continue;
      const moveTween = this.moveTweens.get(piece);
      if (piece.state === 'placed') moveTween?.complete();
      else {
        const destination = this.pendingMoves.get(piece);
        moveTween?.stop();
        if (destination) piece.setPosition(...destination);
        this.moveTweens.delete(piece);
        this.pendingMoves.delete(piece);
      }
      this.scaleTweens.get(piece)?.stop();
      if (piece.state === 'placed') {
        piece.setPosition(...this.targetOf(piece)).setScale(this.boardScale);
      } else {
        const ratio = this.boardScale / prev.scale;
        piece
          .setPosition(this.boardX + (piece.x - prev.x) * ratio, this.boardY + (piece.y - prev.y) * ratio)
          .setScale(this.boardScale);
      }
    }

    this.completeImage.setPosition(this.boardX, this.boardY).setDisplaySize(this.boardWidth, this.boardHeight);
    this.fitBoardGroups();
    this.clampTrayScroll();
    this.layoutTray(false);
    this.refreshLabels();
    if (this.won) this.layoutWinPanel();
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
        this.pendingMoves.delete(piece);
        this.moveTweens.delete(piece);
        piece.setPosition(x, y);
      }
    });
  }

  private setupInput(): void {
    const inTray = (pointer: Phaser.Input.Pointer) => pointer.y >= this.scale.height - TRAY_HEIGHT;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.gesture || this.won || this.preview || hasPurchaseOffer(this) || rewardedAds.busy) return;
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
      this.save();
    };
    this.input.on('pointerup', endGesture);
    this.input.on('pointerupoutside', endGesture);

    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _over: unknown, dx: number, dy: number) => {
      if (!inTray(pointer) || this.gesture) return;
      if (this.preview || this.won || hasPurchaseOffer(this) || rewardedAds.busy) return;
      this.trayScroll += dx + dy;
      this.clampTrayScroll();
      this.layoutTray(false);
      this.save();
    });
    this.input.keyboard?.on('keydown-ESC', () => {
      this.hidePreview();
    });
  }

  private pickUp(piece: PuzzlePiece): void {
    const fromTray = piece.state === 'tray';
    this.tutorial?.pickedUp();
    playPickUp();
    const scale = this.dragScale(piece.group);
    for (const member of piece.group) {
      if (member.state === 'board') this.settleMove(member);
      member.state = 'drag';
      member.setDepth(GAME_DEPTH.draggedPiece);
      this.moveTweens.get(member)?.stop();
      this.pendingMoves.delete(member);
      this.moveTweens.delete(member);
      this.scalePiece(member, scale);
    }

    if (!fromTray) return;
    Phaser.Utils.Array.Remove(this.tray, piece);
    this.clampTrayScroll();
    this.layoutTray(true);
  }

  private dragTo(piece: PuzzlePiece, x: number, y: number): void {
    const { group } = piece;
    const half = (PIECE_SIZE * this.dragScale(group)) / 2;
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
        member.setScale(this.boardScale);
        this.movePiece(member, x, y, TRAY_ANIMATION_DURATION);
      }
      return;
    }

    piece.state = 'tray';
    playDrop();
    piece.setDepth(GAME_DEPTH.trayPieces);
    this.scalePiece(piece, TRAY_PIECE_SCALE);
    this.tray.splice(Math.min(trayIndex, this.tray.length), 0, piece);
    this.clampTrayScroll();
    this.layoutTray(true);
  }

  private isOverBoard({ x, y }: PuzzlePiece): boolean {
    return (
      x >= this.boardX &&
      x <= this.boardX + this.boardWidth &&
      y >= this.boardY &&
      y <= this.boardY + this.boardHeight
    );
  }

  private canPlace(piece: PuzzlePiece): boolean {
    return piece.row >= 0 && piece.row < this.rows && piece.col >= 0 && piece.col < this.cols;
  }

  private dropOnBoard(piece: PuzzlePiece): void {
    for (const other of this.pieces) if (other.state === 'board') this.settleMove(other);
    const before = this.positionsOf(piece.group);
    for (const member of piece.group) {
      member.state = 'board';
      member.setDepth(GAME_DEPTH.boardPieces);
      this.scalePiece(member, this.boardScale);
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
        const dx = other.x - (other.col - member.col) * this.cellSize - member.x;
        const dy = other.y - (other.row - member.row) * this.cellSize - member.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= bestDistance) {
          best = { other, dx, dy };
          bestDistance = distance;
        }
      }
    }
    return best;
  }

  private isEdge(piece: PuzzlePiece): boolean {
    return piece.row === 0 || piece.col === 0 || piece.row === this.rows - 1 || piece.col === this.cols - 1;
  }

  private touchesPlaced(group: PuzzlePiece[]): boolean {
    const placed = this.pieces.filter((p) => p.state === 'placed');
    return group.some((member) => this.isEdge(member) ||
      placed.some((p) => Math.abs(p.row - member.row) + Math.abs(p.col - member.col) === 1));
  }

  private isPlaceable(group: PuzzlePiece[]): boolean {
    if (!this.touchesPlaced(group)) return false;
    return group.some((member) => {
      const [x, y] = this.targetOf(member);
      return this.canPlace(member) && Phaser.Math.Distance.Between(member.x, member.y, x, y) <= SNAP_DISTANCE;
    });
  }

  private shiftGroup(group: PuzzlePiece[], dx: number, dy: number): void {
    for (const member of group) member.setPosition(member.x + dx, member.y + dy);
  }

  private positionsOf(group: PuzzlePiece[]): Map<PuzzlePiece, [number, number]> {
    return new Map(group.map((m) => [m, this.pendingMoves.get(m) ?? [m.x, m.y]]));
  }

  private settleMove(piece: PuzzlePiece): void {
    const destination = this.pendingMoves.get(piece);
    this.moveTweens.get(piece)?.stop();
    this.moveTweens.delete(piece);
    this.pendingMoves.delete(piece);
    if (destination) piece.setPosition(...destination);
  }

  private place(group: PuzzlePiece[], duration = SNAP_DURATION): void {
    this.input.manager.canvas.style.cursor = this.input.manager.defaultCursor;
    group.forEach((piece, i) => {
      piece.state = 'placed';
      piece.disableInteractive();
      piece.setDepth(GAME_DEPTH.draggedPiece);
      this.scalePiece(piece, this.boardScale);

      const [x, y] = this.targetOf(piece);
      this.movePiece(piece, x, y, duration, () => {
        piece.setDepth(GAME_DEPTH.placedPieces);
        this.sparkle(x, y);
        if (i > 0) return;
        vibrate(SNAP_VIBRATION);
        playPlace(this.pieces.filter((p) => p.state === 'placed').length / this.pieces.length);
        if (this.pieces.every((p) => p.state === 'placed')) this.showWin();
      });
    });
    this.refreshLabels();
    this.tutorial?.placed();
  }

  private targetOf(piece: PuzzlePiece): [number, number] {
    return [
      this.boardX + (piece.col + 0.5) * this.cellSize,
      this.boardY + (piece.row + 0.5) * this.cellSize,
    ];
  }

  private get cellSize(): number {
    return PIECE_SIZE * this.boardScale;
  }

  // Группу не увеличиваем при перетаскивании, иначе между её деталями появятся зазоры
  private dragScale(group: PuzzlePiece[]): number {
    return group.length > 1 ? this.boardScale : this.boardScale * PIECE_DRAG_SCALE;
  }

  private movePiece(piece: PuzzlePiece, x: number, y: number, duration: number, onComplete?: () => void): void {
    this.moveTweens.get(piece)?.stop();
    this.pendingMoves.set(piece, [x, y]);
    this.moveTweens.set(piece, this.tweens.add({ targets: piece, x, y, duration, ease: HOVER_EASE, onComplete: () => {
      this.pendingMoves.delete(piece);
      this.moveTweens.delete(piece);
      onComplete?.();
    } }));
  }

  private scalePiece(piece: PuzzlePiece, scale: number): void {
    this.scaleTweens.get(piece)?.stop();
    this.scaleTweens.set(piece, this.tweens.add({ targets: piece, scale, duration: HOVER_DURATION, ease: HOVER_EASE }));
  }

  private showWin(): void {
    if (this.won) return;
    this.won = true;
    this.tutorial?.finish();
    playWin();
    setGameplayActive(false);
    const balanceBefore = getProgress().economy.balance;
    const fresh = completeLevel(this.level);
    this.completeImage.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.completeImage, alpha: 1, duration: 300 });
    this.sparkle(this.boardX + this.boardWidth / 2, this.boardY + this.boardHeight / 2);
    this.confetti(getLevelAlbum(this.level).accent);
    const progress = getProgress();
    const collection = getLevelAlbum(this.level);
    const ids = getAlbumLevels(collection.id);
    const count = ids.filter(id => progress.completed.includes(id)).length;
    const remaining = ids.filter(id => !LEVELS[id].finale && !progress.completed.includes(id)).length;
    const heading = t(count === ids.length ? 'winAlbumDone' : fresh ? 'winNew' : 'winAgain');
    const finale = LEVELS[ids[ids.length - 1]];
    const goal = count === ids.length ? t('winAllDone') : remaining > 0 ? t('winRemaining', { count: remaining }) : t('winFinaleOpen', { pieces: pieces(finale.rows * finale.cols) });
    const title = this.label(heading, 36).setY(WIN_PANEL.titleY).setColor(toCss(collection.accent)).setFontStyle('bold');
    const name = albumTitle(collection);
    const earned = progress.economy.balance - balanceBefore;
    const detail = this.label(earned > 0 ? name + ' · +' + earned + ' ' + t('coins') : t('winDetail', { album: name, count, total: ids.length }), name.length > 25 ? 20 : 23).setY(WIN_PANEL.detailY);
    const goalText = this.label(goal, 25).setY(WIN_PANEL.goalY);
    const next = nextLevel(progress.completed, this.level, progress.economy.purchasedAlbums);
    const albumDone = count === ids.length;
    const action = new Button(this, -WIN_PANEL.buttonX, WIN_PANEL.buttonY, t(albumDone ? 'albums' : next === undefined ? 'toAlbum' : 'next'), () => continueAfterLevel(() => albumDone ? goToScene(this, 'Album') : next === undefined ? goToScene(this, 'Album', { albumId: collection.id }) : restartScene(this, { level: next })), 0.78);
    const album = new Button(this, WIN_PANEL.buttonX, WIN_PANEL.buttonY, t(albumDone ? 'toMenu' : 'album'), () => continueAfterLevel(() => goToScene(this, albumDone ? 'Menu' : 'Album', { albumId: collection.id })), 0.78, 'secondary');
    const panelWidth = Math.min(this.scale.width, GAME_WIDTH);
    const r = GAME_PANEL_RADIUS;
    const bg = this.add.graphics()
      .fillStyle(0x000000, CARD_SHADOW_ALPHA)
      .fillRoundedRect(-panelWidth / 2, -CARD_SHADOW_OFFSET, panelWidth, WIN_PANEL.height, { tl: r, tr: r, bl: 0, br: 0 })
      .fillStyle(getTheme().surface, 1)
      .fillRoundedRect(-panelWidth / 2, 0, panelWidth, WIN_PANEL.height, { tl: r, tr: r, bl: 0, br: 0 });
    this.winPanel = this.add.container(0, 0, [bg, title, detail, goalText, action, album]).setDepth(GAME_DEPTH.overlay);
    this.layoutWinPanel();
    this.winPanel.setY(this.scale.height);
    this.tweens.add({ targets: this.winPanel, y: this.scale.height - WIN_PANEL.height, duration: WIN_PANEL.duration, ease: 'Back.easeOut' });
  }

  private layoutWinPanel(): void {
    if (!this.winPanel) return;
    this.tweens.killTweensOf(this.winPanel);
    this.winPanel.setPosition(this.scale.width / 2, this.scale.height - WIN_PANEL.height);
  }

  private confetti(albumColor: number): void {
    const theme = getTheme();
    const colors = [theme.accent, theme.secondary, albumColor, CONFETTI.gold];
    for (let i = 0; i < CONFETTI.count; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = HEADER_HEIGHT - CONFETTI.height;
      const piece = this.add.rectangle(x, y, CONFETTI.width, CONFETTI.height, colors[i % colors.length]).setDepth(GAME_DEPTH.overlay - 0.5);
      this.tweens.add({
        targets: piece,
        x: x + Phaser.Math.Between(-CONFETTI.drift, CONFETTI.drift),
        y: y + Phaser.Math.Between(this.boardHeight / 2, this.scale.height),
        angle: Phaser.Math.Between(-CONFETTI.spin, CONFETTI.spin),
        alpha: 0,
        delay: Phaser.Math.Between(0, CONFETTI.delay),
        duration: Phaser.Math.Between(CONFETTI.duration.min, CONFETTI.duration.max),
        ease: 'Quad.easeIn',
        onComplete: () => piece.destroy(),
      });
    }
  }

  private label(text: string, size: number): Phaser.GameObjects.Text {
    return this.add.text(0, 0, text, { fontFamily: FONT_FAMILY, fontSize: size + 'px', color: toCss(getTheme().text), align: 'center' }).setOrigin(0.5);
  }

  private fitTitle(): void {
    const width = this.scale.width;
    const left = this.backButton.x + BACK_BUTTON_RADIUS + HEADER_TITLE_GAP;
    const maxWidth = Math.max(80, width - left - 230);
    const full = levelTitle(this.level);
    let size = HEADER_TITLE_FONT_SIZE;
    this.title.setPosition(left + maxWidth / 2, HEADER_TOP_ROW_Y).setFontSize(size).setText(full);
    while (this.title.width > maxWidth && size > HEADER_TITLE_MIN_FONT_SIZE) this.title.setFontSize(--size);
    let text = full;
    while (this.title.width > maxWidth && text.length > 1) {
      text = text.slice(0, -1);
      this.title.setText(text.trimEnd() + '…');
    }
  }

  private refreshLabels(): void {
    this.counter.setText(this.pieces.filter(p => p.state === 'placed').length + '/' + this.pieces.length);
    const iconX = HEADER_PADDING + COUNTER_CHIP_PADDING + COUNTER_ICON_SIZE / 2;
    const textX = iconX + COUNTER_ICON_SIZE / 2 + COUNTER_ICON_GAP;
    const chipWidth = textX + this.counter.width + COUNTER_CHIP_PADDING - HEADER_PADDING;
    this.counterIcon.setPosition(iconX, HEADER_BOTTOM_ROW_Y);
    this.counter.setPosition(textX, HEADER_BOTTOM_ROW_Y);
    this.counterBg.clear()
      .fillStyle(getTheme().hoverSurface, 1)
      .fillRoundedRect(HEADER_PADDING, HEADER_BOTTOM_ROW_Y - COUNTER_CHIP_HEIGHT / 2, chipWidth, COUNTER_CHIP_HEIGHT, COUNTER_CHIP_HEIGHT / 2);
    this.hintButton.setBadge(getProgress().economy.freeHints);
  }

  private requestHint(): void {
    if (this.gesture || this.won || rewardedAds.busy || hasPurchaseOffer(this)) return;
    if (getProgress().economy.freeHints > 0 || !this.hintPiece()) { this.useHint(); return; }
    this.hidePreview();
    showPurchaseOffer(this, { kind: 'hint' }, () => this.useHint());
  }

  private useHint(): void {
    if (this.gesture || this.won) return;
    const piece = this.hintPiece();
    if (!piece) {
      this.tweens.killTweensOf(this.hintButton);
      this.hintButton.setX(this.scale.width - HEADER_PADDING - ICON_BUTTON_SIZE / 2);
      this.tweens.add({ targets: this.hintButton, x: this.hintButton.x + HINT_SHAKE.offset, duration: HINT_SHAKE.duration, yoyo: true, repeat: HINT_SHAKE.repeat });
      return;
    }
    const result = useHint(createReceipt(), () => {
      this.hidePreview();
      if (piece.state === 'tray') {
        Phaser.Utils.Array.Remove(this.tray, piece);
        this.clampTrayScroll();
        this.layoutTray(true);
      }
      for (const member of piece.group) this.settleMove(member);
      playPickUp();
      this.place(piece.group, HINT_FLIGHT_DURATION);
      return true;
    });
    if (result === 'used') { this.save(); this.refreshLabels(); }
    else if (result === 'insufficient') this.requestHint();
  }

  private hintPiece(): PuzzlePiece | undefined {
    const free = this.pieces.filter((p) => p.state === 'tray' || p.state === 'board');
    const placed = this.pieces.filter((p) => p.state === 'placed');
    const next = free.filter((p) => placed.some((o) => Math.abs(o.row - p.row) + Math.abs(o.col - p.col) === 1));
    const candidates = next.length ? next : free.filter((p) => this.touchesPlaced([p]));
    return Phaser.Utils.Array.GetRandom(candidates);
  }

  private toggleEdgesFirst(): void {
    if (this.gesture || this.won) return;
    this.edgesFirst = !this.edgesFirst;
    if (this.edgesFirst) {
      this.trayBeforeEdges = [...this.tray];
      this.tray = [...this.tray.filter((p) => this.isEdge(p)), ...this.tray.filter((p) => !this.isEdge(p))];
    } else {
      const kept = this.trayBeforeEdges.filter((p) => this.tray.includes(p));
      this.tray = [...kept, ...this.tray.filter((p) => !kept.includes(p))];
    }
    this.edgesButton.setToggled(this.edgesFirst);
    this.trayScroll = 0;
    this.layoutTray(true);
    this.save();
  }

  private togglePreview(): void {
    if (this.preview) this.hidePreview();
    else this.showPreview();
  }

  private showPreview(): void {
    if (this.preview || this.gesture || this.won) return;
    this.preview = this.add.image(this.boardX, this.boardY, PUZZLE_SOURCE_KEY)
      .setOrigin(0)
      .setDisplaySize(this.boardWidth, this.boardHeight)
      .setDepth(GAME_DEPTH.preview)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });
    this.preview.on('pointerup', () => this.hidePreview());
    this.tweens.add({ targets: this.preview, alpha: 1, duration: PREVIEW_FADE_DURATION });
    this.sampleButton.setToggled(true);
  }

  private hidePreview(): void {
    if (!this.preview) return;
    this.preview.destroy();
    this.preview = undefined;
    this.sampleButton.setToggled(false);
  }

  private cancelGesture(): void {
    const gesture = this.gesture;
    if (!gesture) return;
    this.gesture = undefined;
    this.trayGap = undefined;
    if (gesture.mode !== 'drag' || !gesture.piece) return;
    if (gesture.origin) {
      for (const [piece, [x, y]] of gesture.origin) { piece.state = 'board'; piece.setPosition(x, y).setDepth(GAME_DEPTH.boardPieces); }
    } else {
      const piece = gesture.piece;
      this.scaleTweens.get(piece)?.stop();
      piece.state = 'tray'; piece.setScale(TRAY_PIECE_SCALE).setDepth(GAME_DEPTH.trayPieces);
      this.tray.splice(Math.min(piece.trayIndex, this.tray.length), 0, piece);
    }
  }

  private save(): void {
    if (this.won || this.gesture || !this.pieces.length) return;
    // Commit victory before a reload/menu can interrupt the final snap animation.
    if (this.pieces.every(piece => piece.state === 'placed')) { this.showWin(); return; }
    const id = (p: PuzzlePiece) => p.row * this.cols + p.col;
    const seen = new Set<PuzzlePiece>();
    const groups: Assembly['groups'] = [];
    for (const piece of this.pieces) {
      if (piece.state !== 'board' || seen.has(piece)) continue;
      const anchor = piece.group[0];
      const [x, y] = this.pendingMoves.get(anchor) ?? [anchor.x, anchor.y];
      groups.push({ ids: piece.group.map(id), x: (x - this.boardX) / this.boardWidth, y: (y - this.boardY) / this.boardHeight });
      piece.group.forEach(p => seen.add(p));
    }
    saveAssembly({ level: this.level, rows: this.rows, cols: this.cols, seed: this.seed,
      placed: this.pieces.filter(p => p.state === 'placed').map(id), tray: this.tray.map(id), groups, scroll: this.trayScroll });
  }

  private restore(): void {
    const saved = this.restored;
    if (!saved) return;
    this.tray = saved.tray.map(id => this.pieces[id]);
    this.trayScroll = saved.scroll;
    for (const id of saved.placed) {
      const piece = this.pieces[id]; piece.state = 'placed';
      piece.setPosition(...this.targetOf(piece)).setScale(this.boardScale).setDepth(GAME_DEPTH.placedPieces).disableInteractive();
    }
    for (const group of saved.groups) {
      const members = group.ids.map(id => this.pieces[id]), anchor = members[0];
      for (const piece of members) {
        piece.group = members; piece.state = 'board';
        piece.setPosition(this.boardX + group.x * this.boardWidth + (piece.col - anchor.col) * this.cellSize, this.boardY + group.y * this.boardHeight + (piece.row - anchor.row) * this.cellSize).setScale(this.boardScale).setDepth(GAME_DEPTH.boardPieces);
      }
    }
    this.restored = undefined;
    this.fitBoardGroups();
    this.clampTrayScroll(); this.layoutTray(false); this.refreshLabels();
  }

  /** Move a whole group together if a narrower viewport would put it off screen. */
  private fitBoardGroups(): void {
    const seen = new Set<PuzzlePiece>();
    const half = this.cellSize / 2;
    for (const piece of this.pieces) {
      if (piece.state !== 'board' || seen.has(piece)) continue;
      const xs = piece.group.map(p => p.x), ys = piece.group.map(p => p.y);
      const dx = Phaser.Math.Clamp(0, half - Math.min(...xs), this.scale.width - half - Math.max(...xs));
      const dy = Phaser.Math.Clamp(0, HEADER_HEIGHT + half - Math.min(...ys), this.scale.height - TRAY_HEIGHT - half - Math.max(...ys));
      this.shiftGroup(piece.group, dx, dy);
      piece.group.forEach(member => seen.add(member));
    }
  }

  private imageKey(): string {
    return `level-${this.level + 1}`;
  }

  private frameName(row: number, col: number): string {
    return `piece-${row}-${col}`;
  }
}
