# The pitch (5 minutes), word for word

Read it aloud twice with a timer. Every number is from `docs/RESULTS.md`. Say "drivers I polled", never "KSU students" or a percentage of campus.

## The shape
A morning every driver knows, the numbers that prove it, one plain sentence, then **one continuous story on the phone for half the time**, then the relief, who keeps it alive, the plan, and you. The slides are numbers and a few words. You carry the story.

## 0:00 The morning (slide 1) · 25 seconds
"Raise your hand if parking has ever made you late to class." *(wait for the hands)*
"It's 11:50. You have class at 12:15. Level 1: nothing. Level 2: nothing. You walk in at 12:16. Late. Again."
*[Your own line: what that walk into class feels like.]*
"I'm Kell, and this is Park.AI."

## 0:25 The numbers (slide 2) · 25 seconds
"Ninety-one percent of the drivers I polled have lived that morning. Half of them, several times this semester. Three in four have given up on a deck completely.
And it is not only students. Staff told me the same thing: late to work, then sent to a far lot they did not pay for."

## 0:50 The twist (slide 3) · 20 seconds
"Here is what nobody expects. That Thursday at 11:50, the deck was not full. Seventy student spaces were open. Fifty-seven of them sat in three bays. And Level 1 has 181 stalls with zero for students. The deck was not full. The information was missing."

## 1:10 The solution (slide 4) · 20 seconds
"Park.AI tells you where the room is before you drive in. And the AI does the counting: a parking monitor points a phone down a row, and a vehicle-detection model on that phone counts every car. No plates. Nothing recorded. Let me show you."

## 1:30 Demo: one story, in order (slide 5, then the phone) · 2 minutes
Follow `DEMO-SCRIPT.md`. The moment that must land is the camera putting a box on each car. Stop talking for two seconds when it happens.

## 3:30 The relief (slide 6) · 25 seconds
"Now picture that same morning again. 11:50. Class at 12:15. Level 2, west bay: 22 open. You already knew.
Seventy-eight percent of the drivers I asked said they would check first. Seventy-four percent would drive straight to that level."

## 3:55 Who keeps it alive (slide 7) · 25 seconds
"I will push for the deck's own cameras, and that needs KSU's approval. Until then, it runs on the people who use the deck every day. Students, with one tap: 72 percent said they would. Monitors, who already patrol it, with the AI camera filling the gaps. And the plate truck that already drives through six or seven times a day. The more people use it, the fresher it gets."

## 4:20 Plan and limits (slide 8) · 20 seconds
"I'll be straight about the limits. One deck, one morning, one counter, and no agreement with KSU yet. The pilot is two weeks at West Deck. Then every deck on both campuses."

## 4:40 Close (slide 9) · 20 seconds
"I park in West Deck. I counted every one of its 662 stalls and polled 54 drivers to build this. Whether you make it to class should not depend on a guess. Park.AI. Scan the code and try it now. Thank you."

## Rubric map (AI Club track, 100 points)
| Criterion | Points | Where the pitch earns it |
|---|---|---|
| Campus impact | 25 | Slides 2 and 3 (54 drivers polled, the real count, staff) and slide 6 |
| Use of AI | 25 | Slide 4, the demo and slide 7: the detection model counts live in the camera; the estimator and ranking run between counts; the deck cameras are next |
| Feasibility | 20 | Slide 7 (students, monitors and the truck already there; no hardware) and slide 8 (pilot, limits) |
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
