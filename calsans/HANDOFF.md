# Cal Sans case study, handoff from the cloud session

Live at wordmark.nyc/calsans/, main at 1a5833e. Everything below is committed and pushed.

## The hero transition prototypes

Five options were asked for; four were built and iterated, the fifth ("transition is a font") Mark does himself. Each is a published artifact, still live:

| Option | What it is | Artifact |
|---|---|---|
| 1 Thermal | SVG filter chain: stripe gradient under material and colour filters, grain, 7-stop LUTs. The one that shipped in the hero. | https://claude.ai/artifact/MMBdZsJYV5RzFZPTM8qEJF |
| 2 Dust | WebGL point sprites, Calendso desaturates and flows into Cal.com | https://claude.ai/artifact/MPaHRAZychHLEm4xpZCLbT |
| 3 PenTile | GLSL subpixel lattice zooming out, lozenge glass sweep, rainbow rim | https://claude.ai/artifact/PUAupuRwVDBzPWtFHoEZHz |
| 4 Glass cards | three.js glass logotype with moving bounce cards that leave one at a time | https://claude.ai/artifact/KAiGGHRw8mg9SQydnqm8Nk |
| Four-up compare | thermal, dust, PenTile, glass side by side | https://claude.ai/artifact/G21GYzysLiqkjry36YK9yD |

The case-study page artifact (pre-site copy): https://claude.ai/artifact/FSANN8i1cFaHzkLxhr4LTH

The thermal hero lives in `calsans/index.html` (the inline SVG) and `js/thermal-hero.js`. On touch screens it runs a lighter chain at a third of the frame rate; masks are cut to the viewBox.

## What shipped on the page, in order

- Hero: Calendso heats into Cal.com, drains to the page's ink token, plays in view, tap replays.
- Highlights: Cal.com weight cycle; six-axis slider card pinned to the logo's size; get links.
- Closer look: headline tracking out to +55 and back with a counting figure; size waterfall; ss18 switch; Cal Sans Flex Futura switch; hello in 103 languages on three drifting rows; UI-kit board with GEOM slider and optical-size switch (off pins opsz 14).
- By the numbers.
- How it came to be: D1 pages then the five directions (fading deck); the human draft (two pages); the plan on stage; the 2022 estimate sketch (slide outlines, Cal Sans 1) beside the 2026 masters cube (8 real masters, 4 virtual at the corners, dotted ties, drag/pinch/wheel); the Glyphs source; the statics catalogue sheet drifting in a box; four tools (font-proofer, ReCal, kernpare, calbuild) with lineage links.
- From the studio: desk photo, text, quotes, maxim.
- Releases.
- Try it: the Framer type tester ported to plain HTML, presets A11y/UI/Base/Geo, unlock morph, reset, link to the full proofer.
- Close.
- Open Graph card: `calsans/og.png`, the cube left, two-line headline right, virtuals at the corners.

## Files

- `calsans/index.html`, `css/case.css` (v47), `js/case.js` (v25), `js/thermal-hero.js` (v6)
- `calsans/img/` page images as WebP; `CalStatics.svg` and `-dark.svg` from calcom/sans
- `calsans/ref/` and `calsans/_handoff/` are gitignored; keep decks and pricing there, never commit them
- Old commits with the pricing PDFs are still fetchable on GitHub by hash; purging needs GitHub support

## Open, taste only

- Hero on iPhone: much better after the mask cut, not perfect. Next step if wanted is a video for phones, live SVG on desktop.
- Thermal/dust/PenTile/glass artifacts: keep or take down.
