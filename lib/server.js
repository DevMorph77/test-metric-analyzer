// lib/server.js
const http = require("http");
const fs = require("fs");
const path = require("path");

function serveStatic(dir, port = 3000) {
  const server = http.createServer((req, res) => {
    let filePath = path.join(dir, req.url === "/" ? "/index.html" : req.url);
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes = {
      ".html": "text/html",
      ".json": "application/json",
      ".css": "text/css",
      ".js": "application/javascript",
    };

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
      res.end(content);
    });
  });

  server.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}/`);
  });
}

module.exports = { serveStatic };
