import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

const CONTENT_SUFFIX = ["TMP3", "Content", "TMP3", "LooseData", "Content"];

const GAME_INSTALLS = [
  { folder: "Trivia Murder Party 3 Demo", edition: "demo", label: "Demo" },
];

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function isValidContentPath(contentPath) {
  return (
    (await pathExists(join(contentPath, "TMP3TriviaQuestion.json"))) &&
    (await pathExists(join(contentPath, "TMP3FinalRoundGrouping.json")))
  );
}

async function getSteamLibraryPaths() {
  const libraries = new Set();

  const defaultRoots = [
    "C:\\Program Files (x86)\\Steam",
    "C:\\Program Files\\Steam",
    join(process.env.LOCALAPPDATA || "", "Steam"),
  ];

  for (const root of defaultRoots) {
    if (!root || !existsSync(root)) continue;
    libraries.add(root);

    const vdfPath = join(root, "steamapps", "libraryfolders.vdf");
    if (!existsSync(vdfPath)) continue;

    try {
      const raw = await readFile(vdfPath, "utf-8");
      for (const match of raw.matchAll(/"path"\s+"([^"]+)"/g)) {
        libraries.add(match[1].replace(/\\\\/g, "\\"));
      }
    } catch {
      // ignore parse errors
    }
  }

  return [...libraries];
}

export async function findSteamInstalls() {
  const libraries = await getSteamLibraryPaths();
  const found = [];

  for (const library of libraries) {
    const commonRoot = join(library, "steamapps", "common");
    if (!existsSync(commonRoot)) continue;

    for (const game of GAME_INSTALLS) {
      const contentPath = join(commonRoot, game.folder, ...CONTENT_SUFFIX);
      if (!(await isValidContentPath(contentPath))) continue;

      found.push({
        contentPath,
        edition: game.edition,
        label: game.label,
        gameFolder: game.folder,
      });
    }
  }

  const unique = [];
  const seen = new Set();
  for (const item of found) {
    const key = item.contentPath.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique.sort((a, b) => {
    if (a.edition === b.edition) return a.label.localeCompare(b.label, "ru");
    return a.edition === "full" ? -1 : 1;
  });
}

export async function getBestSteamPath() {
  const installs = await findSteamInstalls();
  return installs[0]?.contentPath ?? null;
}
