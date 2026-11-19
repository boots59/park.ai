WEST / deck — Kell Enow's parking concept prototype

OPEN: Download and open West-Deck-Prototype.html in a browser. No installation,
API keys, server, or network connection required. Some chat previews may not run
JavaScript: download the file first. Data stays in browser-local storage.

TRY IT
1. Student overview: illustrative fresh counts, zero, stale, and unknown.
2. Staff survey demo: choose a level, start, tally eligible open spaces,
   confirm full-level coverage, complete. It replaces the old count.
3. Switch to Student overview. Advance the demo clock to test expiry.
4. Clear observations to test no-data states; reset to restore samples.

This is simulated, not operational. Four levels are an example, not verified
West Deck geometry. Capacity unknown. No KSU authorization/authentication,
camera integration, QR distribution, cross-user backend, or AI inference.
Student entry/exit reporting is a separate simulated low-trust channel. It
shows report totals and net reported movement, NOT occupancy or vacancies.
Missed reports, duplicates, and lack of a verified baseline cause uncertainty.
No enforcement information, plates, identities, or faces are collected.
Actual deployment requires KSU cooperation and validated data collection.

DEVELOPER FILES
model.js: pure survey replacement and freshness logic.
index.template.html: UI + app source with /*MODEL*/ insertion marker.
West-Deck-Prototype.html: assembled standalone deliverable.
test.cjs: Node tests. Run `node test.cjs` in this folder.

CHECKS
Model tests cover expiry boundaries, zero vs unknown, floor isolation,
replacement not accumulation, invalid counts, and stale-version rejection.
Document-double interaction tests cover full-coverage gating, survey save,
replacement, expiry, clear/reset, and cancel. Browser visual/manual QA was not
available in this environment. Mobile-responsive CSS is included, but has not
been visually verified on a real browser or phone.

Single-browser demo concurrency checks are not production transaction locking.
A real backend must authenticate authorized staff, atomically reject conflicting
surveys, handle retries/offline sync, and maintain an audit log. Thresholds are
illustrative and must be calibrated against independent ground-truth checks.
