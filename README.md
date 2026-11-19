# WEST / deck

**Know before you drive in.** A student prototype for West Deck on KSU's Kennesaw campus: people on the ground count open
spaces one bay at a time, an on-device AI model helps them count, and students see the count, or an honest estimate with
a range once the count starts to age.

> **Status: concept prototype with simulated data.** Not a KSU system and not affiliated with KSU. Nothing here is a
> real-time feed. What is measured, assumed and simulated is tracked in [docs/EVIDENCE.md](docs/EVIDENCE.md).

Built for the KSU AI Club Hackathon 2026 by Kell Enow.

## What it does

| For | Feature |
|---|---|
| Students | A deck verdict (Room likely, Tight, Likely full, Not enough counts), level cards, and per-bay numbers |
| Students | A count under 5 minutes old is shown as counted. From 5 to 30 minutes it becomes a range that widens with age and follows the bay's recent trend. After 30 minutes it says unknown |
| Staff | A bounded survey of one bay: start, count, confirm coverage, complete. A new count replaces the old one |
| Staff | **AI assist:** photograph a section, a detection model on the device counts the vehicles, the person corrects the number |
| The project | A field log that scores the AI against the person, and the estimates against later real counts |

## Run it

```bash
npm install
npm run fetch-model   # one-time: downloads the 36 MB detection model and checks its checksum
npm run build
npm run serve         # then open http://127.0.0.1:8080/
```

`dist/index.html` also opens straight from disk with no network; only the AI count needs the page to be served.

## Test it

```bash
npm test               # build + 44 tests: survey logic, detection maths, page behaviour
npm run check:browser  # headless Chromium at phone and desktop widths; runs the real model if test/fixtures/street.jpg exists
```

## Change it

| To change | Edit | Notes |
|---|---|---|
| Stall numbers, bays, levels, labels | [`data/deck.json`](data/deck.json) | Set `source` to `counted` when a number was counted on foot; the page then stops calling it a model estimate |
| Time limits, range width, verdict thresholds, detection confidence | [`src/settings.js`](src/settings.js) | Every value is explained in the file |
| What students and staff see | [`src/index.template.html`](src/index.template.html), [`src/app.js`](src/app.js) | Markup and wording; page behaviour |
| How counts, estimates and summaries are computed | [`src/model.js`](src/model.js) | Pure functions, covered by `test/model.test.cjs` |

After any change run `npm test`. If a test fails because you changed a number on purpose, update the expected value in the test.

## How it is organised

```
data/deck.json            bays and stall numbers (the one file to edit after a field count)
src/settings.js           every tunable number and label
src/model.js              survey rules, estimates, summaries, accuracy checks (pure logic)
src/detect.js             maths around the detection model (pure logic)
src/ai.js                 runs the detection model in the browser
src/viewer.js             3D deck view (three.js)
src/app.js                page behaviour: survey flow, AI assist, field log, rendering
src/index.template.html   markup and styles
public/                   app icons, manifest, service worker, and field.html (anonymous student poll and circling tally)
scripts/                  build, local server, model download
test/                     model, detection and page tests; browser check
docs/                     evidence log, architecture, field protocols, results, credits, contributions
submission/               pitch outline, demo script, submission checklist
```

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

**3D view:** `assets/west_deck_plain.glb` is a 3D model of the deck made by a collaborator ([Bookee2](https://github.com/Bookee2/SkillZ))
from public lidar and aerial imagery, included with their permission. [assets/MODEL-README.md](assets/MODEL-README.md) says what in it is
measured and what is guessed. If the file is removed, the page still builds and runs with the level cards only.

## Where the AI is

1. **In the product:** an open-source object-detection model (YOLOX-s, trained on the public COCO dataset) counts vehicles
   in a staff photo, entirely on the device. A person confirms every number. Between counts, a small statistical model
   estimates each bay with a range.
2. **In the making:** the code was written with AI coding assistants (Claude, Codex) under Kell's direction.
   [docs/CONTRIBUTIONS.md](docs/CONTRIBUTIONS.md) records who did what.

Neither has been validated in West Deck yet. [docs/RESULTS.md](docs/RESULTS.md) holds the measurements as they come in.

## Privacy

No license plates, faces, names or enforcement records are collected. Photos are processed on the device and never saved
or uploaded. The field log holds counts and times only.

## Credits

See [docs/CREDITS.md](docs/CREDITS.md) for libraries, the model, data sources and people.
