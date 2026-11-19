// Sync: OPTIONAL sharing between phones, through a Firebase Realtime Database
// used as a plain web address (no Firebase code in the page). Off unless
// Settings.syncUrl is set. docs/SHARED-DATA.md explains the setup and limits.
//
// Shared data, under /v1:
//   counts/<bay>   the latest staff count for each bay (replaced, never added)
//   reports/<id>   student reports { zone, band, t }
//   history/<id>   every staff count { zone, t, count }, for "typical at this hour"
const Sync = (() => {
  const base = String(Settings.syncUrl || '').trim().replace(/\/+$/, '');
  const available = /^https?:\/\//.test(base) && typeof fetch === 'function';
  // Sharing is only used when the page is opened with ?live in its address. Without it the page is the
  // self-contained demo (the replay of the Nov 19 count), so a first-time visitor never sees an empty deck.
  const on = available && typeof location !== 'undefined' && /[?&]live\b/.test(location.search || '');
  async function call(path, method, value) {
    const res = await fetch(base + path, value === undefined ? { method } : { method, body: JSON.stringify(value) });
    if (!res.ok) throw Error('Sharing failed (' + res.status + ')');
    return res.json();
  }
  const list = obj => obj && typeof obj === 'object' ? Object.values(obj) : [];
  return {
    on, available,
    saveCount: (zone, record) => call('/v1/counts/' + encodeURIComponent(zone) + '.json', 'PUT', record),
    addReport: report => call('/v1/reports.json', 'POST', report),
    addHistory: entry => call('/v1/history.json', 'POST', entry),
    // Everything a phone needs to draw the page. The newest 300 reports and 2000 past counts are plenty.
    async pull() {
      const [counts, reports, history] = await Promise.all([
        call('/v1/counts.json', 'GET'),
        call('/v1/reports.json?orderBy=%22%24key%22&limitToLast=300', 'GET'),
        call('/v1/history.json?orderBy=%22%24key%22&limitToLast=2000', 'GET')]);
      return { counts: counts && typeof counts === 'object' ? counts : {}, reports: list(reports), history: list(history) };
    },
  };
})();
if (typeof module !== 'undefined') module.exports = Sync;
