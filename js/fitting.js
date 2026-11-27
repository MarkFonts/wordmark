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
 *
 * A paragraph may hold links. The fit works on the paragraph's plain text, so each link is
 * remembered as a range of that text and put back around the same words in the fitted lines
 * (as two anchors when the words fall on two lines).
 */
/* Versioned like every other asset here: the engine is vendored from wm-primitives, and a
   bare module URL is served from cache after a re-vendor. Bump on every re-vendor. */
import { layoutParagraph, lineStyle } from './flattersatz.js?v=2'

const RAG = 0.10

// where each link sits in the paragraph's text, read once before the first fit replaces the markup
const linksOf = new WeakMap()
function readLinks(el) {
  const out = []
  for (const a of el.querySelectorAll('a[href]')) {
    const before = document.createRange()
    before.setStart(el, 0); before.setEnd(a, 0)
    const start = before.toString().length
    out.push({ start, end: start + a.textContent.length, href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel') })
  }
  return out
}

// one fitted line's text, with any link that crosses it put back as an anchor
function fill(span, line, from, links) {
  const hits = links.filter((k) => k.start < from + line.length && k.end > from)
  if (!hits.length) { span.textContent = line; return }
  let at = 0
  for (const k of hits) {
    const a0 = Math.max(k.start - from, 0), a1 = Math.min(k.end - from, line.length)
    if (a0 > at) span.append(line.slice(at, a0))
    const a = document.createElement('a')
    a.href = k.href
    if (k.target) a.target = k.target
    if (k.rel) a.rel = k.rel
    a.textContent = line.slice(a0, a1)
    span.append(a)
    at = a1
  }
  if (at < line.length) span.append(line.slice(at))
}

function fit(el) {
  if (!linksOf.has(el)) linksOf.set(el, readLinks(el))
  const links = linksOf.get(el)
  const text = el.dataset.ragText ?? (el.dataset.ragText = el.textContent)
  const lines = layoutParagraph(text, el, {
    mode: 'flattersatz',
    ragWidth: Math.round(el.clientWidth * RAG),
  })
  if (!lines) return
  el.textContent = ''
  let cursor = 0
  for (const l of lines) {
    const row = document.createElement('div')
    const span = document.createElement('span')
    Object.assign(span.style, lineStyle(l))
    // each line is a run of the paragraph's own text: find where it starts, so links land on the right words
    const from = text.indexOf(l.text, cursor)
    if (from < 0 || !links.length) span.textContent = l.text
    else { fill(span, l.text, from, links); cursor = from + l.text.length }
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
  // The rows it just wrote are new text blocks: let gridSnap measure them now rather than
  // wait for a resize that a same-height refit never causes.
  window.wmGridSnap?.()
}

// Measuring before the face loads fits the fallback and never re-fits.
document.fonts.ready.then(refit)
addEventListener('resize', refit)
