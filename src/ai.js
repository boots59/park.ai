// CarCounter: runs the vehicle-detection model in the browser, on the device.
// The photo is decoded, measured and thrown away here: nothing is stored or
// sent anywhere. The model and its runtime load only when first needed, from
// the ai/ folder next to the page, so the rest of the page works without them.
(() => {
  const SIZE = 640;                 // the model's input is 640 x 640
  const BASE = 'ai/';               // folder beside the page (see build.cjs)
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
    const box = CarDetect.letterbox(W, H, SIZE);
    const small = document.createElement('canvas'); small.width = box.w; small.height = box.h;
    const g = small.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, box.w, box.h);
    const input = CarDetect.toTensor(g.getImageData(0, 0, box.w, box.h).data, box.w, box.h, SIZE);
    const t0 = performance.now();
    const out = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]) });
    const ms = Math.round(performance.now() - t0);
    const dets = CarDetect.vehicles(out[session.outputNames[0]].data, SIZE, box.scale);
    if (canvas) draw(canvas, img, W, H, dets);
    if (img.close) img.close();
    return { count: dets.length, ms };
  }

  function draw(canvas, img, W, H, dets) {
    const k = Math.min(1, 1280 / W); // cap the preview size
    canvas.width = Math.round(W * k); canvas.height = Math.round(H * k);
    const c = canvas.getContext('2d');
    c.drawImage(img, 0, 0, canvas.width, canvas.height);
    const px = Math.max(14, Math.round(canvas.width / 45));
    c.lineWidth = Math.max(2, px / 6); c.font = `bold ${px}px sans-serif`; c.textBaseline = 'top';
    dets.forEach((d, i) => {
      c.strokeStyle = '#00e0ff'; c.strokeRect(d.x * k, d.y * k, d.w * k, d.h * k);
      const label = String(i + 1), tw = c.measureText(label).width + 6;
      c.fillStyle = '#003a44'; c.fillRect(d.x * k, d.y * k, tw, px + 4);
      c.fillStyle = '#ffffff'; c.fillText(label, d.x * k + 3, d.y * k + 2);
    });
  }

  window.CarCounter = { count };
})();
