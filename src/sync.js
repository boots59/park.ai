// Sync: OPTIONAL sharing between phones, through a Firebase Realtime Database
// used as a plain web address (no Firebase code in the page). Off unless
// Settings.syncUrl is set. docs/SHARED-DATA.md explains the setup and limits.
//
// Shared data, under /v1:
//   counts/<bay>   the latest staff count for each bay (replaced, never added)
//   reports/<id>   student reports { zone, band, t }
//   history/<id>   every staff count { zone, t, count }, for "typical at this hour"
//
// Monitor sign-in (OPTIONAL, off unless Settings.authKey is set): Firebase Authentication, also used as plain
// web addresses. A signed-in monitor's counts carry a short-lived token that the database rules check
// (firebase/rules-signin.json), so nobody else can write a count. The password goes to Google and is never
// stored here; this phone keeps only the account's id and its tokens. Student reports stay anonymous.
const Sync = (() => {
  const base = String(Settings.syncUrl || '').trim().replace(/\/+$/, '');
  const available = /^https?:\/\//.test(base) && typeof fetch === 'function';
  // Sharing is only used when the page is opened with ?live in its address. Without it the page is the
  // self-contained demo (the replay of the Nov 19 count), so a first-time visitor never sees an empty deck.
  const on = available && typeof location !== 'undefined' && /[?&]live\b/.test(location.search || '');

  const key = String(Settings.authKey || '').trim(), auth = available && !!key;
  const SESSION_KEY = 'park-ai-monitor-v1';
  let session = null; // { uid, idToken, refreshToken, exp }
  try { const s = JSON.parse(localStorage.getItem(SESSION_KEY)); if (s && typeof s.uid === 'string' && typeof s.refreshToken === 'string') session = s; } catch (e) {}
  const keep = s => { session = s; try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch (e) {} };
  const until = seconds => Date.now() + (Number(seconds) || 3600) * 1000;
  // Firebase's own sign-in service. It throttles repeated wrong passwords itself.
  async function signIn(email, password) {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + encodeURIComponent(key),
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw Error(/TOO_MANY_ATTEMPTS/.test(j?.error?.message || '') ? 'Too many tries. Wait a few minutes.' : 'That email and password were not accepted.');
    keep({ uid: j.localId, idToken: j.idToken, refreshToken: j.refreshToken, exp: until(j.expiresIn) });
    // Signed in is not enough: the account must be on the monitor list, which only the project owner can edit.
    const listed = await fetch(base + '/v1/monitors/' + encodeURIComponent(j.localId) + '.json?auth=' + encodeURIComponent(j.idToken)).then(r => r.ok ? r.json() : false).catch(() => false);
    if (listed !== true) { keep(null); throw Error('That account is not on the monitor list.'); }
  }
  // A token lasts an hour; get a new one a minute before it runs out. If that is refused, the monitor signs in again.
  async function token() {
    if (!session) return '';
    if (Date.now() < session.exp - 60e3) return session.idToken;
    const res = await fetch('https://securetoken.googleapis.com/v1/token?key=' + encodeURIComponent(key),
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(session.refreshToken) });
    if (res.status === 400 || res.status === 401 || res.status === 403) { keep(null); return ''; }
    if (!res.ok) throw Error('Sharing failed (' + res.status + ')');
    const j = await res.json();
    keep({ uid: session.uid, idToken: j.id_token, refreshToken: j.refresh_token || session.refreshToken, exp: until(j.expires_in) });
    return session.idToken;
  }

  async function call(path, method, value, signed) {
    const t = signed && auth ? await token() : '';
    const res = await fetch(base + path + (t ? '?auth=' + encodeURIComponent(t) : ''), value === undefined ? { method } : { method, body: JSON.stringify(value) });
    // 400, 401 and 403 mean the database looked at this entry and said no. Sending it again will not change that.
    if (!res.ok) throw Object.assign(Error('Sharing failed (' + res.status + ')'), { refused: [400, 401, 403].includes(res.status) });
    return res.json();
  }
  const list = obj => obj && typeof obj === 'object' ? Object.values(obj) : [];
  return {
    on, available, auth,
    signIn, signOut: () => keep(null), signedIn: () => !!session, uid: () => session ? session.uid : '',
    saveCount: (zone, record) => call('/v1/counts/' + encodeURIComponent(zone) + '.json', 'PUT', record, true),
    addReport: report => call('/v1/reports.json', 'POST', report),
    // With sign-in on, each history entry says which monitor account made it: the audit trail.
    addHistory: entry => call('/v1/history.json', 'POST', auth && session ? { ...entry, by: session.uid } : entry, true),
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
