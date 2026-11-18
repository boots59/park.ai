# Contributions: an honest record

Fill in the blanks yourself. A reviewer (or a Claude Corps application) will trust specific statements like
"I chose X because Y" more than "I built an app".

## Kell Enow
- Problem framing: students circling West Deck; floor-by-floor counts from people already walking the deck.
- Product constraints: replace not add, freshness states, no surveillance or insurance claims, no fake KSU facts, stay simulated.
- Decisions: student entry/exit reports as a separate low-trust backup; **survey per bay instead of per level** (2026-11-18); use a GitHub repo as the single source of truth.
- _Add: what you tested, what you changed your mind about, who you talked to at KSU, the field counts you ran._

## Friend (name to confirm before crediting publicly)
- The 3D West Deck model: lidar and aerial-photo measurements, Blender model, GLB exports, model README (`assets/`).

## Codex
- The baseline prototype in `baseline/` (_confirm: which parts did Codex write?_).

## Claude (this session)
- Checked the primary sources in `EVIDENCE.md`, challenged assumptions, and proposed the validation study.
- Wrote `src/model.js` (bay records, age from survey start, 20-minute limit, level rollup, storage checks),
  `src/app.js` (adapted from the baseline), `src/viewer.js`, `build.cjs` and all tests in `test/`.
- Found and fixed: the phone layout scrolled sideways (14 px, tab bar); a camera bug in the new 3D viewer.

## AI use statement (draft)
"Built with AI coding assistants (Claude, Codex). I set the requirements, made the product decisions and checked the outputs;
the commit history shows which assistant wrote each part. The product itself runs no AI model."
