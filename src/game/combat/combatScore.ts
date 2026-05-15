export type CombatScoreConfig = {
  killScore: number;
  roundScore: number;
  secondScore: number;
  maxTimeScoreSecondsPerRound: number;
  maxTimeScoreSecondsBossRound: number;
};

export class CombatScoreTracker {
  private activeStartedAt = 0;
  private activeElapsedMs = 0;
  private roundStartedElapsedMs = 0;
  private scoredSecondsFromCompletedRounds = 0;
  private currentRoundMaxScoreSeconds = 0;
  private readonly config: CombatScoreConfig;

  constructor(config: CombatScoreConfig) {
    this.config = config;
  }

  reset(now = Date.now()) {
    this.activeStartedAt = now;
    this.activeElapsedMs = 0;
    this.roundStartedElapsedMs = 0;
    this.scoredSecondsFromCompletedRounds = 0;
    this.currentRoundMaxScoreSeconds =
      this.config.maxTimeScoreSecondsPerRound;
  }

  startActive(now = Date.now()) {
    this.activeStartedAt = now;
  }

  startRound(isBossRound: boolean, isPaused: boolean, now = Date.now()) {
    this.currentRoundMaxScoreSeconds = isBossRound
      ? this.config.maxTimeScoreSecondsBossRound
      : this.config.maxTimeScoreSecondsPerRound;
    this.roundStartedElapsedMs = this.getActiveElapsedMs(isPaused, now);
  }

  completeRound(isPaused: boolean, now = Date.now()) {
    this.scoredSecondsFromCompletedRounds += this.getCurrentRoundScoreSeconds(
      isPaused,
      now,
    );
  }

  calculateScore({
    kills,
    round,
    isChangingRound,
    isPaused,
    now = Date.now(),
  }: {
    kills: number;
    round: number;
    isChangingRound: boolean;
    isPaused: boolean;
    now?: number;
  }) {
    return (
      kills * this.config.killScore +
      round * this.config.roundScore +
      this.getScoredSeconds(isChangingRound, isPaused, now) *
        this.config.secondScore
    );
  }

  getSurvivedSeconds({
    isGameOver,
    finalSeconds,
    isPaused,
    now = Date.now(),
  }: {
    isGameOver: boolean;
    finalSeconds: number;
    isPaused: boolean;
    now?: number;
  }) {
    if (isGameOver) return finalSeconds;
    return Math.floor(this.getActiveElapsedMs(isPaused, now) / 1000);
  }

  freeze(now = Date.now()) {
    this.activeElapsedMs += now - this.activeStartedAt;
    this.activeStartedAt = now;
  }

  private getScoredSeconds(
    isChangingRound: boolean,
    isPaused: boolean,
    now: number,
  ) {
    if (isChangingRound) return this.scoredSecondsFromCompletedRounds;

    return (
      this.scoredSecondsFromCompletedRounds +
      this.getCurrentRoundScoreSeconds(isPaused, now)
    );
  }

  private getCurrentRoundScoreSeconds(isPaused: boolean, now: number) {
    const roundElapsedSeconds = Math.floor(
      (this.getActiveElapsedMs(isPaused, now) - this.roundStartedElapsedMs) /
        1000,
    );

    return Math.min(roundElapsedSeconds, this.currentRoundMaxScoreSeconds);
  }

  private getActiveElapsedMs(isPaused: boolean, now: number) {
    if (isPaused) return this.activeElapsedMs;
    return this.activeElapsedMs + now - this.activeStartedAt;
  }
}
