// Run: npm run build && node test/ui.test.cjs
// Runs the built page's app script against a tiny fake `document` (no browser),
// so it checks behaviour, not looks. See browser.check.cjs for a real browser.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');
const appJs = html.match(/<script id="app-js">([\s\S]*?)<\/script>/)[1];

function boot(storage = {}, { syncUrl = '', fetch, replay = false } = {}) {
  const els = {};
  const element = id => els[id] ??= { value: id === 'bay' ? 'L3_West' : '', checked: false, disabled: false,
    textContent: '', innerHTML: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] ?? null; },
    classList: { set: new Set(), toggle(c, on) { on ?? !this.set.has(c) ? this.set.add(c) : this.set.delete(c); }, add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); } } };
  const ctx = vm.createContext({ document: { getElementById: element }, localStorage: { getItem: k => storage[k] ?? null, setItem: (k, v) => { storage[k] = v; } },
    window: { addEventListener() {} }, setInterval() {}, ...(syncUrl ? { location: { search: '?live', protocol: 'https:' } } : {}), Date, Number, Math, JSON, Error, Object, Set, Array, Promise, String, encodeURIComponent, fetch });
  // Logic tests pin the estimate's variability at the value they were written against; the replay test uses the shipped value.
  const source = replay ? appJs : appJs.replace(/variability: [\d.]+,/, 'variability: 0.8,');
  vm.runInContext(source.replace(/syncUrl: '[^']*',/, 'syncUrl: ' + JSON.stringify(syncUrl) + ','), ctx); // tests never touch the real database
  if (!replay) vm.runInContext("startedFresh && loadDemo('sample')", ctx); // most tests use the made-up sample; a real first visit opens on the Nov 19 replay
  return { els, ctx, storage, run: code => vm.runInContext(code, ctx), saved: () => JSON.parse(storage[syncUrl ? 'west-deck-live-v1' : 'west-deck-prototype-v2']).records };
}
let pass = 0; const test = (name, fn) => { fn(); pass++; console.log('ok -', name); };

test('seed shows a counted level, an estimated level, a level with no student stalls and a deck verdict', () => {
  const { els } = boot();
  assert.match(els.cards.innerHTML, />25<\/div><div class="unit">counted/);        // Level 3: 6+0+11+3+5, all just counted
  assert.match(els.cards.innerHTML, />9–31<\/div><div class="unit">estimate/);    // Level 2: 4+2+1 counted, plus two ageing bays (0–8 and 2–16)
  assert.match(els.cards.innerHTML, /bay-count">0–8<\/b><span class="status estimate">Estimate · counted 7, 8 min ago/); // it was filling: 12 then 7, so the middle is 3
  assert.match(els.cards.innerHTML, /Level 1<\/h3>.*no student stalls.*174 faculty\/staff · 3 accessible · 4 reserved/); // counted on foot
  assert.match(els.verdict.innerHTML, /Room likely.*<b>34–56<\/b> open · estimate/);
});
test('recommends where to try first, and says so plainly when nothing is known to be open', () => {
  const b = boot();
  assert.match(b.els.verdict.innerHTML, /Try first:.*Level 3 · East bay · <b>11<\/b> open<\/button>.*then.*Level 3 · West bay · <b>6<\/b> open/);
  b.run('clearDemo()');
  assert.match(b.els.verdict.innerHTML, /No bay has a known open space right now/);
});
test('advice can be predicted for a later arrival', () => {
  const b = boot();
  assert.match(b.els.verdict.innerHTML, /I arrive in .*aria-pressed="true" onclick="setLead\(0\)">now/);
  assert.match(b.els.verdict.innerHTML, /newest count 1 min ago/);
  b.run('setLead(10)');
  assert.match(b.els.verdict.innerHTML, /predicted for 10 minutes from now/);
  assert.match(b.els.verdict.innerHTML, /Try first:.*\(estimate\)/);                 // every count will be older than 5 minutes by then
  assert.doesNotMatch(b.els.verdict.innerHTML, /Level 2 · Centre ramp/);              // it was filling: not recommended for later
});
test('staff are told which bay to count next', () => {
  const b = boot();
  assert.match(b.els.countNext.innerHTML, /Count next:.*Level 2 · South bay.*\(its range is 2 to 16\)/);   // the widest range in the sample data
  b.run('clearDemo()');
  assert.match(b.els.countNext.innerHTML, /\(nothing is known about it\)/);
});
test('a first visit opens on the replay of the real Nov 19 count, labelled as a replay', () => {
  const b = boot({}, { replay: true });
  assert.match(b.els.verdict.innerHTML, /Room likely.*<b>56–83<\/b> open · estimate/);   // 70 were counted; five bays are 5-9 minutes old in the replay
  assert.match(b.els.verdict.innerHTML, /Try first:.*Level 2 · West bay · <b>22<\/b> open/);
  assert.match(b.els.notice.innerHTML, /A replay, not live.*Thursday, Nov 19, 2026/);
  assert.match(b.els.clock.textContent, /Replay of Thu Nov 19/);
  b.run("loadDemo('sample')"); assert.match(b.els.notice.innerHTML, /made-up sample data/);
  b.run('clearDemo()'); assert.match(b.els.notice.innerHTML, /typed in on this device/);
});
test('a truck\'s vehicle count is turned into open stalls, and says how far it could be off', () => {
  const b = boot(); b.run('clearDemo(); startSurvey()');                     // Level 3 West: 74 regular stalls, nothing else
  b.els.entryKind.value = 'scan'; b.run('kindChanged()');
  assert.match(b.els.countLabel.textContent, /never a plate/);
  b.els.count.value = '56'; b.els.coverage.checked = true; b.run('finishSurvey()');
  assert.equal(b.saved().L3_West.count, 18); assert.equal(b.saved().L3_West.method, 'scan');
  assert.match(b.els.feedback.textContent, /56 vehicles counted, so 18 open\./);
  assert.match(b.els.cards.innerHTML, /bay-count">18<\/b><span class="status recent">Counted · truck count, 0 min ago/);
  b.els.bay.value = 'L2_Centre'; b.run('startSurvey()'); b.els.entryKind.value = 'scan';     // 28 regular + 38 faculty
  b.els.count.value = '60'; b.els.coverage.checked = true; b.run('finishSurvey()');
  assert.match(b.els.feedback.textContent, /so 6 open \(up to 6 fewer/);
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
  assert.equal(b.saved().L3_West.category, 'Regular student stalls');
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
test('count above the bay\'s stall count saves with a warning', () => {
  const b = boot(); b.run('clearDemo(); startSurvey()');
  b.els.count.value = '120'; b.els.coverage.checked = true; b.run('finishSurvey()');
  assert.equal(b.saved().L3_West.count, 120);
  assert.match(b.els.feedback.textContent, /above the counted stall count \(74\)/);
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
  b.run('advance(51)');
  assert.match(b.els.cards.innerHTML, /bay-count">\?<\/b><span class="status unknown">Unknown · last count 60 min ago/);
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
  const storage = { 'west-deck-prototype-v2': JSON.stringify({ offset: 0, records: { L2_West: { count: '<img src=x onerror=alert(1)>', start: 1, end: 1, version: 1, category: 'x' } } }) };
  const b = boot(storage); assert.doesNotMatch(b.els.cards.innerHTML, /<img/);
  const b2 = boot({ 'west-deck-prototype-v2': '{not json' }); assert.match(b2.els.cards.innerHTML, />25<\/div>/); // falls back to sample
});
test('selecting a bay explains it in words', () => {
  const b = boot(); b.run("selectBay('L3_East')");
  assert.match(b.els.selection.textContent, /Level 3 · East bay.*11 counted open, 1 min ago.*Stalls: 63 \(counted on foot, 2026-11-19\)/);
  b.run("selectBay('L3_East')"); assert.match(b.els.selection.textContent, /Tap a bay/);
});
test('a student report fills an unknown bay as a band and feeds the recommendation', () => {
  const b = boot(); b.run('clearDemo()'); b.els.reportBay.value = 'L2_North'; b.run("reportBay('few')");
  assert.match(b.els.cards.innerHTML, /bay-count">1–4<\/b><span class="status students">Student report · "a few left", 0 min ago/);
  assert.match(b.els.verdict.innerHTML, /Try first:.*Level 2 · North bay · <b>1–4<\/b> open \(student report\)/);
  assert.match(b.els.reportMsg.textContent, /now shows "a few left" as a student report/);
  b.run("reportBay('full')");                                   // same device, same bay, straight away
  assert.match(b.els.reportMsg.textContent, /already reported this bay/);
  assert.equal(JSON.parse(b.storage['west-deck-reports-v1']).length, 1);
  b.run('advance(11)');                                         // reports expire
  assert.match(b.els.cards.innerHTML, /status unknown">Unknown · no survey/);
});
test('a student leaving opens a space in their bay for a few minutes', () => {
  const b = boot(); b.run('clearDemo()'); b.els.reportBay.value = 'L3_South'; b.run("reportBay('leaving')");
  assert.match(b.els.cards.innerHTML, /bay-count">1\+<\/b><span class="status students">Student report · "a space just opened", 0 min ago/);
  assert.match(b.els.reportMsg.textContent, /for the next 4 minutes/);
  b.run('advance(6)'); assert.doesNotMatch(b.els.cards.innerHTML, /status students/);
});
test('the phone remembers where it parked, so leaving is one tap', () => {
  const b = boot(); b.run('clearDemo()'); b.els.reportBay.value = 'L2_East'; b.run("reportBay('few')");
  assert.match(b.els.parkedNote.innerHTML, /You reported parking in <b>Level 2 · East bay<\/b>.*I'm leaving now/);
  b.run('advance(30); leaveParked()');
  assert.match(b.els.cards.innerHTML, /bay-count">1\+<\/b><span class="status students">Student report · "a space just opened"/);
  assert.equal(b.els.parkedNote.innerHTML, '');                              // nothing left to offer after leaving
  const again = boot(b.storage); assert.equal(again.els.reportBay.value, 'L2_East');   // next visit starts on the same bay
});
test('the guide always offers the most useful next step', () => {
  const b = boot();
  assert.match(b.els.guideText.textContent, /Parked already\? One tap helps the next driver/);  // someone who has not reported is pointed to Report
  assert.equal(b.els.guideBtn.textContent, 'Report');
  b.run("setView('deck')"); assert.match(b.els.guideText.textContent, /Best bet: Level 3 · East bay · 11 open/);   // from the same prediction as the Now screen
  assert.equal(b.els.guideBtn.textContent, 'I parked');
  b.run("setView('staff')"); assert.match(b.els.guideText.textContent, /Count next: Level 2 · South bay/);
  b.run("setView('student'); clearDemo()"); assert.match(b.els.guideText.textContent, /No known open space/);
  b.els.reportBay.value = 'L2_East'; b.run("reportBay('few')");
  assert.match(b.els.guideText.textContent, /Thanks\. Level 2 · East bay updated/);             // a short thank-you first
  assert.match(b.els.selection.textContent, /Level 2 · East bay/);                               // and the deck shows what their tap changed
  b.run('flash = null; renderGuide()');
  assert.match(b.els.guideText.textContent, /Parked in Level 2 · East bay\. Leaving\?/);       // from then on, leaving is one tap from any screen
  b.run("advance(1); guideTap(); flash = null; setView('student')");
  assert.match(b.els.cards.innerHTML, /"a space just opened"/);                                  // a minute after parking
  assert.match(b.els.guideText.textContent, /Parked already\?/);
});
test('a fresh staff count is not overridden by a student report', () => {
  const b = boot(); b.els.reportBay.value = 'L3_East'; b.run("reportBay('full')"); // sample data: 11 counted 1 min ago
  assert.match(b.els.cards.innerHTML, /bay-count">11<\/b><span class="status recent">Counted/);
  assert.match(b.els.reportMsg.textContent, /stronger evidence, so the display keeps it/);
});
test('corrupt stored reports are ignored', () => {
  const b = boot({ 'west-deck-reports-v1': JSON.stringify([{ zone: 'L2_West', band: '<img src=x onerror=1>', t: Date.now() }, 'junk']) });
  assert.doesNotMatch(b.els.cards.innerHTML, /<img|students/);
});
test('each bay has a stall diagram with a text equivalent', () => {
  const b = boot();
  assert.match(b.els.cards.innerHTML, /aria-label="74 regular stalls: 68 taken, 6 open\. Which stalls is not known"/);             // Level 3 West: 6 counted
  assert.match(b.els.cards.innerHTML, /aria-label="28 regular stalls: 20 taken, 8 possibly taken, 0 open\./);                       // Level 2 Centre: estimate 0-8
  b.run('clearDemo()');
  assert.match(b.els.cards.innerHTML, /aria-label="74 regular stalls, none with a current count"/);
  assert.equal((b.els.cards.innerHTML.match(/<rect /g) || []).length, 428);                                                          // one box per regular stall
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
    assert.match(b.els.scanPanel.innerHTML, /74 counted stalls − 31 vehicles = <b>43 open<\/b>/);
    assert.equal(b.els.count.value, 0);                       // nothing is filled in until the person chooses
    b.run('useSuggestion()'); assert.equal(b.els.count.value, 43);
    b.els.coverage.checked = true; b.run('finishSurvey()');
    const rec = b.saved().L3_West;
    assert.equal(rec.count, 43); assert.equal(rec.method, 'ai-assisted');
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
    assert.match(rows[1], /^L3_West,A,\d{4}-.*Z,\d{4}-.*Z,\d+,50,ai-assisted,2,24,22,12>12\|12>10,0,(single|tiled),0$/);
    assert.match(rows[2], /,7,manual,0,0,0,,0,,0$/);
    assert.match(b.els.logSummary.textContent, /2 completed surveys.*2 photos: exact on 1, average error 1\.0 vehicles \(0 missed, 2 extra\)/);
    assert.equal(JSON.parse(b.storage['west-deck-fieldlog-v1']).length, 2);
  });
  await atest('vehicles outside the bay can be tapped out, and are not blamed on the model', async () => {
    let out = 0; const b = boot();
    b.ctx.window.CarCounter = { count: async () => ({ count: 11, ms: 5 }), toggle: () => ({ out: ++out, added: 0 }), forget() {} }; // each tap leaves one more box out
    b.run('clearDemo(); startSurvey()'); await b.run('scanPhoto')(photo());
    b.run('tapBox({ clientX: 1, clientY: 1 }); tapBox({ clientX: 2, clientY: 2 }); tapBox({ clientX: 3, clientY: 3 })');      // three police cars outside the deck
    assert.match(b.els.scanPanel.innerHTML, /found <b>11<\/b> vehicles.*<b>3 left out<\/b>/);
    assert.match(b.els.scanPanel.innerHTML, /74 counted stalls − 8 vehicles = <b>66 open<\/b>/);
    b.run('adjustPhoto(1)');                                                                                                    // and one the model missed
    b.els.count.value = '65'; b.els.coverage.checked = true; b.run('finishSurvey()');
    assert.deepEqual(b.saved().L3_West.photos, [{ ai: 11, confirmed: 9, outside: 3 }]);
    assert.match(b.els.logSummary.textContent, /average error 1\.0 vehicles \(1 missed, 0 extra\); 3 found correctly but outside the bay/);
    assert.match(b.run('fieldLogCsv()'), /11>9,0,(single|tiled),3\n$/);
  });
  await atest('a vehicle the model missed can be added with a tap', async () => {
    const b = boot(); b.ctx.window.CarCounter = { count: async () => ({ count: 9, ms: 5 }), toggle: () => ({ out: 0, added: 2 }), forget() {} };
    b.run('clearDemo(); startSurvey()'); await b.run('scanPhoto')(photo());
    b.run('tapBox({ clientX: 1, clientY: 1 })');
    assert.match(b.els.scanPanel.innerHTML, /<b>2 added<\/b>.*74 counted stalls − 11 vehicles = <b>63 open<\/b>/s);
    b.els.count.value = '63'; b.els.coverage.checked = true; b.run('finishSurvey()');
    assert.deepEqual(b.saved().L3_West.photos, [{ ai: 9, confirmed: 11 }]);
    assert.match(b.els.logSummary.textContent, /average error 2\.0 vehicles \(2 missed, 0 extra\)/);
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
  // ---- Sharing between phones, against a stand-in for the shared database ----
  const { fakeDatabase } = require('./fake-database.cjs');
  await atest('a count and a student report made on one phone appear on another', async () => {
    const db = fakeDatabase(), opt = { syncUrl: 'https://example.test', fetch: db.fetch };
    const monitor = boot({}, opt), student = boot({}, opt), parked = boot({}, opt);
    assert.match(monitor.els.cards.innerHTML, /class="unit">unknown/);       // shared mode starts empty, no sample data
    assert.match(monitor.els.notice.innerHTML, /typed in by testers/);
    monitor.run('startSurvey()'); monitor.els.count.value = '9'; monitor.els.coverage.checked = true; monitor.run('finishSurvey()');
    parked.els.reportBay.value = 'L2_North'; parked.run("reportBay('few')");
    await monitor.run('syncNow()'); await parked.run('syncNow()'); await student.run('syncNow()');
    assert.match(student.els.cards.innerHTML, /bay-count">9<\/b><span class="status recent">Counted/);
    assert.match(student.els.cards.innerHTML, /bay-count">1–4<\/b><span class="status students">Student report/);
    assert.match(student.els.syncStatus.textContent, /Shared between phones/);
    assert.equal(Object.keys(db.data.v1.history).length, 1);
  });
  await atest('with a database configured but no ?live in the address, the page stays the self-contained demo', async () => {
    const db = fakeDatabase(), els = {};
    const b = boot({}, { replay: true });                                             // boot() without syncUrl has no location at all
    assert.match(b.els.notice.innerHTML, /A replay, not live/);
    assert.equal(Object.keys(db.data).length, 0);
  });
  await atest('with no connection, entries wait and are sent later', async () => {
    const db = fakeDatabase(), opt = { syncUrl: 'https://example.test', fetch: db.fetch };
    const a = boot({}, opt); db.offline = true;
    a.els.reportBay.value = 'L2_West'; a.run("reportBay('full')"); await a.run('syncNow()');
    assert.match(a.els.syncStatus.textContent, /unavailable right now.*1 item\(s\) waiting/);
    assert.match(a.els.cards.innerHTML, /status students/);                     // still shown on this phone
    db.offline = false; await a.run('syncNow()');
    assert.equal(Object.keys(db.data.v1.reports).length, 1);
    const b = boot({}, opt); await b.run('syncNow()');
    assert.match(b.els.cards.innerHTML, /bay-count">0<\/b><span class="status students">/);
  });
  await atest('junk in the shared database is not shown', async () => {
    const db = fakeDatabase(); db.data.v1 = { counts: { L2_West: { count: '<img src=x>', start: 1, end: 1, version: 1, category: 'x' }, L9_Fake: { count: 3 }, L1_West: { count: 5, start: Date.now(), end: Date.now(), version: 1, category: 'x' } }, reports: { a: { zone: 'L2_West', band: 'everything is free', t: Date.now() } }, history: { a: 'x' } };
    const a = boot({}, { syncUrl: 'https://example.test', fetch: db.fetch }); await a.run('syncNow()');
    assert.doesNotMatch(a.els.cards.innerHTML, /<img|students|recent/);
  });
  console.log(`\n${pass} UI tests passed (fake document; not a visual test).`);
})().catch(e => { console.error(e); process.exit(1); });
