import { useEffect, type PointerEvent } from "react";
import {
  virtualInput,
  type VirtualAction,
  type VirtualDirection,
} from "../game/input/virtualInput";

type MobileControlsProps = {
  hidden: boolean;
};

type DirectionButtonProps = {
  direction: VirtualDirection;
  className: string;
};

type ActionButtonProps = {
  action: VirtualAction;
  label: string;
  className?: string;
};

function stopPointer(event: PointerEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function DirectionButton({
  direction,
  className,
}: DirectionButtonProps) {
  const press = (event: PointerEvent<HTMLButtonElement>) => {
    stopPointer(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    virtualInput.setDirection(direction, true);
  };

  const release = (event: PointerEvent<HTMLButtonElement>) => {
    stopPointer(event);
    virtualInput.setDirection(direction, false);
  };

  return (
    <button
      type="button"
      aria-label={`Move ${direction}`}
      className={`mobile-control-button ${className}`}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="sr-only">Move {direction}</span>
    </button>
  );
}

function ActionButton({ action, label, className = "" }: ActionButtonProps) {
  const press = (event: PointerEvent<HTMLButtonElement>) => {
    stopPointer(event);
    virtualInput.pressAction(action);
  };

  return (
    <button
      type="button"
      aria-label={label}
      className={`mobile-control-button ${className}`}
      onPointerDown={press}
      onContextMenu={(event) => event.preventDefault()}
    >
      {label}
    </button>
  );
}

export default function MobileControls({ hidden }: MobileControlsProps) {
  useEffect(() => {
    if (hidden) virtualInput.releaseDirections();
  }, [hidden]);

  if (hidden) {
    return null;
  }

  return (
    <div className="mobile-controls" aria-label="Touch controls">
      <div className="mobile-dpad" aria-label="Movement controls">
        <div className="dpad-core" aria-hidden="true" />
        <DirectionButton direction="up" className="dpad-up" />
        <DirectionButton direction="left" className="dpad-left" />
        <DirectionButton direction="right" className="dpad-right" />
        <DirectionButton direction="down" className="dpad-down" />
      </div>

      <div className="mobile-actions" aria-label="Action controls">
        <ActionButton action="music" label="M" className="music-button" />
        <ActionButton action="primary" label="A" className="primary-button" />
        <ActionButton action="back" label="Back" className="back-button" />
      </div>
    </div>
  );
}
