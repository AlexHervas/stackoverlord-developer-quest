export type RankingEntry = {
  playerId?: string;
  name: string;
  score: number;
  round: number;
  kills: number;
  seconds: number;
  date: string;
};

export type SpawnPoint = {
  x: number;
  y: number;
};
