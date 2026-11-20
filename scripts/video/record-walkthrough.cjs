// Drives the real app like a user and records it. Prints a timeline of beats (seconds from the start of the recording).
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const dist = '/home/user/park.ai/dist', types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const VW = 412, VH = 892;
(async () => {
  const server = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(dist, u === '/' ? 'index.html' : u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(0);
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + process.argv[2]] });
  const c = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, permissions: ['camera'], recordVideo: { dir: 'raw', size: { width: VW, height: VH } } });
  const t0 = Date.now(), p = await c.newPage(), now = () => (Date.now() - t0) / 1000, marks = [];
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { // a gold ring wherever the "finger" lands
    addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.tapring{position:fixed;z-index:9999;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;border:5px solid #ffc629;background:rgba(255,198,41,.35);pointer-events:none;transition:transform .45s ease-out,opacity .45s ease-out}'; document.head.appendChild(st); });
    window.__ring = (x, y) => { const d = document.createElement('div'); d.className = 'tapring'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.appendChild(d); requestAnimationFrame(() => { d.style.transform = 'scale(1.5)'; d.style.opacity = '0'; }); setTimeout(() => d.remove(), 600); };
  });
  await p.goto(url); await p.waitForFunction(() => /rotate/.test(document.getElementById('viewerNote').textContent));
  await p.evaluate(async () => { const c = document.createElement('canvas'); c.width = c.height = 320; await window.CarCounter.count(c, null, { quick: true }); }); // load the model before the take
  const wait = ms => p.waitForTimeout(ms);
  const tap = async sel => { const l = p.locator(sel).first(); await l.scrollIntoViewIfNeeded(); const bx = await l.boundingBox(); const x = bx.x + bx.width / 2, y = bx.y + bx.height / 2; await p.evaluate(([x, y]) => window.__ring(x, y), [x, y]); await wait(220); await p.mouse.click(x, y); };
  const beat = async (id, min, fn) => { const s = now(); await fn(); const used = now() - s; if (used < min) await wait((min - used) * 1000); marks.push({ id, start: s, end: now() }); };
  await wait(500);
  await beat('now', 6, async () => { await wait(2500); await p.evaluate(() => document.querySelector('#student').scrollTo({ top: 260, behavior: 'smooth' })); await wait(2200); await p.evaluate(() => document.querySelector('#student').scrollTo({ top: 0, behavior: 'smooth' })); });
  await beat('pick', 4.5, async () => { await tap('#staffTab'); await wait(1300); await tap('#bayGrid [aria-label="Level 3 · West bay"]'); await wait(900); });
  await beat('camera', 8, async () => { await tap('#camBtn'); await p.waitForFunction(() => /AI sees \d/.test(document.getElementById('camLive').textContent), null, { timeout: 60000 }); await p.locator('#camBox').scrollIntoViewIfNeeded(); await wait(4500); });
  await beat('confirm', 8, async () => { await tap('#shutter'); await p.waitForFunction(() => /the model found/.test(document.getElementById('scanPanel').textContent), null, { timeout: 90000 }); await wait(1800); await tap('#scanPanel button:has-text("as the count")'); await wait(900); await tap('#saveBtn'); await wait(1500); });
  await p.evaluate(() => loadDemo('nov19')); // the driver's view shows the real Nov 19 count, not the number from the test photo
  await beat('first', 5, async () => { await tap('#studentTab'); await wait(2600); });
  await beat('deck', 9, async () => { await tap('#verdict .best .pick'); await wait(2200); const bx = await p.locator('#deck3d').boundingBox(); const y = bx.y + bx.height * 0.72; await p.mouse.move(bx.x + bx.width * 0.3, y); await p.mouse.down(); for (let i = 0; i <= 40; i++) { await p.mouse.move(bx.x + bx.width * (0.3 + 0.4 * i / 40), y); await wait(45); } await p.mouse.up(); await wait(900); await p.mouse.move(bx.x + bx.width * 0.7, y); await p.mouse.down(); for (let i = 0; i <= 40; i++) { await p.mouse.move(bx.x + bx.width * (0.7 - 0.4 * i / 40), y); await wait(45); } await p.mouse.up(); });
  await beat('way', 4.5, async () => { await p.locator('#access').scrollIntoViewIfNeeded(); await wait(1500); });
  await beat('report', 6.5, async () => { await tap('#reportTab'); await wait(1400); await tap('#reportGrid [aria-label="Level 2 · West bay"]'); await wait(1100); await tap('#reportPanel .choice.few'); await wait(1500); });
  await beat('ask', 7.5, async () => { await tap('#askBtn'); await wait(1300); await tap('#askChips button:has-text("Where should I park")'); await wait(2300); await tap('#askLog .a button >> nth=-1'); await wait(1500); });
  await beat('age', 5, async () => { await tap('#studentTab'); await wait(2500); });
  await wait(600);
  const file = await p.video().path(); await c.close(); await b.close(); server.close();
  fs.writeFileSync('timeline.json', JSON.stringify({ file, marks, errs }, null, 1)); console.log(file, errs, marks.map(m => m.id + ' ' + m.start.toFixed(1) + '-' + m.end.toFixed(1)).join(' | '));
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
