import { useI18n } from "./i18n/context";

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14.5 4.5a7.5 7.5 0 1 0 7 11.8A6.5 6.5 0 1 1 14.5 4.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        fill="currentColor"
        d="M17.2 6.3a.55.55 0 0 1 .78.78l-.9.9a.55.55 0 1 1-.78-.78l.9-.9ZM19.4 9.8a.45.45 0 0 1 .64.64l-.7.7a.45.45 0 1 1-.64-.64l.7-.7ZM18.1 12.9a.35.35 0 0 1 .5.5l-.55.55a.35.35 0 1 1-.5-.5l.55-.55Z"
      />
    </svg>
  );
}

export function ThemeToggle({
  theme,
  onToggle,
  className,
}: {
  theme: "dark" | "light";
  onToggle: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      className={`theme-toggle${className ? ` ${className}` : ""}`}
      onClick={onToggle}
      title={isLight ? t("themeDark") : t("themeLight")}
      aria-label={isLight ? t("themeSwitchToDark") : t("themeSwitchToLight")}
    >
      {isLight ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
