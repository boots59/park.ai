// CarDetect: the maths around the vehicle-detection model (YOLOX, Apache-2.0).
// Pure functions only: no DOM, no model runtime. src/ai.js feeds these with
// pixels and model output in the browser; test/detect.test.cjs checks them.
const CarDetect = (() => {
  // COCO class ids the model knows. Pickups and SUVs are often labelled
  // "truck", so both count as a parked vehicle. Motorcycles are left out
  // because motorcycle spaces are not part of the survey count.
  const VEHICLE_CLASSES = { 2: 'car', 5: 'bus', 7: 'truck' };
  const STRIDES = [8, 16, 32];
  const PAD = 114; // grey value YOLOX pads with

  // YOLOX "letterbox": shrink to fit a size x size square, keep the aspect
  // ratio, anchor top-left and pad the rest.
  function letterbox(width, height, size) {
    const scale = Math.min(size / width, size / height);
    return { scale, w: Math.round(width * scale), h: Math.round(height * scale) };
  }

  // RGBA pixels of the already-resized image (w x h) -> the model's input:
  // a size x size, 3-channel, channel-first Float32Array in B,G,R order,
  // values 0-255 (this YOLOX export does no normalising).
  function toTensor(rgba, w, h, size) {
    const plane = size * size, out = new Float32Array(3 * plane).fill(PAD);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, o = y * size + x;
      out[o] = rgba[i + 2]; out[plane + o] = rgba[i + 1]; out[2 * plane + o] = rgba[i];
    }
    return out;
  }

  // The model outputs one row per grid cell: [cx, cy, w, h, objectness, 80
  // class scores], with the box still relative to its cell. Turn rows into
  // boxes in ORIGINAL image pixels, keeping only confident vehicles.
  function decode(data, size, scale, { minScore = 0.3 } = {}) {
    const cols = 85, dets = [];
    let row = 0;
    for (const stride of STRIDES) {
      const cells = size / stride;
      for (let gy = 0; gy < cells; gy++) for (let gx = 0; gx < cells; gx++, row++) {
        const p = row * cols, obj = data[p + 4];
        if (obj < minScore) continue; // cheap early exit: score <= objectness
        let best = 0, cls = -1;
        for (const c in VEHICLE_CLASSES) { const s = data[p + 5 + +c]; if (s > best) { best = s; cls = +c; } }
        const score = obj * best;
        if (score < minScore) continue;
        const cx = (data[p] + gx) * stride, cy = (data[p + 1] + gy) * stride;
        const w = Math.exp(data[p + 2]) * stride, h = Math.exp(data[p + 3]) * stride;
        dets.push({ x: (cx - w / 2) / scale, y: (cy - h / 2) / scale, w: w / scale, h: h / scale, score, label: VEHICLE_CLASSES[cls] });
      }
    }
    return dets;
  }

  function iou(a, b) {
    const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    return inter / (a.w * a.h + b.w * b.h - inter || 1);
  }

  // Non-maximum suppression: the model proposes several boxes per vehicle.
  // Keep the most confident and drop others that overlap it. Done across
  // classes, so one pickup seen as both "car" and "truck" counts once.
  function nms(dets, maxIou = 0.45) {
    const kept = [];
    for (const d of [...dets].sort((a, b) => b.score - a.score))
      if (kept.every(k => iou(k, d) <= maxIou)) kept.push(d);
    return kept;
  }

  // Whole pipeline after the model has run.
  function vehicles(data, size, scale, opts = {}) {
    if (data.length % 85 !== 0) throw Error('Unexpected model output size.');
    return nms(decode(data, size, scale, opts), opts.maxIou);
  }

  return { letterbox, toTensor, decode, iou, nms, vehicles, VEHICLE_CLASSES, STRIDES, PAD };
})();
if (typeof module !== 'undefined') module.exports = CarDetect;
