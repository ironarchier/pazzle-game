import * as Phaser from 'phaser';
import {
  ALBUM_COVER_RADIUS,
  ALBUM_COVER_SIZE,
  ALBUM_PIECES_ICON_GAP,
  ALBUM_PIECES_ICON_SIZE,
  ALBUM_PROGRESS_WIDTH,
  ALBUM_ROW_HEIGHT,
  ALBUM_ROW_WIDTH,
  ALBUMS,
  CARD_RADIUS,
  DIALOG_BUTTON_OFFSET,
  DIALOG_BUTTON_SCALE,
  DIALOG_HEIGHT,
  DIALOG_WIDTH,
  FONT_FAMILY,
  GAME_HEIGHT,
  GAME_ICONS,
  GAME_WIDTH,
  LEVEL_CARD_HEIGHT,
  LEVEL_CARD_IMAGE_HEIGHT,
  LEVEL_CARD_WIDTH,
  LEVELS,
  LOCK_BADGE_RADIUS,
  LOCK_ICON_SIZE,
  getAlbumLevels,
  type Album,
} from '../constants';
import { goToScene, restartScene } from '../crossfade';
import { albumSubtitle, albumTitle, levelTitle, t } from '../i18n';
import { centerLayout } from '../layout';
import { getProgress, isUnlocked } from '../progress';
import { applyTheme, getTheme, toCss } from '../theme';
import { BackLink } from '../ui/BackLink';
import { Button } from '../ui/Button';
import { createCard, createProgressBar } from '../ui/card';
import { cardTexture } from '../ui/cardTexture';

export class AlbumScene extends Phaser.Scene {
  private confirmation?: Phaser.GameObjects.Container;
  private album?: Album;
  constructor() { super('Album'); }
  init(data: { albumId?: string } = {}): void {
    this.album = ALBUMS.find(album => album.id === data.albumId);
  }
  preload(): void {
    const ids = this.album ? getAlbumLevels(this.album.id) : ALBUMS.map(album => this.coverLevel(album));
    ids.forEach(id => { if (!this.textures.exists(`album-${id}`)) this.load.image(`album-${id}`, LEVELS[id].image); });
  }
  create(): void {
    applyTheme(this);
    centerLayout(this);
    this.confirmation = undefined;
    if (this.album) this.createAlbum(this.album);
    else this.createLibrary();
  }
  private createLibrary(): void {
    const theme = getTheme();
    const progress = getProgress();
    new BackLink(this, 35, 65, t('menu'), () => goToScene(this, 'Menu'));
    this.label(360, 150, t('libraryTitle'), 54);
    this.label(360, 210, t('librarySubtitle'), 25);
    this.label(360, 252, t('libraryCount', { count: progress.completed.length, total: LEVELS.length }), 24, theme.textMuted);
    ALBUMS.forEach((album, index) => {
      const ids = getAlbumLevels(album.id);
      const count = ids.filter(id => progress.completed.includes(id)).length;
      const left = -ALBUM_ROW_WIDTH / 2;
      const textX = left + ALBUM_ROW_HEIGHT + 8;
      const card = createCard(this, 360, 368 + index * 186, ALBUM_ROW_WIDTH, ALBUM_ROW_HEIGHT, () => restartScene(this, { albumId: album.id }));
      const r = ALBUM_COVER_RADIUS;
      const cover = this.add.image(left + ALBUM_ROW_HEIGHT / 2, 0, cardTexture(this, `album-${this.coverLevel(album)}`, ALBUM_COVER_SIZE, ALBUM_COVER_SIZE, { tl: r, tr: r, br: r, bl: r }));
      const name = albumTitle(album);
      const title = this.label(textX, -45, name, name.length > 25 ? 25 : 33).setOrigin(0, 0.5);
      const subtitle = this.label(textX, 2, albumSubtitle(album), 24, theme.textMuted).setOrigin(0, 0.5);
      const bar = createProgressBar(this, textX, 46, ALBUM_PROGRESS_WIDTH, count / ids.length, album.accent);
      const status = this.label(textX + ALBUM_PROGRESS_WIDTH + 16, 46, count === ids.length ? '✓' : `${count}/${ids.length}`, 23, album.accent).setOrigin(0, 0.5);
      const chevron = this.label(ALBUM_ROW_WIDTH / 2 - 36, 0, '›', 48, theme.textMuted);
      card.add([cover, title, subtitle, bar, status, chevron]);
    });
  }
  private createAlbum(album: Album): void {
    const theme = getTheme();
    const progress = getProgress();
    const ids = getAlbumLevels(album.id);
    const count = ids.filter(id => progress.completed.includes(id)).length;
    const ordinaryCount = ids.filter(id => !LEVELS[id].finale && progress.completed.includes(id)).length;
    new BackLink(this, 35, 65, t('albums'), () => restartScene(this));
    const name = albumTitle(album);
    this.label(360, 160, name, name.length > 25 ? 33 : 44);
    this.label(360, 220, t('albumCollected', { count, total: ids.length }), 30, album.accent);
    this.label(360, 270, t(count === ids.length ? 'albumDone' : ordinaryCount === 5 ? 'albumFinaleOpen' : 'albumGoal'), 23);
    ids.forEach((id, index) => {
      const level = LEVELS[id];
      const done = progress.completed.includes(id), unlocked = isUnlocked(id, progress.completed);
      const active = progress.active?.level === id;
      const hidden = level.finale && !unlocked;
      const top = -LEVEL_CARD_HEIGHT / 2;
      const imageY = top + LEVEL_CARD_IMAGE_HEIGHT / 2;
      const textY = top + LEVEL_CARD_IMAGE_HEIGHT;
      const card = createCard(this, 190 + index % 2 * 340, 450 + Math.floor(index / 2) * 295, LEVEL_CARD_WIDTH, LEVEL_CARD_HEIGHT, unlocked ? () => this.openLevel(id) : undefined, level.finale ? album.accent : undefined);
      const texture = cardTexture(this, `album-${id}`, LEVEL_CARD_WIDTH, LEVEL_CARD_IMAGE_HEIGHT, { tl: CARD_RADIUS, tr: CARD_RADIUS, br: 0, bl: 0 }, hidden);
      card.add(this.add.image(0, imageY, texture).setAlpha(unlocked || hidden ? 1 : 0.35));
      if (!unlocked) {
        card.add(this.add.graphics().fillStyle(theme.surface, 0.9).fillCircle(0, imageY, LOCK_BADGE_RADIUS));
        card.add(this.add.image(0, imageY, GAME_ICONS.lock).setDisplaySize(LOCK_ICON_SIZE, LOCK_ICON_SIZE).setTint(theme.text));
      }
      const name = hidden ? t('superPuzzle') : level.finale ? `★ ${levelTitle(id)}` : levelTitle(id);
      card.add(this.label(0, textY + 37, name, name.length > 23 ? 19 : 23, level.finale ? album.accent : theme.text));
      const statusY = textY + 73;
      if (active) card.add(this.label(0, statusY, t('continueAssembly'), 22, album.accent));
      else if (done) card.add(this.label(0, statusY, t('doneAgain'), 22, album.accent));
      else if (hidden) card.add(this.label(0, statusY, t('lockedFinale', { count: ordinaryCount }), 22, theme.textMuted));
      else card.add(this.pieceCount(0, statusY, level.rows * level.cols));
    });
  }
  private openLevel(level: number): void {
    if (this.confirmation) return;
    const active = getProgress().active;
    if (!active || active.level === level) { goToScene(this, 'Game', { level }); return; }
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, this.scale.width, this.scale.height, 0x000000, 0.7).setInteractive();
    const bg = this.add.graphics()
      .fillStyle(getTheme().surface, 1)
      .fillRoundedRect(360 - DIALOG_WIDTH / 2, 640 - DIALOG_HEIGHT / 2, DIALOG_WIDTH, DIALOG_HEIGHT, CARD_RADIUS);
    const title = this.label(360, 520, t('dialogTitle'), 36);
    const text = this.label(360, 590, t('dialogText'), 25);
    const start = new Button(this, 360 + DIALOG_BUTTON_OFFSET, 730, t('start'), () => goToScene(this, 'Game', { level }), DIALOG_BUTTON_SCALE);
    const cancel = new Button(this, 360 - DIALOG_BUTTON_OFFSET, 730, t('back'), () => { this.confirmation?.destroy(); this.confirmation = undefined; }, DIALOG_BUTTON_SCALE, 'secondary');
    this.confirmation = this.add.container(0, 0, [shade, bg, title, text, start, cancel]).setDepth(20);
  }
  private coverLevel(album: Album): number {
    const ids = getAlbumLevels(album.id);
    const finale = ids[ids.length - 1];
    return getProgress().completed.includes(finale) ? finale : ids[0];
  }
  private pieceCount(x: number, y: number, count: number): Phaser.GameObjects.Container {
    const color = getTheme().textMuted;
    const text = this.label(0, 0, String(count), 24, color).setOrigin(0, 0.5);
    const width = text.width + ALBUM_PIECES_ICON_GAP + ALBUM_PIECES_ICON_SIZE;
    text.setX(-width / 2);
    const icon = this.add.image(width / 2 - ALBUM_PIECES_ICON_SIZE / 2, 0, GAME_ICONS.puzzle)
      .setDisplaySize(ALBUM_PIECES_ICON_SIZE, ALBUM_PIECES_ICON_SIZE)
      .setTint(color);
    return this.add.container(x, y, [text, icon]);
  }
  private label(x: number, y: number, text: string, size: number, color = getTheme().text): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color: toCss(color), align: 'center' }).setOrigin(0.5);
  }
}
