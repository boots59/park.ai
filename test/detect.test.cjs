// Run: node test/detect.test.cjs   (the maths around the detection model; no model needed)
const assert = require('node:assert/strict');
const d = require('../src/detect.js');
let pass = 0; const test = (name, fn) => { fn(); pass++; console.log('ok -', name); };

// Build a fake model output: 8400 rows x 85 numbers for a 640 input, all zero,
// then switch on chosen grid cells. Row order is stride 8, then 16, then 32.
function fakeOutput(cells) {
  const data = new Float32Array(8400 * 85);
  for (const { stride, gx, gy, w, h, obj, cls, score } of cells) {
    const before = { 8: 0, 16: 6400, 32: 8000 }[stride], side = 640 / stride;
    const p = (before + gy * side + gx) * 85;
    data[p] = 0.5; data[p + 1] = 0.5;                       // box centre: middle of the cell
    data[p + 2] = Math.log(w / stride); data[p + 3] = Math.log(h / stride);
    data[p + 4] = obj; data[p + 5 + cls] = score;
  }
  return data;
}

test('letterbox keeps aspect ratio', () => {
  assert.deepEqual(d.letterbox(1280, 960, 640), { scale: 0.5, w: 640, h: 480 });
  assert.deepEqual(d.letterbox(600, 1200, 640), { scale: 640 / 1200, w: 320, h: 640 });
});
test('toTensor is BGR, channel-first, padded with grey', () => {
  const t = d.toTensor(new Uint8ClampedArray([10, 20, 30, 255]), 1, 1, 2); // one RGBA pixel into a 2x2 input
  assert.deepEqual([...t], [30, 114, 114, 114, 20, 114, 114, 114, 10, 114, 114, 114]);
});
test('decode maps a grid cell back to original-image pixels', () => {
  const out = fakeOutput([{ stride: 16, gx: 10, gy: 5, w: 64, h: 32, obj: 0.9, cls: 2, score: 0.9 }]);
  const [det] = d.decode(out, 640, 0.5); // photo was twice the model's size
  assert.equal(det.label, 'car');
  assert.ok(Math.abs(det.score - 0.81) < 1e-6);
  const near = (a, b) => Math.abs(a - b) < 1e-3;
  assert.ok(near(det.x, (168 - 32) / 0.5) && near(det.y, (88 - 16) / 0.5) && near(det.w, 128) && near(det.h, 64));
});
test('only confident vehicles are kept', () => {
  const out = fakeOutput([
    { stride: 8, gx: 1, gy: 1, w: 40, h: 40, obj: 0.9, cls: 0, score: 0.95 },   // a person: ignored
    { stride: 8, gx: 30, gy: 30, w: 40, h: 40, obj: 0.9, cls: 3, score: 0.95 }, // a motorcycle: ignored
    { stride: 8, gx: 50, gy: 50, w: 40, h: 40, obj: 0.5, cls: 2, score: 0.5 },  // a car at 0.25: too unsure
    { stride: 32, gx: 3, gy: 3, w: 200, h: 120, obj: 0.8, cls: 7, score: 0.7 }, // a truck: kept
  ]);
  assert.deepEqual(d.vehicles(out, 640, 1).map(v => v.label), ['truck']);
});
test('overlapping boxes on one vehicle count once, even across classes', () => {
  const out = fakeOutput([
    { stride: 16, gx: 10, gy: 10, w: 100, h: 60, obj: 0.9, cls: 2, score: 0.9 },  // car
    { stride: 16, gx: 10, gy: 10, w: 104, h: 62, obj: 0.9, cls: 7, score: 0.6 },  // same pickup seen as truck
    { stride: 16, gx: 30, gy: 10, w: 100, h: 60, obj: 0.9, cls: 2, score: 0.8 },  // a different car
  ]);
  const v = d.vehicles(out, 640, 1);
  assert.equal(v.length, 2); assert.equal(v[0].label, 'car');
});
test('iou basics', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  assert.equal(d.iou(a, a), 1);
  assert.equal(d.iou(a, { x: 20, y: 20, w: 5, h: 5 }), 0);
  assert.ok(Math.abs(d.iou(a, { x: 5, y: 0, w: 10, h: 10 }) - 1 / 3) < 1e-9);
});
test('wrong-sized model output is rejected', () => assert.throws(() => d.vehicles(new Float32Array(100), 640, 1), /Unexpected/));
console.log(`\n${pass} detection tests passed.`);
