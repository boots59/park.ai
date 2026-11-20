# Where the numbers come from, and how they stay fresh when nobody is counting

The weakest link in this project is relying on one group of people. The design answer is several sources, each labelled
with how far it can be trusted, and an honest "unknown" when none applies.

## Built

| Source | Trust | Needs | Works with nobody on site? |
|---|---|---|---|
| Staff count (optionally AI-assisted) | Highest | A monitor on a round | No |
| Estimate between counts: a range that widens with age and follows the last trend | Medium, and it says so | Two recent counts for a trend | For up to 60 minutes after a count |
| Student report: "plenty / a few / full" from someone who just parked | Low | Students who use the app | Yes, whenever students are parking |
| Student report on leaving: "my space is opening" | Low, and short-lived (4 minutes) | Students who use the app | Yes, whenever students are leaving |
| Typical at this hour: the range of past counts at this time of day | Context only, never a count | A few days of history | Yes |

Order of precedence: a staff count under 5 minutes old wins. After that the newest student report sets the bay (narrowed
by the ageing staff estimate when they agree). With neither, the bay is unknown and shows the typical range if there is one.

## Not built: ideas for keeping data fresh with no staff present

| Idea | What it gives | What it needs | Main risk |
|---|---|---|---|
| **Entrance and exit counters** (beams or loops at each lane) | A continuous deck total, day and night | KSU approval, hardware at every lane, a daily reset | Drift from missed cars; no per-level detail |
| **Scan counts from the plate-reading truck** (a monitor says one drives the whole deck and scans every plate) | Occupied stalls per level on every pass, with no extra work and no new equipment. Open = counted stalls − scans. Only the COUNT is needed, never a plate | The parking office sharing a number per level per pass | Parking operations says the truck passes West Deck six or seven times a day, so roughly every two hours: too sparse alone, which is why people fill the gaps. Whether scans are tagged by level is still unknown. A count of all vehicles cannot tell a regular stall from a faculty one (the app shows how far off it could be) |
| **The deck's existing cameras with the same detection model**, plus staff counts for whatever the cameras cannot see | Counts every minute where a camera has a view; people fill the gaps | Public Safety approval under KSU's video standard. Kell saw four corner cameras on each of Levels 1 and 2, and at least one on Level 3 | Coverage is unknown (the middle may be out of view); a camera also sees vehicles outside its bay or outside the deck, so each camera needs a fixed outline of the stalls it is allowed to count; the detector works from an angled view and fails from straight overhead (see RESULTS.md), so camera angle decides whether it works at all; privacy; approval time |
| **Forecast from class schedules** | An expected fill curve by day and hour, before anyone arrives | KSU's published enrollment-by-hour data plus a few weeks of counts | Unusual days (events, weather) |
| **Signals from the garage's own systems** (gate or permit-scan events, if any exist) | A count of entries by permit holders | KSU | Unknown whether any exist at West Deck |

All of these depend on KSU.

## What has not been tested
- Whether students will report at all, and how often they report wrongly. The rules for combining reports are a design, not a finding.
- "Typical at this hour" has no data behind it yet; it only appears once several days of counts exist.

## Making a student report nearly effortless (what is built, and what is not)
- **Built:** the phone remembers the bay it last reported, so parking is one tap and "I'm leaving" is one tap with no bay to pick. A link ending `?bay=L2_West` opens the report panel with that bay chosen, so a QR code posted in a bay makes it scan-then-one-tap. Posting codes needs KSU's permission.
- **Not built, and why:** automatic bay detection by GPS. Satellite positioning is unreliable inside a concrete deck and cannot tell one level from another, and this project's own rule is to collect no location traces.
- **Needs a native app (later):** a home-screen or lock-screen widget, and reminders when you arrive or leave.

## Why not video from the truck or a walking monitor
Kell's idea after talking to a monitor: film the whole deck from the truck or on foot and let the AI count. Not pursued, for three reasons.
1. The truck already produces one record per parked car (the plate scan). A count of those scans is the same information without a second camera.
2. Continuous video of every car captures every plate and anyone walking by, which this project's rules exclude.
3. Counting from moving video means following each car across frames so it is not counted twice. That is a larger build than a hackathon allows, and nothing here has tested it.

## Other decks and lots (`data/places.json`)
Names come from KSU Parking and Transportation's Kennesaw and Marietta parking maps and the student permit page; deck clearances from the KSU Parking FAQ (read 2026-11-19). Only West Deck (Kennesaw) has counts. Every other place shows "Coming soon" and never a number. Residential lots are left out.

## Ways in and out (`data/deck.json`, `access`)
The pins on the 3D deck come from Kell's on-site notes of 2026-11-19: the walk exit to campus at the north-east corner of Level 3 (the stair and lift tower already in the model), the main vehicle entrance/exit on the south side of Level 1 at its far east end, and a side vehicle entrance/exit on the west side of Level 1. Corners and sides are from notes, not surveyed: positions are approximate to a few metres, and the side entrance's place along the west side is not recorded.
