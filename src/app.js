// App: DOM + storage around the pure ParkingModel.
// `DECK` is injected by scripts/build.cjs from data/deck.json (bays and stall numbers).
// `Settings` comes from src/settings.js.
const CATEGORY = Settings.category;
const KEY = 'west-deck-prototype-v2';
const ZONE_IDS = Object.keys(DECK.zones);
const LEVELS = [...new Set(ZONE_IDS.map(z => DECK.zones[z].level))].sort((a, b) => b - a); // top first
const zonesOf = n => ZONE_IDS.filter(z => DECK.zones[z].level === n);
const bayName = z => 'Level ' + DECK.zones[z].level + ' · ' + DECK.zones[z].label;
// Stall numbers are either a 3D-model estimate or counted on foot; always say which.
const counted = z => DECK.zones[z].source === 'counted';
const stallWord = z => counted(z) ? 'counted' : 'modelled';
const stallNote = z => counted(z)
  ? 'Stalls: ' + DECK.zones[z].stalls + ' (counted on foot' + (DECK.zones[z].countedOn ? ', ' + DECK.zones[z].countedOn : '') + ')'
  : 'Modelled stalls: ' + DECK.zones[z].stalls + ' (3D model estimate, not a KSU figure)';

let records = {}, offset = 0, survey = null, viewer = null, selectedBay = null;
const now = () => Date.now() + offset;
const $ = id => document.getElementById(id);

function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ records, offset })); }
  catch (e) { feedback('Storage unavailable. This demo lasts only until the page closes.', true); }
}
// ILLUSTRATIVE sample data, not observations. Covers every display state:
// just counted, ageing with and without a trend, and unknown.
function seed() {
  const t = now(), ago = m => t - m * 60e3;
  const rec = (count, minsAgo, prev) => ({ count, start: ago(minsAgo), end: ago(minsAgo - 1), version: prev ? 2 : 1,
    category: CATEGORY, method: 'manual', photos: [], ...(prev ? { prev: { count: prev[0], start: ago(prev[1]) } } : {}) });
  records = { L3_West: rec(6, 2), L3_Centre: rec(0, 3), L3_East: rec(11, 1),
              L2_West: rec(4, 2), L2_Centre: rec(7, 8, [12, 18]), L2_East: rec(2, 4),
              L1_West: rec(9, 21) };
}
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved.offset === 'number') { records = ParkingModel.sanitize(saved.records, ZONE_IDS); offset = saved.offset; return; }
  } catch (e) {}
  seed();
}
function feedback(text, error = false) { const el = $('feedback'); el.textContent = text; el.classList.toggle('error', error); }

function setView(id) {
  for (const name of ['student', 'staff', 'about']) {
    $(name).classList.toggle('hidden', name !== id);
    $(name + 'Tab').classList.toggle('active', name === id);
    $(name + 'Tab').setAttribute('aria-selected', String(name === id));
  }
}

const STATUS_TEXT = { recent: 'Counted', estimate: 'Estimate', unknown: 'Unknown' };
const minsAgo = (r, t) => Math.max(0, Math.floor((t - r.start) / 60e3));
const range = e => e.low === e.high ? String(e.low) : e.low + '–' + e.high;
const trendText = rate => Math.abs(rate) < 0.05 ? '' : (rate > 0 ? ', filling about ' : ', emptying about ') + Math.abs(rate).toFixed(1) + ' a minute';

function bayRow(z, t) {
  const r = records[z], s = ParkingModel.status(r, t), e = ParkingModel.estimate(r, t);
  const detail = s === 'recent' ? minsAgo(r, t) + ' min ago' : s === 'estimate' ? `counted ${r.count}, ${minsAgo(r, t)} min ago`
    : r ? `last count ${minsAgo(r, t)} min ago` : 'no survey';
  return `<li><button class="bay${z === selectedBay ? ' selected' : ''}" onclick="selectBay('${z}')" aria-pressed="${z === selectedBay}">` +
    `<span class="bay-name">${DECK.zones[z].label}</span>` +
    `<b class="bay-count">${e ? range(e) : '—'}</b>` +
    `<span class="status ${s}">${STATUS_TEXT[s]} · ${detail}</span></button></li>`;
}
function summaryText(sum) {
  return sum.state === 'unknown' ? ['—', 'availability not known']
    : sum.state === 'partial' ? ['≥' + sum.low, `in ${sum.knownBays} of ${sum.bays} bays · the rest unknown`]
    : sum.exact ? [String(sum.low), 'counted open · every bay counted in the last 5 minutes']
    : [range(sum), 'estimated open · some counts are ageing'];
}
function levelCard(n, t) {
  const [count, unit] = summaryText(ParkingModel.levelSummary(records, zonesOf(n), t));
  return `<article class="card"><h3>Level ${n} <span class="small">/ ${n === LEVELS[0] ? 'top deck, ' : ''}example</span></h3>` +
    `<div class="count">${count}</div><div class="unit">${unit}</div>` +
    `<ul class="bays">${zonesOf(n).map(z => bayRow(z, t)).join('')}</ul></article>`;
}
const VERDICT = { room: 'Room likely', tight: 'Tight', full: 'Likely full', unknown: 'Not enough counts to say' };
function renderVerdict(t) {
  const d = ParkingModel.deckSummary(records, ZONE_IDS, t), [count, unit] = summaryText(d);
  $('verdict').innerHTML = `<span class="verdict-word ${d.verdict}">${VERDICT[d.verdict]}</span>` +
    `<span class="verdict-detail">${d.state === 'unknown' ? 'No bay has a usable count.' : `<b>${count}</b> open · ${unit}`}</span>` + bestBet(t);
}
// "Where should I try first?" Whole bays only: nothing here knows which individual spaces are open.
function bestBet(t) {
  const picks = ParkingModel.recommend(records, ZONE_IDS, t);
  if (!picks.length) return '<span class="best">No bay has a known open space right now. KSU\'s advice when a deck is full is a Shuttle Lot and the Big Owl Bus.</span>';
  const item = ({ zone, est }) => `<button class="pick" onclick="selectBay('${zone}')">${bayName(zone)} · <b>${range(est)}</b> open${est.counted ? '' : ' (estimate)'}</button>`;
  return `<span class="best"><b>Try first:</b> ${item(picks[0])}${picks.length > 1 ? ' <span class="then">then</span> ' + picks.slice(1).map(item).join(' ') : ''}</span>`;
}
function render() {
  const t = now();
  renderVerdict(t);
  $('cards').innerHTML = LEVELS.map(n => levelCard(n, t)).join('');
  $('clock').textContent = 'Simulated clock: ' + new Date(t).toLocaleTimeString() + ' · +' +
    Math.round(offset / 60e3) + ' min · illustrative values; real capacity unknown.';
  if (viewer) viewer.setBays(Object.fromEntries(ZONE_IDS.map(z => { const b = ParkingModel.bayState(records[z], t); return [z, { state: b.state, label: b.est ? range(b.est) : '?' }]; })));
  renderSelection();
}
function selectBay(z) {
  selectedBay = selectedBay === z ? null : z;
  if (selectedBay) setView('student'); // a pick from the verdict shows on the model
  if (viewer) viewer.select(selectedBay);
  render();
}
function renderSelection() {
  const el = $('selection'); if (!el) return;
  if (!selectedBay) { el.textContent = 'Tap a bay on the model or in a level card.'; return; }
  const t = now(), r = records[selectedBay], e = ParkingModel.estimate(r, t);
  el.textContent = bayName(selectedBay) + (DECK.zones[selectedBay].note ? ' (' + DECK.zones[selectedBay].note + ')' : '') + ': ' +
    (!e ? 'unknown' : e.counted ? r.count + ' counted open, ' + minsAgo(r, t) + ' min ago'
      : `estimated ${range(e)} open (${r.count} counted ${minsAgo(r, t)} min ago${trendText(e.rate)})`) +
    '. ' + stallNote(selectedBay) + '.';
}

// ---- Staff survey ----
function fillBayOptions() {
  $('bay').innerHTML = LEVELS.map(n => `<optgroup label="Level ${n}">` +
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
    save(); logSurvey(zone, records[zone], started);
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
    survey.photos.push({ ai: result.count, confirmed: result.count });
    $('scanCanvas').classList.remove('hidden');
    status.textContent = '';
  } catch (e) { status.textContent = e.message; }
  input.value = ''; // let the same photo be chosen again
  renderScan();
}
function adjustPhoto(n) {
  const last = survey?.photos.at(-1); if (!last) return;
  last.confirmed = Math.min(ParkingModel.MAX_COUNT, Math.max(0, last.confirmed + n)); renderScan();
}
function removePhoto() { if (survey?.photos.pop()) { $('scanCanvas').classList.add('hidden'); renderScan(); } }
function useSuggestion() {
  if (!survey?.photos.length) return;
  $('count').value = ParkingModel.suggestOpen(DECK.zones[survey.zone].stalls, survey.photos).open;
}
function renderScan() {
  const el = $('scanPanel'), photos = survey?.photos || [];
  if (!photos.length) { el.innerHTML = ''; return; }
  const last = photos.at(-1), stalls = DECK.zones[survey.zone].stalls, s = ParkingModel.suggestOpen(stalls, photos);
  el.innerHTML = `<p><b>Photo ${photos.length}:</b> the model found <b>${last.ai}</b> vehicles. Check the numbered boxes, then correct the number if it missed or doubled any.</p>` +
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
    clockOffsetMin: Math.round(offset / 60e3) });
  try { localStorage.setItem(LOG_KEY, JSON.stringify(fieldLog)); } catch (e) {}
  renderLog();
}
function fieldLogCsv() {
  const head = 'zone,observer,start_iso,end_iso,duration_s,open_count,method,photos,ai_vehicles,confirmed_vehicles,per_photo_ai>confirmed,demo_clock_offset_min';
  const sum = (ps, k) => ps.reduce((n, p) => n + p[k], 0);
  return [head, ...fieldLog.map(e => { const ps = ParkingModel.cleanExtra(e).photos; return [e.zone, e.observer, e.start, e.end,
    Number(e.seconds) || 0, Number(e.open) || 0, ps.length ? 'ai-assisted' : 'manual', ps.length, sum(ps, 'ai'), sum(ps, 'confirmed'),
    ps.map(p => p.ai + '>' + p.confirmed).join('|'), Number(e.clockOffsetMin) || 0].join(','); })].join('\n') + '\n';
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
    (acc ? ` Model vs. person on ${acc.photos} photo${acc.photos === 1 ? '' : 's'}: exact on ${acc.exact}, average error ${acc.meanAbsError.toFixed(1)} vehicles (${acc.missed} missed, ${acc.extra} extra).` : '') +
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

// ---- Demo controls ----
function advance(m) { offset += m * 60e3; save(); render(); }
function resetDemo() { cancelSurvey(); offset = 0; seed(); save(); render(); }
function clearDemo() { cancelSurvey(); records = {}; save(); render(); }

// ---- 3D model (optional: the page works without it) ----
async function mountViewer() {
  const box = $('deck3d');
  if (!box) return;
  if (typeof window.DeckViewer === 'undefined' || typeof GLB_B64 === 'undefined') {
    $('viewerNote').textContent = '3D view is not included in this build. The level cards show the same data.'; return;
  }
  try {
    viewer = await window.DeckViewer.mount(box, GLB_B64, { onPick: selectBay });
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

load(); fillBayOptions(); renderLog(); render();
window.addEventListener('storage', e => {
  if (e.key !== KEY) return;
  try { const d = JSON.parse(e.newValue); if (d && typeof d.offset === 'number') { records = ParkingModel.sanitize(d.records, ZONE_IDS); offset = d.offset; render(); } } catch (err) {}
});
setInterval(render, 10000);
mountViewer();
// Installable app: only when served from a web address (not from a file).
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof location !== 'undefined' && /^https?:$/.test(location.protocol))
  navigator.serviceWorker.register('sw.js').catch(() => {});
