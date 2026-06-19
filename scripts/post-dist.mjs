import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = join(root, "release");

function runNode(script) {
  const result = spawnSync(process.execPath, [join(root, "scripts", script)], {
    stdio: "inherit",
    cwd: root,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runNode("copy-tauri-release.mjs");

const version = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8")
).version;
const signTargets = [
  "TMP3-Finder-Portable.exe",
  `TMP3-Finder-Setup-${version}.exe`,
];

for (const file of signTargets) {
  const target = join(releaseDir, file);
  if (!existsSync(target)) continue;
  const result = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      join(root, "scripts", "sign-windows.ps1"),
      target,
    ],
    { stdio: "inherit", cwd: root, env: process.env }
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runNode("generate-updater-manifest.mjs");
