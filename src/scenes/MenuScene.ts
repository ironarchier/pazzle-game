import * as Phaser from 'phaser';
import {
  CARD_RADIUS,
  FONT_FAMILY,
  GAME_WIDTH,
  HOVER_DURATION,
  HOVER_EASE,
  LEVELS,
  MENU_CARD_COUNT_WIDTH,
  MENU_CARD_HEIGHT,
  MENU_CARD_IMAGE_HEIGHT,
  MENU_CARD_PADDING,
  MENU_CARD_WIDTH,
  PAGE_SLIDE_OFFSET,
  PAGE_TRANSITION_DURATION,
  SETTINGS_CARD_HEIGHT,
  SETTINGS_CARD_WIDTH,
  getAlbumLevels,
  getLevelAlbum,
} from '../constants';
import { getCurrentLevel, getProgress } from '../progress';
import { goToScene, restartScene } from '../crossfade';
import { centerLayout, createUiCamera } from '../layout';
import { getSettings, updateSettings } from '../settings';
import { applyTheme, getTheme, toCss } from '../theme';
import { Button } from '../ui/Button';
import { createCard, createProgressBar } from '../ui/card';
import { cardTexture } from '../ui/cardTexture';
import { disableInput } from '../ui/disableInput';
import { drawGearIcon, drawHomeIcon } from '../ui/icons';
import { TabBar } from '../ui/TabBar';
import { Toggle } from '../ui/Toggle';

type Page = 'home' | 'settings';

interface MenuSceneData {
  page?: Page;
}

export class MenuScene extends Phaser.Scene {
  private tabBar!: TabBar<Page>;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private page?: Phaser.GameObjects.Container;
  private currentPage?: Page;

  constructor() {
    super('Menu');
  }

  preload(): void {
    const level = getCurrentLevel();
    if (!this.textures.exists(`album-${level}`)) this.load.image(`album-${level}`, LEVELS[level].image);
  }

  create(data: MenuSceneData): void {
    applyTheme(this);
    centerLayout(this);
    this.uiCamera = createUiCamera(this);

    this.page = undefined;
    this.currentPage = undefined;
    this.tabBar = new TabBar<Page>(
      this,
      [
        { id: 'home', label: 'Главная', drawIcon: drawHomeIcon },
        { id: 'settings', label: 'Настройки', drawIcon: drawGearIcon },
      ],
      (id) => this.showPage(id),
    );
    this.cameras.main.ignore(this.tabBar);
    this.showPage(data.page ?? 'home');
  }

  private showPage(page: Page): void {
    if (page === this.currentPage) return;
    this.currentPage = page;

    const previous = this.page;
    const next = page === 'home' ? this.createHomePage() : this.createSettingsPage();
    this.uiCamera.ignore(next);
    this.page = next;
    this.tabBar.selectTab(page);

    if (!previous) return;

    disableInput(previous);
    this.tweens.killTweensOf(previous);
    this.tweens.add({
      targets: previous,
      alpha: 0,
      duration: PAGE_TRANSITION_DURATION,
      ease: HOVER_EASE,
      onComplete: () => {
        this.tweens.killTweensOf(previous.list);
        previous.destroy();
      },
    });

    next.setAlpha(0).setY(PAGE_SLIDE_OFFSET);
    this.tweens.add({ targets: next, alpha: 1, y: 0, duration: PAGE_TRANSITION_DURATION, ease: HOVER_EASE });
  }

  private createHomePage(): Phaser.GameObjects.Container {
    const centerX = GAME_WIDTH / 2;
    const theme = getTheme();
    const progress = getProgress();
    const level = getCurrentLevel();
    const album = getLevelAlbum(level);
    const albumIds = getAlbumLevels(album.id);
    const albumCount = albumIds.filter(id => progress.completed.includes(id)).length;
    const play = () => goToScene(this, 'Game', { level });

    const title = this.text(centerX, 130, 'Аниме-пазлы', 64, theme.text, true);

    const top = -MENU_CARD_HEIGHT / 2;
    const textX = -MENU_CARD_WIDTH / 2 + MENU_CARD_PADDING;
    const barWidth = MENU_CARD_WIDTH - MENU_CARD_PADDING * 2 - MENU_CARD_COUNT_WIDTH;
    const textTop = top + MENU_CARD_IMAGE_HEIGHT;
    const card = createCard(this, centerX, 470, MENU_CARD_WIDTH, MENU_CARD_HEIGHT, play);
    card.add([
      this.add.image(0, top + MENU_CARD_IMAGE_HEIGHT / 2, cardTexture(this, `album-${level}`, MENU_CARD_WIDTH, MENU_CARD_IMAGE_HEIGHT, { tl: CARD_RADIUS, tr: CARD_RADIUS, br: 0, bl: 0 })),
      this.text(textX, textTop + 36, album.title, 24, album.accent).setOrigin(0, 0.5),
      this.text(textX, textTop + 76, LEVELS[level].title, 34, theme.text, true).setOrigin(0, 0.5),
      createProgressBar(this, textX, textTop + 124, barWidth, albumCount / albumIds.length, album.accent),
      this.text(MENU_CARD_WIDTH / 2 - MENU_CARD_PADDING, textTop + 124, `${albumCount}/${albumIds.length}`, 24, theme.textMuted).setOrigin(1, 0.5),
    ]);

    const playButton = new Button(this, centerX, 830, progress.active ? 'Продолжить' : 'Играть', play);
    const albums = new Button(this, centerX, 960, 'Альбомы', () => goToScene(this, 'Album'), 1, 'secondary');
    const collected = this.text(centerX, 1060, `Собрано ${progress.completed.length} из ${LEVELS.length}`, 26, theme.textMuted);

    return this.add.container(0, 0, [title, card, playButton, albums, collected]);
  }

  private text(x: number, y: number, value: string, size: number, color: number, bold = false): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, value, { fontFamily: FONT_FAMILY, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', color: toCss(color) })
      .setOrigin(0.5);
  }

  private createSettingsPage(): Phaser.GameObjects.Container {
    const centerX = GAME_WIDTH / 2;
    const settings = getSettings();

    const title = this.add
      .text(centerX, 160, 'Настройки', {
        fontFamily: FONT_FAMILY,
        fontSize: '64px',
        fontStyle: 'bold',
        color: toCss(getTheme().text),
      })
      .setOrigin(0.5);
    const sound = new Toggle(this, centerX, 320, 'Звук', settings.sound, (value) => updateSettings({ sound: value }));
    const music = new Toggle(this, centerX, 440, 'Музыка', settings.music, (value) => updateSettings({ music: value }));
    const darkTheme = new Toggle(this, centerX, 560, 'Тёмная тема', settings.theme === 'dark', (value) => {
      updateSettings({ theme: value ? 'dark' : 'light' });
      this.time.delayedCall(HOVER_DURATION, () => restartScene(this, { page: 'settings' }));
    });

    const card = createCard(this, centerX, 440, SETTINGS_CARD_WIDTH, SETTINGS_CARD_HEIGHT);

    return this.add.container(0, 0, [title, card, sound, music, darkTheme]);
  }
}
