// Server tĩnh cho thư mục dapp/, tắt bộ đệm trình duyệt (Cache-Control: no-store).
// python -m http.server để trình duyệt giữ bản env.js/adapter cũ sau khi sửa code; script này thì không.
// Chạy: npm run dapp  (cổng mặc định 8000, đổi bằng --port 9000)
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'dapp');
const portArg = process.argv.indexOf('--port');
const PORT = portArg > -1 ? Number(process.argv[portArg + 1]) : 8000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = path.join(ROOT, urlPath);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) file = path.join(ROOT, '404.html');
  res.writeHead(file.endsWith('404.html') && !urlPath.endsWith('404.html') ? 404 : 200, {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`DApp: http://localhost:${PORT}  (Ctrl+C để dừng)`));
