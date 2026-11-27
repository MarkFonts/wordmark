// Capture the Cal Sans README on GitHub (dark) with its SVG figures hidden, and record where each one sits.
const puppeteer = require('/Users/Mark/node_modules/puppeteer');
const fs = require('fs');
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
(async () => {
  const b = await puppeteer.launch({ headless: 'new' });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await p.goto('https://github.com/calcom/sans', { waitUntil: 'networkidle2', timeout: 60000 });
  await p.waitForSelector('article.markdown-body', { timeout: 30000 });
  // let every image load: scroll through once
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((d) => setTimeout(d, 120)); } scrollTo(0, 0); });
  await wait(1500);
  const info = await p.evaluate(() => {
    const ANIMATED = ['VariableMorph2', 'OpticalSize', 'CalGraphics-top', 'VariableMorph', 'Interoperable', 'CalThreeWays'];
    const art = document.querySelector('article.markdown-body'); let A = art.getBoundingClientRect();
    const name = (i) => { const all = i.currentSrc + ' ' + (i.getAttribute('data-canonical-src') || '') + ' ' + [...i.parentElement.querySelectorAll('source')].map((s) => s.srcset + ' ' + (s.getAttribute('data-canonical-src') || '')).join(' '); const m = /documentation\/images\/svg\/([\w-]+?)(-dark)?\.svg/.exec(all); return m ? m[1] : ''; };
    const imgs = [...art.querySelectorAll('img')].filter((i) => ANIMATED.includes(name(i)));
    // keep the README down to just past the last animated figure we want (the first CalThreeWays)
    const last = imgs.find((i) => name(i) === 'CalThreeWays'); const cut = Math.round(last.getBoundingClientRect().bottom - A.top + 140);
    art.style.height = cut + 'px'; art.style.overflow = 'hidden'; A = art.getBoundingClientRect();
    const out = imgs.map((i) => { const r = i.getBoundingClientRect(); return { name: name(i), x: (r.left - A.left) / A.width, y: (r.top - A.top) / A.height, w: r.width / A.width, h: r.height / A.height, loaded: i.complete && i.naturalWidth > 0 }; }).filter((o) => o.y + o.h <= 1);
    imgs.forEach((i) => { i.style.visibility = 'hidden'; });
    return { width: A.width, height: A.height, imgs: out, bg: getComputedStyle(document.body).backgroundColor };
  });
  fs.writeFileSync('positions.json', JSON.stringify(info, null, 1));
  console.log('article', Math.round(info.width), 'x', Math.round(info.height), 'bg', info.bg, 'svg figures', info.imgs.length);
  info.imgs.forEach((i, n) => console.log(n, i.name, 'y', (i.y * 100).toFixed(1) + '%', 'w', (i.w * 100).toFixed(0) + '%', i.loaded));
  const art = await p.$('article.markdown-body');
  await art.screenshot({ path: 'readme-base.png' });
  await b.close();
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
