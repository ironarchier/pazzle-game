import * as Phaser from 'phaser';
import { COLORS, FONT_FAMILY, TAB_BAR_HEIGHT, TAB_MAX_WIDTH } from '../constants';
import type { IconDrawer } from './icons';

export interface TabConfig<T extends string> {
  id: T;
  label: string;
  drawIcon: IconDrawer;
}

interface TabItem<T extends string> {
  config: TabConfig<T>;
  icon: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Zone;
}

export class TabBar<T extends string> extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly items: TabItem<T>[] = [];

  constructor(scene: Phaser.Scene, tabs: TabConfig<T>[], onSelect: (id: T) => void) {
    super(scene, 0, 0);
    this.setScrollFactor(0);

    this.bg = scene.add.graphics();
    this.add(this.bg);

    for (const config of tabs) {
      const icon = scene.add.graphics();
      const label = scene.add.text(0, 0, config.label, { fontFamily: FONT_FAMILY, fontSize: '28px' }).setOrigin(0.5);
      const hitArea = scene.add.zone(0, 0, 1, 1).setInteractive({ useHandCursor: true });
      hitArea.on('pointerup', () => onSelect(config.id));

      this.add([icon, label, hitArea]);
      this.items.push({ config, icon, label, hitArea });
    }

    this.layout();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));

    scene.add.existing(this);
  }

  selectTab(id: T): void {
    for (const { config, icon, label } of this.items) {
      const active = config.id === id;
      icon.clear();
      config.drawIcon(icon, active ? COLORS.accent : COLORS.inactive);
      label.setColor(active ? COLORS.textAccent : COLORS.textMuted);
    }
  }

  private layout(): void {
    const { width, height } = this.scene.scale;
    this.setPosition(0, height - TAB_BAR_HEIGHT);

    this.bg.clear();
    this.bg.fillStyle(COLORS.surface, 1);
    this.bg.fillRect(0, 0, width, TAB_BAR_HEIGHT);
    this.bg.fillStyle(COLORS.surfaceLight, 1);
    this.bg.fillRect(0, 0, width, 2);

    const tabWidth = Math.min(width / this.items.length, TAB_MAX_WIDTH);
    const startX = (width - tabWidth * this.items.length) / 2;

    this.items.forEach(({ icon, label, hitArea }, i) => {
      const centerX = startX + tabWidth * (i + 0.5);
      icon.setPosition(centerX, 52);
      label.setPosition(centerX, 106);
      hitArea.setPosition(centerX, TAB_BAR_HEIGHT / 2).setSize(tabWidth, TAB_BAR_HEIGHT);
    });
  }
}