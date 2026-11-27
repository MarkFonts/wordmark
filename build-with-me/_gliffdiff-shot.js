// Load two fonts into the local GliffDiff and take a screenshot.
const puppeteer = require('/Users/Mark/node_modules/puppeteer');
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
(async () => {
  const b = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  p.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text().slice(0, 200)); });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: process.argv[5] || 'dark' }]);
  await p.goto('http://localhost:8824/gliffdiff/', { waitUntil: 'networkidle0' });
  const inputs = await p.$$eval('input[type=file]', (els) => els.map((e) => ({ id: e.id, name: e.name, accept: e.accept, multiple: e.multiple, cls: e.className })));
  console.log(JSON.stringify(inputs));
  console.log((await p.evaluate(() => document.body.innerText)).slice(0, 600));
  const files = [process.argv[2], process.argv[3]];
  const els = await p.$$('input[type=file]');
  if (els.length >= 2) {
    await els[0].uploadFile(files[0]);
    await wait(1500);
    const els2 = await p.$$('input[type=file]');
    await els2[Math.min(1, els2.length - 1)].uploadFile(files[1]);
  } else if (els.length === 1) {
    await els[0].uploadFile(files[0], files[1]);
  }
  await wait(4000);
  await p.mouse.move(1070, 566, { steps: 8 });   // hover the lowercase a
  await wait(1500);
  console.log('theme', await p.evaluate(() => document.documentElement.getAttribute('data-theme') + ' | ' + document.documentElement.className + ' | ' + getComputedStyle(document.body).backgroundColor));
  console.log('--- after');
  console.log((await p.evaluate(() => document.body.innerText)).slice(0, 900));
  await p.screenshot({ path: process.argv[4] });   // the whole window
  await b.close();
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
