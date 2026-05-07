import type { RankingEntry } from "./types";

export const RANKING_KEY = "portfolioCombatRanking";
export const BEST_SCORE_KEY = "portfolioCombatBestScore";
export const PLAYER_ID_KEY = "portfolioCombatPlayerId";

export function loadRanking(): RankingEntry[] {
  const rawRanking = window.localStorage.getItem(RANKING_KEY);
  if (!rawRanking) return [];

  try {
    const ranking = JSON.parse(rawRanking) as RankingEntry[];
    if (!Array.isArray(ranking)) return [];
    return ranking.filter(isRankingEntry).slice(0, 10);
  } catch {
    return [];
  }
}

export function saveRankingEntry(entry: RankingEntry) {
  const ranking = [
    ...loadRanking().filter((record) => {
      return record.playerId !== entry.playerId;
    }),
    entry,
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  window.localStorage.setItem(RANKING_KEY, JSON.stringify(ranking));
}

export function getBestScore() {
  return Number(window.localStorage.getItem(BEST_SCORE_KEY) ?? 0);
}

export function saveBestScore(score: number) {
  window.localStorage.setItem(BEST_SCORE_KEY, String(score));
}

export function hasBestScore() {
  return window.localStorage.getItem(BEST_SCORE_KEY) !== null;
}

export function getPlayerId() {
  const currentId = window.localStorage.getItem(PLAYER_ID_KEY);
  if (currentId) return currentId;

  const newId = crypto.randomUUID();
  window.localStorage.setItem(PLAYER_ID_KEY, newId);
  return newId;
}

export function formatRankingRows(ranking: RankingEntry[]) {
  if (ranking.length === 0) return ["NO RECORDS YET"];

  return ranking.map((entry, index) => {
    const position = String(index + 1).padStart(2, "0");
    return `${position} ${entry.name.padEnd(10, " ")} ${entry.score}`;
  });
}

function isRankingEntry(entry: RankingEntry) {
  return (
    typeof entry.name === "string" &&
    typeof entry.score === "number" &&
    typeof entry.round === "number" &&
    typeof entry.kills === "number" &&
    typeof entry.seconds === "number" &&
    typeof entry.date === "string"
  );
}
