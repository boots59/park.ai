// DeckViewer: shows the friend's West Deck glTF model and tints each bay by
// survey freshness. Bundled by scripts/build.cjs (esbuild) into one inline script, so
// the final HTML needs no network. Exposes window.DeckViewer.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const COLORS = { recent: '#2f8f4e', estimate: '#d9a21b', unknown: '#9aa69a', selected: '#1f5fbf' };
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

async function mount(container, glbBase64, { onPick } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef1ea');
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

  let statuses = {}, selected = null;
  function paint() {
    for (const [name, mesh] of Object.entries(bays)) {
      const col = name === selected ? COLORS.selected : COLORS[statuses[name] || 'unknown'];
      mesh.material.color.set(col);
      mesh.material.emissive.set(col);
      mesh.material.emissiveIntensity = 0.35;
    }
    render();
  }
  function render() { renderer.render(scene, camera); }
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
    setStatuses(map) { statuses = map; paint(); },
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
