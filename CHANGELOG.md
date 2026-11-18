# Changelog (pass this to Codex before it edits anything)

File ownership this round: **Claude** owns `src/*`, `build.cjs`, `test/*`. Docs (`*.md`) are open to anyone, one editor at a time.
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
