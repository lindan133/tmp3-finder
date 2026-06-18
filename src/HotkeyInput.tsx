import { useState } from "react";
import { eventToHotkey, formatHotkey } from "./hotkey";
import { useI18n } from "./i18n/context";

export function HotkeyInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);

  return (
    <button
      type="button"
      className={`hotkey-input${recording ? " recording" : ""}`}
      disabled={disabled}
      onClick={() => setRecording(true)}
      onBlur={() => setRecording(false)}
      onKeyDown={(event) => {
        if (!recording) return;
        event.preventDefault();
        event.stopPropagation();

        if (event.key === "Escape") {
          setRecording(false);
          return;
        }

        const next = eventToHotkey(event);
        if (!next) return;

        onChange(next);
        setRecording(false);
      }}
    >
      {recording ? t("hotkeyRecording") : formatHotkey(value)}
    </button>
  );
}
