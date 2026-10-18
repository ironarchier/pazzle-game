import * as Phaser from 'phaser';
import {
  ALBUM_CARD_IMAGE_SIZE,
  ALBUM_COVER_SIZE,
  ALBUM_PIECES_ICON_GAP,
  ALBUM_PIECES_ICON_SIZE,
  ALBUMS,
  FONT_FAMILY,
  GAME_ICONS,
  GAME_WIDTH,
  LEVELS,
  getAlbumLevels,
  type Album,
} from '../constants';
import { goToScene, restartScene } from '../crossfade';
import { centerLayout } from '../layout';
import { getProgress, isUnlocked } from '../progress';
import { applyTheme, getTheme, toCss } from '../theme';
import { BackLink } from '../ui/BackLink';
import { blurTexture } from '../ui/blurTexture';
import { Button } from '../ui/Button';

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
    new BackLink(this, 35, 65, 'Меню', () => goToScene(this, 'Menu'));
    this.label(360, 150, 'Аниме-альбомы', 54);
    this.label(360, 210, 'Собирайте персонажей — открывайте суперпазлы', 25);
    this.label(360, 252, `В коллекции: ${progress.completed.length} из ${LEVELS.length} картинок`, 24, theme.textMuted);
    ALBUMS.forEach((album, index) => {
      const y = 368 + index * 186;
      const ids = getAlbumLevels(album.id);
      const finale = ids[ids.length - 1];
      const count = ids.filter(id => progress.completed.includes(id)).length;
      const bg = this.add.rectangle(360, y, 650, 164, theme.surface).setStrokeStyle(2, album.accent);
      this.add.image(117, y, `album-${this.coverLevel(album)}`).setDisplaySize(ALBUM_COVER_SIZE, ALBUM_COVER_SIZE);
      this.label(208, y - 45, album.title, album.title.length > 25 ? 25 : 33).setOrigin(0, 0.5);
      this.label(208, y + 2, album.subtitle, 24, theme.textMuted).setOrigin(0, 0.5);
      this.label(208, y + 46, count === ids.length ? '✓ Альбом собран · открыть' : `${count} из 6 · ${isUnlocked(finale, progress.completed) ? 'Суперпазл открыт' : 'Финал за 5 персонажей'}  ›`, 23, album.accent).setOrigin(0, 0.5);
      bg.setInteractive({ useHandCursor: true }).on('pointerup', () => restartScene(this, { albumId: album.id }));
      bg.on('pointerover', () => bg.setFillStyle(theme.hoverSurface));
      bg.on('pointerout', () => bg.setFillStyle(theme.surface));
    });
  }
  private createAlbum(album: Album): void {
    const theme = getTheme();
    const progress = getProgress();
    const ids = getAlbumLevels(album.id);
    const count = ids.filter(id => progress.completed.includes(id)).length;
    const ordinaryCount = ids.filter(id => !LEVELS[id].finale && progress.completed.includes(id)).length;
    new BackLink(this, 35, 65, 'Альбомы', () => restartScene(this));
    this.label(360, 160, album.title, album.title.length > 25 ? 33 : 44);
    this.label(360, 220, `Собрано: ${count} из ${ids.length}`, 30, album.accent);
    this.label(360, 270, count === ids.length ? 'Альбом собран! Можно пройти снова.' : ordinaryCount === 5 ? 'Суперпазл открыт! Соберите финальную картинку.' : 'Соберите 5 персонажей, чтобы открыть суперпазл', 23);
    ids.forEach((id, index) => {
      const level = LEVELS[id];
      const x = 190 + index % 2 * 340, y = 450 + Math.floor(index / 2) * 295;
      const done = progress.completed.includes(id), unlocked = isUnlocked(id, progress.completed);
      const active = progress.active?.level === id;
      const bg = this.add.rectangle(x, y, 308, 270, theme.surface).setStrokeStyle(level.finale ? 4 : 2, done || level.finale ? album.accent : theme.border);
      if (unlocked) {
        bg.setInteractive({ useHandCursor: true }).on('pointerup', () => this.openLevel(id));
        bg.on('pointerover', () => bg.setFillStyle(theme.hoverSurface));
        bg.on('pointerout', () => bg.setFillStyle(theme.surface));
      }
      const hidden = level.finale && !unlocked;
      const image = hidden ? blurTexture(this, `album-${id}`, ALBUM_CARD_IMAGE_SIZE) : `album-${id}`;
      this.add.image(x, y - 42, image).setDisplaySize(ALBUM_CARD_IMAGE_SIZE, ALBUM_CARD_IMAGE_SIZE).setAlpha(unlocked ? done ? 1 : 0.85 : hidden ? 0.6 : 0.22);
      if (!unlocked) this.add.image(x, y - 42, GAME_ICONS.lock).setTint(theme.text);
      if (hidden) this.label(x, y + 62, '★ Суперпазл', 23, album.accent);
      else {
        const title = level.finale ? `★ ${level.title}` : level.title;
        this.label(x, y + 62, title, title.length > 23 ? 19 : 23, level.finale ? album.accent : theme.text);
      }
      if (active) this.label(x, y + 101, 'Продолжить сборку', 22, album.accent);
      else if (done) this.label(x, y + 101, '✓ Собрано · собрать снова', 22, album.accent);
      else if (hidden) this.label(x, y + 101, `${ordinaryCount} из 5 до открытия`, 22, theme.textMuted);
      else this.pieceCount(x, y + 101, level.rows * level.cols);
    });
  }
  private openLevel(level: number): void {
    if (this.confirmation) return;
    const active = getProgress().active;
    if (!active || active.level === level) { goToScene(this, 'Game', { level }); return; }
    const shade = this.add.rectangle(360, 640, GAME_WIDTH, 1280, 0x000000, 0.7).setInteractive();
    const bg = this.add.rectangle(360, 640, 650, 460, getTheme().surface);
    const title = this.label(360, 510, 'Начать другую картинку?', 36);
    const text = this.label(360, 580, 'Текущая незавершённая сборка будет заменена.\nСобранные картинки останутся в альбомах.', 25);
    const start = new Button(this, 360, 700, 'Начать', () => goToScene(this, 'Game', { level }));
    const cancel = new Button(this, 360, 820, 'Назад', () => { this.confirmation?.destroy(); this.confirmation = undefined; });
    this.confirmation = this.add.container(0, 0, [shade, bg, title, text, start, cancel]).setDepth(20);
  }
  /** The finale stays a surprise: the album shows its first picture until the superpuzzle is solved. */
  private coverLevel(album: Album): number {
    const ids = getAlbumLevels(album.id);
    const finale = ids[ids.length - 1];
    return getProgress().completed.includes(finale) ? finale : ids[0];
  }
  private pieceCount(x: number, y: number, count: number): void {
    const color = getTheme().textMuted;
    const text = this.label(0, y, String(count), 24, color).setOrigin(0, 0.5);
    const width = text.width + ALBUM_PIECES_ICON_GAP + ALBUM_PIECES_ICON_SIZE;
    text.setX(x - width / 2);
    this.add.image(x + width / 2 - ALBUM_PIECES_ICON_SIZE / 2, y, GAME_ICONS.puzzle)
      .setDisplaySize(ALBUM_PIECES_ICON_SIZE, ALBUM_PIECES_ICON_SIZE)
      .setTint(color);
  }
  private label(x: number, y: number, text: string, size: number, color = getTheme().text): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color: toCss(color), align: 'center' }).setOrigin(0.5);
  }
}