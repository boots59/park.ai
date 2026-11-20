# Changelog (pass this to Codex before it edits anything)

File ownership this round: **Claude** owns `src/*`, `scripts/*`, `data/*`, `test/*`. Docs (`*.md`) are open to anyone, one editor at a time.
Codex: work on a separate branch and rebase onto `main` before changing `src/`.

## 2026-11-18 (Claude)
- `baseline/`: the uploaded prototype kept unchanged for comparison.
- Survey unit changed from level to **bay** (9 bays from the 3D model). Storage key is now `west-deck-prototype-v2`; old v1 data is ignored.
- Freshness is measured from survey **start**. Surveys open over 20 min are rejected.
- Each record stores its count category ("Example general permit (illustrative)").
- Level totals appear only when all of the level's bays are recent; otherwise "≥ N in k of 3 bays".
- Saved data is validated before display (`ParkingModel.sanitize`).
- Counts above the modelled stall count save with a warning (the model may be wrong; the observer may be right).
- The 3D view (three.js 0.170, WebGL) is embedded offline; tap a bay to select it; levels spread by default.
- Fixed: the phone layout scrolled sideways by 14 px (the tab bar is now scrollable, with shorter labels).
- Build moved to `build.cjs`; tests split into `test/model.test.cjs`, `test/ui.test.cjs`, `test/browser.check.cjs`.

## 2026-11-18, evening (Claude)
- **AI-assisted count** in the staff survey: photograph a section, a model on the device counts vehicles, the person corrects the number, the app suggests open = stalls − vehicles. New files `src/detect.js` (pure maths, tested) and `src/ai.js` (browser glue).
- The model (YOLOX-s, 36 MB) is not in git: `npm run fetch-model` downloads and checksums it; `build.cjs` copies it and the ONNX runtime to `dist/ai/`.
- The AI count needs the page served over http (`npm run serve` or a host). Opened as a file, the page says so and manual counting still works.
- **Field log**: every completed survey is logged with real times, observer A/B, method, and per-photo model vs. confirmed numbers; CSV export.
- Records now carry `method` and `photos`. Old records load as `manual`.
- Added `docs/FIELD-DAY.md`, `outreach/` email drafts, a CI workflow that runs `npm test`.
- Tests: 15 model, 7 detection, 16 UI, plus a browser check that runs the real model on a local photo (`test/fixtures/street.jpg`, not in git).

## 2026-11-18, night (Claude, with Kell's go-ahead to change or scrap design choices)
- **Estimates replace hiding.** A count under 5 min old is shown as counted. From 5 to 30 min the page shows a range that widens with age and follows the trend of the bay's last two counts. Past 30 min it says unknown. (`ParkingModel.estimate`, `trend`.)
- **Deck verdict** above the level cards: Room likely / Tight / Likely full / Not enough counts to say (`deckSummary`).
- Level totals now add the known bays as a range and say how many bays they cover.
- Each record keeps the count it replaced as `prev`, only to measure the trend. Display is still replace-not-add.
- **Estimate check in the field log**: real repeat counts are scored against the range the page would have shown (`backtest`), with measured variability (`variability`).
- **Removed** the student entry/exit reports tab and its code: without a verified starting count and near-complete participation it cannot yield a usable number.
- Status name `stale` is now `estimate` (CSS class, viewer colour key).
- Tests: 21 model, 7 detection, 16 UI.

## 2026-11-19 (Claude): repository organised for submission
- Now lives at github.com/boots59/park.ai. Build output (`dist/`), the detection model, the 3D model file and the outreach drafts are not in git.
- `src/settings.js` holds every tunable number; `data/deck.json` holds bays and stall numbers with their source (`model` or `counted`).
- `build.cjs` moved to `scripts/build.cjs`; output renamed to `dist/index.html` and `dist/lite.html`.
- Records moved to `docs/`; the original upload to `docs/baseline/`. New: `docs/ARCHITECTURE.md`, `docs/RESULTS.md`, `docs/CREDITS.md`, `submission/`.
- `.github/workflows/pages.yml` publishes the demo, manual trigger only.

## 2026-11-19, later (Claude)
- 3D bays are coloured by room (green 5 or more, amber a few, red full, grey unknown) with a count badge on each, and update when a count is saved. `ParkingModel.bayState`, `Settings.bayRoomAt`.
- "Try first" recommendation under the deck verdict (`ParkingModel.recommend`): whole bays, never individual spaces.
- Levels slide apart sideways. The page is installable (`public/`: manifest, icons, service worker).
- `public/field.html`: anonymous student poll and circling tally. `docs/FIELD-DAY.md` rewritten as a tiered timetable.
- Pitch deck: live-demo link and QR code; plan to start at West Deck and extend to all decks on both campuses.
- Known limit: counts live in one browser. Other phones do not see them until a shared server exists.

## 2026-11-19, field day (Claude). On GitHub; NOT published to the live site until the field data is exported
- **Student reports**: after parking, one tap (plenty / a few / full). Lower trust than a staff count, shown as a band, expires after 10 minutes, one per bay per device every 5 minutes. `ParkingModel.bayEstimate`, `cleanReports`.
- **Typical at this hour** for unknown bays, once several days of counts exist. `ParkingModel.typical`.
- **Optional sharing between phones** (`src/sync.js`, `Settings.syncUrl`), with an offline outbox. Off by default. Tested against a stand-in database only.
- New docs: `docs/DATA-SOURCES.md`, `docs/SHARED-DATA.md`.
- Tests: 30 model, 7 detection, 23 UI.

## 2026-11-19, 11 AM (Claude): the deck data is now the counted one
- `data/deck.json` rebuilt from Kell's count: five bays per level (West, Centre ramp, East, North, South), 662 stalls, with regular, accessible, faculty/staff and other-reserved numbers per bay. `stalls` is the regular number.
- Level 1 has no regular stalls: it gets a card that says so and is never surveyed, recommended or coloured.
- 3D view: schematic North and South strips per level (position approximate).
- Count category renamed "Regular student stalls". Raw count saved in `data/field/`.
- Field kit: stall tally by bay and type, label editing, 11 poll questions, online backup and QR survey mode (both off until `Settings.syncUrl` is set).

## 2026-11-19, midday (Claude)
- Field finding (Kell): a wide photo counted vehicles outside the deck. Fix: tap a box on the photo to leave that vehicle out. Left-out vehicles are logged separately and not counted as model errors.
- Field finding (Kell): one photo of a whole bay finds about 11 vehicles at most. An enlarged-quarters mode exists (`Settings.detectTiles: 2`) but is off until the baseline batch is done.
- Stall diagram per bay; student "I'm leaving" report; one-tap reporting with a remembered bay and `?bay=` links.
- Positioning change (Kell): walking and tallying is the main staff count (big +1 button). The photo AI is tucked under "Camera AI test" and described as a trial for the deck's cameras.
- Arrival-time prediction: "I arrive in now / 5 / 10 / 15 min" recalculates the verdict and "try first" for that moment. No new model: it is the same estimate evaluated at a later time.
- Staff "Count next" hint (`ParkingModel.recheckNext`): unknown bays first, then the widest range.
- Camera AI test: tap an empty spot on the photo to add a vehicle the model missed; tap a box to leave one out.
- Enlarged-quarters photo mode switched on (`detectTiles: 2`).
- Expiry raised from 30 to 60 minutes (Kell: monitors are unlikely to pass every 30 minutes). A count is shown as counted for 5 minutes, as a widening range up to 60, then unknown. Trends may now use two counts up to 60 minutes apart. Basis: on Nov 19, 11:15-12:00, bays changed by 0.9 stalls on average over 19-33 minutes; nothing has been measured beyond 33 minutes or earlier in the morning.

## 2026-11-19, afternoon (Claude)
- A first visit now opens on a **replay of the real Nov 19 count** (second pass, shown as if 11:58 AM), labelled as a replay. Made-up sample data is still available from the demo controls.
- Estimate variability calibrated from the field data: 0.8 -> 0.4 (measured 0.26). Logic tests pin 0.8 so they keep testing the rules, not the calibration.
- Student page reordered: verdict, 3D deck, report panel, then every level and bay; the explanation is folded away. First-visit card.
- Student poll results (30 drivers) and a staff interview form in the field kit. `docs/PRIVACY.md`.
- Black and gold colour scheme. Counts expire after 60 minutes.
- Sharing between phones is live behind `?live`, against a real Firebase database. The field kit backs up online and `field.html?survey` collects anonymous answers. Survey QR code and sign in `submission/`.
- Staff survey accepts a patrol truck's vehicle count for a bay and converts it to open stalls (`ParkingModel.openFromVehicles`), stating how far off it could be where a bay has non-regular stalls.
- Evidence: conversation with KSU's associate director of parking operations (Nov 19).

## 2026-11-19, evening (Claude): visual redesign
- Styles moved to `src/styles.css`. One idea: parking signage. Black, gold and white, square corners, the Barlow typeface (embedded, open licence), one spacing scale.
- Removed: the marketing headline and intro line, the small uppercase labels above headings, pill-shaped tags, the coloured stripe on the notice, long dashes used as placeholders.
- The verdict is the first thing on the page, as a black sign board. The first-visit card sits below it. The note about the 3D model is folded away.
- Nothing about how the app behaves changed; all tests pass unchanged apart from the placeholder character.
- The app is now a row of full-size screens (Now, Deck, Levels, Report, Count) with a bottom bar and sideways swipe; About is behind the "i" button. Explanations, demo controls and field tools moved to About. Wording cut throughout.
- Content security policy and no-referrer added. `docs/SECURITY.md` lists what is and is not protected.
- Renamed to **Park.AI** in the app, icon and pitch deck. The owl mark is an original drawing, not KSU's logo. The pitch deck file is now `submission/Park-AI-pitch-DRAFT.pptx`.
- Bay drop-downs replaced by one-tap bay buttons (Report and Count). The phone remembers the last bay.
- A one-line guide above the bottom bar gives the next step with one button: a nudge to report for anyone who has not, "Leaving?" for anyone who has, the best bet on the Deck screen, and "Count next" for monitors.
- Monitors: tapping a bay starts the count, and one button saves it. After a report the app jumps to the deck to show what changed.
- A parking report and a leaving report are now separate for the repeat guard, so leaving soon after parking works.

## 2026-11-19, evening (Claude, at Kell's request)
- **Counts are never erased.** Monitors do not pass through on a fixed schedule, so a count past the 60-minute estimate window now stays on screen as "Last count" with its age (minutes, hours or days) until a new tally replaces it. It is labelled "not live" and is never turned into an estimate or a verdict (`ParkingModel.lastCounts`).
- Deck switcher on Now (`data/places.json`), tester review mode (`?try`), share-link fallback on the QR screen.
