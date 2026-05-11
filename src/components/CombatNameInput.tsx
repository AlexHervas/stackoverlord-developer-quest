import { useEffect, useRef, useState } from "react";
import { eventBus } from "../game/events/events";

type CombatNameInputProps = {
  value: string;
  maxLength: number;
};

export default function CombatNameInput({
  value,
  maxLength,
}: CombatNameInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    eventBus.emit("combat:name-input:ready", undefined);
  }, []);

  const updateDraft = (nextValue: string) => {
    const normalizedValue = nextValue
      .toUpperCase()
      .replace(/[^A-Z0-9 _-]/g, "")
      .slice(0, maxLength);

    setDraft(normalizedValue);
    eventBus.emit("combat:name-input:change", {
      value: normalizedValue,
    });
  };

  return (
    <div className="combat-name-input-wrap">
      <label className="combat-name-input-label" htmlFor="combat-name-input">
        Name
      </label>
      <input
        ref={inputRef}
        id="combat-name-input"
        className="combat-name-input"
        value={draft}
        maxLength={maxLength}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        enterKeyHint="done"
        placeholder={"_".repeat(maxLength)}
        onChange={(event) => updateDraft(event.target.value)}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") {
            event.preventDefault();
            eventBus.emit("combat:name-input:submit", undefined);
            inputRef.current?.blur();
          }
        }}
      />
    </div>
  );
}
