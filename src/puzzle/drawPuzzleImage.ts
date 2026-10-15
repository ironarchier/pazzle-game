export function drawPuzzleImage(ctx: CanvasRenderingContext2D, size: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, size);
  sky.addColorStop(0, '#3a7bd5');
  sky.addColorStop(0.6, '#f6d365');
  sky.addColorStop(1, '#fda085');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.arc(size * 0.72, size * 0.3, size * 0.11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  drawCloud(ctx, size * 0.2, size * 0.18, size * 0.07);
  drawCloud(ctx, size * 0.5, size * 0.1, size * 0.05);

  ctx.fillStyle = '#6c5b7b';
  drawPolygon(ctx, [
    [0, size * 0.75],
    [size * 0.25, size * 0.42],
    [size * 0.5, size * 0.75],
  ]);
  ctx.fillStyle = '#355c7d';
  drawPolygon(ctx, [
    [size * 0.3, size * 0.75],
    [size * 0.62, size * 0.35],
    [size, size * 0.75],
  ]);
  ctx.fillStyle = '#ffffff';
  drawPolygon(ctx, [
    [size * 0.62, size * 0.35],
    [size * 0.56, size * 0.43],
    [size * 0.68, size * 0.43],
  ]);

  ctx.fillStyle = '#2e8b57';
  ctx.fillRect(0, size * 0.75, size, size * 0.25);

  const flowerColors = ['#ff6b6b', '#feca57', '#ff9ff3', '#ffffff'];
  for (let i = 0; i < 24; i++) {
    const x = (((i * 97) % 100) / 100) * size;
    const y = size * (0.8 + ((i * 37) % 17) / 100);
    ctx.fillStyle = flowerColors[i % flowerColors.length];
    ctx.beginPath();
    ctx.arc(x, y, size * 0.012, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = `bold ${Math.round(size * 0.11)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillText('PUZZLE', size / 2 + 4, size * 0.9 + 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('PUZZLE', size / 2, size * 0.9);
}

function drawPolygon(ctx: CanvasRenderingContext2D, points: [number, number][]): void {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r, y - r * 0.4, r * 0.9, 0, Math.PI * 2);
  ctx.arc(x + r * 1.9, y, r * 0.8, 0, Math.PI * 2);
  ctx.fill();
}