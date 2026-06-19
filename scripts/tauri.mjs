import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const cargoBin = join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".cargo",
  "bin"
);

if (cargoBin && existsSync(join(cargoBin, "cargo.exe"))) {
  const delimiter = process.platform === "win32" ? ";" : ":";
  process.env.PATH = `${cargoBin}${delimiter}${process.env.PATH || ""}`;
}

const args = process.argv.slice(2);
const tauriArgs = args.length > 0 ? args : ["dev"];

const result = spawnSync("npx", ["tauri", ...tauriArgs], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
