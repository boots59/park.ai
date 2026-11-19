// Serves dist/ on this computer so the AI count can load its model.
//   npm run serve   -> open the printed address in a browser on this computer
// (The AI count cannot run from a page opened as a file.)
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const dist = path.join(__dirname, '../dist'), port = Number(process.env.PORT) || 8080;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
http.createServer((req, res) => {
  let f = path.join(dist, path.normalize(decodeURIComponent(req.url.split('?')[0])));
  if (req.url === '/') f = path.join(dist, 'index.html');
  if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`West Deck prototype: http://127.0.0.1:${port}/`));
