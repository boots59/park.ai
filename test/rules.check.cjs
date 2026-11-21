// Checks the database rules in firebase/ against the real Firebase rules engine, in the local emulator.
// Not part of `npm test` (it needs Java and firebase-tools). Run: npm run check:rules
const fs = require('fs'), path = require('path'), assert = require('assert');
const HOST = 'http://' + (process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000'), NS = 'demo-park-ai';
const url = (p, auth) => `${HOST}${p}.json?ns=${NS}${auth ? '&auth=' + auth : ''}`;
const admin = { Authorization: 'Bearer owner' };
// The emulator accepts an unsigned token; the real service only accepts ones Firebase Authentication signed.
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = uid => `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: uid, user_id: uid, iat: 1, exp: 9e9, aud: NS, iss: 'https://securetoken.google.com/' + NS, firebase: { sign_in_provider: 'password', identities: {} } })}.`;
const send = async (method, p, body, auth) => (await fetch(url(p, auth), { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })).status;
let n = 0;
const ok = async (name, status, want) => { assert.equal(status, want, `${name}: got ${status}, wanted ${want}`); n++; };
const allow = (name, s) => ok(name, s, 200), deny = (name, s) => ok(name, s, 401);

async function load(file) {
  const r = await fetch(`${HOST}/.settings/rules.json?ns=${NS}`, { method: 'PUT', headers: admin, body: fs.readFileSync(path.join(__dirname, '../firebase', file)) });
  assert.equal(r.status, 200, 'rules did not load: ' + await r.text());
  await fetch(url('/'), { method: 'PUT', headers: admin, body: 'null' });
}
const now = Date.now();
const count = (extra = {}) => ({ count: 12, start: now - 60e3, end: now, version: 1, category: 'Regular student stalls', method: 'manual', ...extra });

(async () => {
  for (const [file, signin] of [['rules.json', false], ['rules-signin.json', true]]) {
    await load(file);
    const mon = signin ? token('monitor1') : undefined, by = signin ? { by: 'monitor1' } : {};
    if (signin) await fetch(url('/v1/monitors/monitor1'), { method: 'PUT', headers: admin, body: 'true' });

    // What the app really sends is accepted.
    await allow('a count', await send('PUT', '/v1/counts/L3_West', count(), mon));
    await allow('an AI-assisted recount with its history', await send('PUT', '/v1/counts/L3_West', count({ version: 2, method: 'ai-assisted', prev: { count: 12, start: now - 9e5 }, photos: [{ ai: 30, confirmed: 31 }, { ai: 8, confirmed: 8, outside: 1 }] }), mon));
    await allow('a history entry', await send('POST', '/v1/history', { zone: 'L3_West', t: now, count: 12, ...by }, mon));
    await allow('a student report, with no sign-in', await send('POST', '/v1/reports', { zone: 'L2_North', band: 'few', t: now }));
    await allow('an app review', await send('POST', '/v1/poll', { kind: 'app-review', v: 2, t: now, who: 'Commuter', easy: 'Yes', text: 'Add East Deck', secs: 91, screens: 'deck student', trips: 1, via: 'app' }));
    await allow('a student survey answer', await send('POST', '/v1/poll', { time: '2026-11-19T15:00:00Z', source: 'qr', late: 'Several times', note: '' }));
    await allow('a survey tally mark', await send('POST', '/v1/pollcount', { t: now }));
    await allow('a field-kit backup', await send('PUT', '/v1/fieldkit/dab12cd34ef', { saved: 'x', stalls: { L3_West: { open: 4 } } }));
    await allow('reading counts', await send('GET', '/v1/counts'));
    await allow('reading the newest reports', (await fetch(url('/v1/reports') + '&orderBy=%22%24key%22&limitToLast=300')).status);

    // What an attacker would send is refused.
    await deny('deleting a count', await send('DELETE', '/v1/counts/L3_West', undefined, mon));
    await deny('wiping every count', await send('PUT', '/v1/counts', null, mon));
    await deny('a bay that does not exist', await send('PUT', '/v1/counts/L9_Roof', count(), mon));
    await deny('an impossible count', await send('PUT', '/v1/counts/L3_East', count({ count: 5000 }), mon));
    await deny('a count dated in the future', await send('PUT', '/v1/counts/L3_East', count({ end: now + 864e5 }), mon));
    await deny('a count that ends before it starts', await send('PUT', '/v1/counts/L3_East', count({ end: now - 3e5 }), mon));
    await deny('a count carrying an extra field', await send('PUT', '/v1/counts/L3_East', count({ note: '<img src=x onerror=alert(1)>' }), mon));
    await deny('a count with a huge category', await send('PUT', '/v1/counts/L3_East', count({ category: 'x'.repeat(500) }), mon));
    await deny('a count with text where a number goes', await send('PUT', '/v1/counts/L3_East', count({ count: '12' }), mon));
    await deny('a report for a made-up bay', await send('POST', '/v1/reports', { zone: '<script>', band: 'few', t: now }));
    await deny('a report with a made-up band', await send('POST', '/v1/reports', { zone: 'L2_North', band: 'empty', t: now }));
    await deny('a report dated next week', await send('POST', '/v1/reports', { zone: 'L2_North', band: 'few', t: now + 6048e5 }));
    await deny('a report with extra data', await send('POST', '/v1/reports', { zone: 'L2_North', band: 'few', t: now, html: '<b>x</b>' }));
    await deny('a history entry with an impossible count', await send('POST', '/v1/history', { zone: 'L3_West', t: now, count: -4, ...by }, mon));
    await deny('reading survey answers', await send('GET', '/v1/poll'));
    await deny('reading field-kit backups', await send('GET', '/v1/fieldkit'));
    await deny('a survey answer with a 10,000-character field', await send('POST', '/v1/poll', { t: now, text: 'x'.repeat(10000) }));
    await deny('a survey answer with nested data', await send('POST', '/v1/poll', { t: now, blob: { a: { b: 'c' } } }));
    await deny('a tally mark with extra data', await send('POST', '/v1/pollcount', { t: now, who: 'x' }));
    await deny('a field-kit backup under a strange key', await send('PUT', '/v1/fieldkit/NOT-A-DEVICE', { saved: 'x' }));
    await deny('writing outside the app\'s data', await send('PUT', '/v2/anything', { a: 1 }));
    await deny('writing at the top', await send('PUT', '/v1/extra', { a: 1 }));

    if (signin) {
      const stranger = token('stranger1');
      await deny('a count with no sign-in', await send('PUT', '/v1/counts/L3_East', count()));
      await deny('a count from a signed-in account that is not a monitor', await send('PUT', '/v1/counts/L3_East', count(), stranger));
      await deny('a history entry with no sign-in', await send('POST', '/v1/history', { zone: 'L3_West', t: now, count: 12 }));
      await deny('a history entry signed with someone else\'s id', await send('POST', '/v1/history', { zone: 'L3_West', t: now, count: 12, by: 'monitor2' }, mon));
      await deny('making yourself a monitor', await send('PUT', '/v1/monitors/stranger1', true, stranger));
      await deny('reading the monitor list', await send('GET', '/v1/monitors', undefined, stranger));
      await allow('a monitor checking their own access', await send('GET', '/v1/monitors/monitor1', undefined, mon));
    }
    console.log(`ok - ${file}`);
  }
  console.log(`\n${n} rule checks passed in the Firebase emulator.`);
})().catch(e => { console.error(e.message); process.exit(1); });
