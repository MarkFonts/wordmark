/* build-with-me hero: low-poly construction bricks, isometric, WebGL2, no libraries.
   A fixed pool of bricks is taken apart and rebuilt into the next thing, forever.
   The car is a voxel drawing: layers bottom→top, each layer a list of z-slots (a slot is
   2 studs deep), each slot a string along x. The other builds are brick lists. */
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
  // a wall drawing: rows top→bottom, extruded `depth` slots
  function wall(rows, depth) {
    var layers = [];
    for (var r = rows.length - 1; r >= 0; r--) {
      var slots = [];
      for (var d = 0; d < depth; d++) slots.push(rows[r]);
      layers.push(slots);
    }
    return layers;
  }
  // One set: the car's 36 bricks (10 of 2×1, 12 of 2×2, 14 of 2×4; red, white, black, grey, yellow).
  // The H and the heart are built from exactly those bricks, brick for brick, colors and all,
  // so nothing is recolored or left over. They are explicit lists: [layer, slot, x, length, color].
  var MODELS = {
    car: [
      ['..KK....KK..', '.GGGGGGGGGG.', '..KK....KK..'],
      ['RRRRRRRRRRRY', 'WWWWWWWWWWWW', 'RRRRRRRRRRRY'],
      ['...RKKKKR...', '...WKKKKW...', '...RKKKKR...'],
      ['...RRRRRR...', '...WWWWWW...', '...RRRRRR...']],
    H: { w: 14, slots: 2, bricks: [
      // a black and grey plinth, two rows deep; the letter stands on the back row
      [0,1,0,4,'K'],[0,1,4,4,'K'],[0,1,8,2,'K'],[0,1,10,2,'K'],[0,1,12,2,'K'],
      [0,0,0,4,'G'],[0,0,4,4,'G'],[0,0,8,2,'K'],[0,0,10,2,'G'],[0,0,12,2,'K'],
      // a white leg with a red cap, a red leg, and a bar of the small bricks
      [1,0,0,4,'W'],[1,0,10,4,'R'],
      [2,0,0,4,'W'],[2,0,10,4,'R'],
      [3,0,0,4,'W'],[3,0,10,4,'R'],
      [4,0,0,2,'R'],[4,0,2,1,'R'],[4,0,3,1,'R'],[4,0,4,1,'Y'],[4,0,5,2,'R'],[4,0,7,2,'R'],[4,0,9,1,'Y'],[4,0,10,2,'K'],[4,0,12,1,'R'],[4,0,13,1,'R'],
      [5,0,0,4,'W'],[5,0,10,4,'R'],
      [6,0,0,2,'W'],[6,0,2,1,'W'],[6,0,3,1,'W'],[6,0,10,4,'R'],
      [7,0,0,2,'R'],[7,0,2,1,'R'],[7,0,3,1,'R'],[7,0,10,4,'R']] },
    heart: { w: 9, slots: 2, bricks: [
      // a black plinth
      [0,1,1,4,'K'],[0,1,5,4,'K'],[0,0,1,2,'K'],[0,0,3,2,'K'],[0,0,5,2,'K'],[0,0,7,2,'K'],
      // front: every red brick but one
      [1,1,4,1,'R'],
      [2,1,3,2,'R'],[2,1,5,1,'R'],
      [3,1,2,1,'R'],[3,1,3,4,'R'],
      [4,1,1,4,'R'],[4,1,5,1,'R'],[4,1,6,2,'R'],
      [5,1,0,4,'R'],[5,1,4,1,'R'],[5,1,5,4,'R'],
      [6,1,0,4,'R'],[6,1,5,4,'R'],
      [7,1,1,2,'R'],[7,1,6,2,'R'],
      // back: the same heart in everything else
      [1,0,4,1,'Y'],
      [2,0,3,1,'R'],[2,0,4,2,'G'],
      [3,0,2,4,'W'],[3,0,6,1,'W'],
      [4,0,1,2,'W'],[4,0,3,1,'W'],[4,0,4,4,'W'],
      [5,0,0,4,'G'],[5,0,4,1,'Y'],[5,0,5,4,'G'],
      [6,0,0,4,'W'],[6,0,5,4,'W'],
      [7,0,1,2,'K'],[7,0,6,2,'K']] }
  };
  var LOOP = ['H', 'car', 'heart'];
  var NAMES = LOOP;

  function hex(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }
  function colors() {
    var L = light.matches;
    return {
      key: { R: hex('#e8402f'), W: hex(L ? '#ffffff' : '#f2f2ee'), K: hex(L ? '#1c1d20' : '#3a3d43'),
             G: hex('#8f959d'), Y: hex(L ? '#96d500' : '#eeff41') },
      plate: hex(L ? '#dfe5ec' : '#202020')
    };
  }
  var COL = colors();

  // tile every model into 2×n bricks (n = 1..4), running bond
  function tile(layers) {
    if (layers.bricks) {
      var ex0 = Math.floor((PLATE_X - layers.w) / 2), ez0 = (PLATE_Z - layers.slots * 2) / 2;
      return layers.bricks.map(function (b) { return { n: b[3], x: ex0 + b[2], y: b[0] * H, z: ez0 + b[1] * 2, c: b[4] }; });
    }
    var out = [], w = 0, slots = 0;
    layers.forEach(function (sl) { slots = Math.max(slots, sl.length); sl.forEach(function (s) { w = Math.max(w, s.length); }); });
    var x0 = Math.floor((PLATE_X - w) / 2), z0 = (PLATE_Z - slots * 2) / 2;
    layers.forEach(function (sl, y) {
      sl.forEach(function (s, z) {
        var i = 0;
        while (i < s.length) {
          var c = s[i];
          if (c === '.') { i++; continue; }
          var j = i; while (j < s.length && s[j] === c) j++;
          var first = ((y + z) % 2) ? 2 : 4;
          while (i < j) {
            var n = Math.min(first, j - i, 4); first = 4;
            out.push({ n: n, x: x0 + i, y: y * H, z: z0 + z * 2, c: c });
            i += n;
          }
        }
      });
    });
    return out;
  }
  var TILED = {}; NAMES.forEach(function (k) { TILED[k] = tile(MODELS[k]); });

  // the pool is the car's bricks: each keeps its length and its color for good
  function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  var count = [0, 0, 0, 0, 0];
  var pool = [null, [], [], [], []];
  TILED.car.forEach(function (b, i) {
    var seed = i + 2;
    count[b.n]++;
    pool[b.n].push({
      c: b.c,
      hx: 1 + rnd(seed + .1) * (PLATE_X - 2 - b.n), hy: 11.5 + rnd(seed + .2) * 3, hz: 1 + rnd(seed + .3) * (PLATE_Z - 4),
      yaw: (rnd(seed + .4) - .5) * 2.4, ph: rnd(seed + .5) * 6.28,
      pose: {}
    });
  });
  // every model must be exactly the same set; a brick goes only where its length and color are wanted
  NAMES.forEach(function (k, m) {
    var t = TILED[k], maxY = 0;
    t.forEach(function (b) { maxY = Math.max(maxY, b.y); });
    var order = t.slice().sort(function (a, b) { return a.y - b.y || a.z - b.z || a.x - b.x; });
    order.forEach(function (b, i) {
      b.land = order.length > 1 ? i / (order.length - 1) : 0;
      b.leave = maxY ? (1 - b.y / maxY) * .8 + rnd(i + m * 31) * .2 : 0;
    });
    for (var n = 1; n <= 4; n++) {
      var free = pool[n].slice();
      if (m) free = free.slice(m * 3 % free.length).concat(free.slice(0, m * 3 % free.length));   // shuffle who goes where
      order.filter(function (b) { return b.n === n; }).forEach(function (b) {
        var at = -1;
        for (var q = 0; q < free.length; q++) if (free[q].c === b.c) { at = q; break; }
        if (at < 0) throw new Error('bricks: ' + k + ' wants a 2x' + n + ' ' + b.c + ' the set does not have');
        free.splice(at, 1)[0].pose[k] = b;
      });
      if (free.length) throw new Error('bricks: ' + k + ' leaves ' + free.length + ' 2x' + n + ' unused');
    }
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
  function plateMesh() {
    var v = [];
    box(v, 0, -.4, 0, PLATE_X, 0, PLATE_Z);
    for (var i = 0; i < PLATE_X; i++) for (var j = 0; j < PLATE_Z; j++) stud(v, i + .5, 0, j + .5);
    return new Float32Array(v);
  }

  /* ── GL ─────────────────────────────────────────────── */
  var VS = '#version 300 es\n' +
    'in vec3 aP; in vec3 aN; in vec3 iO; in float iYaw; in float iS; in vec3 iC;\n' +
    'uniform vec3 uCtr; uniform vec3 uCam; uniform vec2 uS; out vec3 vC;\n' +
    'vec3 rot(vec3 p, float a){ float c=cos(a*.6), s=sin(a*.6); p=vec3(p.x, p.y*c-p.z*s, p.y*s+p.z*c);\n' +
    '  c=cos(a); s=sin(a); return vec3(p.x*c+p.z*s, p.y, -p.x*s+p.z*c); }\n' +
    'void main(){ vec3 n=rot(aN,iYaw); vec3 q=rot((aP-uCtr)*iS,iYaw)+uCtr+iO-uCam;\n' +
    '  float x1=.70711*(q.x-q.z), z1=.70711*(q.x+q.z);\n' +
    '  float y2=q.y*.81650-z1*.57735, z2=q.y*.57735+z1*.81650;\n' +
    '  vC=iC*(.69+.31*n.y+.09*n.z-.09*n.x);\n' +
    '  gl_Position=vec4(x1*uS.x, y2*uS.y, -z2*.01, 1.); }';
  var FS = '#version 300 es\nprecision mediump float; in vec3 vC; out vec4 o; void main(){ o=vec4(vC,1.); }';
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  var prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  ['aP', 'aN', 'iO', 'iYaw', 'iS', 'iC'].forEach(function (a, i) { gl.bindAttribLocation(prog, i, a); });
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
  var meshes = [null];
  for (var n = 1; n <= 4; n++) meshes.push(count[n] ? mesh(brickMesh(n), count[n]) : null);
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
    for (var n = 1; n <= 4; n++) {
      var m = meshes[n]; if (!m) continue;
      for (var i = 0; i < count[n]; i++) {
        var b = pool[n][i], s = b.pose[from], d = b.pose[to];
        var a = easeOut(clamp01((u - (s ? s.leave : 0)) / .7));          // rise to the cloud
        var e = easeIn(clamp01((u - 1.9 - (d ? d.land * 1.9 : 0)) / .55)); // drop into place
        var bob = Math.sin(t * 1.3 + b.ph) * .25;
        var hx = b.hx, hy = b.hy + bob, hz = b.hz;
        var sx = s ? s.x : hx, sy = s ? s.y : hy, sz = s ? s.z : hz;
        var dx = d ? d.x : hx, dy = d ? d.y : hy, dz = d ? d.z : hz;
        var mx = sx + (hx - sx) * a, my = sy + (hy - sy) * a, mz = sz + (hz - sz) * a;
        var o = i * 8, D = m.data;
        D[o] = mx + (dx - mx) * e; D[o + 1] = my + (dy - my) * e; D[o + 2] = mz + (dz - mz) * e;
        D[o + 3] = (b.yaw + Math.sin(t * .5 + b.ph) * .5) * a * (1 - e);
        var s0 = s ? 1 : 0, s1 = d ? 1 : 0, mid = (s || d) ? 1 : 0;
        var sc = s0 + (mid - s0) * a; D[o + 4] = sc + (s1 - sc) * e;
        var col = COL.key[b.c];
        D[o + 5] = col[0]; D[o + 6] = col[1]; D[o + 7] = col[2];
      }
    }
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
    var px = Math.min(W / 19.5, Hpx / 19);        // pixels per stud
    gl.uniform3f(uCam, PLATE_X / 2, 4.2, PLATE_Z / 2);
    gl.uniform2f(uS, 2 * px / W, 2 * px / Hpx);
    var pd = plate.data; pd[0] = pd[1] = pd[2] = pd[3] = 0; pd[4] = 1; pd[5] = COL.plate[0]; pd[6] = COL.plate[1]; pd[7] = COL.plate[2];
    gl.uniform3f(uCtr, 0, 0, 0);
    gl.bindVertexArray(plate.vao); gl.bindBuffer(gl.ARRAY_BUFFER, plate.ib); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pd);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, plate.verts, 1);
    for (var n = 1; n <= 4; n++) {
      var m = meshes[n]; if (!m) continue;
      gl.uniform3f(uCtr, n / 2, H / 2, 1);
      gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ARRAY_BUFFER, m.ib); gl.bufferSubData(gl.ARRAY_BUFFER, 0, m.data);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, m.verts, m.instances);
    }
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
  kick();
})();
