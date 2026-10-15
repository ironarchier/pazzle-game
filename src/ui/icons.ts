import * as Phaser from 'phaser';
import { COLORS } from '../constants';

export type IconDrawer = (g: Phaser.GameObjects.Graphics, color: number) => void;

export const drawHomeIcon: IconDrawer = (g, color) => {
  g.fillStyle(color, 1);
  g.fillTriangle(-32, -2, 0, -30, 32, -2);
  g.fillRect(-22, -4, 44, 32);
  g.fillStyle(COLORS.surface, 1);
  g.fillRect(-7, 10, 14, 18);
};

export const drawGearIcon: IconDrawer = (g, color) => {
  g.fillStyle(color, 1);

  const tooth = [
    [-6, -30],
    [6, -30],
    [6, -18],
    [-6, -18],
  ];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const points = tooth.map(([x, y]) => new Phaser.Math.Vector2(x * cos - y * sin, x * sin + y * cos));
    g.fillPoints(points, true);
  }

  g.fillCircle(0, 0, 21);
  g.fillStyle(COLORS.surface, 1);
  g.fillCircle(0, 0, 9);
};