// Summarises a field log exported from the app (Staff survey -> Export field log).
//   node scripts/analyze-field.cjs data/field/2026-11-19-bay-counts.csv
// Prints open stalls per pass, change between passes, and how the page's estimates would have done.
const fs = require('node:fs'), path = require('node:path');
const model = require('../src/model.js'), deck = require('../data/deck.json');
const file = process.argv[2]; if (!file) { console.error('usage: node scripts/analyze-field.cjs <field-log.csv>'); process.exit(1); }
const [head, ...lines] = fs.readFileSync(file, 'utf8').trim().split('\n');
const cols = head.split(','), rows = lines.map(l => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v])))
  .map(r => ({ zone: r.zone, observer: r.observer, t: Date.parse(r.start_iso), end: Date.parse(r.end_iso), open: +r.open_count, seconds: +r.duration_s, photos: r['per_photo_ai>confirmed'] }))
  .filter(r => deck.zones[r.zone]).sort((a, b) => a.t - b.t);
const time = t => new Date(t).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
const regular = Object.values(deck.zones).reduce((n, z) => n + z.stalls, 0);

// A "pass" = consecutive counts with no bay repeated.
const passes = []; let cur = [];
for (const r of rows) { if (cur.some(c => c.zone === r.zone)) { passes.push(cur); cur = []; } cur.push(r); }
if (cur.length) passes.push(cur);
passes.forEach((p, i) => {
  const open = p.reduce((n, r) => n + r.open, 0), byLevel = {};
  for (const r of p) byLevel[deck.zones[r.zone].level] = (byLevel[deck.zones[r.zone].level] || 0) + r.open;
  const top = [...p].sort((a, b) => b.open - a.open).slice(0, 3);
  console.log(`Pass ${i + 1}: ${time(p[0].t)}-${time(p.at(-1).end)} (${((p.at(-1).end - p[0].t) / 60e3).toFixed(1)} min, ${p.length} bays). Open regular stalls: ${open} of ${regular} (${(100 * (1 - open / regular)).toFixed(0)}% taken). ` +
    `By level: ${Object.entries(byLevel).map(([l, n]) => 'L' + l + ' ' + n).join(', ')}. Top 3 bays hold ${top.reduce((n, r) => n + r.open, 0)}: ${top.map(r => r.zone + ' ' + r.open).join(', ')}`);
});
const series = {}; for (const r of rows) (series[r.zone] ??= []).push({ t: r.t, count: r.open });
const changes = Object.entries(series).filter(([, s]) => s.length > 1).map(([z, s]) => ({ z, d: s.at(-1).count - s[0].count, min: (s.at(-1).t - s[0].t) / 60e3 }));
if (changes.length) {
  console.log(`Change between first and last count of each bay (${changes.length} bays, ${Math.min(...changes.map(c => c.min)).toFixed(0)}-${Math.max(...changes.map(c => c.min)).toFixed(0)} min apart): ` +
    `mean absolute change ${(changes.reduce((n, c) => n + Math.abs(c.d), 0) / changes.length).toFixed(1)} stalls, largest ${Math.max(...changes.map(c => Math.abs(c.d)))}, net ${changes.reduce((n, c) => n + c.d, 0)}.`);
  const bt = model.backtest(Object.values(series)), v = model.variability(Object.values(series));
  console.log(bt ? `Estimate check: the later count fell inside the page's range in ${bt.inside} of ${bt.cases} cases; the middle estimate missed by ${bt.meanAbsError.toFixed(1)} stalls on average. ` +
    `Measured variability ${v.toFixed(2)} (the page assumes ${model.SIGMA}).` : 'Estimate check: no pairs of counts 5-30 minutes apart.');
}
const photos = rows.flatMap(r => r.photos ? r.photos.split('|').map(p => { const [ai, confirmed] = p.split('>').map(Number); return { ai, confirmed }; }) : []);
const acc = model.aiAccuracy(photos);
console.log(acc ? `Camera AI test: ${acc.photos} photos, exact on ${acc.exact}, average error ${acc.meanAbsError.toFixed(1)} vehicles.` : 'Camera AI test: no photos.');
const manual = rows.filter(r => !r.photos).map(r => r.seconds).sort((a, b) => a - b);
console.log(`Time from "start" to "complete" for a tallied bay: median ${manual[Math.floor(manual.length / 2)]} s (range ${manual[0]}-${manual.at(-1)} s, ${manual.length} counts).`);
