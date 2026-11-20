const { chromium } = require('playwright'); const fs = require('fs');
const font = 'file:///home/user/park.ai/node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2';
const body = 'file:///home/user/park.ai/node_modules/@fontsource/barlow/files/barlow-latin-400-normal.woff2';
const owl = s => `<svg viewBox="0 0 32 32" width="${s}" height="${s}"><path fill="#ffc629" d="M5 4l5 4h12l5-4v14a11 11 0 0 1-22 0z"/><circle cx="11.5" cy="14" r="4.2" fill="#231f20"/><circle cx="20.5" cy="14" r="4.2" fill="#231f20"/><circle cx="11.5" cy="14" r="1.7" fill="#fff"/><circle cx="20.5" cy="14" r="1.7" fill="#fff"/><path fill="#231f20" d="M16 17l-2.2 3.2h4.4z"/></svg>`;
const css = `@font-face{font-family:B;src:url(${font})}@font-face{font-family:T;src:url(${body})}*{box-sizing:border-box}body{margin:0;width:1920px;height:1080px;color:#fff;font-family:B,Arial,sans-serif;background:#231f20}
.brand{position:absolute;left:90px;top:64px;display:flex;align-items:center;gap:18px;font-size:60px;line-height:1}.brand span{color:#ffc629}
.cap{position:absolute;left:90px;top:0;bottom:0;width:1160px;display:flex;flex-direction:column;justify-content:center}
.tag{font-size:34px;letter-spacing:.12em;color:#ffc629;text-transform:uppercase}
.big{font-size:330px;line-height:.9;color:#ffc629;margin:6px 0 0 -8px}
.line{font-size:124px;line-height:1;margin:10px 0 0;text-transform:uppercase}
.sm{font-family:T,Arial,sans-serif;font-size:32px;color:#a8a8a8;margin-top:26px}
.full{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.full .big{font-size:520px;margin:0}.full .line{font-size:150px;margin-top:0}.full .sm{font-size:38px}
.row{display:flex;gap:110px;align-items:flex-end}.row div{text-align:center}.row .big{font-size:300px}.row .line{font-size:60px;margin-top:6px}.row .sm{margin-top:10px;font-size:30px}`;
const cap = (tag, line, big, sm) => `<div class="brand">${owl(60)}<b>Park<span>.AI</span></b></div><div class="cap"><div class="tag">${tag}</div>${big ? `<div class="big">${big}</div>` : ''}<div class="line">${line}</div>${sm ? `<div class="sm">${sm}</div>` : ''}</div>`;
const full = inner => `<div class="full">${inner}</div>`;
const hero = (big, line, sm) => full(`<div class="big">${big}</div><div class="line">${line}</div><div class="sm">${sm}</div>`);
const trio = (tag, items, sm) => full(`<div class="tag" style="margin-bottom:40px;font-size:44px">${tag}</div><div class="row">${items.map(([n, t, s]) => `<div><div class="big">${n}</div><div class="line">${t}</div><div class="sm">${s}</div></div>`).join('')}</div>${sm ? `<div class="sm" style="margin-top:50px">${sm}</div>` : ''}`);
const cards = {
  w1: [false, hero('91%', 'Late to class.', '49 of 54 drivers polled at West Deck')],
  w2: [false, hero('76%', 'Gave up on a deck.', '41 of 54 drivers polled')],
  w3: [false, hero('70', 'Open spaces. Nobody found them.', 'West Deck · Thursday 11:50 AM · 57 of them were in just 3 bays')],
  w4: [false, full(`<div class="line" style="font-size:230px;color:#ffc629">Staff too.</div><div class="line" style="font-size:96px;margin-top:20px">Late to work. Sent to a far lot.</div><div class="sm">What staff told me in person</div>`)],
  now: [true, cap('Park.AI', 'Know before you go.')],
  pick: [true, cap('How it knows', 'A monitor picks a bay.')],
  camera: [true, cap('AI · on the phone', 'AI counts the cars.', '', 'Simulated camera on a test photo · nothing recorded')],
  confirm: [true, cap('A person confirms', 'Check. Save.')],
  hand: [true, cap('No camera?', 'Tally by hand.')],
  fresh: [true, cap('How it updates', 'Fresh = a number.')],
  range: [true, cap('How it updates', 'Older = a range.')],
  old: [true, cap('How it updates', 'Old = labelled. Never faked.')],
  leave: [true, cap('Before you leave', 'Would check first.', '78%', '42 of 54 drivers polled')],
  decks: [true, cap('Both campuses', 'Decks and lots. West Deck first.', '16')],
  first: [true, cap('Driving in', 'Would go straight there.', '74%', '40 of 54 drivers polled')],
  deck: [true, cap('3D deck', 'Stalls. Counted on foot.', '662')],
  way: [true, cap('Wayfinding', 'Entrances. Exit to campus.')],
  levels: [true, cap('Level 1', 'Student stalls. Of 181.', '0')],
  report: [true, cap('Parked', 'Would tap for the next driver.', '72%', '39 of 54 drivers polled')],
  leaving: [true, cap('Leaving', 'One tap.')],
  ask: [true, cap('Ask', 'Or just ask.')],
  p1: [false, trio('54 drivers polled', [['91%', 'late to class', '49 of 54'], ['57%', 'tried 2+ levels', '31 of 54'], ['37%', '6+ min to park', '20 of 54']])],
  p2: [false, trio('Would they use it?', [['78%', 'would check first', '42 of 54'], ['74%', 'straight to that level', '40 of 54'], ['72%', 'would tap after parking', '39 of 54']], 'What drivers said they would do')],
  p3: [false, trio('Tested and mapped', [['7 of 9', 'testers: easy to use', 'first testers, asked in person'], ['212', 'faculty stalls mapped', 'counting them is next']])],
  end: [false, full(`<div class="brand" style="position:static;font-size:230px;gap:44px">${owl(230)}<b>Park<span>.AI</span></b></div><div class="line" style="font-size:96px;color:#ffc629;margin-top:30px">Know before you go.</div><div class="sm" style="font-size:44px;color:#fff;margin-top:40px">boots59.github.io/park.ai</div><div class="sm">Kell Enow · KSU AI Club Hackathon 2026 · a student prototype, not a KSU system</div>`)] };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const [name, [transparent, html]] of Object.entries(cards)) { const f = '/home/user/park.ai/node_modules/.card.html'; fs.writeFileSync(f, `<style>${css}body{background:${transparent ? '#231f20' : '#231f20'}}</style>${html}`); await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150); await p.screenshot({ path: `cap_${name}.png` }); }
  fs.unlinkSync('/home/user/park.ai/node_modules/.card.html'); await b.close(); })();
