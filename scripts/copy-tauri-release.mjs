import { copyFile, mkdir, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const targetDir = join(root, "release");
const version = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8")
).version;

const appExe = join(root, "src-tauri", "target", "release", "app.exe");
const nsisDir = join(root, "src-tauri", "target", "release", "bundle", "nsis");

await mkdir(targetDir, { recursive: true });

try {
  await copyFile(appExe, join(targetDir, "TMP3-Finder-Portable.exe"));
  console.log(`Copied to ${join(targetDir, "TMP3-Finder-Portable.exe")}`);
} catch (err) {
  console.warn(`Skip portable: ${err instanceof Error ? err.message : err}`);
}

try {
  const files = await readdir(nsisDir);
  const setup = files.find(
    (file) => file.endsWith("-setup.exe") || file.endsWith("_setup.exe")
  );
  if (!setup) {
    throw new Error("NSIS installer not found");
  }
  const target = join(targetDir, `TMP3-Finder-Setup-${version}.exe`);
  await copyFile(join(nsisDir, setup), target);
  console.log(`Copied to ${target}`);
} catch (err) {
  console.warn(`Skip installer: ${err instanceof Error ? err.message : err}`);
}
