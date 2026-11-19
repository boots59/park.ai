// Settings: every number and label you might want to tune, in one place.
// All values are ILLUSTRATIVE until the field study replaces them; record the
// evidence for any change in docs/EVIDENCE.md.
const Settings = {
  // --- Survey and display ---
  freshMinutes: 5,        // a count younger than this is shown exactly as counted
  horizonMinutes: 30,     // a count older than this is "unknown"; in between it is an estimate
  maxSurveyMinutes: 20,   // a survey left open longer than this is rejected
  maxCount: 999,          // largest count a person can enter

  // --- Estimate between counts (see estimate() in src/model.js) ---
  variability: 0.8,       // how unpredictable a bay is, in spaces per square-root-minute
  rangeZ: 1.64,           // range width in spreads: 1.64 aims to hold the truth about 9 times in 10
  trendMinGapMinutes: 3,  // two counts closer together than this are noise, not a trend
  trendMaxGapMinutes: 30, // two counts further apart than this say nothing about now

  // --- Deck verdict, in open spaces ---
  roomAt: 10,             // "Room likely" when at least this many spaces at the low end
  fullAt: 5,              // "Likely full" when every bay is known and at most this many at the high end

  // --- One bay, in open spaces (3D colours and the "best bet") ---
  bayRoomAt: 5,           // a bay is "room" (green) with at least this many spaces at the low end; fewer is "few" (amber)

  // --- What is being counted ---
  category: 'Example general permit (illustrative)',

  // --- AI vehicle count ---
  detectMinScore: 0.3,    // ignore detections the model is less sure of than this (0 to 1)
  detectMaxOverlap: 0.45, // boxes overlapping more than this are treated as the same vehicle
};
if (typeof module !== 'undefined') module.exports = Settings;
