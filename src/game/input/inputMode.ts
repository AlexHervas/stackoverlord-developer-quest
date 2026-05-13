export type InputMode = "keyboard" | "touch";

let currentInputMode: InputMode = "keyboard";

export function setInputMode(mode: InputMode) {
  currentInputMode = mode;
}

function isTouchMode() {
  return currentInputMode === "touch";
}

export function getStartHint() {
  return isTouchMode() ? "A to start" : "Enter to start";
}

export function getMoveHint() {
  return isTouchMode() ? "Joystick to move" : "Arrow keys to move";
}

export function getInteractHint() {
  return isTouchMode() ? "A to interact" : "E to interact";
}

export function getContinueHint() {
  return isTouchMode() ? "A" : "E";
}

export function getAttackHubHint() {
  return isTouchMode()
    ? "JOYSTICK AIM | BACK: HUB"
    : "MOVE TO AIM | ESC: HUB";
}

export function getRetryHubHint() {
  return isTouchMode() ? "A: RETRY | BACK: HUB" : "E: RETRY | ESC: HUB";
}

export function getNameSubmitHint() {
  return isTouchMode() ? "TYPE NAME + A" : "TYPE NAME + ENTER";
}

export function getMusicHint(isEnabled: boolean) {
  const prefix = isTouchMode() ? "M" : "[M]";
  return `${prefix} MUSIC ${isEnabled ? "ON" : "OFF"}`;
}
