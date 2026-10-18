import * as Phaser from 'phaser';
import {
  CARD_SHADOW_ALPHA,
  CARD_SHADOW_OFFSET,
  FONT_FAMILY,
  HOVER_DURATION,
  HOVER_EASE,
  TAB_BAR_HEIGHT,
  TAB_BAR_MARGIN,
  TAB_BAR_MAX_WIDTH,
  TAB_HOVER_ALPHA,
  TAB_HOVER_INSET,
  TAB_ICON_SCALE,
  TAB_ICON_Y,
  TAB_LABEL_SIZE,
  TAB_LABEL_Y,
  TAB_MAX_WIDTH,
} from '../constants';
import { playClick } from '../audio';
import { getTheme, toCss } from '../theme';
import type { IconDrawer } from './icons';
import { tweenColor } from './tweenColor';

export interface TabConfig<T extends string> {
  id: T;
  label: string;
  drawIcon: IconDrawer;
}

interface TabItem<T extends string> {
  config: TabConfig<T>;
  pill: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Zone;
  color?: number;
}

export class TabBar<T extends string> extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly items: TabItem<T>[] = [];
  private activeId?: T;

  constructor(scene: Phaser.Scene, tabs: TabConfig<T>[], onSelect: (id: T) => void) {
    super(scene, 0, 0);

    this.bg = scene.add.graphics();
    this.add(this.bg);

    for (const config of tabs) {
      const pill = scene.add.graphics().setAlpha(0);
      const icon = scene.add.graphics();
      const label = scene.add.text(0, 0, config.label, { fontFamily: FONT_FAMILY, fontSize: `${TAB_LABEL_SIZE}px` }).setOrigin(0.5);
      const hitArea = scene.add.zone(0, 0, 1, 1).setInteractive({ useHandCursor: true });
      const item: TabItem<T> = { config, pill, icon, label, hitArea };

      hitArea.on('pointerover', () => this.setHovered(item, true));
      hitArea.on('pointerout', () => this.setHovered(item, false));
      hitArea.on('pointerup', () => {
        if (config.id !== this.activeId) playClick();
        onSelect(config.id);
      });

      this.add([pill, icon, label, hitArea]);
      this.items.push(item);
    }

    this.layout();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));

    scene.add.existing(this);
  }

  selectTab(id: T): void {
    this.activeId = id;
    for (const item of this.items) this.paint(item, false);
  }

  private setHovered(item: TabItem<T>, hovered: boolean): void {
    this.paint(item, hovered);
  }

  private paint(item: TabItem<T>, hovered: boolean): void {
    const theme = getTheme();
    const active = item.config.id === this.activeId;
    const target = active ? theme.accent : hovered ? theme.accentSoft : theme.textMuted;

    this.scene.tweens.killTweensOf(item.pill);
    this.scene.tweens.add({ targets: item.pill, alpha: active ? 1 : hovered ? TAB_HOVER_ALPHA : 0, duration: HOVER_DURATION, ease: HOVER_EASE });

    const apply = (color: number) => {
      item.color = color;
      item.icon.clear();
      item.config.drawIcon(item.icon, color);
      item.label.setColor(toCss(color));
    };

    if (item.color === undefined) apply(target);
    else tweenColor(this.scene, item, item.color, target, apply);
  }

  private layout(): void {
    const { width, height } = this.scene.scale;
    this.setPosition(0, height - TAB_BAR_HEIGHT);

    const theme = getTheme();
    const barWidth = Math.min(width - TAB_BAR_MARGIN * 2, TAB_BAR_MAX_WIDTH);
    const barHeight = TAB_BAR_HEIGHT - TAB_BAR_MARGIN;
    const barX = (width - barWidth) / 2;
    this.bg.clear()
      .fillStyle(0x000000, CARD_SHADOW_ALPHA)
      .fillRoundedRect(barX, CARD_SHADOW_OFFSET, barWidth, barHeight, barHeight / 2)
      .fillStyle(theme.surface, 1)
      .fillRoundedRect(barX, 0, barWidth, barHeight, barHeight / 2);

    const tabWidth = Math.min((barWidth - TAB_HOVER_INSET * 2) / this.items.length, TAB_MAX_WIDTH);
    const startX = (width - tabWidth * this.items.length) / 2;
    const pillWidth = tabWidth - TAB_HOVER_INSET;
    const pillHeight = barHeight - TAB_HOVER_INSET * 2;

    this.items.forEach(({ pill, icon, label, hitArea }, i) => {
      const centerX = startX + tabWidth * (i + 0.5);

      pill.clear();
      pill.fillStyle(theme.hoverSurface, 1);
      pill.fillRoundedRect(centerX - pillWidth / 2, TAB_HOVER_INSET, pillWidth, pillHeight, pillHeight / 2);

      icon.setPosition(centerX, TAB_ICON_Y).setScale(TAB_ICON_SCALE);
      label.setPosition(centerX, TAB_LABEL_Y);
      hitArea.setPosition(centerX, barHeight / 2).setSize(tabWidth, barHeight);
    });
  }
}
