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

## App reviews (the "Rate Park.AI" screen)
Every visitor who is not signed in as a monitor or the owner is asked to rate the app. The screen opens by itself after a check-in or a report, when the person returns to the tab, when the pointer leaves the top of a desktop window, and after two minutes of use (75 seconds from the "Try the app" QR code). A web page cannot block being closed, so "Not now" hides it for a minute and it returns until it is sent once.

What is sent, once, to the write-only `poll` list with `kind: "app-review"`, `v: 2` and a time:

| Sent | What it is |
|---|---|
| Thirteen one-tap answers | Who you are (commuter, resident, staff, visitor), days a week you park, where you park most, usual minutes to find a space, times late this semester, and eight answers about the app |
| An optional suggestion | Up to 300 characters. The form asks for no names; free text is still free text, so read it before quoting it |
| What the visit did | Seconds in the app, which screens were opened, how many times a trip was started, a bay was checked into, a report was made and the guide was opened, and whether the visit came from the "Try the app" QR code |

No name, device id, address or location is sent, and nothing is sent unless the person presses Send. The screen says what is sent before the first question. The answers are self-reported and the people who answer chose to; treat them as a survey of app users, not of all KSU drivers.

## Live camera scan
The Count screen can open the phone's camera. Frames are read into memory, measured by the model on the phone, and dropped: no video or photo is recorded, saved or uploaded, and the camera is switched off as soon as a view is captured or the count is closed. A camera view of a deck still contains plates and possibly people while it is on screen, so point it at parked rows, not at people.

## Monitor accounts (only when sign-in is switched on)
A monitor signs in with an email and password held by Firebase Authentication. The password is sent to Google's sign-in service and never stored by this app. The phone keeps the account's id and tokens so the monitor stays signed in; "Lock again" removes them. Each saved count's history entry carries the monitor's account id (`by`), so a wrong count can be traced to an account. Students never have accounts and their reports carry no id.

