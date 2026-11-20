import json,subprocess,os
VO='/tmp/claude-0/-home-user-park-ai/d1e48874-3f4f-56fe-9207-c150746a9463/scratchpad/vo/'
segs=json.load(open(VO+'segs.json')); D={k:v['dur'] for k,v in segs.items()}
GAP=0.45
# (part, card id, end time within the part). Split points chosen from the transcript at the pauses.
PLAN={'p1':[('s1',3.65),('s2',5.96),('s3',9.33),('s4',19.75),('s5',24.00),('s6',41.91),('now',None)],
      'p2':[('now',5.10),('pick',21.48),('camera',43.71),('confirm',51.94),('hand',89.38),('fresh',95.52),('range',104.82),('old',None)],
      'p3':[('leave',9.08),('decks',13.56),('first',18.55),('deck',25.45),('way',29.38),('levels',43.85),('report',48.14),('leaving',54.17),('ask',None)],
      'p4':[('p1',35.94),('w4',None)],'p5':[('ai',18.50),('alive',None)],'p6':[('r1',6.36),('r2',11.94),('r3',None)],'p7':[('p2',17.50),('end',None)]}
order=[]  # (card, duration), merging a card that continues across two parts
for part in ['p1','p2','p3','p4','p5','p6','p7']:
    prev=0.0
    for j,(cid,end) in enumerate(PLAN[part]):
        e=D[part] if end is None else end; d=e-prev; prev=e
        if j==len(PLAN[part])-1: d+=GAP
        if order and order[-1][0]==cid: order[-1][1]+=d
        else: order.append([cid,d])
tl=json.load(open('timeline.json')); beats={m['id']:m for m in tl['marks']}; src=tl['file']
os.makedirs('clips',exist_ok=True); names=[]
enc=['-r','30','-c:v','libx264','-crf','20','-preset','veryfast','-pix_fmt','yuv420p','-an']
for k,(cid,d) in enumerate(order):
    out=f'clips/{k:02d}_{cid}.mp4'; names.append(out); fr=round(d*30)
    if cid in beats:
        b=beats[cid]; raw=b['end']-b['start']; f=d/raw; F=min(f,1.5) if f>1 else f; hold=max(0,d-raw*F)+0.2
        fc=(f"[0:v]fps=30,setpts={F:.4f}*PTS,tpad=stop_mode=clone:stop_duration={hold:.2f},scale=462:1000:flags=lanczos,pad=474:1012:6:6:color=0xffc629[ph];"
            f"[1:v]fps=30[bg];[bg][ph]overlay=1340:34,format=yuv420p[v]")
        subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',f"{b['start']:.2f}",'-t',f'{raw:.2f}','-i',src,'-loop','1','-t',f'{d+1:.2f}','-i',f'cap_{cid}.png','-filter_complex',fc,'-map','[v]','-frames:v',str(fr)]+enc+[out],check=True)
    else:
        z=min(0.035,0.004*d)
        vf=f"scale=3840:2160,zoompan=z='1+{z:.4f}*on/{fr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={fr}:s=1920x1080:fps=30,fade=in:0:7,format=yuv420p"
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',f'cap_{cid}.png','-vf',vf,'-frames:v',str(fr)]+enc+[out],check=True)
open('vlist.txt','w').write(''.join(f"file '{n}'\n" for n in names))
subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i','vlist.txt','-c','copy','video_only.mp4'],check=True)
# voice: the seven memos in order with a short gap after each, rumble removed, loudness evened
ins=[]; fc=''
for i in range(1,8): ins+=['-i',VO+f'p{i}.m4a']; fc+=f"[{i-1}:a]aresample=48000,aformat=channel_layouts=mono,apad=pad_dur={GAP}[a{i}];"
fc+=''.join(f'[a{i}]' for i in range(1,8))+"concat=n=7:v=0:a=1,highpass=f=70,afftdn=nf=-28,loudnorm=I=-16:TP=-1.5:LRA=11[a]"
subprocess.run(['ffmpeg','-y','-loglevel','error']+ins+['-filter_complex',fc,'-map','[a]','-c:a','aac','-b:a','160k','voice.m4a'],check=True)
out='/home/user/park.ai/submission/Park-AI-demo.mp4'
subprocess.run(['ffmpeg','-y','-loglevel','error','-i','video_only.mp4','-i','voice.m4a','-map','0:v','-map','1:a','-c:v','copy','-c:a','copy','-shortest','-movflags','+faststart',out],check=True)
t=0; rows=[]
for cid,d in order: rows.append((round(t,1),round(t+d,1),cid)); t+=d
json.dump(rows,open('final_tl.json','w')); print(round(t,1)); print(rows)
