import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../dist", import.meta.url)));
const port = Number(process.env.PORT || process.argv[2] || 4173);

const types = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"]
]);

function safePath(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, "http://localhost").pathname);
  const normalized = normalize(pathname).replace(/^([/\\])+/, "");
  const candidate = resolve(join(root, normalized));
  return candidate.startsWith(root) ? candidate : join(root, "index.html");
}

async function resolveFile(urlPath) {
  const candidate = safePath(urlPath);
  try {
    const info = await stat(candidate);
    if (info.isFile()) return candidate;
  } catch (err) {
    // Fall through to the SPA entry.
  }
  return join(root, "index.html");
}

createServer(async (request, response) => {
  const filePath = await resolveFile(request.url || "/");
  response.setHeader("Content-Type", types.get(extname(filePath)) || "application/octet-stream");
  createReadStream(filePath).pipe(response);
}).listen(port, "0.0.0.0", () => {
  console.log(`Serving ${root} at http://localhost:${port}/`);
});
