import * as Phaser from 'phaser';
import {
  CARD_RADIUS,
  FONT_FAMILY,
  GAME_WIDTH,
  HOVER_DURATION,
  HOVER_EASE,
  LANGUAGES,
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
import { goToScene, isTransitioning, restartScene } from '../crossfade';
import { albumTitle, levelTitle, t } from '../i18n';
import { centerLayout, createUiCamera, onResize } from '../layout';
import { getSettings, updateSettings } from '../settings';
import { applyTheme, getTheme, toCss } from '../theme';
import { Button } from '../ui/Button';
import { createCard, createProgressBar } from '../ui/card';
import { cardTexture } from '../ui/cardTexture';
import { disableInput } from '../ui/disableInput';
import { drawGearIcon, drawHomeIcon } from '../ui/icons';
import { TabBar } from '../ui/TabBar';
import { Segmented } from '../ui/Segmented';
import { Toggle } from '../ui/Toggle';
import { CoinBadge } from '../ui/CoinBadge';
import { platformReady } from '../platform';

type Page = 'home' | 'settings';

interface MenuSceneData {
  page?: Page;
}

export class MenuScene extends Phaser.Scene {
  private tabBar!: TabBar<Page>;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private page?: Phaser.GameObjects.Container;
  private currentPage?: Page;
  private rendered = { theme: getSettings().theme, language: getSettings().language };
  private restartTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('Menu');
  }

  preload(): void {
    const level = getCurrentLevel();
    if (!this.textures.exists(`album-${level}`)) this.load.image(`album-${level}`, LEVELS[level].image);
  }

  create(data: MenuSceneData): void {
    applyTheme(this);
    this.rendered = { theme: getSettings().theme, language: getSettings().language };
    this.restartTimer = undefined;
    centerLayout(this);
    this.uiCamera = createUiCamera(this);
    const wallet = new CoinBadge(this, this.scale.width - 120, 65);
    this.cameras.main.ignore(wallet);
    onResize(this, () => wallet.setX(this.scale.width - 120));

    this.page = undefined;
    this.currentPage = undefined;
    this.tabBar = new TabBar<Page>(
      this,
      [
        { id: 'home', label: t('tabHome'), drawIcon: drawHomeIcon },
        { id: 'settings', label: t('tabSettings'), drawIcon: drawGearIcon },
      ],
      (id) => this.showPage(id),
    );
    this.cameras.main.ignore(this.tabBar);
    this.showPage(data.page ?? 'home');
    platformReady();
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

    const title = this.text(centerX, 130, t('appTitle'), 64, theme.text, true);

    const top = -MENU_CARD_HEIGHT / 2;
    const textX = -MENU_CARD_WIDTH / 2 + MENU_CARD_PADDING;
    const barWidth = MENU_CARD_WIDTH - MENU_CARD_PADDING * 2 - MENU_CARD_COUNT_WIDTH;
    const textTop = top + MENU_CARD_IMAGE_HEIGHT;
    const card = createCard(this, centerX, 470, MENU_CARD_WIDTH, MENU_CARD_HEIGHT, play);
    card.add([
      this.add.image(0, top + MENU_CARD_IMAGE_HEIGHT / 2, cardTexture(this, `album-${level}`, MENU_CARD_WIDTH, MENU_CARD_IMAGE_HEIGHT, { tl: CARD_RADIUS, tr: CARD_RADIUS, br: 0, bl: 0 }, false, album.coverFocusY)),
      this.text(textX, textTop + 36, albumTitle(album), 24, album.accent).setOrigin(0, 0.5),
      this.text(textX, textTop + 76, levelTitle(level), 34, theme.text, true).setOrigin(0, 0.5),
      createProgressBar(this, textX, textTop + 124, barWidth, albumCount / albumIds.length, album.accent),
      this.text(MENU_CARD_WIDTH / 2 - MENU_CARD_PADDING, textTop + 124, `${albumCount}/${albumIds.length}`, 24, theme.textMuted).setOrigin(1, 0.5),
    ]);

    const playButton = new Button(this, centerX, 830, t(progress.active ? 'continue' : 'play'), play);
    const albums = new Button(this, centerX, 960, t('albums'), () => goToScene(this, 'Album'), 1, 'secondary');
    const collected = this.text(centerX, 1060, t('menuCollected', { count: progress.completed.length, total: LEVELS.length }), 26, theme.textMuted);

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
      .text(centerX, 160, t('settingsTitle'), {
        fontFamily: FONT_FAMILY,
        fontSize: '64px',
        fontStyle: 'bold',
        color: toCss(getTheme().text),
      })
      .setOrigin(0.5);
    const sound = new Toggle(this, centerX, 320, t('sound'), settings.sound, (value) => updateSettings({ sound: value }));
    const music = new Toggle(this, centerX, 440, t('music'), settings.music, (value) => updateSettings({ music: value }));
    const darkTheme = new Toggle(this, centerX, 560, t('darkTheme'), settings.theme === 'dark', (value) => {
      updateSettings({ theme: value ? 'dark' : 'light' });
      this.scheduleRestart();
    });
    const language = new Segmented(this, centerX, 680, t('language'), LANGUAGES, settings.language, (value) => {
      updateSettings({ language: value });
      this.scheduleRestart();
    });

    const card = createCard(this, centerX, 500, SETTINGS_CARD_WIDTH, SETTINGS_CARD_HEIGHT);

    return this.add.container(0, 0, [title, card, sound, music, darkTheme, language]);
  }

  private scheduleRestart(): void {
    this.restartTimer?.remove();
    this.restartTimer = this.time.delayedCall(HOVER_DURATION, () => {
      const { theme, language } = getSettings();
      if (theme === this.rendered.theme && language === this.rendered.language) return;
      if (isTransitioning()) { this.scheduleRestart(); return; }
      restartScene(this, { page: 'settings' });
    });
  }
}
