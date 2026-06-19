import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AppLanguage,
  AppSettings,
  CopyFormat,
  GameData,
  PathCheckResult,
  QuestionMode,
  SearchResult,
  TriviaDifficultyFilter,
  UpdateInfo,
} from "./types";
import {
  checkPath,
  checkDatabaseStale,
  checkForUpdates,
  copyText,
  fetchConfig,
  installUpdate,
  loadGameData,
  pickFolder,
  openExternal,
  saveSettings,
  subscribeFocusSearch,
  subscribeReloadDatabase,
  subscribeSettingsChanged,
  subscribeWindowFocus,
} from "./api";
import { HighlightedText } from "./highlight";
import {
  findSuggestedMode,
  getMatchConfidence,
  isExactMatch,
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
import { getResultCopyText, type CopyOptions } from "./result-text";
import { getVoHint } from "./vo-hints";
import { APP_NAME, APP_VERSION } from "./version";
import { I18nProvider, createTranslator, useI18n } from "./i18n/context";
import { Onboarding } from "./Onboarding";

const MODES: QuestionMode[] = [
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

function shouldIgnoreCardClick(target: EventTarget | null): boolean {
  return Boolean(
    target instanceof HTMLElement &&
      target.closest(".copyable, details, summary, button, a")
  );
}

function MatchBadge({
  exact,
  confidence,
}: {
  exact?: boolean;
  confidence: number;
}) {
  const { t } = useI18n();
  return (
    <div className="card-badges">
      <span className={`match-badge${exact ? " exact" : " fuzzy"}`}>
        {exact ? t("exactMatch") : t("fuzzyMatch")}
      </span>
      <span className="confidence-badge">
        {t("matchConfidence", { value: confidence })}
      </span>
    </div>
  );
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
  onCopy,
}: {
  result: Extract<SearchResult, { type: "trivia" }>;
  query: string;
  exact?: boolean;
  onCopy: () => void;
}) {
  const { t } = useI18n();
  const { question, correctAnswer } = result;

  return (
    <article
      className={`card card-clickable ${exact ? "exact-match" : "fuzzy-match"}`}
      title={t("clickToCopyCard")}
      onClick={(e) => {
        if (shouldIgnoreCardClick(e.target)) return;
        onCopy();
      }}
    >
      <div className="card-head">
        <MatchBadge exact={exact} confidence={getMatchConfidence(result)} />
      </div>
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
  onCopy,
}: {
  result: Extract<SearchResult, { type: "finalRound" }>;
  query: string;
  exact?: boolean;
  onCopy: () => void;
}) {
  const { t } = useI18n();
  const { question, correctAnswers, matchedAnswers, isItemSearch } = result;

  return (
    <article
      className={`card card-clickable ${exact ? "exact-match" : "fuzzy-match"}`}
      title={t("clickToCopyCard")}
      onClick={(e) => {
        if (shouldIgnoreCardClick(e.target)) return;
        onCopy();
      }}
    >
      <div className="card-head">
        <MatchBadge exact={exact} confidence={getMatchConfidence(result)} />
      </div>
      <p className="category">
        <HighlightedText text={question.categoryName} query={query} />
      </p>
      <p className="label">
        {isItemSearch ? t("matchedAnswer") : t("correctAnswers")}
      </p>
      <ul className="answers">
        {correctAnswers.map((a) => (
          <li
            key={a}
            className={
              matchedAnswers.includes(a) || isItemSearch
                ? "matched-answer"
                : undefined
            }
          >
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
  onCopy,
}: {
  result: Extract<SearchResult, { type: "subjective" }>;
  query: string;
  exact?: boolean;
  onCopy: () => void;
}) {
  const { t } = useI18n();
  const { question, choices, introLines, matchedChoice } = result;

  return (
    <article
      className={`card card-clickable ${exact ? "exact-match" : "fuzzy-match"}`}
      title={t("clickToCopyCard")}
      onClick={(e) => {
        if (shouldIgnoreCardClick(e.target)) return;
        onCopy();
      }}
    >
      <div className="card-head">
        <MatchBadge exact={exact} confidence={getMatchConfidence(result)} />
      </div>
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
          <li key={c} className={c === matchedChoice ? "matched-answer" : undefined}>
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
  onCopy,
}: {
  result: Extract<SearchResult, { type: "vo" }>;
  query: string;
  exact?: boolean;
  onCopy: () => void;
}) {
  const { t, messages } = useI18n();
  const { entry, subtitles, matchedSubtitle } = result;
  const hint = getVoHint(entry.name, messages.voHints);

  return (
    <article
      className={`card card-clickable ${exact ? "exact-match" : "fuzzy-match"}`}
      title={t("clickToCopyCard")}
      onClick={(e) => {
        if (shouldIgnoreCardClick(e.target)) return;
        onCopy();
      }}
    >
      <div className="card-head">
        <MatchBadge exact={exact} confidence={getMatchConfidence(result)} />
      </div>
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
  exact: boolean | undefined,
  onCopy: () => void
) {
  switch (result.type) {
    case "trivia":
      return (
        <TriviaCard
          key={result.question.id}
          result={result}
          query={query}
          exact={exact}
          onCopy={onCopy}
        />
      );
    case "finalRound":
      return (
        <FinalRoundCard
          key={result.question.id}
          result={result}
          query={query}
          exact={exact}
          onCopy={onCopy}
        />
      );
    case "subjective":
      return (
        <SubjectiveCard
          key={result.question.id}
          result={result}
          query={query}
          exact={exact}
          onCopy={onCopy}
        />
      );
    case "vo":
      return (
        <VoCard
          key={result.entry.id}
          result={result}
          query={query}
          exact={exact}
          onCopy={onCopy}
        />
      );
  }
}

export default function App() {
  const [mode, setMode] = useState<QuestionMode>("trivia");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<GameData | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [defaultPath, setDefaultPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pathInput, setPathInput] = useState("");
  const [pathCheck, setPathCheck] = useState<PathCheckResult | null>(null);
  const [hotkeyAssignFailed, setHotkeyAssignFailed] = useState(false);
  const [reloadNotice, setReloadNotice] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [databaseStale, setDatabaseStale] = useState(false);
  const [loadedFingerprint, setLoadedFingerprint] = useState<string | null>(null);
  const [footerOpen, setFooterOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "checking" | "available" | "current" | "error" | "installing"
  >("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const lastExactRef = useRef("");
  const lastAutoCopyRef = useRef("");
  const savedContentPathRef = useRef("");
  const reloadNoticeTimerRef = useRef<number | null>(null);
  const loadingRef = useRef(false);

  const debouncedQuery = useDebounce(query, 120);
  const debouncedPathInput = useDebounce(pathInput, 400);
  const language = settings?.language ?? "en";
  const i18n = useMemo(() => createTranslator(language), [language]);
  const { t, compactMode, placeholder, countLabel } = i18n;

  const searchOptions = useMemo(
    () => ({
      triviaDifficulty: (settings?.triviaDifficultyFilter ??
        "all") as TriviaDifficultyFilter,
    }),
    [settings?.triviaDifficultyFilter]
  );

  const copyOptions: CopyOptions = useMemo(
    () => ({
      copyFormat: settings?.copyFormat ?? "answerOnly",
      voCopyFullLine: settings?.voCopyFullLine ?? true,
    }),
    [settings?.copyFormat, settings?.voCopyFullLine]
  );

  const persistMode = useCallback((nextMode: QuestionMode) => {
    setMode(nextMode);
    void saveSettings({ lastMode: nextMode });
  }, []);

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
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const nextData = await loadGameData(path, forceRefresh);
      setData(nextData);
      setLoadedFingerprint(nextData.loadInfo.fingerprint ?? null);
      setDatabaseStale(false);
    } catch {
      setError(createTranslator(settings?.language ?? "en").t("errorLoad"));
      setData(null);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [settings?.language]);

  const runStaleCheck = useCallback(
    async (contentPath?: string, fingerprint?: string | null) => {
      const path = contentPath || settings?.contentPath;
      const currentFingerprint = fingerprint ?? loadedFingerprint;
      if (!path || !currentFingerprint) {
        setDatabaseStale(false);
        return;
      }
      const result = await checkDatabaseStale(path, currentFingerprint);
      setDatabaseStale(result.stale);
      if (result.fingerprint && !result.stale) {
        setLoadedFingerprint(result.fingerprint);
      }
    },
    [settings?.contentPath, loadedFingerprint]
  );

  const applyContentPath = useCallback(
    async (path: string) => {
      if (!path || path === savedContentPathRef.current) return;

      const check = await checkPath(path);
      setPathCheck(check);
      if (!check.ok) return;

      savedContentPathRef.current = path;
      const next = await saveSettings({ contentPath: path });
      setSettings(next);
      setPathInput(path);
      setError(null);
      await loadData(path);
    },
    [loadData]
  );

  useEffect(() => {
    (async () => {
      try {
        const config = await fetchConfig();
        setSettings(config.settings);
        if (
          config.settings.lastMode &&
          MODES.includes(config.settings.lastMode)
        ) {
          setMode(config.settings.lastMode);
        }
        setDefaultPath(config.defaultPath);
        setPathInput(config.contentPath);
        savedContentPathRef.current = config.contentPath;
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
    const unsubFocus = subscribeFocusSearch(() => {
      inputRef.current?.focus();
      void runStaleCheck();
    });
    const unsubWindowFocus = subscribeWindowFocus(() => {
      void runStaleCheck();
    });
    const unsubSettings = subscribeSettingsChanged((next) => setSettings(next));
    return () => {
      unsubFocus?.();
      unsubWindowFocus?.();
      unsubSettings?.();
    };
  }, [runStaleCheck]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings?.theme ?? "dark";
    const opacity =
      settings?.alwaysOnTop && settings.windowOpacity
        ? settings.windowOpacity / 100
        : 1;
    document.documentElement.style.setProperty(
      "--window-opacity",
      String(opacity)
    );
  }, [settings?.theme, settings?.alwaysOnTop, settings?.windowOpacity]);

  useEffect(() => {
    if (!settings?.autoCheckUpdates) return;
    void checkForUpdates()
      .then((info) => {
        if (info.updateAvailable) {
          setUpdateInfo(info);
          setUpdateStatus("available");
        }
      })
      .catch(() => {
        /* ignore startup check errors */
      });
  }, [settings?.autoCheckUpdates]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!debouncedPathInput.trim()) {
      setPathCheck(null);
      return;
    }
    void checkPath(debouncedPathInput).then(setPathCheck);
  }, [debouncedPathInput]);

  useEffect(() => {
    if (!pathCheck?.ok) return;
    if (pathCheck.contentPath === savedContentPathRef.current) return;
    void applyContentPath(pathCheck.contentPath);
  }, [pathCheck, applyContentPath]);

  const handleReloadData = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    setError(null);
    setReloadNotice(null);
    setDatabaseStale(false);
    try {
      await loadData(pathInput || settings?.contentPath, true);
      setReloadNotice(t("databaseUpdated"));
      if (reloadNoticeTimerRef.current) {
        window.clearTimeout(reloadNoticeTimerRef.current);
      }
      reloadNoticeTimerRef.current = window.setTimeout(() => {
        setReloadNotice(null);
        reloadNoticeTimerRef.current = null;
      }, 2500);
    } catch {
      setReloadNotice(null);
    }
  }, [loadData, pathInput, settings?.contentPath, t]);

  useEffect(() => {
    const unsubReload = subscribeReloadDatabase(() => {
      void handleReloadData();
    });
    return () => {
      unsubReload?.();
      if (reloadNoticeTimerRef.current) {
        window.clearTimeout(reloadNoticeTimerRef.current);
      }
    };
  }, [handleReloadData]);

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
      if (e.ctrlKey && idx >= 1 && idx <= 4) {
        e.preventDefault();
        persistMode(MODES[idx - 1]);
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.key.toLowerCase() === "r"
      ) {
        e.preventDefault();
        void handleReloadData();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sidebarOpen, showSettings, handleReloadData, persistMode]);

  const activeResults = useMemo((): SearchResult[] => {
    if (!data || !debouncedQuery.trim()) return [];
    switch (mode) {
      case "trivia":
        return searchTrivia(data, debouncedQuery, undefined, searchOptions);
      case "finalRound":
        return searchFinalRound(data, debouncedQuery);
      case "subjective":
        return searchSubjective(data, debouncedQuery);
      case "vo":
        return searchVo(data, debouncedQuery);
    }
  }, [data, debouncedQuery, mode, searchOptions]);

  const suggestedMode = useMemo(() => {
    if (!data || !debouncedQuery.trim()) return null;
    return findSuggestedMode(data, debouncedQuery, mode, searchOptions);
  }, [data, debouncedQuery, mode, searchOptions]);

  const isExact = Boolean(activeResults[0] && isExactMatch(activeResults[0]));

  const copyTopResult = useCallback(async () => {
    const result = activeResults[0];
    if (!result) return;
    const text = getResultCopyText(result, copyOptions);
    if (!text) return;
    await copyText(text);
    setCopiedNotice(true);
    window.setTimeout(() => setCopiedNotice(false), 1400);
  }, [activeResults, copyOptions]);

  const copyResult = useCallback(async (result: SearchResult) => {
    const text = getResultCopyText(result, copyOptions);
    if (!text) return;
    await copyText(text);
    setCopiedNotice(true);
    window.setTimeout(() => setCopiedNotice(false), 1400);
  }, [copyOptions]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !e.ctrlKey || showSettings) return;
      if (activeResults.length === 0) return;
      e.preventDefault();
      void copyTopResult();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showSettings, activeResults.length, copyTopResult]);

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

    const text = getResultCopyText(result, copyOptions);
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
    copyOptions,
  ]);

  const handlePathInput = (value: string) => {
    setPathInput(value);
  };

  const handleBrowse = async () => {
    const folder = await pickFolder();
    if (folder) handlePathInput(folder);
  };

  const handleCompleteOnboarding = async () => {
    const next = await saveSettings({ onboardingComplete: true });
    setSettings(next);
  };

  const handleSettingToggle = async (
    key: keyof Pick<
      AppSettings,
      | "alwaysOnTop"
      | "soundOnMatch"
      | "autoCopyOnMatch"
      | "minimizeToTray"
      | "startWithWindows"
      | "voCopyFullLine"
      | "autoCheckUpdates"
    >,
    value: boolean
  ) => {
    const next = await saveSettings({ [key]: value });
    setSettings(next);
  };

  const handleSettingValue = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const next = await saveSettings({ [key]: value });
    setSettings(next);
  };

  const handleCheckUpdates = async () => {
    setUpdateStatus("checking");
    try {
      const info = await checkForUpdates();
      setUpdateInfo(info);
      setUpdateStatus(info.updateAvailable ? "available" : "current");
    } catch {
      setUpdateStatus("error");
    }
  };

  const handleInstallUpdate = async () => {
    setUpdateStatus("installing");
    try {
      await installUpdate();
    } catch {
      setUpdateStatus("available");
    }
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

  const handleThemeToggle = async () => {
    const nextTheme = settings?.theme === "light" ? "dark" : "light";
    const next = await saveSettings({ theme: nextTheme });
    setSettings(next);
  };

  const handleModeSelect = (nextMode: QuestionMode) => {
    persistMode(nextMode);
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  const modeCount = data ? data.counts[mode] : 0;
  const editionLabel =
    data?.loadInfo.edition === "full" ? t("editionFull") : t("editionDemo");
  const showOnboarding = Boolean(settings && !settings.onboardingComplete);

  return (
    <I18nProvider language={language}>
    <div className={`app compact${showSettings ? " settings-open" : ""}`}>
      {showOnboarding && (
        <Onboarding
          pathInput={pathInput}
          pathCheck={pathCheck}
          onPathInput={handlePathInput}
          onBrowse={() => void handleBrowse()}
          onUseDefaultPath={() => handlePathInput(defaultPath)}
          onComplete={() => void handleCompleteOnboarding()}
          loading={loading}
        />
      )}
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
                <p className="sidebar-hotkeys">{t("modeHotkeysHint")}</p>
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
          <span className="compact-hotkeys" title={t("modeHotkeysHint")}>
            Ctrl+1–4
          </span>
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

            <label>{t("contentPath")}</label>
            <div className="path-row">
              <input
                value={pathInput}
                onChange={(e) => handlePathInput(e.target.value)}
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

            <p className="settings-section">{t("copyFormat")}</p>
            <select
              className="settings-select"
              value={settings?.copyFormat ?? "answerOnly"}
              onChange={(e) =>
                void handleSettingValue(
                  "copyFormat",
                  e.target.value as CopyFormat
                )
              }
            >
              <option value="answerOnly">{t("copyFormatAnswerOnly")}</option>
              <option value="questionAndAnswer">
                {t("copyFormatQuestionAndAnswer")}
              </option>
            </select>

            <label>{t("triviaDifficulty")}</label>
            <select
              className="settings-select"
              value={settings?.triviaDifficultyFilter ?? "all"}
              onChange={(e) =>
                void handleSettingValue(
                  "triviaDifficultyFilter",
                  e.target.value as TriviaDifficultyFilter
                )
              }
            >
              <option value="all">{t("difficultyAll")}</option>
              <option value="easy">{t("difficultyEasy")}</option>
              <option value="medium">{t("difficultyMedium")}</option>
              <option value="hard">{t("difficultyHard")}</option>
            </select>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={settings?.voCopyFullLine ?? true}
                onChange={(e) =>
                  handleSettingToggle("voCopyFullLine", e.target.checked)
                }
              />
              {t("voCopyFullLine")}
            </label>

            <p className="settings-section">{t("windowBehavior")}</p>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={settings?.minimizeToTray ?? false}
                onChange={(e) =>
                  handleSettingToggle("minimizeToTray", e.target.checked)
                }
              />
              {t("minimizeToTray")}
            </label>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={settings?.startWithWindows ?? false}
                onChange={(e) =>
                  handleSettingToggle("startWithWindows", e.target.checked)
                }
              />
              {t("startWithWindows")}
            </label>

            <label>
              {t("windowOpacity", {
                value: settings?.windowOpacity ?? 100,
              })}
            </label>
            <input
              type="range"
              className="settings-range"
              min={70}
              max={100}
              step={1}
              value={settings?.windowOpacity ?? 100}
              onChange={(e) =>
                void handleSettingValue(
                  "windowOpacity",
                  Number(e.target.value)
                )
              }
            />
            <p className="settings-note">{t("windowOpacityHint")}</p>

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

            <p className="settings-section">{t("updates")}</p>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={settings?.autoCheckUpdates ?? true}
                onChange={(e) =>
                  handleSettingToggle("autoCheckUpdates", e.target.checked)
                }
              />
              {t("autoCheckUpdates")}
            </label>
            <button
              type="button"
              className="btn btn-secondary settings-reload"
              onClick={() => void handleCheckUpdates()}
              disabled={updateStatus === "checking"}
            >
              {updateStatus === "checking"
                ? t("checkingUpdates")
                : t("checkForUpdates")}
            </button>
            {updateStatus === "available" && updateInfo?.latestVersion && (
              <p className="settings-success">
                {t("updateAvailable", { version: updateInfo.latestVersion })}
              </p>
            )}
            {updateStatus === "current" && (
              <p className="settings-note">{t("updateUpToDate")}</p>
            )}
            {updateStatus === "error" && (
              <p className="settings-error">{t("updateCheckFailed")}</p>
            )}
            {updateInfo?.updateAvailable && (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleInstallUpdate()}
                  disabled={updateStatus === "installing"}
                >
                  {updateStatus === "installing"
                    ? t("installingUpdate")
                    : t("installUpdate")}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void openExternal(updateInfo.releaseUrl)}
                >
                  {t("openRelease")}
                </button>
              </>
            )}

            <div className="row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handlePathInput(defaultPath)}
              >
                {t("bestSteamPath")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowSettings(false)}
              >
                {t("done")}
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && activeResults.length > 0) {
                  e.preventDefault();
                  void copyTopResult();
                }
              }}
              placeholder={placeholder(mode)}
              title={`${t("enterToCopy")} · ${t("reloadHotkeyHint")}`}
              autoComplete="off"
              spellCheck={false}
            />

            {databaseStale && (
              <div className="stale-banner">
                <span>{t("databaseStale")}</span>
                <button
                  type="button"
                  className="btn btn-secondary stale-reload-btn"
                  onClick={() => void handleReloadData()}
                  disabled={loading}
                >
                  {t("databaseStaleReload")}
                </button>
              </div>
            )}

            {(updateStatus === "available" || updateStatus === "installing") &&
              updateInfo?.latestVersion && (
              <div className="update-banner">
                <span>
                  {t("updateAvailable", { version: updateInfo.latestVersion })}
                </span>
                <div className="update-banner-actions">
                  <button
                    type="button"
                    className="btn btn-primary stale-reload-btn"
                    onClick={() => void handleInstallUpdate()}
                    disabled={updateStatus === "installing"}
                  >
                    {updateStatus === "installing"
                      ? t("installingUpdate")
                      : t("installUpdate")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary stale-reload-btn"
                    onClick={() => void openExternal(updateInfo.releaseUrl)}
                  >
                    {t("openRelease")}
                  </button>
                </div>
              </div>
            )}

            <div className="status">
              {loading && (
                <span>{showSettings ? t("reloadingJson") : t("loadingStatus")}</span>
              )}
              {!loading && error && <span className="err">{error}</span>}
              {!loading && !error && reloadNotice && (
                <span className="reload-notice">{reloadNotice}</span>
              )}
              {!loading && !error && data && (
                <>
                  <span className="ok-dot" />
                  <span>
                    {editionLabel} · {t("inDatabase")} {modeCount}{" "}
                    {countLabel(mode)}
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
                      {isExact ? (
                        <span className="exact-badge">{t("exactMatch")}</span>
                      ) : (
                        <span className="fuzzy-badge">{t("fuzzyMatch")}</span>
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
          {suggestedMode && (
            <div className="mode-hint-banner">
              <span>
                {t("tryOtherMode", {
                  mode: compactMode(suggestedMode.mode),
                  confidence: suggestedMode.confidence,
                  hotkey: suggestedMode.hotkey,
                })}
              </span>
              <button
                type="button"
                className="btn btn-secondary mode-hint-btn"
                onClick={() => persistMode(suggestedMode.mode)}
              >
                {compactMode(suggestedMode.mode)}
              </button>
            </div>
          )}
          {activeResults.map((r) =>
            renderResult(r, debouncedQuery, isExactMatch(r), () => void copyResult(r))
          )}
        </main>
      )}

      {!showSettings && footerOpen && (
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

      {!showSettings && (
        <button
          type="button"
          className="footer-toggle"
          onClick={() => setFooterOpen((open) => !open)}
        >
          {footerOpen ? t("footerHide") : t("footerShow")}
        </button>
      )}
    </div>
    </I18nProvider>
  );
}
