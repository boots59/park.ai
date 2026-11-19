# Field day protocol (Thursday, peak hours)

Goal: replace guesses with numbers you measured. Bring a phone, a notebook, and a second counter if you can.
Rules: count spaces and vehicles only. No photos of people. Photos of cars stay on your phone and are never
uploaded or added to the repo (they contain license plates). Stay out of traffic lanes; never count while driving.

## A. Ground truth (early, 20 min)
| What | Why | Your number |
|---|---|---|
| Number of levels | The 3D model guesses 3; the lidar allows up to 5 | |
| Entrances and exits (lanes, one-way?) | Needed for any future entry/exit counting | |
| Stalls in ONE bay, counted on foot (say which bay) | Checks the model's figure (West bays: 79) | |
| Restricted stalls in that bay (ADA, visitor, reserved, EV) | They are not "open to everyone" | |

## B. Peak-hour measurements (10:30 AM to 1:30 PM)
Open the staff survey in the app. Use "Clear observations" first so sample data is gone. Every completed
survey is saved to the field log with real times.

1. **How fast counts go stale (30 min). The most important measurement.** Pick one bay. Survey it every 3 minutes,
   10 times. The field log then scores the page's estimates against your later counts automatically
   ("Estimate check" under Field log). If you can, repeat in a second bay.
2. **Do two counters agree? (6 to 9 bays).** You as Observer A, a second person as Observer B, same bay, within
   5 minutes, without sharing numbers. If you count alone, count each bay twice and write "same observer" in
   your notes: that measures consistency, not independence.
3. **AI count (as many sections as you can, aim for 15+ photos).** In a survey, tap "Photograph a section".
   Check the numbered boxes against what you see and correct the number. The log keeps the model's number
   beside yours. Try different spots: down the aisle, across the rows, the open top deck, a dim corner.
4. **Circling (15 min).** Stand safely where you can see one level's entry. Tally: cars entering the level,
   and cars leaving it without having parked. The ratio is direct evidence of circling.
5. **Student poll (15 to 20 people, 1 minute each, no names).**
   - How many minutes did you spend finding a space today? (0-2, 3-5, 6-10, 11-20, 20+)
   - Which deck or lot?
   - If you had known which level had room before you entered, would you have gone somewhere else? (yes, no, not sure)

## C. Afterwards
Staff survey tab -> "Export field log (CSV)". Send the CSV, your section A table, the circling tally and the
poll tallies. Do not send the photos.

## What each number becomes in the pitch
| Measurement | Rubric line | Sentence it supports |
|---|---|---|
| Poll, circling tally | Campus impact (25) | "N of M students spent over 5 minutes; X of Y cars left a level without parking." |
| AI vs. person per photo | Use of AI (25) | "The model matched a person within ±k vehicles on N photos; it missed mostly ___." |
| Survey duration, decay rate, observer agreement | Feasibility (20) | "A bay takes N seconds; counts stay useful for about M minutes." |
