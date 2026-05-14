import { useEffect, useRef, useState, type PointerEvent } from "react";
import { virtualInput, type VirtualAction } from "../game/input/virtualInput";

const JOYSTICK_RADIUS = 54;
const JOYSTICK_DEADZONE = 8;

type MobileControlsProps = {
  hidden: boolean;
};

type ActionButtonProps = {
  action: VirtualAction;
  label: string;
  className?: string;
};

function stopPointer(event: PointerEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
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

function VirtualJoystick() {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const [thumbPosition, setThumbPosition] = useState({ x: 0, y: 0 });

  const updateJoystick = (event: PointerEvent<HTMLDivElement>) => {
    const base = baseRef.current;
    if (!base) return;

    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rawX = event.clientX - centerX;
    const rawY = event.clientY - centerY;
    const distance = Math.hypot(rawX, rawY);
    const clampedDistance = Math.min(distance, JOYSTICK_RADIUS);
    const angle = Math.atan2(rawY, rawX);
    const x = distance === 0 ? 0 : Math.cos(angle) * clampedDistance;
    const y = distance === 0 ? 0 : Math.sin(angle) * clampedDistance;

    setThumbPosition({ x, y });

    if (clampedDistance < JOYSTICK_DEADZONE) {
      virtualInput.setMoveVector(0, 0);
      return;
    }

    virtualInput.setMoveVector(x / JOYSTICK_RADIUS, y / JOYSTICK_RADIUS);
  };

  const releaseJoystick = (event: PointerEvent<HTMLDivElement>) => {
    stopPointer(event);

    if (activePointerId.current === event.pointerId) {
      activePointerId.current = null;
    }

    setThumbPosition({ x: 0, y: 0 });
    virtualInput.setMoveVector(0, 0);
  };

  return (
    <div
      ref={baseRef}
      className="mobile-joystick"
      aria-label="Movement joystick"
      role="application"
      onPointerDown={(event) => {
        stopPointer(event);
        activePointerId.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        updateJoystick(event);
      }}
      onPointerMove={(event) => {
        if (activePointerId.current !== event.pointerId) return;
        stopPointer(event);
        updateJoystick(event);
      }}
      onPointerUp={releaseJoystick}
      onPointerCancel={releaseJoystick}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        className="mobile-joystick-thumb"
        style={{
          transform: `translate(${thumbPosition.x}px, ${thumbPosition.y}px)`,
        }}
      />
    </div>
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
      <VirtualJoystick />
      <ActionButton action="back" label="Back" className="back-button" />

      <div className="mobile-actions" aria-label="Action controls">
        <ActionButton action="pause" label="P" className="pause-button" />
        <ActionButton action="music" label="M" className="music-button" />
        <ActionButton action="primary" label="A" className="primary-button" />
      </div>
    </div>
  );
}
