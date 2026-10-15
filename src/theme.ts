import * as Phaser from 'phaser';
import { THEMES, type Theme } from './constants';
import { getSettings } from './settings';

export function getTheme(): Theme {
  return THEMES[getSettings().theme];
}

export function toCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function applyTheme(scene: Phaser.Scene): void {
  const { background } = getTheme();
  scene.cameras.main.setBackgroundColor(background);
  document.documentElement.dataset.theme = getSettings().theme;
}