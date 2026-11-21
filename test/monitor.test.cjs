// The monitor's judgement: given what it saw, which alerts does it raise? No network; the clock is passed in.
const assert = require('assert'), { evaluate } = require('../scripts/monitor.cjs');
const cfg = require('../monitor/config.json');
let pass = 0; const test = (name, fn) => { fn(); pass++; console.log('ok -', name); };
const now = Date.parse('2026-11-21T15:00:00Z'), MIN = 60e3;
const page = '<meta http-equiv="Content-Security-Policy" content="x"><title>Park.AI: West Deck</title>';
const count = (extra = {}) => ({ count: 12, start: now - 9 * MIN, end: now - 8 * MIN, version: 1, category: 'Regular student stalls', ...extra });
const healthy = () => ({ site: { status: 200, text: page }, model: { status: 200 },
  db: { status: 200, counts: { L3_West: count() }, reports: {}, history: {}, pollcount: {}, signals: {} }, probes: { readSurveys: 401, write: 401, remove: 401 } });
const ids = snap => evaluate(snap, cfg, now).map(a => a.id);
const many = (n, make) => Object.fromEntries(Array.from({ length: n }, (_, i) => ['k' + i, make(i)]));

test('a healthy site and database raise nothing', () => assert.deepEqual(ids(healthy()), []));
test('the site not loading is an alert, and so is a page that is not ours', () => {
  const down = healthy(); down.site = { status: 503, text: '' }; assert.deepEqual(ids(down), ['site-down']);
  const none = healthy(); none.site = { status: 0, text: '' }; assert.deepEqual(ids(none), ['site-down']);
  const swapped = healthy(); swapped.site.text = '<title>Hacked</title>'; assert.deepEqual(ids(swapped), ['site-changed']);
});
test('a missing model and an unreachable database are separate alerts', () => {
  const s = healthy(); s.model.status = 404; s.db = { status: 0 }; assert.deepEqual(ids(s), ['model-missing', 'database-down']);
});
test('a lock that opens is an alert: readable surveys, open writes, deletable counts', () => {
  const s = healthy(); s.probes = { readSurveys: 200, write: 200, remove: 200 };
  assert.deepEqual(ids(s), ['surveys-readable', 'rules-open', 'rules-old']);
});
test('a flood is an alert only past the limit, and only inside the window', () => {
  const s = healthy(); s.db.reports = many(cfg.reportsPerWindow, () => ({ zone: 'L2_North', band: 'few', t: now - MIN }));
  assert.deepEqual(ids(s), []);                                                    // exactly at the limit: a busy morning, not an attack
  s.db.reports.extra = { zone: 'L2_North', band: 'few', t: now - MIN }; assert.deepEqual(ids(s), ['flood-reports']);
  const old = healthy(); old.db.reports = many(500, () => ({ zone: 'L2_North', band: 'few', t: now - 3 * 60 * MIN }));
  assert.deepEqual(ids(old), []);                                                  // yesterday's reports are not today's flood
  const both = healthy(); both.db.history = many(cfg.countsPerWindow + 1, () => ({ zone: 'L3_West', t: now - MIN, count: 3 }));
  both.db.pollcount = many(cfg.surveysPerWindow + 1, () => ({ t: now - MIN })); assert.deepEqual(ids(both), ['flood-counts', 'flood-surveys']);
});
test('a malformed or future-dated count is noticed', () => {
  const s = healthy(); s.db.counts.L2_North = { count: 'lots', start: 1, end: 2, version: 1, category: 'x' }; s.db.counts.L3_East = count({ start: now + 60 * MIN, end: now + 61 * MIN });
  const a = evaluate(s, cfg, now); assert.deepEqual(a.map(x => x.id), ['bad-count']); assert.match(a[0].text, /L2_North/); assert.match(a[0].text, /L3_East/);
});
test('one failed sign-in is quiet; repeated ones are an alert', () => {
  const s = healthy(); s.db.signals = many(cfg.failedSignInsPerWindow - 1, () => ({ t: now - MIN, kind: 'signin' })); assert.deepEqual(ids(s), []);
  s.db.signals.more = { t: now - MIN, kind: 'signin' }; assert.deepEqual(ids(s), ['failed-signins']);
});
test('script errors and refused writes from phones are alerts past their limits', () => {
  const s = healthy(); s.db.signals = { ...many(cfg.scriptErrorsPerWindow, () => ({ t: now - MIN, kind: 'js' })), ...Object.fromEntries(Object.entries(many(cfg.refusedWritesPerWindow, () => ({ t: now - MIN, kind: 'refused' }))).map(([k, v]) => ['r' + k, v])) };
  assert.deepEqual(ids(s), ['app-errors', 'refused-writes']);
});
test('signals that cannot be read yet (rules not pasted) do not break the other checks', () => {
  const s = healthy(); s.db.signals = undefined; s.probes.remove = 200; assert.deepEqual(ids(s), ['rules-old']);
});
console.log(`\n${pass} monitor tests passed.`);
