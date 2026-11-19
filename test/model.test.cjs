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
  assert.equal(m.status(r, t + 5 * MIN), 'stale');   // 5 min after START, though only 1 after end
  assert.equal(m.status(r, t + 15 * MIN), 'unknown');
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

test('level total only when all bays recent', () => {
  const rec = c => ({ count: c, start: t, end: t, version: 1, category: CAT });
  const all = { L1_West: rec(3), L1_Centre: rec(0), L1_East: rec(5) };
  assert.deepEqual(m.levelSummary(all, zones, t), { state: 'complete', total: 8 });
  const old = { ...all, L1_East: { ...rec(5), start: t - 6 * MIN } };
  assert.deepEqual(m.levelSummary(old, zones, t), { state: 'partial', atLeast: 3, recentBays: 2, bays: 3 });
  assert.deepEqual(m.levelSummary({}, zones, t), { state: 'unknown' });
});

test('sanitize drops malformed or unknown entries', () => {
  const good = { count: 2, start: t, end: t, version: 1, category: CAT };
  const out = m.sanitize({ L1_West: good, L1_East: { count: '<img src=x>', start: t, end: t, version: 1, category: CAT },
    L9_Nowhere: good, L1_Centre: { ...good, end: t - 1 } }, zones);
  assert.deepEqual(Object.keys(out), ['L1_West']);
  assert.equal(out.L1_West.method, 'manual');
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
