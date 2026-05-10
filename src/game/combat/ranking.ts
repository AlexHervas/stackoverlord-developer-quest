import type { RankingEntry } from "./types";
import { hasSupabaseConfig, supabase } from "./supabaseClient";

export const RANKING_KEY = "portfolioCombatRanking";
export const BEST_SCORE_KEY = "portfolioCombatBestScore";
export const PLAYER_ID_KEY = "portfolioCombatPlayerId";

type RankingRow = {
  player_id?: unknown;
  name?: unknown;
  score?: unknown;
  round?: unknown;
  kills?: unknown;
  seconds?: unknown;
  created_at?: unknown;
};

type BestScore = {
  score: number;
  hasBestScore: boolean;
};

const API_BASE_URL = import.meta.env.VITE_RANKING_API_BASE_URL?.replace(
  /\/$/,
  "",
);

export async function loadRanking(): Promise<RankingEntry[]> {
  if (hasSupabaseConfig) return loadSupabaseRanking();
  if (!API_BASE_URL) return loadLocalRanking();

  try {
    const response = await fetch(`${API_BASE_URL}/combat-ranking`);
    if (!response.ok) throw new Error("Ranking request failed");

    const data = (await response.json()) as unknown;
    const ranking = parseRankingResponse(data);
    return ranking ?? loadLocalRanking();
  } catch {
    return loadLocalRanking();
  }
}

export async function saveRankingEntry(entry: RankingEntry): Promise<void> {
  if (hasSupabaseConfig) {
    await saveSupabaseRankingEntry(entry);
    return;
  }

  if (!API_BASE_URL) {
    saveLocalRankingEntry(entry);
    saveLocalBestScore(entry.score);
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/combat-ranking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(entry),
    });

    if (!response.ok) throw new Error("Save ranking request failed");
  } catch {
    saveLocalRankingEntry(entry);
    saveLocalBestScore(entry.score);
  }
}

export async function getBestScore(playerId: string): Promise<BestScore> {
  if (hasSupabaseConfig) return getSupabaseBestScore(playerId);
  if (!API_BASE_URL) return getLocalBestScore();

  try {
    const response = await fetch(
      `${API_BASE_URL}/combat-ranking/best?playerId=${encodeURIComponent(
        playerId,
      )}`,
    );
    if (!response.ok) throw new Error("Best score request failed");

    const data = (await response.json()) as unknown;
    return parseBestScoreResponse(data) ?? getLocalBestScore();
  } catch {
    return getLocalBestScore();
  }
}

async function loadSupabaseRanking(): Promise<RankingEntry[]> {
  if (!supabase) return loadLocalRanking();

  try {
    const { data, error } = await supabase
      .from("combat_ranking")
      .select("player_id,name,score,round,kills,seconds,created_at")
      .order("score", { ascending: false })
      .limit(10);

    if (error) throw error;
    return parseSupabaseRankingRows(data) ?? loadLocalRanking();
  } catch {
    return loadLocalRanking();
  }
}

async function saveSupabaseRankingEntry(entry: RankingEntry): Promise<void> {
  if (!supabase) {
    saveLocalRankingEntry(entry);
    saveLocalBestScore(entry.score);
    return;
  }

  try {
    const { error } = await supabase.from("combat_ranking").upsert(
      {
        player_id: entry.playerId,
        name: entry.name,
        score: entry.score,
        round: entry.round,
        kills: entry.kills,
        seconds: entry.seconds,
      },
      { onConflict: "player_id" },
    );

    if (error) throw error;
  } catch {
    saveLocalRankingEntry(entry);
    saveLocalBestScore(entry.score);
  }
}

async function getSupabaseBestScore(playerId: string): Promise<BestScore> {
  if (!supabase) return getLocalBestScore();

  try {
    const { data, error } = await supabase
      .from("combat_ranking")
      .select("score")
      .eq("player_id", playerId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return { score: 0, hasBestScore: false };
    }

    const score = Number(data.score);
    if (!Number.isFinite(score)) return getLocalBestScore();
    return { score, hasBestScore: true };
  } catch {
    return getLocalBestScore();
  }
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

function parseRankingResponse(data: unknown): RankingEntry[] | null {
  const ranking = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.ranking)
      ? data.ranking
      : null;

  if (!ranking) return null;
  return ranking.filter(isRankingEntry).slice(0, 10);
}

function parseSupabaseRankingRows(data: unknown): RankingEntry[] | null {
  if (!Array.isArray(data)) return null;

  return data
    .map((row): RankingEntry | null => {
      if (!isRecord(row)) return null;

      const rankingRow = row as RankingRow;
      if (
        typeof rankingRow.name !== "string" ||
        typeof rankingRow.score !== "number" ||
        typeof rankingRow.round !== "number" ||
        typeof rankingRow.kills !== "number" ||
        typeof rankingRow.seconds !== "number" ||
        typeof rankingRow.created_at !== "string"
      ) {
        return null;
      }

      return {
        playerId:
          typeof rankingRow.player_id === "string"
            ? rankingRow.player_id
            : undefined,
        name: rankingRow.name,
        score: rankingRow.score,
        round: rankingRow.round,
        kills: rankingRow.kills,
        seconds: rankingRow.seconds,
        date: rankingRow.created_at,
      };
    })
    .filter((entry): entry is RankingEntry => entry !== null);
}

function parseBestScoreResponse(data: unknown): BestScore | null {
  if (!isRecord(data)) return null;

  const score = Number(data.score);
  if (!Number.isFinite(score)) return null;

  return {
    score,
    hasBestScore: data.hasBestScore === true,
  };
}

function loadLocalRanking(): RankingEntry[] {
  const rawRanking = window.localStorage.getItem(RANKING_KEY);
  if (!rawRanking) return [];

  try {
    const ranking = JSON.parse(rawRanking) as unknown;
    return parseRankingResponse(ranking) ?? [];
  } catch {
    return [];
  }
}

function saveLocalRankingEntry(entry: RankingEntry) {
  const ranking = [
    ...loadLocalRanking().filter((record) => {
      return record.playerId !== entry.playerId;
    }),
    entry,
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  window.localStorage.setItem(RANKING_KEY, JSON.stringify(ranking));
}

function getLocalBestScore(): BestScore {
  const rawBestScore = window.localStorage.getItem(BEST_SCORE_KEY);
  if (rawBestScore === null) {
    return { score: 0, hasBestScore: false };
  }

  const score = Number(rawBestScore);
  return {
    score: Number.isFinite(score) ? score : 0,
    hasBestScore: true,
  };
}

function saveLocalBestScore(score: number) {
  const current = getLocalBestScore();
  if (!current.hasBestScore || score > current.score) {
    window.localStorage.setItem(BEST_SCORE_KEY, String(score));
  }
}

function isRankingEntry(entry: unknown): entry is RankingEntry {
  return (
    isRecord(entry) &&
    typeof entry.name === "string" &&
    typeof entry.score === "number" &&
    typeof entry.round === "number" &&
    typeof entry.kills === "number" &&
    typeof entry.seconds === "number" &&
    typeof entry.date === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
