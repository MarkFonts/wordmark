import random, json, sys
W=20
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
MUD=[(2,9),(14,9),(6,5),(10,5)]
for x,r in MUD:
    take([(x+i,r+j) for i in range(4) for j in range(2)],'M'); P.append(('M',x,r,0,1))
    P.append(('1',x,r+1,0,1)); P.append(('1',x+3,r+1,0,1))
    P.append(('W',x+.5,r-.958,2,1)); P.append(('H',x+1.2,r-.375,3.1,1))
# headlights facing out
for x,r in [(8,8),(9,8),(10,8),(11,8),(8,10),(9,10),(10,10),(11,10)]:
    take([(x,r)],'E'); P.append(('E',x,r,1,'z')); P.append(('O',x+.37,r,1.5175,'z'))
P.append(('P',7,6+2.8/1.2,-3.2,'tilt'))
plain=sum(1 for v in occ.values() if v=='.')
print('plain cells',plain,'need',126)
for r in range(15,-1,-1): print('%2d '%r+''.join(occ.get((x,r),' ') for x in range(W)))
if plain!=126: sys.exit()
need={4:21,2:16,1:10}
runs=[]
for r in range(16):
    x=0
    while x<W:
        if occ.get((x,r))=='.':
            a=x
            while occ.get((x,r))=='.': x+=1
            runs.append((r,a,x-a))
        else: x+=1
random.seed(7)
best=None
for attempt in range(20000):
    left=dict(need); out=[]; ok=True
    for r,a,n in random.sample(runs,len(runs)):
        x=a
        while n>0:
            opts=[k for k in (4,2,1) if k<=n and left[k]>0]
            if not opts: ok=False;break
            k=random.choices(opts,[ {4:8,2:3,1:1}[o] for o in opts])[0]
            out.append((str(k),x,r,0,1)); left[k]-=1; x+=k; n-=k
        if not ok: break
    if ok and all(v==0 for v in left.values()): best=out;break
assert best, 'no tiling'
P+=best
def js(p):
    k,x,y,z,d=p
    extra = ", t: -Math.PI / 2" if d=='z' else (", tilt: Math.PI / 2" if d=='tilt' else (", d: -1" if d==-1 else ""))
    return "{ k: '%s', x: %s, y: %s, z: %s%s }"%(k,round(x,4),round(y,4),z,extra)
open('heart2.js','w').write(",\n      ".join(", ".join(js(p) for p in P[i:i+4]) for i in range(0,len(P),4)))
from collections import Counter
print(Counter(p[0] for p in P), len(P))
