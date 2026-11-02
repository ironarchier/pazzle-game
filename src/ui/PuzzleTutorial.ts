import * as Phaser from 'phaser';
import { CARD_RADIUS, FONT_FAMILY, GAME_DEPTH, HEADER_HEIGHT, TRAY_HEIGHT, TUTORIAL } from '../constants';
import { t } from '../i18n';
import { getTheme, toCss } from '../theme';

type Step = 'drag' | 'tools';

export class PuzzleTutorial {
  private readonly scene: Phaser.Scene;
  private readonly onDone: () => void;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private readonly card: Phaser.GameObjects.Container;
  private readonly finger: Phaser.GameObjects.Arc;
  private step: Step = 'drag';
  private fingerTween?: Phaser.Tweens.Tween;
  private timer?: Phaser.Time.TimerEvent;
  private finished = false;

  constructor(scene: Phaser.Scene, onDone: () => void) {
    const theme = getTheme();
    this.scene = scene;
    this.onDone = onDone;
    this.bg = scene.add.graphics();
    this.text = scene.add.text(0, 0, '', { fontFamily: FONT_FAMILY, fontSize: TUTORIAL.fontSize + 'px', color: toCss(theme.text), align: 'center' }).setOrigin(0.5);
    this.card = scene.add.container(0, 0, [this.bg, this.text]).setDepth(GAME_DEPTH.tutorial);
    this.finger = scene.add.circle(0, 0, TUTORIAL.fingerRadius, theme.accent, 0.85)
      .setStrokeStyle(TUTORIAL.fingerStroke, 0xffffff).setDepth(GAME_DEPTH.tutorial);
    this.layout();
  }

  layout(): void {
    if (this.finished) return;
    const theme = getTheme();
    const { width, height } = this.scene.scale;
    const cardWidth = Math.min(TUTORIAL.width, width - TUTORIAL.margin * 2);
    this.text.setText(t(this.step === 'drag' ? 'tutorialDrag' : 'tutorialTools')).setWordWrapWidth(cardWidth - TUTORIAL.padding * 2);
    const cardHeight = this.text.height + TUTORIAL.padding * 2;
    this.bg.clear()
      .fillStyle(theme.surface, 0.96).fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, CARD_RADIUS)
      .lineStyle(TUTORIAL.border, theme.accent, 1).strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, CARD_RADIUS);
    const y = this.step === 'drag'
      ? height - TRAY_HEIGHT - cardHeight / 2 - TUTORIAL.margin
      : HEADER_HEIGHT + cardHeight / 2 + TUTORIAL.margin;
    this.card.setPosition(width / 2, y);

    this.fingerTween?.remove();
    this.finger.setVisible(this.step === 'drag');
    if (this.step !== 'drag') return;
    const from = height - TRAY_HEIGHT / 2, to = (HEADER_HEIGHT + height - TRAY_HEIGHT) / 2;
    this.finger.setPosition(width / 2, from).setAlpha(1);
    this.fingerTween = this.scene.tweens.add({
      targets: this.finger, y: to, duration: TUTORIAL.fingerDuration, ease: 'Sine.easeInOut',
      repeat: -1, repeatDelay: TUTORIAL.fingerPause,
    });
  }

  placed(): void {
    if (this.finished || this.step !== 'drag') return;
    this.step = 'tools';
    this.layout();
    this.timer = this.scene.time.delayedCall(TUTORIAL.toolsDuration, () => this.finish());
  }

  pickedUp(): void {
    if (this.step === 'tools') this.finish();
  }

  finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.fingerTween?.remove();
    this.timer?.remove();
    this.card.destroy();
    this.finger.destroy();
    this.onDone();
  }
}
