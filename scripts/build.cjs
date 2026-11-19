// Build: assembles the page into dist/.
//   npm run build                       -> dist/index.html (+ dist/ai/ for the detection model)
//   node scripts/build.cjs --no-3d      -> dist/lite.html, without the three.js viewer (small)
// Steps: bundle src/viewer.js + three.js with esbuild, embed the 3D model as
// base64, inline data/deck.json and the scripts in src/, copy the AI files.
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..'), rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const glbPath = path.join(root, 'assets/west_deck_plain.glb');
// The 3D deck model is a collaborator's file and is only in the repo with their
// permission. Without it the page builds and works, minus the 3D view.
const no3d = process.argv.includes('--no-3d') || !fs.existsSync(glbPath);
const lite = process.argv.includes('--no-3d');

const deck = JSON.parse(rd('data/deck.json'));
const DECK = { name: deck.name, zones: deck.zones };
for (const [id, z] of Object.entries(DECK.zones))
  if (!Number.isInteger(z.level) || !z.label || !Number.isInteger(z.stalls) || z.stalls < 0) throw Error('data/deck.json: bay ' + id + ' needs a whole-number level and stalls, and a label');

let viewer = '';
if (!no3d) {
  const out = require('esbuild').buildSync({
    entryPoints: [path.join(root, 'src/viewer.js')], bundle: true, minify: true,
    format: 'iife', write: false, legalComments: 'eof', target: 'es2020' });
  const glb = fs.readFileSync(glbPath).toString('base64');
  viewer = out.outputFiles[0].text + `\nconst GLB_B64="${glb}";`;
}

const tpl = rd('src/index.template.html');
const parts = { '/*VIEWER*/': viewer, '/*DECK*/': 'const DECK=' + JSON.stringify(DECK) + ';',
  '/*SETTINGS*/': rd('src/settings.js'), '/*MODEL*/': rd('src/model.js'), '/*DETECT*/': rd('src/detect.js'), '/*AI*/': rd('src/ai.js'), '/*APP*/': rd('src/app.js') };
let html = tpl;
for (const [marker, code] of Object.entries(parts)) {
  if (!html.includes(marker)) throw Error('Template is missing ' + marker);
  if (/<\/script/i.test(code)) throw Error(marker + ' contains "</script", which would break the page');
  html = html.replace(marker, () => code); // function form: "$&" etc. in code stay literal
}
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const file = path.join(root, 'dist', lite ? 'lite.html' : 'index.html');
fs.writeFileSync(file, html);
console.log('built', path.relative(root, file), (html.length / 1024).toFixed(0) + ' KB' + (no3d && !lite ? ' (no 3D view: assets/west_deck_plain.glb is not present)' : ''));

// AI assets sit BESIDE the page in dist/ai/ (too big to inline: about 47 MB).
// The page works without them; the AI count then asks staff to count by eye.
if (!lite) {
  const ai = path.join(root, 'dist/ai'), ort = path.join(root, 'node_modules/onnxruntime-web/dist');
  const model = path.join(root, 'assets/models/yolox_s.onnx');
  fs.mkdirSync(ai, { recursive: true });
  for (const f of ['ort.wasm.min.js', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'])
    fs.copyFileSync(path.join(ort, f), path.join(ai, f));
  if (fs.existsSync(model)) { fs.copyFileSync(model, path.join(ai, 'yolox_s.onnx')); console.log('copied AI runtime and model to dist/ai/'); }
  else console.warn('WARNING: assets/models/yolox_s.onnx is missing, so the AI count will not work. Run: npm run fetch-model');
}
