import json,subprocess
t=json.load(open('timeline.json')); m=t['marks']; src=t['file']
t0=m[0]['start']-0.3; dur=m[-1]['end']-t0
PRE=[('s1',2.2),('s2',1.5),('s3',1.5),('s4',2.6),('s5',4.2),('s6',4.8)]; POST=[('p1',6.0),('w4',4.6),('ai',6.5),('alive',7.5),('r1',2.6),('r2',3.0),('r3',3.0),('p2',6.5),('end',7.0)]
inputs=['-ss',f'{t0:.2f}','-t',f'{dur:.2f}','-i',src]
fc=[f"color=c=0x231f20:s=1920x1080:r=30:d={dur:.2f}[bg]"]; last='bg'
for i,b in enumerate(m):
    inputs+=['-loop','1','-t',f'{dur:.2f}','-i',f"cap_{b['id']}.png"]
    s=max(0,b['start']-t0) if i else 0; e=b['end']-t0 if i<len(m)-1 else dur
    fc.append(f"[{last}][{i+1}:v]overlay=enable='between(t,{s:.2f},{e:.2f})'[b{i}]"); last=f'b{i}'
fc.append("[0:v]fps=30,scale=462:1000:flags=lanczos,pad=474:1012:6:6:color=0xffc629[ph]")
fc.append(f"[{last}][ph]overlay=1340:34,format=yuv420p[v]")
subprocess.run(['ffmpeg','-y','-loglevel','error']+inputs+['-filter_complex',';'.join(fc),'-map','[v]','-r','30','-c:v','libx264','-crf','20','-preset','veryfast','main.mp4'],check=True)
for n,d in PRE+POST:  # a slow push-in and a quick fade so the number lands
    fr=int(d*30)
    vf=f"scale=3840:2160,zoompan=z='1+0.035*on/{fr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={fr}:s=1920x1080:fps=30,fade=in:0:7,format=yuv420p"
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',f'cap_{n}.png','-vf',vf,'-frames:v',str(fr),'-c:v','libx264','-crf','20','-preset','veryfast',f'{n}.mp4'],check=True)
open('list.txt','w').write(''.join(f"file '{n}.mp4'\n" for n in [x for x,_ in PRE]+['main']+[x for x,_ in POST]))
out='/home/user/park.ai/submission/Park-AI-demo-FULL-SILENT.mp4'
subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i','list.txt','-f','lavfi','-i','anullsrc=r=44100:cl=stereo','-shortest','-c:v','copy','-c:a','aac','-b:a','64k',out],check=True)
tl=[]; x=0
for n,d in PRE: tl.append((x,x+d,n)); x+=d
off=x
for i,b in enumerate(m): tl.append((off+(max(0,b['start']-t0) if i else 0), off+(b['end']-t0), b['id']))
x=off+dur
for n,d in POST: tl.append((x,x+d,n)); x+=d
on={"s1":"11:50 AM. Class at 12:15","s2":"Level 1. Nothing","s3":"Level 2. Nothing","s4":"12:16. Late. Again","s5":"91% · Have lived this","s6":"70 · Open spaces. The whole time","now":"Know before you go","pick":"A monitor picks a bay","camera":"AI counts the cars","confirm":"Check. Save","hand":"Tally by hand","fresh":"Fresh = a number","range":"Older = a range","old":"Old = labelled. Never faked","leave":"78% · Would check first","decks":"16 · Decks and lots","first":"74% · Would go straight there","deck":"662 · Stalls, counted on foot","way":"Entrances. Exit to campus","levels":"0 · Student stalls on Level 1, of 181","report":"72% · Would tap for the next driver","leaving":"Leaving: one tap","ask":"Or just ask","p1":"50% · 76% · 20+ min","w4":"Staff too","ai":"AI · Counts the cars for the monitor","alive":"Students · Monitors · The truck","r1":"11:50 AM. Class at 12:15","r2":"Level 2 West bay · 22 open","r3":"You already knew","p2":"78% · 74% · 72%","end":"Park.AI · Know before you go"}
say={"s1":"It's 11:50. You have class at 12:15.",
"s2":"You try Level 1. Nothing.",
"s3":"Level 2. Nothing. Your heart rate is up.",
"s4":"You walk in at 12:16. Late. Again. [Your own line: what that walk into class feels like.]",
"s5":"Ninety-one percent of the drivers I polled have lived exactly this.",
"s6":"And here is what hurts. The deck was not full. Seventy student spaces were open the whole time. Fifty-seven of them sat in three bays, and nobody could find them.",
"now":"So I built Park.AI. Know before you go.",
"pick":"Here is how it knows. A parking monitor, already walking the deck, picks a bay.",
"camera":"This is the AI. A vehicle-detection model running on the monitor's own phone. They point it down the row, it puts a box on every car and counts them. No plates read. Nothing recorded. Nothing uploaded.",
"confirm":"They check it and save. The new count replaces the old one.",
"hand":"No camera? One tap per open stall. Or the count from the plate truck KSU already runs.",
"fresh":"And it never lies to you. A fresh count is a number.",
"range":"Minutes later it is a range.",
"old":"After an hour it is labelled as old. Never faked as live.",
"leave":"Now your morning. Before you leave home, you check. Seventy-eight percent of drivers said they would.",
"decks":"Sixteen decks and lots across both campuses. West Deck is first.",
"first":"Driving in, it names the bay to try first. No guessing.",
"deck":"Here it is in 3D. All 662 stalls. Green has room, red is full.",
"way":"The way in, and the exit to campus.",
"levels":"And Level 1? A hundred and eighty-one stalls. Zero for students. You never waste that lap again.",
"report":"You park. One tap, and the next driver knows too.",
"leaving":"After class, one more tap: I'm leaving. Someone behind you just found a space.",
"ask":"Or just ask it.",
"p1":"This is what the semester has been. Half of them late several times. Three in four gave up on a deck. Four drivers spent over twenty minutes, in one day. [A real thing a student said to you goes here.]",
"w4":"Staff told me the same thing. Late to work. Sent to a far lot they did not pay for.",
"ai":"So the AI is the engine. It turns a monitor's walk into a count, without them counting a single car. And the same model can run on the deck's own cameras: that needs KSU's approval, and I will push for it.",
"alive":"Until then, it is kept alive by the people who use the deck every day. Students, with one tap after they park. Monitors, who already patrol it, filling the gaps with the AI camera. And the plate truck that already drives through. The more people use it, the fresher it gets. It is designed to keep itself going.",
"r1":"So picture that same morning again. 11:50. Class at 12:15.",
"r2":"Level 2, west bay. Twenty-two open.",
"r3":"You already knew. You walk in early.",
"p2":"And they want it. Seventy-eight percent would check first. Seventy-four percent would drive straight there. Seventy-two percent would tap to help the next person.",
"end":"Finding a space should not decide whether you make it to class. Park.AI. Know before you go."}
f=lambda v:f"{int(v//60)}:{int(v%60):02d}"
sec={"ai":"THE AI, AND WHO KEEPS IT ALIVE","s1":"THE STRESS (a morning every driver knows)","now":"HOW IT KNOWS AND UPDATES","leave":"YOUR MORNING, WITH IT","p1":"WHAT IT COSTS","r1":"THE RELIEF","p2":"THEY WANT IT"}
rows=""
for a,b,i in tl:
    if i in sec: rows+=f"| | **{sec[i]}** | |\n"
    rows+=f"| {f(a)}–{f(b)} | {on[i]} | {say[i]} |\n"
open('/home/user/park.ai/submission/VOICEOVER-FULL.md','w').write(f"""# Voice-over for `Park-AI-demo-FULL-SILENT.mp4` ({f(tl[-1][1])})

The screen now carries only big numbers and a few words. **You carry the story.** The lines below are a starting point: say them your way, add your own, but keep every number exactly as written.

| Time | On screen | A line you can say |
|---|---|---|
{rows}
## Make it yours
- **0:00–0:08.** This is your story, told as "you". Say it like it happened to you last week, because it did. Short sentences. Let "Late. Again." sit for a beat.
- **Student voices.** I have no word-for-word quotes from students, and I will not invent any. Where the sheet says "a real thing a student said to you", use one you actually heard, in their words.
- **The relief (near the end).** Lower your voice and slow down. "You already knew." is the line the whole video is built to reach.
- **The staff card.** Tell it the way the staff member told you, without naming them.
- **Slow down on the numbers.** Say the number, pause half a second, then say what it means.

## What the percentages are
Every percentage is out of the 54 drivers you polled at West Deck on Nov 19 (30 in person, 24 by QR code), and the card shows the count beside it. Say "of the drivers I polled", never "of KSU students". The "would" numbers are what people said they would do.

## Keep these as they are
- "Designed to keep itself going" is the design, not a result. No student has reported through it in real use yet, so do not say it already runs itself.
- Monitors are meant to cover the decks around the clock; you were told that in practice it is weekdays. Say "who already patrol it", not "24/7".
- The relief scene is a picture of how it would go, using the real count from Nov 19 (Level 2 West bay, 22 open). Say "picture it"; do not say the app has already made anyone on time. Nobody has parked with it yet.
- The app maps the 212 faculty stalls; it does not count open faculty stalls yet. "Counting them is next."
- The camera shot is a simulated camera on a test photo, and the card says so.
- Do not name the parking official in the video unless he has said you may.
""")
print(f(tl[-1][1]))
