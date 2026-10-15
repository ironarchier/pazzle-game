import * as Phaser from 'phaser';

export function disableInput(container: Phaser.GameObjects.Container): void {
  for (const child of container.list) {
    if (child.input) child.disableInteractive();
    if (child instanceof Phaser.GameObjects.Container) disableInput(child);
  }
}
