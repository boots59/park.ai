// App: DOM + storage around the pure ParkingModel.
// `DECK` is injected by scripts/build.cjs from data/deck.json (bays and stall numbers).
// `Settings` comes from src/settings.js.
const CATEGORY = Settings.category;
const KEY = Sync.on ? 'west-deck-live-v1' : 'west-deck-prototype-v2'; // live (shared) mode keeps its own data, apart from the demo's
const ALL_IDS = Object.keys(DECK.zones);
const ZONE_IDS = ALL_IDS.filter(z => DECK.zones[z].stalls > 0); // bays with regular stalls: the only ones surveyed and shown as open
const LEVELS = [...new Set(ALL_IDS.map(z => DECK.zones[z].level))].sort((a, b) => b - a); // top first
const zonesOf = n => ZONE_IDS.filter(z => DECK.zones[z].level === n);
const bayName = z => 'Level ' + DECK.zones[z].level + ' · ' + DECK.zones[z].label;
// Stall numbers are either a 3D-model estimate or counted on foot; always say which.
const counted = z => DECK.zones[z].source === 'counted';
const stallWord = z => counted(z) ? 'counted' : 'modelled';
const stallNote = z => counted(z)
  ? 'Stalls: ' + DECK.zones[z].stalls + ' (counted on foot' + (DECK.zones[z].countedOn ? ', ' + DECK.zones[z].countedOn : '') + ')'
  : 'Modelled stalls: ' + DECK.zones[z].stalls + ' (3D model estimate, not a KSU figure)';

let records = {}, offset = 0, survey = null, viewer = null, selectedBay = null;
let reports = [];          // student reports: [{ zone, band, t }]
const REPORT_KEY = Sync.on ? 'west-deck-live-reports-v1' : 'west-deck-reports-v1', REPORTED_KEY = Sync.on ? 'west-deck-live-reported-v1' : 'west-deck-reported-v1';
const BAND_TEXT = { plenty: 'plenty of spaces', few: 'a few left', full: 'full', leaving: 'a space just opened' };
const est = (z, t) => ParkingModel.bayEstimate(records[z], reports, z, t);
const now = () => Date.now() + offset;
const $ = id => document.getElementById(id);

function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ records, offset, demo })); }
  catch (e) { feedback('Storage unavailable. This demo lasts only until the page closes.', true); }
}
// Two demo data sets (single-device mode only):
//   'nov19'  a replay of the real count Kell made in West Deck on Thu Nov 19, 2026 (second pass, 11:49-11:57 AM),
//            shown as if it were 11:58 AM that day, with the first pass (11:16-11:35) as each bay's earlier count.
//   'sample' made-up numbers that show every display state.
let demo = 'nov19', startedFresh = false;
function seedNov19() {
  const t = now(), ago = m => t - m * 60e3;
  const rec = (count, minsAgo, before, gap) => ({ count, start: ago(minsAgo), end: ago(minsAgo - 0.5), version: 2,
    category: CATEGORY, method: 'manual', photos: [], prev: { count: before, start: ago(minsAgo + gap) } });
  //                 pass 2, minutes before 11:58, pass 1, minutes between the passes   (data/field/2026-11-19-bay-counts.csv)
  records = { L3_East: rec(4, 9, 6, 33), L3_South: rec(6, 8, 6, 24), L3_West: rec(18, 8, 19, 24), L3_Centre: rec(17, 7, 16, 21), L3_North: rec(0, 0.5, 0, 29),
              L2_South: rec(2, 5.5, 2, 19), L2_East: rec(1, 5, 4, 22), L2_North: rec(0, 4.5, 1, 22), L2_West: rec(22, 4, 21, 22), L2_Centre: rec(0, 2.5, 0, 21) };
}
const NOTICE = {
  nov19: '<b>A replay, not live. Do not use for parking decisions.</b> These are the counts one student made in West Deck on Thursday, Nov 19, 2026, shown as if it were 11:58 AM that day. Not KSU data and not a KSU system.',
  sample: '<b>Demo only. Do not use for parking decisions.</b> The open-space counts shown are made-up sample data. Stall numbers were counted on foot by one student on Nov 19, 2026. No KSU affiliation, live feed, or reserved space guarantee.',
};
function loadDemo(kind) { cancelSurvey(); demo = kind === 'sample' ? 'sample' : 'nov19'; offset = 0; (demo === 'sample' ? seed : seedNov19)(); reports = []; saveReports(); save(); render(); }
function dismissIntro() { $('intro').classList.add('hidden'); try { localStorage.setItem('west-deck-intro-v1', '1'); } catch (e) {} }

// ILLUSTRATIVE sample data, not observations. Covers every display state:
// just counted, ageing with and without a trend, and unknown.
function seed() {
  const t = now(), ago = m => t - m * 60e3;
  const rec = (count, minsAgo, prev) => ({ count, start: ago(minsAgo), end: ago(minsAgo - 1), version: prev ? 2 : 1,
    category: CATEGORY, method: 'manual', photos: [], ...(prev ? { prev: { count: prev[0], start: ago(prev[1]) } } : {}) });
  records = { L3_West: rec(6, 2), L3_Centre: rec(0, 3), L3_East: rec(11, 1), L3_North: rec(3, 2), L3_South: rec(5, 1),
              L2_West: rec(4, 2), L2_Centre: rec(7, 8, [12, 18]), L2_East: rec(2, 4), L2_North: rec(1, 3), L2_South: rec(9, 21) };
}
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved.offset === 'number') { records = ParkingModel.sanitize(saved.records, ZONE_IDS); offset = Sync.on ? 0 : saved.offset; demo = saved.demo === 'sample' ? 'sample' : saved.demo === 'own' ? 'own' : 'nov19'; return; }
  } catch (e) {}
  if (Sync.on) { records = {}; return; } // shared mode starts empty: no sample data mixed with real entries
  startedFresh = true; seedNov19(); // a first visit opens on the replay of the real count
}
function loadReports() { try { reports = ParkingModel.cleanReports(JSON.parse(localStorage.getItem(REPORT_KEY)), ZONE_IDS, now()); } catch (e) { reports = []; } }
function saveReports() { try { localStorage.setItem(REPORT_KEY, JSON.stringify(reports)); } catch (e) {} }
function feedback(text, error = false) { const el = $('feedback'); el.textContent = text; el.classList.toggle('error', error); }

function setView(id) {
  for (const name of ['student', 'staff', 'about']) {
    $(name).classList.toggle('hidden', name !== id);
    $(name + 'Tab').classList.toggle('active', name === id);
    $(name + 'Tab').setAttribute('aria-selected', String(name === id));
  }
}

const STATUS_TEXT = { counted: 'Counted', estimate: 'Estimate', students: 'Student report', unknown: 'Unknown' };
const STATUS_CLASS = { counted: 'recent', estimate: 'estimate', students: 'students', unknown: 'unknown' };
const ago = (ts, t) => Math.max(0, Math.floor((t - ts) / 60e3)) + ' min ago';
const minsAgo = (r, t) => Math.max(0, Math.floor((t - r.start) / 60e3));
const range = e => e.low === e.high ? String(e.low) : Number.isFinite(e.high) ? e.low + '–' + e.high : e.low + '+';
const trendText = rate => Math.abs(rate) < 0.05 ? '' : (rate > 0 ? ', filling about ' : ', emptying about ') + Math.abs(rate).toFixed(1) + ' a minute';

// Past staff counts, for "typical at this hour" (this device's log; plus shared history when sync is on).
let sharedHistory = [];
const historyList = () => [...sharedHistory, ...fieldLog.map(e => ({ zone: e.zone, t: Date.parse(e.start), count: e.open }))];

// Stall diagram: one small box per regular stall, in two rows like the bay itself.
// Filled from the left: taken, possibly taken, open. It shows how many, not which.
function stallStrip(z, e) {
  const n = DECK.zones[z].stalls, split = ParkingModel.stallSplit(n, e), rows = n > 20 ? 2 : 1, per = Math.ceil(n / rows);
  let boxes = '';
  for (let i = 0; i < n; i++) {
    const kind = !split ? 'u' : i < split.taken ? 't' : i < split.taken + split.maybe ? 'm' : 'o';
    boxes += `<rect class="s-${kind}" x="${(i % per) * 10 + 1}" y="${Math.floor(i / per) * 16 + 1}" width="8" height="13" rx="1.5"/>`;
  }
  const label = !split ? `${n} regular stalls, none with a current count`
    : `${n} regular stalls: ${split.taken} taken, ${split.maybe ? split.maybe + ' possibly taken, ' : ''}${split.open} open. Which stalls is not known`;
  return `<svg class="strip" viewBox="0 0 ${per * 10 + 1} ${rows * 16}" role="img" aria-label="${label}">${boxes}</svg>`;
}
function bayRow(z, t) {
  const r = records[z], e = est(z, t), src = e ? e.source : 'unknown';
  let detail;
  if (src === 'counted') detail = minsAgo(r, t) + ' min ago';
  else if (src === 'estimate') detail = `counted ${r.count}, ${minsAgo(r, t)} min ago`;
  else if (src === 'students') detail = `"${BAND_TEXT[e.band]}", ${ago(e.reportedAt, t)}` + (e.students > 1 ? ` · ${e.students} reports agree` : '');
  else { const typ = ParkingModel.typical(historyList(), z, t);
    detail = (r ? `last count ${minsAgo(r, t)} min ago` : 'no survey') + (typ ? ` · typically ${range(typ)} at this hour (${typ.samples} past counts)` : ''); }
  return `<li><button class="bay${z === selectedBay ? ' selected' : ''}" onclick="selectBay('${z}')" aria-pressed="${z === selectedBay}">` +
    `<span class="bay-name">${DECK.zones[z].label}</span>` +
    `<b class="bay-count">${e ? range(e) : '—'}</b>` +
    `<span class="status ${STATUS_CLASS[src]}">${STATUS_TEXT[src]} · ${detail}</span>${stallStrip(z, e)}</button></li>`;
}
function summaryText(sum) {
  return sum.state === 'unknown' ? ['—', 'availability not known']
    : sum.state === 'partial' ? ['≥' + sum.low, `in ${sum.knownBays} of ${sum.bays} bays · the rest unknown`]
    : sum.exact ? [String(sum.low), 'counted open · every bay counted in the last 5 minutes']
    : [range(sum), 'estimated open · ' + (sum.students ? 'includes student reports' : 'some counts are ageing')];
}
// A level with no regular stalls (all faculty/staff, accessible or reserved) is shown, but never as open to students.
function closedLevelCard(n) {
  const all = ALL_IDS.filter(z => DECK.zones[z].level === n).map(z => DECK.zones[z]), sum = k => all.reduce((x, z) => x + (z[k] || 0), 0);
  return `<article class="card"><h3>Level ${n}</h3><div class="count">—</div><div class="unit">no regular student stalls on this level</div>` +
    `<p class="small">Counted on foot: ${sum('facultyStaff')} faculty/staff, ${sum('accessible')} accessible, ${sum('otherReserved')} other reserved. Any time limits on those stalls were not recorded.</p></article>`;
}
function levelCard(n, t) {
  if (!zonesOf(n).length) return closedLevelCard(n);
  const [count, unit] = summaryText(ParkingModel.levelSummary(records, zonesOf(n), t, reports));
  return `<article class="card"><h3>Level ${n}${n === LEVELS[0] ? ' <span class="small">/ top deck</span>' : ''}</h3>` +
    `<div class="count">${count}</div><div class="unit">${unit}</div>` +
    `<ul class="bays">${zonesOf(n).map(z => bayRow(z, t)).join('')}</ul></article>`;
}
const VERDICT = { room: 'Room likely', tight: 'Tight', full: 'Likely full', unknown: 'Not enough counts to say' };
// The student picks when they will arrive. The verdict and "try first" are then worked out for THAT moment:
// every count is older by then, so ranges are wider, and a bay that was filling is projected forward.
let lead = 0; // minutes from now
function setLead(minutes) { lead = minutes; render(); }
function renderVerdict(now) {
  const t = now + lead * 60e3, d = ParkingModel.deckSummary(records, ZONE_IDS, t, reports), [count, unit] = summaryText(d);
  const newest = Math.min(...ZONE_IDS.map(z => records[z] ? now - records[z].start : Infinity));
  const arrive = '<span class="arrive">I arrive in ' + [0, 5, 10, 15].map(m =>
    `<button class="pick" aria-pressed="${lead === m}" onclick="setLead(${m})">${m ? m + ' min' : 'now'}</button>`).join(' ') + '</span>';
  $('verdict').innerHTML = `<span class="verdict-word ${d.verdict}">${VERDICT[d.verdict]}</span>` +
    `<span class="verdict-detail">${d.state === 'unknown' ? 'No bay has a usable count.' : `<b>${count}</b> open · ${unit}`}` +
    (lead ? ` · <b>predicted for ${lead} minutes from now</b>` : '') +
    (Number.isFinite(newest) ? ` · newest count ${Math.max(0, Math.floor(newest / 60e3))} min ago` : '') + '</span>' + arrive + bestBet(t);
}
// "Where should I try first?" Whole bays only: nothing here knows which individual spaces are open.
function bestBet(t) {
  const picks = ParkingModel.recommend(records, ZONE_IDS, t, 3, reports);
  if (!picks.length) return '<span class="best">No bay has a known open space right now. KSU\'s advice when a deck is full is a Shuttle Lot and the Big Owl Bus.</span>';
  const item = ({ zone, est }) => `<button class="pick" onclick="selectBay('${zone}')">${bayName(zone)} · <b>${range(est)}</b> open${{ counted: '', estimate: ' (estimate)', students: ' (student report)' }[est.source]}</button>`;
  return `<span class="best"><b>Try first:</b> ${item(picks[0])}${picks.length > 1 ? ' <span class="then">then</span> ' + picks.slice(1).map(item).join(' ') : ''}</span>`;
}
function render() {
  const t = now();
  renderVerdict(t);
  $('cards').innerHTML = LEVELS.map(n => levelCard(n, t)).join('');
  $('clock').textContent = (demo === 'nov19' ? 'Replay of Thu Nov 19, as if 11:58 AM' : demo === 'sample' ? 'Made-up sample data' : 'Counts entered on this device') +
    ' · clock moved forward ' + Math.round(offset / 60e3) + ' min · stall numbers counted on foot Nov 19.';
  if (!Sync.on) $('notice').innerHTML = demo === 'own' ? '<b>Test entries, not verified. Do not use for parking decisions.</b> Whatever is shown was typed in on this device. Not KSU data and not a KSU system.' : NOTICE[demo];
  renderNext();
  if (viewer) viewer.setBays(Object.fromEntries(ZONE_IDS.map(z => { const b = ParkingModel.bayState(records[z], t, reports, z); return [z, { state: b.state, label: b.est ? range(b.est) : '?' }]; })));
  renderSelection();
}
function selectBay(z) {
  if (!ZONE_IDS.includes(z)) { // tapped a bay on the model that has no regular stalls
    selectedBay = null; if (viewer) viewer.select(null); render();
    $('selection').textContent = 'That bay has no regular student stalls (faculty/staff, accessible or reserved), so it is not counted.'; return;
  }
  selectedBay = selectedBay === z ? null : z;
  if (selectedBay) { setView('student'); $('reportBay').value = selectedBay; } // a pick shows on the model and pre-fills the report form
  if (viewer) viewer.select(selectedBay);
  render();
}
function renderSelection() {
  const el = $('selection'); if (!el) return;
  if (!selectedBay) { el.textContent = 'Tap a bay on the model or in a level card.'; return; }
  const t = now(), r = records[selectedBay], e = est(selectedBay, t);
  el.textContent = bayName(selectedBay) + (DECK.zones[selectedBay].note ? ' (' + DECK.zones[selectedBay].note + ')' : '') + ': ' +
    (!e ? 'unknown' : e.counted ? r.count + ' counted open, ' + minsAgo(r, t) + ' min ago'
      : e.source === 'students' ? `${range(e)} open according to a student who parked here ${ago(e.reportedAt, t)} ("${BAND_TEXT[e.band]}"${e.students > 1 ? ', ' + e.students + ' reports agree' : ''}); not a staff count`
      : `estimated ${range(e)} open (${r.count} counted ${minsAgo(r, t)} min ago${trendText(e.rate)})`) +
    '. ' + stallNote(selectedBay) + '.';
}

// ---- Fewer taps: remember where this phone last parked (on this phone only) ----
// No GPS: location is unreliable inside a multi-level deck and cannot tell levels apart.
// Instead the bay comes from the last report, or from a link such as ?bay=L2_West (for a QR code posted in that bay).
const PARKED_KEY = 'west-deck-parked-v1';
function parkedHere() {
  try { const p = JSON.parse(localStorage.getItem(PARKED_KEY)); if (p && ZONE_IDS.includes(p.zone) && Number.isFinite(p.t)) return p; } catch (e) {}
  return null;
}
function renderParked() {
  const p = parkedHere(), el = $('parkedNote'), t = now();
  const current = p && t - p.t < 16 * 3600e3 && t >= p.t && !p.left;
  el.classList.toggle('hidden', !current);
  el.innerHTML = current ? `You reported parking in <b>${bayName(p.zone)}</b> at ${new Date(p.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. ` +
    `<button class="primary" style="margin-top:8px" onclick="leaveParked()">I'm leaving now: my space is opening</button>` : '';
  if (p && !$('reportBay').dataset?.chosen) $('reportBay').value = p.zone; // start on the bay used last time
}
function leaveParked() { const p = parkedHere(); if (!p) return; $('reportBay').value = p.zone; reportBay('leaving'); }

// ---- Student report: "I just parked here" (anonymous, low trust, expires) ----
function reportBay(band) {
  const zone = $('reportBay').value, t = now(), msg = $('reportMsg');
  let last = {}; try { last = JSON.parse(localStorage.getItem(REPORTED_KEY)) || {}; } catch (e) {}
  if (t - (last[zone] || 0) < Settings.studentRepeatMinutes * 60e3 && t >= (last[zone] || 0)) {
    msg.textContent = 'You already reported this bay a few minutes ago. One report per bay is enough.'; return; }
  const report = { zone, band, t };
  reports = ParkingModel.cleanReports([...reports, report], ZONE_IDS, t); saveReports();
  last[zone] = t; try { localStorage.setItem(REPORTED_KEY, JSON.stringify(last)); } catch (e) {}
  if (typeof shareReport === 'function') shareReport(report);
  try { localStorage.setItem(PARKED_KEY, JSON.stringify({ zone, t, left: band === 'leaving' })); } catch (e) {}
  render(); renderParked();
  msg.textContent = 'Thank you. ' + (est(zone, t)?.source === 'students'
    ? bayName(zone) + ' now shows "' + BAND_TEXT[band] + '" as a student report for the next ' + (band === 'leaving' ? Settings.studentLeavingMinutes : Settings.studentReportMinutes) + ' minutes.'
    : 'A staff count of ' + bayName(zone) + ' from the last 5 minutes is stronger evidence, so the display keeps it for now.');
}

// ---- Staff: where a fresh count would help most ----
function renderNext() {
  const picks = ParkingModel.recheckNext(records, ZONE_IDS, now(), reports, 3);
  $('countNext').innerHTML = picks.length ? '<b>Count next:</b> ' + picks.map((p, i) =>
    `<button class="pick" onclick="pickBay('${p.zone}')">${bayName(p.zone)}</button> <span class="small">${i ? '' : '(' + p.why + ')'}</span>`).join(' ')
    : 'Every bay has a fresh count. Nothing needs recounting yet.';
}
function pickBay(z) { if (!survey) $('bay').value = z; }

// ---- Staff survey ----
function fillBayOptions() {
  $('reportBay').innerHTML = $('bay').innerHTML = LEVELS.map(n => `<optgroup label="Level ${n}">` +
    zonesOf(n).map(z => `<option value="${z}">${bayName(z)}</option>`).join('') + '</optgroup>').join('');
}
function startSurvey() {
  const zone = $('bay').value;
  survey = { zone, start: now(), realStart: Date.now(), version: records[zone]?.version || 0, photos: [] };
  $('count').value = 0; $('coverage').checked = false; renderScan();
  $('surveyFields').classList.remove('hidden');
  $('start').disabled = true; $('bay').disabled = true; $('observer').disabled = true;
  $('modelled').textContent = stallNote(zone) + '.';
  feedback('Survey of ' + bayName(zone) + ' in progress. Nothing is published until you complete it.');
}
function cancelSurvey(message = 'Survey closed. No unfinished count was saved.') {
  survey = null;
  $('surveyFields').classList.add('hidden');
  $('start').disabled = false; $('bay').disabled = false; $('observer').disabled = false;
  $('scanCanvas').classList.add('hidden'); // the photo preview is discarded with the survey
  feedback(message);
}
function adjust(n) { const i = $('count'); i.value = Math.min(ParkingModel.MAX_COUNT, Math.max(0, (Number(i.value) || 0) + n)); }
function finishSurvey() {
  if (!survey) return; // a second tap after saving does nothing
  if (!$('coverage').checked) { feedback('Confirm you walked the whole bay once before saving.', true); return; }
  const raw = $('count').value;
  try {
    if (raw === '') throw Error('Enter a count, including 0 when no spaces are open.');
    const count = Number(raw), zone = survey.zone, started = survey.realStart;
    records = ParkingModel.complete(records, survey, count, now(), CATEGORY, { photos: survey.photos });
    save(); logSurvey(zone, records[zone], started); shareCount(zone, records[zone]);
    const over = count > DECK.zones[zone].stalls
      ? ' Note: that is above the ' + stallWord(zone) + ' stall count (' + DECK.zones[zone].stalls + '). One of the two numbers is wrong; worth recording.' : '';
    cancelSurvey(bayName(zone) + ' saved. The previous count was replaced, not added.' + over);
    render();
  } catch (e) { feedback(e.message, true); }
}

// ---- AI assist: a model counts vehicles in a photo, a person confirms ----
async function scanPhoto(input) {
  const file = input.files && input.files[0];
  if (!survey || !file) return;
  const status = $('scanStatus'), mine = survey;
  status.textContent = 'Counting vehicles on this device… the first photo also loads the model.';
  try {
    if (!window.CarCounter) throw Error('AI count is not available in this build. Count by eye instead.');
    const result = await window.CarCounter.count(file, $('scanCanvas'));
    if (survey !== mine) return; // survey was cancelled or finished while the model ran
    survey.photos.push({ ai: result.count, confirmed: result.count, outside: 0, added: 0, adjust: 0 });
    $('scanCanvas').classList.remove('hidden'); $('assist').open = true;
    status.textContent = '';
  } catch (e) { status.textContent = e.message; }
  input.value = ''; // let the same photo be chosen again
  renderScan();
}
function adjustPhoto(n) {
  const last = survey?.photos.at(-1); if (!last) return;
  last.adjust = Math.max(-(last.ai - last.outside + last.added), last.adjust + n); settlePhoto(last); renderScan();
}
// Confirmed = what the model found, minus boxes left out as outside the bay, plus or minus the person's own correction.
function settlePhoto(p) { p.confirmed = Math.min(ParkingModel.MAX_COUNT, Math.max(0, p.ai - p.outside + p.added + p.adjust)); }
// Tap a numbered box on the photo to leave it out: a car outside the deck, in the aisle, or in another bay.
function tapBox(event) {
  const last = survey?.photos.at(-1); if (!last || !window.CarCounter?.toggle) return;
  const marks = window.CarCounter.toggle($('scanCanvas'), event.clientX, event.clientY);
  if (!marks) return;
  last.outside = marks.out; last.added = marks.added; settlePhoto(last); renderScan();
}
function removePhoto() { if (survey?.photos.pop()) { $('scanCanvas').classList.add('hidden'); window.CarCounter?.forget?.(); renderScan(); } }
function useSuggestion() {
  if (!survey?.photos.length) return;
  $('count').value = ParkingModel.suggestOpen(DECK.zones[survey.zone].stalls, survey.photos).open;
}
function renderScan() {
  const el = $('scanPanel'), photos = survey?.photos || [];
  if (!photos.length) { el.innerHTML = ''; return; }
  const last = photos.at(-1), stalls = DECK.zones[survey.zone].stalls, s = ParkingModel.suggestOpen(stalls, photos);
  el.innerHTML = `<p><b>Photo ${photos.length}:</b> the model found <b>${last.ai}</b> vehicles. <b>Tap any box that is not in this bay</b> (a car outside the deck, in the aisle, or in another bay) to leave it out${last.outside ? ': <b>' + last.outside + ' left out</b>' : ''}. <b>Tap a vehicle it missed</b> to add it${last.added ? ': <b>' + last.added + ' added</b>' : ''}. The − and + buttons also work.</p>` +
    `<div class="number-controls"><button class="secondary" aria-label="One fewer vehicle" onclick="adjustPhoto(-1)">−</button>` +
    `<output class="confirmed" aria-label="Confirmed vehicles in this photo">${last.confirmed}</output>` +
    `<button class="secondary" aria-label="One more vehicle" onclick="adjustPhoto(1)">+</button></div>` +
    `<p class="small">Bay so far: <b>${s.vehicles}</b> vehicles in ${photos.length} photo${photos.length > 1 ? 's' : ''}. Don't photograph the same cars twice.</p>` +
    `<p class="small">Suggestion: ${stalls} ${stallWord(survey.zone)} stalls − ${s.vehicles} vehicles = <b>${s.open} open</b>. ${counted(survey.zone) ? 'Vehicles' : 'The stall number is a model estimate, and vehicles'} in restricted spaces are included, so check before you save.</p>` +
    `<div class="row"><button class="secondary" onclick="useSuggestion()">Use ${s.open} as the count</button><button class="secondary" onclick="removePhoto()">Remove last photo</button></div>`;
}

// ---- Field log: every completed survey, for the validation study ----
const LOG_KEY = 'west-deck-fieldlog-v1';
let fieldLog = [];
try { const l = JSON.parse(localStorage.getItem(LOG_KEY)); if (Array.isArray(l)) fieldLog = l.filter(e => e && typeof e.zone === 'string' && DECK.zones[e.zone]); } catch (e) {}
function logSurvey(zone, rec, realStart) {
  const end = Date.now(), obs = $('observer').value === 'B' ? 'B' : 'A';
  fieldLog.push({ zone, observer: obs, start: new Date(realStart).toISOString(), end: new Date(end).toISOString(),
    seconds: Math.round((end - realStart) / 1000), open: rec.count, method: rec.method, photos: rec.photos,
    aiMode: rec.photos.length ? (Settings.detectTiles > 1 ? 'tiled' : 'single') : '',
    clockOffsetMin: Math.round(offset / 60e3) });
  try { localStorage.setItem(LOG_KEY, JSON.stringify(fieldLog)); } catch (e) {}
  renderLog();
}
function fieldLogCsv() {
  const head = 'zone,observer,start_iso,end_iso,duration_s,open_count,method,photos,ai_vehicles,confirmed_vehicles,per_photo_ai>confirmed,demo_clock_offset_min,ai_mode,vehicles_left_out_as_outside_bay';
  const sum = (ps, k) => ps.reduce((n, p) => n + p[k], 0);
  return [head, ...fieldLog.map(e => { const ps = ParkingModel.cleanExtra(e).photos; return [e.zone, e.observer, e.start, e.end,
    Number(e.seconds) || 0, Number(e.open) || 0, ps.length ? 'ai-assisted' : 'manual', ps.length, sum(ps, 'ai'), sum(ps, 'confirmed'),
    ps.map(p => p.ai + '>' + p.confirmed).join('|'), Number(e.clockOffsetMin) || 0, e.aiMode === 'tiled' || e.aiMode === 'single' ? e.aiMode : (ps.length ? 'single' : ''), ps.reduce((n, p) => n + (p.outside || 0), 0)].join(','); })].join('\n') + '\n';
}
// Real counts per bay in time order, from the log: the data the estimate is checked against.
function logSeries() {
  const byZone = {};
  for (const e of fieldLog) { const t = Date.parse(e.start); if (Number.isFinite(t) && Number.isInteger(e.open)) (byZone[e.zone] ??= []).push({ t, count: e.open }); }
  return Object.values(byZone);
}
function renderLog() {
  const acc = ParkingModel.aiAccuracy(fieldLog.flatMap(e => ParkingModel.cleanExtra(e).photos));
  const series = logSeries(), bt = ParkingModel.backtest(series), v = ParkingModel.variability(series);
  $('logSummary').textContent = fieldLog.length + ' completed survey' + (fieldLog.length === 1 ? '' : 's') + ' logged on this device.' +
    (acc ? ` Model vs. person on ${acc.photos} photo${acc.photos === 1 ? '' : 's'}: exact on ${acc.exact}, average error ${acc.meanAbsError.toFixed(1)} vehicles (${acc.missed} missed, ${acc.extra} extra)${acc.outside ? '; ' + acc.outside + ' found correctly but outside the bay and left out' : ''}.` : '') +
    (bt ? ` Estimate check: the later real count fell inside the range in ${bt.inside} of ${bt.cases} cases; the middle estimate was off by ${bt.meanAbsError.toFixed(1)} spaces on average.` : '') +
    (v !== null ? ` Measured variability: ${v.toFixed(2)} (the page assumes ${ParkingModel.SIGMA}).` : '');
}
function exportLog() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([fieldLogCsv()], { type: 'text/csv' }));
  a.download = 'west-deck-field-log-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.csv';
  a.click(); URL.revokeObjectURL(a.href);
}
function clearLog() {
  if (typeof confirm === 'function' && !confirm('Delete the field log on this device? Export it first if you need it.')) return;
  fieldLog = []; try { localStorage.setItem(LOG_KEY, '[]'); } catch (e) {} renderLog();
}

// ---- Sharing between phones (only when Settings.syncUrl is set; see src/sync.js) ----
// Anything to send waits in an outbox, so a count made with no signal is sent later.
const OUTBOX_KEY = 'west-deck-outbox-v1';
let outbox = [];
try { const o = JSON.parse(localStorage.getItem(OUTBOX_KEY)); if (Array.isArray(o)) outbox = o.slice(-200); } catch (e) {}
const saveOutbox = () => { try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox)); } catch (e) {} };
function shareCount(zone, record) {
  if (!Sync.on) return;
  outbox.push({ kind: 'count', zone, data: record }, { kind: 'history', data: { zone, t: record.start, count: record.count } });
  saveOutbox(); syncNow();
}
function shareReport(report) { if (!Sync.on) return; outbox.push({ kind: 'report', data: report }); saveOutbox(); syncNow(); }
let syncing = null;
function syncNow() {
  if (!Sync.on) return Promise.resolve();
  // If a round is already running it may have passed the sending step, so go again afterwards when something is waiting.
  if (syncing) return syncing.then(result => outbox.length && result !== 'failed' ? syncNow() : result);
  return syncing = (async () => {
    try {
      while (outbox.length) { // send oldest first; stop at the first failure and keep the rest
        const item = outbox[0];
        await (item.kind === 'count' ? Sync.saveCount(item.zone, item.data) : item.kind === 'report' ? Sync.addReport(item.data) : Sync.addHistory(item.data));
        outbox.shift(); saveOutbox();
      }
      const remote = await Sync.pull(), t = now(), theirs = ParkingModel.sanitize(remote.counts, ZONE_IDS);
      for (const z of ZONE_IDS) if (theirs[z] && (!records[z] || theirs[z].start > records[z].start)) records[z] = theirs[z]; // newest count wins
      const seen = new Set();
      reports = ParkingModel.cleanReports([...remote.reports, ...reports], ZONE_IDS, t).filter(r => { const k = r.zone + r.band + r.t; return !seen.has(k) && seen.add(k); });
      sharedHistory = remote.history.filter(h => h && DECK.zones[h.zone] && Number.isFinite(h.t) && Number.isInteger(h.count));
      save(); saveReports(); render();
      $('syncStatus').textContent = 'Shared between phones · updated ' + new Date().toLocaleTimeString();
    } catch (e) {
      $('syncStatus').textContent = 'Sharing is unavailable right now; showing what this phone has.' + (outbox.length ? ' ' + outbox.length + ' item(s) waiting to send.' : '');
      return 'failed';
    }
  })().finally(() => { syncing = null; });
}
function startSharing() {
  if (!Sync.on) return;
  $('demoControls').classList.add('hidden'); // a simulated clock makes no sense with shared real entries
  $('notice').innerHTML = '<b>Test build. Do not use for parking decisions.</b> Counts and reports here are typed in by testers and are not verified. Not a KSU system.';
  syncNow(); setInterval(syncNow, 15000);
}
// A link between the two modes, shown only when a shared database is configured.
function renderModeLink() {
  if (!Sync.available) return;
  $('modeLink').innerHTML = Sync.on ? 'Live shared test mode. <a href="./">Back to the replay demo</a>' : '<a href="?live">Open the live shared test</a> (counts and reports typed in by testers, shared between phones)';
}

// ---- Demo controls ----
function advance(m) { offset += m * 60e3; save(); render(); }
function resetDemo() { loadDemo(demo === 'own' ? 'nov19' : demo); }
function clearDemo() { cancelSurvey(); records = {}; reports = []; demo = 'own'; saveReports(); save(); render(); } // from here on, whatever is shown was entered on this device

// ---- 3D model (optional: the page works without it) ----
async function mountViewer() {
  const box = $('deck3d');
  if (!box) return;
  if (typeof window.DeckViewer === 'undefined' || typeof GLB_B64 === 'undefined') {
    $('viewerNote').textContent = '3D view is not included in this build. The level cards show the same data.'; return;
  }
  try {
    viewer = await window.DeckViewer.mount(box, GLB_B64, { onPick: selectBay, bayIds: ALL_IDS });
    viewer.setSpread($('spread').getAttribute('aria-pressed') === 'true', true); // apart by default, no animation on load
    $('viewerNote').textContent = 'Drag to rotate. Tap a bay to see its observation.';
    render();
  } catch (e) {
    viewer = null;
    $('viewerNote').textContent = '3D view unavailable in this browser (' + e.message + '). The level cards show the same data.';
  }
}
function toggleSpread() {
  const on = $('spread').getAttribute('aria-pressed') !== 'true';
  $('spread').setAttribute('aria-pressed', String(on));
  if (viewer) viewer.setSpread(on);
}

load(); loadReports(); fillBayOptions(); renderLog(); render();
try { if (!localStorage.getItem('west-deck-intro-v1')) $('intro').classList.remove('hidden'); } catch (e) {}
renderParked();
// Links: ?report opens straight at the student report panel; ?bay=L2_West also picks the bay (for a QR code posted in that bay).
if (typeof location !== 'undefined') {
  const q = location.search || '', bay = (/[?&]bay=([\w]+)/.exec(q) || [])[1];
  if (bay && ZONE_IDS.includes(bay)) $('reportBay').value = bay;
  if (bay || /[?&]report\b/.test(q)) { setView('student'); const el = $('reportPanel'); if (el.scrollIntoView) el.scrollIntoView(); }
}
window.addEventListener('storage', e => {
  if (e.key === REPORT_KEY) { loadReports(); render(); return; }
  if (e.key !== KEY) return;
  try { const d = JSON.parse(e.newValue); if (d && typeof d.offset === 'number') { records = ParkingModel.sanitize(d.records, ZONE_IDS); offset = d.offset; render(); } } catch (err) {}
});
setInterval(render, 10000);
startSharing(); renderModeLink();
mountViewer();
// Installable app: only when served from a web address (not from a file).
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof location !== 'undefined' && /^https?:$/.test(location.protocol))
  navigator.serviceWorker.register('sw.js').catch(() => {});
