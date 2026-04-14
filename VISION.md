# Wordmark — Site Vision

## Platform
GitHub Pages. All fonts, CSS, and JS are local and owned.
No CMS dependency at launch; can add Decap/Netlify CMS later if needed.

---

## Section 1 — Hero

### Flapjack canvas + WORDMARK overlay
- Full-viewport-height canvas (`#flapjack-canvas`) with animated sine waves drawn as cubic bezier paths
- 5 waves, each with independent amplitude, frequency, phase, and speed
- **Travelling colour comet**: one colour sweeps left → right across all wave strokes per pass (36 s/epoch); sequence orange → purple → green → pink → repeat. All 5 waves share the same colour state.
- Waves have visible control handles (tangent handles at half-period anchors, `rgba(128,128,128,0.75)`) and HUD readout
- WORDMARK text (`#flapjack-text`) overlaid via `mix-blend-mode: difference`
- Font: **Flapjack (CalSansUI variable)** with `wght` (100–990), `FLIP` (0–78), `FLOP` (0–78) axes
  - `wght`: slow 18 s sine oscillation, auto — never driven by mouse
  - Mouse hover: x-position → `FLOP` (shared across WORD/MARK); y-position → `FLIP` (opposing direction on each line)
  - Idle (no hover): FLIP and FLOP both zero
- HUD readout: 3×2 Bézier coordinate grid centred inside WORD (top row) and MARK (bottom row) on desktop; stacked 2-line above/below on mobile; labels at wght 700, values at wght 400; 8 px / 6 px; 10% opacity
- Font size: `clamp(80px, min(32vw, 42vh), 500px)`
- Mobile wave amplitude boosted to 0.42 × CH (vs ~0.30 max on desktop) for drama without overflow

### Hero text
- Headline: **CalSans Bold** — *"Your words should feel like your brand."*
- Avatar + CTA pill linking to cal.com/davis
- Pill hover: solid colour synced live to the flapjack comet (`--comet-a` CSS custom property written every frame in `flapjack.js`); starts orange, cycles through all 4 comet colours; text turns white on hover

---

## Section 2 — Dek (glyph showcase)

- Full-width canvas (`#dek-canvas`) between hero and carousel; desktop height = `min(60vw, 52vh)`; mobile = `50vh`
- Cycles through every CalSansUI codepoint (detected via two-fallback width test: `sans-serif` vs `monospace`) at 100 ms/glyph
- `wght` axis oscillates on the same 18 s sine as the hero — glyph weight breathes in sync
- **Metric overlay**: dashed rules full-width for cap height (710), x-height, baseline (0), descender (−150); labels and values aligned to site margin (`clamp(32px, 7vw, 112px)`)
  - x-height line and value interpolate live with wght: 515 @ wght 400 → 529 @ wght 700
- **U+XXXX annotation**: displayed right-aligned, vertically centred in the x-height zone; same 8 px / 28% opacity as metric labels
- **Clean outer outline**: `strokeText(ink)` then `fillText(dustPattern)` — inner contour strokes buried under fill, leaving only the outer edge visible for composite glyphs
- **Dust noise fill**: 64×64 noise tile regenerated every frame (±14 brightness scatter around `--bg`), tiled as `CanvasPattern` inside each glyph
- **Copy text** (desktop only): "At Wordmark, we design custom typefaces…" layered over the glyph in the x-height zone; left-aligned from site margin, column width ~42% of canvas; smaller font so text wraps to 4–5 lines; 85% opacity
- **Mobile**: copy text shown as HTML `<p id="dek-mobile-header">` above the canvas via CSS; canvas text disabled
- Glyph font size: `CH × 0.90 / (ASC + DESC)` — fits ascender-to-descender in 90% of canvas height, ~5% breathing top and bottom
- `#dek-annot` span in DOM for a11y (visually hidden; U+XXXX drawn on canvas instead)

---

## Section 3 — Logo Carousel

- Auto-scrolling marquee (`#logos`), seamless via duplicate set
- SVG logos inlined via JS `fetch()` so they respond to `currentColor` theming
- Section headline: **CalSans Bold**

---

## Section 4 — Work (4 items)

Each work item:
- Left-aligned headline in **CalSans Bold** — balanced 2-line break via canvas measurement (`site.js`); shared max-width so all 4 headlines break at the same column width
- Body copy: **CalSansUI wght 400**, hyphenated with `&shy;` entities
- Right-aligned photo: `position: sticky`; slides in on enter via `IntersectionObserver`
- Cal.com UI item: dual images swapped by theme (`theme-img--dark` / `theme-img--light`)

---

## Section 5 — Footer letterbox

- `#footer-letterbox` canvas running the letterbox/pretext technique
- WORDMARK spelled out in large CalSans letterforms; fill text uses CalSansUI variable
- Footer text overlaps the canvas from below (negative `margin-top`)

---

## Section 6 — Sticker layer

- `#sticker-layer`: full-page transparent overlay (`position: absolute; pointer-events: none; z-index: 99`)
- Typography-pun pill stickers spawn one at a time: first at 15 s, then every 2 minutes, up to 6 total
- Random position, tilt (±15°), colour from `[#7C00F6, #ff2d55, #e8650a, #00a67e]`
- Pop-in bounce animation; hover wiggle; grab/drag (mouse + touch), scroll-aware
- **Throw physics**: velocity tracked via EMA during drag; release coasts with 0.92/frame friction
- **Mouseleave settle**: eases to fresh random tilt (±10°) with `power2.out` curve

---

## Fonts in use

| Family | File | Use |
|---|---|---|
| CalSans Bold | `CalSans-Bold.woff2` | Headlines, hero text, letterbox large forms, sticker pills |
| CalSansUI Variable | `CalSansUI-VariableFont 1.721 [opsz,wght,GEOM,YTAS,SHRP].woff2` | Body, footer, dek section, hero WORDMARK |
| Ambulia Text | `AmbuliaTextVF.woff2` | Font pool |
| Anglev1 | `anglev1-Regularv17.woff2` | Font pool |
| Gaussian | `GaussianVF.woff2` | Font pool |
| Horizon | `HorizonVF.woff2` | Font pool |
| Pang Serif | `PangSerifVF.woff2` | Font pool |

**Active axes on CalSansUI:** `wght` (400–700 deployed), `FLIP`, `FLOP`, `GEOM`, `YTAS`, `SHRP`, `opsz`

---

## JS files

| File | Purpose |
|---|---|
| `js/flapjack.js` | Hero canvas: waves, WORDMARK axis animation, comet gradient, mouse interaction, CSS comet colour export |
| `js/dek.js` | Dek section: glyph cycling, metric overlay, dust noise, copy text, wght oscillation |
| `js/letterbox.js` | Footer canvas letterbox renderer |
| `js/site.js` | Theme toggle, SVG logo inlining, work headline balancing, image slide-in |
| `js/stickers.js` | Sticker spawn, drag (mouse + touch), throw physics, IntersectionObserver timing |

---

## Design tokens

```css
/* dark (default) */
--bg:    #242424
--ink:   #ffffff
--muted: rgba(255,255,255,0.42)
--r:     10px

/* light */
--bg:    #f2f0eb
--ink:   #111111
--muted: rgba(17,17,17,0.45)
```

Comet colours (shared across waves, dek wght, pill hover):
`#e8650a` orange → `#7C00F6` purple → `#00a67e` green → `#ff2d55` pink

Theme toggle: Auto / Light / Dark, persisted in `localStorage` as `wm-theme`.

---

## Planned next steps

- **Three.js scene for WORDMARK**: `window.wmTextCanvas` in `flapjack.js` is a live hidden canvas updated every frame with the current wght state — ready to consume as `new THREE.CanvasTexture(window.wmTextCanvas)`. FLIP/FLOP axes require a shader approach (canvas 2D font strings only expose weight).

---

## Open issues

- **#14** — Carousel bugs (TBD)
- **#17** — Footer letterbox: confirm whether `wdth` axis should be `GEOM` or `YTAS`
