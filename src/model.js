// ParkingModel: pure survey logic. No DOM, no storage, no clock of its own.
// Every function takes `now` as an argument so tests can control time.
const ParkingModel = (() => {
  // All tunable numbers live in src/settings.js (explained there).
  const S = typeof Settings !== 'undefined' ? Settings : require('./settings.js');
  const MIN = 60e3;
  const FRESH = S.freshMinutes * MIN, HORIZON = S.horizonMinutes * MIN, MAX_SURVEY = S.maxSurveyMinutes * MIN;
  const MAX_COUNT = S.maxCount, SIGMA = S.variability, Z = S.rangeZ;
  const TREND_MIN = S.trendMinGapMinutes * MIN, TREND_MAX = S.trendMaxGapMinutes * MIN;
  const ROOM_AT = S.roomAt, FULL_AT = S.fullAt;

  // Age is measured from the survey START. A walk takes minutes, and spaces
  // counted at the start may already have changed, so start is the honest
  // (conservative) timestamp for the whole count.
  //   recent   -> the counted number is shown as it is
  //   estimate -> the count is ageing: show a range (see estimate())
  //   unknown  -> no count, or too old to say anything
  function status(record, now) {
    if (!record) return 'unknown';
    const age = now - record.start;
    if (age < 0) return 'unknown'; // clock went backwards: don't trust it
    return age >= HORIZON ? 'unknown' : age >= FRESH ? 'estimate' : 'recent';
  }

  // Trend from this bay's last two counts: spaces lost per minute (positive =
  // filling up). Null when there is no earlier count or the two are too close
  // together or too far apart to say anything.
  function trend(record) {
    const p = record.prev;
    if (!p) return null;
    const gap = record.start - p.start;
    if (gap < TREND_MIN || gap > TREND_MAX) return null;
    return { rate: (p.count - record.count) / (gap / MIN), gapMin: gap / MIN };
  }

  // What can honestly be said about a bay right now.
  // Model: open spaces drift at the recent trend and wander randomly around it
  // (a random walk). After dt minutes the spread is
  //     sigma * sqrt(dt + dt^2 / gap)
  // The first term is the bay's own randomness. The second is the uncertainty
  // of a trend measured from just two counts `gap` minutes apart (only when a
  // trend is used). The range is the middle estimate plus or minus Z spreads.
  function estimate(record, now, sigma = SIGMA) {
    const s = status(record, now);
    if (s === 'unknown') return null;
    if (s === 'recent') return { low: record.count, high: record.count, mid: record.count, rate: 0, counted: true };
    const dt = (now - record.start) / MIN, tr = trend(record);
    const mid = record.count - (tr ? tr.rate * dt : 0);
    const spread = sigma * Math.sqrt(dt + (tr ? dt * dt / tr.gapMin : 0));
    const clamp = n => Math.min(MAX_COUNT, Math.max(0, n));
    return { low: clamp(Math.floor(mid - Z * spread)), high: clamp(Math.ceil(mid + Z * spread)),
      mid: clamp(Math.round(mid)), rate: tr ? tr.rate : 0, counted: false };
  }

  // Returns NEW records with this zone's observation replaced (never added to).
  // The replaced count is kept only as `prev`, to measure the trend.
  // `extra` is optional evidence about HOW the count was made (see cleanExtra).
  function complete(records, survey, count, now, category, extra) {
    if (!Number.isInteger(count) || count < 0 || count > MAX_COUNT)
      throw Error('Enter a whole number from 0 to ' + MAX_COUNT + '.');
    if (!survey || now < survey.start) throw Error('Start a survey first.');
    if (now - survey.start > MAX_SURVEY)
      throw Error('This survey was open over ' + S.maxSurveyMinutes + ' minutes. Cancel and start a new one so the count is not older than it looks.');
    const old = records[survey.zone];
    if ((old?.version || 0) !== survey.version)
      throw Error('A newer survey of this bay was saved. Start a fresh survey rather than overwrite it.');
    if (!category) throw Error('Missing count category.');
    return { ...records, [survey.zone]: {
      count, start: survey.start, end: now, version: survey.version + 1, category,
      ...(old ? { prev: { count: old.count, start: old.start } } : {}), ...cleanExtra(extra) } };
  }

  // How a count was made. 'manual' = tallied by eye. 'ai-assisted' = a model
  // counted vehicles in photos and a person confirmed each number. Each photo
  // keeps both numbers so the model's accuracy can be measured afterwards.
  function cleanExtra(extra) {
    const ok = n => Number.isInteger(n) && n >= 0 && n <= MAX_COUNT;
    const photos = Array.isArray(extra?.photos)
      ? extra.photos.filter(p => p && ok(p.ai) && ok(p.confirmed)).slice(0, 50).map(p => ({ ai: p.ai, confirmed: p.confirmed }))
      : [];
    return { method: photos.length ? 'ai-assisted' : 'manual', photos };
  }
  // Suggested open spaces = stalls - confirmed vehicles, never below zero.
  // Only as good as the stall number, which is a model estimate until KSU confirms it.
  function suggestOpen(stalls, photos) {
    const vehicles = photos.reduce((n, p) => n + p.confirmed, 0);
    return { vehicles, open: Math.max(0, stalls - vehicles) };
  }
  // Model accuracy over a set of photos: how far the raw AI number was from
  // the number a person confirmed.
  function aiAccuracy(photos) {
    if (!photos.length) return null;
    const err = photos.map(p => p.ai - p.confirmed);
    return { photos: photos.length, exact: err.filter(e => e === 0).length,
      meanAbsError: err.reduce((n, e) => n + Math.abs(e), 0) / err.length,
      missed: err.filter(e => e < 0).reduce((n, e) => n - e, 0), extra: err.filter(e => e > 0).reduce((n, e) => n + e, 0) };
  }

  // Add up bays. A bay with no usable count is never guessed: the summary
  // says how many bays it covers instead.
  //   complete -> every bay known: low..high (exact when all were just counted)
  //   partial  -> some bays known: "at least `low`" in knownBays of bays
  //   unknown  -> nothing known
  function summary(records, zoneIds, now) {
    const known = zoneIds.map(z => estimate(records[z], now)).filter(Boolean);
    if (!known.length) return { state: 'unknown', knownBays: 0, bays: zoneIds.length };
    const low = known.reduce((n, e) => n + e.low, 0), high = known.reduce((n, e) => n + e.high, 0);
    return { state: known.length === zoneIds.length ? 'complete' : 'partial', low, high,
      exact: known.every(e => e.counted), knownBays: known.length, bays: zoneIds.length };
  }
  const levelSummary = summary;

  // One plain answer for the whole deck, for a student deciding where to go.
  //   room    -> at least ROOM_AT spaces even at the low end (true even if some bays are unknown)
  //   full    -> every bay known and at most FULL_AT spaces at the high end
  //   tight   -> every bay known, somewhere in between
  //   unknown -> not enough bays counted to say
  function deckSummary(records, zoneIds, now) {
    const s = summary(records, zoneIds, now);
    const verdict = s.state === 'unknown' ? 'unknown' : s.low >= ROOM_AT ? 'room'
      : s.state !== 'complete' ? 'unknown' : s.high <= FULL_AT ? 'full' : 'tight';
    return { ...s, verdict };
  }

  // Check the estimate against reality. `seriesList` holds, per bay, the real
  // counts in time order: [{ t, count }, ...]. For every earlier count we
  // estimate each later moment (5 to 30 minutes on) exactly as the page would,
  // then see whether the real count fell inside the range.
  // Note: cases from one series overlap, so they are not independent tests.
  function backtest(seriesList, sigma = SIGMA) {
    let cases = 0, inside = 0, absErr = 0;
    for (const series of seriesList) {
      const s = [...series].sort((a, b) => a.t - b.t);
      for (let i = 0; i < s.length; i++) {
        const record = { count: s[i].count, start: s[i].t, ...(i ? { prev: { count: s[i - 1].count, start: s[i - 1].t } } : {}) };
        for (let j = i + 1; j < s.length; j++) {
          if (status(record, s[j].t) !== 'estimate') continue;
          const e = estimate(record, s[j].t, sigma);
          cases++; absErr += Math.abs(e.mid - s[j].count);
          if (s[j].count >= e.low && s[j].count <= e.high) inside++;
        }
      }
    }
    return cases ? { cases, inside, meanAbsError: absErr / cases } : null;
  }
  // Measured unpredictability from consecutive real counts, in the same unit
  // as SIGMA. It includes any steady trend, so it errs on the wide side.
  function variability(seriesList) {
    let sum = 0, n = 0;
    for (const series of seriesList) {
      const s = [...series].sort((a, b) => a.t - b.t);
      for (let i = 1; i < s.length; i++) {
        const dt = (s[i].t - s[i - 1].t) / MIN;
        if (dt > 0 && dt <= TREND_MAX / MIN) { sum += (s[i].count - s[i - 1].count) ** 2 / dt; n++; }
      }
    }
    return n ? Math.sqrt(sum / n) : null;
  }

  // Keep only well-formed records for known zones. Storage can hold anything
  // (old versions of the app, manual edits), so never render it unchecked.
  function sanitize(raw, zoneIds) {
    const out = {}, okCount = n => Number.isInteger(n) && n >= 0 && n <= MAX_COUNT;
    if (!raw || typeof raw !== 'object') return out;
    for (const z of zoneIds) {
      const r = raw[z];
      if (r && okCount(r.count) && Number.isFinite(r.start) && Number.isFinite(r.end) && r.end >= r.start &&
          Number.isInteger(r.version) && r.version > 0 && typeof r.category === 'string') {
        const p = r.prev, prev = p && okCount(p.count) && Number.isFinite(p.start) && p.start < r.start ? { prev: { count: p.count, start: p.start } } : {};
        out[z] = { count: r.count, start: r.start, end: r.end, version: r.version, category: r.category, ...prev, ...cleanExtra(r) };
      }
    }
    return out;
  }

  return { status, trend, estimate, complete, levelSummary, deckSummary, backtest, variability, sanitize,
    cleanExtra, suggestOpen, aiAccuracy, FRESH, HORIZON, MAX_SURVEY, MAX_COUNT, SIGMA, ROOM_AT, FULL_AT };
})();
if (typeof module !== 'undefined') module.exports = ParkingModel;
