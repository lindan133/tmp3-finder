const MODIFIER_KEYS = new Set([
  "Control",
  "Shift",
  "Alt",
  "Meta",
  "CapsLock",
  "Tab",
]);

const KEY_ALIASES: Record<string, string> = {
  " ": "Space",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  Escape: "Esc",
};

export const DEFAULT_HOTKEY = "CommandOrControl+Shift+F";

export function formatHotkey(accelerator: string): string {
  return accelerator
    .split("+")
    .map((part) => {
      if (part === "CommandOrControl") return "Ctrl";
      if (part === "CmdOrCtrl") return "Ctrl";
      return part;
    })
    .join(" + ");
}

export function normalizeHotkey(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed || DEFAULT_HOTKEY;
}

export function eventToHotkey(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): string | null {
  if (MODIFIER_KEYS.has(event.key)) return null;

  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push("CommandOrControl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");

  let key = KEY_ALIASES[event.key] ?? event.key;
  if (key.length === 1) key = key.toUpperCase();

  parts.push(key);
  return parts.join("+");
}
