import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AppLanguage,
  AppSettings,
  AutoSearchResult,
  GameData,
  ManualQuestionMode,
  PathCheckResult,
  QuestionMode,
  SearchResult,
  SteamInstall,
} from "./types";
import {
  checkPath,
  copyText,
  fetchConfig,
  fetchSteamInstalls,
  loadGameData,
  pickFolder,
  openExternal,
  saveSettings,
  subscribeFocusSearch,
  subscribeSettingsChanged,
} from "./api";
import { addSearchHistory, clearSearchHistory, getSearchHistory } from "./history";
import { HighlightedText } from "./highlight";
import {
  isExactMatch,
  searchAuto,
  searchFinalRound,
  searchSubjective,
  searchTrivia,
  searchVo,
  stripMarkup,
} from "./search";
import { playMatchSound } from "./sounds";
import { ThemeToggle } from "./ThemeToggle";
import { HotkeyInput } from "./HotkeyInput";
import { DEFAULT_HOTKEY } from "./hotkey";
import { getResultCopyText } from "./result-text";
import { getVoHint } from "./vo-hints";
import { APP_NAME, APP_VERSION } from "./version";
import { I18nProvider, createTranslator, useI18n } from "./i18n/context";

const MODES: QuestionMode[] = [
  "auto",
  "trivia",
  "finalRound",
  "subjective",
  "vo",
];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function Copyable({
  text,
  className,
  query,
}: {
  text: string;
  className?: string;
  query?: string;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      className={`copyable ${className ?? ""} ${copied ? "copied" : ""}`}
      onClick={handleCopy}
      title={t("copyToClipboard")}
    >
      {query ? <HighlightedText text={text} query={query} /> : text}
      {copied && <span className="copied-label">{t("copied")}</span>}
    </button>
  );
}

function TriviaCard({
  result,
  query,
  exact,
}: {
  result: Extract<SearchResult, { type: "trivia" }>;
  query: string;
  exact?: boolean;
}) {
  const { t } = useI18n();
  const { question, correctAnswer } = result;

  return (
    <article className={`card ${exact ? "exact-match" : ""}`}>
      <p className="question">
        <HighlightedText text={question.question} query={query} />
      </p>
      <p className="label">{t("correctAnswer")}</p>
      <Copyable text={correctAnswer} className="answer" query={query} />
      <details>
        <summary>{t("allChoices")}</summary>
        <ul>
          {question.choices.map((c) => (
            <li key={c.text} className={c.correct ? "ok" : ""}>
              {stripMarkup(c.text)}
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

function FinalRoundCard({
  result,
  query,
  exact,
}: {
  result: Extract<SearchResult, { type: "finalRound" }>;
  query: string;
  exact?: boolean;
}) {
  const { t } = useI18n();
  const { question, correctAnswers } = result;

  return (
    <article className={`card ${exact ? "exact-match" : ""}`}>
      <p className="category">
        <HighlightedText text={question.categoryName} query={query} />
      </p>
      <p className="label">{t("correctAnswers")}</p>
      <ul className="answers">
        {correctAnswers.map((a) => (
          <li key={a}>
            <Copyable text={a} query={query} />
          </li>
        ))}
      </ul>
    </article>
  );
}

function SubjectiveCard({
  result,
  query,
  exact,
}: {
  result: Extract<SearchResult, { type: "subjective" }>;
  query: string;
  exact?: boolean;
}) {
  const { t } = useI18n();
  const { question, choices, introLines } = result;

  return (
    <article className={`card ${exact ? "exact-match" : ""}`}>
      {introLines.length > 0 && (
        <p className="hint">
          <HighlightedText text={introLines.join(" / ")} query={query} />
        </p>
      )}
      <p className="question">
        <HighlightedText text={question.question} query={query} />
      </p>
      <p className="note">{t("subjectiveNote")}</p>
      <p className="label">{t("choices")}</p>
      <ul className="options">
        {choices.map((c) => (
          <li key={c}>
            <Copyable text={c} query={query} />
          </li>
        ))}
      </ul>
    </article>
  );
}

function VoCard({
  result,
  query,
  exact,
}: {
  result: Extract<SearchResult, { type: "vo" }>;
  query: string;
  exact?: boolean;
}) {
  const { t, messages } = useI18n();
  const { entry, subtitles, matchedSubtitle } = result;
  const hint = getVoHint(entry.name, messages.voHints);

  return (
    <article className={`card ${exact ? "exact-match" : ""}`}>
      <p className="vo-name">
        <HighlightedText text={entry.name} query={query} />
      </p>
      <p className="meta">ID: {entry.id}</p>
      {hint && <p className="vo-hint">{hint}</p>}
      {matchedSubtitle && (
        <>
          <p className="label">{t("match")}</p>
          <Copyable text={matchedSubtitle} className="vo-match" query={query} />
        </>
      )}
      <p className="label">{t("allVoLines", { count: subtitles.length })}</p>
      <ul className="vo-lines">
        {subtitles.map((line, i) => (
          <li
            key={`${entry.id}-${i}`}
            className={line === matchedSubtitle ? "ok" : ""}
          >
            <HighlightedText text={line} query={query} />
          </li>
        ))}
      </ul>
    </article>
  );
}

function renderResult(
  result: SearchResult,
  query: string,
  exact?: boolean
) {
  switch (result.type) {
    case "trivia":
      return (
        <TriviaCard
          key={result.question.id}
          result={result}
          query={query}
          exact={exact}
        />
      );
    case "finalRound":
      return (
        <FinalRoundCard
          key={result.question.id}
          result={result}
          query={query}
          exact={exact}
        />
      );
    case "subjective":
      return (
        <SubjectiveCard
          key={result.question.id}
          result={result}
          query={query}
          exact={exact}
        />
      );
    case "vo":
      return (
        <VoCard key={result.entry.id} result={result} query={query} exact={exact} />
      );
  }
}

export default function App() {
  const [mode, setMode] = useState<QuestionMode>("auto");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<GameData | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [steamInstalls, setSteamInstalls] = useState<SteamInstall[]>([]);
  const [defaultPath, setDefaultPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pathInput, setPathInput] = useState("");
  const [pathCheck, setPathCheck] = useState<PathCheckResult | null>(null);
  const [history, setHistory] = useState<string[]>(() => getSearchHistory());
  const [hotkeyAssignFailed, setHotkeyAssignFailed] = useState(false);
  const [reloadNotice, setReloadNotice] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastExactRef = useRef("");
  const lastAutoCopyRef = useRef("");

  const debouncedQuery = useDebounce(query, 120);
  const language = settings?.language ?? "en";
  const i18n = useMemo(() => createTranslator(language), [language]);
  const { t, compactMode, placeholder, countLabel, mode: modeLabel } = i18n;

  const formatPathCheck = useCallback(
    (result: PathCheckResult): string[] => {
      const lines: string[] = [];
      if (result.ok) {
        lines.push(t("pathRequiredOk"));
      } else if (result.missingRequired.length > 0) {
        lines.push(
          t("pathMissing", { files: result.missingRequired.join(", ") })
        );
      }
      if (result.missingOptional.length > 0) {
        lines.push(
          t("pathOptionalMissing", {
            files: result.missingOptional.join(", "),
          })
        );
      }
      return lines;
    },
    [t]
  );

  const loadData = useCallback(async (path?: string, forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadGameData(path, forceRefresh));
    } catch {
      setError(createTranslator(settings?.language ?? "en").t("errorLoad"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [settings?.language]);

  useEffect(() => {
    (async () => {
      try {
        const [config, installs] = await Promise.all([
          fetchConfig(),
          fetchSteamInstalls(),
        ]);
        setSettings(config.settings);
        setDefaultPath(config.defaultPath);
        setPathInput(config.contentPath);
        setSteamInstalls(installs);
        setPathCheck(await checkPath(config.contentPath));
        await loadData(config.contentPath);
      } catch {
        setError(createTranslator("en").t("errorInit"));
        setLoading(false);
      }
    })();
  }, [loadData]);

  useEffect(() => {
    inputRef.current?.focus();
    const unsubFocus = subscribeFocusSearch(() => inputRef.current?.focus());
    const unsubSettings = subscribeSettingsChanged((next) => setSettings(next));
    return () => {
      unsubFocus?.();
      unsubSettings?.();
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings?.theme ?? "dark";
  }, [settings?.theme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!showSettings) setReloadNotice(null);
  }, [showSettings]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSettings) {
          setShowSettings(false);
          return;
        }
        if (sidebarOpen) {
          setSidebarOpen(false);
          return;
        }
        setQuery("");
        inputRef.current?.focus();
      }
      const idx = Number(e.key);
      if (e.ctrlKey && idx >= 1 && idx <= 5) {
        e.preventDefault();
        setMode(MODES[idx - 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sidebarOpen, showSettings]);

  const autoResult = useMemo((): AutoSearchResult | null => {
    if (!data || !debouncedQuery.trim() || mode !== "auto") return null;
    return searchAuto(data, debouncedQuery);
  }, [data, debouncedQuery, mode]);

  const manualResults = useMemo((): SearchResult[] => {
    if (!data || !debouncedQuery.trim() || mode === "auto") return [];
    switch (mode) {
      case "trivia":
        return searchTrivia(data, debouncedQuery);
      case "finalRound":
        return searchFinalRound(data, debouncedQuery);
      case "subjective":
        return searchSubjective(data, debouncedQuery);
      case "vo":
        return searchVo(data, debouncedQuery);
      default:
        return [];
    }
  }, [data, debouncedQuery, mode]);

  const activeResults =
    mode === "auto"
      ? autoResult
        ? [autoResult.result]
        : []
      : manualResults;

  const isExact =
    mode === "auto"
      ? Boolean(autoResult?.exact)
      : Boolean(manualResults[0] && isExactMatch(manualResults[0]));

  useEffect(() => {
    if (!debouncedQuery.trim() || activeResults.length === 0) return;
    addSearchHistory(debouncedQuery);
    setHistory(getSearchHistory());
  }, [debouncedQuery, activeResults.length]);

  useEffect(() => {
    if (!settings?.soundOnMatch || !debouncedQuery.trim()) return;
    const key = `${debouncedQuery}:${isExact}`;
    if (isExact && lastExactRef.current !== key) {
      playMatchSound(true);
    }
    lastExactRef.current = key;
  }, [debouncedQuery, isExact, settings?.soundOnMatch]);

  useEffect(() => {
    if (!settings?.autoCopyOnMatch || !isExact || !debouncedQuery.trim()) return;
    const result = activeResults[0];
    if (!result) return;

    const text = getResultCopyText(result);
    if (!text) return;

    const key = `${debouncedQuery}:${text}`;
    if (lastAutoCopyRef.current === key) return;

    lastAutoCopyRef.current = key;
    void copyText(text).then(() => {
      setCopiedNotice(true);
      window.setTimeout(() => setCopiedNotice(false), 1400);
    });
  }, [
    settings?.autoCopyOnMatch,
    isExact,
    debouncedQuery,
    activeResults,
  ]);

  const handlePathChange = async (nextPath: string) => {
    setPathInput(nextPath);
    setPathCheck(await checkPath(nextPath));
  };

  const handleBrowse = async () => {
    const folder = await pickFolder();
    if (folder) await handlePathChange(folder);
  };

  const handleSavePath = async () => {
    const check = await checkPath(pathInput);
    setPathCheck(check);
    if (!check.ok) {
      setError(t("errorPathInvalid"));
      return;
    }
    const next = await saveSettings({ contentPath: pathInput });
    setSettings(next);
    setShowSettings(false);
    setError(null);
    await loadData(pathInput);
  };

  const handleSettingToggle = async (
    key: keyof Pick<
      AppSettings,
      "alwaysOnTop" | "soundOnMatch" | "autoCopyOnMatch"
    >,
    value: boolean
  ) => {
    const next = await saveSettings({ [key]: value });
    setSettings(next);
  };

  const handleHotkeyChange = async (hotkey: string) => {
    const result = (await saveSettings({ hotkey })) as AppSettings & {
      hotkeyAssignFailed?: boolean;
    };
    if (result.hotkeyAssignFailed) {
      setHotkeyAssignFailed(true);
      return;
    }
    setHotkeyAssignFailed(false);
    setSettings(result);
  };

  const handleLanguageChange = async (nextLanguage: AppLanguage) => {
    const next = await saveSettings({ language: nextLanguage });
    setSettings(next);
  };

  const handleReloadData = async () => {
    setError(null);
    setReloadNotice(null);
    try {
      await loadData(pathInput || settings?.contentPath, true);
      setReloadNotice(t("databaseUpdated"));
    } catch {
      setReloadNotice(null);
    }
  };

  const handleThemeToggle = async () => {
    const nextTheme = settings?.theme === "light" ? "dark" : "light";
    const next = await saveSettings({ theme: nextTheme });
    setSettings(next);
  };

  const handleSteamInstall = async (install: SteamInstall) => {
    setPathInput(install.contentPath);
    const check = await checkPath(install.contentPath);
    setPathCheck(check);
    if (!check.ok) return;
    const next = await saveSettings({ contentPath: install.contentPath });
    setSettings(next);
    setError(null);
    await loadData(install.contentPath);
  };

  const handleModeSelect = (nextMode: QuestionMode) => {
    setMode(nextMode);
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  const countMode: ManualQuestionMode =
    mode === "auto" ? (autoResult?.mode ?? "trivia") : mode;
  const modeCount = data ? data.counts[countMode] : 0;
  const editionLabel =
    data?.loadInfo.edition === "full" ? t("editionFull") : t("editionDemo");

  return (
    <I18nProvider language={language}>
    <div className={`app compact${showSettings ? " settings-open" : ""}`}>
      <header>
        {sidebarOpen && (
          <>
            <button
              type="button"
              className="sidebar-overlay"
              aria-label={t("closeMenu")}
              onClick={() => setSidebarOpen(false)}
            />
            <nav className="sidebar" aria-label={t("menu")}>
              <div
                className="sidebar-brand"
                onCopy={(e) => e.preventDefault()}
              >
                Finder
              </div>
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`sidebar-item${mode === m ? " active" : ""}`}
                  onClick={() => handleModeSelect(m)}
                >
                  {compactMode(m)}
                </button>
              ))}
              <div className="sidebar-footer">
                <button
                  type="button"
                  className={`sidebar-item${showSettings ? " active" : ""}`}
                  onClick={() => {
                    setShowSettings(true);
                    setSidebarOpen(false);
                  }}
                >
                  {t("settings")}
                </button>
              </div>
            </nav>
          </>
        )}

        <div className="compact-mode-bar">
          <button
            type="button"
            className="compact-menu-btn"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-expanded={sidebarOpen}
            aria-label={t("menu")}
          >
            <span className="burger-icon" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
          <span className="compact-mode-title">{compactMode(mode)}</span>
          <button
            type="button"
            className={`compact-pin-btn${settings?.alwaysOnTop ? " active" : ""}`}
            onClick={() =>
              handleSettingToggle("alwaysOnTop", !settings?.alwaysOnTop)
            }
            title={t("alwaysOnTop")}
          >
            {t("pin")}
          </button>
          <ThemeToggle
            theme={settings?.theme ?? "dark"}
            onToggle={() => void handleThemeToggle()}
            className="compact-theme-toggle"
          />
        </div>

        {showSettings && (
          <div className="settings">
            <div className="settings-header">
              <p className="settings-title">{t("settingsTitle")}</p>
              <button
                type="button"
                className="settings-close"
                onClick={() => setShowSettings(false)}
                aria-label={t("closeSettings")}
              >
                ×
              </button>
            </div>

            <p className="settings-section">{t("language")}</p>
            <div className="language-row">
              <button
                type="button"
                className={`btn btn-secondary${language === "en" ? " active" : ""}`}
                onClick={() => void handleLanguageChange("en")}
              >
                {t("languageEnglish")}
              </button>
              <button
                type="button"
                className={`btn btn-secondary${language === "ru" ? " active" : ""}`}
                onClick={() => void handleLanguageChange("ru")}
              >
                {t("languageRussian")}
              </button>
            </div>

            <p className="settings-section">{t("steamInstalls")}</p>
            {steamInstalls.length > 0 ? (
              <div className="install-list">
                {steamInstalls.map((install) => (
                  <button
                    key={install.contentPath}
                    type="button"
                    className={`btn btn-secondary install-btn${
                      pathInput === install.contentPath ? " active" : ""
                    }`}
                    onClick={() => handleSteamInstall(install)}
                  >
                    {install.edition === "full"
                      ? t("editionFull")
                      : t("editionDemo")}
                  </button>
                ))}
              </div>
            ) : (
              <p className="settings-note">{t("steamNotFound")}</p>
            )}

            <label>{t("contentPath")}</label>
            <div className="path-row">
              <input
                value={pathInput}
                onChange={(e) => handlePathChange(e.target.value)}
              />
              <button type="button" className="btn btn-secondary" onClick={handleBrowse}>
                {t("browse")}
              </button>
            </div>
            {pathCheck && (
              <ul className="path-check">
                {formatPathCheck(pathCheck).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}

            <label className="checkbox">
              <input
                type="checkbox"
                checked={settings?.soundOnMatch ?? true}
                onChange={(e) =>
                  handleSettingToggle("soundOnMatch", e.target.checked)
                }
              />
              {t("soundOnMatch")}
            </label>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={settings?.autoCopyOnMatch ?? false}
                onChange={(e) =>
                  handleSettingToggle("autoCopyOnMatch", e.target.checked)
                }
              />
              {t("autoCopyOnMatch")}
            </label>

            <p className="settings-section">{t("hotkeys")}</p>
            <label>{t("globalHotkey")}</label>
            <HotkeyInput
              value={settings?.hotkey ?? DEFAULT_HOTKEY}
              onChange={(hotkey) => void handleHotkeyChange(hotkey)}
            />
            {hotkeyAssignFailed && (
              <p className="settings-error">{t("hotkeyAssignFailed")}</p>
            )}
            <p className="settings-note">{t("hotkeyHint")}</p>

            <p className="settings-section">{t("database")}</p>
            <button
              type="button"
              className="btn btn-secondary settings-reload"
              onClick={() => void handleReloadData()}
              disabled={loading}
            >
              {loading ? t("loading") : t("reloadDatabase")}
            </button>
            {reloadNotice && (
              <p className="settings-success">{reloadNotice}</p>
            )}
            {loading && showSettings && !reloadNotice && (
              <p className="settings-note">{t("reloadingJson")}</p>
            )}
            <p className="settings-note">{t("reloadHint")}</p>

            <div className="row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handlePathChange(defaultPath)}
              >
                {t("bestSteamPath")}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSavePath}>
                {t("save")}
              </button>
            </div>

            <div className="settings-about">
              <p>
                {APP_NAME} v{APP_VERSION}
              </p>
              <p>{t("aboutDisclaimer")}</p>
            </div>
          </div>
        )}

        {!showSettings && (
          <>
            <input
              ref={inputRef}
              className="search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder(mode)}
              autoComplete="off"
              spellCheck={false}
            />

            {history.length > 0 && (
              <div className="history">
                {history.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="btn btn-secondary history-item"
                    onClick={() => setQuery(item)}
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  className="history-clear"
                  onClick={() => {
                    clearSearchHistory();
                    setHistory([]);
                  }}
                >
                  ×
                </button>
              </div>
            )}

            <div className="status">
              {loading && <span>{t("loadingStatus")}</span>}
              {!loading && error && <span className="err">{error}</span>}
              {!loading && !error && data && (
                <>
                  <span className="ok-dot" />
                  <span>
                    {editionLabel} · {t("inDatabase")} {modeCount}{" "}
                    {countLabel(countMode)}
                    {data.loadInfo.fromCache && (
                      <span className="cache-badge"> · {t("cache")}</span>
                    )}
                  </span>
                </>
              )}
              {!loading && debouncedQuery.trim() && (
                <span className="search-status">
                  {activeResults.length > 0 ? (
                    <>
                      {t("foundCount", { count: activeResults.length })}
                      {mode === "auto" && autoResult && (
                        <>
                          {" "}
                          · {t("modeLabel")}: {modeLabel(autoResult.mode)}
                        </>
                      )}
                      {isExact && (
                        <span className="exact-badge">{t("exactMatch")}</span>
                      )}
                      {copiedNotice && (
                        <span className="copy-badge">{t("copiedBadge")}</span>
                      )}
                    </>
                  ) : (
                    t("nothingFound")
                  )}
                </span>
              )}
            </div>

            {!loading && data?.loadInfo.warnings.length ? (
              <ul className="warnings">
                {data.loadInfo.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </header>

      {!showSettings && (
        <main>
          {mode === "auto" && autoResult && (
            <p className="auto-detected">
              {t("autoModeDetected", { mode: modeLabel(autoResult.mode) })}
            </p>
          )}
          {activeResults.map((r) =>
            renderResult(r, debouncedQuery, isExact)
          )}
        </main>
      )}

      {!showSettings && (
        <footer className="app-footer">
        <p>
          Made with <span aria-hidden>❤️</span> by the{" "}
          <a
            href="https://kankstudio.ru/"
            onClick={(e) => {
              e.preventDefault();
              void openExternal("https://kankstudio.ru/");
            }}
          >
            kankstudio.ru
          </a>
        </p>
      </footer>
      )}
    </div>
    </I18nProvider>
  );
}
