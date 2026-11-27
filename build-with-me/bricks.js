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
  var PLATE_X = 16, PLATE_Z = 10; // baseplate, studs
  var P = 7.6;                    // seconds per build
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var light = matchMedia('(prefers-color-scheme: light)');

  /* ── models ─────────────────────────────────────────── */
  var MODELS = {
    car: { w: 12, slots: 3, pieces: [
      [0,0,2,2,0,'B'], [0,0,8,2,0,'B'], [0,0,10,'I',1,'R'], [0,2,2,2,0,'B'], [0,2,8,2,0,'B'], [0,2,10,'I',1,'R'], [0,1,5,2,0,'R'],
      [1,0,0,'I',-1,'R'], [1,0,2,4,0,'R'], [1,0,6,4,0,'R'], [1,0,10,1,0,'R'], [1,0,11,1,0,'Y'], [1,1,0,'I',-1,'R'], [1,1,2,4,0,'R'], [1,1,6,4,0,'R'], [1,1,10,'I',1,'R'], [1,2,0,'I',-1,'R'], [1,2,2,4,0,'R'], [1,2,6,4,0,'R'], [1,2,10,1,0,'R'], [1,2,11,1,0,'Y'],
      [2,0,2,'S',-1,'B'], [2,0,4,4,0,'B'], [2,0,8,'S',1,'B'], [2,1,2,'S',-1,'B'], [2,1,4,4,0,'R'], [2,1,8,'S',1,'B'], [2,2,2,'S',-1,'B'], [2,2,4,4,0,'B'], [2,2,8,'S',1,'B'],
      [3,0,3,4,0,'R'], [3,0,7,2,0,'R'], [3,1,3,2,0,'R'], [3,1,5,4,0,'R'], [3,2,3,4,0,'R'], [3,2,7,2,0,'R']] },
    a: { w: 13, slots: 1, pieces: [
      [0,0,3,'I',-1], [0,0,5,4,0], [0,0,9,4,0],
      [1,0,2,'I',-1], [1,0,4,1,0], [1,0,5,4,0], [1,0,9,4,0],
      [2,0,1,'I',-1], [2,0,3,'S',1], [2,0,8,'S',-1], [2,0,10,2,0], [2,0,12,1,0],
      [3,0,0,'I',-1], [3,0,2,2,0], [3,0,9,4,0],
      [4,0,0,4,0], [4,0,9,2,0], [4,0,11,2,0],
      [5,0,0,2,0], [5,0,2,2,0], [5,0,9,4,0],
      [6,0,0,'S',-1], [6,0,2,2,0], [6,0,9,4,0],
      [7,0,1,'S',-1], [7,0,3,'I',1], [7,0,8,'I',-1], [7,0,10,1,0], [7,0,11,2,0],
      [8,0,2,'S',-1], [8,0,4,4,0], [8,0,8,4,0], [8,0,12,1,0],
      [9,0,3,'S',-1], [9,0,5,4,0], [9,0,9,4,0]] },
    heart: { w: 14, slots: 1, pieces: [
      [0,0,5,'I',-1], [0,0,7,'I',1],
      [1,0,3,'I',-1], [1,0,5,4,0], [1,0,9,'I',1],
      [2,0,1,'I',-1], [2,0,3,4,0], [2,0,7,4,0], [2,0,11,'I',1],
      [3,0,0,4,0], [3,0,4,4,0], [3,0,8,4,0], [3,0,12,2,0],
      [4,0,0,2,0], [4,0,2,4,0], [4,0,6,4,0], [4,0,10,4,0],
      [5,0,0,4,0], [5,0,4,2,0], [5,0,6,4,0], [5,0,10,1,0], [5,0,11,1,0], [5,0,12,2,0],
      [6,0,0,'S',-1], [6,0,2,1,0], [6,0,3,4,0], [6,0,7,2,0], [6,0,9,2,0], [6,0,11,1,0], [6,0,12,'S',1],
      [7,0,1,'S',-1], [7,0,3,2,0], [7,0,5,'S',1], [7,0,7,'S',-1], [7,0,9,2,0], [7,0,11,'S',1]] }
  };
  var LOOP = ['a', 'car', 'heart'];
  var NAMES = LOOP;
  var KINDS = ['1', '2', '4', 'S', 'I'];

  function hex(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }
  function colors() {
    return {
      key: { R: hex('#e8402f'), B: hex('#2f5fd0'), Y: hex(light.matches ? '#f2c200' : '#ffd92e') },
      plate: hex(light.matches ? '#dfe5ec' : '#202020')
    };
  }
  var COL = colors();

  function place(m) {
    var x0 = Math.floor((PLATE_X - m.w) / 2), z0 = (PLATE_Z - m.slots * 2) / 2;
    return m.pieces.map(function (q) {
      return { kind: String(q[3]), x: x0 + q[2], y: q[0] * H, z: z0 + q[1] * 2, turn: q[4] < 0 ? Math.PI : 0, c: q[5] };
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
      hx: 1 + rnd(seed + .1) * (PLATE_X - 6), hy: 13.5 + rnd(seed + .2) * 2.6, hz: 1 + rnd(seed + .3) * (PLATE_Z - 4),
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
  function brickMesh(n) {
    var v = [], g = .03;
    box(v, g, .03, g, n - g, H, 2 - g);
    for (var i = 0; i < n; i++) for (var j = 0; j < 2; j++) stud(v, i + .5, H, j + .5);
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
  function plateMesh() {
    var v = [];
    box(v, 0, -.4, 0, PLATE_X, 0, PLATE_Z);
    for (var i = 0; i < PLATE_X; i++) for (var j = 0; j < PLATE_Z; j++) stud(v, i + .5, 0, j + .5);
    return new Float32Array(v);
  }

  /* ── GL ─────────────────────────────────────────────── */
  var VS = '#version 300 es\n' +
    'in vec3 aP; in vec3 aN; in vec3 iO; in float iYaw; in float iT; in vec3 iC;\n' +
    'uniform vec3 uCtr; uniform vec3 uCam; uniform vec2 uS; out vec3 vC;\n' +
    'vec3 rot(vec3 p, float a){ float c=cos(a*.6), s=sin(a*.6); p=vec3(p.x, p.y*c-p.z*s, p.y*s+p.z*c);\n' +
    '  c=cos(a); s=sin(a); return vec3(p.x*c+p.z*s, p.y, -p.x*s+p.z*c); }\n' +
    'vec3 turn(vec3 p, float a){ float c=cos(a), s=sin(a); return vec3(p.x*c+p.z*s, p.y, -p.x*s+p.z*c); }\n' +
    'void main(){ vec3 n=rot(turn(aN,iT),iYaw); vec3 q=rot(turn(aP-uCtr,iT),iYaw)+uCtr+iO-uCam;\n' +
    '  float x1=.70711*(q.x-q.z), z1=.70711*(q.x+q.z);\n' +
    '  float y2=q.y*.81650-z1*.57735, z2=q.y*.57735+z1*.81650;\n' +
    '  vC=iC*(.69+.31*n.y+.09*n.z-.09*n.x);\n' +
    '  gl_Position=vec4(x1*uS.x, y2*uS.y, -z2*.01, 1.); }';
  var FS = '#version 300 es\nprecision mediump float; in vec3 vC; out vec4 o; void main(){ o=vec4(vC,1.); }';
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  var prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  ['aP', 'aN', 'iO', 'iYaw', 'iT', 'iC'].forEach(function (a, i) { gl.bindAttribLocation(prog, i, a); });
  gl.linkProgram(prog); gl.useProgram(prog);
  var uCtr = gl.getUniformLocation(prog, 'uCtr'), uCam = gl.getUniformLocation(prog, 'uCam'), uS = gl.getUniformLocation(prog, 'uS');

  function mesh(verts, instances) {
    var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    var data = new Float32Array(instances * 8);
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ib); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    [[2, 3, 0], [3, 1, 12], [4, 1, 16], [5, 3, 20]].forEach(function (a) {
      gl.enableVertexAttribArray(a[0]); gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, 32, a[2]); gl.vertexAttribDivisor(a[0], 1);
    });
    return { vao: vao, ib: ib, data: data, verts: verts.length / 6, instances: instances };
  }
  var plate = mesh(plateMesh(), 1);
  var KIND = {
    '1': { mesh: brickMesh(1), ctr: [.5, H / 2, 1] }, '2': { mesh: brickMesh(2), ctr: [1, H / 2, 1] },
    '4': { mesh: brickMesh(4), ctr: [2, H / 2, 1] }, 'S': { mesh: slopeMesh(), ctr: [1, H / 2, 1] },
    'I': { mesh: invertedMesh(), ctr: [1, H / 2, 1] }
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
        var e = easeIn(clamp01((u - 1.9 - d.land * 1.9) / .55));     // drop into place
        var hy = b.hy + Math.sin(t * 1.3 + b.ph) * .25;
        var mx = s.x + (b.hx - s.x) * a, my = s.y + (hy - s.y) * a, mz = s.z + (b.hz - s.z) * a;
        var o = i * 8, col = COL.key[b.c];
        D[o] = mx + (d.x - mx) * e; D[o + 1] = my + (d.y - my) * e; D[o + 2] = mz + (d.z - mz) * e;
        D[o + 3] = (b.yaw + Math.sin(t * .5 + b.ph) * .5) * a * (1 - e);
        D[o + 4] = s.turn + (d.turn - s.turn) * (a * .5 + e * .5);   // slopes turn around in the air
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
    var px = Math.min(W / 19.5, Hpx / 21);        // pixels per stud
    gl.uniform3f(uCam, PLATE_X / 2, 4.9, PLATE_Z / 2);
    gl.uniform2f(uS, 2 * px / W, 2 * px / Hpx);
    var pd = plate.data; pd[0] = pd[1] = pd[2] = pd[3] = 0; pd[4] = 0; pd[5] = COL.plate[0]; pd[6] = COL.plate[1]; pd[7] = COL.plate[2];
    gl.uniform3f(uCtr, 0, 0, 0);
    gl.bindVertexArray(plate.vao); gl.bindBuffer(gl.ARRAY_BUFFER, plate.ib); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pd);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, plate.verts, 1);
    KINDS.forEach(function (kind) {
      var m = KIND[kind].gl, c = KIND[kind].ctr;
      gl.uniform3f(uCtr, c[0], c[1], c[2]);
      gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ARRAY_BUFFER, m.ib); gl.bufferSubData(gl.ARRAY_BUFFER, 0, m.data);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, m.verts, m.instances);
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
