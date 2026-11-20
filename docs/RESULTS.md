# Results

Only measured numbers go here, each with its date, method and sample size. Empty rows mean "not measured yet".
The protocol is in [FIELD-DAY.md](FIELD-DAY.md) and [TONIGHT.md](TONIGHT.md).

## Ground truth (West Deck)
| Measure | Value | Date | How |
|---|---|---|---|
| Number of levels | **3** | 2026-11-19 | Kell, on foot |
| Bay layout | Each level also has North and South bays, which the 3D model does not have | 2026-11-19 | Kell, on site |
| Total stalls, all types, whole deck | **662** (the exported log adds up to the same figure) | 2026-11-19, morning | Kell, on foot, tap counter in the field kit; one counter, not double-checked. The 3D model's estimate was 651 |
| Stalls by level | Level 3: 241 (231 regular, 10 accessible). Level 2: 240 (197 regular, 5 accessible, 38 faculty/staff). Level 1: 181 (0 regular, 174 faculty/staff, 3 accessible, 4 other) | 2026-11-19, 8:51-10:01 AM | Same count; file `data/field/2026-11-19-stall-count.csv` |
| Regular stalls (the ones the app counts) | **428 of 662**, all on Levels 2 and 3 | 2026-11-19 | Stall types as read from signs and markings; time limits on faculty/staff stalls not recorded |
| Stalls per bay (counted on foot) | In `data/deck.json`: West, Centre ramp, East, North and South on each level | 2026-11-19 | Same count |
| Restricted stalls per bay | In `data/deck.json` (accessible, faculty/staff, other reserved) | 2026-11-19 | Same count |
| Entrances and exits | | | |
| Existing counting equipment seen | | | |

## How full was the deck? (Thursday, Nov 19, two passes of all 10 student bays, one observer)
| Measure | Pass 1, 11:16-11:35 AM | Pass 2, 11:49-11:57 AM |
|---|---|---|
| Open regular stalls | 75 of 428 (82% taken) | 70 of 428 (84% taken) |
| Level 3 | 47 open of 231 | 45 open of 231 |
| Level 2 | 28 open of 197 | 25 open of 197 |
| Where the room was | 56 of 75 in three bays (L2 West 21, L3 West 19, L3 Centre 16) | 57 of 70 in the same three bays (22, 18, 17) |

The deck did not fill at the time KSU gives as the start of the peak. Most open stalls were in 3 of the 10 student bays;
East, North, South and the Level 2 ramp bay were nearly or completely full. Raw log: `data/field/2026-11-19-bay-counts.csv`;
recompute with `node scripts/analyze-field.cjs data/field/2026-11-19-bay-counts.csv`.

## Does the survey work?
| Measure | Value | Sample | Date |
|---|---|---|---|
| Time for one person to tally all 10 student bays | 8.4 minutes **on a skateboard**. Walking time not yet measured | Pass 2 | 2026-11-19 |
| Median time from "start" to "complete" for one tallied bay | 24 s (range 4-162 s). Some bays were counted before pressing start, so this understates walking time | 19 counts | 2026-11-19 |
| Two observers, same bay: average difference | | | |
| How far a bay's count moved between the two passes (19-33 minutes apart) | Mean 0.9 stalls, largest 3, net -5 across the deck | 10 bays | 2026-11-19, 11:16-11:57 AM |

## Does the AI count work?
| Measure | Value | Sample | Date |
|---|---|---|---|
| Photos where the model matched the person exactly | 2 of 2 (15 and 13 vehicles), single-look mode. Far too few to conclude anything | 2 photos, one bay | 2026-11-19 |
| Limits seen in use (not logged as numbers) | One wide photo of a whole bay found about 11 vehicles at most; a wide photo also counted vehicles outside the deck | Kell's observation | 2026-11-19 |
| Average error per photo (vehicles) | | | |
| Vehicles missed / invented | | | |
| Time per photo on a phone | | | |

### Camera-like views: a quick look on public images (2026-11-19, not West Deck)
Three still images from fixed or aerial parking-lot cameras, found in public GitHub repositories, run through the app's
detector. There is no answer key: the "by eye" numbers are Claude's own count from the annotated image, so treat them as rough.

| Image | One look | Enlarged quarters (the app's setting) | 3 x 3 pieces | By eye |
|---|---|---|---|---|
| Angled view from a pole, open lot, about 38 vehicles | 29 | 39 | 41 | about 37 to 39; no clear misses, one or two possible double counts |
| Angled view from a building, apartment lot | 15 | 22 | 24 | about 22 to 25; a few small distant cars unboxed |
| Straight down from above (drone-style), about 60 vehicles | 0 | 1 | 0 | fails completely |

What this suggests, and no more: from an angled, elevated camera the model finds nearly every clearly visible vehicle, and
the enlarged-quarters setting matters (it found about a third more than a single look). From directly overhead it does not
work at all, because the model learned what cars look like from the side. Corner-mounted deck cameras would be the angled
case, but indoor light, columns and cars hiding each other were not tested. Time per image: about 6 s on a desktop
processor with enlarged quarters, 12 s with 3 x 3. The images are not in this repository (they are not ours to redistribute).

## Do the estimates hold?
| Measure | Value | Sample | Date |
|---|---|---|---|
| Later real count inside the range (target: about 9 in 10) | 9 of 9. The ranges were wide, so this is weak evidence that they are well sized | 9 bay pairs, 19-25 min apart | 2026-11-19 |
| Average miss of the middle estimate (spaces) | 0.8 | same 9 pairs | 2026-11-19 |
| Measured variability | 0.26 to 0.27. The page first assumed 0.8, far too wide. It is now set to 0.4, about 1.5 times the measured value, because the measurement covers one late-morning hour. With 0.4 the later count still fell inside the range in 10 of 10 cases, but that is a check on the same data the setting came from | 10 bay pairs | 2026-11-19 |

## Is the problem real?
| Measure | Value | Sample | Date |
|---|---|---|---|
| Students who spent over 5 minutes finding a space | 12 of 30. Among the 14 who arrived between 9 and 1: 9 of 14 | 30 students who drove that day, 27 of them parked in West Deck | 2026-11-19, 1:38-2:40 PM, asked in person near West Deck |
| Students who tried more than one level or lot | 16 of 30. Among those who arrived 9 to 1: 11 of 14 | same 30 | same |
| Students made late by parking this semester | 27 of 30 at least once; 18 of 30 several times | same 30 | same |
| Students who have given up on a deck and parked elsewhere this semester | 23 of 30 at least once; 11 several times | same 30 | same |
| Would check a page showing which level has room | 23 of 30 most times, 3 sometimes, 4 no | same 30 | same |
| Would tap one button after parking to tell the next driver | 20 yes, 8 maybe, 2 no | same 30 | same |
| Cars that entered a level and left without parking | | | |
| With level information beforehand, would have... | gone straight to that level: 20; picked a different deck or lot: 5; not sure: 3; nothing different: 2 | same 30 | same |

**Reading the poll:** 30 students Kell met near West Deck on one afternoon, answering from memory. It is not a sample of KSU students. "Would you" answers overstate what people actually do. Raw answers: `data/field/2026-11-19-student-poll.csv`.

## Second poll: answered by QR code (evening of Nov 19)
27 people scanned the survey code between 5:45 and 7:26 PM on 2026-11-19 while Kell was at the deck; 24 of them drove that day (12 parked in West Deck, 9 in another deck, 3 elsewhere). They answered on their own phones, unsupervised, so this group is kept separate from the 30 asked in person. One test answer by Claude (5:38 PM) is removed.

| Measure | QR group | In person (above) |
|---|---|---|
| Tried more than one level or lot | 15 of 24 drivers | 16 of 30 |
| Over 5 minutes to find a space | 8 of 24 drivers (2 said over 20) | 12 of 30 |
| Made late by parking this semester | 22 of 24 drivers at least once; 9 several times | 27 of 30; 18 several |
| Gave up on a deck this semester | 18 of 24 drivers at least once; 6 several times | 23 of 30; 11 several |
| With level information, would have gone straight to that level | 20 of 24 drivers (3 more: a different deck or lot) | 20 of 30 (5 more) |
| Would check a page showing which level has room | 22 of 27 most times, 3 sometimes, 2 no | 23 of 30, 3, 4 |
| Would tap one button after parking | 22 yes, 4 maybe, 1 no (of 27) | 20, 8, 2 |

Raw answers: `data/field/2026-11-19-student-poll-qr.csv`.

## App reviews from testers (evening of Nov 19)
9 people opened the app from the "Try the app" code and sent a review. This was the app as it stood between 5:45 and 7:30 PM, before the entrances, level tags, camera scan and Ask guide were added.

| Question | Answers (of 9) |
|---|---|
| Easy to use? | 7 yes, 2 sort of |
| Would you check it before driving in? | 7 yes, 2 maybe |
| Do you trust the numbers? | 5 yes, 4 somewhat |
| Most useful part | Levels 5, Now 3, 3D deck 1 |

Written suggestions (4): bay names by compass direction are hard to remember, and "closest to the stairs" would be easier (2 people); the 3D map needs a clearer sense of which way it faces; add a written-response option. Changes made in reply: a compass and level tags on the 3D deck, the exit to campus and the entrances drawn on it, and a landmark hint under the bay buttons. Nine self-selected testers is a first read, not a rating. Raw: `data/field/2026-11-19-app-reviews.csv`.

## What we could not measure
- Two independent observers: both passes were made by Kell (the second is labelled Observer B in the log to tell the passes apart; confirm).
- How long a pass takes on foot: both passes were made on a skateboard.
- How fast bays fill earlier in the morning, when the deck is still filling: both passes were after 11:15.
- The circling tally was not run: with open stalls on every level there was little to count.
