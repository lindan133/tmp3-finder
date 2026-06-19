import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(root, "src-tauri", "tauri.conf.json");

if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
  console.log("TAURI_SIGNING_PRIVATE_KEY not set — updater artifacts disabled.");
  process.exit(0);
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
config.bundle.createUpdaterArtifacts = true;
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.log("Enabled createUpdaterArtifacts for signed release build.");
