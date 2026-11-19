// Run: node test/model.test.cjs   (pure logic, no browser)
const assert = require('node:assert/strict');
const m = require('../src/model.js');
const t = 1_000_000_000, MIN = 60e3, CAT = 'Example general permit (illustrative)';
const zones = ['L1_West', 'L1_Centre', 'L1_East'];
let pass = 0; const test = (name, fn) => { fn(); pass++; console.log('ok -', name); };

test('no record is unknown, not zero', () => assert.equal(m.status(null, t), 'unknown'));
test('age is measured from survey start', () => {
  const r = { start: t, end: t + 4 * MIN };
  assert.equal(m.status(r, t + 4 * MIN), 'recent');
  assert.equal(m.status(r, t + 5 * MIN), 'estimate'); // 5 min after START, though only 1 after end
  assert.equal(m.status(r, t + 29 * MIN), 'estimate');
  assert.equal(m.status(r, t + 30 * MIN), 'unknown');
});
test('future-dated record is unknown', () => assert.equal(m.status({ start: t + MIN, end: t + MIN }, t), 'unknown'));

test('completed survey replaces, never adds', () => {
  let r = m.complete({}, { zone: 'L1_West', start: t, version: 0 }, 10, t + MIN, CAT);
  r = m.complete(r, { zone: 'L1_West', start: t + 2 * MIN, version: 1 }, 3, t + 3 * MIN, CAT);
  assert.equal(r.L1_West.count, 3);
  assert.equal(r.L1_West.version, 2);
});
test('zones are independent', () => {
  let r = m.complete({}, { zone: 'L1_West', start: t, version: 0 }, 4, t, CAT);
  r = m.complete(r, { zone: 'L1_East', start: t, version: 0 }, 0, t, CAT);
  assert.equal(r.L1_West.count, 4); assert.equal(r.L1_East.count, 0);
});
test('zero is a real observation', () => {
  const r = m.complete({}, { zone: 'L1_West', start: t, version: 0 }, 0, t, CAT);
  assert.equal(m.status(r.L1_West, t), 'recent'); assert.equal(r.L1_West.count, 0);
});
test('stale survey version is rejected (no silent overwrite)', () => {
  const r = m.complete({}, { zone: 'L1_West', start: t, version: 0 }, 4, t, CAT);
  assert.throws(() => m.complete(r, { zone: 'L1_West', start: t, version: 0 }, 9, t, CAT), /newer survey/);
});
test('invalid counts rejected', () => {
  for (const n of [-1, 1.5, 1000, NaN, '5'])
    assert.throws(() => m.complete({}, { zone: 'L1_West', start: t, version: 0 }, n, t, CAT));
});
test('survey open too long is rejected', () => {
  assert.throws(() => m.complete({}, { zone: 'L1_West', start: t, version: 0 }, 5, t + 21 * MIN, CAT), /20 minutes/);
  assert.doesNotThrow(() => m.complete({}, { zone: 'L1_West', start: t, version: 0 }, 5, t + 20 * MIN, CAT));
});
test('category is required and stored', () => {
  assert.throws(() => m.complete({}, { zone: 'L1_West', start: t, version: 0 }, 5, t, ''));
  assert.equal(m.complete({}, { zone: 'L1_West', start: t, version: 0 }, 5, t, CAT).L1_West.category, CAT);
});

const rec = (c, minsAgo = 0, prev) => ({ count: c, start: t - minsAgo * MIN, end: t - minsAgo * MIN, version: 1, category: CAT, ...(prev ? { prev } : {}) });

test('a fresh count is shown as counted; an ageing one becomes a range that widens', () => {
  assert.deepEqual(m.estimate(rec(14, 2), t), { low: 14, high: 14, mid: 14, rate: 0, counted: true });
  const e9 = m.estimate(rec(14, 9), t), e25 = m.estimate(rec(14, 25), t);
  assert.deepEqual(e9, { low: 10, high: 18, mid: 14, rate: 0, counted: false }); // 0.8 * sqrt(9) * 1.64 = 3.9
  assert.ok(e25.high - e25.low > e9.high - e9.low);
  assert.equal(m.estimate(rec(14, 30), t), null);
  assert.equal(m.estimate(undefined, t), null);
});
test('a trend from the last two counts moves the estimate and widens it', () => {
  const filling = rec(14, 10, { count: 24, start: t - 20 * MIN }); // lost 10 spaces in 10 min
  assert.deepEqual(m.trend(filling), { rate: 1, gapMin: 10 });
  const e = m.estimate(filling, t), flat = m.estimate(rec(14, 10), t);
  assert.equal(e.mid, 4); assert.equal(e.rate, 1);
  assert.equal(e.low, 0);                                   // never below zero
  assert.ok(e.high - e.mid > flat.high - flat.mid);         // a two-point trend is itself uncertain
  assert.equal(m.trend(rec(14, 10, { count: 15, start: t - 11 * MIN })), null); // 1 min apart: noise, not a trend
  assert.equal(m.trend(rec(14, 10, { count: 15, start: t - 50 * MIN })), null); // 40 min apart: too old
});
test('complete() keeps the replaced count only as the trend reference', () => {
  let r = m.complete({}, { zone: 'L1_West', start: t, version: 0 }, 20, t, CAT);
  assert.equal(r.L1_West.prev, undefined);
  r = m.complete(r, { zone: 'L1_West', start: t + 6 * MIN, version: 1 }, 14, t + 7 * MIN, CAT);
  assert.deepEqual(r.L1_West.prev, { count: 20, start: t });
  assert.equal(r.L1_West.count, 14);
});
test('level summary: exact, range, partial, unknown', () => {
  const all = { L1_West: rec(3), L1_Centre: rec(0), L1_East: rec(5) };
  assert.deepEqual(m.levelSummary(all, zones, t), { state: 'complete', low: 8, high: 8, exact: true, students: false, knownBays: 3, bays: 3 });
  const ageing = { ...all, L1_East: rec(5, 9) };
  assert.deepEqual(m.levelSummary(ageing, zones, t), { state: 'complete', low: 4, high: 12, exact: false, students: false, knownBays: 3, bays: 3 });
  const gone = { ...all, L1_East: rec(5, 31) };
  assert.deepEqual(m.levelSummary(gone, zones, t), { state: 'partial', low: 3, high: 3, exact: true, students: false, knownBays: 2, bays: 3 });
  assert.deepEqual(m.levelSummary({}, zones, t), { state: 'unknown', knownBays: 0, bays: 3 });
});
test('deck verdict: room, tight, full, unknown', () => {
  const v = recs => m.deckSummary(recs, zones, t).verdict;
  assert.equal(v({ L1_West: rec(12) }), 'room');                                    // at least 12, whatever the rest holds
  assert.equal(v({ L1_West: rec(3), L1_Centre: rec(3), L1_East: rec(2) }), 'tight');
  assert.equal(v({ L1_West: rec(1), L1_Centre: rec(0), L1_East: rec(2) }), 'full');
  assert.equal(v({ L1_West: rec(1), L1_Centre: rec(0) }), 'unknown');               // the third bay could hold anything
  assert.equal(v({}), 'unknown');
});
test('bay state is judged on the low end of the estimate', () => {
  const st = r => m.bayState(r, t).state;
  assert.equal(st(rec(11)), 'room'); assert.equal(st(rec(4)), 'few'); assert.equal(st(rec(0)), 'full');
  assert.equal(st(rec(14, 9)), 'room');   // range 10-18
  assert.equal(st(rec(6, 9)), 'few');     // range 2-10: might be nearly gone
  assert.equal(st(rec(0, 9)), 'few');     // range 0-4: a space may have opened
  assert.equal(st(undefined), 'unknown'); assert.equal(st(rec(9, 31)), 'unknown');
});
test('recommendation ranks bays by spaces, then freshness, and never suggests a full or unknown bay', () => {
  const recs = { L1_West: rec(6, 2), L1_Centre: rec(0, 1), L1_East: rec(6, 1) };
  assert.deepEqual(m.recommend(recs, zones, t).map(b => b.zone), ['L1_East', 'L1_West']);
  assert.deepEqual(m.recommend({ L1_West: rec(0), L1_Centre: rec(3, 31) }, zones, t), []);
  assert.equal(m.recommend(recs, zones, t, 1).length, 1);
});
const rep = (zone, band, minsAgo) => ({ zone, band, t: t - minsAgo * MIN });
test('a student report fills in an unknown bay, and expires', () => {
  const e = m.bayEstimate(undefined, [rep('L1_West', 'few', 2)], 'L1_West', t);
  assert.equal(e.source, 'students'); assert.deepEqual([e.low, e.high, e.students], [1, 4, 1]);
  assert.equal(m.bayEstimate(undefined, [rep('L1_West', 'few', 11)], 'L1_West', t), null);  // older than 10 min
  assert.equal(m.bayEstimate(undefined, [rep('L1_East', 'few', 2)], 'L1_West', t), null);   // a different bay
  assert.equal(m.bayEstimate(undefined, [rep('L1_West', 'plenty', 1)], 'L1_West', t).high, Infinity);
});
test('a fresh staff count always beats student reports', () => {
  const e = m.bayEstimate(rec(6, 2), [rep('L1_West', 'full', 1)], 'L1_West', t);
  assert.equal(e.source, 'counted'); assert.equal(e.low, 6);
});
test('a report newer than an ageing staff count narrows it, or replaces it when they disagree', () => {
  const ageing = rec(6, 9);                                       // estimate 2-10
  const agree = m.bayEstimate(ageing, [rep('L1_West', 'few', 3)], 'L1_West', t);
  assert.deepEqual([agree.low, agree.high, agree.source], [2, 4, 'students']);   // overlap of 2-10 and 1-4
  const clash = m.bayEstimate(ageing, [rep('L1_West', 'full', 3)], 'L1_West', t);
  assert.deepEqual([clash.low, clash.high], [0, 0]);
  const before = m.bayEstimate(ageing, [rep('L1_West', 'full', 12)], 'L1_West', t);
  assert.equal(before.source, 'estimate');                        // report made before the staff count: ignored
});
test('the newest report wins and agreeing reports are counted', () => {
  const e = m.bayEstimate(undefined, [rep('L1_West', 'plenty', 8), rep('L1_West', 'few', 3), rep('L1_West', 'few', 1)], 'L1_West', t);
  assert.deepEqual([e.band, e.students], ['few', 2]);
});
test('student reports flow into bay state, summaries, the verdict and the recommendation', () => {
  const reports = [rep('L1_West', 'plenty', 2), rep('L1_Centre', 'full', 2)];
  assert.equal(m.bayState(undefined, t, reports, 'L1_West').state, 'room');
  assert.equal(m.bayState(undefined, t, reports, 'L1_Centre').state, 'full');
  const s = m.levelSummary({}, zones, t, reports);
  assert.deepEqual([s.state, s.low, s.high, s.students, s.knownBays], ['partial', 5, Infinity, true, 2]);
  assert.equal(m.deckSummary({ L1_East: rec(6) }, zones, t, reports).verdict, 'room');
  assert.deepEqual(m.recommend({}, zones, t, 3, reports).map(b => b.zone), ['L1_West']);
});
test('reports from storage or the network are validated', () => {
  const out = m.cleanReports([rep('L1_West', 'few', 1), { zone: 'L9_X', band: 'few', t }, { zone: 'L1_West', band: '<b>', t }, { zone: 'L1_West', band: 'full', t: t + 3600e3 }, null, 'x'], zones, t);
  assert.deepEqual(out, [rep('L1_West', 'few', 1)]);
  assert.deepEqual(m.cleanReports('junk', zones, t), []);
});
test('typical-at-this-hour needs enough past counts from earlier days', () => {
  const DAY = 1440 * MIN, h = (days, offMin, count, zone = 'L1_West') => ({ zone, t: t - days * DAY + offMin * MIN, count });
  const hist = [h(1, 10, 4), h(2, -20, 9), h(7, 0, 6), h(1, 200, 30), h(1, 5, 50, 'L1_East')];
  assert.deepEqual(m.typical(hist, 'L1_West', t), { low: 4, high: 9, samples: 3 });   // the +200 min count and the other bay are excluded
  assert.equal(m.typical(hist.slice(0, 2), 'L1_West', t), null);                       // only two samples
  assert.equal(m.typical([{ zone: 'L1_West', t: t - 30 * MIN, count: 5 }, h(1, 0, 5), h(2, 0, 5)], 'L1_West', t), null); // today's count does not count as history
});
test('backtest scores the estimate against later real counts', () => {
  assert.equal(m.backtest([[{ t, count: 5 }]]), null);
  const steady = [0, 6, 12, 18].map(k => ({ t: t + k * MIN, count: 20 - k })); // loses one space a minute
  const b = m.backtest([steady]);
  assert.equal(b.cases, 6);
  assert.equal(b.inside, 3); // the first count has no trend yet, so its three estimates miss the steady fall;
                             // once a second count gives the trend, all three later estimates hold
  assert.ok(b.meanAbsError > 5 && b.meanAbsError < 7);
  const jumpy = [{ t, count: 20 }, { t: t + 6 * MIN, count: 2 }];             // far outside any honest range
  assert.deepEqual(m.backtest([jumpy]), { cases: 1, inside: 0, meanAbsError: 18 });
});
test('variability is measured from consecutive counts', () => {
  assert.equal(m.variability([[{ t, count: 5 }]]), null);
  assert.equal(m.variability([[{ t, count: 10 }, { t: t + 4 * MIN, count: 6 }]]), 2); // sqrt(16 / 4)
});

test('sanitize drops malformed or unknown entries', () => {
  const good = { count: 2, start: t, end: t, version: 1, category: CAT };
  const out = m.sanitize({ L1_West: good, L1_East: { count: '<img src=x>', start: t, end: t, version: 1, category: CAT },
    L9_Nowhere: good, L1_Centre: { ...good, end: t - 1 } }, zones);
  assert.deepEqual(Object.keys(out), ['L1_West']);
  assert.equal(out.L1_West.method, 'manual');
  const withPrev = m.sanitize({ L1_West: { ...good, prev: { count: 9, start: t - MIN } }, L1_Centre: { ...good, prev: { count: 'x', start: t - MIN } } }, zones);
  assert.deepEqual(withPrev.L1_West.prev, { count: 9, start: t - MIN });
  assert.equal(withPrev.L1_Centre.prev, undefined);
  assert.deepEqual(m.sanitize(null, zones), {});
  assert.deepEqual(m.sanitize('junk', zones), {});
});

test('AI-assisted counts keep AI and confirmed numbers per photo', () => {
  const r = m.complete({}, { zone: 'L1_West', start: t, version: 0 }, 18, t, CAT,
    { photos: [{ ai: 30, confirmed: 31 }, { ai: 29, confirmed: 30 }, { ai: 'x', confirmed: 2 }, null] });
  assert.equal(r.L1_West.method, 'ai-assisted');
  assert.deepEqual(r.L1_West.photos, [{ ai: 30, confirmed: 31 }, { ai: 29, confirmed: 30 }]); // junk dropped
  assert.equal(m.complete({}, { zone: 'L1_West', start: t, version: 0 }, 5, t, CAT).L1_West.method, 'manual');
});
test('suggested open = stalls - confirmed vehicles, floor at zero', () => {
  assert.deepEqual(m.suggestOpen(79, [{ ai: 30, confirmed: 31 }, { ai: 29, confirmed: 30 }]), { vehicles: 61, open: 18 });
  assert.deepEqual(m.suggestOpen(10, [{ ai: 12, confirmed: 12 }]), { vehicles: 12, open: 0 });
});
test('AI accuracy summary counts misses and extras', () => {
  assert.equal(m.aiAccuracy([]), null);
  assert.deepEqual(m.aiAccuracy([{ ai: 8, confirmed: 10 }, { ai: 5, confirmed: 5 }, { ai: 7, confirmed: 6 }]),
    { photos: 3, exact: 1, meanAbsError: 1, missed: 2, extra: 1 });
});

console.log(`\n${pass} model tests passed.`);
