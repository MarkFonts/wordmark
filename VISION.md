# Wordmark — Site Vision

## Platform
GitHub Pages. All fonts, CSS, and JS are local and owned.
No CMS dependency at launch; can add Decap/Netlify CMS later if needed.

---

## Section 1 — Hero

### Flapjack canvas + WORDMARK overlay
- Full-viewport-height canvas (`#flapjack-canvas`) with animated sine waves drawn as cubic bezier paths
- 5 waves, each with independent amplitude, frequency, phase, and speed — all in `#808080` mid-gray
- Waves have visible control handles (tangent handles at half-period anchors) and HUD readout in corner
- WORDMARK text (`#flapjack-text`) overlaid via `mix-blend-mode: difference` — white letterforms invert whatever canvas content is beneath them; mid-gray waves produce constant ~127 gray through the text
- Font: **Flapjack (CalSansUI variable)** with `wght` (100–990), `FLIP` (0–78), `FLOP` (0–78) axes animated via oscillators
  - Mouse interaction: x = shared wght across WORD/MARK; y = FLIP (opposing on each line)
  - Idle: all 3 axes auto-oscillated at different speeds and phases
- Font size: `clamp(80px, min(32vw, 42vh), 500px)` — bounded by both vw and vh so two lines always fit the canvas
- **Floating glyph overlay** (`#fj-floaters`): second canvas above the text; white glyphs from 6 font families drift right, rotating slowly; `mix-blend-mode: difference` so they invert the composed scene below
  - Font pool: CalSansUI (wght 400–700), Ambulia Text, Anglev1, Gaussian, Horizon, Pang Serif
  - Alpha range 0.45–0.90; 30 glyphs; each respawns at left edge when it exits right

### Hero text
- Headline: **CalSans Bold** — *"Your words should feel like you."*
- Avatar + CTA pill linking to cal.com/davis
- Subhead: **CalSansUI wght 400** — site description

---

## Section 2 — Logo Carousel

- Auto-scrolling marquee (`#logos`), seamless via duplicate set
- SVG logos inlined via JS `fetch()` so they respond to `currentColor` theming
- Section headline: **CalSans Bold**

---

## Section 3 — Work (4 items)

Each work item:
- Left-aligned headline in **CalSans Bold** — font size balanced via canvas measurement (binary search, `balanceHeadlines()` in `site.js`)
- Body copy: **CalSansUI wght 400**, hyphenated with `&shy;` entities, ~38ch wide
- Right-aligned photo: `position: sticky` to top of viewport as you scroll past; slides in on enter via `IntersectionObserver`
- Cal.com UI item: dual images swapped by theme (`theme-img--dark` / `theme-img--light`)

---

## Section 4 — Footer letterbox

- `#footer-letterbox` canvas running the same letterbox/pretext technique as the hero title treatment
- WORDMARK spelled out in large CalSans letterforms; fill text uses CalSansUI variable
- Footer text overlaps the canvas from below (negative `margin-top`)

---

## Section 5 — Sticker layer

- `#sticker-layer`: full-page transparent overlay (`position: absolute; height: 100vh; pointer-events: none; z-index: 99`)
- Typography-pun pill stickers spawn one at a time: first at 15s after layer enters viewport, then every 2 minutes, up to 6 total
- Each sticker: random position (8–80 vw, 12–80 vh), random tilt (±15°), random color from `[#7C00F6, #ff2d55, #e8650a, #00a67e]`
- Texts cycle: "message = medium", "times new up", "comic deadpans", "a hellvetica good time", "kernliness → godliness", "bringin' robert slim bach", "univers health care", "optical sizing = secret sauce"
- Pop-in animation bounces at `--rot`, wiggles on hover around `--rot`, grab/drag is layer-relative and scroll-aware (touch + mouse)
- **Throw physics**: velocity tracked via exponential moving average during drag; on release, sticker coasts with 0.92/frame friction (~1.5 s slide); re-grabbing mid-flight cancels the throw
- **Mouseleave settle**: sticker eases to a fresh random tilt (±10°) with `power2.out`-style curve — no snap-back

---

## Fonts in use

| Family | File | Use |
|---|---|---|
| CalSans Bold | `CalSans-Bold.woff2` | Headlines, hero text, letterbox large forms, sticker pills |
| CalSansUI Variable | `CalSansUI-VariableFont_1_7__opsz_wght_GEOM_YTAS_SHRP_.woff2` | Body, footer, letterbox fill text, hero WORDMARK |
| Ambulia Text | `AmbuliaText.woff2` | Floating glyphs |
| Anglev1 | `Anglev1.woff2` | Floating glyphs |
| Gaussian | `Gaussian.woff2` | Floating glyphs |
| Horizon | `Horizon.woff2` | Floating glyphs |
| Pang Serif | `PangSerif.woff2` | Floating glyphs |

**Active axes on CalSansUI:** `wght` (400–700 deployed; spec: 100–990), `FLIP`, `FLOP`, `GEOM`, `YTAS`, `SHRP`, `opsz`

---

## JS files

| File | Purpose |
|---|---|
| `js/flapjack.js` | Hero canvas: waves, floating glyphs, WORDMARK axis animation, mouse interaction |
| `js/letterbox.js` | Footer canvas letterbox renderer |
| `js/site.js` | Theme toggle, SVG logo inlining, work headline balancing, image slide-in |
| `js/stickers.js` | Sticker spawn, drag (mouse + touch), IntersectionObserver timing |

---

## Design tokens

```css
--bg:    #242424        /* dark default */
--ink:   #ffffff
--muted: rgba(255,255,255,0.42)
--r:     10px           /* border-radius throughout */

/* light */
--bg:    #f2f0eb
--ink:   #111111
--muted: rgba(17,17,17,0.45)
```

Theme toggle: Auto / Light / Dark, persisted in `localStorage` as `wm-theme`.

---

## Planned next steps

- **Three.js scene for WORDMARK**: `window.wmTextCanvas` in `flapjack.js` is a live hidden canvas updated every frame with the current wght axis state — ready to be consumed as `new THREE.CanvasTexture(window.wmTextCanvas)`. FLIP/FLOP axes require a shader approach (canvas 2D font strings only expose weight). Add Three.js import, create scene, swap DOM overlay for mesh.

---

## Open issues

- **#14** — Carousel bugs (TBD)
- **#17** — Footer letterbox: confirm whether `wdth` axis should be `GEOM` or `YTAS`
- **#23** — Not yet examined
