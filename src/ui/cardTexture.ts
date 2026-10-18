import * as Phaser from 'phaser';
import { BLUR_SAMPLE_SIZE } from '../constants';
import { toCss } from '../theme';

export interface Corners { tl: number; tr: number; br: number; bl: number }

function roundedPath(ctx: CanvasRenderingContext2D, w: number, h: number, { tl, tr, br, bl }: Corners): void {
  ctx.beginPath();
  ctx.moveTo(tl, 0);
  ctx.arcTo(w, 0, w, h, tr);
  ctx.arcTo(w, h, 0, h, br);
  ctx.arcTo(0, h, 0, 0, bl);
  ctx.arcTo(0, 0, w, 0, tl);
  ctx.closePath();
}

export function gradientTexture(scene: Phaser.Scene, width: number, height: number, radius: number, from: number, to: number): string {
  const key = `gradient-${width}x${height}-${radius}-${from.toString(16)}-${to.toString(16)}`;
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return key;
  const ctx = texture.context;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, toCss(from));
  gradient.addColorStop(1, toCss(to));
  roundedPath(ctx, width, height, { tl: radius, tr: radius, br: radius, bl: radius });
  ctx.fillStyle = gradient;
  ctx.fill();
  texture.refresh();
  return key;
}

export function cardTexture(scene: Phaser.Scene, key: string, width: number, height: number, corners: Corners, blur = false): string {
  const cardKey = `${key}-${width}x${height}-${corners.tl}.${corners.tr}.${corners.br}.${corners.bl}${blur ? '-blur' : ''}`;
  if (scene.textures.exists(cardKey)) return cardKey;
  const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const scale = Math.max(width / source.width, height / source.height);
  const cropW = width / scale, cropH = height / scale;
  const sx = (source.width - cropW) / 2, sy = (source.height - cropH) / 2;

  let image: CanvasImageSource = source;
  if (blur) {
    const sample = document.createElement('canvas');
    sample.width = sample.height = BLUR_SAMPLE_SIZE;
    sample.getContext('2d')?.drawImage(source, sx, sy, cropW, cropH, 0, 0, BLUR_SAMPLE_SIZE, BLUR_SAMPLE_SIZE);
    image = sample;
  }

  const texture = scene.textures.createCanvas(cardKey, width, height);
  if (!texture) return key;
  const ctx = texture.context;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  roundedPath(ctx, width, height, corners);
  ctx.clip();
  if (blur) ctx.drawImage(image, 0, 0, width, height);
  else ctx.drawImage(image, sx, sy, cropW, cropH, 0, 0, width, height);
  texture.refresh();
  return cardKey;
}
