import * as Phaser from 'phaser';
import { BLUR_SAMPLE_SIZE } from '../constants';

export function blurTexture(scene: Phaser.Scene, key: string, size: number): string {
  const blurKey = `${key}-blur`;
  if (scene.textures.exists(blurKey)) return blurKey;
  // Downscaling to a few pixels and smoothing back up hides every detail of the picture.
  const sample = document.createElement('canvas');
  sample.width = sample.height = BLUR_SAMPLE_SIZE;
  sample.getContext('2d')?.drawImage(scene.textures.get(key).getSourceImage() as CanvasImageSource, 0, 0, BLUR_SAMPLE_SIZE, BLUR_SAMPLE_SIZE);
  const texture = scene.textures.createCanvas(blurKey, size, size);
  if (!texture) return key;
  texture.context.imageSmoothingEnabled = true;
  texture.context.imageSmoothingQuality = 'high';
  texture.context.drawImage(sample, 0, 0, size, size);
  texture.refresh();
  return blurKey;
}
