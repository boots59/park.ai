# Contributions: an honest record

Fill in the blanks yourself. A reviewer (or a Claude Corps application) will trust specific statements like
"I chose X because Y" more than "I built an app".

## Kell Enow
- Problem framing: students circling West Deck; floor-by-floor counts from people already walking the deck.
- Product constraints: replace not add, freshness states, no surveillance or insurance claims, no fake KSU facts, stay simulated.
- Decisions: student entry/exit reports as a separate low-trust backup; **survey per bay instead of per level** (2026-11-18); use a GitHub repo as the single source of truth.
- Asked whether the design was the best one, then gave Claude latitude to change or scrap design choices (2026-11-18). Went to West Deck that night to collect ground truth.
- _Add: what you tested, what you changed your mind about, who you talked to at KSU, the field counts you ran._

## Friend (name to confirm before crediting publicly)
- The 3D West Deck model: lidar and aerial-photo measurements, Blender model, GLB exports, model README (`assets/`, included with their permission, given 2026-11-19).

## Codex
- The baseline prototype in `docs/baseline/` (_confirm: which parts did Codex write?_).

## Claude (this session)
- Checked the primary sources in `docs/EVIDENCE.md`, challenged assumptions, and proposed the validation study.
- Wrote `src/model.js` (bay records, age from survey start, 20-minute limit, level rollup, storage checks),
  `src/app.js` (adapted from the baseline), `src/viewer.js`, `scripts/build.cjs` and all tests in `test/`.
- Proposed the AI-assisted count after reading the hackathon rubric, chose the model (YOLOX-s, for its Apache-2.0 licence and small-object accuracy), and wrote `src/detect.js`, `src/ai.js`, the field log and their tests. _Kell: you asked for a plan to win and I built this on my own recommendation; confirm or reject it._
- Drafted the outreach emails and the field-day protocol.
- With Kell's latitude: replaced "hide old counts" with estimates and ranges, added the deck verdict and the estimate check, and removed the student entry/exit reports that Kell had originally asked for.
- Found and fixed: the phone layout scrolled sideways (14 px, tab bar); a camera bug in the new 3D viewer.

## AI use statement (draft)
"Built with AI coding assistants (Claude, Codex). I set the requirements, made the product decisions and checked the outputs;
the commit history shows which assistant wrote each part. The product runs one AI model, an open-source vehicle detector, and a person confirms every count it suggests."
