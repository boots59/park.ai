# WEST / deck: a parking survey prototype (simulated)

A student concept for West Deck, KSU Kennesaw campus. Staff survey one **bay** at a time; students see each bay's
last count, its age, and a 3D view of the deck. **All data is illustrative. Not a KSU system.**

## Open it
`dist/West-Deck-Prototype.html`: one file, opens offline in any modern browser (about 1 MB because three.js and the 3D model are inside).
`dist/West-Deck-Prototype-lite.html` is the same page without the 3D view (26 KB).

## Develop
```bash
npm install
npm test               # build + 24 Node tests (model logic, UI behaviour)
npm run check:browser  # real headless Chromium at 375px and 1280px, network blocked, screenshots in screenshots/
```

| Path | What it is |
|---|---|
| `src/model.js` | Pure logic: status from survey start, replace-not-add, version check, level rollup, storage validation |
| `src/app.js` | Page behaviour: survey flow, cards, demo clock, backup reports, link to the 3D view |
| `src/viewer.js` | three.js viewer: loads the model, tints bays, tap to select, spread levels |
| `src/index.template.html` | Markup and CSS with `/*VIEWER*/ /*DECK*/ /*MODEL*/ /*APP*/` markers |
| `build.cjs` | Bundles the viewer (esbuild), embeds the GLB as base64, writes `dist/` |
| `assets/` | The friend's 3D model (`west_deck_plain.glb`, `west_deck.json`, `MODEL-README.md`) |
| `baseline/` | The prototype exactly as uploaded before this work |
| `EVIDENCE.md` | What is verified, assumed, simulated or proposed |
| `CONTRIBUTIONS.md` | Who did what, for an honest record |
| `LEARNING-3D.md` | How the 3D model was made and how to learn to do it |
| `CHANGELOG.md` | Changes per step, to pass to other collaborators (Codex) |
