// A tiny static file server for the repo, with no dependencies.
// Used by `npm start` and by the tests (browsers won't load ES modules from file:// URLs).
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json" };

function serve(port = 0) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let url;
      try { url = decodeURIComponent(req.url.split("?")[0]); } catch { res.writeHead(400).end(); return; }
      const file = path.join(ROOT, url === "/" ? "index.html" : url);
      if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404).end("not found"); return; }
        res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" }).end(data);
      });
    });
    server.listen(port, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}

module.exports = { serve };
