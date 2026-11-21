// The monitor: looks at the live site and the shared database from the outside, and raises one alert when
// something is broken or looks like an attack. Run every few minutes by .github/workflows/monitor.yml.
//
//   node scripts/monitor.cjs            look, and print what was found
//   node scripts/monitor.cjs --report   also open, update or close the alert issue on GitHub (needs gh and GH_TOKEN)
//
// evaluate() is pure (a snapshot and a clock in, alerts out) and is tested in test/monitor.test.cjs.
// Thresholds are in monitor/config.json; docs/MONITORING.md explains each alert and how to tune it.
const fs = require('fs'), path = require('path');
const ParkingModel = require('../src/model.js');
const deck = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/deck.json'), 'utf8'));
const ZONES = Object.keys(deck.zones);

const values = o => o && typeof o === 'object' ? Object.values(o) : [];
const recent = (list, now, ms) => list.filter(e => e && Number.isFinite(e.t) && e.t > now - ms && e.t <= now + 6e5);

// snapshot: { site: { status, text }, model: { status }, db: { status, counts, reports, history, pollcount, signals },
//             probes: { readSurveys, write, remove } }   (a status of 0 means the request itself failed)
function evaluate(snap, cfg, now) {
  const out = [], add = (id, text) => out.push({ id, text });
  const win = cfg.windowMinutes * 60e3, per = `in ${cfg.windowMinutes} minutes`;

  // 1. Is it up, and is it still our page?
  if (snap.site.status !== 200) add('site-down', `The site did not load (status ${snap.site.status || 'no answer'}). Students cannot open the app.`);
  else if (!/<title>[^<]*Park\.AI/i.test(snap.site.text) || !/Content-Security-Policy/.test(snap.site.text))
    add('site-changed', 'The site loaded but is missing its title or its security policy. It may have been replaced or published broken.');
  if (snap.site.status === 200 && snap.model.status !== 200) add('model-missing', `The AI model file did not load (status ${snap.model.status || 'no answer'}). The camera count will not work.`);
  if (snap.db.status !== 200) add('database-down', `The shared database did not answer (status ${snap.db.status || 'no answer'}). Shared mode and surveys are not working.`);

  // 2. Are the locks still locked? Each probe is a request that must be refused.
  if (snap.probes.readSurveys === 200) add('surveys-readable', 'URGENT: survey answers can be read by anyone. The database rules have been loosened. Paste firebase/rules.json back now.');
  if (snap.probes.write === 200) add('rules-open', 'URGENT: the database accepted a write outside the app\'s data. The rules are open. Paste firebase/rules.json back now.');
  if (snap.probes.remove === 200) add('rules-old', 'The database still allows counts to be deleted, so the hardened rules are not in place. Paste firebase/rules.json into the Firebase console (Realtime Database, Rules).');

  // 3. Is someone flooding it, or has a bad record got in?
  if (snap.db.status === 200) {
    const n = (list) => recent(values(list), now, win).length;
    const reports = n(snap.db.reports), counts = n(snap.db.history), surveys = n(snap.db.pollcount);
    if (reports > cfg.reportsPerWindow) add('flood-reports', `${reports} student reports ${per} (limit ${cfg.reportsPerWindow}). Likely a script, not students.`);
    if (counts > cfg.countsPerWindow) add('flood-counts', `${counts} staff counts ${per} (limit ${cfg.countsPerWindow}). No monitor counts that fast.`);
    if (surveys > cfg.surveysPerWindow) add('flood-surveys', `${surveys} survey answers ${per} (limit ${cfg.surveysPerWindow}). Check the answers before using them.`);
    const stored = snap.db.counts && typeof snap.db.counts === 'object' ? snap.db.counts : {}, good = ParkingModel.sanitize(stored, ZONES);
    const bad = Object.keys(stored).filter(z => !good[z] || good[z].end > now + 6e5);
    if (bad.length) add('bad-count', `A stored count is malformed or dated in the future (${bad.slice(0, 5).join(', ')}). The app ignores it, but something wrote it.`);

    // 4. What the app itself reported from people's phones.
    const kinds = {}; for (const s of recent(values(snap.db.signals), now, win)) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
    if ((kinds.js || 0) >= cfg.scriptErrorsPerWindow) add('app-errors', `${kinds.js} script errors reported by phones ${per}. The last publish may have broken something. Messages are in the Firebase console under v1/errors.`);
    if ((kinds.signin || 0) >= cfg.failedSignInsPerWindow) add('failed-signins', `${kinds.signin} failed monitor sign-ins ${per}. One forgotten password is a few; this many is someone guessing.`);
    if ((kinds.refused || 0) >= cfg.refusedWritesPerWindow) add('refused-writes', `${kinds.refused} entries refused by the database ${per}. Either the rules and the app disagree, or someone is sending bad data through the app.`);
    if ((kinds.ai || 0) >= cfg.aiFailuresPerWindow) add('ai-failures', `${kinds.ai} AI count failures ${per}.`);
  }
  return out;
}

// ---- Looking: every request is read-only except two probes that a correctly locked database refuses. ----
async function look(cfg, base) {
  const get = async (url, opt) => { try { const r = await fetch(url, opt); return { status: r.status, r }; } catch (e) { return { status: 0 }; } };
  const json = async (p) => { const { status, r } = await get(base + p); return status === 200 ? await r.json().catch(() => null) : undefined; };
  const page = await get(cfg.site + '?monitor=' + Date.now(), { cache: 'no-store' });
  const snap = { site: { status: page.status, text: page.status === 200 ? await page.r.text() : '' }, model: await get(cfg.site + 'ai/yolox_s.onnx', { method: 'HEAD' }), db: {}, probes: {} };
  const counts = await get(base + '/v1/counts.json');
  snap.db.status = counts.status; snap.db.counts = counts.status === 200 ? await counts.r.json().catch(() => null) : null;
  const newest = n => `?orderBy=%22%24key%22&limitToLast=${n}`;
  snap.db.reports = await json('/v1/reports.json' + newest(500)); snap.db.history = await json('/v1/history.json' + newest(500));
  snap.db.pollcount = await json('/v1/pollcount.json' + newest(500)); snap.db.signals = await json('/v1/signals.json' + newest(500));
  snap.probes.readSurveys = (await get(base + '/v1/poll.json?shallow=true')).status;
  snap.probes.write = (await get(base + '/v1/monitor-probe.json', { method: 'PUT', body: JSON.stringify({ t: Date.now() }) })).status;
  if (snap.probes.write === 200) await get(base + '/v1/monitor-probe.json', { method: 'DELETE' }); // it should not have got in; take it out again
  snap.probes.remove = (await get(base + '/v1/counts/monitor-probe.json', { method: 'DELETE' })).status; // deleting a bay that does not exist changes nothing
  return snap;
}

// ---- Telling: one open issue at a time. A new alert opens it (GitHub emails the owner), a change adds a comment,
// the same alerts again say nothing, and all clear closes it. That is the tuning: no email every five minutes. ----
function report(alerts, owner) {
  const { execFileSync } = require('child_process'), LABEL = 'park-ai-alert';
  const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' });
  const ids = alerts.map(a => a.id).sort().join(','), stamp = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const list = alerts.map(a => `- **${a.id}**: ${a.text}`).join('\n');
  const open = JSON.parse(gh('issue', 'list', '--label', LABEL, '--state', 'open', '--json', 'number,body', '--limit', '1'))[0];
  if (!alerts.length) { if (open) { gh('issue', 'close', String(open.number), '--comment', `All clear at ${stamp}. Every check passed.`); console.log('closed the alert'); } return; }
  const body = `${list}\n\nChecked ${stamp} by the monitor (\`scripts/monitor.cjs\`). What each alert means and what to do: \`docs/MONITORING.md\`.\n\n<!-- ids:${ids} -->`;
  if (!open) {
    try { gh('label', 'create', LABEL, '--color', 'B60205', '--description', 'Raised by the monitor', '--force'); } catch (e) {}
    gh('issue', 'create', '--label', LABEL, '--title', `Park.AI alert: ${alerts[0].id}${alerts.length > 1 ? ` and ${alerts.length - 1} more` : ''}`, '--body', `@${owner} the monitor found a problem.\n\n${body}`);
    console.log('opened an alert');
  } else if (!(open.body || '').includes(`<!-- ids:${ids} -->`)) {
    gh('issue', 'edit', String(open.number), '--body', body); gh('issue', 'comment', String(open.number), '--body', `Changed at ${stamp}:\n\n${list}`);
    console.log('updated the alert');
  } else console.log('same alerts as before; nothing sent');
}

if (require.main === module) (async () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../monitor/config.json'), 'utf8'));
  const base = String(require('../src/settings.js').syncUrl || '').replace(/\/+$/, '');
  const snap = await look(cfg, base), alerts = evaluate(snap, cfg, Date.now());
  if (process.argv.includes('--test-alert')) alerts.push({ id: 'test', text: 'This is a test of the alert system, sent on request. Nothing is wrong. It closes itself on the next check.' });
  console.log(`site ${snap.site.status}, model ${snap.model.status}, database ${snap.db.status}, probes ${JSON.stringify(snap.probes)}, signals ${snap.db.signals === undefined ? 'not readable yet (paste firebase/rules.json)' : values(snap.db.signals).length}`);
  console.log(alerts.length ? alerts.map(a => `ALERT ${a.id}: ${a.text}`).join('\n') : 'All clear.');
  if (process.argv.includes('--report')) report(alerts, process.env.GITHUB_REPOSITORY_OWNER || '');
})().catch(e => { console.error(e); process.exit(1); });

module.exports = { evaluate };
