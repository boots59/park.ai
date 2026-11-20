const { chromium } = require('playwright'); const fs = require('fs');
const font = 'file:///home/user/park.ai/node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2';
const body = 'file:///home/user/park.ai/node_modules/@fontsource/barlow/files/barlow-latin-400-normal.woff2';
const owl = s => `<svg viewBox="0 0 32 32" width="${s}" height="${s}"><path fill="#ffc629" d="M5 4l5 4h12l5-4v14a11 11 0 0 1-22 0z"/><circle cx="11.5" cy="14" r="4.2" fill="#231f20"/><circle cx="20.5" cy="14" r="4.2" fill="#231f20"/><circle cx="11.5" cy="14" r="1.7" fill="#fff"/><circle cx="20.5" cy="14" r="1.7" fill="#fff"/><path fill="#231f20" d="M16 17l-2.2 3.2h4.4z"/></svg>`;
const css = `@font-face{font-family:B;src:url(${font})}@font-face{font-family:T;src:url(${body})}*{box-sizing:border-box}body{margin:0;width:1920px;height:1080px;color:#fff;font-family:B,Arial,sans-serif}
.brand{position:absolute;left:90px;top:70px;display:flex;align-items:center;gap:18px;font-size:64px;line-height:1}.brand span{color:#ffc629}
.cap{position:absolute;left:90px;top:300px;width:1150px}.tag{font-size:34px;letter-spacing:.1em;color:#ffc629;text-transform:uppercase}.line{font-size:118px;line-height:1.02;margin:14px 0 22px;text-transform:uppercase}.sub{font-family:T,Arial,sans-serif;font-size:38px;line-height:1.3;color:#d6d6d6}
.foot{position:absolute;left:90px;bottom:60px;font-family:T,Arial,sans-serif;font-size:26px;color:#9a9a9a}
.full{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:#231f20}.full .line{font-size:190px}.full .sub{font-size:48px}.full .tag{font-size:44px}
.stats{display:flex;gap:90px;margin:10px 0 50px}.stats div{font-size:150px;line-height:1;color:#ffc629}.stats small{display:block;font-family:T,Arial,sans-serif;font-size:36px;color:#fff;margin-top:14px}`;
const foot = 'A replay of a real count of West Deck, Nov 19, 2026 · student prototype, not a KSU system';
const cap = (tag, line, sub) => `<div class="brand">${owl(64)}<b>Park<span>.AI</span></b></div><div class="cap"><div class="tag">${tag}</div><div class="line">${line}</div><div class="sub">${sub}</div></div><div class="foot">${foot}</div>`;
const full = inner => `<div class="full">${inner}</div>`;
const stat3 = rows => `<div class="stats">${rows.map(([n, t]) => `<div>${n}<small>${t}</small></div>`).join('')}</div>`;
const cards = {
  w1: [false, full(`<div class="tag">West Deck · Thursday · 11:50 AM</div><div class="line">70 open spaces.</div><div class="sub">Counted on foot, Nov 19, 2026.</div>`)],
  w2: [false, full(`<div class="tag">West Deck · Thursday · 11:50 AM</div><div class="line"><span style="color:#ffc629">57 of them</span> in 3 bays.</div><div class="sub">Nothing told a driver which three.</div>`)],
  w3: [false, full(`<div class="tag">Why it matters</div><div class="line"><span style="color:#ffc629">49 of 54</span> drivers</div><div class="sub" style="font-size:64px;color:#fff">late to class because of parking this semester.</div><div class="sub" style="margin-top:26px">My polls at West Deck, Nov 19: 30 asked in person, 24 by QR code.</div>`)],
  w4: [false, full(`<div class="tag">Not only students</div><div class="line">Staff told me the same.</div><div class="sub" style="max-width:1300px">Late to work looking for a space, then sent to a far lot.<br>What staff said to me in person; not a survey.</div>`)],
  now: [true, cap('Park.AI', 'Know where the room is.', 'Before you drive in.')],
  pick: [true, cap('How it knows', 'A monitor picks a bay.', 'The people already walking the deck.')],
  camera: [true, cap('AI · on the phone', 'The camera counts the cars.', 'Simulated camera on a test photo. Nothing is recorded or uploaded.')],
  confirm: [true, cap('A person confirms', 'Check it. Save it.', 'The new count replaces the old one. It is never added.')],
  hand: [true, cap('No camera?', 'Tally by hand.', 'One tap per open stall. Or enter the plate truck’s count.')],
  fresh: [true, cap('How it updates · fresh', 'A fresh count is a number.', 'Under 5 minutes old. Older counts are already ranges.')],
  range: [true, cap('How it updates · ageing', 'Minutes later: a range.', 'It widens with age and follows the trend.')],
  old: [true, cap('How it updates · old', 'After an hour: last count.', 'Kept, with its age. Never shown as live.')],
  leave: [true, cap('Your trip · 1 · before you leave', 'Check before you drive.', '“I arrive in 10 min” gives a prediction, labelled as one.')],
  decks: [true, cap('Every deck and lot', 'Others: coming soon.', 'Only West Deck has counts so far.')],
  first: [true, cap('Your trip · 2 · driving in', 'Which bay to try first.', 'One tap opens it in the deck.')],
  deck: [true, cap('3D deck', 'Green has room. Red is full.', 'Level 1 is faculty and staff only.')],
  way: [true, cap('Wayfinding', 'Entrances. Exit to campus.', 'Stack the levels or slide them apart. The compass shows north.')],
  levels: [true, cap('Level by level', 'Every bay, every stall.', 'How many are open. Never which ones.')],
  report: [true, cap('Your trip · 3 · parked', 'One tap for the next driver.', 'Anonymous. Lower trust than a staff count.')],
  leaving: [true, cap('Your trip · 4 · leaving', 'Tap “I’m leaving”.', 'The next driver sees a space opening.')],
  ask: [true, cap('Ask', 'Or just ask.', 'It answers from the counts and takes you there.')],
  p1: [false, full(`<div class="tag" style="margin-bottom:30px">Would drivers use it? I asked 54</div>${stat3([['42', 'would check it most times'], ['40', 'would go straight to that level'], ['39', 'would tap after parking']])}<div class="sub">What they said they would do. Not yet measured in use.</div>`)],
  p2: [false, full(`<div class="tag" style="margin-bottom:30px">9 students tried the app</div>${stat3([['7', 'found it easy'], ['7', 'would check it before driving in'], ['0', 'negative answers']])}<div class="sub">Asked in person by the builder. A first read, not a rating.</div>`)],
  p3: [false, full(`<div class="tag">Faculty and staff</div><div class="line"><span style="color:#ffc629">212</span> faculty stalls, mapped.</div><div class="sub">Counting them works the same way. That is the next step.</div>`)],
  end: [false, full(`<div class="stats"><div>662<small>stalls counted on foot</small></div><div>54<small>drivers polled</small></div><div>49<small>late to class because of parking</small></div></div><div class="brand" style="position:static;font-size:150px;gap:30px">${owl(150)}<b>Park<span>.AI</span></b></div><div class="tag" style="margin-top:30px">boots59.github.io/park.ai</div><div class="sub" style="margin-top:22px;font-size:34px">Kell Enow · KSU AI Club Hackathon 2026 · a student prototype, not a KSU system</div>`)] };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const [name, [transparent, html]] of Object.entries(cards)) { const f = '/home/user/park.ai/node_modules/.card.html'; fs.writeFileSync(f, `<style>${css}body{background:${transparent ? '#231f20' : '#231f20'}}</style>${html}`); await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150); await p.screenshot({ path: `cap_${name}.png` }); }
  fs.unlinkSync('/home/user/park.ai/node_modules/.card.html'); await b.close(); })();
