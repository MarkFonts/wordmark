import random, json, sys
W=16
SEED=int(sys.argv[2]) if len(sys.argv)>2 else 3
OUT=sys.argv[3] if len(sys.argv)>3 else 'a2.js'
# a bold single-story a: bowl cols 0-11, stem cols 12-15, counter cols 4-9 rows 5-7
ext={0:[(2,10),(12,15)],1:[(1,16)],2:[(1,16)],3:[(0,16)],4:[(0,16)],5:[(0,4),(10,16)],6:[(0,4),(10,16)],7:[(0,5),(9,16)],
     8:[(0,16)],9:[(0,16)],10:[(0,16)],11:[(1,16)],12:[(1,16)],13:[(3,11),(12,15)]}
if len(sys.argv)>1 and sys.argv[1]: exec(sys.argv[1])
occ={}
for r,segs in ext.items():
    for a,b in segs:
        for x in range(a,b): occ[(x,r)]='.'
P=[]
def take(cells,ch):
    for c in cells:
        assert occ.get(c)=='.',(c,ch,occ.get(c)); occ[c]=ch
for x,r,d in [(1,0,-1),(0,2,-1),(9,0,1),(14,0,1),(4,7,1),(8,7,-1)]:      # inverted slopes: the bowl's underside, the stem's foot, the counter's top
    take([(x,r+1),(x+1,r+1),(x+1 if d<0 else x,r)],'J'); P.append(('J',x,r,0,d))
take([(0,10),(1,10),(1,11)],'U'); P.append(('U',0,10,1,-1)); P.append(('U',0,10,0,-1))   # shoulder: the two half-deep slopes, one behind the other
take([(10,12),(11,12),(10,13)],'T'); P.append(('T',10,12,0,1))             # clear slopes: the notch where bowl meets stem, the stem's top corner
take([(14,12),(15,12),(14,13)],'T'); P.append(('T',14,12,0,1))
for x,r,d in [(1,12,-1),(3,13,-1),(7,13,1),(4,4,1),(7,4,-1)]:
    take([(x+i,r) for i in range(3)],'L'); P.append(('L',x,r,0,d))
MUD=[(0,5),(10,5),(4,1),(5,9)]
for x,r in MUD:
    take([(x+i,r+j) for i in range(4) for j in range(2)],'M'); P.append(('M',x,r,0,1))
P.append(('P',3,5+2.8/1.2,-3.2,'tilt'))
random.seed(SEED)
inw=[]
for kind,n,z in [('X',6,1),('X',6,1)]:
    for _ in range(400):
        r=random.randint(1,11); x=random.randint(0,W-n)
        cells=[(x+i,r) for i in range(n)]
        if all(occ.get(c)=='.' for c in cells) and all(abs(r-q[1])>0 for q in inw):
            take(cells,kind); inw.append((x,r)); P.append((kind,x,r,z,1)); break
if len(inw)<2: sys.exit(3)
def runs_now():
    out=[]
    for r in range(16):
        x=0
        while x<W:
            if occ.get((x,r))=='.':
                a=x
                while occ.get((x,r))=='.': x+=1
                out.append((r,a,x-a))
            else: x+=1
    return out
LIT=set()
picks=[]
cand=[q for q in runs_now() if 1<=q[0]<=12 and q[2]>=1]
random.shuffle(cand); rows_used={}
for r,a,n in cand:
    if len(picks)>=18: break
    if rows_used.get(r,0)>=4: continue
    if n%2: o=random.randrange(0,n,2); new_=[(a+o,r)]
    else:
        if n<2 or len(picks)>16: continue
        ev=random.randrange(0,n-1,2); od=random.choice([q for q in range(ev+1,n,2)]); new_=[(a+ev,r),(a+od,r)]
    picks+=new_; rows_used[r]=rows_used.get(r,0)+len(new_)
if len(picks)!=18: print('picks',len(picks)); sys.exit(3)
for x,r in picks:
    take([(x,r)],'E'); P.append(('E',x,r,1,'z'))
    if len(LIT)<5: LIT.add((x,r)); P.append(('O',x+.37,r,1.5175,'z'))
plain=sum(1 for v in occ.values() if v=='.')
print('plain cells',plain,'need',90)
for r in range(13,-1,-1): print('%2d '%r+''.join(occ.get((x,r),' ') for x in range(W)))
if plain!=90: sys.exit(3)
need={4:11,2:20,1:6}
runs=[]
for r in range(16):
    x=0
    while x<W:
        if occ.get((x,r))=='.':
            a=x
            while occ.get((x,r))=='.': x+=1
            runs.append((r,a,x-a))
        else: x+=1
random.seed(SEED)
best=None
odd=sum(1 for r,a,n in runs if n%2)
print('odd runs',odd)
if odd>6 or (6-odd)%2: sys.exit(3)
for attempt in range(4000):
    left=dict(need); out=[]; ok=True
    segs=[]
    for r,a,n in runs:
        if n%2:
            if random.random()<.5: out.append(('1',a,r,0,1)); segs.append((r,a+1,n-1))
            else: out.append(('1',a+n-1,r,0,1)); segs.append((r,a,n-1))
            left[1]-=1
        else: segs.append((r,a,n))
    for r,a,n in random.sample(segs,len(segs)):
        x=a
        while n>0:
            opts=[k for k in (4,2) if k<=n and left[k]>0]
            if n>=2 and left[1]>=2: opts.append(11)
            if not opts: ok=False;break
            k=random.choices(opts,[ {4:8,2:3,11:1}[o] for o in opts])[0]
            if k==11: out+= [('1',x,r,0,1),('1',x+1,r,0,1)]; left[1]-=2; x+=2; n-=2
            else: out.append((str(k),x,r,0,1)); left[k]-=1; x+=k; n-=k
        if not ok: break
    if ok and all(v==0 for v in left.values()): best=out;break
if not best: sys.exit(3)
tiles=[(k,x,r,random.choice([0,0,0,1]),d) for k,x,r,z,d in best]
P+=tiles
# three plates lie face up on the front studs of bricks that stand out
out_cells={(x+i,r) for k,x,r,z,d in tiles if z==1 for i in range(int(k))}
ups=[(x+i,r) for k,x,r,z,d in tiles if z==1 for i in range(int(k)) if (x+i,r+1) not in out_cells and occ.get((x+i,r+1)) not in ('M',) and occ.get((x+i,r+1))]
random.shuffle(ups); chosen=[]
for c in ups:
    if all(abs(c[0]-q[0])+abs(c[1]-q[1])>4 for q in chosen): chosen.append(c)
    if len(chosen)==3: break
if len(chosen)<3: sys.exit(3)
for x,r in chosen: P.append(('O',x+.37,r+1+(.1275-.58*1.2)/1.2,2.0,'up'))
# two spare 1x2 bricks stand a stud proud of the face
flat2=[(x,r) for (x,r),v in occ.items() if all(occ.get((x+i,r))=='.' and (x+i,r) not in out_cells and (x+i,r-1) not in chosen for i in range(3)) and 2<=r<=11]
random.shuffle(flat2)
if not flat2: sys.exit(3)
x,r=flat2[0]; P.append(('L',x,r,2,1))   # the sixth slope stands a stud proud
flat=[(x,r) for (x,r),v in occ.items() if v=='.' and (x,r) not in out_cells]
fl=set(flat); spots=[(x,r) for x,r in flat if all((x+i,r) in fl for i in range(6)) and all((x+i,r-1) not in chosen for i in range(6)) and 2<=r<=13 and all(abs(r-q[1])>1 for q in inw)]

def js(p):
    k,x,y,z,d=p
    extra = ", t: -Math.PI / 2" if d=='z' else ", t: -Math.PI / 2, tilt: -Math.PI / 2" if d=='up' else (", tilt: Math.PI / 2" if d=='tilt' else (", d: -1" if d==-1 else ""))
    return "{ k: '%s', x: %s, y: %s, z: %s%s }"%(k,round(x,4),round(y,4),z,extra)
open(OUT,'w').write(",\n      ".join(", ".join(js(p) for p in P[i:i+4]) for i in range(0,len(P),4)))
from collections import Counter
print(Counter(p[0] for p in P), len(P))
