import * as Phaser from 'phaser';
import { COLORS, FONT_FAMILY, GAME_WIDTH, ICON_KEY } from '../constants';
import { centerLayout } from '../layout';
import { getSettings, updateSettings } from '../settings';
import { Button } from '../ui/Button';
import { drawGearIcon, drawHomeIcon } from '../ui/icons';
import { TabBar } from '../ui/TabBar';
import { Toggle } from '../ui/Toggle';

type Page = 'home' | 'settings';

export class MenuScene extends Phaser.Scene {
  private tabBar!: TabBar<Page>;
  private page?: Phaser.GameObjects.Container;

  constructor() {
    super('Menu');
  }

  create(): void {
    centerLayout(this);

    this.page = undefined;
    this.tabBar = new TabBar<Page>(
      this,
      [
        { id: 'home', label: 'Главная', drawIcon: drawHomeIcon },
        { id: 'settings', label: 'Настройки', drawIcon: drawGearIcon },
      ],
      (id) => this.showPage(id),
    );
    this.showPage('home');
  }

  private showPage(page: Page): void {
    if (this.page) {
      this.tweens.killTweensOf(this.page.list);
      this.page.destroy();
    }
    this.page = page === 'home' ? this.createHomePage() : this.createSettingsPage();
    this.tabBar.selectTab(page);
  }

  private createHomePage(): Phaser.GameObjects.Container {
    const centerX = GAME_WIDTH / 2;

    const icon = this.add.image(centerX, 400, ICON_KEY).setDisplaySize(300, 300);
    const title = this.add
      .text(centerX, 640, 'Pazzle Game', { fontFamily: FONT_FAMILY, fontSize: '72px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);
    const playButton = new Button(this, centerX, 860, 'Играть', () => this.scene.start('Game'));

    this.tweens.add({ targets: icon, scale: icon.scale * 1.05, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    return this.add.container(0, 0, [icon, title, playButton]);
  }

  private createSettingsPage(): Phaser.GameObjects.Container {
    const centerX = GAME_WIDTH / 2;
    const settings = getSettings();

    const title = this.add
      .text(centerX, 160, 'Настройки', { fontFamily: FONT_FAMILY, fontSize: '64px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);
    const sound = new Toggle(this, centerX, 320, 'Звук', settings.sound, (value) => updateSettings({ sound: value }));
    const music = new Toggle(this, centerX, 440, 'Музыка', settings.music, (value) => updateSettings({ music: value }));

    return this.add.container(0, 0, [title, sound, music]);
  }
}