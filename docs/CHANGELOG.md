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
- Renamed to **Park.AI** in the app, icon and pitch deck. The owl mark is an original drawing, not KSU's logo. The pitch deck file is now `submission/Park-AI-pitch.pptx`.
- Bay drop-downs replaced by one-tap bay buttons (Report and Count). The phone remembers the last bay.
- A one-line guide above the bottom bar gives the next step with one button: a nudge to report for anyone who has not, "Leaving?" for anyone who has, the best bet on the Deck screen, and "Count next" for monitors.
- Monitors: tapping a bay starts the count, and one button saves it. After a report the app jumps to the deck to show what changed.
- A parking report and a leaving report are now separate for the repeat guard, so leaving soon after parking works.

## 2026-11-19, evening (Claude, at Kell's request)
- **Counts are never erased.** Monitors do not pass through on a fixed schedule, so a count past the 60-minute estimate window now stays on screen as "Last count" with its age (minutes, hours or days) until a new tally replaces it. It is labelled "not live" and is never turned into an estimate or a verdict (`ParkingModel.lastCounts`).
- Deck switcher on Now (`data/places.json`), tester review mode (`?try`), share-link fallback on the QR screen.
- **Camera scan is now the main way to count** (Kell's decision): live camera view with a quick on-device vehicle count and boxes, then a thorough pass on the captured view. Hand tally stays as the fallback. In-deck accuracy is still only measured on two photos.
- 3D deck: entrances, exit to campus, level tags, faculty/staff parking.
- **Ask Park.AI**: a guide opened from the header. Ten topics (where to park, room now, in 10 minutes, walk to campus, drive in, just parked, leaving, monitor count, faculty parking, other decks), each answered from the app's current counts with a button that goes to the right screen. Typed questions are matched to a topic by shared words, on the phone. It is not a language model and says so on screen.

## 2026-11-20 (Claude, at Kell's request)
- 3D deck: the compass shows N, E, S and W; every bay label carries its name (West, Centre, East, North, South) above its number; the model is titled "West Deck".
- **One-tap check-in**: after tapping a recommended bay, "I parked here" saves the check-in on the Deck screen and offers one optional tap for how full the bay is. "I'm leaving" appears on the same bay afterwards.
- Report screen: the two steps are numbered.
- Camera scan is the main way to count; Ask Park.AI; deck switcher; entrances; counts are never erased. Demo videos and the final pitch deck are in `submission/`.
- **"You parked here"**: after a check-in, a green pin marks that bay on the 3D deck (it stays through a reload and moves with its level), and the Now screen shows where you parked with a button that opens it on the deck. Stored on the phone only.
- Fixed (found by Kell on a real phone at West Deck): on a second camera scan the picture shrank inside black bars and the boxes were misplaced. Each scan now starts with a fresh video element and an empty overlay. Verified with three scans in a row on a simulated camera; not yet re-tested on a phone.
- The camera scan was tried on a real phone in West Deck on 2026-11-20 and worked.
- **Level focus on the 3D deck**: tap a level's gold tag, or the All / Level 3 / Level 2 / Level 1 buttons under the model. That level stays solid with its bay counts and a summary line; the other levels fade and lose their labels. Level 1 shows that it has no student stalls.
- **Staff password**: the Count screen, the project tools in About (field kit links, demo controls, field tools) and the field kit page are locked behind one password, remembered per phone. The student survey link stays open. A speed bump only; see `docs/SECURITY.md`.
- **Bay focus and a calmer Deck screen** (from tester feedback that the 3D page felt crammed): tapping a bay, or its button under the model, shows that bay alone with the rest of its level and the other levels faded. Bay names show only once a level is chosen. The legend and the list of ways in and out are folded away.
- **Two passwords**: one for monitors (the Count screen) and one for staff (the project tools on About and the field kit). Each is remembered per phone.
- **Three steps to park** (from tester feedback): the Now screen opens on the question "Where do you want to park?" with the best bays as large buttons, the top one in gold. Tap one to see it alone on the 3D deck, then "I parked here". The verdict, the arrive-in prediction and the deck switcher sit below.
- **Guided path** (from tester feedback that there was "a lot in between"): choosing a bay on Now opens the Deck screen showing only the model, that bay, and one gold button, "I parked here". After the tap it shows where you parked, the exit to campus, and an optional one-tap "how full is it?", then returns to Now. Level buttons, bay buttons, details and the legend are hidden until the path ends or the person taps the model.
- Now screen: an "Are you a monitor? Count a bay" button goes straight to the Count screen (which asks for the monitor password once).
- Now screen (tester feedback): the number of open spaces is the first and largest thing on the screen, coloured by the verdict; the question and its bay buttons follow. Nothing was removed.
- Now screen cleared (Kell): the deck's details (levels, stalls, clearance) moved to the Deck screen under "About this deck". The bay buttons are plain: the best bay solid gold, the others dark (Kell's chosen look). The last-count view now has the same shape as the normal one.
- The replay always opens at 11:58 AM on Nov 19. Before, a returning visitor's saved replay aged in real time and showed day-old "last counts".
- Tapping any bay (on the 3D model, a bay button, or the level list) now offers "I parked here" straight away, with the level and bay buttons still on screen for choosing another. After checking in from the model you stay on the Deck screen.
- Now screen: the monitor shortcut is a small link at the bottom.
- **Monitors start a count in three steps**: 1 Which deck? (West Deck; the others say soon) 2 Which level? 3 Which bay? (West, Centre, East, North, South). The third tap opens the count. The deck and level are remembered, so the next bay on the same level is one tap. The "Count next" shortcuts above still jump straight to a suggested bay.
