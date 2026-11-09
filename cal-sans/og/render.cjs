// Renders cal-sans/og.mp4 (and og.png, its first frame) from og/card.html: the live cube makes one full
// turn, driven by a hidden drag (0.45°/px in case.js) with the page's clock stepped frame by frame, so
// the loop closes exactly on the poster. Defaults: 8 s at 60 fps.
// Run from the repo root:  NODE_PATH=/path/to/node_modules node cal-sans/og/render.cjs [fps] [seconds]
// Needs puppeteer (any project's node_modules will do) and ffmpeg.
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process')
const puppeteer = require('puppeteer')
const FPS = +(process.argv[2] || 60), SECS = +(process.argv[3] || 8)
const S = __dirname, FRAMES = process.env.OG_FRAMES || path.join(S, '.frames'), OUT = path.join(S, '..', 'og.mp4'), POSTER = path.join(S, '..', 'og.png')
const N = Math.round(SECS * FPS), PX = 800 / N, GRAB = [470, 420], TICKS = Math.round(60 / FPS)
;(async () => {
  fs.mkdirSync(FRAMES, { recursive: true })
  for (const f of fs.readdirSync(FRAMES)) fs.unlinkSync(path.join(FRAMES, f))
  const browser = await puppeteer.launch({ args: ['--force-device-scale-factor=1', '--allow-file-access-from-files'] })
  const page = await browser.newPage()
  page.on('pageerror', e => console.error('PAGE ERROR', e.message))
  await page.setViewport({ width: 1200, height: 630 })
  await page.evaluateOnNewDocument(() => {
    let now = 0, tid = 1; const rafs = [], timers = []
    performance.now = () => now; Date.now = () => 1.7e12 + now
    window.requestAnimationFrame = cb => { rafs.push(cb); return rafs.length }
    window.cancelAnimationFrame = () => {}
    window.setTimeout = (cb, ms, ...a) => { timers.push({ id: tid, at: now + (ms || 0), cb, a }); return tid++ }
    window.clearTimeout = id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1) }
    window.__step = dt => { now += dt; const due = timers.filter(t => t.at <= now); due.forEach(t => { timers.splice(timers.indexOf(t), 1); t.cb(...t.a) }); rafs.splice(0).forEach(cb => cb(now)) }
  })
  await page.goto('file://' + path.join(S, 'card.html'), { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  await new Promise(r => setTimeout(r, 500))
  await page.evaluate(() => window.__step(16.667))
  await new Promise(r => setTimeout(r, 200))
  await page.mouse.move(GRAB[0], GRAB[1]); await page.mouse.down()
  await page.evaluate(() => { window.__step(16.667); window.__step(16.667) })
  for (let i = 0; i < N; i++) {
    if (i > 0) await page.mouse.move(GRAB[0] + i * PX, GRAB[1])
    await page.evaluate((t, k) => { for (let j = 0; j < k; j++) window.__step(16.667); document.documentElement.style.setProperty('--vt', (-t) + 's') }, i / FPS, TICKS)
    await page.screenshot({ path: path.join(FRAMES, `f${String(i).padStart(4, '0')}.png`) })
  }
  await page.mouse.move(GRAB[0] + N * PX, GRAB[1]); await page.evaluate(() => window.__step(16.667))
  console.log(`${N} frames; cube after 360°: ${await page.evaluate(() => document.querySelector('.cube').style.transform)}`)
  await browser.close()
  execFileSync('ffmpeg', ['-y', '-framerate', String(FPS), '-i', path.join(FRAMES, 'f%04d.png'), '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', '-an', OUT], { stdio: ['ignore', 'ignore', 'ignore'] })
  fs.copyFileSync(path.join(FRAMES, 'f0000.png'), POSTER)
  console.log('→ ' + OUT + '\n→ ' + POSTER + ' (frame 0)')
})().catch(e => { console.error(e); process.exit(1) })
