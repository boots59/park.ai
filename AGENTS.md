# AGENTS.md: working on this repository with a coding agent

Park.AI is a static web app (no framework, no server). Read `README.md` first, then `docs/ARCHITECTURE.md`.

## Commands
```bash
npm install
npm run fetch-model     # one-time: the 36 MB detection model (not in git), checksum-verified
npm test                # builds dist/, then the model, detection and UI suites
npm run check:browser   # headless Chromium at phone and desktop width
npm run serve           # dist/ over local http (the camera and AI need http, not file://)
```

## Where things are
| Path | What |
|---|---|
| `src/model.js` | Pure logic (estimates, verdicts, ranking). No DOM. Every change needs a test in `test/model.test.cjs` |
| `src/app.js` | Page behaviour. Tested through a fake document in `test/ui.test.cjs` |
| `src/viewer.js` | three.js deck viewer |
| `src/detect.js`, `src/ai.js` | Detection maths (pure, tested) and the browser glue around the model |
| `data/` | The only source of deck facts: `deck.json`, `places.json`, raw field files in `data/field/` |
| `docs/` | Evidence, results, privacy, data sources. Update them in the same change as the code |
| `submission/` | Pitch deck, scripts, description |

## Rules that are not negotiable
- **No invented facts.** A number on screen or in a document comes from `data/` or `docs/RESULTS.md`, or it is labelled as an estimate, a prediction or sample data.
- **Nothing old is shown as live.** Every count carries its age.
- **No plates, faces, names, device ids or location** are collected, stored or sent. Camera frames and photos stay in memory on the device.
- **Not a KSU system.** Do not add KSU logos or wording that implies endorsement.
- Run `npm test` and `npm run check:browser` before committing. Do not weaken a test to make it pass.
- Record who did what in `docs/CONTRIBUTIONS.md` and what changed in `docs/CHANGELOG.md`.
