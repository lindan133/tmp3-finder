import { execSync } from "node:child_process";

const TAURI_DEV_PORT = 5173;

function isPortListening(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.includes("LISTENING");
  } catch {
    return false;
  }
}

function findListeningPids(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const pids = new Set();
    for (const line of output.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid)) pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

if (isPortListening(TAURI_DEV_PORT)) {
  const pids = findListeningPids(TAURI_DEV_PORT);
  console.error("");
  console.error(`Порт ${TAURI_DEV_PORT} уже занят (Electron/Vite из другого окна).`);
  console.error("Tauri всегда подключается к http://localhost:5173 — иначе окно не откроется.");
  console.error("");
  console.error("Сделайте так:");
  console.error("  1. Закройте другие npm run dev / dev:electron");
  console.error("  2. Или завершите процесс на порту 5173");
  if (pids.length > 0) {
    console.error(`     taskkill /PID ${pids[0]} /F`);
  }
  console.error("");
  process.exit(1);
}

console.log("Tauri dev: первый запуск может компилировать Rust 3–7 минут.");
console.log("Окно Finder появится после строки Finished dev profile в терминале.");
