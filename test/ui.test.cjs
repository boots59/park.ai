// Run: node build.cjs && node test/ui.test.cjs
// Runs the built page's app script against a tiny fake `document` (no browser),
// so it checks behaviour, not looks. See browser.check.cjs for a real browser.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../dist/West-Deck-Prototype.html'), 'utf8');
const appJs = html.match(/<script id="app-js">([\s\S]*?)<\/script>/)[1];

function boot(storage = {}) {
  const els = {};
  const element = id => els[id] ??= { value: id === 'bay' ? 'L3_West' : '', checked: false, disabled: false,
    textContent: '', innerHTML: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] ?? null; },
    classList: { set: new Set(), toggle(c, on) { on ?? !this.set.has(c) ? this.set.add(c) : this.set.delete(c); }, add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); } } };
  const ctx = vm.createContext({ document: { getElementById: element }, localStorage: { getItem: k => storage[k] ?? null, setItem: (k, v) => { storage[k] = v; } },
    window: { addEventListener() {} }, setInterval() {}, Date, Number, Math, JSON, Error, Object, Set });
  vm.runInContext(appJs, ctx);
  return { els, ctx, storage, run: code => vm.runInContext(code, ctx), saved: () => JSON.parse(storage['west-deck-prototype-v2']).records };
}
let pass = 0; const test = (name, fn) => { fn(); pass++; console.log('ok -', name); };

test('seed shows complete, partial and unknown levels', () => {
  const { els } = boot();
  assert.match(els.cards.innerHTML, />17<\/div>/);                // Level 3: 6+0+11, all recent
  assert.match(els.cards.innerHTML, />≥6<\/div>.*in 2 of 3 bays/s); // Level 2: centre is stale
  assert.match(els.cards.innerHTML, /availability not known/);     // Level 1: no surveys
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
test('counts expire: stale hides the number, then unknown', () => {
  const b = boot(); b.run('clearDemo(); startSurvey()');
  b.els.count.value = '4'; b.els.coverage.checked = true; b.run('finishSurvey(); advance(6)');
  assert.match(b.els.cards.innerHTML, /status stale/); assert.doesNotMatch(b.els.cards.innerHTML, /bay-count">4</);
  b.run('advance(15)'); assert.doesNotMatch(b.els.cards.innerHTML, /status stale/);
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
  const b = boot(); b.run("selectBay('L2_Centre')");
  assert.match(b.els.selection.textContent, /Level 2 · Centre ramp bay.*stale, count hidden.*Modelled stalls: 80/);
  b.run("selectBay('L2_Centre')"); assert.match(b.els.selection.textContent, /Tap a bay/);
});
test('backup reports stay separate from surveys', () => {
  const b = boot(); const before = b.els.cards.innerHTML;
  b.run("clearReports(); reportMovement('out')");
  assert.match(b.els.movementStats.innerHTML, /Reported net movement: -1/);
  b.run("reportMovement('out')"); assert.match(b.els.reportFeedback.textContent, /Wait a moment/);
  b.run('render()'); assert.equal(b.els.cards.innerHTML, before);
});
console.log(`\n${pass} UI tests passed (fake document; not a visual test).`);
