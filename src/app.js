// App: DOM + storage around the pure ParkingModel. `DECK` is injected by
// build.cjs from assets/west_deck.json (the friend's 3D model data).
const BAY_LABEL = { West: 'West bay', Centre: 'Centre ramp bay', East: 'East bay' };
const BAY_NOTE = { West: 'one-way northbound', Centre: 'ramp, rises south to north', East: 'one-way southbound' };
const CATEGORY = 'Example general permit (illustrative)';
const KEY = 'west-deck-prototype-v2';
const ZONE_IDS = Object.keys(DECK.zones);
const LEVELS = [...new Set(ZONE_IDS.map(z => DECK.zones[z].level))].sort((a, b) => b - a); // top first
const zonesOf = n => ZONE_IDS.filter(z => DECK.zones[z].level === n);
const bayName = z => 'Level ' + DECK.zones[z].level + ' · ' + BAY_LABEL[DECK.zones[z].zone];

let records = {}, offset = 0, survey = null, viewer = null, selectedBay = null;
const now = () => Date.now() + offset;
const $ = id => document.getElementById(id);

function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ records, offset })); }
  catch (e) { feedback('Storage unavailable. This demo lasts only until the page closes.', true); }
}
// ILLUSTRATIVE sample data, not observations. Covers every display state.
function seed() {
  const t = now(), rec = (count, minsAgo, dur = 2) =>
    ({ count, start: t - minsAgo * 60e3, end: t - (minsAgo - dur) * 60e3, version: 1, category: CATEGORY });
  records = { L3_West: rec(6, 2), L3_Centre: rec(0, 3), L3_East: rec(11, 1, 1),
              L2_West: rec(4, 2), L2_Centre: rec(7, 8), L2_East: rec(2, 4) };
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
  for (const name of ['student', 'staff', 'backup', 'about']) {
    $(name).classList.toggle('hidden', name !== id);
    $(name + 'Tab').classList.toggle('active', name === id);
    $(name + 'Tab').setAttribute('aria-selected', String(name === id));
  }
}

const STATUS_TEXT = { recent: 'Recent', stale: 'Stale', unknown: 'Unknown' };
function bayRow(z, t) {
  const r = records[z], s = ParkingModel.status(r, t);
  const age = r ? Math.max(0, Math.floor((t - r.start) / 60e3)) + ' min ago' : 'no survey';
  return `<li><button class="bay${z === selectedBay ? ' selected' : ''}" onclick="selectBay('${z}')" aria-pressed="${z === selectedBay}">` +
    `<span class="bay-name">${BAY_LABEL[DECK.zones[z].zone]}</span>` +
    `<b class="bay-count">${s === 'recent' ? r.count : '—'}</b>` +
    `<span class="status ${s}">${STATUS_TEXT[s]} · ${age}</span></button></li>`;
}
function levelCard(n, t) {
  const sum = ParkingModel.levelSummary(records, zonesOf(n), t);
  const [count, unit] = sum.state === 'complete' ? [sum.total, 'observed open · all bays recent']
    : sum.state === 'partial' ? ['≥' + sum.atLeast, `in ${sum.recentBays} of ${sum.bays} bays · level total not known`]
    : ['—', 'availability not known'];
  return `<article class="card"><h3>Level ${n} <span class="small">/ ${n === LEVELS[0] ? 'top deck, ' : ''}example</span></h3>` +
    `<div class="count">${count}</div><div class="unit">${unit}</div>` +
    `<ul class="bays">${zonesOf(n).map(z => bayRow(z, t)).join('')}</ul></article>`;
}
function render() {
  const t = now();
  $('cards').innerHTML = LEVELS.map(n => levelCard(n, t)).join('');
  $('clock').textContent = 'Simulated clock: ' + new Date(t).toLocaleTimeString() + ' · +' +
    Math.round(offset / 60e3) + ' min · illustrative values; real capacity unknown.';
  if (viewer) viewer.setStatuses(Object.fromEntries(ZONE_IDS.map(z => [z, ParkingModel.status(records[z], t)])));
  renderSelection();
}
function selectBay(z) {
  selectedBay = selectedBay === z ? null : z;
  if (viewer) viewer.select(selectedBay);
  render();
}
function renderSelection() {
  const el = $('selection'); if (!el) return;
  if (!selectedBay) { el.textContent = 'Tap a bay on the model or in a level card.'; return; }
  const r = records[selectedBay], s = ParkingModel.status(r, now());
  el.textContent = bayName(selectedBay) + ' (' + BAY_NOTE[DECK.zones[selectedBay].zone] + '): ' +
    (s === 'recent' ? r.count + ' observed open' : s === 'stale' ? 'stale, count hidden' : 'unknown') +
    '. Modelled stalls: ' + DECK.zones[selectedBay].stalls + ' (from the 3D model, not KSU).';
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
  $('modelled').textContent = 'Modelled stalls in this bay: ' + DECK.zones[zone].stalls + ' (3D model estimate, not a KSU figure).';
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
      ? ' Note: that is above the modelled stall count (' + DECK.zones[zone].stalls + '), so the model may be wrong. Worth recording.' : '';
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
    `<p class="small">Suggestion: ${stalls} modelled stalls − ${s.vehicles} vehicles = <b>${s.open} open</b>. The stall number is a model estimate, and vehicles in restricted spaces are included, so check before you save.</p>` +
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
function renderLog() {
  const acc = ParkingModel.aiAccuracy(fieldLog.flatMap(e => ParkingModel.cleanExtra(e).photos));
  $('logSummary').textContent = fieldLog.length + ' completed survey' + (fieldLog.length === 1 ? '' : 's') + ' logged on this device.' +
    (acc ? ` Model vs. person on ${acc.photos} photo${acc.photos === 1 ? '' : 's'}: exact on ${acc.exact}, average error ${acc.meanAbsError.toFixed(1)} vehicles (${acc.missed} missed, ${acc.extra} extra).` : '');
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

// ---- Student backup: simulated entry/exit reports (separate, low trust) ----
const MOVEMENT_KEY = 'west-deck-demo-movements-v1';
let movements = { in: 0, out: 0 }, lastReport = 0;
try { const m = JSON.parse(localStorage.getItem(MOVEMENT_KEY));
  if (m && Number.isInteger(m.in) && Number.isInteger(m.out) && m.in >= 0 && m.out >= 0) movements = m; } catch (e) {}
function renderMovements() {
  $('movementStats').innerHTML = '<p><b>' + movements.in + '</b> entry reports · <b>' + movements.out + '</b> exit reports</p>' +
    '<p class="small">Reported net movement: ' + (movements.in - movements.out) + ' · this browser only · not a vehicle count</p>';
}
function reportMovement(direction) {
  const t = Date.now();
  if (t - lastReport < 3000) { $('reportFeedback').textContent = 'Wait a moment before another demo report. Repeated taps may duplicate an event.'; return; }
  lastReport = t; movements[direction]++;
  try { localStorage.setItem(MOVEMENT_KEY, JSON.stringify(movements)); } catch (e) {}
  renderMovements();
  $('reportFeedback').textContent = 'Simulated ' + (direction === 'in' ? 'entry' : 'exit') + ' report recorded. No vacancy estimate was changed.';
}
function clearReports() {
  movements = { in: 0, out: 0 }; lastReport = 0;
  try { localStorage.setItem(MOVEMENT_KEY, JSON.stringify(movements)); } catch (e) {}
  renderMovements(); $('reportFeedback').textContent = 'Simulated movement reports cleared.';
}

// ---- 3D model (optional: the page works without it) ----
async function mountViewer() {
  const box = $('deck3d');
  if (!box || typeof window.DeckViewer === 'undefined' || typeof GLB_B64 === 'undefined') return;
  try {
    viewer = await window.DeckViewer.mount(box, GLB_B64, { onPick: selectBay });
    viewer.setSpread($('spread').getAttribute('aria-pressed') === 'true'); // spread by default: lower bays visible
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

load(); fillBayOptions(); renderMovements(); renderLog(); render();
window.addEventListener('storage', e => {
  if (e.key !== KEY) return;
  try { const d = JSON.parse(e.newValue); if (d && typeof d.offset === 'number') { records = ParkingModel.sanitize(d.records, ZONE_IDS); offset = d.offset; render(); } } catch (err) {}
});
setInterval(render, 10000);
mountViewer();
