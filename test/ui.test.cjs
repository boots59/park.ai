// Run: npm run build && node test/ui.test.cjs
// Runs the built page's app script against a tiny fake `document` (no browser),
// so it checks behaviour, not looks. See browser.check.cjs for a real browser.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');
const appJs = html.match(/<script id="app-js">([\s\S]*?)<\/script>/)[1];

function boot(storage = {}) {
  const els = {};
  const element = id => els[id] ??= { value: id === 'bay' ? 'L3_West' : '', checked: false, disabled: false,
    textContent: '', innerHTML: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] ?? null; },
    classList: { set: new Set(), toggle(c, on) { on ?? !this.set.has(c) ? this.set.add(c) : this.set.delete(c); }, add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); } } };
  const ctx = vm.createContext({ document: { getElementById: element }, localStorage: { getItem: k => storage[k] ?? null, setItem: (k, v) => { storage[k] = v; } },
    window: { addEventListener() {} }, setInterval() {}, Date, Number, Math, JSON, Error, Object, Set, Array, Promise });
  vm.runInContext(appJs, ctx);
  return { els, ctx, storage, run: code => vm.runInContext(code, ctx), saved: () => JSON.parse(storage['west-deck-prototype-v2']).records };
}
let pass = 0; const test = (name, fn) => { fn(); pass++; console.log('ok -', name); };

test('seed shows a counted level, an estimated level, a partial level and a deck verdict', () => {
  const { els } = boot();
  assert.match(els.cards.innerHTML, />17<\/div><div class="unit">counted open/);        // Level 3: 6+0+11, all just counted
  assert.match(els.cards.innerHTML, />6–14<\/div><div class="unit">estimated open/);    // Level 2: 4 + 2 counted, plus the ageing centre bay's 0–8
  assert.match(els.cards.innerHTML, /bay-count">0–8<\/b><span class="status estimate">Estimate · counted 7, 8 min ago/); // it was filling: 12 then 7, so the middle is 3
  assert.match(els.cards.innerHTML, />≥2<\/div><div class="unit">in 1 of 3 bays/);      // Level 1: one old count, two unknown
  assert.match(els.verdict.innerHTML, /Room likely.*<b>≥25<\/b> open · in 7 of 9 bays/);
});
test('recommends where to try first, and says so plainly when nothing is known to be open', () => {
  const b = boot();
  assert.match(b.els.verdict.innerHTML, /Try first:.*Level 3 · East bay · <b>11<\/b> open<\/button>.*then.*Level 3 · West bay · <b>6<\/b> open/);
  b.run('clearDemo()');
  assert.match(b.els.verdict.innerHTML, /No bay has a known open space right now/);
});
test('coverage must be confirmed before saving', () => {
  const b = boot(); b.run('clearDemo(); startSurvey()');
  assert.equal(b.els.start.disabled, true);
  b.els.count.value = '12'; b.run('finishSurvey()');
  assert.match(b.els.feedback.textContent, /walked the whole bay/);
  assert.deepEqual(b.saved(), {});
});
test('survey saves, then a second survey replaces it', () => {
  const b = boot(); b.run('clearDemo(); startSurvey()');
  b.els.count.value = '12'; b.els.coverage.checked = true; b.run('finishSurvey()');
  assert.equal(b.saved().L3_West.count, 12);
  b.run('startSurvey()'); b.els.count.value = '2'; b.els.coverage.checked = true; b.run('finishSurvey()');
  assert.equal(b.saved().L3_West.count, 2);
  assert.equal(b.saved().L3_West.category, 'Example general permit (illustrative)');
});
test('double tap on Complete saves once', () => {
  const b = boot(); b.run('clearDemo(); startSurvey()');
  b.els.count.value = '5'; b.els.coverage.checked = true; b.run('finishSurvey(); finishSurvey()');
  assert.equal(b.saved().L3_West.version, 1);
});
test('empty count is rejected, zero is accepted', () => {
  const b = boot(); b.run('clearDemo(); startSurvey()');
  b.els.coverage.checked = true; b.els.count.value = ''; b.run('finishSurvey()');
  assert.match(b.els.feedback.textContent, /including 0/);
  b.els.count.value = '0'; b.run('finishSurvey()');
  assert.equal(b.saved().L3_West.count, 0);
});
test('count above modelled stalls saves with a warning', () => {
  const b = boot(); b.run('clearDemo(); startSurvey()');
  b.els.count.value = '120'; b.els.coverage.checked = true; b.run('finishSurvey()');
  assert.equal(b.saved().L3_West.count, 120);
  assert.match(b.els.feedback.textContent, /above the modelled stall count \(79\)/);
});
test('survey left open over 20 minutes is rejected', () => {
  const b = boot(); b.run('clearDemo(); startSurvey(); advance(21)');
  b.els.count.value = '3'; b.els.coverage.checked = true; b.run('finishSurvey()');
  assert.match(b.els.feedback.textContent, /20 minutes/);
  assert.deepEqual(b.saved(), {});
});
test('an ageing count becomes a range, then unknown', () => {
  const b = boot(); b.run('clearDemo(); startSurvey()');
  b.els.count.value = '14'; b.els.coverage.checked = true; b.run('finishSurvey(); advance(9)');
  assert.match(b.els.cards.innerHTML, /bay-count">10–18<\/b><span class="status estimate">Estimate · counted 14, 9 min ago/);
  b.run('advance(21)');
  assert.match(b.els.cards.innerHTML, /bay-count">—<\/b><span class="status unknown">Unknown · last count 30 min ago/);
  assert.match(b.els.verdict.innerHTML, /Not enough counts to say/);
});
test('a recount gives the next estimate a trend', () => {
  const b = boot(); b.run('clearDemo(); startSurvey()');
  b.els.count.value = '24'; b.els.coverage.checked = true; b.run('finishSurvey(); advance(10); startSurvey()');
  b.els.count.value = '14'; b.els.coverage.checked = true; b.run("finishSurvey(); advance(10); selectBay('L3_West')");
  assert.match(b.els.selection.textContent, /estimated 0–10 open \(14 counted 10 min ago, filling about 1\.0 a minute\)/);
});
test('cancel publishes nothing and re-enables start', () => {
  const b = boot(); b.run('clearDemo(); startSurvey()'); b.els.count.value = '9'; b.run('cancelSurvey()');
  assert.equal(b.els.start.disabled, false); assert.deepEqual(b.saved(), {});
});
test('corrupt storage is ignored, not rendered', () => {
  const storage = { 'west-deck-prototype-v2': JSON.stringify({ offset: 0, records: { L1_West: { count: '<img src=x onerror=alert(1)>', start: 1, end: 1, version: 1, category: 'x' } } }) };
  const b = boot(storage); assert.doesNotMatch(b.els.cards.innerHTML, /<img/);
  const b2 = boot({ 'west-deck-prototype-v2': '{not json' }); assert.match(b2.els.cards.innerHTML, />17<\/div>/); // falls back to sample
});
test('selecting a bay explains it in words', () => {
  const b = boot(); b.run("selectBay('L3_East')");
  assert.match(b.els.selection.textContent, /Level 3 · East bay.*11 counted open, 1 min ago.*Modelled stalls: 73/);
  b.run("selectBay('L3_East')"); assert.match(b.els.selection.textContent, /Tap a bay/);
});
// ---- AI assist and field log (the model is replaced by a stub that returns a fixed count) ----
const photo = () => ({ files: [{}], value: 'x' });
(async () => {
  const atest = async (name, fn) => { await fn(); pass++; console.log('ok -', name); };
  await atest('AI count is a suggestion the person corrects, then saves', async () => {
    const b = boot(); b.ctx.window.CarCounter = { count: async () => ({ count: 30, ms: 5 }) };
    b.run('clearDemo(); startSurvey()');
    await b.run('scanPhoto')(photo());
    assert.match(b.els.scanPanel.innerHTML, /found <b>30<\/b> vehicles/);
    b.run('adjustPhoto(1)');                                  // the person saw one the model missed
    assert.match(b.els.scanPanel.innerHTML, /79 modelled stalls − 31 vehicles = <b>48 open<\/b>/);
    assert.equal(b.els.count.value, 0);                       // nothing is filled in until the person chooses
    b.run('useSuggestion()'); assert.equal(b.els.count.value, 48);
    b.els.coverage.checked = true; b.run('finishSurvey()');
    const rec = b.saved().L3_West;
    assert.equal(rec.count, 48); assert.equal(rec.method, 'ai-assisted');
    assert.deepEqual(rec.photos, [{ ai: 30, confirmed: 31 }]);
  });
  await atest('field log records model vs person and exports CSV', async () => {
    const b = boot(); b.ctx.window.CarCounter = { count: async () => ({ count: 12, ms: 5 }) };
    b.run('clearDemo(); startSurvey()');
    await b.run('scanPhoto')(photo()); await b.run('scanPhoto')(photo());
    b.run('adjustPhoto(-2)'); b.els.count.value = '50'; b.els.coverage.checked = true; b.run('finishSurvey()');
    b.run('startSurvey()'); b.els.count.value = '7'; b.els.coverage.checked = true; b.run('finishSurvey()');
    const rows = b.run('fieldLogCsv()').trim().split('\n');
    assert.equal(rows.length, 3);
    assert.match(rows[1], /^L3_West,A,\d{4}-.*Z,\d{4}-.*Z,\d+,50,ai-assisted,2,24,22,12>12\|12>10,0$/);
    assert.match(rows[2], /,7,manual,0,0,0,,0$/);
    assert.match(b.els.logSummary.textContent, /2 completed surveys.*2 photos: exact on 1, average error 1\.0 vehicles \(0 missed, 2 extra\)/);
    assert.equal(JSON.parse(b.storage['west-deck-fieldlog-v1']).length, 2);
  });
  await atest('AI failure leaves manual counting working', async () => {
    const b = boot(); b.ctx.window.CarCounter = { count: async () => { throw Error('AI count needs the hosted version'); } };
    b.run('clearDemo(); startSurvey()');
    await b.run('scanPhoto')(photo());
    assert.match(b.els.scanStatus.textContent, /hosted version/);
    b.els.count.value = '3'; b.els.coverage.checked = true; b.run('finishSurvey()');
    assert.equal(b.saved().L3_West.method, 'manual');
  });
  await atest('a photo result arriving after cancel is ignored', async () => {
    let release; const b = boot();
    b.ctx.window.CarCounter = { count: () => new Promise(r => { release = () => r({ count: 9, ms: 5 }); }) };
    b.run('clearDemo(); startSurvey()');
    const pending = b.run('scanPhoto')(photo());
    b.run('cancelSurvey(); startSurvey()'); release(); await pending;
    assert.equal(b.els.scanPanel.innerHTML, '');
  });
  console.log(`\n${pass} UI tests passed (fake document; not a visual test).`);
})().catch(e => { console.error(e); process.exit(1); });
