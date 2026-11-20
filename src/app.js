// App: DOM + storage around the pure ParkingModel.
// `DECK` is injected by scripts/build.cjs from data/deck.json (bays and stall numbers).
// `Settings` comes from src/settings.js.
const CATEGORY = Settings.category;
const KEY = Sync.on ? 'west-deck-live-v1' : 'west-deck-prototype-v2'; // live (shared) mode keeps its own data, apart from the demo's
const ALL_IDS = Object.keys(DECK.zones);
const ZONE_IDS = ALL_IDS.filter(z => DECK.zones[z].stalls > 0); // bays with regular stalls: the only ones surveyed and shown as open
const LEVELS = [...new Set(ALL_IDS.map(z => DECK.zones[z].level))].sort((a, b) => b - a); // top first
const zonesOf = n => ZONE_IDS.filter(z => DECK.zones[z].level === n);
const shortName = z => DECK.zones[z].label.split(' ')[0]; // West, Centre, East, North, South
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
  nov19: '<b>A replay, not live.</b> Thursday, Nov 19, 2026, 11:58 AM',
  sample: '<b>Not live:</b> made-up sample data.',
};
function loadDemo(kind) { cancelSurvey(); demo = kind === 'sample' ? 'sample' : 'nov19'; offset = 0; (demo === 'sample' ? seed : seedNov19)(); reports = []; saveReports(); save(); render(); }

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

// The app is a row of full-size screens. Swipe sideways or use the bottom bar; `setView` jumps to one.
const SCREENS = ['student', 'deck', 'levels', 'report', 'staff', 'about'];
// ---- The guide: one line above the bottom bar that says the most useful next step, with one button. ----
// It is driven by the same prediction the Now screen uses (where to try first), by what this phone last
// reported (so leaving is one tap), and by which bay most needs a count. It is rules, not a chatbot.
let screenNow = 'student', flash = null, guideAct = null;
function say(text, ms = 4000) { flash = { text, until: Date.now() + ms }; renderGuide(); if (typeof setTimeout === 'function') setTimeout(renderGuide, ms + 60); }
function guideTap() { if (guideAct) guideAct(); }
function showBay(zone) { selectedBay = zone; $('reportBay').value = zone; setView('deck'); if (viewer) viewer.select(zone); render(); }
function renderGuide() {
  const t = now(); let text = '', label = '', act = null, warn = false;
  if (flash && Date.now() < flash.until) text = flash.text;
  else if (TRY && !reviewed()) { text = 'Trying the app? Tell us what you think.'; label = 'Rate it'; act = openReview; }
  else {
    const p = parkedHere(), parked = p && !p.left && t - p.t < 16 * 3600e3 && t >= p.t;
    if (screenNow === 'staff') {
      const next = ParkingModel.recheckNext(records, ZONE_IDS, t, reports, 1)[0];
      if (survey) text = 'Scan the bay with the camera, or tally by hand. Then Save.';
      else if (next) { text = 'Count next: ' + bayName(next.zone); label = 'Start'; act = () => pickBay(next.zone); }
      else text = 'Every bay has a fresh count.';
    } else if (parked) { text = 'Parked in ' + bayName(p.zone) + '. Leaving?'; label = "I'm leaving"; act = leaveParked; }
    else if (screenNow === 'report') text = 'Tap your bay, then how full it is.';
    else {
      const pick = ParkingModel.recommend(records, ZONE_IDS, t + lead * 60e3, 1, reports)[0];
      // Someone who has not reported yet is nudged, once per screen, to the one place they can help.
      if (screenNow === 'deck' && selectedBay) { text = 'Parked in ' + bayName(selectedBay) + '?'; label = 'I parked here'; act = () => parkHere(selectedBay); }
      else if (screenNow === 'deck' && pick) { text = 'Best bet: ' + bayName(pick.zone) + ' · ' + range(pick.est) + ' open'; label = 'I parked here'; act = () => parkHere(pick.zone); }
      else if (screenNow === 'about' && pick) { text = 'Best bet: ' + bayName(pick.zone) + ' · ' + range(pick.est) + ' open'; label = 'Show me'; act = () => showBay(pick.zone); }
      else if (!pick && lastTop(t)) { const z = lastTop(t); text = 'Last count ' + since(records[z].start, t) + '. Most room: ' + bayName(z) + ' · ' + records[z].count; label = 'Show me'; act = () => showBay(z); }
      else if (!pick && screenNow !== 'about') { text = 'No known open space. If the deck is full: Shuttle Lot + Big Owl Bus.'; warn = true; label = 'I parked'; act = () => setView('report'); }
      else { text = 'Parked already? One tap helps the next driver.'; label = 'Report'; act = () => setView('report'); }
    }
  }
  $('guideText').textContent = text; $('guide').classList.toggle('warn', warn);
  const b = $('guideBtn'); b.textContent = label; b.classList.toggle('hidden', !act); guideAct = act;
}
function markTab(id) {
  screenNow = id; renderGuide();
  for (const name of SCREENS) { const tab = $(name + 'Tab'); tab.classList.toggle('active', name === id); tab.setAttribute('aria-selected', String(name === id)); }
}
function setView(id) {
  if (!SCREENS.includes(id)) id = 'student';
  const strip = $('screens'), screen = $(id);
  if (strip.scrollTo) strip.scrollTo({ left: screen.offsetLeft, behavior: 'auto' });
  markTab(id);
}
// Keep the bottom bar in step when the person swipes instead of tapping.
function watchSwipes() {
  const strip = $('screens'); if (!strip.addEventListener) return;
  let timer = 0;
  strip.addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(() => markTab(SCREENS[Math.round(strip.scrollLeft / strip.clientWidth)] || 'student'), 80); }, { passive: true });
}

const STATUS_TEXT = { counted: 'Counted', estimate: 'Estimate', students: 'Student report', unknown: 'Unknown' };
const STATUS_CLASS = { counted: 'recent', estimate: 'estimate', students: 'students', unknown: 'unknown' };
const ago = (ts, t) => Math.max(0, Math.floor((t - ts) / 60e3)) + ' min ago';
// Age in the largest sensible unit: an old count stays on the page, so it can be days old.
const since = (ts, t) => { const m = Math.max(0, Math.floor((t - ts) / 60e3)); return m < 90 ? m + ' min ago' : m < 48 * 60 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; };
const minsAgo = (r, t) => Math.max(0, Math.floor((t - r.start) / 60e3));
const range = e => e.low === e.high ? String(e.low) : Number.isFinite(e.high) ? e.low + '–' + e.high : e.low + '+';
const trendText = rate => Math.abs(rate) < 0.05 ? '' : (rate > 0 ? ', filling about ' : ', emptying about ') + Math.abs(rate).toFixed(1) + ' a minute';

// Past staff counts, for "typical at this hour" (this device's log; plus shared history when sync is on).
let sharedHistory = [];
const historyList = () => [...sharedHistory, ...fieldLog.map(e => ({ zone: e.zone, t: Date.parse(e.start), count: e.open }))];

// Stall diagram: one small box per regular stall, in two rows like the bay itself.
// Filled from the left: taken, possibly taken, open. It shows how many, not which.
// `last` is a count too old to estimate from: the diagram is filled in from it, and its label says so.
function stallStrip(z, e, last) {
  const n = DECK.zones[z].stalls, open = last ? Math.min(n, last.count) : 0;
  const split = last && !e ? { taken: n - open, maybe: 0, open } : ParkingModel.stallSplit(n, e), rows = n > 20 ? 2 : 1, per = Math.ceil(n / rows);
  let boxes = '';
  for (let i = 0; i < n; i++) {
    const kind = !split ? 'u' : i < split.taken ? 't' : i < split.taken + split.maybe ? 'm' : 'o';
    boxes += `<rect class="s-${kind}" x="${(i % per) * 10 + 1}" y="${Math.floor(i / per) * 16 + 1}" width="8" height="13" rx="1.5"/>`;
  }
  const label = !split ? `${n} regular stalls, none with a current count`
    : `${n} regular stalls: ${split.taken} taken, ${split.maybe ? split.maybe + ' possibly taken, ' : ''}${split.open} open${last && !e ? ' at the last count' : ''}. Which stalls is not known`;
  return `<svg class="strip" viewBox="0 0 ${per * 10 + 1} ${rows * 16}" role="img" aria-label="${label}">${boxes}</svg>`;
}
function bayRow(z, t) {
  const r = records[z], e = est(z, t), src = e ? e.source : 'unknown';
  let detail;
  if (src === 'counted') detail = (r.method === 'scan' ? 'truck count, ' : '') + minsAgo(r, t) + ' min ago';
  else if (src === 'estimate') detail = `counted ${r.count}, ${minsAgo(r, t)} min ago`;
  else if (src === 'students') detail = `"${BAND_TEXT[e.band]}", ${ago(e.reportedAt, t)}` + (e.students > 1 ? ` · ${e.students} reports agree` : '');
  else { const typ = ParkingModel.typical(historyList(), z, t);
    detail = (r ? since(r.start, t) : 'no survey') + (typ ? ` · typically ${range(typ)} at this hour (${typ.samples} past counts)` : ''); }
  return `<li><button class="bay${z === selectedBay ? ' selected' : ''}" onclick="selectBay('${z}')" aria-pressed="${z === selectedBay}">` +
    `<span class="bay-name">${DECK.zones[z].label}</span>` +
    `<b class="bay-count">${e ? range(e) : r ? r.count : '?'}</b>` +
    `<span class="status ${STATUS_CLASS[src]}">${!e && r ? 'Last count' : STATUS_TEXT[src]} · ${detail}</span>${stallStrip(z, e, r)}</button></li>`;
}
function summaryText(sum, ids, t) {
  const last = sum.state === 'unknown' && ids ? ParkingModel.lastCounts(records, ids, t) : null;
  return last ? [(last.bays < last.of ? '≥' : '') + last.open, 'last count · ' + since(last.oldest, t)]
    : sum.state === 'unknown' ? ['?', 'unknown']
    : sum.state === 'partial' ? ['≥' + sum.low, `in ${sum.knownBays} of ${sum.bays} bays`]
    : sum.exact ? [String(sum.low), 'counted']
    : [range(sum), sum.students ? 'estimate · student reports' : 'estimate'];
}
// A level with no regular stalls (all faculty/staff, accessible or reserved) is shown, but never as open to students.
function closedLevelCard(n) {
  const all = ALL_IDS.filter(z => DECK.zones[z].level === n).map(z => DECK.zones[z]), sum = k => all.reduce((x, z) => x + (z[k] || 0), 0);
  return `<article class="card"><h3>Level ${n}</h3><div class="count">0</div><div class="unit">no student stalls</div>` +
    `<p class="small">${sum('facultyStaff')} faculty/staff · ${sum('accessible')} accessible · ${sum('otherReserved')} reserved</p></article>`;
}
function levelCard(n, t) {
  if (!zonesOf(n).length) return closedLevelCard(n);
  const [count, unit] = summaryText(ParkingModel.levelSummary(records, zonesOf(n), t, reports), zonesOf(n), t);
  return `<article class="card"><h3>Level ${n}${n === LEVELS[0] ? ' <span class="small">/ top deck</span>' : ''}</h3>` +
    `<div class="count">${count}</div><div class="unit">${unit}</div>` +
    `<ul class="bays">${zonesOf(n).map(z => bayRow(z, t)).join('')}</ul></article>`;
}
const VERDICT = { room: 'Room likely', tight: 'Tight', full: 'Likely full', unknown: 'Not enough counts to say' };
// The student picks when they will arrive. The verdict and "try first" are then worked out for THAT moment:
// every count is older by then, so ranges are wider, and a bay that was filling is projected forward.
let lead = 0; // minutes from now
function setLead(minutes) { lead = minutes; render(); }
// ---- Ask Park.AI: a guide that answers from the app's own counts and takes you to the right screen ----
// Each topic has trigger words, an answer built from the current data, and (usually) a button that goes there.
// A typed question is matched to the topic whose words it shares most. This is word matching on the phone,
// not a language model: it can only answer the topics below, and it says so when nothing matches.
const ASK = [
  { id: 'park', q: 'Where should I park?', words: 'where park best spot space bay try first recommend open', answer(t) {
      const pick = ParkingModel.recommend(records, ZONE_IDS, t, 1, reports)[0], old = lastTop(t);
      if (pick) return { text: `Try ${bayName(pick.zone)} first: ${range(pick.est)} open${{ counted: ', just counted', estimate: ' (estimate)', students: ' (student report)' }[pick.est.source]}.`, label: 'Show me', go: () => showBay(pick.zone) };
      if (old) return { text: `Nothing current. At the last count (${since(records[old].start, t)}) ${bayName(old)} had the most room: ${records[old].count} open. Not live.`, label: 'Show me', go: () => showBay(old) };
      return { text: 'No bay has a known open space. If the deck is full: Shuttle Lot and the Big Owl Bus.', label: 'Open Now', go: () => setView('student') }; } },
  { id: 'room', q: 'Is there room right now?', words: 'room full busy now crowded many how spaces available status', answer(t) {
      const d = ParkingModel.deckSummary(records, ZONE_IDS, t, reports), last = ParkingModel.lastCounts(records, ZONE_IDS, t);
      const text = d.state !== 'unknown' ? `${VERDICT[d.verdict]}: ${summaryText(d).join(' open · ')}.` : last ? `No current count. Last count: ${last.open} open, ${since(last.oldest, t)}. Not live.` : 'No counts yet.';
      return { text: 'West Deck. ' + text, label: 'Open Now', go: () => setView('student') }; } },
  { id: 'soon', q: 'What about in 10 minutes?', words: 'minutes later soon arrive predict forecast future when', answer(t) {
      const d = ParkingModel.deckSummary(records, ZONE_IDS, t + 10 * 60e3, reports);
      return { text: d.state === 'unknown' ? 'Not enough recent counts to predict 10 minutes ahead.' : `Predicted for 10 minutes from now: ${VERDICT[d.verdict]}, ${summaryText(d).join(' open · ')}. A prediction from the last counts, not a measurement.`, label: 'See it', go: () => { setLead(10); setView('student'); } }; } },
  { id: 'walk', q: 'How do I walk to campus?', words: 'walk campus exit stairs lift elevator building class foot out', answer() {
      const a = (DECK.access || []).filter(a => a.kind === 'walk');
      return { text: a.length ? a.map(a => `${a.label}: ${a.where}.`).join(' ') : 'No walk exit is recorded yet.', label: 'Show on the deck', go: () => setView('deck') }; } },
  { id: 'drive', q: 'Where do I drive in?', words: 'drive enter entrance gate car in way road', answer() {
      const a = (DECK.access || []).filter(a => a.kind === 'drive');
      return { text: a.length ? a.map(a => `${a.label}: ${a.where}.`).join(' ') : 'No entrance is recorded yet.', label: 'Show on the deck', go: () => setView('deck') }; } },
  { id: 'parked', q: 'I just parked', words: 'parked report tell help just here', answer() {
      return { text: 'Thanks. Tap your bay, then how full it is. One tap helps the next driver.', label: 'Report', go: () => setView('report') }; } },
  { id: 'leaving', q: "I'm leaving", words: 'leaving leave going gone bye pulling', answer() {
      const p = parkedHere();
      return p && !p.left ? { text: `You parked in ${bayName(p.zone)}. Tap to tell the next driver a space is opening.`, label: "I'm leaving", go: () => { leaveParked(); setView('student'); } }
        : { text: 'Tell me where you parked first, then tap "leaving" there.', label: 'Report', go: () => setView('report') }; } },
  { id: 'monitor', q: "I'm a monitor: count a bay", words: 'monitor staff count scan camera tally survey patrol', answer(t) {
      const next = ParkingModel.recheckNext(records, ZONE_IDS, t, reports, 1)[0];
      return next ? { text: `Count ${bayName(next.zone)} next. Scan it with the camera, or tally by hand.`, label: 'Start', go: () => { setView('staff'); pickBay(next.zone); } }
        : { text: 'Every bay has a fresh count. Pick any bay to recount.', label: 'Open Count', go: () => setView('staff') }; } },
  { id: 'faculty', q: 'Where is faculty parking?', words: 'faculty staff teacher professor employee reserved permit', answer() {
      const z = Object.values(DECK.zones), l1 = z.filter(b => b.level === 1).reduce((n, b) => n + (b.facultyStaff || 0), 0), up = z.filter(b => b.level > 1).reduce((n, b) => n + (b.facultyStaff || 0), 0);
      return { text: `Level 1 is faculty/staff only (${l1} stalls)${up ? `, plus ${up} on the Level 2 centre ramp` : ''}. Student stalls are on Levels 2 and 3.`, label: 'Show levels', go: () => setView('levels') }; } },
  { id: 'decks', q: 'Other decks and lots?', words: 'other deck decks lot lots central east north marietta shuttle economy clearance height tall truck', answer() {
      const w = PLACES.find(p => p.live);
      return { text: `Only ${w.name} has counts so far (clearance ${w.clearance}). The other KSU decks and lots are listed as coming soon.`, label: 'See the list', go: () => setView('student') }; } }];
function askMatch(text) {
  const said = String(text).toLowerCase().match(/[a-z']+/g) || [];
  let best = null, score = 0;
  const common = ['where', 'park', 'how', 'in', 'out', 'now', 'here', 'way', 'many', 'when', 'first', 'just']; // words several topics share count for less
  for (const topic of ASK) { const words = topic.words.split(' ');
    const n = said.reduce((sum, w) => sum + (words.includes(w) || words.includes(w.replace(/(ing|s)$/, '')) ? (common.includes(w) ? 0.4 : 1) : 0), 0);
    if (n > score) { best = topic; score = n; } }
  return best;
}
let askGo = [];
function askSay(question, topic) {
  const a = topic ? topic.answer(now()) : { text: 'I can only answer the questions on the buttons below. Tap one.' };
  askGo.push(a.go || null);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  $('askLog').innerHTML += `<div class="q">${esc(question)}</div><div class="a">${esc(a.text)}${a.go ? `<button onclick="askTake(${askGo.length - 1})">${esc(a.label)}</button>` : ''}</div>`;
}
function askTopic(id) { const t = ASK.find(a => a.id === id); if (t) askSay(t.q, t); }
function askTyped() { const el = $('askText'), text = String(el.value || '').trim(); if (!text) return; el.value = ''; askSay(text, askMatch(text)); }
function askTake(i) { const go = askGo[i]; closeAsk(); if (go) go(); }
function openAsk() {
  if (!$('askLog').innerHTML) { $('askChips').innerHTML = ASK.map(a => `<button onclick="askTopic('${a.id}')">${a.q}</button>`).join(''); askSay('Hi', { answer: () => ({ text: 'Hi. Tap a question, or type one. I answer from the counts in this app and take you to the right screen.' }) }); }
  $('ask').classList.remove('hidden');
}
function closeAsk() { $('ask').classList.add('hidden'); }

// ---- Tester review (only when the page is opened with ?try, from the "Try the app" QR code) ----
// A tester uses the app, then answers four one-tap questions and an optional suggestion. Anonymous: no name,
// no device id. A web page cannot stop someone closing it, so the review is offered three ways instead:
// a button that stays in the guide bar, a prompt after 75 seconds, and a prompt when they come back to the tab.
const TRY = typeof location !== 'undefined' && /[?&]try\b/.test(location.search || '');
const REVIEW_KEY = 'park-ai-reviewed-v1';
const REVIEW_QS = [
  ['easy', 'Easy to use?', ['Yes', 'Sort of', 'No']],
  ['use', 'Would you check it before driving in?', ['Yes', 'Maybe', 'No']],
  ['trust', 'Do you trust the numbers?', ['Yes', 'Somewhat', 'No']],
  ['best', 'Most useful part?', ['Now', '3D deck', 'Levels', 'Report']]];
let reviewAnswers = {};
function reviewed() { try { return !!localStorage.getItem(REVIEW_KEY); } catch (e) { return false; } }
function renderReview() {
  $('reviewQs').innerHTML = REVIEW_QS.map(([k, q, opts]) => `<div class="q"><b>${q}</b><div>` +
    opts.map(o => `<button aria-pressed="${reviewAnswers[k] === o}" onclick="answerReview('${k}','${o}')">${o}</button>`).join('') + '</div></div>').join('');
}
function answerReview(k, o) { reviewAnswers[k] = o; renderReview(); }
function openReview() { if (reviewed()) return; renderReview(); $('review').classList.remove('hidden'); }
function closeReview() { $('review').classList.add('hidden'); }
async function sendReview() {
  const missing = REVIEW_QS.filter(([k]) => !reviewAnswers[k]);
  if (missing.length) { $('reviewNote').textContent = 'One tap per question, please: ' + missing.length + ' left.'; return; }
  const text = String($('reviewText').value || '').slice(0, 300);
  $('reviewSend').disabled = true; $('reviewNote').textContent = 'Sending…';
  try {
    const r = await fetch(Settings.syncUrl + '/v1/poll.json', { method: 'POST', body: JSON.stringify({ kind: 'app-review', t: Date.now(), ...reviewAnswers, text }) });
    if (!r.ok) throw Error('not saved');
    try { localStorage.setItem(REVIEW_KEY, '1'); } catch (e) {}
    closeReview(); say('Thank you. Your review was sent.', 6000);
  } catch (e) { $('reviewNote').textContent = 'Not sent. Check your connection and tap Send again.'; }
  $('reviewSend').disabled = false;
}
if (TRY && typeof setTimeout === 'function') {
  setTimeout(openReview, 75e3);
  if (typeof document.addEventListener === 'function') document.addEventListener('visibilitychange', () => { if (!document.hidden) openReview(); });
}

// Ways in and out, as text (the 3D pins carry the same labels). From data/deck.json "access".
function renderAccess() {
  const el = $('access'); if (!el) return;
  el.innerHTML = (DECK.access || []).map(a => `<span class="${a.kind}"><b>${a.label}</b> ${a.where}</span>`).join('');
}

// Deck switcher on the Now screen. Only West Deck has counts; every other place says "coming soon".
// `PLACES` is injected by scripts/build.cjs from data/places.json (names and clearances from KSU's own pages).
let place = 'west';
const placeOf = id => PLACES.find(p => p.id === id) || PLACES[0];
function setPlace(id) { place = placeOf(id).id; renderPlaces(); render(); }
function renderPlaces() {
  let campus = '';
  $('places').innerHTML = PLACES.map(p => (p.campus !== campus ? `<span class="campus">${campus = p.campus}</span>` : '') +
    `<button aria-pressed="${p.id === place}" onclick="setPlace('${p.id}')">${p.name}<small>${p.live ? 'live' : 'soon'}</small></button>`).join('');
  const p = placeOf(place), all = Object.values(DECK.zones), sum = k => all.reduce((n, z) => n + (z[k] || 0), 0);
  $('placeName').innerHTML = `${p.name} <span>${p.campus} campus</span>`;
  $('placeSpec').textContent = p.live
    ? `${LEVELS.length} levels · ${sum('stalls') + sum('accessible') + sum('facultyStaff') + sum('otherReserved')} stalls, ${sum('stalls')} student · clearance ${p.clearance} · counted on foot Nov 19`
    : p.clearance ? `Clearance ${p.clearance} (KSU)` : '';
}
function renderVerdict(now) {
  if (!placeOf(place).live) { $('verdict').innerHTML = `<span class="soon"><b>Coming soon</b>Not counted yet. Park.AI starts with West Deck.</span><button class="pick" aria-pressed="true" onclick="setPlace('west')">Back to West Deck</button>`; return; }
  const t = now + lead * 60e3, d = ParkingModel.deckSummary(records, ZONE_IDS, t, reports), [count, unit] = summaryText(d);
  const newest = Math.min(...ZONE_IDS.map(z => records[z] ? now - records[z].start : Infinity));
  const arrive = '<span class="arrive">I arrive in ' + [0, 5, 10, 15].map(m =>
    `<button class="pick" aria-pressed="${lead === m}" onclick="setLead(${m})">${m ? m + ' min' : 'now'}</button>`).join(' ') + '</span>';
  const last = d.state === 'unknown' ? ParkingModel.lastCounts(records, ZONE_IDS, now) : null;
  if (last) { // every count is past the horizon: keep showing it, labelled as old, never as live
    $('verdict').innerHTML = `<span class="verdict-word unknown">Last count</span><span class="verdict-detail"><b>${(last.bays < last.of ? '≥' : '') + last.open}</b> open when last counted · ${since(last.oldest, now)} · not live</span>` + lastBest(now);
    return;
  }
  $('verdict').innerHTML = `<span class="verdict-word ${d.verdict}">${VERDICT[d.verdict]}</span>` +
    `<span class="verdict-detail">${d.state === 'unknown' ? 'No counts yet' : `<b>${count}</b> open · ${unit}`}` +
    (lead ? ` · <b>predicted for ${lead} minutes from now</b>` : '') +
    (Number.isFinite(newest) ? ` · newest count ${since(now - newest, now)}` : '') + '</span>' + arrive + bestBet(t);
}
// The bay with the most room at the last count, used only when nothing current is known.
function lastTop(t) {
  if (ParkingModel.deckSummary(records, ZONE_IDS, t, reports).state !== 'unknown') return null;
  return ZONE_IDS.filter(z => records[z] && records[z].count > 0).sort((a, b) => records[b].count - records[a].count)[0] || null;
}
// With only old counts, point at the bays that had the most room when last counted, and say so.
function lastBest(t) {
  const top = ZONE_IDS.filter(z => records[z] && records[z].count > 0).sort((a, b) => records[b].count - records[a].count).slice(0, 3);
  if (!top.length) return '<span class="best">No bay had an open space at the last count. If the deck is full: Shuttle Lot and the Big Owl Bus.</span>';
  return '<span class="best"><b>Most room at the last count:</b> ' + top.map(z => `<button class="pick" onclick="selectBay('${z}')">${bayName(z)} · <b>${records[z].count}</b> open · ${since(records[z].start, t)}</button>`).join(' ') + '</span>';
}
// "Where should I try first?" Whole bays only: nothing here knows which individual spaces are open.
function bestBet(t) {
  const picks = ParkingModel.recommend(records, ZONE_IDS, t, 3, reports);
  if (!picks.length) return '<span class="best">No bay has a known open space right now. If the deck is full: Shuttle Lot and the Big Owl Bus.</span>';
  const item = ({ zone, est }) => `<button class="pick" onclick="selectBay('${zone}')">${bayName(zone)} · <b>${range(est)}</b> open${{ counted: '', estimate: ' (estimate)', students: ' (student report)' }[est.source]}</button>`;
  return `<span class="best"><b>Try first:</b> ${item(picks[0])}${picks.length > 1 ? ' <span class="then">then</span> ' + picks.slice(1).map(item).join(' ') : ''}</span>`;
}
function render() {
  const t = now();
  renderVerdict(t);
  $('cards').innerHTML = LEVELS.map(n => levelCard(n, t)).join('');
  $('clock').textContent = (demo === 'nov19' ? 'Replay of Thu Nov 19, as if 11:58 AM' : demo === 'sample' ? 'Made-up sample data' : 'Counts entered on this device') +
    ' · clock moved forward ' + Math.round(offset / 60e3) + ' min · stall numbers counted on foot Nov 19.';
  if (!Sync.on) $('notice').innerHTML = demo === 'own' ? '<b>Test entries</b> typed in on this device. Not verified.' : NOTICE[demo];
  renderNext(); renderGrids(); renderGuide();
  // Bays with no regular stalls (Level 1) are labelled as faculty/staff parking; a student bay that also holds faculty stalls says how many.
  const staffBays = ALL_IDS.filter(z => !ZONE_IDS.includes(z) && DECK.zones[z].facultyStaff > 0).map((z, i, all) => [z, { state: 'staff', // one flag per level, on its centre bay, with the level's faculty/staff total
      label: /_Centre$/.test(z) ? 'Faculty/staff only · ' + all.filter(o => DECK.zones[o].level === DECK.zones[z].level).reduce((n, o) => n + DECK.zones[o].facultyStaff, 0) : '' }]);
  const facultySub = z => DECK.zones[z].facultyStaff > 0 ? { sub: '+' + DECK.zones[z].facultyStaff + ' faculty' } : {};
  if (viewer) viewer.setBays(Object.fromEntries(staffBays.concat(ZONE_IDS.map(z => { const b = ParkingModel.bayState(records[z], t, reports, z), r = records[z];
    // A bay whose count is too old to estimate from keeps the colour and number of its last count (the note under the model says how old).
    if (!b.est && r) return [z, { state: r.count >= Settings.bayRoomAt ? 'room' : r.count === 0 ? 'full' : 'few', label: String(r.count), name: shortName(z), ...facultySub(z) }];
    return [z, { state: b.state, label: b.est ? range(b.est) : '?', name: shortName(z), ...facultySub(z) }]; }))));
  const old = ParkingModel.deckSummary(records, ZONE_IDS, t, reports).state === 'unknown' ? ParkingModel.lastCounts(records, ZONE_IDS, t) : null;
  if ($('ageNote')) $('ageNote').textContent = old ? 'Last count: ' + since(old.oldest, t) + '. Not live.' : '';
  renderSelection();
}
function selectBay(z) {
  if (!ZONE_IDS.includes(z)) { // tapped a bay on the model that has no regular stalls
    selectedBay = null; if (viewer) viewer.select(null); render();
    $('selection').textContent = 'That bay has no regular student stalls (faculty/staff, accessible or reserved), so it is not counted.'; return;
  }
  selectedBay = selectedBay === z ? null : z;
  if (selectedBay) { setView('deck'); $('reportBay').value = selectedBay; } // a pick shows on the 3D deck and pre-fills the report form
  if (viewer) viewer.select(selectedBay);
  render();
}
function renderSelection() {
  renderCheckin();
  const el = $('selection'); if (!el) return;
  if (!selectedBay) { el.textContent = 'Tap a bay.'; return; }
  const t = now(), r = records[selectedBay], e = est(selectedBay, t);
  el.textContent = bayName(selectedBay) + (DECK.zones[selectedBay].note ? ' (' + DECK.zones[selectedBay].note + ')' : '') + ': ' +
    (!e ? (r ? `last count ${r.count} open, ${since(r.start, t)}; not live` : 'no count yet') : e.counted ? r.count + ' counted open, ' + minsAgo(r, t) + ' min ago'
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
  if (p && !$('reportBay').dataset?.chosen) { $('reportBay').value = p.zone; renderGrids(); } // start on the bay used last time
  // The same reminder on the Now screen, and a pin on the 3D deck over the bay this phone is parked in.
  const now2 = $('parkedNow');
  if (now2) { now2.classList.toggle('hidden', !current); now2.innerHTML = current ? `You parked in <b>${bayName(p.zone)}</b>. <button class="primary" style="margin-top:8px" onclick="showBay('${p.zone}')">Show me on the deck</button>` : ''; }
  if (viewer && viewer.setParked) viewer.setParked(current ? p.zone : null);
}
function leaveParked() { const p = parkedHere(); if (!p) return; $('reportBay').value = p.zone; reportBay('leaving'); }

// ---- Student report: "I just parked here" (anonymous, low trust, expires) ----
// ---- One-tap check-in from the deck: "I parked here" ----
// Tapping it on a bay (usually the one the app just recommended) saves where this phone parked, so "I'm leaving"
// works later, and asks the one thing a tap cannot know: how full the bay is. That second tap is optional.
let askFull = null;
function parkHere(zone) {
  if (!ZONE_IDS.includes(zone)) return;
  $('reportBay').value = zone; if ($('reportBay').dataset) $('reportBay').dataset.chosen = '1';
  try { localStorage.setItem(PARKED_KEY, JSON.stringify({ zone, t: now(), left: false })); } catch (e) {}
  askFull = zone; selectedBay = zone; if (viewer) viewer.select(zone);
  renderGrids(); renderParked(); render(); say('Checked in: ' + bayName(zone) + '. How full is it?', 6000);
}
function renderCheckin() {
  const el = $('checkin'); if (!el) return;
  const p = parkedHere(), here = p && !p.left && p.zone === selectedBay;
  el.innerHTML = askFull && askFull === selectedBay
    ? '<p>How full is it? One tap.</p><div class="choices" style="margin:0"><button class="choice room" onclick="reportBay(\'plenty\')"><b>Plenty</b>5 or more</button><button class="choice few" onclick="reportBay(\'few\')"><b>A few</b>1 to 4</button><button class="choice full" onclick="reportBay(\'full\')"><b>Full</b>none</button></div>'
    : selectedBay && here ? `<button class="primary" onclick="leaveParked()">I'm leaving ${bayName(selectedBay)}</button>`
    : selectedBay ? `<button class="primary" onclick="parkHere('${selectedBay}')">I parked here</button>` : '';
}
function reportBay(band) {
  const zone = $('reportBay').value, t = now(), msg = $('reportMsg');
  let last = {}; try { last = JSON.parse(localStorage.getItem(REPORTED_KEY)) || {}; } catch (e) {}
  const slot = zone + (band === 'leaving' ? ':out' : ':in'); // parking and leaving are separate events: leaving soon after parking is allowed
  if (t - (last[slot] || 0) < Settings.studentRepeatMinutes * 60e3 && t >= (last[slot] || 0)) {
    msg.textContent = 'You already reported this bay a few minutes ago. One report per bay is enough.'; return; }
  askFull = null;
  const report = { zone, band, t };
  reports = ParkingModel.cleanReports([...reports, report], ZONE_IDS, t); saveReports();
  last[slot] = t; try { localStorage.setItem(REPORTED_KEY, JSON.stringify(last)); } catch (e) {}
  if (typeof shareReport === 'function') shareReport(report);
  try { localStorage.setItem(PARKED_KEY, JSON.stringify({ zone, t, left: band === 'leaving' })); } catch (e) {}
  render(); renderParked();
  showBay(zone); say('Thanks. ' + bayName(zone) + ' updated.'); // show the person what their tap changed
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
function pickBay(z) { if (!survey) { $('bay').value = z; renderGrids(); startSurvey(); } }

// ---- Bay pickers: one tap on a button, no drop-down. A hidden <select> still holds the value. ----
function renderGrids() {
  for (const [gridId, selectId] of [['reportGrid', 'reportBay'], ['bayGrid', 'bay']]) {
    const chosen = $(selectId).value, locked = selectId === 'bay' && !!survey;
    $(gridId).innerHTML = LEVELS.filter(n => zonesOf(n).length).map(n => `<div class="lvl">Level ${n}</div>` + zonesOf(n).map(z =>
      `<button class="spot" aria-pressed="${z === chosen}"${locked ? ' disabled' : ''} onclick="chooseBay('${selectId}','${z}')" aria-label="${bayName(z)}">${DECK.zones[z].label.split(' ')[0]}</button>`).join('')).join('');
  }
}
function chooseBay(selectId, zone) {
  $(selectId).value = zone; if (selectId === 'reportBay') $('reportBay').dataset && ($('reportBay').dataset.chosen = '1');
  renderGrids();
  if (selectId === 'bay' && !survey) startSurvey(); // for a monitor, tapping the bay starts the count: no extra Start step
}
// One button saves and confirms the whole bay was covered (the button says so).
function saveWalked() { $('coverage').checked = true; finishSurvey(); }
function setKind(kind) { $('entryKind').value = kind; kindChanged(); }

// ---- Staff survey ----
function fillBayOptions() {
  $('reportBay').innerHTML = $('bay').innerHTML = LEVELS.map(n => `<optgroup label="Level ${n}">` +
    zonesOf(n).map(z => `<option value="${z}">${bayName(z)}</option>`).join('') + '</optgroup>').join('');
}
function startSurvey() {
  const zone = $('bay').value;
  survey = { zone, start: now(), realStart: Date.now(), version: records[zone]?.version || 0, photos: [] };
  $('count').value = 0; $('coverage').checked = false; $('entryKind').value = 'open'; kindChanged(); renderScan();
  $('surveyFields').classList.remove('hidden');
  $('start').disabled = true; $('bay').disabled = true; $('observer').disabled = true; renderGrids();
  $('modelled').textContent = stallNote(zone) + '.';
  feedback('Counting ' + bayName(zone) + '.'); renderGuide();
}
function cancelSurvey(message = 'Survey closed. No unfinished count was saved.') {
  survey = null; closeCamera();
  $('surveyFields').classList.add('hidden');
  $('start').disabled = false; $('bay').disabled = false; $('observer').disabled = false; renderGrids();
  $('scanCanvas').classList.add('hidden'); // the photo preview is discarded with the survey
  feedback(message); renderGuide();
}
function adjust(n) { const i = $('count'); i.value = Math.min(ParkingModel.MAX_COUNT, Math.max(0, (Number(i.value) || 0) + n)); }
// What the number being entered means: open stalls tallied on foot, or vehicles counted by a patrol truck's plate reader.
function kindChanged() {
  const scan = $('entryKind').value === 'scan';
  $('countLabel').textContent = scan ? 'Vehicles (a number only, never a plate)' : 'Open stalls';
  $('kindOpen').setAttribute('aria-pressed', String(!scan)); $('kindScan').setAttribute('aria-pressed', String(scan));
  $('tallyButton').textContent = scan ? '+1 vehicle' : '+1 open stall';
  $('coverageLabel').textContent = scan ? ' Truck covered the whole bay' : ' Whole bay walked';
  $('saveBtn').textContent = scan ? 'Save: truck covered whole bay' : 'Save: whole bay walked';
}
function finishSurvey() {
  if (!survey) return; // a second tap after saving does nothing
  const scan = $('entryKind').value === 'scan';
  if (!$('coverage').checked) { feedback(scan ? 'Confirm the truck covered the whole bay before saving.' : 'Confirm you walked the whole bay once before saving.', true); return; }
  const raw = $('count').value;
  try {
    if (raw === '') throw Error('Enter a count, including 0 when no spaces are open.');
    const entered = Number(raw), zone = survey.zone, started = survey.realStart;
    const fromScan = scan && Number.isInteger(entered) && entered >= 0 ? ParkingModel.openFromVehicles(DECK.zones[zone], entered) : null;
    const count = fromScan ? fromScan.open : entered;
    records = ParkingModel.complete(records, survey, count, now(), CATEGORY, fromScan ? { method: 'scan', vehicles: entered } : { photos: survey.photos });
    save(); logSurvey(zone, records[zone], started); shareCount(zone, records[zone]);
    const over = count > DECK.zones[zone].stalls
      ? ' Note: that is above the ' + stallWord(zone) + ' stall count (' + DECK.zones[zone].stalls + '). One of the two numbers is wrong; worth recording.' : '';
    const how = fromScan ? ` ${entered} vehicles counted, so ${count} open` + (fromScan.couldBeLowerBy ? ` (up to ${fromScan.couldBeLowerBy} fewer if the open stalls are faculty, accessible or reserved ones).` : '.') : '';
    cancelSurvey(bayName(zone) + ' saved. The previous count was replaced, not added.' + how + (fromScan ? '' : over));
    say('Saved ' + bayName(zone) + '.', 2500);
    render();
  } catch (e) { feedback(e.message, true); }
}

// ---- AI assist: a model counts vehicles in a photo, a person confirms ----
// ---- Camera scan: the main way to count ----
// The phone's camera view stays on screen with a live, quick count of what the model sees. "Count this view"
// runs the thorough pass on that frame, and the person checks it. Frames exist only in memory: nothing is
// recorded, saved or uploaded. If the camera cannot be opened, the photo picker is used instead.
let camStream = null, camLoop = 0;
async function openCamera() {
  if (!survey) return;
  const media = typeof navigator !== 'undefined' && navigator.mediaDevices;
  if (!media || !media.getUserMedia) { $('scanStatus').textContent = 'No live camera here. Use a photo instead.'; $('assist').open = true; return; }
  try {
    camStream = await media.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
    const v = $('cam'); v.srcObject = camStream; await v.play();
    $('camBox').classList.remove('hidden'); $('camBtn').classList.add('hidden'); $('scanStatus').textContent = '';
    liveLook(++camLoop);
  } catch (e) { closeCamera(); $('scanStatus').textContent = 'Camera not available (' + (e.name || e.message) + '). Use a photo instead.'; $('assist').open = true; }
}
function closeCamera() {
  camLoop++; if (camStream) for (const t of camStream.getTracks()) t.stop();
  camStream = null; if ($('cam')) $('cam').srcObject = null;
  $('camBox').classList.add('hidden'); $('camBtn').classList.remove('hidden');
}
function grabFrame() {
  const v = $('cam'), c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
  if (!c.width) return null; c.getContext('2d').drawImage(v, 0, 0); return c;
}
// The live look: a quick pass on the current frame, again and again, with a box on each vehicle found.
async function liveLook(id) {
  const live = $('camLive'), over = $('camOverlay');
  while (id === camLoop && camStream) {
    const frame = grabFrame();
    if (!frame || !window.CarCounter) { await new Promise(r => setTimeout(r, 300)); continue; }
    try {
      const r = await window.CarCounter.count(frame, null, { quick: true }); if (id !== camLoop) return;
      over.width = r.width; over.height = r.height; const g = over.getContext('2d');
      g.lineWidth = Math.max(3, r.width / 200); g.strokeStyle = '#ffc629';
      for (const b of r.boxes) g.strokeRect(b.x, b.y, b.w, b.h);
      live.textContent = 'AI sees ' + r.count + (r.count === 1 ? ' vehicle' : ' vehicles');
    } catch (e) { live.textContent = e.message; return; }
    await new Promise(r => setTimeout(r, 150));
  }
}
async function captureFrame() {
  const frame = grabFrame(); if (!frame) return;
  closeCamera();
  // Show the captured view at once and let the screen repaint: the thorough count keeps the phone busy for a few seconds.
  const cv = $('scanCanvas'); cv.width = frame.width; cv.height = frame.height; cv.getContext('2d').drawImage(frame, 0, 0); cv.classList.remove('hidden');
  $('scanStatus').textContent = 'Counting vehicles on this device…';
  await new Promise(r => setTimeout(r, 80));
  await scanSource(frame);
}
async function scanPhoto(input) {
  const file = input.files && input.files[0];
  if (file) await scanSource(file);
  input.value = ''; // let the same photo be chosen again
}
// Count the vehicles in one captured frame or photo, and let the person check the result.
async function scanSource(file) {
  if (!survey || !file) return;
  const status = $('scanStatus'), mine = survey;
  status.textContent = 'Counting vehicles on this device… the first count also loads the model.';
  try {
    if (!window.CarCounter) throw Error('AI count is not available in this build. Count by eye instead.');
    const result = await window.CarCounter.count(file, $('scanCanvas'));
    if (survey !== mine) return; // survey was cancelled or finished while the model ran
    survey.photos.push({ ai: result.count, confirmed: result.count, outside: 0, added: 0, adjust: 0 });
    $('scanCanvas').classList.remove('hidden');
    status.textContent = '';
  } catch (e) { status.textContent = e.message; }
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
  $('notice').innerHTML = '<b>Live test.</b> Entries are typed in by testers and not verified.';
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
    viewer = await window.DeckViewer.mount(box, GLB_B64, { onPick: selectBay, bayIds: ALL_IDS, access: DECK.access, deckName: placeOf('west').name,
      // student bays that are part faculty/staff, and which end of the bay those stalls are at
      staffParts: ZONE_IDS.filter(z => DECK.zones[z].facultyEnd && DECK.zones[z].facultyStaff > 0).map(z => ({ bay: z, end: DECK.zones[z].facultyEnd, share: DECK.zones[z].facultyStaff / (DECK.zones[z].stalls + DECK.zones[z].facultyStaff) })) });
    viewer.setSpread($('spread').getAttribute('aria-pressed') === 'true', true); // apart by default, no animation on load
    $('viewerNote').textContent = 'Drag to rotate. Tap a bay.';
    renderParked(); // put the "You parked here" pin back if this phone is checked in
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

load(); loadReports(); fillBayOptions(); renderLog(); renderPlaces(); renderAccess(); render();
watchSwipes();
renderParked();
// Links: ?report opens straight at the student report panel; ?bay=L2_West also picks the bay (for a QR code posted in that bay).
if (typeof location !== 'undefined') {
  const q = location.search || '', bay = (/[?&]bay=([\w]+)/.exec(q) || [])[1];
  if (bay && ZONE_IDS.includes(bay)) $('reportBay').value = bay;
  if (bay || /[?&]report\b/.test(q)) setView('report');
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
