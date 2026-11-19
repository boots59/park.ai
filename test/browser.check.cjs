// Run: npm run build && npm run check:browser [outDir]
// Real headless Chromium (software WebGL), phone and desktop widths, screenshots.
//  1. Opens the page from file:// with the network blocked: the core must work offline.
//  2. Serves dist/ over local http and runs the AI count on a photo, if a fixture
//     exists at test/fixtures/street.jpg (not in git: use a photo you may share).
const { chromium } = require('playwright'), path = require('node:path'), fs = require('node:fs'), http = require('node:http'), assert = require('node:assert/strict');
const dist = path.join(__dirname, '../dist'), file = 'file://' + path.join(dist, 'index.html');
const out = process.argv[2] || path.join(__dirname, '../screenshots'); fs.mkdirSync(out, { recursive: true });
const fixture = path.join(__dirname, 'fixtures/street.jpg');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

function serve() {
  const server = http.createServer((req, res) => {
    const f = path.join(dist, path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
    if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

  for (const [w, h] of [[375, 812], [1280, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await ctx.route(/^https?:/, r => r.abort()); // prove the core needs no network
    const p = await ctx.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(file);
    await p.waitForFunction(() => /rotate|unavailable/.test(document.getElementById('viewerNote').textContent), null, { timeout: 30000 });
    assert.match(await p.textContent('#viewerNote'), /Drag to rotate/, '3D view did not mount');
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 0, `page scrolls sideways by ${overflow}px at ${w}px`);

    await p.locator('#deck3d').scrollIntoViewIfNeeded(); // tap the middle of the 3D view
    const box = await p.locator('#deck3d canvas').boundingBox();
    await p.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    assert.doesNotMatch(await p.textContent('#selection'), /Tap a bay/, 'tapping the model centre selected no bay');
    await p.screenshot({ path: `${out}/student-${w}.png`, fullPage: true });

    await p.click('#staffTab'); await p.selectOption('#bay', 'L2_North'); await p.click('#start');
    await p.click('[aria-label="Add one space"]'); await p.check('#coverage'); await p.click('text=Complete & replace');
    assert.match(await p.textContent('#feedback'), /Level 2 · North bay saved/);
    assert.match(await p.textContent('#logSummary'), /1 completed survey logged/);
    const staffOverflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(staffOverflow <= 0, `staff view scrolls sideways by ${staffOverflow}px at ${w}px`);
    await p.screenshot({ path: `${out}/staff-${w}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    console.log(`offline file ${w}px ok`);
    await ctx.close();
  }

  if (!fs.existsSync(path.join(dist, 'ai/yolox_s.onnx'))) console.log('SKIPPED AI check: no model in dist/ai (npm run fetch-model && npm run build)');
  else if (!fs.existsSync(fixture)) console.log('SKIPPED AI check: no photo at test/fixtures/street.jpg');
  else {
    const server = await serve(), url = `http://127.0.0.1:${server.address().port}/index.html`;
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(url); await p.click('#staffTab'); await p.selectOption('#bay', 'L3_West'); await p.click('#start');
    const t0 = Date.now();
    await p.setInputFiles('#photo', fixture);
    await p.waitForFunction(() => document.getElementById('scanPanel').textContent || /Count by eye|not available/.test(document.getElementById('scanStatus').textContent), null, { timeout: 120000 });
    const panel = await p.textContent('#scanPanel'), found = Number((panel.match(/found (\d+) vehicles/) || [])[1]);
    assert.ok(found >= 1, 'model found no vehicles: ' + (panel || await p.textContent('#scanStatus')));
    await p.click('[aria-label="One more vehicle"]');
    await p.click('text=/^Use \\d+ as the count$/'); await p.check('#coverage');
    await p.locator('#scanCanvas').scrollIntoViewIfNeeded();
    const aiOverflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(aiOverflow <= 0, `AI panel scrolls sideways by ${aiOverflow}px`);
    await p.screenshot({ path: `${out}/staff-ai-375.png`, fullPage: true });
    await p.click('text=Complete & replace');
    assert.match(await p.textContent('#feedback'), /Level 3 · West bay saved/);
    const csv = await p.evaluate(() => fieldLogCsv());
    assert.match(csv, new RegExp(`ai-assisted,1,${found},${found + 1},${found}>${found + 1},0,(single|tiled),0`));
    // Installable app: manifest and icon are served, and the service worker takes control.
    const man = await p.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
    assert.equal(man.display, 'standalone'); assert.equal((await p.request.get(new URL(man.icons[1].src, url).href)).status(), 200);
    assert.ok(await p.evaluate(() => navigator.serviceWorker.ready.then(r => !!r.active)), 'service worker did not activate');
    assert.deepEqual(errors, []);
    console.log(`AI check ok: model found ${found} vehicles in the test photo, ${((Date.now() - t0) / 1000).toFixed(1)} s including model load`);
    await ctx.close(); server.close();
  }
  await browser.close();
  console.log('Browser check passed. Screenshots in', path.relative(process.cwd(), out) || '.');
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
