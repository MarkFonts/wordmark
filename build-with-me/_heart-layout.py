import random, json, sys
W=20
SEED=int(sys.argv[2]) if len(sys.argv)>2 else 3
ext={0:[(9,11)],1:[(8,12)],2:[(7,13)],3:[(6,14)],4:[(5,15)],5:[(4,16)],6:[(3,17)],7:[(2,18)],8:[(1,19)],
     9:[(0,20)],10:[(0,20)],11:[(0,20)],12:[(0,20)],13:[(1,9),(11,19)],14:[(1,9),(11,19)],15:[(3,7),(13,17)]}
if len(sys.argv)>1: exec(sys.argv[1])
occ={}
for r,segs in ext.items():
    for a,b in segs:
        for x in range(a,b): occ[(x,r)]='.'
P=[]  # pieces
def take(cells,ch):
    for c in cells:
        assert occ.get(c)=='.',(c,ch,occ.get(c)); occ[c]=ch
def mir(x,w): return W-x-w
# J bumpers on the V
for r,x in [(1,7),(3,5),(5,3)]:
    take([(x,r+1),(x+1,r+1),(x+1,r)],'J'); P.append(('J',x,r,0,-1))
    xm=mir(x,2); take([(xm,r+1),(xm+1,r+1),(xm,r)],'J'); P.append(('J',xm,r,0,1))
# shoulders: U (front row only) outside, clear T at the cleft
take([(0,12),(1,12),(1,13)],'U'); P.append(('U',0,12,1,-1))
take([(18,12),(19,12),(18,13)],'U'); P.append(('U',18,12,1,1))
take([(8,12),(9,12),(8,13)],'T'); P.append(('T',8,12,0,1))
take([(10,12),(11,12),(11,13)],'T'); P.append(('T',10,12,0,-1))
# L slopes on the lobes
for x,r,d in [(1,14,-1),(6,14,1),(3,15,-1)]:
    take([(x+i,r) for i in range(3)],'L'); P.append(('L',x,r,0,d))
    xm=mir(x,3); take([(xm+i,r) for i in range(3)],'L'); P.append(('L',xm,r,0,-d))
# mudguards with a 1x2 on each wing
MUD=[(2,9),(13,11),(5,6),(9,4)]
for x,r in MUD:
    take([(x+i,r+j) for i in range(4) for j in range(2)],'M'); P.append(('M',x,r,0,1))
# headlights facing out
random.seed(SEED)
random.seed(SEED)
# four of the eight 1x6 bricks sit in the wall, front row
inw=[]
for _ in range(400):
    if len(inw)==4: break
    r=random.randint(1,12); x=random.randint(0,W-6)
    cells=[(x+i,r) for i in range(6)]
    if all(occ.get(c)=='.' for c in cells) and all(abs(r-q[1])>1 for q in inw):
        take(cells,'X'); inw.append((x,r)); P.append(('X',x,r,1,1))
if len(inw)<4: (print('FAIL1'),sys.exit(3))
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
cand=[q for q in runs_now() if 1<=q[0]<=13 and q[2]>=3]
random.shuffle(cand)
rows_used={}
for r,a,n in cand:
    if len(picks)>=16: break
    if rows_used.get(r,0)>=3: continue
    if n%2:
        o=random.randrange(0,n,2); new_=[(a+o,r)]
    else:
        if n<4 or len(picks)>14: continue
        ev=random.randrange(0,n-3,2); od=random.choice([q for q in range(ev+3,n,2)]); new_=[(a+ev,r),(a+od,r)]
    if all(abs(c[0]-p[0])+abs(c[1]-p[1])>1 for c in new_ for p in picks):
        picks+=new_; rows_used[r]=rows_used.get(r,0)+len(new_)
if len(picks)!=16: print('picks',len(picks)); (print('FAIL2'),sys.exit(3))
for x,r in picks:
    take([(x,r)],'E'); P.append(('E',x,r,1,'z'))
    if len(LIT)<5: LIT.add((x,r)); P.append(('O',x+.37,r,1.5175,'z'))
P.append(('P',7,6+2.8/1.2,-3.2,'tilt'))

plain=sum(1 for v in occ.values() if v=='.')
print('plain cells',plain,'need',88)
for r in range(15,-1,-1): print('%2d '%r+''.join(occ.get((x,r),' ') for x in range(W)))
if plain!=88: (print('FAIL3'),sys.exit(3))
need={4:11,2:17,1:10}
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
if odd>10 or (10-odd)%2: (print('FAIL4'),sys.exit(3))
left=dict(need); out=[]; segs=[]
for r,a,n in runs:
    if n%2:
        if random.random()<.5: out.append(('1',a,r,0,1)); segs.append([r,a+1,n-1])
        else: out.append(('1',a+n-1,r,0,1)); segs.append([r,a,n-1])
        left[1]-=1
    else: segs.append([r,a,n])
cap=[q[2]//4 for q in segs]
if sum(cap)>=left[4]:
    f=[0]*len(segs); todo=left[4]
    while todo:
        i=random.choice([j for j in range(len(segs)) if f[j]<cap[j]]); f[i]+=1; todo-=1
    pairs=left[1]//2; small=[]
    for i,(r,a,n) in enumerate(segs): small+= [i]*((n-4*f[i])//2)
    random.shuffle(small); pair_at=small[:pairs]
    for i,(r,a,n) in enumerate(segs):
        k2=(n-4*f[i])//2; kp=pair_at.count(i)
        items=['4']*f[i]+['2']*(k2-kp)+['11']*kp; random.shuffle(items); x=a
        for it in items:
            if it=='11': out+=[('1',x,r,0,1),('1',x+1,r,0,1)]; x+=2
            else: out.append((it,x,r,0,1)); x+=int(it)
    best=out
if not best: (print('FAIL5'),sys.exit(3))
tiles=[(k,x,r,random.choice([0,0,0,1]),d) for k,x,r,z,d in best]
P+=tiles
# three plates lie face up on the front studs of bricks that stand out
out_cells={(x+i,r) for k,x,r,z,d in tiles if z==1 for i in range(int(k))}
ups=[(x+i,r) for k,x,r,z,d in tiles if z==1 for i in range(int(k)) if (x+i,r+1) not in out_cells and occ.get((x+i,r+1)) not in ('M',) and occ.get((x+i,r+1))]
random.shuffle(ups); chosen=[]
for c in ups:
    if all(abs(c[0]-q[0])+abs(c[1]-q[1])>4 for q in chosen): chosen.append(c)
    if len(chosen)==3: break
if len(chosen)<3: (print('FAIL6'),sys.exit(3))
for x,r in chosen: P.append(('O',x+.37,r+1+(.1275-.58*1.2)/1.2,2.0,'up'))
# the two 1x4 bricks (the car's door tops) stand one stud proud of the face
flat=[(x,r) for (x,r),v in occ.items() if v=='.' and (x,r) not in out_cells]
fl=set(flat); spots=[(x,r) for x,r in flat if all((x+i,r) in fl for i in range(6)) and all((x+i,r-1) not in chosen for i in range(6)) and 2<=r<=13]
random.shuffle(spots); got=[]
for c in spots:
    if all(abs(c[1]-q[1])>1 for q in got): got.append(c)
    if len(got)==4: break
if len(got)<4: (print('FAIL7'),sys.exit(3))
for x,r in got: P.append(('X',x,r,2,1))
def js(p):
    k,x,y,z,d=p
    extra = ", t: -Math.PI / 2" if d=='z' else ", t: -Math.PI / 2, tilt: -Math.PI / 2" if d=='up' else (", tilt: Math.PI / 2" if d=='tilt' else (", d: -1" if d==-1 else ""))
    return "{ k: '%s', x: %s, y: %s, z: %s%s }"%(k,round(x,4),round(y,4),z,extra)
open('heart2.js','w').write(",\n      ".join(", ".join(js(p) for p in P[i:i+4]) for i in range(0,len(P),4)))
from collections import Counter
print(Counter(p[0] for p in P), len(P))
