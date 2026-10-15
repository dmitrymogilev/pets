#!/usr/bin/env node
// Open pages of a deployed Pets site in headless Chromium, save screenshots,
// and report console errors, page errors, and failed requests.
//
//   node scripts/ui-check/check.js <site-url> [path ...]
//
// Paths default to "/". Screenshots go to local_memory/ui-check/. Exits 1 if
// any page produced an error. Identity comes from the mesh, so no login is
// needed; the browser is seen as the user running the script.
//
// One-time setup:
//   npm --prefix scripts/ui-check install
//   npm --prefix scripts/ui-check run setup
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const [base, ...rest] = process.argv.slice(2);
if (!base) {
  console.error('usage: node scripts/ui-check/check.js <site-url> [path ...]');
  process.exit(2);
}
const paths = rest.length ? rest : ['/'];
const outDir = path.join(__dirname, '..', '..', 'local_memory', 'ui-check');
fs.mkdirSync(outDir, { recursive: true });

// Network interfaces coming and going (container veths, VPN) make Chromium
// abort a navigation with ERR_NETWORK_CHANGED. Retry those a few times.
async function gotoWithRetry(page, url, attempts = 4) {
  for (let i = 1; ; i++) {
    try {
      return await page.goto(url, { waitUntil: 'networkidle' });
    } catch (e) {
      if (i >= attempts || !/ERR_NETWORK_CHANGED/.test(e.message)) throw e;
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
}

(async () => {
  // --disable-quic: Chromium upgrades spot.t1a.dev to HTTP/3 and the second
  // navigation then fails with ERR_QUIC_PROTOCOL_ERROR.
  const browser = await chromium.launch({ args: ['--disable-quic'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  let failed = false;
  for (const p of paths) {
    const errors = [];
    const onConsole = (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); };
    const onPageError = (e) => errors.push('pageerror: ' + e.message);
    const onResponse = (r) => { if (r.status() >= 400) errors.push('http ' + r.status() + ' ' + r.url()); };
    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    page.on('response', onResponse);

    const url = base.replace(/\/$/, '') + p;
    await gotoWithRetry(page, url);
    const file = path.join(outDir, (p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'index') + '.png');
    await page.screenshot({ path: file, fullPage: true });

    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('response', onResponse);

    console.log(`${p}  title="${await page.title()}"  screenshot=${path.relative(process.cwd(), file)}`);
    for (const e of errors) console.log('  ' + e);
    if (errors.length) failed = true;
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
