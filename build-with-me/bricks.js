/* build-with-me hero: low-poly construction bricks, isometric, WebGL2, no libraries.
   One set of 36 pieces is taken apart and rebuilt into the next thing, forever: a car, a bold
   single-story a, a heart. Every build uses every piece; none fades, shrinks or changes color.
   A piece is [layer, slot, x, kind, dir, color]: a slot is 2 studs deep; kind is a brick's
   length (1, 2, 4) or 'S' (2×2 slope) or 'I' (2×2 inverted slope); dir says which way a slope
   faces (+1: the sloped half is on the +x side). Only the car names colors: the a and the heart
   are patchwork, each piece arriving in whatever color it has. build-with-me's models were
   generated and checked to be the same set; the engine throws if they ever are not. */
(function () {
  'use strict';
  var canvas = document.getElementById('bricks');
  if (!canvas) return;
  var gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) { document.documentElement.classList.add('no-webgl'); return; }

  var H = 1.2;                    // brick height in stud units
  var PLATE_X = 24, PLATE_Z = 10; // baseplate, studs
  var P = 7.6;                    // seconds per build
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var light = matchMedia('(prefers-color-scheme: light)');

  /* ── models ─────────────────────────────────────────── */
  // the car is Mark's Illustrator side view (edit car.svg), 20 studs long, pulled three slots deep.
  // a piece here is {k: kind, x, y (in bricks), z (in studs), d: dir, c: color}
  function carPieces() {
    var p = [];
    function add(k, x, y, z, d, c) { p.push({ k: k, x: x, y: y, z: z, d: d || 1, c: c || 'R' }); }
    [0, 2, 4].forEach(function (z) {
      var mid = z === 2;
      add('J', 0, 0, z, -1); add('J', 18, 0, z, 1);                    // bumpers: tall inverted slopes
      if (mid) {
        // only the axle blocks: the middle of the car is hollow where nothing shows
        [0, 1].forEach(function (y) { [2, 4, 14, 16].forEach(function (x) { add('2', x, y, z); }); });
      } else {
        var md = z === 0 ? -1 : 1; add('M', 2, 0, z, md); add('M', 14, 0, z, md);
        // the doors: two 2×4s along the bottom; a 2×2, a 2×4, and a 2×2 above them, so the seams are staggered
        add('4', 6, 0, z); add('4', 10, 0, z); add('2', 6, 1, z); add('4', 8, 1, z); add('2', 12, 1, z);
      }
      add('1', 1, 2, z); add('2', 2, 2, z);
      // the hood: four 2×4s and two 2×2s, the middle lane running from under the windshield to the nose
      if (mid) { p.push({ k: '4', x: 5, y: 2, z: 2, d: 1, c: 'R', t: Math.PI / 2 }); add('4', 12, 2, z); add('4', 16, 2, z); }   // the first 2×4 lies across the car under the fastback
      else {
        add('2', 13, 2, z); add('4', 15, 2, z);                                                            // the beltline: a 1×6 along the outside, 1×2s lengthwise behind it
        add('1', 4, 2, z); add('X', 5, 2, z ? 5 : 0);
        // nothing behind the beltline: the cabin is open
      }                // no floor where the seats would be
      if (mid) add('1', 0, 2, z);
      else [0, 1].forEach(function (dz) {
        add('E', 0, 2, z + dz, -1); add('E', 19, 2, z + dz, 1);
        add('O', -.145, 2, z + dz, 1, 'B'); add('O', 19.89, 2, z + dz, 1, 'B');   // a blue round 1×1 plate pressed onto each side stud
      });
      add('L', 2, 3, z, -1); add('2', 5, 3, z); if (z < 4) add('T', 11, 3, z + 1, 1, 'C'); else { add('U', 11, 3, 0, 1); add('U', 11, 3, 5, 1); }   // clear windshield, a red 1×2 pillar each side  // fastback, windshield
      add('L', 4, 4, z, -1);
    });
    // eight more headlight bricks inside the cabin, on its back and front walls, studs facing in
    // everything under the windshield is headlight bricks, studs facing back into the cabin: twelve of them
    [11, 12].forEach(function (x) { [0, 1, 2, 3, 4, 5].forEach(function (z) { if (x === 11 || z < 2 || z > 3) add('E', x, 2, z, -1); }); });
    add('P', 6, 5, 0);                                                  // roof
    [4, 16].forEach(function (x) { [[-.35, -.47], [4.95, 6.35]].forEach(function (zz) {
      add('W', x - 1.5, -1 + .04, zz[0], 1, 'K'); add('H', x - .8, -1 + .625, zz[1], 1, 'G');
    }); });
    return p;
  }
  var MODELS = { car: { w: 20, slots: 3, lift: 1, pieces: carPieces() },
    // the heart: generated (design/heart2.py) from the car's exact pieces, one slot deep
    heart: { w: 20, slots: 1, pieces: [
      { k: 'J', x: 7, y: 1, z: 0, d: -1 }, { k: 'J', x: 11, y: 1, z: 0 }, { k: 'J', x: 5, y: 3, z: 0, d: -1 }, { k: 'J', x: 13, y: 3, z: 0 },
      { k: 'J', x: 3, y: 5, z: 0, d: -1 }, { k: 'J', x: 15, y: 5, z: 0 }, { k: 'U', x: 1, y: 12, z: 1, d: -1 }, { k: 'U', x: 17, y: 12, z: 1 },
      { k: 'T', x: 8, y: 12, z: 0 }, { k: 'T', x: 10, y: 12, z: 0, d: -1 }, { k: 'L', x: 2, y: 14, z: 0, d: -1 }, { k: 'L', x: 15, y: 14, z: 0 },
      { k: 'L', x: 6, y: 14, z: 0 }, { k: 'L', x: 11, y: 14, z: 0, d: -1 }, { k: 'L', x: 3, y: 15, z: 0, d: -1 }, { k: 'L', x: 14, y: 15, z: 0 },
      { k: 'M', x: 2, y: 9, z: 0 }, { k: 'M', x: 13, y: 11, z: 0 }, { k: 'M', x: 5, y: 6, z: 0 }, { k: 'M', x: 9, y: 4, z: 0 },
      { k: 'X', x: 7, y: 11, z: 1 }, { k: 'X', x: 7, y: 3, z: 1 }, { k: 'E', x: 9, y: 1, z: 1, t: -Math.PI / 2 }, { k: 'O', x: 9.37, y: 1, z: 1.5175, t: -Math.PI / 2 },
      { k: 'E', x: 10, y: 1, z: 1, t: -Math.PI / 2 }, { k: 'O', x: 10.37, y: 1, z: 1.5175, t: -Math.PI / 2 }, { k: 'E', x: 10, y: 9, z: 1, t: -Math.PI / 2 }, { k: 'O', x: 10.37, y: 9, z: 1.5175, t: -Math.PI / 2 },
      { k: 'E', x: 3, y: 13, z: 1, t: -Math.PI / 2 }, { k: 'O', x: 3.37, y: 13, z: 1.5175, t: -Math.PI / 2 }, { k: 'E', x: 3, y: 11, z: 1, t: -Math.PI / 2 }, { k: 'O', x: 3.37, y: 11, z: 1.5175, t: -Math.PI / 2 },
      { k: 'E', x: 6, y: 11, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 11, y: 7, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 7, y: 12, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 12, y: 10, z: 1, t: -Math.PI / 2 },
      { k: 'E', x: 16, y: 13, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 7, y: 5, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 8, y: 5, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 7, y: 4, z: 1, t: -Math.PI / 2 },
      { k: 'E', x: 8, y: 4, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 12, y: 12, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 11, y: 6, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 14, y: 6, z: 1, t: -Math.PI / 2 },
      { k: 'E', x: 1, y: 10, z: 1, t: -Math.PI / 2 }, { k: 'P', x: 7, y: 8.3333, z: -3.2, tilt: Math.PI / 2 }, { k: '1', x: 2, y: 7, z: 0 }, { k: '1', x: 1, y: 9, z: 1 },
      { k: '1', x: 5, y: 14, z: 0 }, { k: '1', x: 14, y: 14, z: 1 }, { k: '1', x: 6, y: 15, z: 0 }, { k: '1', x: 13, y: 15, z: 1 },
      { k: '2', x: 1, y: 11, z: 0 }, { k: '2', x: 1, y: 8, z: 0 }, { k: '4', x: 3, y: 8, z: 0 }, { k: '4', x: 7, y: 8, z: 0 },
      { k: '4', x: 11, y: 8, z: 0 }, { k: '4', x: 15, y: 8, z: 1 }, { k: '4', x: 13, y: 10, z: 0 }, { k: '2', x: 17, y: 10, z: 0 },
      { k: '4', x: 12, y: 7, z: 0 }, { k: '2', x: 16, y: 7, z: 1 }, { k: '2', x: 3, y: 7, z: 1 }, { k: '2', x: 13, y: 5, z: 1 },
      { k: '2', x: 4, y: 11, z: 0 }, { k: '2', x: 12, y: 6, z: 1 }, { k: '4', x: 6, y: 10, z: 1 }, { k: '2', x: 10, y: 10, z: 0 },
      { k: '4', x: 11, y: 9, z: 0 }, { k: '4', x: 15, y: 9, z: 1 }, { k: '4', x: 3, y: 12, z: 0 }, { k: '2', x: 5, y: 5, z: 0 },
      { k: '2', x: 17, y: 11, z: 0 }, { k: '4', x: 12, y: 13, z: 0 }, { k: '2', x: 4, y: 13, z: 0 }, { k: '2', x: 6, y: 13, z: 0 },
      { k: '2', x: 9, y: 7, z: 1 }, { k: '2', x: 9, y: 2, z: 0 }, { k: '2', x: 6, y: 9, z: 1 }, { k: '2', x: 8, y: 9, z: 0 },
      { k: '2', x: 9, y: 6, z: 0 }, { k: '2', x: 9, y: 0, z: 1 }, { k: 'O', x: 12.37, y: 6.5263, z: 2.0, t: -Math.PI / 2, tilt: -Math.PI / 2 }, { k: 'O', x: 3.37, y: 7.5263, z: 2.0, t: -Math.PI / 2, tilt: -Math.PI / 2 },
      { k: 'O', x: 9.37, y: 0.5262, z: 2.0, t: -Math.PI / 2, tilt: -Math.PI / 2 }, { k: '2', x: 10, y: 8, z: 2 }] },
    // a bold single-story a, solved flat (_letters-flat.py) from the same pieces; what it has no room for stands behind it
    a: { w: 18, slots: 1, pieces: [
      { k: 'J', x: 4, y: 8, z: 0 }, { k: 'J', x: 0, y: 1, z: 0, d: -1 }, { k: 'J', x: 11, y: 9, z: 0, d: -1 }, { k: 'J', x: 2, y: 0, z: 0, d: -1 },
      { k: 'J', x: 10, y: 0, z: 0 }, { k: 'J', x: 12, y: 0, z: 0, d: -1 }, { k: 'T', x: 2, y: 11, z: 0, d: -1 }, { k: 'T', x: 5, y: 2, z: 0 },
      { k: 'U', x: 10, y: 11, z: 1 }, { k: 'U', x: 10, y: 11, z: 0 }, { k: 'L', x: 10, y: 2, z: 0, d: -1 }, { k: 'L', x: 13, y: 12, z: 0, d: -1 },
      { k: 'M', x: 4, y: 11, z: 0 }, { k: 'M', x: 12, y: 3, z: 0 }, { k: 'M', x: 14, y: 5, z: 0 }, { k: 'M', x: 0, y: 8, z: 0 },
      { k: 'X', x: 3, y: 10, z: 1 }, { k: 'X', x: 12, y: 11, z: 1 }, { k: 'E', x: 14, y: 0, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 15, y: 0, z: 1, t: -Math.PI / 2 },
      { k: 'E', x: 0, y: 10, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 16, y: 4, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 17, y: 4, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 2, y: 7, z: 1, t: -Math.PI / 2 },
      { k: 'E', x: 4, y: 2, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 8, y: 12, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 9, y: 12, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 9, y: 10, z: 1, t: -Math.PI / 2 },
      { k: 'E', x: 10, y: 10, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 2, y: 4, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 8, y: 0, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 9, y: 0, z: 1, t: -Math.PI / 2 },
      { k: 'E', x: 4, y: 3, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 1, y: 11, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 15, y: 2, z: 1, t: -Math.PI / 2 }, { k: 'E', x: 13, y: 9, z: 1, t: -Math.PI / 2 },
      { k: '1', x: 7, y: 2, z: 0 }, { k: '1', x: 0, y: 5, z: 0 }, { k: '1', x: 4, y: 6, z: 0 }, { k: '1', x: 17, y: 10, z: 0 },
      { k: '4', x: 4, y: 0, z: 0 }, { k: '2', x: 16, y: 0, z: 0 }, { k: '2', x: 4, y: 1, z: 0 }, { k: '4', x: 6, y: 1, z: 0 },
      { k: '4', x: 14, y: 1, z: 0 }, { k: '2', x: 2, y: 2, z: 0 }, { k: '2', x: 8, y: 2, z: 0 }, { k: '2', x: 13, y: 2, z: 0 },
      { k: '2', x: 16, y: 2, z: 0 }, { k: '4', x: 0, y: 3, z: 0 }, { k: '2', x: 16, y: 3, z: 0 }, { k: '2', x: 0, y: 4, z: 0 },
      { k: '2', x: 3, y: 4, z: 0 }, { k: '4', x: 1, y: 5, z: 0 }, { k: '2', x: 12, y: 5, z: 0 }, { k: '4', x: 0, y: 6, z: 0 },
      { k: '2', x: 12, y: 6, z: 0 }, { k: '2', x: 0, y: 7, z: 0 }, { k: '2', x: 3, y: 7, z: 0 }, { k: '4', x: 12, y: 7, z: 0 },
      { k: '2', x: 16, y: 7, z: 0 }, { k: '4', x: 12, y: 8, z: 0 }, { k: '2', x: 16, y: 8, z: 0 }, { k: '4', x: 14, y: 9, z: 0 },
      { k: '2', x: 1, y: 10, z: 0 }, { k: '4', x: 13, y: 10, z: 0 }, { k: '2', x: 8, y: 11, z: 0 }, { k: '2', x: 16, y: 12, z: 0 },
      { k: 'O', x: 10.37, y: 10, z: 1.5175, t: -Math.PI / 2 }, { k: 'O', x: 2.37, y: 7, z: 1.5175, t: -Math.PI / 2 }, { k: 'O', x: 15.37, y: 2, z: 1.5175, t: -Math.PI / 2 }, { k: 'O', x: 13.37, y: 9, z: 1.5175, t: -Math.PI / 2 },
      { k: 'O', x: 9.37, y: 10, z: 1.5175, t: -Math.PI / 2 }, { k: 'O', x: 14.37, y: 0, z: 1.5175, t: -Math.PI / 2 }, { k: 'O', x: 1.37, y: 11, z: 1.5175, t: -Math.PI / 2 }, { k: 'O', x: 4.37, y: 3, z: 1.5175, t: -Math.PI / 2 },
      { k: 'P', x: 6, y: 6.3333, z: -3.2, tilt: Math.PI / 2 }, { k: '4', x: 4, y: 11, z: -2 }, { k: '2', x: 3, y: 5, z: -2 }, { k: '2', x: 0, y: 10, z: -2 },
      { k: '1', x: 17, y: 0, z: -2 }, { k: '1', x: 12, y: 10, z: -2 }, { k: 'L', x: 0, y: 8, z: -2 }, { k: 'L', x: 15, y: 8, z: -2 },
      { k: 'L', x: 7, y: 10, z: -2 }, { k: 'L', x: 3, y: 2, z: -2 }] } };
  var LOOP = ['car', 'a', 'heart'];
  var NAMES = LOOP;
  var KINDS = ['1', '2', '4', 'X', 'L', 'J', 'E', 'P', 'M', 'W', 'H', 'U', 'O', 'T'];   // T is clear: drawn last

  function hex(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }
  function colors() {
    return {
      key: { R: hex('#e8402f'), B: hex('#ffd21f'), Y: hex(light.matches ? '#f2c200' : '#ffd92e'), C: hex('#cfeaff'), K: hex(light.matches ? '#1c1c20' : '#34343c'), G: hex('#c9ccd2') },
      plate: hex(light.matches ? '#dfe5ec' : '#202020')
    };
  }
  var COL = colors();

  function place(m) {
    var x0 = Math.floor((PLATE_X - m.w) / 2), z0 = (PLATE_Z - m.slots * 2) / 2;
    return m.pieces.map(function (q) {
      return { kind: q.k, x: x0 + q.x, y: (q.y + (m.lift || 0)) * H, z: z0 + q.z, turn: q.t !== undefined ? q.t : q.d < 0 ? Math.PI : 0, tilt: q.tilt || 0, c: q.c };
    });
  }
  var TILED = {}; NAMES.forEach(function (k) { TILED[k] = place(MODELS[k]); });

  // the pool is the car's pieces: each keeps its kind and its color for good
  function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  var pool = {}; KINDS.forEach(function (k) { pool[k] = []; });
  TILED.car.forEach(function (b, i) {
    var seed = i + 2;
    pool[b.kind].push({
      c: b.c,
      hx: 1 + rnd(seed + .1) * (PLATE_X - 6), hy: 21 + rnd(seed + .2) * 2.6, hz: 1 + rnd(seed + .3) * (PLATE_Z - 4),
      yaw: (rnd(seed + .4) - .5) * 2.4, ph: rnd(seed + .5) * 6.28,
      pose: {}
    });
  });
  NAMES.forEach(function (k, m) {
    var t = TILED[k], maxY = 0;
    t.forEach(function (b) { maxY = Math.max(maxY, b.y); });
    var order = t.slice().sort(function (a, b) { return a.y - b.y || a.z - b.z || a.x - b.x; });
    order.forEach(function (b, i) {
      b.land = order.length > 1 ? i / (order.length - 1) : 0;
      b.leave = maxY ? (1 - b.y / maxY) * .8 + rnd(i + m * 31) * .2 : 0;
    });
    KINDS.forEach(function (kind) {
      if (k !== 'car' && (kind === 'W' || kind === 'H' || kind === 'P')) {     // wheels roll off the plate and wait; the roof flies up out of sight
        pool[kind].forEach(function (b) { var c = b.pose.car; b.pose[k] = { x: c.x + (kind === 'P' ? 0 : 34), y: c.y + (kind === 'P' ? 46 : 0), z: c.z, turn: c.turn, tilt: 0, land: 0, leave: 0 }; });
        return;
      }
      var free = pool[kind].slice(), want = order.filter(function (b) { return b.kind === kind; });
      if (want.length !== free.length) throw new Error('bricks: ' + k + ' uses ' + want.length + ' of kind ' + kind + ', the set has ' + free.length);
      // the car says which color goes where; the others take the pieces as they come, shuffled per build
      if (k !== 'car') { var r = (m * 5 + 2) % free.length; free = free.slice(r).concat(free.slice(0, r)); }
      want.forEach(function (b) {
        var at = 0;
        if (b.c) { at = -1; for (var q = 0; q < free.length; q++) if (free[q].c === b.c) { at = q; break; } }
        if (at < 0) throw new Error('bricks: ' + k + ' wants a ' + b.c + ' piece of kind ' + kind + ' the set does not have');
        free.splice(at, 1)[0].pose[k] = b;
      });
    });
  });

  /* ── geometry ───────────────────────────────────────── */
  function box(v, x0, y0, z0, x1, y1, z1) {
    function q(a, b, c, d, nx, ny, nz) { [a, b, c, a, c, d].forEach(function (p) { v.push(p[0], p[1], p[2], nx, ny, nz); }); }
    var A = [x0, y0, z0], B = [x1, y0, z0], C = [x1, y1, z0], D = [x0, y1, z0], E = [x0, y0, z1], F = [x1, y0, z1], G = [x1, y1, z1], Hh = [x0, y1, z1];
    q(E, F, G, Hh, 0, 0, 1); q(B, A, D, C, 0, 0, -1); q(F, B, C, G, 1, 0, 0); q(A, E, Hh, D, -1, 0, 0); q(Hh, G, C, D, 0, 1, 0); q(A, B, F, E, 0, -1, 0);
  }
  function stud(v, cx, y, cz) {
    var S = 8, r = .3, h = .2;
    for (var i = 0; i < S; i++) {
      var a0 = i / S * 6.2832, a1 = (i + 1) / S * 6.2832, am = (a0 + a1) / 2;
      var x0 = cx + Math.cos(a0) * r, z0 = cz + Math.sin(a0) * r, x1 = cx + Math.cos(a1) * r, z1 = cz + Math.sin(a1) * r;
      var nx = Math.cos(am), nz = Math.sin(am);
      v.push(x0, y, z0, nx, 0, nz, x0, y + h, z0, nx, 0, nz, x1, y + h, z1, nx, 0, nz,
             x0, y, z0, nx, 0, nz, x1, y + h, z1, nx, 0, nz, x1, y, z1, nx, 0, nz,
             cx, y + h, cz, 0, 1, 0, x1, y + h, z1, 0, 1, 0, x0, y + h, z0, 0, 1, 0);
    }
  }
  function brickMesh(n, deep) {
    var v = [], g = .03; deep = deep || 2;
    box(v, g, .03, g, n - g, H, deep - g);
    for (var i = 0; i < n; i++) for (var j = 0; j < deep; j++) stud(v, i + .5, H, j + .5);
    return new Float32Array(v);
  }
  // a prism: a convex profile in x–y (counter-clockwise seen from +z), pulled from z0 to z1
  function prism(v, pts, z0, z1) {
    var n = pts.length, i;
    function tri(a, b, c, nx, ny, nz) { [a, b, c].forEach(function (p) { v.push(p[0], p[1], p[2], nx, ny, nz); }); }
    for (i = 1; i < n - 1; i++) {
      tri([pts[0][0], pts[0][1], z1], [pts[i][0], pts[i][1], z1], [pts[i + 1][0], pts[i + 1][1], z1], 0, 0, 1);
      tri([pts[0][0], pts[0][1], z0], [pts[i + 1][0], pts[i + 1][1], z0], [pts[i][0], pts[i][1], z0], 0, 0, -1);
    }
    for (i = 0; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy);
      var nx = dy / l, ny = -dx / l;
      tri([a[0], a[1], z1], [a[0], a[1], z0], [b[0], b[1], z0], nx, ny, 0);
      tri([a[0], a[1], z1], [b[0], b[1], z0], [b[0], b[1], z1], nx, ny, 0);
    }
  }
  // 2×2 slope: the high half (x 0..1) carries two studs, the other half falls to a low lip
  function slopeMesh() {
    var v = [], g = .03;
    prism(v, [[g, .03], [2 - g, .03], [2 - g, .3], [1, H], [g, H]], g, 2 - g);
    stud(v, .5, H, .5); stud(v, .5, H, 1.5);
    return new Float32Array(v);
  }
  // 2×2 inverted slope: a full top with four studs, a foot one stud long (x 0..1)
  function invertedMesh() {
    var v = [], g = .03;
    prism(v, [[g, .03], [1, .03], [2 - g, H - .3], [2 - g, H], [g, H]], g, 2 - g);
    for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) stud(v, i + .5, H, j + .5);
    return new Float32Array(v);
  }
  // a cylinder along y, both caps; turned onto another axis by a cyclic swap (keeps the winding)
  function cyl(v, cx, y, cz, r, h, S, axis) {
    var st = v.length, i;
    for (i = 0; i < S; i++) {
      var a0 = i / S * 6.2832, a1 = (i + 1) / S * 6.2832, am = (a0 + a1) / 2;
      var x0 = cx + Math.cos(a0) * r, z0 = cz + Math.sin(a0) * r, x1 = cx + Math.cos(a1) * r, z1 = cz + Math.sin(a1) * r;
      var nx = Math.cos(am), nz = Math.sin(am);
      v.push(x0, y, z0, nx, 0, nz, x0, y + h, z0, nx, 0, nz, x1, y + h, z1, nx, 0, nz,
             x0, y, z0, nx, 0, nz, x1, y + h, z1, nx, 0, nz, x1, y, z1, nx, 0, nz,
             cx, y + h, cz, 0, 1, 0, x1, y + h, z1, 0, 1, 0, x0, y + h, z0, 0, 1, 0,
             cx, y, cz, 0, -1, 0, x0, y, z0, 0, -1, 0, x1, y, z1, 0, -1, 0);
    }
    if (axis === 'y') return;
    for (i = st; i < v.length; i += 3) {
      var X = v[i], Y = v[i + 1], Z = v[i + 2];
      if (axis === 'z') { v[i] = Z; v[i + 1] = X; v[i + 2] = Y; } else { v[i] = Y; v[i + 1] = Z; v[i + 2] = X; }
    }
  }
  function prismMesh(pts, studs, deep) {
    var v = [], g = .03;
    prism(v, pts, g, (deep || 2) - g);
    studs.forEach(function (q) { for (var j = 0; j < (deep || 2); j++) stud(v, q[0], q[1], j + .5); });
    return new Float32Array(v);
  }
  // mudguard (part 18974), low-poly: a solid 4×2 body two bricks tall with a round pocket for the
  // wheel cut into its outer face, a back wall behind the wheel, and a thin trim ring standing half
  // a stud proud around the pocket. Nothing shows through it.
  function mudguardMesh() {
    var v = [], g = .03, cy = .22, R = 1.97, r = 1.85, N = 14, top = 2 * H, i, j;
    function pt(rad, a) { return [2 + rad * Math.cos(a), cy + rad * Math.sin(a)]; }
    box(v, g, .03, g, 4 - g, top, .9);                                                    // back wall
    for (i = 0; i < N; i++) {                                                             // body around the pocket
      var a0 = Math.PI * i / N, a1 = Math.PI * (i + 1) / N, p0 = pt(r, a0), p1 = pt(r, a1);
      prism(v, [p1, p0, [p0[0], top], [p1[0], top]], .9, 2 - g);
      prism(v, [p0, pt(R, a0), pt(R, a1), p1], 2 - g, 2.5);                               // trim ring
    }
    box(v, 2 + r, .03, .9, 4 - g, top, 2 - g); box(v, g, .03, .9, 2 - r, top, 2 - g);     // sides
    box(v, 2 + r, .03, 2 - g, 2 + R, cy, 2.5); box(v, 2 - R, .03, 2 - g, 2 - r, cy, 2.5); // ring feet
    for (i = 0; i < 4; i++) for (j = 0; j < 2; j++) stud(v, i + .5, top, j + .5);
    return new Float32Array(v);
  }
  // a tube along y (outer wall, inner wall, top rim), turned onto another axis like cyl
  function tube(v, cx, y, cz, R, r, h, S, axis) {
    var st = v.length, i;
    for (i = 0; i < S; i++) {
      var a0 = i / S * 6.2832, a1 = (i + 1) / S * 6.2832, am = (a0 + a1) / 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      var nx = Math.cos(am), nz = Math.sin(am), t = y + h;
      var X0 = cx + c0 * R, Z0 = cz + s0 * R, X1 = cx + c1 * R, Z1 = cz + s1 * R, x0 = cx + c0 * r, z0 = cz + s0 * r, x1 = cx + c1 * r, z1 = cz + s1 * r;
      v.push(X0, y, Z0, nx, 0, nz, X0, t, Z0, nx, 0, nz, X1, t, Z1, nx, 0, nz, X0, y, Z0, nx, 0, nz, X1, t, Z1, nx, 0, nz, X1, y, Z1, nx, 0, nz,   // outside
             x0, y, z0, -nx, 0, -nz, x1, t, z1, -nx, 0, -nz, x0, t, z0, -nx, 0, -nz, x0, y, z0, -nx, 0, -nz, x1, y, z1, -nx, 0, -nz, x1, t, z1, -nx, 0, -nz, // inside
             x0, t, z0, 0, 1, 0, X1, t, Z1, 0, 1, 0, X0, t, Z0, 0, 1, 0, x0, t, z0, 0, 1, 0, x1, t, z1, 0, 1, 0, X1, t, Z1, 0, 1, 0);                    // rim
    }
    for (i = st; i < v.length; i += 3) {
      var X = v[i], Y = v[i + 1], Z = v[i + 2];
      if (axis === 'z') { v[i] = Z; v[i + 1] = X; v[i + 2] = Y; } else if (axis === 'x') { v[i] = Y; v[i + 1] = Z; v[i + 2] = X; }
    }
  }
  // headlight brick, low-poly: recessed front face with a lip at the foot and a hollow stud; a square hole in the back
  function headlightMesh() {
    var v = [], g = .03, d = .3, y0 = .38, y1 = .98, z0 = .22, z1 = .78;   // the back hole: d deep, y0..y1 by z0..z1
    box(v, g + d, .03, g, .89, H, 1 - g);                                  // body, in front of the hole
    box(v, g, .03, g, g + d, y0, 1 - g); box(v, g, y1, g, g + d, H, 1 - g);   // the hole's frame: below, above,
    box(v, g, y0, g, g + d, y1, z0); box(v, g, y0, z1, g + d, y1, 1 - g);     // and the two sides
    box(v, .89, .03, g, 1 - g, .2, 1 - g); stud(v, .5, H, .5);             // lip at the foot, stud on top
    tube(v, .5, .89, .58 * H, .3, .17, .2, 6, 'x');                        // the hollow side stud
    return new Float32Array(v);
  }
  function lightMesh() { var v = []; cyl(v, .5, 0, .58 * H, .4, .255, 12, 'x'); return new Float32Array(v); }
  function roofMesh() { var v = []; box(v, .03, .02, .03, 6 - .03, .4, 6 - .03); return new Float32Array(v); }
  function wheelMesh() { var v = []; cyl(v, 1.5, 0, 1.5, 1.5, 1.4, 20, 'z'); return new Float32Array(v); }
  function hubMesh() { var v = []; cyl(v, .8, 0, .8, .8, .05, 14, 'z'); return new Float32Array(v); }
  function plateMesh() {
    var v = [];
    box(v, 0, -.4, 0, PLATE_X, 0, PLATE_Z);
    for (var i = 0; i < PLATE_X; i++) for (var j = 0; j < PLATE_Z; j++) stud(v, i + .5, 0, j + .5);
    return new Float32Array(v);
  }

  /* ── GL ─────────────────────────────────────────────── */
  var VS = '#version 300 es\n' +
    'in vec3 aP; in vec3 aN; in vec3 iO; in float iYaw; in float iT; in vec3 iC; in float iX;\n' +
    'uniform vec3 uCtr; uniform vec3 uCam; uniform vec2 uS; uniform float uTop; out vec3 vC;\n' +
    'vec3 rot(vec3 p, float a){ float c=cos(a*.6), s=sin(a*.6); p=vec3(p.x, p.y*c-p.z*s, p.y*s+p.z*c);\n' +
    '  c=cos(a); s=sin(a); return vec3(p.x*c+p.z*s, p.y, -p.x*s+p.z*c); }\n' +
    'vec3 turn(vec3 p, float a){ float c=cos(a), s=sin(a); return vec3(p.x*c+p.z*s, p.y, -p.x*s+p.z*c); }\n' +
    'vec3 tip(vec3 p, float a){ float c=cos(a), s=sin(a); return vec3(p.x, p.y*c-p.z*s, p.y*s+p.z*c); }\n' +
    'void main(){ vec3 n=rot(tip(turn(aN,iT),iX),iYaw); vec3 q=rot(tip(turn(aP-uCtr,iT),iX),iYaw)+uCtr+iO-uCam;\n' +
    '  float x1=.70711*(q.x-q.z), z1=.70711*(q.x+q.z);\n' +
    '  float y2=q.y*.81650-z1*.57735, z2=q.y*.57735+z1*.81650;\n' +
    '  vC=iC*(.69+.31*n.y+.09*n.z-.09*n.x)*(uTop > .5 ? .45+.085*(q.y+9.5) : 1.);\n' +
    '  gl_Position = uTop > .5 ? vec4(q.x*uS.x, -q.z*uS.y, -q.y*.01, 1.) : vec4(x1*uS.x, y2*uS.y, -z2*.01, 1.); }';
  var FS = '#version 300 es\nprecision mediump float; in vec3 vC; uniform float uA; out vec4 o; void main(){ o=vec4(vC*uA,uA); }';
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  var prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  ['aP', 'aN', 'iO', 'iYaw', 'iT', 'iC', 'iX'].forEach(function (a, i) { gl.bindAttribLocation(prog, i, a); });
  gl.linkProgram(prog); gl.useProgram(prog);
  var uCtr = gl.getUniformLocation(prog, 'uCtr'), uCam = gl.getUniformLocation(prog, 'uCam'), uS = gl.getUniformLocation(prog, 'uS'), uA = gl.getUniformLocation(prog, 'uA'), uTop = gl.getUniformLocation(prog, 'uTop');
  // for looking things over: ?view=top looks straight down, ?hide=L,T,U,P leaves those kinds of piece out
  var TOP = /[?&]view=top/.test(location.search), HIDE = ((/[?&]hide=([\w,]+)/.exec(location.search) || [0, ''])[1]).split(',');

  function mesh(verts, instances) {
    var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    var data = new Float32Array(instances * 9);
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    [[2, 3, 0], [3, 1, 12], [4, 1, 16], [5, 3, 20], [6, 1, 32]].forEach(function (a) {
      gl.enableVertexAttribArray(a[0]); gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, 36, a[2]); gl.vertexAttribDivisor(a[0], 1);
    });
    return { vao: vao, ib: ib, data: data, verts: verts.length / 6, instances: instances };
  }
  var plate = mesh(plateMesh(), 1);
  var KIND = {
    '1': { mesh: brickMesh(1), ctr: [.5, H / 2, 1] }, '2': { mesh: brickMesh(2), ctr: [1, H / 2, 1] },
    '4': { mesh: brickMesh(4), ctr: [2, H / 2, 1] }, '6': { mesh: brickMesh(6), ctr: [3, H / 2, 1] }, '8': { mesh: brickMesh(8), ctr: [4, H / 2, 1] }, 'X': { mesh: brickMesh(6, 1), ctr: [3, H / 2, .5] },
    // slope 33° 3×2: one stud row high, falling over two studs to a lip
    'L': { mesh: prismMesh([[.03, .03], [2.97, .03], [2.97, .3], [1, H], [.03, H]], [[.5, H]]), ctr: [1.5, H / 2, 1] },
    // tall slope 2×2×2 (the windshield)
    'T': { mesh: prismMesh([[.03, .03], [1.97, .03], [1.97, .3], [1, 2 * H], [.03, 2 * H]], [[.5, 2 * H]]), ctr: [1, H, 1] },
    // tall inverted slope 2×2×2 (the bumpers): foot one stud long, full top
    'U': { mesh: prismMesh([[.03, .03], [1.97, .03], [1.97, .3], [1, 2 * H], [.03, 2 * H]], [[.5, 2 * H]], 1), ctr: [1, H, .5] },
    'J': { mesh: prismMesh([[.03, .03], [1, .03], [1.97, 2 * H - .3], [1.97, 2 * H], [.03, 2 * H]], [[.5, 2 * H], [1.5, 2 * H]]), ctr: [1, H, 1] },
    'E': { mesh: headlightMesh(), ctr: [.5, H / 2, .5] }, 'O': { mesh: lightMesh(), ctr: [.13, .58 * H, .5] },
    'P': { mesh: roofMesh(), ctr: [3, .2, 3] }, 'M': { mesh: mudguardMesh(), ctr: [2, H, 1] },
    'W': { mesh: wheelMesh(), ctr: [1.5, 1.5, .7] }, 'H': { mesh: hubMesh(), ctr: [.8, .8, .05] }
  };
  KINDS.forEach(function (k) { KIND[k].gl = mesh(KIND[k].mesh, pool[k].length); });
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.clearColor(0, 0, 0, 0);

  /* ── timeline ───────────────────────────────────────── */
  var forced = {};          // cycle index → model name (the hidden builds)
  function modelAt(k) { return forced[k] || LOOP[((k % LOOP.length) + LOOP.length) % LOOP.length]; }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
  function easeIn(x) { return x * x * (3 - 2 * x) * x; }       // slow lift-off, firm landing


  function fill(t) {
    var k = Math.floor(t / P), u = t - k * P;
    if (reduce.matches) u = P;
    var from = modelAt(k - 1), to = modelAt(k);
    KINDS.forEach(function (kind) {
      var D = KIND[kind].gl.data, list = pool[kind];
      for (var i = 0; i < list.length; i++) {
        var b = list[i], s = b.pose[from], d = b.pose[to];
        var a = easeOut(clamp01((u - s.leave) / .7));               // rise to the cloud
        var e = easeIn(clamp01((u - 2.5 - d.land * 1.9) / .55));     // drop into place
        var hy = b.hy + Math.sin(t * 1.3 + b.ph) * .25;
        var mx = s.x + (b.hx - s.x) * a, my = s.y + (hy - s.y) * a, mz = s.z + (b.hz - s.z) * a;
        var o = i * 9, col = COL.key[b.c];
        if (kind === 'W' || kind === 'H') {
          // wheels roll along the ground: away once the bottom rows have lifted off, back in before the first brick lands
          var w = clamp01((u - (to === 'car' ? 1.35 : 1.25)) / 1.1); w = w * w * (3 - 2 * w);
          D[o] = s.x + (d.x - s.x) * w; D[o + 1] = s.y; D[o + 2] = s.z; D[o + 3] = 0; D[o + 4] = s.turn; D[o + 8] = 0;
          D[o + 5] = col[0]; D[o + 6] = col[1]; D[o + 7] = col[2];
          continue;
        }
        if (kind === 'P') {
          // the roof plate goes up to the cloud like any brick, then stows away out of the top of the frame when the
          // wheels roll off; it comes back down to the cloud as they roll in, and lands last
          var st = clamp01((u - (to === 'car' ? 1.35 : 1.25)) / 1.1); st = st * st * (3 - 2 * st);
          var up = from === 'car' ? a : 1, away = to === 'car' ? (from === 'car' ? 0 : 1 - st) : (from === 'car' ? st : 1);
          var sx = from === 'car' ? s.x : b.hx, sy = from === 'car' ? s.y : hy, sz = from === 'car' ? s.z : b.hz;
          var px = sx + (b.hx - sx) * up, py = sy + (hy - sy) * up + 46 * away, pz = sz + (b.hz - sz) * up;
          var pe = to === 'car' ? e : 0;
          D[o] = px + (d.x - px) * pe; D[o + 1] = py + (d.y - py) * pe; D[o + 2] = pz + (d.z - pz) * pe;
          D[o + 3] = (b.yaw + Math.sin(t * .5 + b.ph) * .5) * up * (1 - pe) * (1 - away); D[o + 4] = 0; D[o + 8] = 0;
          D[o + 5] = col[0]; D[o + 6] = col[1]; D[o + 7] = col[2];
          continue;
        }
        D[o] = mx + (d.x - mx) * e; D[o + 1] = my + (d.y - my) * e; D[o + 2] = mz + (d.z - mz) * e;
        D[o + 3] = (b.yaw + Math.sin(t * .5 + b.ph) * .5) * a * (1 - e);
        D[o + 4] = s.turn + (d.turn - s.turn) * (a * .5 + e * .5);   // slopes turn around in the air
        D[o + 8] = s.tilt + (d.tilt - s.tilt) * (a * .5 + e * .5);
        D[o + 5] = col[0]; D[o + 6] = col[1]; D[o + 7] = col[2];
      }
    });
  }

  var W = 0, Hpx = 0;
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (w !== W || h !== Hpx) { W = canvas.width = w; Hpx = canvas.height = h; }
  }
  function draw(t) {
    resize(); if (!W || !Hpx) return;
    fill(t);
    gl.viewport(0, 0, W, Hpx); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    var px = Math.min(W / 26, Hpx / 31);        // pixels per stud
    gl.uniform3f(uCam, PLATE_X / 2, 9.5, PLATE_Z / 2);
    gl.uniform2f(uS, 2 * px / W, 2 * px / Hpx);
    var pd = plate.data; pd[0] = pd[1] = pd[2] = pd[3] = 0; pd[4] = 0; pd[8] = 0; pd[5] = COL.plate[0]; pd[6] = COL.plate[1]; pd[7] = COL.plate[2];
    gl.uniform3f(uCtr, 0, 0, 0); gl.uniform1f(uA, 1); gl.uniform1f(uTop, TOP ? 1 : 0);
    gl.bindVertexArray(plate.vao); gl.bindBuffer(gl.ARRAY_BUFFER, plate.ib); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pd);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, plate.verts, 1);
    KINDS.forEach(function (kind) {
      if (HIDE.indexOf(kind) >= 0) return;
      var m = KIND[kind].gl, c = KIND[kind].ctr;
      gl.uniform3f(uCtr, c[0], c[1], c[2]);
      gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ARRAY_BUFFER, m.ib); gl.bufferSubData(gl.ARRAY_BUFFER, 0, m.data);
      var clear = kind === 'T' || kind === 'O';
      if (clear) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.uniform1f(uA, kind === 'O' ? .72 : .4); }
      gl.drawArraysInstanced(gl.TRIANGLES, 0, m.verts, m.instances);
      if (clear) { gl.disable(gl.BLEND); gl.depthMask(true); gl.uniform1f(uA, 1); }
    });
  }

  /* ── clock: runs only while the hero is on screen ───── */
  var T = 1.7, last = 0, raf = 0, visible = true, manual = false;
  function frame(now) {
    raf = 0;
    if (manual) return;
    var dt = last ? Math.min((now - last) / 1000, .1) : 0; last = now;
    T += dt; draw(T);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && !manual) { last = 0; raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  window.addEventListener('resize', function () { draw(T); });
  light.addEventListener('change', function () { COL = colors(); draw(T); });

  // for captures and tests: window.bricks.setT(seconds) freezes the clock there
  window.bricks = { setT: function (t) { manual = true; T = t; draw(T); }, play: function () { manual = false; kick(); }, period: P, force: function (k, name) { forced[k] = name; },
    cycle: function () { return Math.floor(T / P); },
    // the hidden builds (index.html's concealed rollovers): the next thing built is `name`
    next: function (name) { if (LOOP.indexOf(name) >= 0) forced[Math.floor(T / P) + 1] = name; } };
  canvas.classList.add('is-live');
  var qt = /[?&]t=([\d.]+)/.exec(location.search);
  if (qt) window.bricks.setT(+qt[1]); else kick();
})();
