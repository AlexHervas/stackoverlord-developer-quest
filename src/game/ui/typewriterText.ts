import Phaser from "phaser";

type TypewriterSpeechConfig = {
  key: string;
  volume: number;
  repeatDelay: number;
};

type TypewriterStartConfig = {
  target: Phaser.GameObjects.Text;
  text: string;
  delay: number;
  onComplete: () => void;
};

export class TypewriterText {
  private characterCount = 0;
  private typewriterTimer?: Phaser.Time.TimerEvent;
  private speechTimer?: Phaser.Time.TimerEvent;
  private readonly scene: Phaser.Scene;
  private readonly speech: TypewriterSpeechConfig;

  constructor(scene: Phaser.Scene, speech: TypewriterSpeechConfig) {
    this.scene = scene;
    this.speech = speech;
  }

  start({ target, text, delay, onComplete }: TypewriterStartConfig) {
    this.stop();
    this.characterCount = 0;
    target.setText("").setVisible(true);
    this.startSpeechLoop();

    this.typewriterTimer = this.scene.time.addEvent({
      delay,
      repeat: text.length - 1,
      callback: () => {
        this.characterCount += 1;
        target.setText(text.slice(0, this.characterCount));

        if (this.characterCount >= text.length) {
          onComplete();
        }
      },
    });
  }

  complete(target: Phaser.GameObjects.Text, text: string, onComplete: () => void) {
    this.typewriterTimer?.remove(false);
    target.setText(text);
    onComplete();
  }

  stop() {
    this.typewriterTimer?.remove(false);
    this.speechTimer?.remove(false);
    this.typewriterTimer = undefined;
    this.speechTimer = undefined;
  }

  reset() {
    this.stop();
    this.characterCount = 0;
  }

  private startSpeechLoop() {
    if (!this.scene.cache.audio.exists(this.speech.key)) return;

    this.scene.sound.play(this.speech.key, {
      volume: this.speech.volume,
    });

    this.speechTimer = this.scene.time.addEvent({
      delay: this.speech.repeatDelay,
      loop: true,
      callback: () => {
        this.scene.sound.play(this.speech.key, {
          volume: this.speech.volume,
        });
      },
    });
  }
}
