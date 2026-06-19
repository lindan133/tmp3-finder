import { readFile, access, writeFile, mkdir, stat, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { getBestSteamPath } from "./steam-paths.mjs";

export const DEFAULT_CONTENT_PATH =
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Trivia Murder Party 3 Demo\\TMP3\\Content\\TMP3\\LooseData\\Content";

export const DEFAULT_HOTKEY = "CommandOrControl+Shift+F";

const DEFAULT_SETTINGS = {
  contentPath: DEFAULT_CONTENT_PATH,
  alwaysOnTop: false,
  soundOnMatch: true,
  autoCopyOnMatch: false,
  theme: "dark",
  hotkey: DEFAULT_HOTKEY,
  language: "en",
  onboardingComplete: false,
};

const WARNING_TEXT = {
  en: {
    fileNotFound: (file) => `${file} not found`,
    optionalMissing: (file) => `${file} not found (optional)`,
    invalidTrivia: "TMP3TriviaQuestion.json contains no valid questions",
    invalidFinalRound: "TMP3FinalRoundGrouping.json contains no valid categories",
    missingRequired: (files) => `Required files missing: ${files}`,
  },
  ru: {
    fileNotFound: (file) => `${file} не найден`,
    optionalMissing: (file) => `${file} не найден (опционально)`,
    invalidTrivia: "TMP3TriviaQuestion.json не содержит валидных вопросов",
    invalidFinalRound: "TMP3FinalRoundGrouping.json не содержит валидных категорий",
    missingRequired: (files) => `Не найдены обязательные файлы: ${files}`,
  },
};

function warnText(language, key, ...args) {
  const catalog = WARNING_TEXT[language === "ru" ? "ru" : "en"];
  const value = catalog[key];
  return typeof value === "function" ? value(...args) : value;
}

const DATA_FILES = [
  "TMP3TriviaQuestion.json",
  "TMP3FinalRoundGrouping.json",
  "TMP3SubjectiveQuestion.json",
  "VO.json",
];

const REQUIRED_FILES = [
  "TMP3TriviaQuestion.json",
  "TMP3FinalRoundGrouping.json",
];

const OPTIONAL_FILES = [
  "TMP3SubjectiveQuestion.json",
  "VO.json",
];

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function asArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label}: ожидался массив content`);
  }
  return value;
}

function sanitizeTrivia(items) {
  return items
    .filter((item) => item?.id && item?.question)
    .map((item) => ({
      ...item,
      choices: Array.isArray(item.choices)
        ? item.choices.filter((c) => c?.text)
        : [],
    }))
    .filter((item) => item.choices.length > 0);
}

function sanitizeFinalRound(items) {
  return items
    .filter((item) => item?.id && item?.categoryName)
    .map((item) => ({
      ...item,
      choices: Array.isArray(item.choices) ? item.choices : [],
    }))
    .filter((item) => item.choices.length > 0);
}

function sanitizeSubjective(items) {
  return items
    .filter((item) => item?.id && item?.question)
    .map((item) => ({
      ...item,
      choices: Array.isArray(item.choices)
        ? item.choices.filter((c) => c?.text)
        : [],
      intro: item.intro?.versions
        ? {
            versions: item.intro.versions.filter((v) => v?.subtitle),
          }
        : undefined,
    }))
    .filter((item) => item.choices.length >= 2);
}

function sanitizeVo(items) {
  return items
    .filter((item) => item?.id && item?.name)
    .map((item) => ({
      ...item,
      audio: item.audio?.versions
        ? {
            versions: item.audio.versions.filter(
              (v) => v && (v.subtitle || v.file)
            ),
          }
        : undefined,
    }));
}

function cacheId(contentPath) {
  return createHash("sha256").update(contentPath.toLowerCase()).digest("hex");
}

async function fileExists(contentPath, filename) {
  try {
    await access(join(contentPath, filename));
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(contentPath, filename) {
  const filePath = join(contentPath, filename);
  await access(filePath);
  const raw = stripBom(await readFile(filePath, "utf-8"));
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${filename}: невалидный JSON`);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`${filename}: неверная структура`);
  }
  return parsed;
}

export function createDataService(configPath, cacheDir) {
  async function loadSettings() {
    try {
      const raw = await readFile(configPath, "utf-8");
      const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      parsed.hotkey = parsed.hotkey || DEFAULT_HOTKEY;
      parsed.language = parsed.language || "en";
      parsed.onboardingComplete =
        "onboardingComplete" in parsed
          ? Boolean(parsed.onboardingComplete)
          : true;
      if (parsed.windowWidth != null) {
        parsed.windowWidth = Number(parsed.windowWidth) || undefined;
      }
      if (parsed.windowHeight != null) {
        parsed.windowHeight = Number(parsed.windowHeight) || undefined;
      }
      return parsed;
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async function saveSettings(partial) {
    const current = await loadSettings();
    const next = { ...current, ...partial };
    await mkdir(dirname(configPath), { recursive: true });
    await writeFile(configPath, JSON.stringify(next, null, 2), "utf-8");
    return next;
  }

  async function saveConfig(contentPath) {
    return saveSettings({ contentPath });
  }

  async function inspectPath(contentPath) {
    const path = contentPath || (await loadSettings()).contentPath;
    const files = {
      trivia: await fileExists(path, "TMP3TriviaQuestion.json"),
      finalRound: await fileExists(path, "TMP3FinalRoundGrouping.json"),
      subjective: await fileExists(path, "TMP3SubjectiveQuestion.json"),
      vo: await fileExists(path, "VO.json"),
    };

    const missingRequired = REQUIRED_FILES.filter(
      (name) => !files[name === "TMP3TriviaQuestion.json" ? "trivia" : "finalRound"]
    );
    const missingOptional = OPTIONAL_FILES.filter(
      (name) =>
        !files[name === "TMP3SubjectiveQuestion.json" ? "subjective" : "vo"]
    );

    return {
      ok: files.trivia && files.finalRound,
      contentPath: path,
      files,
      missingRequired,
      missingOptional,
    };
  }

  async function checkPath(contentPath) {
    const result = await inspectPath(contentPath);
    return result.ok;
  }

  async function buildFingerprint(contentPath) {
    const parts = [];
    for (const filename of DATA_FILES) {
      const filePath = join(contentPath, filename);
      try {
        const info = await stat(filePath);
        parts.push(`${filename}:${info.mtimeMs}:${info.size}`);
      } catch {
        parts.push(`${filename}:missing`);
      }
    }
    return parts.join("|");
  }

  function cachePaths(contentPath) {
    const id = cacheId(contentPath);
    return {
      data: join(cacheDir, `${id}.json`),
      meta: join(cacheDir, `${id}.meta.json`),
    };
  }

  async function readCache(contentPath, fingerprint) {
    if (!cacheDir) return null;

    const paths = cachePaths(contentPath);
    try {
      const meta = JSON.parse(await readFile(paths.meta, "utf-8"));
      if (meta.fingerprint !== fingerprint) return null;
      return JSON.parse(await readFile(paths.data, "utf-8"));
    } catch {
      return null;
    }
  }

  async function writeCache(contentPath, fingerprint, data) {
    if (!cacheDir) return;

    await mkdir(cacheDir, { recursive: true });
    const paths = cachePaths(contentPath);
    await writeFile(paths.data, JSON.stringify(data), "utf-8");
    await writeFile(
      paths.meta,
      JSON.stringify({ fingerprint, cachedAt: new Date().toISOString() }),
      "utf-8"
    );
  }

  async function clearCache(contentPath) {
    if (!cacheDir) return;

    const paths = cachePaths(contentPath);
    await Promise.all(
      [paths.data, paths.meta].map(async (filePath) => {
        try {
          await unlink(filePath);
        } catch {
          /* ignore */
        }
      })
    );
  }

  async function loadOptionalJson(contentPath, filename, sanitizer, language) {
    try {
      const data = await readJsonFile(contentPath, filename);
      const items = asArray(data.content, filename);
      return { items: sanitizer(items), warning: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("ENOENT")) {
        return {
          items: [],
          warning: warnText(language, "fileNotFound", filename),
        };
      }
      return { items: [], warning: message };
    }
  }

  async function loadDataFromDisk(path, inspection, language) {
    const warnings = [];

    const triviaRaw = await readJsonFile(path, "TMP3TriviaQuestion.json");
    const finalRoundRaw = await readJsonFile(
      path,
      "TMP3FinalRoundGrouping.json"
    );
    const subjectiveResult = await loadOptionalJson(
      path,
      "TMP3SubjectiveQuestion.json",
      sanitizeSubjective,
      language
    );
    const voResult = await loadOptionalJson(path, "VO.json", sanitizeVo, language);

    const trivia = sanitizeTrivia(asArray(triviaRaw.content, "TMP3TriviaQuestion.json"));
    const finalRound = sanitizeFinalRound(
      asArray(finalRoundRaw.content, "TMP3FinalRoundGrouping.json")
    );

    if (trivia.length === 0) {
      throw new Error(warnText(language, "invalidTrivia"));
    }
    if (finalRound.length === 0) {
      throw new Error(warnText(language, "invalidFinalRound"));
    }

    for (const warning of [subjectiveResult.warning, voResult.warning]) {
      if (warning) warnings.push(warning);
    }

    if (!inspection.files.subjective) {
      warnings.push(
        warnText(language, "optionalMissing", "TMP3SubjectiveQuestion.json")
      );
    }
    if (!inspection.files.vo) {
      warnings.push(warnText(language, "optionalMissing", "VO.json"));
    }

    const edition = path.toLowerCase().includes("demo") ? "demo" : "full";

    return {
      trivia,
      finalRound,
      subjective: subjectiveResult.items,
      vo: voResult.items,
      counts: {
        trivia: trivia.length,
        finalRound: finalRound.length,
        subjective: subjectiveResult.items.length,
        vo: voResult.items.length,
      },
      loadInfo: {
        files: inspection.files,
        warnings,
        loadedAt: new Date().toISOString(),
        edition,
        fromCache: false,
      },
    };
  }

  async function loadData(contentPath, options = {}) {
    const settings = await loadSettings();
    const language = settings.language || "en";
    const path = contentPath || settings.contentPath;
    const inspection = await inspectPath(path);
    if (!inspection.ok) {
      throw new Error(
        warnText(language, "missingRequired", inspection.missingRequired.join(", "))
      );
    }

    const fingerprint = await buildFingerprint(path);

    if (options.forceRefresh) {
      await clearCache(path);
    } else {
      const cached = await readCache(path, fingerprint);
      if (cached) {
        return {
          ...cached,
          loadInfo: {
            ...cached.loadInfo,
            loadedAt: new Date().toISOString(),
            fromCache: true,
            fingerprint,
          },
        };
      }
    }

    const data = await loadDataFromDisk(path, inspection, language);
    data.loadInfo.fingerprint = fingerprint;
    await writeCache(path, fingerprint, data);
    return data;
  }

  async function getDataFingerprint(contentPath) {
    const settings = await loadSettings();
    const path = contentPath || settings.contentPath;
    return buildFingerprint(path);
  }

  async function checkDatabaseStale(contentPath, loadedFingerprint) {
    if (!loadedFingerprint) return { stale: false, fingerprint: null };
    const settings = await loadSettings();
    const path = contentPath || settings.contentPath;
    const fingerprint = await buildFingerprint(path);
    return {
      stale: fingerprint !== loadedFingerprint,
      fingerprint,
    };
  }

  return {
    loadConfig: async () => {
      const settings = await loadSettings();
      let contentPath = settings.contentPath;
      if (!(await checkPath(contentPath))) {
        const best = await getBestSteamPath();
        if (best) contentPath = best;
      }
      return {
        contentPath,
        defaultPath: (await getBestSteamPath()) ?? DEFAULT_CONTENT_PATH,
        settings: { ...settings, contentPath },
      };
    },
    loadSettings,
    saveSettings,
    saveConfig,
    checkPath,
    inspectPath,
    loadData,
    clearCache,
    getDataFingerprint,
    checkDatabaseStale,
  };
}
