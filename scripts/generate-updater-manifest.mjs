import { readFile, writeFile, readdir } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8")
).version;
const releaseDir = join(root, "release");
const bundleRoot = join(root, "src-tauri", "target", "release", "bundle");
const repo = "lindan133/tmp3-finder";
const tag = version;

async function findSignature(baseName) {
  const candidates = [
    join(root, "src-tauri", "target", "release", `${baseName}.sig`),
    join(bundleRoot, "nsis", `${baseName}.sig`),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      return readFile(path, "utf8");
    }
  }

  for (const dir of [join(bundleRoot, "nsis"), join(root, "src-tauri", "target", "release")]) {
    if (!existsSync(dir)) continue;
    const files = await readdir(dir);
    const sig = files.find((file) => file.endsWith(".sig") && file.includes("setup"));
    if (sig) {
      return readFile(join(dir, sig), "utf8");
    }
  }

  return null;
}

const setupName = `TMP3-Finder-Setup-${version}.exe`;
const setupUrl = `https://github.com/${repo}/releases/download/${tag}/${setupName}`;
const signature = await findSignature("app.exe");

if (!signature) {
  console.warn("No .sig file found — set TAURI_SIGNING_PRIVATE_KEY before build for updater signatures.");
}

const manifest = {
  version,
  notes: `TMP3 Finder ${version}`,
  pub_date: new Date().toISOString(),
  platforms: {},
};

if (signature) {
  manifest.platforms["windows-x86_64"] = {
    signature: signature.trim(),
    url: setupUrl,
  };
}

const outPath = join(releaseDir, "latest.json");
await writeFile(outPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Wrote ${outPath}`);
