// ParkingModel: pure survey logic. No DOM, no storage, no clock of its own.
// Every function takes `now` as an argument so tests can control time.
const ParkingModel = (() => {
  // ILLUSTRATIVE thresholds. A pilot must replace them with measured decay rates.
  const FRESH = 5 * 60e3;        // younger than this: "recent"
  const UNKNOWN = 15 * 60e3;     // this old or older: hidden as "unknown"
  const MAX_SURVEY = 20 * 60e3;  // a survey left open longer is rejected
  const MAX_COUNT = 999;

  // Age is measured from the survey START. A walk takes minutes, and spaces
  // counted at the start may already have changed, so start is the honest
  // (conservative) timestamp for the whole count.
  function status(record, now) {
    if (!record) return 'unknown';
    const age = now - record.start;
    if (age < 0) return 'unknown'; // clock went backwards: don't trust it
    return age >= UNKNOWN ? 'unknown' : age >= FRESH ? 'stale' : 'recent';
  }

  // Returns NEW records with this zone's observation replaced (never added to).
  function complete(records, survey, count, now, category) {
    if (!Number.isInteger(count) || count < 0 || count > MAX_COUNT)
      throw Error('Enter a whole number from 0 to ' + MAX_COUNT + '.');
    if (!survey || now < survey.start) throw Error('Start a survey first.');
    if (now - survey.start > MAX_SURVEY)
      throw Error('This survey was open over 20 minutes. Cancel and start a new one so the count is not older than it looks.');
    if ((records[survey.zone]?.version || 0) !== survey.version)
      throw Error('A newer survey of this bay was saved. Start a fresh survey rather than overwrite it.');
    if (!category) throw Error('Missing count category.');
    return { ...records, [survey.zone]: {
      count, start: survey.start, end: now, version: survey.version + 1, category } };
  }

  // A level total is only shown when EVERY bay on it is recent. Otherwise we
  // report what we know ("at least N in 2 of 3 bays") instead of a fake total.
  function levelSummary(records, zoneIds, now) {
    const recent = zoneIds.filter(z => status(records[z], now) === 'recent');
    const sum = recent.reduce((n, z) => n + records[z].count, 0);
    if (recent.length === zoneIds.length) return { state: 'complete', total: sum };
    if (recent.length) return { state: 'partial', atLeast: sum, recentBays: recent.length, bays: zoneIds.length };
    return { state: 'unknown' };
  }

  // Keep only well-formed records for known zones. Storage can hold anything
  // (old versions of the app, manual edits), so never render it unchecked.
  function sanitize(raw, zoneIds) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const z of zoneIds) {
      const r = raw[z];
      if (r && Number.isInteger(r.count) && r.count >= 0 && r.count <= MAX_COUNT &&
          Number.isFinite(r.start) && Number.isFinite(r.end) && r.end >= r.start &&
          Number.isInteger(r.version) && r.version > 0 && typeof r.category === 'string')
        out[z] = { count: r.count, start: r.start, end: r.end, version: r.version, category: r.category };
    }
    return out;
  }

  return { status, complete, levelSummary, sanitize, FRESH, UNKNOWN, MAX_SURVEY, MAX_COUNT };
})();
if (typeof module !== 'undefined') module.exports = ParkingModel;
