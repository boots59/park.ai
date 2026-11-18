// Run: node build.cjs && node test/browser.check.cjs [outDir]
// Real headless Chromium (software WebGL). Opens the page from file:// with all
// network blocked, at phone and desktop widths, and saves screenshots.
const { chromium } = require('playwright'), path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const page = 'file://' + path.join(__dirname, '../dist/West-Deck-Prototype.html');
const out = process.argv[2] || path.join(__dirname, '../screenshots'); fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [w, h] of [[375, 812], [1280, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await ctx.route(/^https?:/, r => r.abort()); // prove it needs no network
    const p = await ctx.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(page);
    await p.waitForFunction(() => /rotate|unavailable/.test(document.getElementById('viewerNote').textContent), null, { timeout: 30000 });
    const note = await p.textContent('#viewerNote');
    assert.match(note, /Drag to rotate/, '3D view did not mount: ' + note);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 0, `page scrolls sideways by ${overflow}px at ${w}px`);

    // Tap the middle of the 3D view; whatever bay is there should be selected.
    await p.locator('#deck3d').scrollIntoViewIfNeeded();
    const box = await p.locator('#deck3d canvas').boundingBox();
    await p.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    const sel = await p.textContent("#selection");
    assert.doesNotMatch(sel, /Tap a bay/, "tapping the model centre selected no bay");
    await p.locator('#deck3d').scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${out}/student-${w}.png`, fullPage: true });
    await p.click('#spread'); await p.locator('#deck3d').screenshot({ path: `${out}/deck3d-stacked-${w}.png` });

    await p.click('#staffTab'); await p.selectOption('#bay', 'L1_East'); await p.click('#start');
    await p.click('[aria-label="Add one space"]'); await p.check('#coverage'); await p.click('text=Complete & replace');
    const fb = await p.textContent('#feedback');
    assert.match(fb, /Level 1 · East bay saved/);
    await p.screenshot({ path: `${out}/staff-${w}.png`, fullPage: true });
    console.log(`${w}px ok · overflow ${overflow}px · tap: "${sel.slice(0, 60)}…" · errors: ${errors.length}`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  await browser.close();
  console.log('Browser check passed. Screenshots in', path.relative(process.cwd(), out) || '.');
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
