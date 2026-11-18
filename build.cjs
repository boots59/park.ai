// Build: assembles one self-contained HTML file (no network needed to open it).
//   node build.cjs            -> dist/West-Deck-Prototype.html
//   node build.cjs --no-3d    -> same page without the three.js viewer (small)
// Steps: bundle src/viewer.js + three.js with esbuild, embed the plain GLB as
// base64, inline the deck config, model and app, and write dist/.
const fs = require('node:fs'), path = require('node:path');
const root = __dirname, rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const no3d = process.argv.includes('--no-3d');

const deck = JSON.parse(rd('assets/west_deck.json'));
const DECK = { name: deck.name, zones: deck.zones }; // levels/zones/stalls only

let viewer = '';
if (!no3d) {
  const out = require('esbuild').buildSync({
    entryPoints: [path.join(root, 'src/viewer.js')], bundle: true, minify: true,
    format: 'iife', write: false, legalComments: 'eof', target: 'es2020' });
  const glb = fs.readFileSync(path.join(root, 'assets/west_deck_plain.glb')).toString('base64');
  viewer = out.outputFiles[0].text + `\nconst GLB_B64="${glb}";`;
}

const tpl = rd('src/index.template.html');
const parts = { '/*VIEWER*/': viewer, '/*DECK*/': 'const DECK=' + JSON.stringify(DECK) + ';',
  '/*MODEL*/': rd('src/model.js'), '/*APP*/': rd('src/app.js') };
let html = tpl;
for (const [marker, code] of Object.entries(parts)) {
  if (!html.includes(marker)) throw Error('Template is missing ' + marker);
  if (/<\/script/i.test(code)) throw Error(marker + ' contains "</script", which would break the page');
  html = html.replace(marker, () => code); // function form: "$&" etc. in code stay literal
}
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const file = path.join(root, 'dist', no3d ? 'West-Deck-Prototype-lite.html' : 'West-Deck-Prototype.html');
fs.writeFileSync(file, html);
console.log('built', path.relative(root, file), (html.length / 1024).toFixed(0) + ' KB');
