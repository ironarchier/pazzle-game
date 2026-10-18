import * as Phaser from 'phaser';
import { playClick } from '../audio';
import {
  CARD_HOVER_SCALE,
  CARD_RADIUS,
  CARD_SHADOW_ALPHA,
  CARD_SHADOW_OFFSET,
  HOVER_DURATION,
  HOVER_EASE,
  PROGRESS_BAR_HEIGHT,
} from '../constants';
import { getTheme } from '../theme';

export function createCard(scene: Phaser.Scene, x: number, y: number, width: number, height: number, onClick?: () => void, outline?: number): Phaser.GameObjects.Container {
  const bg = scene.add.graphics();
  const draw = (fill: number) => {
    bg.clear()
      .fillStyle(0x000000, CARD_SHADOW_ALPHA)
      .fillRoundedRect(-width / 2, -height / 2 + CARD_SHADOW_OFFSET, width, height, CARD_RADIUS)
      .fillStyle(fill, 1)
      .fillRoundedRect(-width / 2, -height / 2, width, height, CARD_RADIUS);
    if (outline !== undefined) bg.lineStyle(3, outline, 1).strokeRoundedRect(-width / 2, -height / 2, width, height, CARD_RADIUS);
  };
  draw(getTheme().surface);
  const card = scene.add.container(x, y, [bg]);
  if (!onClick) return card;
  const hover = (fill: number, scale: number) => {
    draw(fill);
    scene.tweens.killTweensOf(card);
    scene.tweens.add({ targets: card, scale, duration: HOVER_DURATION, ease: HOVER_EASE });
  };
  const hitArea = scene.add.zone(0, 0, width, height).setInteractive({ useHandCursor: true });
  hitArea.on('pointerover', () => hover(getTheme().hoverSurface, CARD_HOVER_SCALE));
  hitArea.on('pointerout', () => hover(getTheme().surface, 1));
  hitArea.on('pointerup', () => { playClick(); onClick(); });
  return card.add(hitArea);
}

export function createProgressBar(scene: Phaser.Scene, x: number, y: number, width: number, ratio: number, color: number): Phaser.GameObjects.Graphics {
  const h = PROGRESS_BAR_HEIGHT;
  const bar = scene.add.graphics().fillStyle(getTheme().track, 1).fillRoundedRect(x, y - h / 2, width, h, h / 2);
  if (ratio > 0) bar.fillStyle(color, 1).fillRoundedRect(x, y - h / 2, Math.max(h, width * ratio), h, h / 2);
  return bar;
}
