import * as Phaser from 'phaser';

export type IconDrawer = (g: Phaser.GameObjects.Graphics, color: number) => void;

export const drawHomeIcon: IconDrawer = (g, color) => {
  g.fillStyle(color, 1);
  g.fillTriangle(-32, -2, 0, -30, 32, -2);
  g.fillRect(-22, -4, 15, 32);
  g.fillRect(7, -4, 15, 32);
  g.fillRect(-7, -4, 14, 12);
};

export const drawGearIcon: IconDrawer = (g, color) => {
  g.fillStyle(color, 1);

  const tooth = [
    [-6, -30],
    [6, -30],
    [6, -20],
    [-6, -20],
  ];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const points = tooth.map(([x, y]) => new Phaser.Math.Vector2(x * cos - y * sin, x * sin + y * cos));
    g.fillPoints(points, true);
  }

  g.lineStyle(12, color, 1);
  g.strokeCircle(0, 0, 15);
};
