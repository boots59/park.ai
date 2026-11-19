// CarCounter: runs the vehicle-detection model in the browser, on the device.
// The photo is decoded, measured and thrown away here: nothing is stored or
// sent anywhere. The model and its runtime load only when first needed, from
// the ai/ folder next to the page, so the rest of the page works without them.
(() => {
  const SIZE = 640;                 // the model's input is 640 x 640
  const BASE = 'ai/';               // folder beside the page (see scripts/build.cjs)
  const MODEL = 'yolox_s.onnx';     // YOLOX-s, Apache-2.0, trained on COCO
  let loading = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve;
      s.onerror = () => reject(Error('The AI files are not next to this page. Count by eye instead.'));
      document.head.appendChild(s);
    });
  }

  function ready() {
    loading ??= (async () => {
      if (location.protocol === 'file:')
        throw Error('AI count needs the hosted version of this page; a page opened from a file cannot load the model. Count by eye instead.');
      await loadScript(BASE + 'ort.wasm.min.js');
      ort.env.wasm.wasmPaths = new URL(BASE, location.href).href;
      ort.env.wasm.numThreads = 1; // one thread works on every host and phone
      return ort.InferenceSession.create(BASE + MODEL, { executionProviders: ['wasm'] });
    })().catch(e => { loading = null; throw e; }); // allow a retry after a failure
    return loading;
  }

  async function decodeImage(file) {
    if (typeof createImageBitmap === 'function') return createImageBitmap(file);
    const img = new Image(); img.src = URL.createObjectURL(file);
    await img.decode(); URL.revokeObjectURL(img.src); return img;
  }

  // Count vehicles in one photo. If `canvas` is given, draw the photo there
  // with a numbered box on each vehicle so a person can check the result.
  async function count(file, canvas) {
    const session = await ready();
    const img = await decodeImage(file), W = img.width, H = img.height;
    const small = document.createElement('canvas'), g = small.getContext('2d', { willReadFrequently: true });
    const t0 = performance.now(), found = [];
    // Look at the whole photo, then at enlarged overlapping quarters (see CarDetect.regions).
    for (const r of CarDetect.regions(W, H)) {
      const box = CarDetect.letterbox(r.w, r.h, SIZE);
      small.width = box.w; small.height = box.h;
      g.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, box.w, box.h);
      const input = CarDetect.toTensor(g.getImageData(0, 0, box.w, box.h).data, box.w, box.h, SIZE);
      const out = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]) });
      for (const d of CarDetect.vehicles(out[session.outputNames[0]].data, SIZE, box.scale)) found.push({ ...d, x: d.x + r.x, y: d.y + r.y });
    }
    const dets = CarDetect.merge(found), ms = Math.round(performance.now() - t0);
    if (canvas) show(canvas, img, W, H, dets);
    if (img.close) img.close();
    return { count: dets.length, ms };
  }

  // The latest photo is kept (in memory only) so its boxes can be tapped.
  let last = null; // { base: canvas with the photo, dets: boxes in preview pixels, out: Set of left-out box numbers }
  function show(canvas, img, W, H, dets) {
    const k = Math.min(1, 1280 / W); // cap the preview size
    const base = document.createElement('canvas'); base.width = Math.round(W * k); base.height = Math.round(H * k);
    base.getContext('2d').drawImage(img, 0, 0, base.width, base.height);
    last = { base, dets: dets.map(d => ({ x: d.x * k, y: d.y * k, w: d.w * k, h: d.h * k })), out: new Set() };
    paint(canvas);
  }
  function paint(canvas) {
    canvas.width = last.base.width; canvas.height = last.base.height;
    const c = canvas.getContext('2d'); c.drawImage(last.base, 0, 0);
    const px = Math.max(14, Math.round(canvas.width / 45));
    c.font = `bold ${px}px sans-serif`; c.textBaseline = 'top';
    last.dets.forEach((d, i) => {
      const out = last.out.has(i), label = out ? '✕' : String(i + 1), tw = c.measureText(label).width + 6;
      c.lineWidth = Math.max(2, px / 6); c.setLineDash(out ? [px / 2, px / 3] : []);
      c.strokeStyle = out ? '#ff6b57' : '#00e0ff'; c.strokeRect(d.x, d.y, d.w, d.h); c.setLineDash([]);
      c.fillStyle = out ? '#7a1f14' : '#003a44'; c.fillRect(d.x, d.y, tw, px + 4);
      c.fillStyle = '#ffffff'; c.fillText(label, d.x + 3, d.y + 2);
    });
  }
  // A tap on the preview: leave out (or put back) the box under the finger.
  // Returns how many boxes are now left out, or null if the tap hit no box.
  function toggle(canvas, clientX, clientY) {
    if (!last) return null;
    const r = canvas.getBoundingClientRect(), x = (clientX - r.left) * canvas.width / r.width, y = (clientY - r.top) * canvas.height / r.height;
    const pad = Math.max(6, canvas.width / 80); // small boxes are hard to hit
    const hits = last.dets.map((d, i) => ({ i, area: d.w * d.h, d })).filter(h => x >= h.d.x - pad && x <= h.d.x + h.d.w + pad && y >= h.d.y - pad && y <= h.d.y + h.d.h + pad);
    if (!hits.length) return null;
    const i = hits.sort((a, b) => a.area - b.area)[0].i; // the smallest box under the tap
    last.out.has(i) ? last.out.delete(i) : last.out.add(i);
    paint(canvas); return last.out.size;
  }
  function forget() { last = null; }

  window.CarCounter = { count, toggle, forget };
})();
