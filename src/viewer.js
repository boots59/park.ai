// DeckViewer: shows the friend's West Deck glTF model and tints each bay by
// survey freshness. Bundled by scripts/build.cjs (esbuild) into one inline script, so
// the final HTML needs no network. Exposes window.DeckViewer.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Bay colour = how much room (see ParkingModel.bayState). The number badge on
// each bay carries the same information in text.
const COLORS = { room: '#2f8f4e', few: '#d9a21b', full: '#b8402f', unknown: '#9aa69a' };
// "Slide levels apart": each level moves sideways and up from the one below,
// like pulling out drawers, so every bay can be seen and tapped.
const LEVEL_SLIDE = 58; // metres sideways per level
const LEVEL_LIFT = 5;   // metres up per level
const SLIDE_MS = 450;   // animation length

function base64ToArrayBuffer(b64) {
  const bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function mount(container, glbBase64, { onPick, bayIds = [], access = [] } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#efefed');
  scene.add(new THREE.HemisphereLight('#ffffff', '#b9c4b0', 1.6));
  const sun = new THREE.DirectionalLight('#fff1dd', 2.2);
  sun.position.set(-80, 120, 40);
  scene.add(sun);

  const gltf = await new GLTFLoader().parseAsync(base64ToArrayBuffer(glbBase64), '');
  scene.add(gltf.scene);

  // Bays are meshes named L<level>_<West|Centre|East>. Give each its own material
  // so we can recolour one without touching the others.
  const bays = {};
  gltf.scene.traverse(o => {
    if (o.isMesh && /^L\d_(West|Centre|East)$/.test(o.name)) {
      o.material = new THREE.MeshStandardMaterial({ color: COLORS.unknown });
      bays[o.name] = o;
    }
  });
  const levels = [1, 2, 3].map(n => gltf.scene.getObjectByName('Level_' + n)).filter(Boolean);

  // The 3D model has three bays per level. The deck also has a short North and
  // South bay on each level, so add a plain strip at each end for any
  // "L<n>_North" / "L<n>_South" in the deck data. These strips are SCHEMATIC:
  // they mark that the bay exists, not its measured position. (-z is north.)
  gltf.scene.updateMatrixWorld(true);
  for (const id of bayIds) {
    const m = /^L(\d)_(North|South)$/.exec(id); if (!m || bays[id]) continue;
    const level = gltf.scene.getObjectByName('Level_' + m[1]), around = new THREE.Box3();
    for (const side of ['West', 'Centre', 'East']) if (bays[`L${m[1]}_${side}`]) around.expandByObject(bays[`L${m[1]}_${side}`]);
    if (!level || around.isEmpty()) continue;
    const depth = 7, strip = new THREE.Mesh(new THREE.PlaneGeometry(around.max.x - around.min.x, depth), new THREE.MeshStandardMaterial({ color: COLORS.unknown, side: THREE.DoubleSide }));
    strip.name = id; strip.rotation.x = -Math.PI / 2;
    strip.position.set((around.min.x + around.max.x) / 2, m[2] === 'North' ? around.max.y : around.min.y, m[2] === 'North' ? around.min.z - depth / 2 - 1 : around.max.z + depth / 2 + 1);
    gltf.scene.add(strip); level.attach(strip); // attach keeps its place and makes it slide with its level
    bays[id] = strip;
  }
  // Ways in and out (data/deck.json "access"): a pin with a text flag. "walk" is the way to campus on foot,
  // "drive" is a vehicle entrance/exit. Placed at a corner or side of the level from the field notes, so the
  // position is approximate to a few metres. The north-east walk exit uses the model's own stair and lift tower.
  const pins = [];
  for (const a of access) {
    const level = gltf.scene.getObjectByName('Level_' + a.level), around = new THREE.Box3();
    for (const side of ['West', 'Centre', 'East']) if (bays[`L${a.level}_${side}`]) around.expandByObject(bays[`L${a.level}_${side}`]);
    if (!level || around.isEmpty()) continue;
    const tower = a.at === 'NE' && gltf.scene.getObjectByName('Deck_Tower'), at = new THREE.Vector3();
    if (tower) new THREE.Box3().setFromObject(tower).getCenter(at);
    else at.set(/E/.test(a.at) ? around.max.x + 2 : /W/.test(a.at) ? around.min.x - 2 : (around.min.x + around.max.x) / 2, 0,
      /N/.test(a.at) ? around.min.z + 4 : /S/.test(a.at) ? around.max.z - 4 : (around.min.z + around.max.z) / 2);
    const colour = a.kind === 'walk' ? '#1f5fbf' : '#231f20', height = 9, floor = /N/.test(a.at) ? around.max.y : around.min.y; // the ramp makes the north end the high end
    const pin = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.4 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, height, 10), mat); pole.position.y = height / 2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.7, 16, 12), mat); head.position.y = height;
    pin.add(pole, head); pin.position.set(at.x, floor, at.z); gltf.scene.add(pin); level.attach(pin); // slides with its level
    pins.push({ a, head });
  }
  const base = levels.map(l => l.position.clone());
  let apart = 0, anim = 0; // apart: 0 = stacked, 1 = fully slid apart

  const camera = new THREE.PerspectiveCamera(35, 1, 1, 3000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.48; // don't go under the ground
  controls.addEventListener('change', render);

  // Fit the whole model in view: distance from the bounding sphere and the
  // narrower of the two fields of view (a phone is taller than it is wide).
  const VIEW_DIR = new THREE.Vector3(-0.55, 0.62, 0.6).normalize();
  function fit() {
    const sphere = new THREE.Box3().setFromObject(gltf.scene).getBoundingSphere(new THREE.Sphere());
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = sphere.radius / Math.sin(Math.min(vfov, hfov) / 2) * 0.9;
    controls.target.copy(sphere.center);
    camera.position.copy(sphere.center).addScaledVector(VIEW_DIR, dist);
    controls.update(); // applies the target: OrbitControls points the camera at it
  }

  // A small text badge floats over each bay: its count or estimated range.
  container.style.position = 'relative';
  const labels = {};
  for (const [name, mesh] of Object.entries(bays)) {
    const el = document.createElement('div'); el.className = 'bay-label'; el.setAttribute('aria-hidden', 'true'); // same data is in the level cards
    container.appendChild(el); labels[name] = el;
  }
  for (const pin of pins) {
    const el = document.createElement('div'); el.className = 'access-label ' + pin.a.kind; el.textContent = pin.a.label; el.setAttribute('aria-hidden', 'true'); // listed as text under the model
    container.appendChild(el); pin.el = el;
  }
  const p = new THREE.Vector3(), box = new THREE.Box3();
  function placeLabels() {
    const w = container.clientWidth, h = container.clientHeight;
    for (const [name, el] of Object.entries(labels)) {
      box.setFromObject(bays[name]).getCenter(p); p.project(camera); // middle of the bay, wherever its level has slid to
      const show = p.z < 1 && el.textContent;
      el.style.display = show ? '' : 'none';
      if (show) el.style.transform = `translate(-50%,-50%) translate(${((p.x + 1) / 2 * w).toFixed(1)}px,${((1 - p.y) / 2 * h).toFixed(1)}px)`;
    }
    for (const { head, el } of pins) {
      head.getWorldPosition(p).project(camera);
      el.style.display = p.z < 1 ? '' : 'none';
      el.style.transform = `translate(-50%,-140%) translate(${((p.x + 1) / 2 * w).toFixed(1)}px,${((1 - p.y) / 2 * h).toFixed(1)}px)`;
    }
  }

  let states = {}, selected = null;
  function paint() {
    for (const [name, mesh] of Object.entries(bays)) {
      const info = states[name] || { state: 'unknown', label: '' }, col = COLORS[info.state] || COLORS.unknown;
      labels[name].textContent = info.label; labels[name].classList.toggle('selected', name === selected);
      mesh.material.color.set(col);
      mesh.material.emissive.set(col);
      mesh.material.emissiveIntensity = name === selected ? 0.9 : 0.35; // the selected bay glows
    }
    render();
  }
  function render() { scene.updateMatrixWorld(); renderer.render(scene, camera); placeLabels(); }
  function resize() {
    const w = container.clientWidth, h = container.clientHeight || 320;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); fit(); render();
  }
  new ResizeObserver(resize).observe(container);

  // Tap/click picking. Ignore drags so rotating the model doesn't select a bay.
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(Object.values(bays), false)[0];
    if (hit && onPick) onPick(hit.object.name);
  });

  resize();
  return {
    bayNames: Object.keys(bays),
    setBays(map) { states = map; paint(); }, // { bayName: { state: 'room'|'few'|'full'|'unknown', label: '6-14' } }
    select(name) { selected = name; paint(); },
    // Slide the levels apart (or back). Animated unless the viewer prefers reduced motion.
    setSpread(on, instant = matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const from = apart, to = on ? 1 : 0, t0 = performance.now();
      cancelAnimationFrame(anim);
      const place = k => { apart = k; levels.forEach((l, i) => l.position.set(base[i].x + i * LEVEL_SLIDE * k, base[i].y + i * LEVEL_LIFT * k, base[i].z)); fit(); render(); };
      if (instant) return place(to);
      const step = now => { const u = Math.min(1, (now - t0) / SLIDE_MS), ease = u * u * (3 - 2 * u);
        place(from + (to - from) * ease); if (u < 1) anim = requestAnimationFrame(step); };
      anim = requestAnimationFrame(step);
    },
  };
}

window.DeckViewer = { mount };
