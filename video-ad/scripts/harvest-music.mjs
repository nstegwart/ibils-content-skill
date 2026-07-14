// Full Pixabay harvest: search N queries -> dedupe track pages -> visit each ->
// extract title, artist, duration, tags, and the direct CDN download URL.
import { chromium } from 'playwright';
import fs from 'fs';

const QUERIES = process.env.Q
  ? process.env.Q.split('|')
  : ['noir', 'crime scene', 'dark piano', 'tension', 'suspense minimal', 'cinematic tension', 'thriller piano', 'dark jazz'];
const MAX_TRACKS = Number(process.env.MAX || 40);
const OUT = process.env.OUT || 'tracks.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1440, height: 900 },
});
const page = await ctx.newPage();

// 1) collect track page URLs
const trackUrls = new Set();
for (const q of QUERIES) {
  try {
    await page.goto(`https://pixabay.com/music/search/${encodeURIComponent(q)}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await sleep(4000);
    const rows = await page.$$eval('a[href*="/music/"]', (as) =>
      as.map((a) => a.href).filter((h) => /\/music\/[^/]+-\d+\/?$/.test(h)),
    );
    rows.forEach((r) => trackUrls.add(r));
    process.stderr.write(`${q}: +${rows.length} (total ${trackUrls.size})\n`);
  } catch (e) {
    process.stderr.write(`${q}: FAIL ${e.message}\n`);
  }
}

// 2) visit each track page
const tracks = [];
const list = [...trackUrls].slice(0, MAX_TRACKS);
for (const [i, url] of list.entries()) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2500);
    const html = await page.content();
    const dl = html.match(/https:\/\/cdn\.pixabay\.com\/download\/audio\/[^"'\\\s<)]+\.mp3(\?filename=[^"'\\\s<)]+)?/i);
    const title = await page
      .$eval('meta[property="og:title"]', (m) => m.content)
      .catch(() => '');
    // duration text like "1:23" near the player
    const body = await page.$eval('body', (b) => b.innerText).catch(() => '');
    const dur = (body.match(/\b\d+:\d{2}\b/) || [])[0] || '';
    const tags = await page
      .$$eval('a[href*="/music/search/"]', (as) => as.map((a) => a.textContent.trim()).filter(Boolean).slice(0, 12))
      .catch(() => []);
    let artist = '';
    if (dl) {
      const fn = decodeURIComponent(dl[0].split('filename=')[1] || '');
      artist = fn.split('-')[0] || '';
    }
    tracks.push({
      url,
      title: title.replace(/\s*\|\s*Royalty-free Music\s*$/i, '').trim(),
      artist,
      duration: dur,
      download: dl ? dl[0] : null,
      tags,
    });
    process.stderr.write(`[${i + 1}/${list.length}] ${title} ${dl ? 'OK' : 'NO-DL'}\n`);
  } catch (e) {
    process.stderr.write(`[${i + 1}] FAIL ${url} ${e.message}\n`);
  }
}

fs.writeFileSync(OUT, JSON.stringify(tracks, null, 2));
process.stderr.write(`\nwrote tracks.json (${tracks.length})\n`);
await browser.close();
