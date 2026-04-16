(function () {
  'use strict';

  var canvas  = document.getElementById('dek-canvas');
  var annotEl = document.getElementById('dek-annot');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var FONT = '"CalSansUI", sans-serif';
  var CW, CH, BASE_CH, dpr, LEFT_PAD;
  var BLEED = 32;   // extra canvas px per side — font size stays fixed, prevents glyph clipping
  var isMobile = false;

  /* ── CalSansUI metrics (1000 UPM) ────────────────────────*/
  var ASC   = 0.800;
  var CAP_H = 0.720;
  var DESC  = 0.150;
  /* x-height varies with wght: 515 @ 400, 529 @ 700 */
  var X_H_400 = 0.515;
  var X_H_700 = 0.529;
  var X_H     = X_H_400;  // used for stable layout in init()

  var METRICS = [
    { label: 'CAP HEIGHT', val: '720',       frac:  CAP_H },
    { label: 'X-HEIGHT',   val: '515',       frac:  X_H_400 },  // val overridden live in frame()
    { label: 'BASELINE',   val: '0',         frac:  0     },
    { label: 'DESCENDER',  val: '\u2212150', frac: -DESC  },
  ];

  /* ── glyph list — CalSansUI coverage only ────────────────
     Two-fallback width test: if CalSansUI has the glyph,
     width is the same regardless of which system font follows.*/
  var RANGES = [
  // --- 1. STANDARD & EXTENDED CAPS ---
  0x0041, 0x00C1, 0x0102, 0x00C2, 0x00C4, 0x00C0, 0x0202, 0x0100, 0x0104, 0x00C5, 
  0x00C3, 0x00C6, 0x01E2, 0x0042, 0x0043, 0x0106, 0x010C, 0x00C7, 0x0108, 0x010A, 
  0x0044, 0x010E, 0x0110, 0x1E0C, 0x00D0, 0x0045, 0x00C9, 0x011A, 0x00CA, 0x00CB, 
  0x0116, 0x00C8, 0x0206, 0x0112, 0x0118, 0x018F, 0x0046, 0x0191, 0x0047, 0x011E, 
  0x011C, 0x0122, 0x0120, 0x1E20, 0x0048, 0x0126, 0x1E2A, 0x0124, 0x1E24, 0x0049, 
  0x0132, 0x00CD, 0x00CE, 0x00CF, 0x0130, 0x00CC, 0x020A, 0x012A, 0x012E, 0x0128, 
  0x004A, 0x0134, 0x004B, 0x0136, 0x1E34, 0x004C, 0x0139, 0x013D, 0x013B, 0x013F, 
  0x1E36, 0x1E38, 0x1E3A, 0x0141, 0x004D, 0x1E40, 0x1E42, 0x004E, 0x0143, 0x0147, 
  0x0145, 0x1E44, 0x1E46, 0x1E48, 0x00D1, 0x014A, 0x004F, 0x00D3, 0x00D4, 0x00D6, 
  0x00D2, 0x01A0, 0x0150, 0x020E, 0x014C, 0x00D8, 0x00D5, 0x0152, 0x0050, 0x00DE, 
  0x0051, 0x0052, 0x0154, 0x0158, 0x0156, 0x1E5C, 0x0212, 0x1E5E, 0x0053, 0x015A, 
  0x0160, 0x015E, 0x015C, 0x0218, 0x1E62, 0x1E9E, 0x0054, 0x0166, 0x0164, 0x0162, 
  0x021A, 0x1E6C, 0x1E6E, 0x0055, 0x00DA, 0x016C, 0x00DB, 0x00DC, 0x00D9, 0x01AF, 
  0x0170, 0x0216, 0x016A, 0x0172, 0x016E, 0x0168, 0x0056, 0x0057, 0x1E82, 0x0174, 
  0x1E84, 0x1E80, 0x0058, 0x0059, 0x00DD, 0x0176, 0x0178, 0x1E8E, 0x005A, 0x0179, 
  0x017D, 0x017B, 0x1E92, 0x1E94, 0xA78B,

  // --- 2. VIETNAMESE CAPS (Grouped at the end of Caps) ---
  0x1EA0, 0x1EA2, 0x1EA4, 0x1EA6, 0x1EA8, 0x1EAA, 0x1EAC, 0x1EAE, 0x1EB0, 0x1EB2, 
  0x1EB4, 0x1EB6, 0x1EB8, 0x1EBA, 0x1EBC, 0x1EBE, 0x1EC0, 0x1EC2, 0x1EC4, 0x1EC6, 
  0x1EC8, 0x1ECA, 0x1ECC, 0x1ECE, 0x1ED0, 0x1ED2, 0x1ED4, 0x1ED6, 0x1ED8, 0x1EDA, 
  0x1EDC, 0x1EDE, 0x1EE0, 0x1EE2, 0x1EE4, 0x1EE6, 0x1EE8, 0x1EEA, 0x1EEC, 0x1EEE, 
  0x1EF0, 0x1EF2, 0x1EF4, 0x1EF6, 0x1EF8,

  // --- 3. STANDARD & EXTENDED LOWERCASE ---
  0x0061, 0x00E1, 0x0103, 0x00E2, 0x00E4, 0x00E0, 0x0203, 0x0101, 0x0105, 0x00E5, 
  0x00E3, 0x00E6, 0x01E3, 0x0062, 0x0063, 0x0107, 0x010D, 0x00E7, 0x0109, 0x010B, 
  0x0064, 0x010F, 0x0111, 0x1E0D, 0x00F0, 0x0065, 0x00E9, 0x011B, 0x00EA, 0x00EB, 
  0x0117, 0x00E8, 0x0207, 0x0113, 0x0119, 0x0259, 0x0066, 0x0067, 0x011F, 0x011D, 
  0x0123, 0x0121, 0x1E21, 0x0068, 0x0127, 0x1E2B, 0x0125, 0x1E25, 0x1E96, 0x0069, 
  0x0131, 0x00ED, 0x00EE, 0x00EF, 0x00EC, 0x020B, 0x012B, 0x012F, 0x0129, 0x0133, 
  0x006A, 0x0237, 0x0135, 0x006B, 0x0137, 0x0138, 0x1E35, 0x006C, 0x013A, 0x013E, 
  0x013C, 0x0140, 0x1E37, 0x1E39, 0x1E3B, 0x0142, 0x006D, 0x1E41, 0x1E43, 0x006E, 
  0x0144, 0x0148, 0x0146, 0x1E45, 0x1E47, 0x1E49, 0x00F1, 0x014B, 0x006F, 0x00F3, 
  0x00F4, 0x00F6, 0x00F2, 0x01A1, 0x0151, 0x020F, 0x014D, 0x00F8, 0x00F5, 0x0153, 
  0x0070, 0x00FE, 0x0071, 0x0072, 0x0155, 0x0159, 0x0157, 0x1E5D, 0x0213, 0x1E5F, 
  0x0073, 0x015B, 0x0161, 0x015F, 0x015D, 0x0219, 0x1E63, 0x00DF, 0x0074, 0x0167, 
  0x0165, 0x0163, 0x021B, 0x1E6D, 0x1E6F, 0x0075, 0x00FA, 0x016D, 0x00FB, 0x00FC, 
  0x00F9, 0x01B0, 0x0171, 0x0217, 0x016B, 0x0173, 0x016F, 0x0169, 0x0076, 0x0077, 
  0x1E83, 0x0175, 0x1E85, 0x1E81, 0x0078, 0x0079, 0x00FD, 0x0177, 0x00FF, 0x1E8F, 
  0x007A, 0x017A, 0x017E, 0x017C, 0x1E93, 0x1E95, 0xA78C,

  // --- 4. VIETNAMESE LOWERCASE (Grouped at the end of Lowercase) ---
  0x1EA1, 0x1EA3, 0x1EA5, 0x1EA7, 0x1EA9, 0x1EAB, 0x1EAD, 0x1EAF, 0x1EB1, 0x1EB3, 
  0x1EB5, 0x1EB7, 0x1EB9, 0x1EBB, 0x1EBD, 0x1EBF, 0x1EC1, 0x1EC3, 0x1EC5, 0x1EC7, 
  0x1EC9, 0x1ECB, 0x1ECD, 0x1ECF, 0x1ED1, 0x1ED3, 0x1ED5, 0x1ED7, 0x1ED9, 0x1EDB, 
  0x1EDD, 0x1EDF, 0x1EE1, 0x1EE3, 0x1EE5, 0x1EE7, 0x1EE9, 0x1EEB, 0x1EED, 0x1EEF, 
  0x1EF1, 0x1EF3, 0x1EF5, 0x1EF7, 0x1EF9,

  // --- 5. LIGATURES, NUMBERS, PUNCTUATION, MATH, SYMBOLS ---
  0xFB01, 0xFB02, 0x00AA, 0x00BA, 0x039E, 0x03A9, 0x03C0, 0x0030, 0x0031, 0x0032, 
  0x0033, 0x0034, 0x0035, 0x0036, 0x0037, 0x0038, 0x0039, 0x2044, 0x00BD, 0x2153, 
  0x2154, 0x00BC, 0x00BE, 0x215B, 0x215C, 0x215D, 0x215E, 0x2080, 0x2081, 0x2082, 
  0x2083, 0x2084, 0x2085, 0x2086, 0x2087, 0x2088, 0x2089, 0x2070, 0x00B9, 0x00B2, 
  0x00B3, 0x2074, 0x2075, 0x2076, 0x2077, 0x2078, 0x2079, 0x0020, 0x27E8, 0x27E9, 
  0x002E, 0x002C, 0x003A, 0x003B, 0x2026, 0x0021, 0x00A1, 0x003F, 0x00BF, 0x00B7, 
  0x2022, 0x002A, 0x2016, 0x203C, 0x203D, 0x2E18, 0x0023, 0x002F, 0x005C, 0x002D, 
  0x00AD, 0x2013, 0x2014, 0x005F, 0x0028, 0x0029, 0x007B, 0x007D, 0x005B, 0x005D, 
  0x201A, 0x201E, 0x201C, 0x201D, 0x2018, 0x2019, 0x00AB, 0x00BB, 0x2039, 0x203A, 
  0x0022, 0x0027, 0x0192, 0x0E3F, 0x235F, 0x2605, 0x2606, 0x2611, 0x2612, 0x2661, 
  0x2665, 0x2713, 0x2714, 0x2717, 0x2718, 0x2726, 0x2727, 0x2728, 0x2764, 0x0040, 
  0x0026, 0x00B6, 0x00A7, 0x00A9, 0x00AE, 0x2122, 0x00B0, 0x2032, 0x2033, 0x007C, 
  0x00A6, 0x2020, 0x2113, 0x2021, 0x212E, 0x2116, 0x2B51, 0x2B52, 0x24B9, 0x20BF, 
  0x20B5, 0x00A2, 0x20A1, 0x00A4, 0x0024, 0x20AB, 0x20AC, 0x20B2, 0x20B4, 0x20AD, 
  0x20BE, 0x20BA, 0x20BC, 0x20A6, 0x20B1, 0x20C1, 0x20BD, 0x20A8, 0x20B9, 0x20AA, 
  0x00A3, 0x20B8, 0x20AE, 0x20A9, 0x00A5, 0x2235, 0x2215, 0x002B, 0x2212, 0x00D7, 
  0x00F7, 0x003D, 0x2260, 0x003E, 0x003C, 0x2265, 0x2264, 0x00B1, 0x2248, 0x007E, 
  0x00AC, 0x005E, 0x221E, 0x2205, 0x222B, 0x2126, 0x2206, 0x220F, 0x2211, 0x221A, 
  0x00B5, 0x2202, 0x0025, 0x2030, 0x2234, 0x2191, 0x2197, 0x2192, 0x2198, 0x2193, 
  0x2199, 0x2190, 0x2196, 0x2194, 0x2195, 0x25CF, 0x25CB, 0x25CC, 0x25E6, 0x25C6, 
  0x25C7, 0x25CA, 0x25A0, 0x25A1, 0x25AA, 0x25AB, 0x25FC, 0x25B2, 0x25B6, 0x25BC, 
  0x25C0, 0x25B3, 0x25B7, 0x25BD, 0x25C1, 0x25B4, 0x25B8, 0x25BE, 0x25C2, 0x25B5, 
  0x25B9, 0x25BF, 0x25C3, 0x0308, 0x0307, 0x0300, 0x0301, 0x030B, 0x0302, 0x030C, 
  0x0306, 0x030A, 0x0303, 0x0304, 0x0309, 0x030F, 0x0311, 0x0312, 0x031B, 0x0323, 
  0x0324, 0x0326, 0x0327, 0x0328, 0x032E, 0x0331, 0x0335, 0x0338, 0x00A8, 0x02D9, 
  0x0060, 0x00B4, 0x02DD, 0x02C6, 0x02C7, 0x02D8, 0x02DA, 0x02DC, 0x00AF, 0x00B8, 
  0x02DB, 0x02BC, 0x02BB, 0x02B9, 0x02C8
];

  var glyphs = [];

  function buildGlyphList() {
    canvas.style.fontVariationSettings = '"wght" 400';
    RANGES.forEach(function (cp) {
      var ch = String.fromCodePoint(cp);
      ctx.font = '100px "CalSansUI", sans-serif';
      var wA   = ctx.measureText(ch).width;
      ctx.font = '100px "CalSansUI", monospace';
      var wB   = ctx.measureText(ch).width;
      if (wA > 1 && Math.abs(wA - wB) < 0.5) glyphs.push(cp);
    });
    if (!glyphs.length) for (var i = 0x21; i <= 0x7E; i++) glyphs.push(i);
  }

  /* ── copy text layout (pre-computed) ─────────────────────
     Desktop: full-width in x-height zone, layered over glyph.
     Mobile:  not drawn on canvas — HTML header shown instead. */

  /* ── layout / resize ─────────────────────────────────────*/
  function init() {
    dpr      = Math.min(window.devicePixelRatio || 1, 2);
    isMobile = window.innerWidth <= 480;
    CW       = Math.max(Math.floor(canvas.parentElement.getBoundingClientRect().width), 320);

    // Mobile: exactly 50 vh; desktop: 60% of width capped at 52 vh
    BASE_CH = isMobile
      ? Math.round(window.innerHeight * 0.50)
      : Math.round(Math.min(CW * 0.60, window.innerHeight * 0.52));

    // Canvas is BLEED px taller each side so ascenders/descenders never hit the edge.
    // Negative margins collapse that extra height back out so the section stays the same size.
    // fs is tied to BASE_CH — font size is unchanged.
    CH = BASE_CH + BLEED * 2;
    canvas.style.width        = CW + 'px';
    canvas.style.height       = CH + 'px';
    canvas.style.marginTop    = -BLEED + 'px';
    canvas.style.marginBottom = -BLEED + 'px';
    canvas.width  = Math.round(CW * dpr);
    canvas.height = Math.round(CH * dpr);
    initParticles();
    canvas.style.fontFeatureSettings = '"tnum" 1';

    LEFT_PAD = isMobile
      ? Math.min(Math.max(20, CW * 0.05), 40)
      : Math.min(Math.max(32, CW * 0.07), 112);

    var fs = Math.round(BASE_CH * 0.70 / (ASC + DESC));

    /* ── position HTML header inside x-height zone ── */
    // baseline_y / xH_y are canvas coords; canvas sits BLEED px above its layout position,
    // so subtract BLEED to convert to #dek-wrap absolute coords for the header.
    var baseline_y = CH / 2 + ((ASC - DESC) / 2) * fs;
    var xH_y       = baseline_y - X_H_400 * fs;
    var headerEl   = document.getElementById('dek-header');
    if (headerEl) {
      if (!isMobile) {
        var zoneH  = baseline_y - xH_y;
        var fs_h   = Math.max(9, Math.round(zoneH / 7));
        var colW   = Math.max(60, Math.round(CW * 0.34) - LEFT_PAD);
        headerEl.style.position   = 'absolute';
        headerEl.style.top        = Math.round(xH_y - BLEED) + 'px';
        headerEl.style.left       = LEFT_PAD + 'px';
        headerEl.style.width      = colW + 'px';
        headerEl.style.fontSize   = fs_h + 'px';
        headerEl.style.lineHeight = '1.28';
        headerEl.style.padding    = '0';
      } else {
        headerEl.style.cssText = '';  // reset to mobile CSS defaults
      }
    }
  }

  /* ── wght oscillation ────────────────────────────────────*/
  var WGHT_PERIOD = 18;
  function wghtVal(t) {
    return 400 + 300 * 0.5 * (1 + Math.sin((2 * Math.PI / WGHT_PERIOD) * t));
  }

  /* ── glyph cycling ───────────────────────────────────────*/
  var glyphIdx = 0;
  var HOLD_MS  = 100;
  var phaseMs  = 0;
  var prevNow  = null;
  var annotMs  = 0;

  /* ── theme ───────────────────────────────────────────────*/
  function getInk() {
    return getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#ffffff';
  }
  /* ── diacritic shape targets ────────────────────────────
     All coords [dx, dy] as fractions of fs.
     dx: offset from CW/2.  dy: offset from capH_y
     (negative = above cap, ~+0.72 = at baseline, ~+0.81 = below baseline).
     3–5 pts per shape; Vietnamese double-stacks use the full 5 as 3+2 split. */
  var SHAPES = {
    'dot':    [[ 0,-.20],[-.04,-.14],[.04,-.14]],
    'diaer':  [[-.08,-.17],[.08,-.17],[-.04,-.23],[.04,-.23]],
    'acute':  [[-.05,-.11],[.01,-.23],[.05,-.15]],
    'grave':  [[ .05,-.11],[-.01,-.23],[-.05,-.15]],
    'circ':   [[-.10,-.12],[-.02,-.23],[.02,-.23],[.10,-.12]],
    'caron':  [[-.10,-.23],[-.02,-.12],[.02,-.12],[.10,-.23]],
    'tilde':  [[-.10,-.13],[-.04,-.21],[.01,-.17],[.04,-.12],[.10,-.19]],
    'macron': [[-.10,-.19],[ .0,-.19],[.10,-.19]],
    'breve':  [[-.09,-.22],[-.04,-.13],[.04,-.13],[.09,-.22]],
    'ring':   [[ .0,-.26],[-.07,-.19],[.07,-.19],[ .0,-.13]],
    'hook':   [[ .0,-.13],[ .04,-.19],[.04,-.26],[-.02,-.29]],
    'dotb':   [[ 0, .81],[-.04,.87],[ .04,.87]],
    'cedilla':[[-.03,.81],[ .04,.81],[ .01,.88]],
    'ogonek': [[ .06,.81],[ .11,.87],[ .07,.93]],
    'horn':   [[ .12,-.12],[ .16,-.06],[ .12,.02]],
    // Vietnamese double-stacks (3 base + 2 tone = 5 pts)
    'circ+acute': [[-.09,-.11],[ .0,-.19],[.09,-.11],[-.01,-.26],[ .03,-.31]],
    'circ+grave': [[-.09,-.11],[ .0,-.19],[.09,-.11],[ .01,-.26],[-.03,-.31]],
    'circ+hook':  [[-.09,-.11],[ .0,-.19],[.09,-.11],[ .02,-.25],[ .06,-.30]],
    'circ+tilde': [[-.09,-.11],[ .0,-.19],[.09,-.11],[-.05,-.27],[ .05,-.27]],
    'circ+dotb':  [[-.09,-.11],[ .0,-.19],[.09,-.11],[-.03, .81],[ .03, .81]],
    'breve+acute':[[-.09,-.12],[ .0,-.17],[.09,-.12],[-.01,-.24],[ .03,-.29]],
    'breve+grave':[[-.09,-.12],[ .0,-.17],[.09,-.12],[ .01,-.24],[-.03,-.29]],
    'breve+hook': [[-.09,-.12],[ .0,-.17],[.09,-.12],[ .02,-.24],[ .06,-.29]],
    'breve+tilde':[[-.09,-.12],[ .0,-.17],[.09,-.12],[-.05,-.26],[ .05,-.26]],
    'breve+dotb': [[-.09,-.12],[ .0,-.17],[.09,-.12],[-.03, .81],[ .03, .81]],
    'horn+acute': [[ .11,-.12],[ .15,-.06],[.11, .02],[-.01,-.24],[ .03,-.29]],
    'horn+grave': [[ .11,-.12],[ .15,-.06],[.11, .02],[ .01,-.24],[-.03,-.29]],
    'horn+hook':  [[ .11,-.12],[ .15,-.06],[.11, .02],[ .02,-.24],[ .06,-.29]],
    'horn+tilde': [[ .11,-.12],[ .15,-.06],[.11, .02],[-.05,-.26],[ .05,-.26]],
    'horn+dotb':  [[ .11,-.12],[ .15,-.06],[.11, .02],[-.03, .81],[ .03, .81]],
  };

  /* ── diacritic codepoint map ─────────────────────────── */
  var DIAC_MAP = (function () {
    var m = {};
    function s(t) { for (var i = 1; i < arguments.length; i++) m[arguments[i]] = t; }
    s('grave',  0xC0,0xC8,0xCC,0xD2,0xD9, 0xE0,0xE8,0xEC,0xF2,0xF9,
                0x1F8,0x1F9, 0x1E80,0x1E81, 0x1EF2,0x1EF3);
    s('acute',  0xC1,0xC9,0xCD,0xD3,0xDA,0xDD, 0xE1,0xE9,0xED,0xF3,0xFA,0xFD,
                0x106,0x107,0x139,0x13A,0x143,0x144,0x154,0x155,0x15A,0x15B,0x179,0x17A,
                0x1F4,0x1F5, 0x1E82,0x1E83);
    s('circ',   0xC2,0xCA,0xCE,0xD4,0xDB, 0xE2,0xEA,0xEE,0xF4,0xFB,
                0x108,0x109,0x11C,0x11D,0x124,0x125,0x134,0x135,0x15C,0x15D,0x174,0x175,0x176,0x177);
    s('tilde',  0xC3,0xD1,0xD5, 0xE3,0xF1,0xF5, 0x128,0x129,0x168,0x169,
                0x1EBC,0x1EBD);
    s('diaer',  0xC4,0xCB,0xCF,0xD6,0xDC, 0xE4,0xEB,0xEF,0xF6,0xFC,0xFF,
                0x178, 0x1E84,0x1E85,0x1E8C,0x1E8D);
    s('ring',   0xC5,0xE5, 0x16E,0x16F);
    s('macron', 0x100,0x101,0x112,0x113,0x12A,0x12B,0x14C,0x14D,0x16A,0x16B,0x1E20,0x1E21);
    s('breve',  0x102,0x103,0x114,0x115,0x11E,0x11F,0x12C,0x12D,0x14E,0x14F,0x16C,0x16D);
    s('caron',  0x10C,0x10D,0x10E,0x10F,0x11A,0x11B,0x147,0x148,0x158,0x159,0x160,0x161,0x164,0x165,0x17D,0x17E);
    s('dot',    0x10A,0x10B,0x116,0x117,0x120,0x121,0x130,
                0x1E56,0x1E57,0x1E58,0x1E59,0x1E64,0x1E65);
    s('hook',   0x1EA2,0x1EA3,0x1EBA,0x1EBB,0x1EC8,0x1EC9,0x1ECE,0x1ECF,
                0x1EE6,0x1EE7,0x1EF6,0x1EF7);
    s('dotb',   0x1E04,0x1E05,0x1E0C,0x1E0D,0x1E24,0x1E25,0x1E36,0x1E37,
                0x1E42,0x1E43,0x1E46,0x1E47,0x1E5A,0x1E5B,0x1E62,0x1E63,0x1E6C,0x1E6D,
                0x1E92,0x1E93,
                0x1EA0,0x1EA1,0x1EB8,0x1EB9,0x1ECA,0x1ECB,0x1ECC,0x1ECD,
                0x1EE4,0x1EE5,0x1EF4,0x1EF5);
    s('cedilla',0xC7,0xE7,0x122,0x123,0x136,0x137,0x13B,0x13C,0x145,0x146,
                0x156,0x157,0x15E,0x15F,0x162,0x163,0x218,0x219,0x21A,0x21B);
    s('ogonek', 0x104,0x105,0x118,0x119,0x12E,0x12F,0x172,0x173);
    s('horn',   0x1A0,0x1A1,0x1AF,0x1B0);
    // Vietnamese double-stacks
    s('circ+acute', 0x1EA4,0x1EA5, 0x1EBE,0x1EBF, 0x1ED0,0x1ED1);
    s('circ+grave', 0x1EA6,0x1EA7, 0x1EC0,0x1EC1, 0x1ED2,0x1ED3);
    s('circ+hook',  0x1EA8,0x1EA9, 0x1EC2,0x1EC3, 0x1ED4,0x1ED5);
    s('circ+tilde', 0x1EAA,0x1EAB, 0x1EC4,0x1EC5, 0x1ED6,0x1ED7);
    s('circ+dotb',  0x1EAC,0x1EAD, 0x1EC6,0x1EC7, 0x1ED8,0x1ED9);
    s('breve+acute',0x1EAE,0x1EAF);
    s('breve+grave',0x1EB0,0x1EB1);
    s('breve+hook', 0x1EB2,0x1EB3);
    s('breve+tilde',0x1EB4,0x1EB5);
    s('breve+dotb', 0x1EB6,0x1EB7);
    s('horn+acute', 0x1EDA,0x1EDB, 0x1EE8,0x1EE9);
    s('horn+grave', 0x1EDC,0x1EDD, 0x1EEA,0x1EEB);
    s('horn+hook',  0x1EDE,0x1EDF, 0x1EEC,0x1EED);
    s('horn+tilde', 0x1EE0,0x1EE1, 0x1EEE,0x1EEF);
    s('horn+dotb',  0x1EE2,0x1EE3, 0x1EF0,0x1EF1);
    return m;
  }());

  /* ── particle constellation fill ────────────────────────*/
  var PART_COLORS  = ['#7C00F6', '#ff2d55', '#e8650a', '#00a67e'];
  var LINK_DIST    = 50;   // max px between linked particles
  var REPEL_R      = 70;   // cursor repulsion radius (px)
  var REPEL_F      = 1.2;  // repulsion strength
  // Zone 0: wide scatter · Zone 1/2: center clusters · Zone 3: diacritic floater
  var ZONE_W       = [300, 50, 50, 40];
  var ZONE_N       = [44, 18, 18, 12];  // total 92
  var Z3_START     = 44 + 18 + 18;      // index of first zone-3 particle
  var parts        = [];
  var cursorX      = -9999;
  var cursorY      = -9999;

  function getBg() {
    return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#242424';
  }

  function initParticles() {
    parts = [];
    for (var z = 0; z < 4; z++) {
      for (var i = 0; i < ZONE_N[z]; i++) {
        parts.push({
          x:   CW / 2 + (Math.random() - 0.5) * ZONE_W[z],
          y:   CH / 2 + (Math.random() - 0.5) * CH * 0.5,
          vx:  (Math.random() - 0.5) * 1.5,
          vy:  (Math.random() - 0.5) * 1.5,
          r:   0.8 + Math.random() * 1.0,
          col: PART_COLORS[Math.floor(Math.random() * PART_COLORS.length)],
          z:   z,
          zi:  i
        });
      }
    }
  }

  /* ── frame ───────────────────────────────────────────────*/
  var startMs = null;

  function frame(nowMs) {
    requestAnimationFrame(frame);
    if (!glyphs.length) return;
    if (startMs === null) startMs = nowMs;

    var t   = (nowMs - startMs) / 1000;
    var dt  = prevNow === null ? 0 : nowMs - prevNow;
    prevNow = nowMs;

    phaseMs += dt;
    if (phaseMs >= HOLD_MS) {
      glyphIdx = (glyphIdx + 1) % glyphs.length;
      phaseMs  = phaseMs % HOLD_MS;
    }

    annotMs += dt;
    if (annotMs >= 250 && annotEl) {
      var h = glyphs[glyphIdx].toString(16).toUpperCase();
      while (h.length < 4) h = '0' + h;
      annotEl.textContent = 'U+' + h;
      annotMs = 0;
    }

    var wght = wghtVal(t);
    var fs   = Math.round(BASE_CH * 0.70 / (ASC + DESC));
    var ink  = getInk();
    var ch   = String.fromCodePoint(glyphs[glyphIdx]);

    var xHFrac  = X_H_400 + (X_H_700 - X_H_400) * (wght - 400) / 300;
    var xHVal   = Math.round(515 + 14 * (wght - 400) / 300).toString();

    var baseline_y = CH / 2 + ((ASC - DESC) / 2) * fs;
    var capH_y     = baseline_y - CAP_H  * fs;
    var xH_y       = baseline_y - xHFrac * fs;
    var desc_y     = baseline_y + DESC   * fs;
    var metricYs   = [capH_y, xH_y, baseline_y, desc_y];

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CW, CH);

    /* ── 1. Metric dashed rules — full width ── */
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = ink;
    ctx.lineWidth   = 0.5;
    ctx.setLineDash([4, 5]);
    metricYs.forEach(function (y) {
      if (y < 0 || y > CH) return;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();

    /* ── 2. Metric labels + values — indented ── */
    var labelSz = isMobile ? 6 : 8;
    var hex = glyphs[glyphIdx].toString(16).toUpperCase();
    while (hex.length < 4) hex = '0' + hex;
    var annotStr = 'U+' + hex;
    ctx.save();
    ctx.globalAlpha  = 0.28;
    ctx.fillStyle    = ink;
    ctx.textBaseline = 'bottom';
    canvas.style.fontVariationSettings = '"wght" 400';
    ctx.font = labelSz + 'px ' + FONT;
    METRICS.forEach(function (m, i) {
      var y = metricYs[i];
      if (y < 4 || y > CH) return;
      var val = (i === 1) ? xHVal : m.val;
      ctx.textAlign = 'left';  ctx.fillText(m.label, LEFT_PAD,      y - 3);
      ctx.textAlign = 'right'; ctx.fillText(val,      CW - LEFT_PAD, y - 3);
    });
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(annotStr, CW - LEFT_PAD, (xH_y + baseline_y) / 2);
    ctx.restore();

    /* ── 3. Glyph solid fill (covers metric lines inside, hides path overlaps) ── */
    ctx.save();
    canvas.style.fontVariationSettings = '"wght" ' + wght.toFixed(0);
    ctx.font         = fs + 'px ' + FONT;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle  = ink;
    ctx.lineWidth    = 2;
    ctx.lineJoin     = 'round';
    ctx.strokeText(ch, CW / 2, baseline_y);
    ctx.fillStyle    = getBg();
    ctx.fillText(ch, CW / 2, baseline_y);
    ctx.restore();

    /* ── 4. Particle constellation — source-atop clips to glyph paint ── */
    var bL = CW / 2 - ZONE_W[0] / 2;
    var bR = CW / 2 + ZONE_W[0] / 2;
    var bT = capH_y;
    var bB = desc_y;

    // Active diacritic shape for zone-3 spring targets
    var dShape = DIAC_MAP[glyphs[glyphIdx]] || null;
    var dPts   = dShape ? SHAPES[dShape] : null;

    // Zone 3 uses wide safety bounds — spring force keeps particles on target
    var zoneXL = [bL, CW/2-ZONE_W[1]/2, CW/2-ZONE_W[2]/2, CW/2-0.35*fs];
    var zoneXR = [bR, CW/2+ZONE_W[1]/2, CW/2+ZONE_W[2]/2, CW/2+0.35*fs];
    var midY   = (bT + bB) / 2;
    var zoneYT = [bT, bT,  midY, capH_y-0.50*fs];
    var zoneYB = [bB, midY, bB,  baseline_y+0.28*fs];

    // Update particles: random walk + spring (zone 3) + cursor repulsion + wall bounce
    for (var i = 0; i < parts.length; i++) {
      var p  = parts[i];

      if (p.z === 3) {
        if (dPts) {
          // Active: gentle drift toward assigned diacritic target
          var tgt = dPts[p.zi % dPts.length];
          var tx  = CW / 2 + tgt[0] * fs;
          var ty  = capH_y + tgt[1] * fs;
          p.vx   += (tx - p.x) * 0.004;
          p.vy   += (ty - p.y) * 0.004;
        } else {
          // Idle: park above cap (clipped invisible by source-atop)
          var hx = CW / 2 + (p.zi % 3 - 1) * 8;
          var hy = capH_y - 0.25 * fs;
          p.vx  += (hx - p.x) * 0.004;
          p.vy  += (hy - p.y) * 0.004;
        }
      } else {
        p.vx += (Math.random() - 0.5) * 0.35;
        p.vy += (Math.random() - 0.5) * 0.35;
      }

      // Cursor repulsion
      var cdx = p.x - cursorX, cdy = p.y - cursorY;
      var cd2 = cdx * cdx + cdy * cdy;
      if (cd2 < REPEL_R * REPEL_R && cd2 > 0.01) {
        var cd = Math.sqrt(cd2);
        var f  = REPEL_F * (1 - cd / REPEL_R);
        p.vx  += f * (cdx / cd);
        p.vy  += f * (cdy / cd);
      }

      var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd > 2.5) { p.vx = p.vx / spd * 2.5; p.vy = p.vy / spd * 2.5; }
      var damp = p.z === 3 ? 0.90 : 0.97;
      p.vx *= damp; p.vy *= damp;
      p.x  += p.vx;  p.y  += p.vy;
      var xL = zoneXL[p.z], xR = zoneXR[p.z];
      var yT = zoneYT[p.z], yB = zoneYB[p.z];
      if (p.x < xL) { p.x = xL; p.vx =  Math.abs(p.vx); }
      if (p.x > xR) { p.x = xR; p.vx = -Math.abs(p.vx); }
      if (p.y < yT) { p.y = yT; p.vy =  Math.abs(p.vy); }
      if (p.y > yB) { p.y = yB; p.vy = -Math.abs(p.vy); }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';

    // Constellation lines (all zones)
    ctx.lineWidth = 0.4;
    for (var i = 0; i < parts.length - 1; i++) {
      var a = parts[i];
      for (var j = i + 1; j < parts.length; j++) {
        var b  = parts[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < LINK_DIST * LINK_DIST) {
          ctx.globalAlpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.4;
          ctx.strokeStyle = a.col;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Particle dots (all zones)
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      ctx.globalAlpha = 0.75 + Math.random() * 0.25;
      ctx.fillStyle   = p.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore(); // back to source-over


  }

  document.fonts.ready.then(function () {
    init();
    buildGlyphList();
    requestAnimationFrame(frame);

    // Cursor tracking for particle repulsion
    canvas.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      cursorX = e.clientX - r.left;
      cursorY = e.clientY - r.top;
    });
    canvas.addEventListener('mouseleave', function () { cursorX = -9999; cursorY = -9999; });

    var rafR;
    window.addEventListener('resize', function () {
      cancelAnimationFrame(rafR);
      rafR = requestAnimationFrame(function () {
        isMobile = window.innerWidth <= 480;
        init();
      });
    });
  });
}());
