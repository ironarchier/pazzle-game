import * as Phaser from 'phaser';
import {
  FONT_FAMILY,
  GAME_WIDTH,
  HOVER_DURATION,
  HOVER_EASE,
  ICON_KEY,
  PAGE_SLIDE_OFFSET,
  PAGE_TRANSITION_DURATION,
} from '../constants';
import { goToScene, restartScene } from '../crossfade';
import { centerLayout, createUiCamera } from '../layout';
import { getSettings, updateSettings } from '../settings';
import { applyTheme, getTheme, toCss } from '../theme';
import { Button } from '../ui/Button';
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

    const icon = this.add.image(centerX, 400, ICON_KEY).setDisplaySize(300, 300);
    const title = this.add
      .text(centerX, 640, 'Pazzle Game', {
        fontFamily: FONT_FAMILY,
        fontSize: '72px',
        fontStyle: 'bold',
        color: toCss(getTheme().text),
      })
      .setOrigin(0.5);
    const playButton = new Button(this, centerX, 860, 'Играть', () => goToScene(this, 'Game'));

    this.tweens.add({ targets: icon, scale: icon.scale * 1.05, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    return this.add.container(0, 0, [icon, title, playButton]);
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

    return this.add.container(0, 0, [title, sound, music, darkTheme]);
  }
}