import { createServer } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createDataService } from "./electron/data-service.mjs";
import { findSteamInstalls } from "./electron/steam-paths.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3456;
const cacheDir = join(__dirname, ".cache");
const dataService = createDataService(join(__dirname, "config.json"), cacheDir);

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  try {
    if (url.pathname === "/api/config" && req.method === "GET") {
      sendJson(res, 200, await dataService.loadConfig());
      return;
    }

    if (url.pathname === "/api/config" && req.method === "POST") {
      const body = await parseBody(req);
      const settings = await dataService.saveSettings(body);
      sendJson(res, 200, { ok: true, ...settings });
      return;
    }

    if (url.pathname === "/api/settings" && req.method === "GET") {
      sendJson(res, 200, await dataService.loadSettings());
      return;
    }

    if (url.pathname === "/api/settings" && req.method === "POST") {
      const body = await parseBody(req);
      sendJson(res, 200, await dataService.saveSettings(body));
      return;
    }

    if (url.pathname === "/api/steam-installs" && req.method === "GET") {
      sendJson(res, 200, await findSteamInstalls());
      return;
    }

    if (url.pathname === "/api/data" && req.method === "GET") {
      const contentPath = url.searchParams.get("path") || undefined;
      const forceRefresh = url.searchParams.get("refresh") === "1";
      sendJson(res, 200, await dataService.loadData(contentPath, { forceRefresh }));
      return;
    }

    if (url.pathname === "/api/check-path" && req.method === "GET") {
      const contentPath = url.searchParams.get("path");
      sendJson(res, 200, await dataService.inspectPath(contentPath));
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    sendJson(res, 500, { error: message });
  }
});

server.listen(PORT, () => {
  console.log(`TMP3 API server running on http://localhost:${PORT}`);
});
