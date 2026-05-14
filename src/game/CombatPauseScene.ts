import Phaser from "phaser";
import { virtualInput } from "./input/virtualInput";

const SCENE_WIDTH = 320;
const SCENE_HEIGHT = 160;
const PANEL_WIDTH = 132;
const PANEL_HEIGHT = 64;

export default class CombatPauseScene extends Phaser.Scene {
  private pauseKey?: Phaser.Input.Keyboard.Key;
  private offVirtualPause?: () => void;

  constructor() {
    super("CombatPauseScene");
  }

  create() {
    this.add
      .rectangle(0, 0, SCENE_WIDTH, SCENE_HEIGHT, 0x000000, 0.58)
      .setOrigin(0, 0);

    this.add
      .rectangle(
        SCENE_WIDTH / 2,
        SCENE_HEIGHT / 2,
        PANEL_WIDTH,
        PANEL_HEIGHT,
        0x1f130c,
        0.95,
      )
      .setStrokeStyle(1, 0xffd166, 0.9);

    this.add
      .text(SCENE_WIDTH / 2, SCENE_HEIGHT / 2 - 16, "PAUSED", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffe7a2",
      })
      .setOrigin(0.5);

    this.add
      .text(SCENE_WIDTH / 2, SCENE_HEIGHT / 2 + 15, "RESUME", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#ffe7a2",
        backgroundColor: "rgba(79,45,22,0.95)",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.resumeCombat());

    this.pauseKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.P,
    );
    this.offVirtualPause = virtualInput.onAction("pause", () =>
      this.resumeCombat(),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offVirtualPause?.();
      this.offVirtualPause = undefined;
    });
  }

  update() {
    if (this.pauseKey && Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.resumeCombat();
    }
  }

  private resumeCombat() {
    virtualInput.clearActions();
    this.scene.get("CombatScene").events.emit("combat:resume-from-pause");
    this.scene.stop();
  }
}
