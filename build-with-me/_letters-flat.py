"""Flat candidates: letters solved from the car's exact set of pieces, drawn as two layers (front row, back row).
Grid: 1 stud wide = 20, 1 brick tall = 24. Every piece is 2 studs deep unless noted (headlight brick, 1x6, half slopes: front row only)."""
import random, sys

SET = {'8': 2, '6': 2, '4': 5, '2': 18, '1': 6, 'X': 2, 'E': 18, 'M': 4, 'J': 6, 'L': 6, 'T': 2, 'U': 2}

SHAPES = {
 'R': """
##############....
################..
################..
#####.....######..
#####.....######..
#####.....######..
################..
###############...
#####..######.....
#####...######....
#####....######...
#####.....######..
#####......######.
#####.......######
""",
 'H': """
.####.........####.
######.......######
######.......######
######.......######
######.......######
###################
###################
###################
######.......######
######.......######
######.......######
######.......######
######.......######
.####.........####.
""",
 'n': """
######..########...
#################..
###################
###################
#######.....#######
######.......######
######.......######
######.......######
######.......######
######.......######
######.......######
######.......######
.#####.......#####.
""",
 'C': """
....###########....
..###############..
.#################.
###################
#######.....#######
######.......######
######.............
######.............
######.............
######.......######
#######.....#######
###################
.#################.
..###############..
....###########....
""",
}


def solve(name, seed):
    random.seed(seed)
    rows = [l for l in SHAPES[name].strip('\n').split('\n')]
    H = len(rows); W = max(len(l) for l in rows)
    B = {(x, H - 1 - i) for i, l in enumerate(rows) for x, ch in enumerate(l) if ch == '#'}
    occ = {c: '.' for c in B}
    P = []   # (kind, x, r, layer, dir)   layer: 'both' | 'front'
    f = lambda x, r: (x, r) in B

    def free(cells): return all(occ.get(c) == '.' for c in cells)
    def take(cells, ch):
        for c in cells: occ[c] = ch

    # corner sites
    J, T, L = [], [], []
    for (c, r) in B:
        if not f(c - 1, r) and f(c - 1, r + 1) and f(c, r + 1): J.append(('J', c - 1, r, -1, [(c, r), (c - 1, r + 1), (c, r + 1)]))
        if not f(c + 1, r) and f(c, r + 1) and f(c + 1, r + 1): J.append(('J', c, r, 1, [(c, r), (c, r + 1), (c + 1, r + 1)]))
        if f(c + 1, r) and f(c + 1, r + 1) and not f(c, r + 1) and not f(c + 1, r + 2): T.append(('T', c, r, -1, [(c, r), (c + 1, r), (c + 1, r + 1)]))
        if f(c + 1, r) and f(c, r + 1) and not f(c + 1, r + 1) and not f(c, r + 2): T.append(('T', c, r, 1, [(c, r), (c + 1, r), (c, r + 1)]))
        if f(c + 1, r) and f(c + 2, r):
            if not f(c, r + 1) and not f(c + 1, r + 1) and (not f(c - 1, r) or f(c + 2, r + 1)): L.append(('L', c, r, -1, [(c, r), (c + 1, r), (c + 2, r)]))
            if not f(c + 1, r + 1) and not f(c + 2, r + 1) and (not f(c + 3, r) or f(c, r + 1)): L.append(('L', c, r, 1, [(c, r), (c + 1, r), (c + 2, r)]))
    used = {'J': 0, 'T': 0, 'L': 0}
    for sites, cap in ((J, 6), (T, 3), (L, 6)):
        random.shuffle(sites)
        for k, x, r, d, cells in sites:
            if used[k] < cap and free(cells):
                kk = k
                if k == 'T' and used['T'] == 2: kk = 'U'       # third tall site: the two half-deep slopes, one behind the other
                take(cells, kk); P.append((kk, x, r, 'both', d)); used[k] += 1
    # mudguards
    nM = 0
    for _ in range(2000):
        if nM == 4: break
        x, r = random.randint(0, W - 4), random.randint(0, H - 2)
        cells = [(x + i, r + j) for i in range(4) for j in range(2)]
        if free(cells) and all(abs(x - q[1]) > 4 or abs(r - q[2]) > 1 for q in P if q[0] == 'M'):
            take(cells, 'M'); P.append(('M', x, r, 'both', 1)); nM += 1
    if nM < 4: return None
    # long bricks
    rows_used = []
    for kind, n, lay in [('8', 8, 'both'), ('8', 8, 'both'), ('6', 6, 'both'), ('6', 6, 'both'), ('X', 6, 'front'), ('X', 6, 'front')]:
        ok = False
        for _ in range(600):
            r = random.randint(0, H - 1); x = random.randint(0, W - n)
            cells = [(x + i, r) for i in range(n)]
            if free(cells) and (r not in rows_used or _ > 300):
                take(cells, kind); P.append((kind, x, r, lay, 1)); rows_used.append(r); ok = True; break
        if not ok: return None

    def runs():
        out = []
        for r in range(H):
            x = 0
            while x < W:
                if occ.get((x, r)) == '.':
                    a = x
                    while occ.get((x, r)) == '.': x += 1
                    out.append((r, a, x - a))
                else: x += 1
        return out
    # headlight bricks: placed so the gaps between them stay even
    cand = runs(); random.shuffle(cand); nE = 0; per_row = {}
    for r, a, n in cand:
        if nE >= 18: break
        if per_row.get(r, 0) >= 4: continue
        if n % 2: new = [a + random.randrange(0, n, 2)]
        else:
            if n < 2 or nE > 16: continue
            ev = random.randrange(0, n - 1, 2); new = [a + ev, a + random.choice(range(ev + 1, n, 2))]
        for x in new: take([(x, r)], 'E'); P.append(('E', x, r, 'front', 1))
        nE += len(new); per_row[r] = per_row.get(r, 0) + len(new)
    if nE != 18: return None
    # plain bricks
    rs = runs(); odd = sum(1 for q in rs if q[2] % 2)
    if odd > 6: return None
    segs = []; tiles = []
    for r, a, n in rs:
        if n % 2:
            if random.random() < .5: tiles.append(('1', a, r)); segs.append([r, a + 1, n - 1])
            else: tiles.append(('1', a + n - 1, r)); segs.append([r, a, n - 1])
        else: segs.append([r, a, n])
    S = sum(q[2] for q in segs); cap = [q[2] // 4 for q in segs]; best = None
    for nf in range(min(5, sum(cap)), -1, -1):
        for p in range(0, (6 - odd) // 2 + 1):
            t = (S - 4 * nf - 2 * p) / 2
            if t == int(t) and 0 <= t <= 18: best = (nf, int(t), p); break
        if best: break
    if not best: return None
    nf, t, p = best
    fs = [0] * len(segs); todo = nf
    while todo:
        i = random.choice([j for j in range(len(segs)) if fs[j] < cap[j]]); fs[i] += 1; todo -= 1
    small = []
    for i, (r, a, n) in enumerate(segs): small += [i] * ((n - 4 * fs[i]) // 2)
    random.shuffle(small); pair_at = small[:p]
    for i, (r, a, n) in enumerate(segs):
        k2 = (n - 4 * fs[i]) // 2; kp = pair_at.count(i)
        items = ['4'] * fs[i] + ['2'] * (k2 - kp) + ['11'] * kp; random.shuffle(items); x = a
        for it in items:
            if it == '11': tiles += [('1', x, r), ('1', x + 1, r)]; x += 2
            else: tiles.append((it, x, r)); x += int(it)
    for k, x, r in tiles: P.append((k, x, r, 'both', 1))
    count = {}
    for q in P: count[q[0]] = count.get(q[0], 0) + (2 if q[0] == 'U' else 1)
    spare = {k: SET[k] - count.get(k, 0) for k in SET if SET[k] - count.get(k, 0)}
    return dict(name=name, W=W, H=H, P=P, occ=occ, spare=spare, seed=seed)


C_BRICK, C_LONG, C_HEAD, C_SLOPE, C_CLEAR, C_MUD, INK = '#e8402f', '#c9281b', '#f6a79d', '#ff7a55', '#bfe3f5', '#a81f14', '#4a0d07'


def draw(sol, X0, Y0, layer):
    W, H = sol['W'], sol['H']; o = []
    def px(x): return X0 + x * 20
    def py(r): return Y0 + (H - 1 - r) * 24            # top of row r
    def rect(x, r, n, fill, studs=True, cls=''):
        s = '<rect x="%g" y="%g" width="%g" height="24" fill="%s" stroke="%s" stroke-width="1"/>' % (px(x), py(r), n * 20, fill, INK)
        if studs: s += ''.join('<rect x="%g" y="%g" width="12" height="4" fill="%s" stroke="%s" stroke-width=".6"/>' % (px(x + i) + 4, py(r) - 4, fill, INK) for i in range(n))
        return s
    def poly(pts, fill): return '<polygon points="%s" fill="%s" stroke="%s" stroke-width="1"/>' % (' '.join('%g,%g' % p for p in pts), fill, INK)
    def empty(x, r, n, h=1): return '<rect x="%g" y="%g" width="%g" height="%g" fill="none" stroke="#999" stroke-width=".8" stroke-dasharray="3 3"/>' % (px(x), py(r + h - 1), n * 20, h * 24)
    for k, x, r, lay, d in sorted(sol['P'], key=lambda q: -q[2]):
        x0, yb, yt1, yt2 = px(x), py(r) + 24, py(r), py(r + 1)
        back_only_empty = lay == 'front' and layer == 'back'
        if k in '1248' or k == '6':
            o.append(rect(x, r, int(k), C_LONG if k in '68' else C_BRICK))
        elif k == 'X':
            o.append(empty(x, r, 6) if back_only_empty else rect(x, r, 6, C_LONG))
        elif k == 'E':
            if back_only_empty: o.append(empty(x, r, 1))
            else: o.append(rect(x, r, 1, C_HEAD) + '<circle cx="%g" cy="%g" r="6" fill="none" stroke="%s" stroke-width="1"/>' % (x0 + 10, yt1 + 10, INK))
        elif k == 'M':
            o.append('<rect x="%g" y="%g" width="80" height="48" fill="%s" stroke="%s" stroke-width="1"/>' % (x0, yt2, C_MUD, INK))
            if layer == 'front': o.append('<path d="M%g %g v-8 a33 36 0 0 1 66 0 v8" fill="#2a0603" stroke="#ffb3a6" stroke-width="2.5"/>' % (x0 + 7, yb))
        elif k == 'J':
            fill = C_SLOPE
            o.append(poly([(x0, yb), (x0 + 20, yb), (x0 + 40, yt2 + 6), (x0 + 40, yt2), (x0, yt2)] if d > 0 else
                          [(x0 + 40, yb), (x0 + 20, yb), (x0, yt2 + 6), (x0, yt2), (x0 + 40, yt2)], fill))
        elif k in 'TU':
            fill = C_CLEAR if k == 'T' else C_SLOPE
            o.append(poly([(x0, yb), (x0 + 40, yb), (x0 + 40, yt2), (x0 + 20, yt2), (x0, yb - 6)] if d < 0 else
                          [(x0, yb), (x0 + 40, yb), (x0 + 40, yb - 6), (x0 + 20, yt2), (x0, yt2)], fill))
        elif k == 'L':
            o.append(poly([(x0, yb), (x0 + 60, yb), (x0 + 60, yt1), (x0 + 40, yt1), (x0, yb - 6)] if d < 0 else
                          [(x0, yb), (x0 + 60, yb), (x0 + 60, yb - 6), (x0 + 20, yt1), (x0, yt1)], C_SLOPE))
    return ''.join(o)


def main():
    out = []; y = 150; maxw = 0
    for name in ['R', 'H', 'n', 'C']:
        sol = None
        for seed in range(1, 4000):
            sol = solve(name, seed)
            if sol: break
        if not sol: print(name, 'NO SOLUTION'); continue
        W, H = sol['W'], sol['H']
        print(name, 'seed', sol['seed'], 'spare', sol['spare'])
        for r in range(H - 1, -1, -1): print('  ' + ''.join(sol['occ'].get((x, r), ' ') for x in range(W)))
        pw = W * 20; xf, xb = 150, 150 + pw + 80
        out.append('<g id="%s">' % name)
        out.append('<text x="40" y="%d" font-family="Helvetica" font-size="72" font-weight="bold" fill="#111">%s</text>' % (y + 70, name))
        out.append('<text x="%d" y="%d" font-family="Helvetica" font-size="11" fill="#555">FRONT ROW</text><text x="%d" y="%d" font-family="Helvetica" font-size="11" fill="#555">BACK ROW</text>' % (xf, y - 12, xb, y - 12))
        out.append('<g id="%s-front">%s</g><g id="%s-back">%s</g>' % (name, draw(sol, xf, y, 'front'), name, draw(sol, xb, y, 'back')))
        sp = ', '.join('%d × %s' % (v, {'8': '2×8', '6': '2×6', '4': '2×4', '2': '2×2', '1': '1×2', 'X': '1×6', 'E': 'headlight brick', 'J': 'inverted slope', 'L': 'slope 3×2', 'T': 'clear slope', 'U': 'half slope', 'M': 'mudguard'}[k]) for k, v in sol['spare'].items()) or 'none'
        out.append('<text x="%d" y="%d" font-family="Helvetica" font-size="12" fill="#111">%d studs wide × %d bricks tall. Left over from the set: %s</text>' % (xf, y + H * 24 + 22, W, H, sp))
        out.append('</g>')
        maxw = max(maxw, xb + pw); y += H * 24 + 110
    legend = [(C_BRICK, 'brick, 2 deep'), (C_LONG, '2×6, 2×8, 1×6'), (C_HEAD, 'headlight brick, front row only'), (C_SLOPE, 'slope or inverted slope'), (C_CLEAR, 'clear windshield slope'), (C_MUD, 'mudguard')]
    lg = ''.join('<rect x="%d" y="62" width="22" height="14" fill="%s" stroke="%s"/><text x="%d" y="74" font-family="Helvetica" font-size="12" fill="#111">%s</text>' % (40 + i * 215, c, INK, 68 + i * 215, t) for i, (c, t) in enumerate(legend))
    head = ('<text x="40" y="34" font-family="Helvetica" font-size="20" font-weight="bold" fill="#111">build-with-me: letter candidates from the car’s pieces</text>'
            '<text x="40" y="52" font-family="Helvetica" font-size="12" fill="#555">Side on, 1 stud = 20 wide, 1 brick = 24 tall. Two layers per letter. Dashed boxes in the back row are empty: the piece in front is only one stud deep. Wheels roll away; light plates and the roof plate are not drawn.</text>')
    Wd = max(maxw + 60, 1340)
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d"><rect width="100%%" height="100%%" fill="#fff"/>%s%s%s</svg>' % (Wd, y, Wd, y, head, lg, ''.join(out))
    open(sys.argv[1], 'w').write(svg)


main()
