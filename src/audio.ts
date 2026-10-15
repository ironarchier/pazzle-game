import * as Phaser from 'phaser';
import { SOUND_DETUNE, SOUNDS } from './constants';
import { getSettings } from './settings';

let manager: Phaser.Sound.BaseSoundManager | undefined;

export function initAudio(sound: Phaser.Sound.BaseSoundManager): void {
  manager = sound;
}

export function preloadSounds(load: Phaser.Loader.LoaderPlugin): void {
  for (const key of [SOUNDS.click, ...SOUNDS.place, ...SOUNDS.join]) {
    load.audio(key, `sounds/${key}.mp3`);
  }
}

function play(key: string, detune = 0): void {
  if (!getSettings().sound || !manager) return;
  manager.play(key, { detune });
}

const randomDetune = () => Phaser.Math.Between(-SOUND_DETUNE, SOUND_DETUNE);

export function playClick(): void {
  play(SOUNDS.click);
}

export function playPlace(): void {
  play(Phaser.Utils.Array.GetRandom(SOUNDS.place), randomDetune());
}

export function playJoin(): void {
  play(Phaser.Utils.Array.GetRandom(SOUNDS.join), randomDetune());
}
