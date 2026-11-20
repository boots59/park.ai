# The pitch (5 minutes), word for word

Read it aloud twice with a timer. Every number is from `docs/RESULTS.md`. Say "drivers I polled", never "KSU students" or a percentage of campus.

## 0:00 Hook (slide 1) · 15 seconds
"Yesterday at 11:50 in the morning, West Deck had 70 open student spaces. Fifty-seven of them were in three bays. Nothing told a single driver which three. I'm Kell, and this is Park.AI."

## 0:15 Problem (slide 2) · 40 seconds
"I polled 54 drivers at the deck. Thirty-one had already tried more than one level or lot that day. Forty-nine said parking has made them late to class this semester.
KSU's own advice, when a deck is full, is to drive to the Shuttle Lot and take the bus. And Level 1 of West Deck has no regular student spaces at all. I counted: 181 stalls, zero for students."

## 0:55 Insight (slide 3) · 30 seconds
"The usual fixes are entrance counters, about twenty thousand dollars a lane, or new cameras, which need Public Safety approval. But parking operations told me a truck already scans every plate in West Deck six or seven times a day, and monitors walk it on weekdays. The sensors are already in the deck. Nobody is counting with them."

## 1:25 How it works (slide 4) · 35 seconds
"So a monitor points a phone at a row. A detection model, running on the phone, counts every vehicle it sees. The monitor checks the number and saves it. A student who just parked adds one tap. And every driver sees where to try first, with an honest range when the count gets old, and the age of the count always on screen. No plates. No faces. Nothing recorded."

## 2:00 Demo (slide 5, then the phone) · 1 minute 45 seconds
Follow `DEMO-SCRIPT.md`. The one moment that must land: the camera boxes the cars and the number appears. Pause there for two seconds and say nothing.

## 3:45 Evidence (slide 6) · 30 seconds
"This is measured, not imagined. Six hundred sixty-two stalls counted on foot. Two full passes of the deck. Counts that were twenty to thirty minutes old still held: nine of nine recounts landed inside the range the app predicted. And nine students tried the app: seven found it easy, seven said they would check it before driving in."

## 4:15 Plan and limits (slide 7) · 30 seconds
"It is one deck, one morning, one counter, and I have no agreement with KSU. Parking operations met with me and offered more data after approvals. The pilot is two weeks at West Deck: one number per truck pass. After that, the same model on the deck's own cameras, with approval, and then every deck on both campuses."

## 4:45 Close (slide 8) · 15 seconds
"Less circling. More certainty. Scan the code and try it on your phone right now. Thank you."

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
