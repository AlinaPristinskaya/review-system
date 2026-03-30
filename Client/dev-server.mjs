import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.CLIENT_PORT || 3000);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

function resolveFilePath(urlPath) {
  if (urlPath === "/" || urlPath === "") {
    return path.join(__dirname, "index.html");
  }

  const cleanPath = urlPath.replace(/^\/+/, "");
  return path.join(__dirname, cleanPath);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const filePath = resolveFilePath(url.pathname);
    const extension = path.extname(filePath).toLowerCase();
    const contentType = contentTypes[extension] || "application/octet-stream";
    const file = await fs.readFile(filePath);

    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store"
    });
    response.end(file);
  } catch (error) {
    if (error.code === "ENOENT") {
      try {
        const indexFile = await fs.readFile(path.join(__dirname, "index.html"));
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store"
        });
        response.end(indexFile);
        return;
      } catch (indexError) {
        response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Failed to load client index file.");
        return;
      }
    }

    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Client dev server error.");
  }
});

server.listen(port, () => {
  console.log(`Client running at http://localhost:${port}`);
});
