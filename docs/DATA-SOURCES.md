# Where the numbers come from, and how they stay fresh when nobody is counting

The weakest link in this project is relying on one group of people. The design answer is several sources, each labelled
with how far it can be trusted, and an honest "unknown" when none applies.

## Built

| Source | Trust | Needs | Works with nobody on site? |
|---|---|---|---|
| Staff count (optionally AI-assisted) | Highest | A monitor on a round | No |
| Estimate between counts: a range that widens with age and follows the last trend | Medium, and it says so | Two recent counts for a trend | For up to 30 minutes after a count |
| Student report: "plenty / a few / full" from someone who just parked | Low | Students who use the app | Yes, whenever students are parking |
| Typical at this hour: the range of past counts at this time of day | Context only, never a count | A few days of history | Yes |

Order of precedence: a staff count under 5 minutes old wins. After that the newest student report sets the bay (narrowed
by the ageing staff estimate when they agree). With neither, the bay is unknown and shows the typical range if there is one.

## Not built: ideas for keeping data fresh with no staff present

| Idea | What it gives | What it needs | Main risk |
|---|---|---|---|
| **Students report on leaving** ("my space in Level 2 West is about to open") | The one event no count can see: a space opening | App users | Low volume; false reports |
| **Entrance and exit counters** (beams or loops at each lane) | A continuous deck total, day and night | KSU approval, hardware at every lane, a daily reset | Drift from missed cars; no per-level detail |
| **Monitor scanner logs** | Cars per level on every round, with no extra work | KSU sharing data it may already hold | It may not log location; unconfirmed |
| **The deck's existing cameras with the same detection model**, plus staff counts for whatever the cameras cannot see | Counts every minute where a camera has a view; people fill the gaps | Public Safety approval under KSU's video standard. Kell saw four corner cameras on Level 2 and at least one on Level 3 | Coverage is unknown (the middle may be out of view); privacy; approval time |
| **Forecast from class schedules** | An expected fill curve by day and hour, before anyone arrives | KSU's published enrollment-by-hour data plus a few weeks of counts | Unusual days (events, weather) |
| **Signals from the garage's own systems** (gate or permit-scan events, if any exist) | A count of entries by permit holders | KSU | Unknown whether any exist at West Deck |

The first one is a small addition to what is built. The rest depend on KSU.

## What has not been tested
- Whether students will report at all, and how often they report wrongly. The rules for combining reports are a design, not a finding.
- "Typical at this hour" has no data behind it yet; it only appears once several days of counts exist.
