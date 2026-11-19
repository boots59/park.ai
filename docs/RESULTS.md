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

## Do the estimates hold?
| Measure | Value | Sample | Date |
|---|---|---|---|
| Later real count inside the range (target: about 9 in 10) | 9 of 9. The ranges were wide, so this is weak evidence that they are well sized | 9 bay pairs, 19-25 min apart | 2026-11-19 |
| Average miss of the middle estimate (spaces) | 0.8 | same 9 pairs | 2026-11-19 |
| Measured variability (the page assumes 0.8) | 0.26: bays changed about a third as fast as assumed, at this hour on this day. The setting has not been changed on one morning's data | 10 bay pairs | 2026-11-19 |

## Is the problem real?
| Measure | Value | Sample | Date |
|---|---|---|---|
| Students who spent over 5 minutes finding a space | | | |
| Students who tried more than one level or lot | | | |
| Students made late by parking this semester | | | |
| Cars that entered a level and left without parking | | | |
| Students who would have gone elsewhere with level information | | | |

## What we could not measure
- Two independent observers: both passes were made by Kell (the second is labelled Observer B in the log to tell the passes apart; confirm).
- How long a pass takes on foot: both passes were made on a skateboard.
- How fast bays fill earlier in the morning, when the deck is still filling: both passes were after 11:15.
- The circling tally was not run: with open stalls on every level there was little to count.
