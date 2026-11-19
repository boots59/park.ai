// A stand-in for the shared database, for tests: the same three calls the page
// makes (GET, PUT, POST on paths ending in .json), kept in memory.
function fakeDatabase() {
  const db = { data: {}, offline: false, n: 0 };
  db.fetch = async (url, { method = 'GET', body } = {}) => {
    if (db.offline) throw Error('network down');
    const parts = new URL(url).pathname.replace(/\.json$/, '').split('/').filter(Boolean).map(decodeURIComponent);
    let node = db.data;
    for (const p of parts.slice(0, -1)) node = node[p] ??= {};
    const last = parts.at(-1);
    let out;
    if (method === 'GET') out = node[last] ?? null;
    else if (method === 'PUT') out = node[last] = JSON.parse(body);
    else if (method === 'POST') { const key = 'k' + String(++db.n).padStart(6, '0'); (node[last] ??= {})[key] = JSON.parse(body); out = { name: key }; }
    return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(out)) };
  };
  return db;
}
module.exports = { fakeDatabase };
