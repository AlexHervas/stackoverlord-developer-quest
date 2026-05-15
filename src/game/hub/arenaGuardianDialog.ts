import Phaser from "phaser";

const ARENA_DIALOG_OPTION_WIDTH = 70;

export const ARENA_DIALOG_TEXT =
  "Only the finest survive this floor.\nReach round 10 and face the Stack Overlord.\nEnter ready, or do not enter at all.";
export const ARENA_TYPEWRITER_SPEED = 34;

export type ArenaGuardianDialogView = {
  container: Phaser.GameObjects.Container;
  panel: Phaser.GameObjects.Rectangle;
  dialogueText: Phaser.GameObjects.Text;
  rankingText: Phaser.GameObjects.Text;
  introOptions: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text>;
  rankingBackOption: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text>;
};

type ArenaGuardianDialogCallbacks = {
  onEnter: () => void;
  onLeave: () => void;
  onRanking: () => void;
  onRankingBack: () => void;
};

type ArenaGuardianDialogConfig = {
  roomWidth: number;
  roomHeight: number;
};

export function createArenaGuardianDialog(
  scene: Phaser.Scene,
  { roomWidth, roomHeight }: ArenaGuardianDialogConfig,
  callbacks: ArenaGuardianDialogCallbacks,
): ArenaGuardianDialogView {
  const layout = getArenaGuardianDialogLayout(roomWidth, roomHeight);
  const container = scene.add
    .container(0, 0)
    .setScrollFactor(0)
    .setDepth(30)
    .setVisible(false);

  const panel = scene.add
    .rectangle(
      layout.dialog.x,
      layout.dialog.y,
      layout.dialog.width,
      layout.dialog.height,
      0x2b1a10,
      0.92,
    )
    .setOrigin(0.5, 1)
    .setStrokeStyle(1, 0xd6b06a, 0.85);

  const title = scene.add
    .text(
      layout.dialog.x,
      layout.dialog.y - 84 - layout.contentRaise,
      "ARENA GUARDIAN",
      {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#ffe7a2",
      },
    )
    .setOrigin(0.5, 0);

  const dialogueText = scene.add
    .text(
      layout.dialog.x,
      layout.dialog.y - 66 - layout.contentRaise,
      "",
      {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#f8efe0",
        align: "center",
        wordWrap: { width: layout.dialog.textWidth },
      },
    )
    .setOrigin(0.5, 0)
    .setVisible(false);

  const enterOption = createArenaDialogOption(
    scene,
    layout.dialog.x - 80,
    layout.dialog.y - 17 - layout.contentRaise,
    "ENTER",
    callbacks.onEnter,
  );
  const leaveOption = createArenaDialogOption(
    scene,
    layout.dialog.x + 80,
    layout.dialog.y - 17 - layout.contentRaise,
    "LEAVE",
    callbacks.onLeave,
  );
  const rankingOption = createArenaDialogOption(
    scene,
    layout.dialog.x,
    layout.dialog.y - 17 - layout.contentRaise,
    "RANKING",
    callbacks.onRanking,
  );
  const rankingText = scene.add
    .text(layout.rankingX, layout.rankingY, "", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#f8efe0",
      align: "left",
    })
    .setOrigin(0, 0)
    .setVisible(false);
  const rankingBackOption = createArenaDialogOption(
    scene,
    layout.dialog.x + layout.dialog.width / 2 - 34,
    layout.dialog.y - layout.dialog.height + 12,
    "BACK",
    callbacks.onRankingBack,
    54,
    16,
  );

  container.add([
    panel,
    title,
    dialogueText,
    rankingText,
    ...enterOption,
    ...rankingOption,
    ...leaveOption,
    ...rankingBackOption,
  ]);

  return {
    container,
    panel,
    dialogueText,
    rankingText,
    introOptions: [...enterOption, ...rankingOption, ...leaveOption],
    rankingBackOption: [...rankingBackOption],
  };
}

export function formatRankingColumns(rows: string[]) {
  const normalizedRows = rows.slice(0, 10);
  const leftRows = normalizedRows.slice(0, 5);
  const rightRows = normalizedRows.slice(5, 10);
  const leftWidth = Math.max(...leftRows.map((row) => row.length), 18);

  return leftRows.map((leftRow, index) => {
    const rightRow = rightRows[index];
    return rightRow
      ? `${leftRow.padEnd(leftWidth, " ")}   ${rightRow}`
      : leftRow;
  });
}

function createArenaDialogOption(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onSelect: () => void,
  width = ARENA_DIALOG_OPTION_WIDTH,
  height = 20,
): [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Text] {
  const background = scene.add
    .rectangle(x, y, width, height, 0x3a2418, 1)
    .setOrigin(0.5)
    .setStrokeStyle(1, 0xffe7a2, 0.75)
    .setInteractive({ useHandCursor: true });

  const text = scene.add
    .text(x, y, label, {
      fontFamily: "monospace",
      fontSize: height < 20 ? "8px" : "9px",
      color: "#ffe7a2",
    })
    .setOrigin(0.5);

  background.on("pointerover", () => background.setFillStyle(0x4f2d16, 1));
  background.on("pointerout", () => background.setFillStyle(0x3a2418, 1));
  background.on("pointerdown", onSelect);

  return [background, text];
}

function getArenaGuardianDialogLayout(roomWidth: number, roomHeight: number) {
  const dialog = {
    x: roomWidth / 2,
    y: roomHeight - 6,
    width: 280,
    height: 104,
    textWidth: 250,
  };
  const contentRaise = 8;

  return {
    dialog,
    contentRaise,
    rankingX: dialog.x - dialog.textWidth / 2 + 22,
    rankingY: dialog.y - 69 - contentRaise,
  };
}
