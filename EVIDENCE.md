# Evidence log: verified, assumed, simulated, proposed

Update this whenever a fact changes. "Verified" means someone read the primary source or measured it.

## Verified
| Fact | Source | Checked |
|---|---|---|
| KSU uses License Plate Recognition; your plate is your virtual permit | KSU Parking News page | 2026-11-18 (Claude read the page) |
| KSU says extra permits may be released "based on real-time occupancy data" | KSU Parking News page | 2026-11-18 |
| When a lot or deck is full, KSU directs students to the Shuttle Lot and Big Owl Bus | KSU Parking FAQ | 2026-11-18 |
| Kennesaw West Deck clearance 7 ft 2 in; Marietta also has a "West Deck" (7 ft 0 in) | KSU Parking FAQ | 2026-11-18 |
| Tue/Thu busiest; class enrollment peaks 11 a.m.–3 p.m. | KSU Early Semester Parking Guide | 2026-11-18 |
| Live camera viewing goes through Public Safety with a written justification; archives only on KSU workstations; new cameras via Public Safety, paid by the requesting department | KSU Video Monitoring Standard, updated 2024-09-10, §2–4 | 2026-11-18 |
| ParkSynk (Spring 2024 ISE senior design) targeted the **Marietta** campus with an app and sensors | DigitalCommons egr_srdsn/101 abstract (full report not read) | 2026-11-18 |
| The 3D model file contains 3 level groups, 9 bay meshes, and named materials as its README says | Inspected the GLB | 2026-11-18 |
| The page opens from a file with network blocked and does not scroll sideways at 375px; 3D renders in software WebGL | `npm run check:browser` | 2026-11-18 (headless Chromium, not a real phone) |

## From the 3D model's own README (not independently checked)
- Outline 118.6 × 55.4 m, top deck 319.15 m, 3.1 m floor-to-floor: USGS 3DEP lidar flown April 2019.
- Stall module 2.61 m at about 76°: USDA NAIP photo, October 2025.
- **3 levels: from OpenStreetMap. The lidar allows up to 5.** Unconfirmed.
- **Levels 1–2 copy the top deck's layout.** Modelled.
- **651 stalls (79/39–80/69–73 per bay): the model's numbers, not KSU's.**

## Hackathon (from the AI Club Hackathon 2026 opening-ceremony slides, read 2026-11-19)
- Nov 16–20, KSU Marietta campus. **Submit Fri Nov 20, 12:00 PM**: PowerPoint pitch deck plus a demo video, or a note that you'll demo live. Pitch and judging Fri 5:30–8:30 PM, 5 minutes per team.
- Registration was due by the end of Monday, Nov 16.
- Tracks (one project can enter several): **AI Club** ($800/$200), **IEEE CS** (a game built with AI: not this project), **Nudox** ($900, most organized codebase; criteria announced at the event, not in the slides), **it.** ($800; the slides show placeholders only).
- AI Club rubric (100): campus impact 25 (real data: surveys, counts, wait times), **use of AI 25 ("AI is the core of the solution, not an add-on")**, feasibility 20, creativity 15, pitch 15.
- The prototype currently runs **no AI model**, so it would score poorly on "use of AI" as it stands.

## Unknown
Real level count; stalls per bay and permit type; where the restricted spaces are; whether staff would take part; any existing per-floor feed; Nudox and it. judging criteria; whether Kell registered.

## Simulated (in the prototype)
All counts, timestamps, observers, entry/exit reports, the "example general permit" category, and the 5/15/20-minute thresholds.

## Proposed, not yet tested
Bay-level surveys are faster and more accurate than level surveys; the 5-minute fresh window; students can pick a suitable level from the display.
