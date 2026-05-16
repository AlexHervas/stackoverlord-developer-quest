import { audioSources } from "../audio/audioSources";
import { BOSS_CONFIG } from "./bossConfig";

export const ARENA_WIDTH = 320;
export const ARENA_HEIGHT = 160;
export const SPEED = 95;
export const ENEMY_SPEED = 22;
export const BOSS_CENTER_X = ARENA_WIDTH / 2;
export const BOSS_CENTER_Y = ARENA_HEIGHT / 2;
export const BOSS_BAR_X = ARENA_WIDTH / 2 - BOSS_CONFIG.barWidth / 2;
export const BOSS_BAR_Y = 16;
export const ATTACK_RANGE = 34;
export const ATTACK_COOLDOWN = 700;
export const DAMAGE_COOLDOWN = 900;
export const MAX_NAME_LENGTH = 10;
export const UI_FONT = "11px";
export const TITLE_FONT = "12px";
export const INITIAL_ROUND = 1;
export const INITIAL_HEALTH = 6;
export const PLAYER_START_Y_OFFSET = 18;
export const PLAYER_BODY_WIDTH = 14;
export const PLAYER_BODY_HEIGHT = 14;
export const ENEMY_SPEED_PER_ROUND = 0.5;
export const ATTACK_CENTER_OFFSET = 14;
export const ATTACK_HIT_PADDING = 8;
export const PLAYER_HIT_SHAKE_DURATION = 90;
export const PLAYER_HIT_SHAKE_INTENSITY = 0.008;
export const PLAYER_HIT_TINT = 0xff6b6b;
export const PLAYER_HIT_BLINK_ALPHA = 0.35;
export const PLAYER_HIT_BLINK_DURATION = 80;
export const PLAYER_HIT_BLINK_REPEATS = 5;
export const ROUND_START_DELAY = 900;
export const POWER_UP_GROUND_DURATION = 6000;
export const POWER_UP_GROUND_BLINK_DURATION = 3000;
export const HEALTH_POWER_UP_HEAL = 2;
export const HEALTH_POWER_UP_DROP_CHANCE = 0.15;
export const INVULNERABILITY_POWER_UP_DROP_CHANCE = 0.17;
export const INVULNERABILITY_POWER_UP_MIN_ROUND = 3;
export const INVULNERABILITY_POWER_UP_DURATION = 4000;
export const INVULNERABILITY_POWER_UP_BLINK_DURATION = 1000;
export const BOSS_INVULNERABILITY_POWER_UP_ATTEMPT_INTERVAL = 5000;
export const BOSS_INVULNERABILITY_POWER_UP_DROP_CHANCE = 0.5;
export const KILL_SCORE = 100;
export const ROUND_SCORE = 250;
export const SECOND_SCORE = 5;
export const MAX_TIME_SCORE_SECONDS_PER_ROUND = 15;
export const MAX_TIME_SCORE_SECONDS_BOSS_ROUND = 25;

export const ARENA_BOUNDS = {
  x: 12,
  y: 16,
  width: ARENA_WIDTH - 24,
  height: ARENA_HEIGHT - 28,
};

export const HUD_CONFIG = {
  arenaWidth: ARENA_WIDTH,
  arenaHeight: ARENA_HEIGHT,
  titleFont: TITLE_FONT,
  uiFont: UI_FONT,
};

export const SCORE_CONFIG = {
  killScore: KILL_SCORE,
  roundScore: ROUND_SCORE,
  secondScore: SECOND_SCORE,
  maxTimeScoreSecondsPerRound: MAX_TIME_SCORE_SECONDS_PER_ROUND,
  maxTimeScoreSecondsBossRound: MAX_TIME_SCORE_SECONDS_BOSS_ROUND,
};

export const COMBAT_AUDIO = {
  music: {
    key: "combatSceneMusic",
    paths: audioSources("assets/audio/combatScene_theme"),
    volume: 0.12,
  },
  attack: {
    key: "combatSwordSound",
    paths: audioSources("assets/audio/sword"),
    volume: 0.05,
  },
  playerHit: {
    key: "combatPlayerHitSound",
    paths: audioSources("assets/audio/hit"),
    volume: 0.5,
  },
};
