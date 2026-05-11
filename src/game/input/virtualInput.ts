export type VirtualDirection = "up" | "down" | "left" | "right";
export type VirtualAction = "primary" | "back" | "music";

type ActionHandler = () => void;

const directionState: Record<VirtualDirection, boolean> = {
  up: false,
  down: false,
  left: false,
  right: false,
};

const actionPresses: Record<VirtualAction, number> = {
  primary: 0,
  back: 0,
  music: 0,
};

const consumedPresses: Record<VirtualAction, number> = {
  primary: 0,
  back: 0,
  music: 0,
};

const actionHandlers = new Map<VirtualAction, Set<ActionHandler>>();

export const virtualInput = {
  setDirection(direction: VirtualDirection, isDown: boolean) {
    directionState[direction] = isDown;
  },

  isDirectionDown(direction: VirtualDirection) {
    return directionState[direction];
  },

  pressAction(action: VirtualAction) {
    actionPresses[action] += 1;
    actionHandlers.get(action)?.forEach((handler) => handler());
  },

  consumeAction(action: VirtualAction) {
    if (actionPresses[action] === consumedPresses[action]) return false;
    consumedPresses[action] = actionPresses[action];
    return true;
  },

  onAction(action: VirtualAction, handler: ActionHandler) {
    if (!actionHandlers.has(action)) actionHandlers.set(action, new Set());
    actionHandlers.get(action)!.add(handler);
    return () => {
      actionHandlers.get(action)?.delete(handler);
    };
  },

  releaseDirections() {
    directionState.up = false;
    directionState.down = false;
    directionState.left = false;
    directionState.right = false;
  },
};
