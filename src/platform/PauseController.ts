import type * as Phaser from 'phaser';

/** Independent pause causes must all clear before gameplay or audio resumes. */
export class PauseController {
  private reasons = new Set<string>();
  private ownedScenes = new Set<Phaser.Scene>();
  private previousInput = true;
  private audioEnabled = true;
  private game: Phaser.Game;
  private suspendAudio: (value: boolean) => void;
  constructor(game: Phaser.Game, suspendAudio: (value: boolean) => void) { this.game = game; this.suspendAudio = suspendAudio; }
  get paused(): boolean { return this.reasons.size > 0; }
  setPaused(reason: string, paused: boolean): void {
    const wasPaused = this.paused;
    if (paused) this.reasons.add(reason); else this.reasons.delete(reason);
    if (!wasPaused && this.paused) {
      this.previousInput = this.game.input.enabled;
      this.game.input.enabled = false;
    }
    if (this.paused) this.enforce();
    else if (wasPaused) {
      for (const scene of this.ownedScenes) if (scene.sys.isPaused()) scene.scene.resume();
      this.ownedScenes.clear();
      this.game.input.enabled = this.previousInput;
    }
    this.syncAudio();
  }
  setAudioEnabled(value: boolean): void { this.audioEnabled = value; this.syncAudio(); }
  enforce = (): void => {
    if (!this.paused) return;
    for (const scene of this.game.scene.getScenes(true)) {
      this.ownedScenes.add(scene);
      scene.events?.emit('platformpause');
      scene.scene.pause();
    }
  };
  private syncAudio(): void { this.suspendAudio(this.paused || !this.audioEnabled); }
}
