/*
 * Minimal static file server for dist/ (no dependencies).
 *
 *   node scripts/serve.mjs          serves on http://localhost:3000 (or the next free port)
 *   PORT=8080 node scripts/serve.mjs
 */
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

// An explicit PORT is used as-is; otherwise the next free port from 3000 is chosen.
const explicitPort = Number(process.env.PORT) || null;

export function startServer({ port = explicitPort ?? 3000 } = {}) {
  const server = createServer(async (req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400).end("Bad request");
      return;
    }
    if (pathname.endsWith("/")) pathname += "index.html";

    const filePath = path.join(distDir, path.normalize(pathname));
    if (!filePath.startsWith(distDir + path.sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    const info = await stat(filePath).catch(() => null);
    if (!info?.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end(`Not found: ${pathname}`);
      return;
    }

    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    createReadStream(filePath).pipe(res);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && !explicitPort && port < 3020) {
      console.log(`[serve] port ${port} is in use, trying ${port + 1}`);
      server.listen(++port);
      return;
    }
    if (error.code === "EADDRINUSE") {
      console.error(`[serve] port ${port} is in use. Set the PORT environment variable to use another port.`);
      process.exit(1);
    }
    throw error;
  });

  server.on("listening", () => console.log(`[serve] http://localhost:${port}`));
  server.listen(port);
  return server;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (!existsSync(distDir)) {
    console.error("[serve] dist/ not found. Run `npm run build` first.");
    process.exit(1);
  }
  startServer();
}
