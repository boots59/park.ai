# WEST / deck: a parking survey prototype (simulated)

A student concept for West Deck, KSU Kennesaw campus. Staff survey one **bay** at a time, optionally with an on-device AI model
that counts vehicles in a photo and a person who confirms the number. Students see each bay's count, or an estimate
with a range once the count ages, a deck-level verdict and a 3D view. **All data is illustrative. Not a KSU system.**

## Run it
```bash
npm install
npm run fetch-model   # one-time: the 36 MB detection model
npm run build
npm run serve         # then open http://127.0.0.1:8080/
```
The built page is one HTML file in `dist/` plus an `ai/` folder for the detection model. Build output is not kept in git.

**3D view:** the deck model (`assets/west_deck_plain.glb`) was made by a collaborator and is not in this repository yet.
Without it the page builds and runs with the level cards only. `assets/west_deck.json` holds that model's bay layout and
stall estimates, which are not KSU figures.

## Develop
```bash
npm install
npm run fetch-model    # one-time: downloads the 36 MB detection model, checks its checksum
npm test               # build + 44 Node tests (survey logic, detection maths, UI behaviour)
npm run serve          # serves dist/ at http://127.0.0.1:8080/ (the AI count needs http)
npm run check:browser  # headless Chromium at 375px and 1280px; runs the real model if test/fixtures/street.jpg exists
```

| Path | What it is |
|---|---|
| `src/model.js` | Pure logic: replace-not-add surveys, estimates with ranges and trends, level and deck summaries, checks against real counts, storage validation |
| `src/detect.js` | Pure maths around the detection model: resize, tensor layout, box decoding, duplicate removal |
| `src/ai.js` | Loads the model in the browser and counts vehicles in a photo, on the device |
| `src/app.js` | Page behaviour: survey flow, AI assist, field log, cards, demo clock, backup reports, link to the 3D view |
| `src/viewer.js` | three.js viewer: loads the model, tints bays, tap to select, spread levels |
| `src/index.template.html` | Markup and CSS with `/*VIEWER*/ /*DECK*/ /*MODEL*/ /*APP*/` markers |
| `build.cjs` | Bundles the viewer (esbuild), embeds the GLB as base64, writes `dist/` |
| `assets/` | `west_deck.json`: bay layout and stall estimates from a collaborator's 3D model |
| `baseline/` | The prototype exactly as uploaded before this work |
| `scripts/` | `fetch-model.cjs` (model download), `serve.cjs` (local server) |
| `docs/FIELD-DAY.md` | Thursday's measurement protocol and student poll |
| `EVIDENCE.md` | What is verified, assumed, simulated or proposed |
| `CONTRIBUTIONS.md` | Who did what, for an honest record |
| `LEARNING-3D.md` | How the 3D model was made and how to learn to do it |
| `CHANGELOG.md` | Changes per step, to pass to other collaborators (Codex) |
