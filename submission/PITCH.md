# The pitch (5 minutes), word for word

Read it aloud twice with a timer. Every number is from `docs/RESULTS.md`. Say "drivers I polled", never "KSU students" or a percentage of campus.

## The shape (from the three videos you sent)
A question, the evidence, the cost, one plain sentence, then **one continuous story on the phone for half the time**, then before and after, the plan, and you. Slides are short; the app carries it. Show three things, not ten: the camera count, where to try first, the one-tap report.

## 0:00 Question (slide 1) · 20 seconds
"Raise your hand if parking has ever made you late to class." *(wait for the hands)*
"It's 11:50 on a Thursday. You have class at 12:15. You pull into West Deck. Which level do you try? I'm Kell, and this is Park.AI."

## 0:20 Evidence (slide 2) · 20 seconds
"It's not just this room. I polled 54 drivers at the deck. Forty-nine said parking has made them late this semester. Thirty-one had already tried more than one level or lot that day."

## 0:40 Cost (slide 3) · 20 seconds
"Here is the part that surprised me. At 11:50 that Thursday the deck was not full. Seventy student spaces were open. Fifty-seven of them were in three bays, and nothing told anyone which three. And Level 1 has 181 stalls with none for students."

## 1:00 Solution (slide 4) · 15 seconds
"Park.AI tells you which part of the deck has room before you drive in. And a phone camera does the counting. Let me show you."

## 1:15 Demo: one story, in order (slide 5, then the phone) · 2 minutes 30 seconds
Follow `DEMO-SCRIPT.md`. It is the 11:50 Thursday story, start to finish. The moment that must land is the camera putting a box on each car. Stop talking for two seconds when it happens.

## 3:45 Before and after (slide 6) · 25 seconds
"Before Park.AI: 49 of the 54 drivers I polled have been late to class because of parking. Twenty of them took six minutes or more to park that day, and five took more than ten.
With Park.AI, you know which bay to try before you leave, and you get a heads-up before you drive into a full deck. Forty of the 54 told me they would have gone straight to that level. For a driver who spent ten or twenty minutes searching, that could be the difference between walking in late and walking in early."

**Say "could", not "saves".** Nobody has parked using the app yet, and 34 of the 54 parked in five minutes or less. If asked for the measured saving: "Not measured yet. That is exactly what the two-week pilot measures."

## 4:10 Plan and limits (slide 7) · 30 seconds
"I'll be straight about the limits. One deck, one morning, one counter, and no agreement with KSU. But KSU already sends a plate-scanning truck through this deck six or seven times a day. The pilot is two weeks: one number per pass. After that, the same model on the deck's own cameras, with Public Safety's approval, and then every deck on both campuses."

## 4:40 Close (slide 8) · 20 seconds
"I park in West Deck. I counted every stall, polled 54 drivers and sat down with parking operations to build this. Less circling. More certainty. Scan the code and try it now. Thank you."

## In the Q&A
Listen to the whole question. Never argue. If something is not built, say "not yet, here is what is next". Bring every answer back to a strength: real counts, the camera count, the 54 drivers.

## Rubric map (AI Club track, 100 points)
| Criterion | Points | Where the pitch earns it |
|---|---|---|
| Campus impact | 25 | Slide 2 (54 drivers polled) and slide 6 (662 stalls, two passes) |
| Use of AI | 25 | Slide 4 and the demo: the detection model counts live in the camera; the estimator and ranking run between counts |
| Feasibility | 20 | Slide 3 (existing truck and monitors, no hardware) and slide 7 (pilot, limits) |
| Creativity | 15 | "The sensors are already in the deck"; a range and an age instead of a stale number |
| Pitch | 15 | One story, one demo, a hook in the first sentence, under 5 minutes |

## Likely questions
| Question | Answer |
|---|---|
| Is this real-time? | No. It is counts by people and a camera scan, plus estimates that say how old they are. An old count stays on screen with its age and is never shown as live. |
| Where exactly is the AI? | A vehicle-detection model (YOLOX, open source) runs on the phone and counts cars in the camera view. A statistical model estimates each bay between counts and ranks where to try first. The Ask guide is word matching, not a language model. |
| How accurate is the AI? | In the deck I have 2 photos, both matched my hand count: too few to claim a number. On public images from angled cameras it found nearly every car; from straight overhead almost none. A person confirms every count. |
| Why not just use the deck cameras? | That is the plan, with Public Safety and facilities approval, which I do not have. The same model would run on those feeds. |
| What about privacy? | No plates, faces, names or location are collected. Camera frames are measured on the phone and dropped. The app needs how many cars, never which cars. |
| Has KSU agreed to anything? | No. Parking operations met with me and offered more data after approvals. Nothing is signed. |
| What stops fake student reports? | They are lower trust: a fresh staff count always wins, one phone can report a bay once every 5 minutes, and a report expires after 10. |
| What did you build yourself? | The idea, the decisions, all the field data and the survey work. AI assistants wrote the code under my direction; `docs/CONTRIBUTIONS.md` lists who did what. The 3D model was built by a friend, credited on the last slide. |
| What would you do with one more week? | Count on five more days, measure the camera scan on 50 photos, and run the two-week pilot. |
