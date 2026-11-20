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
  assert.match(els.verdict.innerHTML, /^<span class="hero room"><b>34–56<\/b>open spaces right now<\/span>/);   // how much parking there is comes first
});
test('recommends where to try first, and says so plainly when nothing is known to be open', () => {
  const b = boot();
  assert.match(b.els.verdict.innerHTML, /Where do you want to park\?.*class="pick top".*Level 3 · East bay · <b>11<\/b> open<\/button>.*Level 3 · West bay · <b>6<\/b> open/);
  b.run('clearDemo()');
  assert.match(b.els.verdict.innerHTML, /No bay has a known open space right now/);
});
test('advice can be predicted for a later arrival', () => {
  const b = boot();
  assert.match(b.els.verdict.innerHTML, /I arrive in .*aria-pressed="true" onclick="setLead\(0\)">now/);
  assert.match(b.els.verdict.innerHTML, /newest count 1 min ago/);
  b.run('setLead(10)');
  assert.match(b.els.verdict.innerHTML, /predicted for 10 minutes from now/);
  assert.match(b.els.verdict.innerHTML, /Where do you want to park\?.*\(estimate\)/);                 // every count will be older than 5 minutes by then
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
  assert.match(b.els.verdict.innerHTML, /Where do you want to park\?.*Level 2 · West bay · <b>22<\/b> open/);
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
test('an ageing count becomes a range, then a labelled last count that is never erased', () => {
  const b = boot(); b.run('clearDemo(); startSurvey()');
  b.els.count.value = '14'; b.els.coverage.checked = true; b.run('finishSurvey(); advance(9)');
  assert.match(b.els.cards.innerHTML, /bay-count">10–18<\/b><span class="status estimate">Estimate · counted 14, 9 min ago/);
  b.run('advance(51)');
  assert.match(b.els.cards.innerHTML, /bay-count">14<\/b><span class="status unknown">Last count · 60 min ago/);   // kept, never erased
  assert.match(b.els.verdict.innerHTML, /Last count<\/span>.*<b>≥14<\/b> open when last counted · 60 min ago · not live/);
  assert.match(b.els.verdict.innerHTML, /Most room at the last count:.*Level 3 · West bay · <b>14<\/b> open/);
  assert.match(b.els.cards.innerHTML, /aria-label="74 regular stalls: 60 taken, 14 open at the last count\./);       // the diagram is filled in from it
  b.run('advance(60 * 24 * 3)');                                                    // three days later it is still there, with its age
  assert.match(b.els.cards.innerHTML, /bay-count">14<\/b><span class="status unknown">Last count · 3 days ago/);
  assert.match(b.els.verdict.innerHTML, /3 days ago · not live/);
  assert.doesNotMatch(b.els.verdict.innerHTML, /Room likely|estimate/);              // an old count is never dressed up as a live estimate
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
  assert.match(b.els.verdict.innerHTML, /Where do you want to park\?.*Level 2 · North bay · <b>1–4<\/b> open \(student report\)/);
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
  assert.equal(b.els.guideBtn.textContent, 'I parked here');
  b.run("setView('staff')"); assert.match(b.els.guideText.textContent, /Staff only\. Enter the monitor password/);   // locked until the password is entered
  b.run("$('staffPass').value = 'wrong'; unlock('staffPass','staffPassMsg')"); assert.match(b.els.staffPassMsg.textContent, /not the password/);
  b.run("$('staffPass').value = 'Monitor '; unlock('staffPass','staffPassMsg')");                         // case and spaces do not matter
  assert.equal(b.storage['park-ai-staff-ok-v1'], '1');
  assert.match(b.els.guideText.textContent, /Count next: Level 2 · South bay/);
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
test('deck switcher: West Deck is live, every other place says coming soon', () => {
  const b = boot();
  assert.match(b.els.places.innerHTML, /West Deck<small>live/);
  assert.match(b.els.places.innerHTML, /Central Deck<small>soon/);
  assert.match(b.els.placeSpec.textContent, /3 levels · 662 stalls, 428 student · clearance 7 ft 2 in/);
  b.run("setPlace('north')");
  assert.match(b.els.verdict.innerHTML, /Coming soon/);
  assert.doesNotMatch(b.els.verdict.innerHTML, /open/);                       // no number is ever shown for a place nobody counted
  assert.match(b.els.verdict.innerHTML, /Clearance 6 ft 8 in \(KSU\)/);
  b.run("setPlace('west')");
  assert.match(b.els.verdict.innerHTML, /open/);
});
test('ways in and out are listed as text', () => {
  const b = boot();
  assert.match(b.els.access.innerHTML, /<span class="walk"><b>To campus<\/b> Level 3, north-east corner/);
  assert.match(b.els.access.innerHTML, /<b>Main in\/out<\/b> Level 1, south side, far east end/);
  assert.match(b.els.access.innerHTML, /<b>Side in\/out<\/b> Level 1, west side, north of the middle/);
});
test('Ask Park.AI answers from the counts and matches typed questions to topics', () => {
  const b = boot();
  b.run("openAsk(); askTopic('park')");
  assert.match(b.els.askLog.innerHTML, /Try Level 3 · East bay first: 11 open, just counted\./);
  b.run("$('askText').value = 'how do i get to class on foot?'; askTyped()");
  assert.match(b.els.askLog.innerHTML, /To campus: Level 3, north-east corner/);
  b.run("$('askText').value = 'where do teachers park'; askTyped()");
  assert.match(b.els.askLog.innerHTML, /Level 1 is faculty\/staff only \(174 stalls\), plus 38 on the Level 2 centre ramp/);
  b.run("$('askText').value = '<b>pizza</b>'; askTyped()");
  assert.match(b.els.askLog.innerHTML, /&lt;b&gt;pizza&lt;\/b&gt;.*I can only answer the questions on the buttons/);   // typed text is escaped; no made-up answer
  b.run('clearDemo(); askTopic("room")');
  assert.match(b.els.askLog.innerHTML, /West Deck\. No counts yet\./);
});
test('one-tap check-in from the deck: I parked here, then how full', () => {
  const b = boot();
  b.run("selectBay('L2_West')");
  assert.match(b.els.checkin.innerHTML, /parkHere\('L2_West'\)">I parked here/);
  assert.equal(b.els.guideBtn.textContent, 'I parked here');
  b.run('guideTap()');                                                              // one tap checks in
  assert.equal(JSON.parse(b.storage['west-deck-parked-v1']).zone, 'L2_West');
  assert.match(b.els.checkin.innerHTML, /How full is it\? One tap/);
  assert.equal(JSON.parse(b.storage['west-deck-reports-v1'] || '[]').length, 0);     // no fullness is invented for them
  b.run("reportBay('few')");                                                        // the optional second tap
  assert.equal(JSON.parse(b.storage['west-deck-reports-v1']).at(-1).band, 'few');
  assert.match(b.els.checkin.innerHTML, /I'm leaving Level 2 · West bay/);
  assert.match(b.els.parkedNow.innerHTML, /You parked in <b>Level 2 · West bay<\/b>.*showBay\('L2_West'\)/);        // the Now screen remembers where
});
test('focusing a level shows its counts; Level 1 shows it has no student stalls', () => {
  const b = boot();
  b.run('focusLevel(3)');
  assert.match(b.els.levelFocus.innerHTML, /<b class="n">25<\/b>open on Level 3 · counted/);
  assert.match(b.els.bayPick.innerHTML, /West<b>6<\/b>.*Centre<b>0<\/b>.*East<b>11<\/b>.*North<b>3<\/b>.*South<b>5<\/b>/);
  assert.match(b.els.levelPick.innerHTML, /aria-pressed="true" onclick="focusLevel\(3\)">Level 3/);
  b.run('focusLevel(1)');
  assert.match(b.els.levelFocus.innerHTML, /<b class="n">0<\/b>student stalls on Level 1\. Faculty and staff only: 174 stalls\./);
  b.run('focusLevel(1)');                                                           // tapping the same level again shows all
  assert.equal(b.els.levelFocus.innerHTML, '');
  b.run("focusLevel(2); selectBay('L2_West')");                                      // a bay stands alone: buttons for its level, its own line below
  assert.match(b.els.bayPick.innerHTML, /aria-pressed="true" onclick="selectBay\('L2_West'\)" aria-label="Level 2 · West bay">West<b>4<\/b>/);
  assert.match(b.els.selection.textContent, /Level 2 · West bay/);
  b.run("$('ownerPass').value = 'monitor'; unlock('ownerPass','ownerPassMsg')");      // the monitor password does not open the project tools
  assert.match(b.els.ownerPassMsg.textContent, /not the password/);
  b.run("$('ownerPass').value = 'staff'; unlock('ownerPass','ownerPassMsg')");
  assert.equal(b.storage['park-ai-owner-ok-v1'], '1'); assert.equal(b.storage['park-ai-staff-ok-v1'], undefined);
});
test('guided path: pick on Now, drive, I parked here, optional fullness, back to Now', () => {
  const b = boot();
  assert.match(b.els.verdict.innerHTML, /onclick="startTrip\('L3_East'\)"/);       // the answers on Now start the path
  b.run("startTrip('L3_East')");
  assert.match(b.els.tripCard.innerHTML, /Step 2 of 3 · drive there.*Level 3 · East bay.*<b>11<\/b> open.*parkHere\('L3_East'\)">I parked here/);
  assert.match(b.els.guideText.textContent, /Drive to Level 3 · East bay/);
  b.run("parkHere('L3_East')");
  assert.match(b.els.tripCard.innerHTML, /Step 3 of 3 · parked.*You parked in Level 3 · East bay.*To campus: Level 3, north-east corner.*How full is it\?/);
  b.run("reportBay('few')");                                                        // the optional last tap ends the path on Now
  assert.equal(b.els.tripCard.innerHTML, '');
  assert.match(b.els.parkedNow.innerHTML, /You parked in <b>Level 3 · East bay<\/b>/);
  b.run("startTrip('L2_West'); endTrip()");                                         // "Pick another bay" goes back without checking in
  assert.equal(b.els.tripCard.innerHTML, '');
});
// ---- AI assist and field log (the model is replaced by a stub that returns a fixed count) ----
const photo = () => ({ files: [{}], value: 'x' });
(async () => {
  const atest = async (name, fn) => { await fn(); pass++; console.log('ok -', name); };
  await atest('tester review needs every question, then sends one anonymous record', async () => {
  const sent = [];
  const b = boot({}, { syncUrl: 'https://example.invalid', fetch: async (u, o) => { sent.push([u, o && o.body]); return { ok: true, json: async () => ({}) }; } });
  sent.length = 0;
  b.run("answerReview('easy','Yes')"); await b.run('sendReview()');
  assert.match(b.els.reviewNote.textContent, /3 left/);
  assert.equal(sent.filter(s => /poll\.json/.test(s[0])).length, 0);
  b.run("answerReview('use','Maybe'); answerReview('trust','Somewhat'); answerReview('best','Now')");
  b.run("$('reviewText').value = 'Add East Deck'");
  await b.run('sendReview()');
  const rec = JSON.parse(sent.find(s => /poll\.json/.test(s[0]))[1]);
  assert.deepEqual(Object.keys(rec).sort(), ['best', 'easy', 'kind', 't', 'text', 'trust', 'use']);
  assert.equal(rec.kind, 'app-review'); assert.equal(rec.text, 'Add East Deck');
});
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
