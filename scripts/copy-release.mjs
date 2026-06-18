import { copyFile, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = "C:/Temp/tmp3-release";
const targetDir = join(root, "release");

await mkdir(targetDir, { recursive: true });

const files = await readdir(sourceDir);
const artifacts = files.filter((name) => name.endsWith(".exe"));

if (artifacts.length === 0) {
  throw new Error(`No .exe artifacts found in ${sourceDir}`);
}

for (const name of artifacts) {
  const target = join(targetDir, name);
  await copyFile(join(sourceDir, name), target);
  console.log(`Copied to ${target}`);
}
