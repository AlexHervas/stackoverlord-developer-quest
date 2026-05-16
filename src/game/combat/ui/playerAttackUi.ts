import Phaser from "phaser";

const SLASH_DEPTH = 5;
export const SLASH_FADE_SCALE = 1.08;
export const SLASH_FADE_DURATION = 150;
const SLASH_OFFSET = 6;
const SLASH_START_ANGLE = -Math.PI / 3.2;
const SLASH_END_ANGLE = Math.PI / 3.2;
const SLASH_RADIUS = 16;
const SLASH_OUTER_RADIUS = 19;
const SLASH_STEPS = 6;
const SLASH_STEP_DELAY = 18;
const SLASH_SHADOW_WIDTH = 4;
const SLASH_SHADOW_COLOR = 0xffe7a2;
const SLASH_SHADOW_ALPHA = 0.34;
const SLASH_CORE_WIDTH = 2;
const SLASH_CORE_COLOR = 0xffffff;
const SLASH_CORE_ALPHA = 0.82;

export function createSlashEffect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  facing: Phaser.Math.Vector2,
) {
  const slash = scene.add.container(x, y).setDepth(SLASH_DEPTH);
  const arc = scene.add.graphics();
  const angle = Math.atan2(facing.y, facing.x);

  arc.x = facing.x * SLASH_OFFSET;
  arc.y = facing.y * SLASH_OFFSET;
  arc.rotation = angle;
  slash.add(arc);

  for (let step = 1; step <= SLASH_STEPS; step += 1) {
    scene.time.delayedCall((step - 1) * SLASH_STEP_DELAY, () => {
      if (!arc.active) return;

      const progress = step / SLASH_STEPS;
      const currentEnd = Phaser.Math.Linear(
        SLASH_START_ANGLE,
        SLASH_END_ANGLE,
        progress,
      );
      arc.clear();

      arc.lineStyle(
        SLASH_SHADOW_WIDTH,
        SLASH_SHADOW_COLOR,
        SLASH_SHADOW_ALPHA,
      );
      arc.beginPath();
      arc.arc(0, 0, SLASH_RADIUS, SLASH_START_ANGLE, currentEnd);
      arc.strokePath();

      arc.lineStyle(SLASH_CORE_WIDTH, SLASH_CORE_COLOR, SLASH_CORE_ALPHA);
      arc.beginPath();
      arc.arc(0, 0, SLASH_OUTER_RADIUS, SLASH_START_ANGLE, currentEnd);
      arc.strokePath();
    });
  }

  return slash;
}
