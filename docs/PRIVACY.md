# Privacy: what this app handles, and what it does not

A KSU staff member told Kell (2026-11-19) that privacy is the reason KSU has no app like this. Which concern they meant
was not established. This page states plainly what the prototype does, so the question can be answered with facts.

## What the app publishes
Counts per bay: a number or a range, a time, and where it came from (staff count, estimate, student report). Nothing about
any vehicle or person.

## What is never collected
License plates, faces, names, student IDs, emails, accounts, GPS location, enforcement or permit records.

## Where care is still needed

| Part | What happens | Remaining risk | What reduces it |
|---|---|---|---|
| Staff tally | A number per bay | None personal | - |
| Student report | Bay, one of four answers, a time. No account | With sharing on, the database provider (Google Firebase) sees the sender's internet address, like any website. A report shows that *someone* parked or left at a time, never who | No sign-in, no identifier stored with a report |
| "You parked in..." reminder | Kept on the student's own phone only | Anyone holding the unlocked phone can see it | It is not sent anywhere; clearing site data removes it |
| Camera AI test | A phone photo is analysed on the phone and discarded by the app | A photo of a deck contains plates and possibly people while it is on screen; the phone's own camera settings may keep a copy | Optional and off the main flow; processed on the device; nothing uploaded. Frame photos so plates and faces are not readable |
| Website hosting | GitHub serves the page | GitHub logs visitors' internet addresses, like any host | No analytics or trackers in the page |
| Field kit poll | Tap answers, no names | The free-text staff note could contain a name if the collector types one | The form says not to |

## The two ideas that carry real privacy weight (not built)
1. **Plate-scan counts from KSU's truck.** The design asks only for a count per level per pass. Plate numbers stay inside
   KSU's own system and never reach the app. KSU would need to be satisfied that even counts are acceptable to share.
2. **The deck's cameras.** Only acceptable as: software produces a count, no person views the images, nothing but the
   count leaves the camera system, and Public Safety approves under the video standard. Showing images or live views to
   students is ruled out.

## Honest summary
The prototype collects no personal information by design, but "no privacy concerns at all" would be an overstatement.
The photo test and any future use of cameras or plate scans need KSU's review.
