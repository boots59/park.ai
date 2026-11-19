# Pitch outline (5 minutes)

Fill each `[ ]` from `docs/RESULTS.md`. If a number was not measured, cut the sentence; do not estimate it.

## 0:00-1:00 Problem
- Parking is the first problem on the hackathon's own list: "circling the deck for an open spot".
- KSU says Tuesdays and Thursdays peak 11 a.m. to 3 p.m.
- What I measured on Thursday: `[N of M]` students spent over 5 minutes; `[X of Y]` cars entered a level and left without parking.
- Counting cameras cost money and need approvals. Entrance counters run about $20,000 per lane (Walter P Moore).

## 1:00-2:00 Solution
- Parking monitors already walk the deck on foot. Their phone becomes the sensor.
- AI counts vehicles from a photo; the monitor confirms. Between counts, the page shows an honest range, not a stale number.
- Students get one answer before they drive in: Room likely, Tight, or Likely full.

## 2:00-4:00 Demo
See [DEMO-SCRIPT.md](DEMO-SCRIPT.md).

## 4:00-5:00 How it works and what is next
- The AI: an open-source detection model running on the phone; it matched a person within `[±k]` vehicles on `[N]` photos.
- The estimates: the real count fell inside the range `[A of B]` times.
- Honest limits: one deck, one day of data, simulated display, no KSU agreement yet.
- Next: KSU's real stall numbers; a two-week pilot with monitors; and the question of whether monitors' scanners already
  log enough to count cars with no extra work. KSU's reply so far: `[ ]`.

## Rubric map (AI Club track, 100 points)
| Criterion | Points | Where the pitch earns it |
|---|---|---|
| Campus impact | 25 | Thursday's poll and circling tally |
| Use of AI | 25 | On-device vehicle count, measured against a person; estimates checked against real counts |
| Feasibility | 20 | No hardware, existing foot patrols, cost comparison, pilot plan |
| Creativity | 15 | A range instead of a stale number; the confirm step doubles as the accuracy test |
| Pitch | 15 | One story, one demo, under 5 minutes |

## Likely questions
| Question | Answer |
|---|---|
| Is this real-time? | No. It is counts by people, plus estimates that say how old they are. |
| Why not cameras? | KSU's video standard routes cameras through Public Safety; this needs none. The same model could run on approved cameras later. |
| How accurate is the AI? | `[measured figure]`, on `[N]` photos. A person confirms every count. |
| Has KSU agreed? | No. `[State exactly what KSU has or has not said.]` |
| What did you build yourself? | See `docs/CONTRIBUTIONS.md`: the idea, the decisions, the field data; AI assistants wrote code under my direction. |
