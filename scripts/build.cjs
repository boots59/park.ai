// Build: assembles the page into dist/.
//   npm run build                       -> dist/index.html (+ dist/ai/ for the detection model)
//   node scripts/build.cjs --no-3d      -> dist/lite.html, without the three.js viewer (small)
// Steps: bundle src/viewer.js + three.js with esbuild, embed the 3D model as
// base64, inline data/deck.json and the scripts in src/, copy the AI files.
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..'), rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const glbPath = path.join(root, 'assets/west_deck_plain.glb');
// The 3D deck model is a collaborator's file, included with their permission.
// If it is absent the page still builds and works, minus the 3D view.
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

// Styles live in src/styles.css. The typeface (Barlow, SIL Open Font License) is embedded so the page needs no network.
const font = (pkg, file, family, weight) => `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;font-display:swap;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(root, 'node_modules/@fontsource', pkg, 'files', file)).toString('base64')}) format('woff2')}`;
const fonts = [font('barlow', 'barlow-latin-400-normal.woff2', 'Barlow', 400), font('barlow', 'barlow-latin-600-normal.woff2', 'Barlow', 600),
  font('barlow-condensed', 'barlow-condensed-latin-600-normal.woff2', 'Barlow Condensed', 600), font('barlow-condensed', 'barlow-condensed-latin-700-normal.woff2', 'Barlow Condensed', 700)].join('\n');
const styles = rd('src/styles.css').replace('/*FONTS*/', () => fonts);
const syncOrigin = String(require(path.join(root, 'src/settings.js')).syncUrl || '').replace(/\/+$/, '');
const tpl = rd('src/index.template.html').replace('/*STYLES*/', () => styles).replace('/*SYNC_ORIGIN*/', syncOrigin);
const parts = { '/*VIEWER*/': viewer, '/*DECK*/': 'const DECK=' + JSON.stringify(DECK) + ';',
  '/*SETTINGS*/': rd('src/settings.js'), '/*MODEL*/': rd('src/model.js'), '/*SYNC*/': rd('src/sync.js'), '/*DETECT*/': rd('src/detect.js'), '/*AI*/': rd('src/ai.js'), '/*APP*/': rd('src/app.js') };
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

// Static files for the installable app (icons, manifest, service worker).
for (const f of fs.readdirSync(path.join(root, 'public'))) fs.copyFileSync(path.join(root, 'public', f), path.join(root, 'dist', f));
// The field kit shares the app's database address (Settings.syncUrl); empty keeps it on one phone.
{ const kit = path.join(root, 'dist/field.html'), url = String(require(path.join(root, 'src/settings.js')).syncUrl || '');
  if (url && !/^https:\/\/[\w.-]+$/.test(url.replace(/\/+$/, ''))) throw Error('Settings.syncUrl must look like https://name.firebaseio.com');
  fs.writeFileSync(kit, fs.readFileSync(kit, 'utf8').split('/*SYNC_URL*/').join(url)); }

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
