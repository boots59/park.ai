// Downloads the vehicle-detection model (YOLOX-s, Apache-2.0) and verifies it.
//   npm run fetch-model
// The 36 MB file is kept out of git; build.cjs copies it into dist/ai/.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const URL_ = 'https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_s.onnx';
const SHA256 = 'c5c2d13e59ae883e6af3b45daea64af4833a4951c92d116ec270d9ddbe998063';
const file = path.join(__dirname, '../assets/models/yolox_s.onnx');
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
(async () => {
  if (fs.existsSync(file) && sha(fs.readFileSync(file)) === SHA256) return console.log('model already present and verified');
  console.log('downloading', URL_);
  const res = await fetch(URL_);
  if (!res.ok) throw Error('download failed: HTTP ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  if (sha(buf) !== SHA256) throw Error('checksum mismatch: refusing to use this file');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  console.log('saved', path.relative(process.cwd(), file), (buf.length / 1e6).toFixed(1) + ' MB, checksum ok');
})().catch(e => { console.error(e.message, '\nManual fallback: curl -L -o assets/models/yolox_s.onnx ' + URL_); process.exit(1); });
