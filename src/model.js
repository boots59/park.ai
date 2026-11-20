// ParkingModel: pure survey logic. No DOM, no storage, no clock of its own.
// Every function takes `now` as an argument so tests can control time.
const ParkingModel = (() => {
  // All tunable numbers live in src/settings.js (explained there).
  const S = typeof Settings !== 'undefined' ? Settings : require('./settings.js');
  const MIN = 60e3;
  const FRESH = S.freshMinutes * MIN, HORIZON = S.horizonMinutes * MIN, MAX_SURVEY = S.maxSurveyMinutes * MIN;
  const MAX_COUNT = S.maxCount, SIGMA = S.variability, Z = S.rangeZ;
  const TREND_MIN = S.trendMinGapMinutes * MIN, TREND_MAX = S.trendMaxGapMinutes * MIN;
  const ROOM_AT = S.roomAt, FULL_AT = S.fullAt, BAY_ROOM_AT = S.bayRoomAt;
  const REPORT_MS = S.studentReportMinutes * MIN;
  // What a student can report after parking, as a range of open spaces.
  // "leaving" is a student driving out: at least one space is opening in that bay.
  const BANDS = { plenty: [BAY_ROOM_AT, Infinity], few: [1, BAY_ROOM_AT - 1], full: [0, 0], leaving: [1, Infinity] };
  const lifetime = band => band === 'leaving' ? S.studentLeavingMinutes * MIN : REPORT_MS;

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
      ? extra.photos.filter(p => p && ok(p.ai) && ok(p.confirmed)).slice(0, 50).map(p => ({ ai: p.ai, confirmed: p.confirmed, ...(ok(p.outside) && p.outside ? { outside: Math.min(p.outside, p.ai) } : {}) }))
      : [];
    // 'scan': the number came from a count of vehicles (for example how many plates a patrol truck read), not a tally of open stalls.
    return { method: extra?.method === 'scan' ? 'scan' : photos.length ? 'ai-assisted' : 'manual', photos, ...(extra?.method === 'scan' && ok(extra.vehicles) ? { vehicles: extra.vehicles } : {}) };
  }
  // Open regular stalls from a count of ALL vehicles in a bay (a patrol truck's plate reads).
  // total stalls - vehicles = open stalls of every type. How many of those are regular is not known,
  // so the answer is a best case (all open stalls are regular ones) and how far it could be off.
  function openFromVehicles(zone, vehicles) {
    const other = (zone.accessible || 0) + (zone.facultyStaff || 0) + (zone.otherReserved || 0);
    const openAll = Math.max(0, zone.stalls + other - vehicles);
    return { open: Math.min(zone.stalls, openAll), couldBeLowerBy: Math.min(other, openAll) };
  }
  // Suggested open spaces = stalls - confirmed vehicles, never below zero.
  // Only as good as the stall number, which is a model estimate until KSU confirms it.
  function suggestOpen(stalls, photos) {
    const vehicles = photos.reduce((n, p) => n + p.confirmed, 0);
    return { vehicles, open: Math.max(0, stalls - vehicles) };
  }
  // Model accuracy over a set of photos: how far the AI number was from the
  // number a person confirmed. Vehicles the person left out because they were
  // OUTSIDE the bay (a car park beyond the deck, a car in the aisle) are real
  // vehicles the model found correctly, so they are reported separately as
  // `outside` and not counted as model errors.
  function aiAccuracy(photos) {
    if (!photos.length) return null;
    const err = photos.map(p => p.ai - (p.outside || 0) - p.confirmed);
    return { photos: photos.length, outside: photos.reduce((n, p) => n + (p.outside || 0), 0), exact: err.filter(e => e === 0).length,
      meanAbsError: err.reduce((n, e) => n + Math.abs(e), 0) / err.length,
      missed: err.filter(e => e < 0).reduce((n, e) => n - e, 0), extra: err.filter(e => e > 0).reduce((n, e) => n + e, 0) };
  }

  // ---- Student reports: a second, lower-trust source ----
  // A student who has just parked taps "plenty", "a few" or "full" for their
  // bay. Rules:
  //  - A staff count under 5 minutes old always wins; reports are ignored.
  //  - Otherwise the NEWEST report made after the staff count sets the bay's
  //    range. If that range overlaps the ageing staff estimate, the overlap is
  //    used (two sources agreeing narrow the answer).
  //  - Reports expire after Settings.studentReportMinutes.
  // `students` says how many current reports agree with the newest one.
  function bayEstimate(record, reports, zone, now) {
    const base = estimate(record, now);
    const tagged = base && { ...base, source: base.counted ? 'counted' : 'estimate', students: 0 };
    if (base?.counted) return tagged;
    const since = record ? record.start : -Infinity;
    const live = (reports || []).filter(r => r.zone === zone && r.t <= now && now - r.t < lifetime(r.band) && r.t > since).sort((a, b) => b.t - a.t);
    if (!live.length) return tagged;
    let [low, high] = BANDS[live[0].band];
    if (base) { const lo = Math.max(low, base.low), hi = Math.min(high, base.high); if (lo <= hi) { low = lo; high = hi; } }
    return { low, high, mid: Number.isFinite(high) ? Math.round((low + high) / 2) : low, rate: 0, counted: false,
      source: 'students', band: live[0].band, reportedAt: live[0].t, students: live.filter(r => r.band === live[0].band).length };
  }
  // Keep only well-formed reports for known bays (storage and the network can hold anything).
  function cleanReports(raw, zoneIds, now) {
    return (Array.isArray(raw) ? raw : []).filter(r => r && zoneIds.includes(r.zone) && BANDS[r.band] && Number.isFinite(r.t) && r.t <= now + MIN)
      .map(r => ({ zone: r.zone, band: r.band, t: r.t })).sort((a, b) => a.t - b.t).slice(-500);
  }

  // ---- "Typical at this hour": what past counts say when nothing current is known ----
  // `history` is [{ zone, t, count }] of past staff counts. Uses counts from
  // EARLIER DAYS taken within the window around the current time of day.
  // Returns null unless there are enough of them. It is context, not a count:
  // the page shows it only for a bay that is otherwise unknown.
  function typical(history, zone, now) {
    const minuteOfDay = t => { const d = new Date(t); return d.getHours() * 60 + d.getMinutes(); };
    const m = minuteOfDay(now), win = S.typicalWindowMinutes;
    const near = (history || []).filter(h => h && h.zone === zone && Number.isInteger(h.count) && now - h.t > 12 * 60 * MIN)
      .filter(h => { const d = Math.abs(minuteOfDay(h.t) - m); return Math.min(d, 1440 - d) <= win; }).map(h => h.count);
    if (near.length < S.typicalMinSamples) return null;
    return { low: Math.min(...near), high: Math.max(...near), samples: near.length };
  }

  // Add up bays. A bay with no usable count is never guessed: the summary
  // says how many bays it covers instead.
  //   complete -> every bay known: low..high (exact when all were just counted)
  //   partial  -> some bays known: "at least `low`" in knownBays of bays
  //   unknown  -> nothing known
  // `reports` (student reports) is optional everywhere below.
  function summary(records, zoneIds, now, reports) {
    const known = zoneIds.map(z => bayEstimate(records[z], reports, z, now)).filter(Boolean);
    if (!known.length) return { state: 'unknown', knownBays: 0, bays: zoneIds.length };
    const low = known.reduce((n, e) => n + e.low, 0), high = known.reduce((n, e) => n + e.high, 0);
    return { state: known.length === zoneIds.length ? 'complete' : 'partial', low, high,
      exact: known.every(e => e.counted), students: known.some(e => e.source === 'students'), knownBays: known.length, bays: zoneIds.length };
  }
  const levelSummary = summary;

  // One plain answer for the whole deck, for a student deciding where to go.
  //   room    -> at least ROOM_AT spaces even at the low end (true even if some bays are unknown)
  //   full    -> every bay known and at most FULL_AT spaces at the high end
  //   tight   -> every bay known, somewhere in between
  //   unknown -> not enough bays counted to say
  function deckSummary(records, zoneIds, now, reports) {
    const s = summary(records, zoneIds, now, reports);
    const verdict = s.state === 'unknown' ? 'unknown' : s.low >= ROOM_AT ? 'room'
      : s.state !== 'complete' ? 'unknown' : s.high <= FULL_AT ? 'full' : 'tight';
    return { ...s, verdict };
  }

  // One bay in one word, for colouring the 3D view. Judged on the LOW end of
  // the estimate, so an ageing count never looks roomier than it may be.
  //   room -> at least BAY_ROOM_AT spaces    few -> some, or possibly some
  //   full -> none, even at the high end     unknown -> no usable count
  function bayState(record, now, reports, zone) {
    const est = bayEstimate(record, reports, zone, now);
    const state = !est ? 'unknown' : est.low >= BAY_ROOM_AT ? 'room' : est.high === 0 ? 'full' : 'few';
    return { state, est };
  }

  // Split a bay's regular stalls into three groups for the stall diagram:
  // taken for sure, possibly taken (the uncertain part of an estimate), and
  // open for sure. It says HOW MANY, never which ones. Null when nothing is known.
  function stallSplit(stalls, est) {
    if (!est) return null;
    const open = Math.min(stalls, est.low), taken = Math.max(0, stalls - Math.min(stalls, est.high));
    return { taken, maybe: stalls - taken - open, open };
  }

  // Where to try first: bays with at least one space at the low end, most
  // spaces first, fresher count first on a tie. Empty when nothing qualifies.
  // It ranks whole bays; it does not know which individual spaces are open.
  function recommend(records, zoneIds, now, limit = 3, reports) {
    return zoneIds.map(zone => { const est = bayEstimate(records[zone], reports, zone, now); return { zone, est, start: est?.reportedAt ?? records[zone]?.start }; })
      .filter(b => b.est && b.est.low >= 1)
      .sort((a, b) => b.est.low - a.est.low || b.start - a.start)
      .slice(0, limit).map(({ zone, est }) => ({ zone, est }));
  }

  // Which bay should a counter visit next? The one where a fresh count would
  // teach the most: bays with no usable information first, then the widest
  // range, then the oldest count. This points limited staff time at the gaps
  // instead of a fixed round. Returns [{ zone, why }], most useful first.
  function recheckNext(records, zoneIds, now, reports, limit = 3) {
    return zoneIds.map(zone => {
      const est = bayEstimate(records[zone], reports, zone, now);
      const width = !est ? Infinity : Number.isFinite(est.high) ? est.high - est.low : MAX_COUNT;
      const why = !est ? 'nothing is known about it' : est.counted ? 'it was just counted' : est.source === 'students' ? 'it rests on a student report' : 'its range is ' + est.low + ' to ' + est.high;
      return { zone, width, age: records[zone] ? now - records[zone].start : Infinity, why };
    }).filter(b => b.width > 0).sort((a, b) => b.width - a.width || b.age - a.age).slice(0, limit).map(({ zone, why }) => ({ zone, why }));
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

  // Counts are never erased. Once a count is too old to estimate from (past the horizon) it is still the
  // last thing anyone measured, so the page shows it as "last count" with its age, never as a live number.
  //   open: sum of the last counts   bays: how many bays have one   oldest/newest: start times
  function lastCounts(records, zoneIds, now) {
    const known = zoneIds.map(z => records[z]).filter(r => r && now - r.start >= 0);
    if (!known.length) return null;
    return { open: known.reduce((n, r) => n + r.count, 0), bays: known.length, of: zoneIds.length,
      oldest: Math.min(...known.map(r => r.start)), newest: Math.max(...known.map(r => r.start)) };
  }
  return { status, trend, estimate, lastCounts, bayEstimate, cleanReports, typical, BANDS, complete, levelSummary, deckSummary, bayState, stallSplit, recommend, recheckNext, backtest, variability, sanitize,
    cleanExtra, suggestOpen, openFromVehicles, aiAccuracy, FRESH, HORIZON, MAX_SURVEY, MAX_COUNT, SIGMA, ROOM_AT, FULL_AT };
})();
if (typeof module !== 'undefined') module.exports = ParkingModel;
