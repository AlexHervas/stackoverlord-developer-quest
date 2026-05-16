import type Phaser from "phaser";
import { eventBus } from "../../events/events";
import { getNameSubmitHint, getRetryHubHint } from "../../input/inputMode";
import {
  formatRankingRows,
  getBestScore,
  getPlayerId,
  loadRanking,
  saveRankingEntry,
} from "../ranking/ranking";
import type { CombatOverlayTexts, RankingEntry } from "../types";

export type CombatGameOverStats = {
  score: number;
  round: number;
  kills: number;
  seconds: number;
};

export class CombatGameOverFlow {
  private readonly scene: Phaser.Scene;
  private readonly texts: CombatOverlayTexts;
  private readonly maxNameLength: number;
  private nameDraft = "";
  private isEnteringName = false;
  private isCheckingScore = false;
  private isSavingRecord = false;
  private isHtmlNameInputReady = false;
  private currentStats?: CombatGameOverStats;
  private removeNameInputReadyListener?: () => void;
  private removeNameInputChangeListener?: () => void;
  private removeNameInputSubmitListener?: () => void;

  constructor(
    scene: Phaser.Scene,
    texts: CombatOverlayTexts,
    maxNameLength: number,
  ) {
    this.scene = scene;
    this.texts = texts;
    this.maxNameLength = maxNameLength;
  }

  get enteringName() {
    return this.isEnteringName;
  }

  get checkingScore() {
    return this.isCheckingScore;
  }

  get savingRecord() {
    return this.isSavingRecord;
  }

  reset() {
    this.nameDraft = "";
    this.currentStats = undefined;
    this.isEnteringName = false;
    this.isCheckingScore = false;
    this.isSavingRecord = false;
    this.closeNameInput();
    this.texts.nameInputText.setVisible(false);
  }

  destroy() {
    this.closeNameInput();
  }

  handleNameInput(event: KeyboardEvent, stats: CombatGameOverStats) {
    if (!this.isEnteringName) return;
    if (this.isSavingRecord) return;

    if (event.key === "Enter") {
      void this.saveRecord(stats);
      return;
    }

    if (event.key === "Backspace") {
      this.nameDraft = this.nameDraft.slice(0, -1);
      this.updateNameInput();
      return;
    }

    if (event.key.length !== 1 || this.nameDraft.length >= this.maxNameLength) {
      return;
    }

    if (/^[a-zA-Z0-9 _-]$/.test(event.key)) {
      this.nameDraft += event.key.toUpperCase();
      this.updateNameInput();
    }
  }

  async checkScoreAndShowPrompt(stats: CombatGameOverStats) {
    this.currentStats = stats;
    this.texts.messageText.setText("CHECKING SCORE...").setVisible(true);
    this.isCheckingScore = true;
    const playerId = getPlayerId();
    const bestScore = await getBestScore(playerId);
    this.isCheckingScore = false;
    if (!this.scene.scene.isActive()) return;

    if (!bestScore.hasBestScore || stats.score > bestScore.score) {
      this.isEnteringName = true;
      this.texts.messageText
        .setText(`NEW RECORD: ${stats.score}`)
        .setVisible(true);
      this.showNameEntryPrompt();
      this.updateNameInput();
      return;
    }

    this.texts.messageText
      .setText(`YOU FELL. SCORE: ${stats.score}`)
      .setVisible(true);
    void this.showRanking(stats, getRetryHubHint());
  }

  async saveRecord(stats: CombatGameOverStats) {
    const name = this.nameDraft.trim();
    if (!name) {
      this.texts.controlsText.setText("ENTER NAME");
      this.updateNameInput();
      return;
    }

    this.currentStats = stats;
    this.isSavingRecord = true;
    const entry: RankingEntry = {
      playerId: getPlayerId(),
      name,
      score: stats.score,
      round: stats.round,
      kills: stats.kills,
      seconds: stats.seconds,
      date: new Date().toISOString(),
    };

    this.texts.controlsText.setText("SAVING...");
    await saveRankingEntry(entry);
    if (!this.scene.scene.isActive()) return;

    this.isSavingRecord = false;
    this.isEnteringName = false;
    this.closeNameInput();
    this.texts.nameInputText.setVisible(false);
    this.texts.messageText.setText(`SAVED: ${entry.name} ${entry.score}`);
    await this.showRanking(stats, getRetryHubHint());
  }

  private updateNameInput() {
    const visibleName = this.nameDraft.padEnd(this.maxNameLength, "_");
    this.texts.nameInputText
      .setText(`NAME: ${visibleName}`)
      .setVisible(!this.isHtmlNameInputReady);
  }

  private showNameEntryPrompt() {
    this.texts.rankingText.setVisible(false);
    this.texts.statsText.setVisible(false);
    this.openNameInput();
    this.texts.controlsText.setText(getNameSubmitHint()).setVisible(true);
  }

  private openNameInput() {
    this.closeNameInput();
    eventBus.emit("combat:name-input:open", {
      value: this.nameDraft,
      maxLength: this.maxNameLength,
    });
    this.removeNameInputReadyListener = eventBus.on(
      "combat:name-input:ready",
      () => {
        if (!this.isEnteringName) return;
        this.isHtmlNameInputReady = true;
        this.texts.nameInputText.setVisible(false);
      },
    );
    this.removeNameInputChangeListener = eventBus.on(
      "combat:name-input:change",
      ({ value }) => {
        if (!this.isEnteringName || this.isSavingRecord) return;
        this.nameDraft = value.slice(0, this.maxNameLength);
        this.updateNameInput();
      },
    );
    this.removeNameInputSubmitListener = eventBus.on(
      "combat:name-input:submit",
      () => {
        if (!this.isEnteringName || this.isSavingRecord) return;
        if (!this.currentStats) return;
        void this.saveRecord(this.currentStats);
      },
    );
  }

  private closeNameInput() {
    this.removeNameInputReadyListener?.();
    this.removeNameInputChangeListener?.();
    this.removeNameInputSubmitListener?.();
    this.removeNameInputReadyListener = undefined;
    this.removeNameInputChangeListener = undefined;
    this.removeNameInputSubmitListener = undefined;
    this.isHtmlNameInputReady = false;
    eventBus.emit("combat:name-input:close", undefined);
  }

  private async showRanking(stats: CombatGameOverStats, footer: string) {
    const ranking = await loadRanking();
    if (!this.scene.scene.isActive()) return;
    const rows = formatRankingColumns(formatRankingRows(ranking));

    this.texts.messageText.setY(48);
    this.texts.rankingText.setText(["TOP 10 ARENA", ...rows]).setVisible(true);
    this.texts.statsText
      .setText(
        `KILLS: ${stats.kills}  ROUND: ${stats.round}  TIME: ${stats.seconds}S`,
      )
      .setVisible(true);
    this.texts.controlsText.setText(footer).setVisible(true);
  }

}

function formatRankingColumns(rows: string[]) {
  const normalizedRows = rows.slice(0, 10);
  const leftRows = normalizedRows.slice(0, 5);
  const rightRows = normalizedRows.slice(5, 10);
  const leftWidth = Math.max(...leftRows.map((row) => row.length), 16);

  return leftRows.map((leftRow, index) => {
    const rightRow = rightRows[index];
    return rightRow
      ? `${leftRow.padEnd(leftWidth, " ")}  ${rightRow}`
      : leftRow;
  });
}
