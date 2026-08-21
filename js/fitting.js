/* fitting.js — Swiss Rag on the body copy under each headline.
 *
 * The captions (.fig-text) and the links line (.learn-more) keep browser breaking: a rag is
 * a reading measure, and those are neither.
 *
 * The rag is a FRACTION of the measure, not the primitive's fixed 40px. 40 is 12% of the
 * desktop column and 17% of the mobile one, and at 17% the paragraph with the long words
 * opens a 104px hole — measured, not guessed. Sweeping 6-12% at four column widths, worst
 * hole bottoms out flat from 8% to 10% and blows up at 12% (115px at the mobile measure),
 * so 10% sits at the bottom of the range with the most room before the cliff.
 *
 * .para keeps its `hyphens: auto` and its &shy; marks: those are what renders when this
 * script does not, and the rag path never breaks a word in any case.
 */
/* Versioned like every other asset here: the engine is vendored from wm-primitives, and a
   bare module URL is served from cache after a re-vendor. Bump on every re-vendor. */
import { layoutParagraph, lineStyle } from './flattersatz.js?v=2'

const RAG = 0.10

function fit(el) {
  const text = el.dataset.ragText ?? (el.dataset.ragText = el.textContent)
  const lines = layoutParagraph(text, el, {
    mode: 'flattersatz',
    ragWidth: Math.round(el.clientWidth * RAG),
  })
  if (!lines) return
  el.textContent = ''
  for (const l of lines) {
    const row = document.createElement('div')
    const span = document.createElement('span')
    Object.assign(span.style, lineStyle(l))
    span.textContent = l.text
    row.appendChild(span)
    el.appendChild(row)
  }
}

const paras = [...document.querySelectorAll('.work-copy > p.para')]
let lastWidth = 0

function refit() {
  const width = paras[0]?.clientWidth
  if (!width || width === lastWidth) return
  lastWidth = width
  paras.forEach(fit)
}

// Measuring before the face loads fits the fallback and never re-fits.
document.fonts.ready.then(refit)
addEventListener('resize', refit)
