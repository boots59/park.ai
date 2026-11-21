// Saves a copy of the shared database's public branches (counts, reports, history) to backup/<date>.json.
// Run by .github/workflows/backup.yml every night, or by hand: npm run backup
// Survey answers and field-kit backups are write-only by design, so this cannot read them;
// export those from the Firebase console (see docs/SECURITY.md).
const fs = require('fs'), path = require('path');
const base = String(require('../src/settings.js').syncUrl || '').replace(/\/+$/, '');
(async () => {
  if (!base) { console.log('No shared database is configured; nothing to back up.'); return; }
  const out = { saved: new Date().toISOString(), source: base };
  for (const branch of ['counts', 'reports', 'history']) {
    const res = await fetch(`${base}/v1/${branch}.json`);
    if (!res.ok) throw Error(`${branch}: the database answered ${res.status}`);
    out[branch] = await res.json();
  }
  const size = o => o && typeof o === 'object' ? Object.keys(o).length : 0;
  const dir = path.join(__dirname, '../backup'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, out.saved.slice(0, 10) + '.json');
  fs.writeFileSync(file, JSON.stringify(out));
  console.log(`saved ${path.relative(process.cwd(), file)}: ${size(out.counts)} counts, ${size(out.reports)} reports, ${size(out.history)} history entries`);
})().catch(e => { console.error(e.message); process.exit(1); });
